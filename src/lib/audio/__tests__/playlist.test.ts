import {
  formatTime,
  manualStep,
  autoNext,
  totalDuration,
  basename,
  resolveTrackFromContent,
  playlistForLaunch,
} from '@/lib/audio/playlist';
import { musicTracks } from '@/lib/audio/tracks';

describe('formatTime', () => {
  it('formats seconds as mm:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(3599)).toBe('59:59');
  });

  it('returns the placeholder for invalid input', () => {
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(-1)).toBe('0:00');
    expect(formatTime(Infinity, '--:--')).toBe('--:--');
  });
});

describe('manualStep', () => {
  it('wraps forward and backward', () => {
    expect(manualStep(0, 6, 1, false)).toBe(1);
    expect(manualStep(5, 6, 1, false)).toBe(0);
    expect(manualStep(0, 6, -1, false)).toBe(5);
  });

  it('stays at 0 for empty or single-track lists', () => {
    expect(manualStep(0, 0, 1, false)).toBe(0);
    expect(manualStep(0, 1, 1, false)).toBe(0);
  });

  it('shuffle never returns the current index', () => {
    for (let r = 0; r < 1; r += 0.05) {
      const next = manualStep(2, 6, 1, true, () => r);
      expect(next).not.toBe(2);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(6);
    }
  });
});

describe('autoNext', () => {
  it('advances then stops when repeat is off', () => {
    expect(autoNext(0, 3, 'off', false)).toBe(1);
    expect(autoNext(2, 3, 'off', false)).toBeNull();
  });

  it('wraps when repeat is all', () => {
    expect(autoNext(2, 3, 'all', false)).toBe(0);
  });

  it('repeats the same track when repeat is one', () => {
    expect(autoNext(1, 3, 'one', false)).toBe(1);
  });

  it('shuffle picks another index and respects repeat off at single track', () => {
    expect(autoNext(0, 1, 'off', true)).toBeNull();
    expect(autoNext(0, 1, 'all', true)).toBe(0);
    const next = autoNext(1, 4, 'off', true, () => 0.5);
    expect(next).not.toBe(1);
  });
});

describe('totalDuration', () => {
  it('sums known durations and ignores undefined', () => {
    expect(totalDuration([60, undefined, 30, NaN])).toBe(90);
  });
});

describe('basename', () => {
  it('extracts the filename from a Windows path', () => {
    expect(basename('C:\\My Documents\\Downloads\\song.mp3')).toBe('song.mp3');
    expect(basename('song.mp3')).toBe('song.mp3');
  });
});

describe('resolveTrackFromContent', () => {
  it('resolves a track: reference to the bundled track', () => {
    expect(resolveTrackFromContent('track:y2k-panic')?.id).toBe('y2k-panic');
    expect(resolveTrackFromContent('track:midnight-midi ')?.id).toBe('midnight-midi');
  });

  it('returns undefined for unknown ids and non-reference content', () => {
    expect(resolveTrackFromContent('track:not-a-real-track')).toBeUndefined();
    expect(resolveTrackFromContent('[MP3 Audio]')).toBeUndefined();
    expect(resolveTrackFromContent('data:audio/mpeg;base64,AAAA')).toBeUndefined();
    expect(resolveTrackFromContent(null)).toBeUndefined();
    expect(resolveTrackFromContent(undefined)).toBeUndefined();
  });
});

describe('playlistForLaunch', () => {
  it('returns all tracks starting at 0 with no launch file', () => {
    const { list, index } = playlistForLaunch();
    expect(list).toHaveLength(musicTracks.length);
    expect(index).toBe(0);
  });

  it('honors a track: content reference over the filename', () => {
    const target = musicTracks.find((t) => t.id === 'midnight-midi')!;
    const { list, index } = playlistForLaunch('C:\\Downloads\\anything.mp3', 'track:midnight-midi');
    expect(list[index].id).toBe(target.id);
  });

  it('falls back to filename matching when there is no track: reference', () => {
    const y2k = musicTracks.find((t) => t.id === 'y2k-panic')!;
    const { list, index } = playlistForLaunch(`C:\\Downloads\\${y2k.fileName}`, '[MP3 Audio]');
    expect(list[index].id).toBe('y2k-panic');
  });

  it('fronts an unknown file with its own name and a stand-in track', () => {
    const { list, index } = playlistForLaunch('C:\\Downloads\\mystery.mp3', null);
    expect(index).toBe(0);
    expect(list[0].title).toBe('mystery.mp3');
    expect(list.length).toBe(musicTracks.length + 1);
  });
});
