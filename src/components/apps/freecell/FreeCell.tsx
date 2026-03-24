'use client';

import { useState, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { StatusBar98 } from '@/components/ui/StatusBar98';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

interface Card {
  suit: Suit;
  rank: number;
}

interface FCState {
  tableau: Card[][];
  freeCells: (Card | null)[];
  foundations: Card[][];
  gameNum: number;
  moves: number;
  won: boolean;
}

interface Selection {
  area: 'tableau' | 'freecell';
  col: number;
  cardIndex: number;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS: Record<Suit, string> = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const RANK_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function suitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#c00' : '#000';
}

function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

function rankLabel(rank: number): string {
  return RANK_LABELS[rank] || String(rank);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 214013 + 2531011) & 0x7fffffff;
    return (s >> 16) & 0x7fff;
  };
}

function dealGame(gameNum: number): FCState {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank });
    }
  }

  const rand = seededRandom(gameNum);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = rand() % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

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

function canMoveToFoundation(card: Card, foundations: Card[][]): number {
  for (let i = 0; i < 4; i++) {
    const f = foundations[i];
    if (f.length === 0 && card.rank === 1) return i;
    if (f.length > 0 && f[f.length - 1].suit === card.suit && f[f.length - 1].rank === card.rank - 1) return i;
  }
  return -1;
}

function canPlaceOnTableau(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return true;
  const top = pile[pile.length - 1];
  return isRed(card.suit) !== isRed(top.suit) && card.rank === top.rank - 1;
}

function maxMovable(freeCellsEmpty: number, emptyTableauCols: number): number {
  return (freeCellsEmpty + 1) * Math.pow(2, emptyTableauCols);
}

function checkWin(foundations: Card[][]): boolean {
  return foundations.every((f) => f.length === 13);
}

function CardView({ card, onClick }: { card: Card; onClick?: () => void }) {
  const color = suitColor(card.suit);
  return (
    <div
      onClick={onClick}
      className="w-[54px] h-[74px] rounded-[3px] border border-[#999] bg-white cursor-pointer select-none flex-shrink-0 relative font-[family-name:var(--win98-font)]"
    >
      <div className="absolute top-[1px] left-[2px] text-[9px] leading-tight font-bold" style={{ color }}>
        <div>{rankLabel(card.rank)}</div>
        <div className="-mt-[2px]">{SUIT_SYMBOLS[card.suit]}</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-[20px]" style={{ color }}>
        {SUIT_SYMBOLS[card.suit]}
      </div>
    </div>
  );
}

function EmptySlot({ label, onClick, variant }: { label?: string; onClick?: () => void; variant?: 'freecell' | 'foundation' }) {
  return (
    <div
      onClick={onClick}
      className={`w-[54px] h-[74px] rounded-[3px] border-2 border-dashed flex items-center justify-center text-[18px] select-none cursor-pointer ${
        variant === 'foundation' ? 'border-[rgba(255,255,255,0.35)] text-[rgba(255,255,255,0.4)]' : 'border-[rgba(255,255,255,0.25)] text-[rgba(255,255,255,0.3)]'
      }`}
    >
      {label}
    </div>
  );
}

