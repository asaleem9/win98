'use client';

import { useState, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { StatusBar98 } from '@/components/ui/StatusBar98';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Color = 'red' | 'black';

interface Card {
  suit: Suit;
  rank: number; // 1=Ace, 2-10, 11=J, 12=Q, 13=K
  faceUp: boolean;
}

interface GameState {
  tableau: Card[][];
  foundations: Card[][];
  stock: Card[];
  waste: Card[];
  drawCount: 1 | 3;
  moves: number;
  won: boolean;
}

interface DragSource {
  area: 'tableau' | 'waste' | 'foundation';
  col: number;
  cardIndex: number;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS: Record<Suit, string> = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const RANK_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function suitColor(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

function rankLabel(rank: number): string {
  return RANK_LABELS[rank] || String(rank);
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank, faceUp: false });
    }
  }
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initGame(drawCount: 1 | 3): GameState {
  const deck = shuffle(createDeck());
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
  return { tableau, foundations: [[], [], [], []], stock, waste: [], drawCount, moves: 0, won: false };
}

function canPlaceOnTableau(card: Card, target: Card[]): boolean {
  if (target.length === 0) return card.rank === 13;
  const top = target[target.length - 1];
  if (!top.faceUp) return false;
  return suitColor(card.suit) !== suitColor(top.suit) && card.rank === top.rank - 1;
}

function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 1;
  const top = foundation[foundation.length - 1];
  return card.suit === top.suit && card.rank === top.rank + 1;
}

function checkWin(foundations: Card[][]): boolean {
  return foundations.every((f) => f.length === 13);
}

function CardView({ card, onClick, small }: { card: Card; onClick?: () => void; small?: boolean }) {
  if (!card.faceUp) {
    return (
      <div
        onClick={onClick}
        className="w-[58px] h-[80px] rounded-[3px] border border-[#333] bg-[#1a5276] cursor-pointer select-none flex-shrink-0"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 6px)',
        }}
      />
    );
  }

  const color = suitColor(card.suit) === 'red' ? '#c00' : '#000';

  return (
    <div
      onClick={onClick}
      className="w-[58px] h-[80px] rounded-[3px] border border-[#999] bg-white cursor-pointer select-none flex-shrink-0 relative font-[family-name:var(--win98-font)]"
    >
      <div className="absolute top-[2px] left-[3px] text-[10px] leading-tight font-bold" style={{ color }}>
        <div>{rankLabel(card.rank)}</div>
        <div className="-mt-[2px]">{SUIT_SYMBOLS[card.suit]}</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-[22px]" style={{ color }}>
        {SUIT_SYMBOLS[card.suit]}
      </div>
      <div className="absolute bottom-[2px] right-[3px] text-[10px] leading-tight font-bold rotate-180" style={{ color }}>
        <div>{rankLabel(card.rank)}</div>
        <div className="-mt-[2px]">{SUIT_SYMBOLS[card.suit]}</div>
      </div>
    </div>
  );
}

function EmptySlot({ label, onClick }: { label?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="w-[58px] h-[80px] rounded-[3px] border-2 border-dashed border-[rgba(255,255,255,0.3)] flex items-center justify-center text-[rgba(255,255,255,0.4)] text-[20px] select-none cursor-pointer"
    >
      {label}
    </div>
  );
}

