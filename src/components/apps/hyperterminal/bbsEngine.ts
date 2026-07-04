// Pure, deterministic logic for the HyperTerminal BBS: the single-key menu state
// machine, the guess-the-number game, the 2400-baud streaming-reveal helper, and
// the busy-signal check. No timers or randomness here so it is fully testable.

export type BbsScreen = 'main' | 'messages' | 'files' | 'games' | 'operator' | 'goodbye';

export type BbsAction = 'none' | 'download' | 'disconnect';

export interface BbsTransition {
  screen: BbsScreen;
  action: BbsAction;
}

/** Lowercase single characters; leave named keys (Escape, Enter) intact. */
function normKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

/**
 * Advance the menu state machine for a keypress. From the main menu each letter
 * opens a section (and (Q)uit disconnects); from any sub-screen Q or Escape goes
 * back to main, and in Files (D)ownload raises the download action.
 */
export function nextScreen(screen: BbsScreen, key: string): BbsTransition {
  const k = normKey(key);

  // On any sub-screen, Q / Escape returns to the main menu.
  if (screen !== 'main' && screen !== 'goodbye' && (k === 'q' || k === 'Escape')) {
    return { screen: 'main', action: 'none' };
  }

  switch (screen) {
    case 'main':
      switch (k) {
        case 'm': return { screen: 'messages', action: 'none' };
        case 'f': return { screen: 'files', action: 'none' };
        case 'g': return { screen: 'games', action: 'none' };
        case 'o': return { screen: 'operator', action: 'none' };
        case 'q': return { screen: 'goodbye', action: 'disconnect' };
        default: return { screen, action: 'none' };
      }
    case 'files':
      if (k === 'd') return { screen: 'files', action: 'download' };
      return { screen, action: 'none' };
    default:
      return { screen, action: 'none' };
  }
}

// --- guess-the-number -------------------------------------------------------

export type GuessResult = 'low' | 'high' | 'correct';

/** Parse a line of typed input into a whole number, or null if it isn't one. */
export function parseGuess(input: string): number | null {
  const trimmed = input.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return parseInt(trimmed, 10);
}

export function isValidGuess(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 100;
}

export function compareGuess(secret: number, guess: number): GuessResult {
  if (guess < secret) return 'low';
  if (guess > secret) return 'high';
  return 'correct';
}

/** A new high score is set only when you beat the record in fewer tries. */
export function isNewHighScore(tries: number, currentBest: number | null): boolean {
  return currentBest === null || tries < currentBest;
}

// --- 2400-baud streaming reveal ---------------------------------------------

/** The visible prefix of `text` after `count` characters have streamed in. */
export function revealSlice(text: string, count: number): string {
  if (count <= 0) return '';
  if (count >= text.length) return text;
  return text.slice(0, count);
}

export function isFullyRevealed(text: string, count: number): boolean {
  return count >= text.length;
}

// --- dialing ----------------------------------------------------------------

/** Strip a phone number down to its digits for comparison. */
export function normalizeNumber(number: string): string {
  return number.replace(/\D/g, '');
}

/** True when the dialed number matches one of the known-busy numbers. */
export function isBusyNumber(number: string, busyNumbers: string[]): boolean {
  const n = normalizeNumber(number);
  if (!n) return false;
  return busyNumbers.some((b) => normalizeNumber(b) === n);
}

export type DialOutcome = 'busy' | 'carrier';

/** The result of dialing a number: busy signal or a carrier (connection). */
export function dialOutcome(number: string, busyNumbers: string[]): DialOutcome {
  return isBusyNumber(number, busyNumbers) ? 'busy' : 'carrier';
}