export default function FreeCell({ windowId }: AppComponentProps) {
  const [game, setGame] = useState<FCState>(() => dealGame(Math.floor(Math.random() * 32000) + 1));
  const [selected, setSelected] = useState<Selection | null>(null);

  const newGame = useCallback((num?: number) => {
    const gn = num ?? Math.floor(Math.random() * 32000) + 1;
    setGame(dealGame(gn));
    setSelected(null);
  }, []);

  const autoMoveToFoundations = useCallback((state: FCState): FCState => {
    let changed = true;
    let s = { ...state, tableau: state.tableau.map((c) => [...c]), freeCells: [...state.freeCells], foundations: state.foundations.map((f) => [...f]) };
    while (changed) {
      changed = false;
      // Check tableau tops
      for (let col = 0; col < 8; col++) {
        if (s.tableau[col].length === 0) continue;
        const card = s.tableau[col][s.tableau[col].length - 1];
        const fi = canMoveToFoundation(card, s.foundations);
        if (fi >= 0) {
          // Only auto-move if safe: rank <= 2 or both opposite-color (rank-1) are on foundations
          if (card.rank <= 2 || isSafeToAutoMove(card, s.foundations)) {
            s.foundations[fi] = [...s.foundations[fi], card];
            s.tableau[col] = s.tableau[col].slice(0, -1);
            changed = true;
          }
        }
      }
      // Check free cells
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
  }, []);

  const handleClick = useCallback((area: 'tableau' | 'freecell' | 'foundation', col: number, cardIndex?: number) => {
    if (game.won) return;

    if (selected && selected.area === area && selected.col === col) {
      setSelected(null);
      return;
    }

    if (selected) {
      setGame((prev) => {
        let cards: Card[] = [];
        if (selected.area === 'freecell') {
          const c = prev.freeCells[selected.col];
          if (c) cards = [c];
        } else {
          cards = prev.tableau[selected.col].slice(selected.cardIndex);
        }
        if (cards.length === 0) return prev;

        // Move to foundation
        if (area === 'foundation' && cards.length === 1) {
          const fi = canMoveToFoundation(cards[0], prev.foundations);
          if (fi >= 0 && fi === col) {
            const newFoundations = prev.foundations.map((f, i) => (i === fi ? [...f, cards[0]] : [...f]));
            let newTableau = prev.tableau.map((c) => [...c]);
            let newFreeCells = [...prev.freeCells];
            if (selected.area === 'tableau') {
              newTableau[selected.col] = newTableau[selected.col].slice(0, selected.cardIndex);
            } else {
              newFreeCells[selected.col] = null;
            }
            const s = autoMoveToFoundations({ ...prev, tableau: newTableau, freeCells: newFreeCells, foundations: newFoundations, moves: prev.moves + 1 });
            return s;
          }
        }

        // Move to free cell
        if (area === 'freecell' && cards.length === 1 && prev.freeCells[col] === null) {
          let newTableau = prev.tableau.map((c) => [...c]);
          let newFreeCells = [...prev.freeCells];
          if (selected.area === 'tableau') {
            newTableau[selected.col] = newTableau[selected.col].slice(0, selected.cardIndex);
          } else {
            newFreeCells[selected.col] = null;
          }
          newFreeCells[col] = cards[0];
          return autoMoveToFoundations({ ...prev, tableau: newTableau, freeCells: newFreeCells, moves: prev.moves + 1 });
        }

        // Move to tableau
        if (area === 'tableau') {
          const targetPile = prev.tableau[col];
          if (canPlaceOnTableau(cards[0], targetPile) || targetPile.length === 0) {
            const freeCount = prev.freeCells.filter((c) => c === null).length;
            const emptyCount = prev.tableau.filter((t, i) => t.length === 0 && i !== col && (selected.area !== 'tableau' || i !== selected.col)).length;
            if (cards.length > maxMovable(freeCount, emptyCount)) return prev;
            if (cards.length > 1 && !canPlaceOnTableau(cards[0], targetPile)) return prev;

            let newTableau = prev.tableau.map((c) => [...c]);
            let newFreeCells = [...prev.freeCells];
            if (selected.area === 'tableau') {
              newTableau[selected.col] = newTableau[selected.col].slice(0, selected.cardIndex);
            } else {
              newFreeCells[selected.col] = null;
            }
            newTableau[col] = [...newTableau[col], ...cards];
            return autoMoveToFoundations({ ...prev, tableau: newTableau, freeCells: newFreeCells, moves: prev.moves + 1 });
          }
        }

        return prev;
      });
      setSelected(null);
      return;
    }

    // Select a card
    if (area === 'freecell' && game.freeCells[col]) {
      setSelected({ area: 'freecell', col, cardIndex: 0 });
    } else if (area === 'tableau' && game.tableau[col].length > 0) {
      // Find the deepest valid sequence from the bottom
      const pile = game.tableau[col];
      let startIdx = pile.length - 1;
      while (startIdx > 0) {
        const above = pile[startIdx - 1];
        const below = pile[startIdx];
        if (isRed(above.suit) !== isRed(below.suit) && above.rank === below.rank + 1) {
          startIdx--;
        } else break;
      }
      const ci = cardIndex !== undefined && cardIndex >= startIdx ? cardIndex : pile.length - 1;
      setSelected({ area: 'tableau', col, cardIndex: ci });
    }
  }, [game, selected, autoMoveToFoundations]);

  const handleDoubleClick = useCallback((area: 'tableau' | 'freecell', col: number) => {
    if (game.won) return;
    setGame((prev) => {
      let card: Card | null = null;
      if (area === 'tableau' && prev.tableau[col].length > 0) {
        card = prev.tableau[col][prev.tableau[col].length - 1];
      } else if (area === 'freecell') {
        card = prev.freeCells[col];
      }
      if (!card) return prev;

      const fi = canMoveToFoundation(card, prev.foundations);
      if (fi >= 0) {
        const newFoundations = prev.foundations.map((f, i) => (i === fi ? [...f, card!] : [...f]));
        let newTableau = prev.tableau.map((c) => [...c]);
        let newFreeCells = [...prev.freeCells];
        if (area === 'tableau') {
          newTableau[col] = newTableau[col].slice(0, -1);
        } else {
          newFreeCells[col] = null;
        }
        return autoMoveToFoundations({ ...prev, tableau: newTableau, freeCells: newFreeCells, foundations: newFoundations, moves: prev.moves + 1 });
      }
      return prev;
    });
    setSelected(null);
  }, [game, autoMoveToFoundations]);

  const menus: MenuDefinition[] = [
    {
      label: 'Game',
      items: [
        { label: 'New Game', shortcut: 'F2', onClick: () => newGame() },
        { label: 'Restart', onClick: () => newGame(game.gameNum) },
        { label: '', separator: true },
        { label: 'Select Game...', onClick: () => {
          const num = prompt('Enter a game number (1-32000):');
          if (num) { const n = parseInt(num); if (n >= 1 && n <= 32000) newGame(n); }
        }},
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'About FreeCell...', onClick: () => {} },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <MenuBar menus={menus} />

      <div className="flex-1 bg-[#008000] p-2 overflow-auto">
        {game.won && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40">
            <div className="bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] p-6 text-center">
              <div className="text-lg font-bold mb-3">You Win!</div>
              <div className="mb-3">Game #{game.gameNum} completed in {game.moves} moves!</div>
              <button onClick={() => newGame()} className="px-4 py-1 bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]">
                New Game
              </button>
            </div>
          </div>
        )}

        {/* Top row: Free cells + Foundations */}
        <div className="flex justify-between mb-3">
          <div className="flex gap-1">
            {game.freeCells.map((cell, i) => (
              <div
                key={i}
                onClick={() => handleClick('freecell', i)}
                onDoubleClick={() => cell && handleDoubleClick('freecell', i)}
              >
                {cell ? (
                  <div className={selected?.area === 'freecell' && selected?.col === i ? 'ring-2 ring-yellow-300 rounded-[3px]' : ''}>
                    <CardView card={cell} />
                  </div>
                ) : (
                  <EmptySlot variant="freecell" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {game.foundations.map((f, i) => (
              <div key={i} onClick={() => handleClick('foundation', i)}>
                {f.length > 0 ? (
                  <CardView card={f[f.length - 1]} />
                ) : (
                  <EmptySlot label={SUIT_SYMBOLS[SUITS[i]]} variant="foundation" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tableau */}
        <div className="flex gap-1 justify-center">
          {game.tableau.map((pile, col) => (
            <div key={col} className="relative w-[54px]" style={{ minHeight: 74 }}>
              {pile.length === 0 ? (
                <EmptySlot onClick={() => handleClick('tableau', col)} />
              ) : (
                pile.map((card, i) => (
                  <div
                    key={i}
                    className="absolute left-0"
                    style={{ top: i * 18 }}
                    onClick={() => handleClick('tableau', col, i)}
                    onDoubleClick={() => i === pile.length - 1 && handleDoubleClick('tableau', col)}
                  >
                    <div className={
                      selected?.area === 'tableau' && selected?.col === col && i >= selected?.cardIndex
                        ? 'ring-2 ring-yellow-300 rounded-[3px]' : ''
                    }>
                      <CardView card={card} />
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      <StatusBar98 panels={[
        { content: `Game #${game.gameNum}` },
        { content: `Moves: ${game.moves}`, width: 80 },
      ]} />
    </div>
  );
}

function isSafeToAutoMove(card: Card, foundations: Card[][]): boolean {
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