export default function Solitaire({ windowId }: AppComponentProps) {
  const [game, setGame] = useState<GameState>(() => initGame(1));
  const [selected, setSelected] = useState<DragSource | null>(null);

  const newGame = useCallback((dc?: 1 | 3) => {
    setGame(initGame(dc ?? game.drawCount));
    setSelected(null);
  }, [game.drawCount]);

  const drawFromStock = useCallback(() => {
    setGame((prev) => {
      if (prev.stock.length === 0) {
        // Recycle waste back to stock
        return {
          ...prev,
          stock: prev.waste.map((c) => ({ ...c, faceUp: false })).reverse(),
          waste: [],
        };
      }
      const count = Math.min(prev.drawCount, prev.stock.length);
      const drawn = prev.stock.slice(-count).map((c) => ({ ...c, faceUp: true }));
      return {
        ...prev,
        stock: prev.stock.slice(0, -count),
        waste: [...prev.waste, ...drawn],
      };
    });
    setSelected(null);
  }, []);

  const tryAutoMoveToFoundation = useCallback((card: Card, sourceArea: 'tableau' | 'waste', sourceCol: number): boolean => {
    let moved = false;
    setGame((prev) => {
      for (let fi = 0; fi < 4; fi++) {
        if (canPlaceOnFoundation(card, prev.foundations[fi])) {
          const newFoundations = prev.foundations.map((f, i) => (i === fi ? [...f, { ...card, faceUp: true }] : [...f]));
          let newTableau = prev.tableau.map((col) => [...col]);
          let newWaste = [...prev.waste];

          if (sourceArea === 'tableau') {
            newTableau[sourceCol] = newTableau[sourceCol].slice(0, -1);
            if (newTableau[sourceCol].length > 0) {
              newTableau[sourceCol][newTableau[sourceCol].length - 1] = { ...newTableau[sourceCol][newTableau[sourceCol].length - 1], faceUp: true };
            }
          } else {
            newWaste = newWaste.slice(0, -1);
          }

          const won = checkWin(newFoundations);
          moved = true;
          return { ...prev, tableau: newTableau, foundations: newFoundations, waste: newWaste, moves: prev.moves + 1, won };
        }
      }
      return prev;
    });
    return moved;
  }, []);

  const handleCardClick = useCallback((area: 'tableau' | 'waste' | 'foundation', col: number, cardIndex: number) => {
    if (game.won) return;

    // If clicking the same selection, deselect
    if (selected && selected.area === area && selected.col === col && selected.cardIndex === cardIndex) {
      setSelected(null);
      return;
    }

    // If something is selected, try to move it
    if (selected) {
      setGame((prev) => {
        let cards: Card[] = [];
        if (selected.area === 'waste') {
          cards = [prev.waste[prev.waste.length - 1]];
        } else if (selected.area === 'tableau') {
          cards = prev.tableau[selected.col].slice(selected.cardIndex);
        } else if (selected.area === 'foundation') {
          cards = [prev.foundations[selected.col][prev.foundations[selected.col].length - 1]];
        }

        if (cards.length === 0) return prev;

        // Try placing on foundation
        if (area === 'foundation' && cards.length === 1) {
          if (canPlaceOnFoundation(cards[0], prev.foundations[col])) {
            const newFoundations = prev.foundations.map((f, i) => (i === col ? [...f, { ...cards[0], faceUp: true }] : [...f]));
            let newTableau = prev.tableau.map((t) => [...t]);
            let newWaste = [...prev.waste];

            if (selected.area === 'tableau') {
              newTableau[selected.col] = newTableau[selected.col].slice(0, selected.cardIndex);
              if (newTableau[selected.col].length > 0) {
                newTableau[selected.col][newTableau[selected.col].length - 1] = { ...newTableau[selected.col][newTableau[selected.col].length - 1], faceUp: true };
              }
            } else if (selected.area === 'waste') {
              newWaste = newWaste.slice(0, -1);
            } else if (selected.area === 'foundation') {
              const newF = prev.foundations.map((f, i) => (i === selected.col ? f.slice(0, -1) : [...f]));
              newF[col] = [...newF[col], { ...cards[0], faceUp: true }];
              const won = checkWin(newF);
              return { ...prev, foundations: newF, moves: prev.moves + 1, won };
            }

            const won = checkWin(newFoundations);
            return { ...prev, tableau: newTableau, foundations: newFoundations, waste: newWaste, moves: prev.moves + 1, won };
          }
        }

        // Try placing on tableau
        if (area === 'tableau') {
          if (canPlaceOnTableau(cards[0], prev.tableau[col])) {
            let newTableau = prev.tableau.map((t) => [...t]);
            let newWaste = [...prev.waste];
            let newFoundations = prev.foundations.map((f) => [...f]);

            newTableau[col] = [...newTableau[col], ...cards.map((c) => ({ ...c, faceUp: true }))];

            if (selected.area === 'tableau') {
              newTableau[selected.col] = newTableau[selected.col].slice(0, selected.cardIndex);
              if (newTableau[selected.col].length > 0) {
                newTableau[selected.col][newTableau[selected.col].length - 1] = { ...newTableau[selected.col][newTableau[selected.col].length - 1], faceUp: true };
              }
            } else if (selected.area === 'waste') {
              newWaste = newWaste.slice(0, -1);
            } else if (selected.area === 'foundation') {
              newFoundations[selected.col] = newFoundations[selected.col].slice(0, -1);
            }

            return { ...prev, tableau: newTableau, foundations: newFoundations, waste: newWaste, moves: prev.moves + 1 };
          }
        }

        return prev;
      });
      setSelected(null);
      return;
    }

    // Select a card
    if (area === 'waste' && game.waste.length > 0) {
      // Double click to foundation
      setSelected({ area, col: 0, cardIndex: game.waste.length - 1 });
    } else if (area === 'tableau') {
      const pile = game.tableau[col];
      if (cardIndex >= 0 && pile[cardIndex]?.faceUp) {
        setSelected({ area, col, cardIndex });
      }
    } else if (area === 'foundation') {
      if (game.foundations[col].length > 0) {
        setSelected({ area, col, cardIndex: game.foundations[col].length - 1 });
      }
    }
  }, [game, selected]);

  const handleDoubleClick = useCallback((area: 'tableau' | 'waste', col: number) => {
    if (game.won) return;
    if (area === 'waste' && game.waste.length > 0) {
      tryAutoMoveToFoundation(game.waste[game.waste.length - 1], 'waste', 0);
    } else if (area === 'tableau' && game.tableau[col].length > 0) {
      const card = game.tableau[col][game.tableau[col].length - 1];
      if (card.faceUp) tryAutoMoveToFoundation(card, 'tableau', col);
    }
    setSelected(null);
  }, [game, tryAutoMoveToFoundation]);

  const isSelected = (area: string, col: number, cardIndex: number) =>
    selected?.area === area && selected?.col === col && selected?.cardIndex === cardIndex;

  const isInSelectedRange = (area: string, col: number, cardIndex: number) =>
    selected?.area === 'tableau' && area === 'tableau' && selected?.col === col && cardIndex >= selected?.cardIndex;

  const menus: MenuDefinition[] = [
    {
      label: 'Game',
      items: [
        { label: 'New Game', shortcut: 'F2', onClick: () => newGame() },
        { label: '', separator: true },
        { label: 'Draw One', checked: game.drawCount === 1, onClick: () => { setGame((prev) => ({ ...prev, drawCount: 1 })); newGame(1); } },
        { label: 'Draw Three', checked: game.drawCount === 3, onClick: () => { setGame((prev) => ({ ...prev, drawCount: 3 })); newGame(3); } },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'About Solitaire...', onClick: () => {} },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <MenuBar menus={menus} />

      <div className="flex-1 bg-[#008000] p-3 overflow-auto">
        {game.won && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40">
            <div className="bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] p-6 text-center">
              <div className="text-lg font-bold mb-3">Congratulations!</div>
              <div className="mb-3">You won in {game.moves} moves!</div>
              <button
                onClick={() => newGame()}
                className="px-4 py-1 bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
              >
                New Game
              </button>
            </div>
          </div>
        )}

        {/* Top row: Stock/Waste + Foundations */}
        <div className="flex gap-3 mb-4">
          {/* Stock */}
          {game.stock.length > 0 ? (
            <div onClick={drawFromStock}>
              <CardView card={{ suit: 'spades', rank: 1, faceUp: false }} />
            </div>
          ) : (
            <EmptySlot label="&#8635;" onClick={drawFromStock} />
          )}

          {/* Waste */}
          <div
            onClick={() => game.waste.length > 0 && handleCardClick('waste', 0, game.waste.length - 1)}
            onDoubleClick={() => handleDoubleClick('waste', 0)}
          >
            {game.waste.length > 0 ? (
              <div className={isSelected('waste', 0, game.waste.length - 1) ? 'ring-2 ring-yellow-300 rounded-[3px]' : ''}>
                <CardView card={game.waste[game.waste.length - 1]} />
              </div>
            ) : (
              <EmptySlot />
            )}
          </div>

          <div className="w-[58px]" /> {/* Spacer */}

          {/* Foundations */}
          {game.foundations.map((foundation, fi) => (
            <div
              key={fi}
              onClick={() => handleCardClick('foundation', fi, foundation.length - 1)}
            >
              {foundation.length > 0 ? (
                <div className={isSelected('foundation', fi, foundation.length - 1) ? 'ring-2 ring-yellow-300 rounded-[3px]' : ''}>
                  <CardView card={foundation[foundation.length - 1]} />
                </div>
              ) : (
                <EmptySlot label={SUIT_SYMBOLS[SUITS[fi]]} />
              )}
            </div>
          ))}
        </div>

        {/* Tableau */}
        <div className="flex gap-3">
          {game.tableau.map((pile, col) => (
            <div key={col} className="relative w-[58px]" style={{ minHeight: 80 }}>
              {pile.length === 0 ? (
                <EmptySlot onClick={() => handleCardClick('tableau', col, -1)} />
              ) : (
                pile.map((card, i) => (
                  <div
                    key={i}
                    className="absolute left-0"
                    style={{ top: i * (card.faceUp ? 20 : 8) }}
                    onClick={() => card.faceUp && handleCardClick('tableau', col, i)}
                    onDoubleClick={() => i === pile.length - 1 && handleDoubleClick('tableau', col)}
                  >
                    <div className={isInSelectedRange('tableau', col, i) ? 'ring-2 ring-yellow-300 rounded-[3px]' : ''}>
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
        { content: game.won ? 'You win!' : `Moves: ${game.moves}` },
        { content: `Draw ${game.drawCount}`, width: 60 },
        { content: `Stock: ${game.stock.length}`, width: 70 },
      ]} />
    </div>
  );
}
