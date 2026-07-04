import {
  nextScreen,
  parseGuess,
  isValidGuess,
  compareGuess,
  isNewHighScore,
  revealSlice,
  isFullyRevealed,
  normalizeNumber,
  isBusyNumber,
  dialOutcome,
} from '../bbsEngine';
import { COMPUSERVE_NUMBER, BUSY_NUMBERS } from '../bbsData';

describe('nextScreen menu state machine', () => {
  it('opens each section from the main menu', () => {
    expect(nextScreen('main', 'm')).toEqual({ screen: 'messages', action: 'none' });
    expect(nextScreen('main', 'F')).toEqual({ screen: 'files', action: 'none' });
    expect(nextScreen('main', 'g')).toEqual({ screen: 'games', action: 'none' });
    expect(nextScreen('main', 'o')).toEqual({ screen: 'operator', action: 'none' });
  });

  it('quits (disconnects) from the main menu on Q', () => {
    expect(nextScreen('main', 'q')).toEqual({ screen: 'goodbye', action: 'disconnect' });
  });

  it('ignores unknown keys on the main menu', () => {
    expect(nextScreen('main', 'z')).toEqual({ screen: 'main', action: 'none' });
  });

  it('returns to main from a sub-screen on Q or Escape', () => {
    expect(nextScreen('messages', 'q')).toEqual({ screen: 'main', action: 'none' });
    expect(nextScreen('files', 'Escape')).toEqual({ screen: 'main', action: 'none' });
    expect(nextScreen('operator', 'Q')).toEqual({ screen: 'main', action: 'none' });
  });

  it('raises a download action for D in the files area', () => {
    expect(nextScreen('files', 'd')).toEqual({ screen: 'files', action: 'download' });
    expect(nextScreen('files', 'D')).toEqual({ screen: 'files', action: 'download' });
  });
});

describe('guess-the-number logic', () => {
  it('parses only whole numbers', () => {
    expect(parseGuess('42')).toBe(42);
    expect(parseGuess('  7 ')).toBe(7);
    expect(parseGuess('abc')).toBeNull();
    expect(parseGuess('3.5')).toBeNull();
    expect(parseGuess('')).toBeNull();
  });

  it('validates the 1-100 range', () => {
    expect(isValidGuess(1)).toBe(true);
    expect(isValidGuess(100)).toBe(true);
    expect(isValidGuess(0)).toBe(false);
    expect(isValidGuess(101)).toBe(false);
  });

  it('compares a guess against the secret', () => {
    expect(compareGuess(50, 25)).toBe('low');
    expect(compareGuess(50, 75)).toBe('high');
    expect(compareGuess(50, 50)).toBe('correct');
  });

  it('tracks a fewest-tries high score', () => {
    expect(isNewHighScore(4, null)).toBe(true);
    expect(isNewHighScore(3, 5)).toBe(true);
    expect(isNewHighScore(6, 5)).toBe(false);
    expect(isNewHighScore(5, 5)).toBe(false);
  });
});

describe('2400-baud reveal helper', () => {
  const text = 'CONNECT 2400';

  it('reveals a growing prefix', () => {
    expect(revealSlice(text, 0)).toBe('');
    expect(revealSlice(text, 7)).toBe('CONNECT');
    expect(revealSlice(text, 999)).toBe(text);
    expect(revealSlice(text, -3)).toBe('');
  });

  it('reports completion', () => {
    expect(isFullyRevealed(text, 5)).toBe(false);
    expect(isFullyRevealed(text, text.length)).toBe(true);
  });
});

describe('busy-signal path', () => {
  it('normalizes numbers to digits', () => {
    expect(normalizeNumber('1-614-529-1340')).toBe('16145291340');
    expect(normalizeNumber('(206) 555 0197')).toBe('2065550197');
  });

  it('flags the CompuServe long-distance number as busy', () => {
    expect(isBusyNumber(COMPUSERVE_NUMBER, BUSY_NUMBERS)).toBe(true);
    expect(dialOutcome(COMPUSERVE_NUMBER, BUSY_NUMBERS)).toBe('busy');
  });

  it('gives a carrier for a reachable board', () => {
    expect(isBusyNumber('1-503-555-0142', BUSY_NUMBERS)).toBe(false);
    expect(dialOutcome('1-503-555-0142', BUSY_NUMBERS)).toBe('carrier');
  });

  it('ignores an empty number', () => {
    expect(isBusyNumber('', BUSY_NUMBERS)).toBe(false);
  });
});
