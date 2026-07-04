// Pure state + data helpers for the CD Player. Kept free of React/DOM so the
// transport state machine, track mapping, and time math can be unit-tested.

import { MusicTrack, musicTracks } from '@/lib/audio/tracks';

// The disc that's "in" the D: drive. A late-'90s hits compilation whose tracks
// are voiced by the bundled MP3s so playback matches what's printed on screen.
export const CD_DISC_TITLE = "Now That's What I Call 1998";
export const CD_DISC_ARTIST = 'Various Artists';

export interface CdTrack {
  /** 1-based track number as printed on the disc */
  number: number;
  title: string;
  artist: string;
  /** Nominal running time (seconds) shown before the audio reports a real one */
  durationSec: number;
  /** The bundled MusicTrack this CD track sounds */
  track: MusicTrack;
}

// Nominal per-track running times so the LED shows a plausible disc before any
// audio has loaded a real duration. Indexed to musicTracks.
const NOMINAL_SECONDS = [217, 194, 243, 205, 228, 231];

export const CD_TRACKS: CdTrack[] = musicTracks.map((t, i) => ({
  number: i + 1,
  title: t.title,
  artist: t.artist,
  durationSec: NOMINAL_SECONDS[i] ?? 210,
  track: t,
}));

export const CD_TRACK_COUNT = CD_TRACKS.length;

/** Total nominal running time of the disc, in seconds. */
export function cdTotalDurationSec(): number {
  return CD_TRACKS.reduce((sum, t) => sum + t.durationSec, 0);
}

/** Format seconds as a two-digit mm:ss LED clock; junk renders as 00:00. */
export function formatCdTime(totalSeconds: number): string {
  const s = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// --- transport state machine ------------------------------------------------

export type CdStatus = 'playing' | 'paused' | 'stopped' | 'empty';

export interface CdMode {
  /** Random Order — shuffle track selection */
  random: boolean;
  /** Continuous Play — loop back to track 1 at the end of the disc */
  continuous: boolean;
  /** Intro Play — sample the first few seconds of every track */
  intro: boolean;
}

export interface CdState {
  status: CdStatus;
  /** 0-based index into CD_TRACKS */
  track: number;
  mode: CdMode;
}

export const INITIAL_CD_STATE: CdState = {
  status: 'stopped',
  track: 0,
  mode: { random: false, continuous: false, intro: false },
};

/** Seconds of each track sampled while Intro Play is on. */
export const INTRO_SECONDS = 10;

export type CdAction =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'EJECT' }
  | { type: 'SELECT'; index: number }
  | { type: 'ENDED' }
  | { type: 'TOGGLE_RANDOM' }
  | { type: 'TOGGLE_CONTINUOUS' }
  | { type: 'TOGGLE_INTRO' };

// Pick a random index that isn't the current one, so a shuffle never repeats a
// track back-to-back.
function pickShuffled(current: number, length: number, rng: () => number): number {
  let idx = Math.floor(rng() * (length - 1));
  if (idx >= current) idx += 1;
  return Math.min(idx, length - 1);
}

/** Manual previous/next. Always returns a valid index, wrapping at the ends. */
export function cdManualStep(
  current: number,
  count: number,
  dir: 1 | -1,
  random: boolean,
  rng: () => number = Math.random,
): number {
  if (count <= 0) return 0;
  if (count === 1) return 0;
  if (random) return pickShuffled(current, count, rng);
  return (current + dir + count) % count;
}

/**
 * Auto-advance when a track finishes (or an Intro-Play sample ends). Returns the
 * next index, or null when playback should stop (end of a non-continuous disc).
 */
export function cdAutoNext(
  current: number,
  count: number,
  mode: CdMode,
  rng: () => number = Math.random,
): number | null {
  if (count <= 0) return null;
  if (mode.random) {
    if (count === 1) return mode.continuous ? 0 : null;
    return pickShuffled(current, count, rng);
  }
  const next = current + 1;
  if (next < count) return next;
  return mode.continuous ? 0 : null;
}

/**
 * The transport reducer. `count`/`rng` are injected so tests stay deterministic;
 * the component binds them to the real disc and Math.random.
 */
export function cdReducer(
  state: CdState,
  action: CdAction,
  count: number = CD_TRACK_COUNT,
  rng: () => number = Math.random,
): CdState {
  switch (action.type) {
    case 'PLAY':
      if (state.status === 'empty') return state;
      return { ...state, status: 'playing' };

    case 'PAUSE':
      if (state.status === 'playing') return { ...state, status: 'paused' };
      if (state.status === 'paused') return { ...state, status: 'playing' };
      return state;

    case 'STOP':
      if (state.status === 'empty') return state;
      return { ...state, status: 'stopped' };

    case 'NEXT':
      if (state.status === 'empty') return state;
      return { ...state, track: cdManualStep(state.track, count, 1, state.mode.random, rng) };

    case 'PREV':
      if (state.status === 'empty') return state;
      return { ...state, track: cdManualStep(state.track, count, -1, state.mode.random, rng) };

    case 'EJECT':
      // Eject toggles the tray: pop the disc out, or reload it fresh.
      if (state.status === 'empty') return { ...state, status: 'stopped', track: 0 };
      return { ...state, status: 'empty', track: 0 };

    case 'SELECT': {
      if (state.status === 'empty') return state;
      const idx = Math.min(Math.max(action.index, 0), Math.max(count - 1, 0));
      return { ...state, track: idx };
    }

    case 'ENDED': {
      if (state.status === 'empty') return state;
      const next = cdAutoNext(state.track, count, state.mode, rng);
      if (next === null) return { ...state, status: 'stopped' };
      return { ...state, track: next, status: 'playing' };
    }

    case 'TOGGLE_RANDOM':
      return { ...state, mode: { ...state.mode, random: !state.mode.random } };

    case 'TOGGLE_CONTINUOUS':
      return { ...state, mode: { ...state.mode, continuous: !state.mode.continuous } };

    case 'TOGGLE_INTRO':
      return { ...state, mode: { ...state.mode, intro: !state.mode.intro } };

    default:
      return state;
  }
}
