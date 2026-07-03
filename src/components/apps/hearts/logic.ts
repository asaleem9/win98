// Pure Hearts game logic: deck/deal, legal-move rules, trick winner, scoring
// (incl. shoot-the-moon), and AI card selection. Kept free of React so it's
// easy to unit test and reason about in isolation from the UI.

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export interface Card {
  suit: Suit;
  rank: number; // 1 = Ace, 2-10, 11 = J, 12 = Q, 13 = K
}

export type Trick = (Card | null)[];
export type PassDirection = 'left' | 'right' | 'across' | 'none';
export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface CompletedTrick {
  trick: Trick;
  leadPlayer: number;
  winner: number;
}

export const SUITS: Suit[] = ['clubs', 'diamonds', 'spades', 'hearts'];
export const SUIT_SYMBOLS: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
export const RANK_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
export const PASS_ORDER: PassDirection[] = ['left', 'right', 'across', 'none'];

export function rankLabel(rank: number): string {
  return RANK_LABELS[rank] || String(rank);
}

export function suitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#c00' : '#000';
}

export function cardValue(card: Card): number {
  return card.rank === 1 ? 14 : card.rank;
}

export function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

export function isQueenOfSpades(card: Card): boolean {
  return card.suit === 'spades' && card.rank === 12;
}

export function sortHand(hand: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = { clubs: 0, diamonds: 1, spades: 2, hearts: 3 };
  return [...hand].sort((a, b) => suitOrder[a.suit] - suitOrder[b.suit] || cardValue(a) - cardValue(b));
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ suit, rank: rank === 14 ? 1 : rank });
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealHands(): Card[][] {
  const deck = shuffle(createDeck());
  return [deck.slice(0, 13), deck.slice(13, 26), deck.slice(26, 39), deck.slice(39, 52)];
}

export function findTwoOfClubs(hands: { hand: Card[] }[]): number {
  return hands.findIndex((p) => p.hand.some((c) => c.suit === 'clubs' && c.rank === 2));
}

export function getTrickWinner(trick: Trick, leadPlayer: number): number {
  const leadSuit = trick[leadPlayer]!.suit;
  let winnerIdx = leadPlayer;
  let highVal = cardValue(trick[leadPlayer]!);
  for (let i = 0; i < 4; i++) {
    const card = trick[i]!;
    if (card.suit === leadSuit && cardValue(card) > highVal) {
      highVal = cardValue(card);
      winnerIdx = i;
    }
  }
  return winnerIdx;
}

export function trickPoints(trick: Trick): number {
  let pts = 0;
  for (const card of trick) {
    if (!card) continue;
    if (card.suit === 'hearts') pts += 1;
    if (isQueenOfSpades(card)) pts += 13;
  }
  return pts;
}

export function isLegalPlay(
  card: Card,
  hand: Card[],
  trick: Trick,
  leadPlayer: number,
  heartsBroken: boolean,
  trickNumber: number,
): boolean {
  const leadCard = trick[leadPlayer];
  if (!leadCard) {
    // Leading
    if (trickNumber === 0) return card.suit === 'clubs' && card.rank === 2;
    if (!heartsBroken && card.suit === 'hearts') {
      return hand.every((c) => c.suit === 'hearts');
    }
    return true;
  }
  // Must follow suit
  const hasSuit = hand.some((c) => c.suit === leadCard.suit);
  if (hasSuit) return card.suit === leadCard.suit;
  // Can't play hearts or QoS on first trick when void of lead suit
  if (trickNumber === 0) {
    if (card.suit === 'hearts' || isQueenOfSpades(card)) {
      return hand.every((c) => c.suit === 'hearts' || isQueenOfSpades(c));
    }
  }
  return true;
}

export function legalPlays(
  hand: Card[],
  trick: Trick,
  leadPlayer: number,
  heartsBroken: boolean,
  trickNumber: number,
): Card[] {
  return hand.filter((c) => isLegalPlay(c, hand, trick, leadPlayer, heartsBroken, trickNumber));
}

/** Result of scoring a completed round, including shoot-the-moon handling. */
export interface RoundScoreResult {
  scores: number[];
  moonShooter: number | null;
}

/** Applies shoot-the-moon: a player who alone takes all 26 points scores 0, everyone else +26. */
export function scoreRound(roundPoints: number[]): RoundScoreResult {
  const moonShooter = roundPoints.findIndex((p) => p === 26);
  if (moonShooter < 0) {
    return { scores: [...roundPoints], moonShooter: null };
  }
  const scores = roundPoints.map((_, i) => (i === moonShooter ? 0 : 26));
  return { scores, moonShooter };
}

