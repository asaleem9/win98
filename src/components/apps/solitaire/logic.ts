// Pure game logic for Solitaire (Klondike). No React, no DOM — safe to unit test.

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Color = 'red' | 'black';
export type ScoringMode = 'standard' | 'vegas' | 'none';

export interface Card {
  suit: Suit;
  rank: number; // 1=Ace, 2-10, 11=J, 12=Q, 13=K
  faceUp: boolean;
}

export interface GameState {
  tableau: Card[][];
  foundations: Card[][];
  stock: Card[];
  waste: Card[];
  drawCount: 1 | 3;
  moves: number;
  won: boolean;
  score: number;
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};
export const RANK_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

export function suitColor(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function rankLabel(rank: number): string {
  return RANK_LABELS[rank] || String(rank);
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank, faceUp: false });
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function initGame(drawCount: 1 | 3, rng: () => number = Math.random): GameState {
  const deck = shuffle(createDeck(), rng);
  const tableau: Card[][] = [];
  let idx = 0;
  for (let col = 0; col < 7; col++) {
    const pile: Card[] = [];
    for (let row = 0; row <= col; row++) {
      pile.push({ ...deck[idx], faceUp: row === col });
      idx++;
    }
    tableau.push(pile);
  }
  const stock = deck.slice(idx).map((c) => ({ ...c, faceUp: false }));
  return {
    tableau,
    foundations: [[], [], [], []],
    stock,
    waste: [],
    drawCount,
    moves: 0,
    won: false,
    score: 0,
  };
}

export function canPlaceOnTableau(card: Card, target: Card[]): boolean {
  if (target.length === 0) return card.rank === 13;
  const top = target[target.length - 1];
  if (!top.faceUp) return false;
  return suitColor(card.suit) !== suitColor(top.suit) && card.rank === top.rank - 1;
}

export function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 1;
  const top = foundation[foundation.length - 1];
  return card.suit === top.suit && card.rank === top.rank + 1;
}

export function checkWin(foundations: Card[][]): boolean {
  return foundations.every((f) => f.length === 13);
}

/**
 * Validates that `cards` (top of a tableau pile, in order from bottom to top
 * of the sub-stack) form a legal descending, alternating-color sequence and
 * are all face up — the requirement for dragging more than one card at once.
 */
export function isValidSequence(cards: Card[]): boolean {
  if (cards.length === 0) return false;
  for (let i = 0; i < cards.length; i++) {
    if (!cards[i].faceUp) return false;
    if (i > 0) {
      const prev = cards[i - 1];
      const cur = cards[i];
      if (suitColor(prev.suit) === suitColor(cur.suit)) return false;
      if (prev.rank !== cur.rank + 1) return false;
    }
  }
  return true;
}

// ----- Scoring -----
// Standard Windows Solitaire scoring (simplified, well-known point values).
export const SCORE = {
  wasteToTableau: 5,
  wasteToFoundation: 10,
  tableauToFoundation: 10,
  foundationToTableau: -15,
  turnOverTableauCard: 5,
  recycleWastePenalty: -100, // Vegas only, applied via redealPenalty helper below
};

export type MoveKind =
  | 'wasteToTableau'
  | 'wasteToFoundation'
  | 'tableauToFoundation'
  | 'foundationToTableau'
  | 'tableauToTableau'
  | 'turnOverTableauCard'
  | 'stockDraw'
  | 'stockRecycle';

export function scoreForMove(kind: MoveKind, mode: ScoringMode): number {
  if (mode === 'none') return 0;
  switch (kind) {
    case 'wasteToTableau':
      return SCORE.wasteToTableau;
    case 'wasteToFoundation':
      return SCORE.wasteToFoundation;
    case 'tableauToFoundation':
      return SCORE.tableauToFoundation;
    case 'foundationToTableau':
      return SCORE.foundationToTableau;
    case 'turnOverTableauCard':
      return SCORE.turnOverTableauCard;
    case 'stockRecycle':
      return mode === 'vegas' ? SCORE.recycleWastePenalty : 0;
    default:
      return 0;
  }
}

/** Classic Windows Solitaire time-bonus formula for Standard scoring. */
export function timeBonus(seconds: number): number {
  if (seconds <= 0) return 0;
  // Bonus shrinks as time grows; capped, never negative.
  const bonus = Math.floor(700000 / seconds);
  return Math.min(bonus, 20000);
}

/** Vegas scoring starts at -52 (cost of the deck) and has no time bonus. */
export function vegasStartingScore(): number {
  return -52;
}
