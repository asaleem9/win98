// Pure FreeCell game logic: dealing, move validation, and supermove math.
// Kept free of React/DOM so it can be unit tested in isolation.

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';

export interface Card {
  suit: Suit;
  rank: number; // 1 = Ace ... 13 = King
}

export interface FCState {
  tableau: Card[][];
  freeCells: (Card | null)[];
  foundations: Card[][];
  gameNum: number;
  moves: number;
  won: boolean;
}

export const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};
export const RANK_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

export function suitColor(suit: Suit): string {
  return isRed(suit) ? '#c00' : '#000';
}

export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

export function rankLabel(rank: number): string {
  return RANK_LABELS[rank] || String(rank);
}

/**
 * The classic Microsoft FreeCell / FreeCell Pro deal algorithm.
 *
 * Cards are numbered 0-51: rank = floor(card / 4) into "A23456789TJQK",
 * suit = card % 4 into "CDHS" (clubs, diamonds, hearts, spades).
 *
 * The shuffle is a backward Fisher-Yates pass driven by the classic MS
 * C-runtime LCG (state = state * 214013 + 2531011 mod 2^31, using the
 * top 15 bits of the result as the draw), followed by a full reversal
 * of the resulting order before dealing. This exact sequence reproduces
 * the well-documented Game #1 layout (JD KD 2S 4C 3S 6D 6S / ... ).
 */
export function msDeal(gameNum: number): Card[] {
  let state = gameNum;
  const rand = () => {
    state = (state * 214013 + 2531011) & 0x7fffffff;
    return (state >> 16) & 0x7fff;
  };

  const cards: number[] = [];
  for (let i = 0; i < 52; i++) cards[i] = i;
  for (let i = 51; i >= 1; i--) {
    const j = rand() % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  cards.reverse();

  const suitOrder: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
  return cards.map((c) => ({
    rank: Math.floor(c / 4) + 1,
    suit: suitOrder[c % 4],
  }));
}

export function dealGame(gameNum: number): FCState {
  const deck = msDeal(gameNum);
  const tableau: Card[][] = [[], [], [], [], [], [], [], []];
  for (let i = 0; i < 52; i++) {
    tableau[i % 8].push(deck[i]);
  }

  return {
    tableau,
    freeCells: [null, null, null, null],
    foundations: [[], [], [], []],
    gameNum,
    moves: 0,
    won: false,
  };
}

export function canMoveToFoundation(card: Card, foundations: Card[][]): number {
  for (let i = 0; i < 4; i++) {
    const f = foundations[i];
    if (f.length === 0 && card.rank === 1) return i;
    if (f.length > 0 && f[f.length - 1].suit === card.suit && f[f.length - 1].rank === card.rank - 1) return i;
  }
  return -1;
}

export function canPlaceOnTableau(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return true;
  const top = pile[pile.length - 1];
  return isRed(card.suit) !== isRed(top.suit) && card.rank === top.rank - 1;
}

export function isOrderedSequence(cards: Card[]): boolean {
  for (let i = 0; i < cards.length - 1; i++) {
    const above = cards[i];
    const below = cards[i + 1];
    if (isRed(above.suit) === isRed(below.suit) || above.rank !== below.rank + 1) return false;
  }
  return true;
}

/**
 * FreeCell "supermove" limit: the number of cards that can be moved in a
 * single drag, simulating moving cards through free cells and empty columns.
 *
 * (free cells + 1) * 2^(empty columns), where empty columns excludes the
 * destination column when the destination itself is empty (you can't use
 * the column you're moving into as one of the doubling slots).
 */
export function maxMovable(freeCellsEmpty: number, emptyTableauCols: number, destIsEmpty: boolean): number {
  const usableEmptyCols = destIsEmpty ? Math.max(0, emptyTableauCols - 1) : emptyTableauCols;
  return (freeCellsEmpty + 1) * Math.pow(2, usableEmptyCols);
}

export function checkWin(foundations: Card[][]): boolean {
  return foundations.every((f) => f.length === 13);
}

export function isSafeToAutoMove(card: Card, foundations: Card[][]): boolean {
  const oppositeColor = isRed(card.suit) ? 'black' : 'red';
  for (const f of foundations) {
    if (f.length === 0) continue;
    const topSuit = f[f.length - 1].suit;
    if ((isRed(topSuit) ? 'red' : 'black') === oppositeColor) {
      if (f[f.length - 1].rank < card.rank - 1) return false;
    }
  }
  return true;
}

/** Finds the start index of the longest valid descending-alternating sequence ending at the top of a pile. */
export function sequenceStart(pile: Card[]): number {
  let startIdx = pile.length - 1;
  while (startIdx > 0) {
    const above = pile[startIdx - 1];
    const below = pile[startIdx];
    if (isRed(above.suit) !== isRed(below.suit) && above.rank === below.rank + 1) {
      startIdx--;
    } else break;
  }
  return startIdx;
}

/**
 * Automatically sends any tableau/free-cell top card to a foundation when it's
 * "safe" to do so (aces/twos, or once both opposite-color foundations have
 * caught up enough that the card can no longer be needed on the tableau).
 * Repeats until no more safe moves are available, then re-checks for a win.
 */
export function autoMoveToFoundations(state: FCState): FCState {
  const s: FCState = {
    ...state,
    tableau: state.tableau.map((c) => [...c]),
    freeCells: [...state.freeCells],
    foundations: state.foundations.map((f) => [...f]),
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (let col = 0; col < 8; col++) {
      if (s.tableau[col].length === 0) continue;
      const card = s.tableau[col][s.tableau[col].length - 1];
      const fi = canMoveToFoundation(card, s.foundations);
      if (fi >= 0 && (card.rank <= 2 || isSafeToAutoMove(card, s.foundations))) {
        s.foundations[fi] = [...s.foundations[fi], card];
        s.tableau[col] = s.tableau[col].slice(0, -1);
        changed = true;
      }
    }
    for (let i = 0; i < 4; i++) {
      const card = s.freeCells[i];
      if (!card) continue;
      const fi = canMoveToFoundation(card, s.foundations);
      if (fi >= 0 && (card.rank <= 2 || isSafeToAutoMove(card, s.foundations))) {
        s.foundations[fi] = [...s.foundations[fi], card];
        s.freeCells[i] = null;
        changed = true;
      }
    }
  }

  s.won = checkWin(s.foundations);
  return s;
}
