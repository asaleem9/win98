import { formatTime, manualStep, autoNext, totalDuration, basename } from '@/lib/audio/playlist';

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