/** Infers which suits each player is known to be void in, from completed tricks this round. */
export function computeVoids(completedTricks: CompletedTrick[]): Record<number, Set<Suit>> {
  const voids: Record<number, Set<Suit>> = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() };
  for (const { trick, leadPlayer } of completedTricks) {
    const leadSuit = trick[leadPlayer]?.suit;
    if (!leadSuit) continue;
    for (let i = 0; i < 4; i++) {
      const card = trick[i];
      if (card && card.suit !== leadSuit) {
        voids[i].add(leadSuit);
      }
    }
  }
  return voids;
}

interface AIChooseCardOptions {
  playerIdx: number;
  hand: Card[];
  trick: Trick;
  leadPlayer: number;
  heartsBroken: boolean;
  trickNumber: number;
  difficulty: AIDifficulty;
  completedTricks?: CompletedTrick[];
}

export function aiChooseCard(options: AIChooseCardOptions): Card {
  const { hand, trick, leadPlayer, heartsBroken, trickNumber, difficulty } = options;
  const legal = legalPlays(hand, trick, leadPlayer, heartsBroken, trickNumber);
  if (legal.length === 0) return hand[0];
  if (legal.length === 1) return legal[0];

  if (difficulty === 'easy') {
    return legal[Math.floor(Math.random() * legal.length)];
  }

  const leadCard = trick[leadPlayer];

  if (leadCard) {
    const followCards = legal.filter((c) => c.suit === leadCard.suit);
    if (followCards.length > 0) {
      const sorted = [...followCards].sort((a, b) => cardValue(a) - cardValue(b));
      if (difficulty === 'medium') {
        return sorted[0];
      }
      // hard: try to duck below the current winning card of the trick when possible,
      // otherwise if forced to win, win as cheaply as possible.
      const cardsInTrick = trick.filter((c): c is Card => !!c && c.suit === leadCard.suit);
      const currentBest = cardsInTrick.length > 0 ? Math.max(...cardsInTrick.map(cardValue)) : 0;
      const safe = sorted.filter((c) => cardValue(c) < currentBest);
      if (safe.length > 0) return safe[safe.length - 1]; // highest card that still loses (shed danger)
      return sorted[0]; // must win: win as cheaply as possible
    }

    // Void of lead suit: dump the most dangerous card
    const qos = legal.find(isQueenOfSpades);
    if (qos) return qos;
    const hearts = [...legal].filter((c) => c.suit === 'hearts').sort((a, b) => cardValue(b) - cardValue(a));
    if (hearts.length > 0) return hearts[0];
    if (difficulty === 'hard') {
      // Dump the highest card from whichever suit we hold the fewest of, to void out sooner.
      const bySuit: Partial<Record<Suit, Card[]>> = {};
      for (const c of legal) (bySuit[c.suit] ??= []).push(c);
      const suitsAvail = Object.keys(bySuit) as Suit[];
      suitsAvail.sort((a, b) => (bySuit[a]!.length - bySuit[b]!.length));
      const target = bySuit[suitsAvail[0]]!;
      return [...target].sort((a, b) => cardValue(b) - cardValue(a))[0];
    }
    const nonHeartsVoid = [...legal].sort((a, b) => cardValue(b) - cardValue(a));
    return nonHeartsVoid[0];
  }

  // Leading
  const nonHearts = legal.filter((c) => c.suit !== 'hearts');
  const pool = nonHearts.length > 0 ? nonHearts : legal;
  if (difficulty === 'hard') {
    const voids = options.completedTricks ? computeVoids(options.completedTricks) : undefined;
    const nextPlayer = (options.playerIdx + 1) % 4;
    // Prefer leading a suit the next opponent is void in less often (keeps them from free-dumping),
    // otherwise lead the lowest card to preserve control.
    const safest = [...pool].sort((a, b) => {
      const aRisky = voids?.[nextPlayer]?.has(a.suit) ? 1 : 0;
      const bRisky = voids?.[nextPlayer]?.has(b.suit) ? 1 : 0;
      if (aRisky !== bRisky) return aRisky - bRisky;
      return cardValue(a) - cardValue(b);
    });
    return safest[0];
  }
  const sortedPool = [...pool].sort((a, b) => cardValue(a) - cardValue(b));
  return sortedPool[0];
}

export function aiChoosePassCards(hand: Card[], difficulty: AIDifficulty = 'medium'): Card[] {
  if (difficulty === 'easy') {
    return [...shuffle(hand)].slice(0, 3);
  }
  const priority = [...hand].sort((a, b) => {
    const aQos = isQueenOfSpades(a) ? 1 : 0;
    const bQos = isQueenOfSpades(b) ? 1 : 0;
    if (aQos !== bQos) return bQos - aQos;
    const aHighSpade = a.suit === 'spades' && cardValue(a) >= 12 ? 1 : 0;
    const bHighSpade = b.suit === 'spades' && cardValue(b) >= 12 ? 1 : 0;
    if (aHighSpade !== bHighSpade) return bHighSpade - aHighSpade;
    return cardValue(b) - cardValue(a);
  });
  return priority.slice(0, 3);
}
