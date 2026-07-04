// Pure playlist navigation helpers shared by Winamp and Media Player.
// Kept free of React/DOM so they can be unit-tested directly.

import { MusicTrack, musicTracks, getTrackByFileName } from './tracks';

export type RepeatMode = 'off' | 'all' | 'one';

// Filesystem content conventions for media files:
//   'data:...'    → real inline binary (the Paint convention)
//   'track:<id>'  → reference to a bundled track by id (downloads use this)
// Anything else (e.g. '[MP3 Audio]') is an opaque placeholder resolved by name.
const TRACK_REF_PREFIX = 'track:';

/** Resolve 'track:<id>' file content to a bundled track, or undefined. */
export function resolveTrackFromContent(content: string | null | undefined): MusicTrack | undefined {
  if (!content || !content.startsWith(TRACK_REF_PREFIX)) return undefined;
  const id = content.slice(TRACK_REF_PREFIX.length).trim();
  return musicTracks.find((t) => t.id === id);
}

/**
 * Build the working playlist for a launched file. A 'track:<id>' content
 * reference wins; otherwise we match by filename. Unknown files keep their
 * display name but sound a bundled track underneath so playback isn't silent.
 */
export function playlistForLaunch(
  filePath?: string,
  content?: string | null,
): { list: MusicTrack[]; index: number } {
  if (!filePath) return { list: [...musicTracks], index: 0 };
  const name = basename(filePath);
  const match = resolveTrackFromContent(content) ?? getTrackByFileName(name);
  if (match) {
    return { list: [...musicTracks], index: musicTracks.findIndex((t) => t.id === match.id) };
  }
  const stand = musicTracks[0];
  const faux: MusicTrack = { ...stand, id: `launch-${name}`, title: name, artist: 'Unknown Artist', fileName: name };
  return { list: [faux, ...musicTracks], index: 0 };
}

/**
 * Build a single playlist entry from a filesystem file (path + content), used
 * by the "Add File" flow. A 'track:<id>' reference resolves to the bundled
 * track; an inline 'data:' URL plays that audio directly; anything else keeps
 * its name but sounds a bundled track so playback isn't silent.
 */
export function trackFromFile(filePath: string, content: string | null | undefined): MusicTrack {
  const name = basename(filePath);
  const ref = resolveTrackFromContent(content);
  if (ref) return ref;
  const stand = musicTracks[0];
  if (content && content.startsWith('data:')) {
    return { ...stand, id: `file-${filePath}`, title: name, artist: 'Unknown Artist', fileName: name, src: content };
  }
  const byName = getTrackByFileName(name);
  if (byName) return byName;
  return { ...stand, id: `file-${filePath}`, title: name, artist: 'Unknown Artist', fileName: name };
}

/** Format seconds as mm:ss; negative/NaN render as a placeholder. */
export function formatTime(totalSeconds: number, placeholder = '0:00'): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return placeholder;
  const s = Math.floor(totalSeconds);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Manual previous/next: always returns a valid index, wrapping the ends.
 * Shuffle picks a different random index when the list has more than one item.
 */
export function manualStep(
  current: number,
  length: number,
  direction: 1 | -1,
  shuffle: boolean,
  rng: () => number = Math.random,
): number {
  if (length <= 0) return 0;
  if (length === 1) return 0;
  if (shuffle) return pickShuffled(current, length, rng);
  return (current + direction + length) % length;
}

/**
 * Auto-advance when a track ends. Returns the next index, or null when
 * playback should stop (repeat off and we ran off the end).
 */
export function autoNext(
  current: number,
  length: number,
  repeat: RepeatMode,
  shuffle: boolean,
  rng: () => number = Math.random,
): number | null {
  if (length <= 0) return null;
  if (repeat === 'one') return current;
  if (shuffle) {
    if (length === 1) return repeat === 'all' ? 0 : null;
    return pickShuffled(current, length, rng);
  }
  const next = current + 1;
  if (next < length) return next;
  return repeat === 'all' ? 0 : null;
}

function pickShuffled(current: number, length: number, rng: () => number): number {
  // Pick uniformly among the other indices so a track never repeats itself.
  let idx = Math.floor(rng() * (length - 1));
  if (idx >= current) idx += 1;
  return Math.min(idx, length - 1);
}

/** Sum of known durations (seconds). Unknown entries contribute 0. */
export function totalDuration(durations: Array<number | undefined>): number {
  return durations.reduce<number>((sum, d) => sum + (Number.isFinite(d) ? (d as number) : 0), 0);
}

/** Basename of a Windows-style path, lower-cased for matching. */
export function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] ?? path;
}
