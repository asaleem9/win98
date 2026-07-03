'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Dialog98 } from '@/components/ui/Dialog98';
import { Input98 } from '@/components/ui/Input98';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import {
  type Card,
  type FCState,
  SUITS,
  SUIT_SYMBOLS,
  suitColor,
  rankLabel,
  dealGame,
  canMoveToFoundation,
  canPlaceOnTableau,
  maxMovable,
  autoMoveToFoundations,
  sequenceStart,
} from './logic';

const APP_ID = 'freecell';

interface Selection {
  area: 'tableau' | 'freecell';
  col: number;
  cardIndex: number;
}

interface DragState {
  area: 'tableau' | 'freecell';
  col: number;
  cardIndex: number;
  cards: Card[];
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  streak: number;
  bestStreak: number;
}

const DEFAULT_STATS: Stats = { gamesPlayed: 0, gamesWon: 0, streak: 0, bestStreak: 0 };

type DialogState =
  | { kind: 'selectGame' }
  | { kind: 'moveError'; message: string }
  | { kind: 'stats' }
  | null;

function CardView({
  card,
  faded,
  onPointerDown,
}: {
  card: Card;
  faded?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const color = suitColor(card.suit);
  return (
    <div
      onPointerDown={onPointerDown}
      className="w-[54px] h-[74px] rounded-[3px] border border-[#999] bg-white cursor-pointer select-none flex-shrink-0 relative font-[family-name:var(--win98-font)] touch-none"
      style={{ opacity: faded ? 0.35 : 1 }}
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

function EmptySlot({
  label,
  onClick,
  variant,
}: {
  label?: string;
  onClick?: () => void;
  variant?: 'freecell' | 'foundation';
}) {
  return (
    <div
      onClick={onClick}
      className={`w-[54px] h-[74px] rounded-[3px] border-2 border-dashed flex items-center justify-center text-[18px] select-none cursor-pointer ${
        variant === 'foundation'
          ? 'border-[rgba(255,255,255,0.35)] text-[rgba(255,255,255,0.4)]'
          : 'border-[rgba(255,255,255,0.25)] text-[rgba(255,255,255,0.3)]'
      }`}
    >
      {label}
    </div>
  );
}

function WinCascade({ foundations, onDone }: { foundations: Card[][]; onDone: () => void }) {
  const [settled, setSettled] = useState(false);
  const allCards = foundations.flatMap((f, fi) => f.map((card, ci) => ({ card, fi, ci })));

  useEffect(() => {
    const raf = requestAnimationFrame(() => setSettled(true));
    const timer = setTimeout(onDone, 700 + allCards.length * 18);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {allCards.map(({ card, fi }, idx) => (
        <div
          key={idx}
          className="absolute transition-all ease-out"
          style={{
            transitionDuration: '550ms',
            transitionDelay: `${idx * 16}ms`,
            left: settled ? `${64 + fi * 60}px` : `${(idx % 8) * 60 + 8}px`,
            top: settled ? '40px' : `${100 + (idx % 13) * 16}px`,
          }}
        >
          <CardView card={card} />
        </div>
      ))}
    </div>
  );
}

export default function FreeCell({}: AppComponentProps) {
  const { getAppPref, setAppPref } = useSettings();

  const [game, setGame] = useState<FCState>(() => dealGame(Math.floor(Math.random() * 32000) + 1));
  const [history, setHistory] = useState<FCState[]>([]);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [gameNumInput, setGameNumInput] = useState('1');
  const [showWinAnim, setShowWinAnim] = useState(false);
  const [showWinDialog, setShowWinDialog] = useState(false);

  const gameRef = useRef(game);
  gameRef.current = game;
  const dragTargetRef = useRef<HTMLElement | null>(null);
  const wonHandledRef = useRef(false);

  const stats = getAppPref<Stats>(APP_ID, 'stats', DEFAULT_STATS);

  const recordGameStart = useCallback(() => {
    setAppPref<Stats>(APP_ID, 'stats', {
      ...stats,
      gamesPlayed: stats.gamesPlayed + 1,
      streak: gameRef.current.won ? stats.streak : 0,
    });
  }, [stats, setAppPref]);

  const recordWin = useCallback(() => {
    const newStreak = stats.streak + 1;
    setAppPref<Stats>(APP_ID, 'stats', {
      ...stats,
      gamesWon: stats.gamesWon + 1,
      streak: newStreak,
      bestStreak: Math.max(stats.bestStreak, newStreak),
    });
  }, [stats, setAppPref]);

  const newGame = useCallback(
    (num?: number) => {
      recordGameStart();
      const gn = num ?? Math.floor(Math.random() * 32000) + 1;
      wonHandledRef.current = false;
      setShowWinAnim(false);
      setShowWinDialog(false);
      setGame(dealGame(gn));
      setHistory([]);
      setSelected(null);
      setDrag(null);
    },
    [recordGameStart],
  );

  // Handle the win transition once: play the sound, record the stat, and
  // cascade the cards into the foundations before showing the dialog.
  useEffect(() => {
    if (game.won && !wonHandledRef.current) {
      wonHandledRef.current = true;
      playSound('cardWin');
      recordWin();
      setShowWinAnim(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.won]);

  const pushHistory = useCallback((state: FCState) => {
    setHistory((h) => [...h, state]);
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setGame(h[h.length - 1]);
      setSelected(null);
      setDrag(null);
      return h.slice(0, -1);
    });
  }, []);

  /** Attempts to move `cards` (already lifted from `source`) onto `destArea`/`destCol`. */
  const attemptMove = useCallback(
    (
      source: { area: 'tableau' | 'freecell'; col: number; cardIndex: number },
      cards: Card[],
      destArea: 'tableau' | 'freecell' | 'foundation',
      destCol: number,
    ) => {
      const prev = gameRef.current;
      if (prev.won || cards.length === 0) return;
      if (source.area === destArea && source.col === destCol) return;

      const stripSource = (state: FCState): FCState => {
        const tableau = state.tableau.map((c) => [...c]);
        const freeCells = [...state.freeCells];
        if (source.area === 'tableau') {
          tableau[source.col] = tableau[source.col].slice(0, source.cardIndex);
        } else {
          freeCells[source.col] = null;
        }
        return { ...state, tableau, freeCells };
      };

      if (destArea === 'foundation') {
        if (cards.length !== 1) return;
        const fi = canMoveToFoundation(cards[0], prev.foundations);
        if (fi < 0 || fi !== destCol) return;
        const stripped = stripSource(prev);
        const foundations = stripped.foundations.map((f, i) => (i === fi ? [...f, cards[0]] : f));
        pushHistory(prev);
        setGame(autoMoveToFoundations({ ...stripped, foundations, moves: prev.moves + 1 }));
        playSound('cardFlip');
        return;
      }

      if (destArea === 'freecell') {
        if (cards.length !== 1 || prev.freeCells[destCol] !== null) return;
        const stripped = stripSource(prev);
        const freeCells = [...stripped.freeCells];
        freeCells[destCol] = cards[0];
        pushHistory(prev);
        setGame(autoMoveToFoundations({ ...stripped, freeCells, moves: prev.moves + 1 }));
        playSound('cardFlip');
        return;
      }

      // Tableau destination
      const targetPile = prev.tableau[destCol];
      const destIsEmpty = targetPile.length === 0;
      if (!destIsEmpty && !canPlaceOnTableau(cards[0], targetPile)) return;

      if (cards.length > 1) {
        const freeCount = prev.freeCells.filter((c) => c === null).length;
        const emptyCount = prev.tableau.filter(
          (t, i) => t.length === 0 && i !== destCol && !(source.area === 'tableau' && i === source.col),
        ).length;
        const allowed = maxMovable(freeCount, emptyCount, destIsEmpty);
        if (cards.length > allowed) {
          playSound('error');
          setDialog({
            kind: 'moveError',
            message: emptyCount === 0 ? 'Not enough free cells' : 'Not enough free cells and columns',
          });
          return;
        }
      }

      const stripped = stripSource(prev);
      const tableau = stripped.tableau.map((c) => [...c]);
      tableau[destCol] = [...tableau[destCol], ...cards];
      pushHistory(prev);
      setGame(autoMoveToFoundations({ ...stripped, tableau, moves: prev.moves + 1 }));
      playSound('cardFlip');
    },
    [pushHistory],
  );

  // ---- Click-to-move fallback ----

  const handleClick = useCallback(
    (area: 'tableau' | 'freecell' | 'foundation', col: number, cardIndex?: number) => {
      if (game.won) return;

      if (selected && selected.area === area && selected.col === col) {
        setSelected(null);
        return;
      }

      if (selected) {
        const src = gameRef.current;
        let cards: Card[] = [];
        if (selected.area === 'freecell') {
          const c = src.freeCells[selected.col];
          if (c) cards = [c];
        } else {
          cards = src.tableau[selected.col].slice(selected.cardIndex);
        }
        attemptMove(selected, cards, area, col);
        setSelected(null);
        return;
      }

      // Select a card
      if (area === 'freecell' && game.freeCells[col]) {
        setSelected({ area: 'freecell', col, cardIndex: 0 });
      } else if (area === 'tableau' && game.tableau[col].length > 0) {
        const pile = game.tableau[col];
        const startIdx = sequenceStart(pile);
        const ci = cardIndex !== undefined && cardIndex >= startIdx ? cardIndex : pile.length - 1;
        setSelected({ area: 'tableau', col, cardIndex: ci });
      }
    },
    [game, selected, attemptMove],
  );

  const handleDoubleClick = useCallback(
    (area: 'tableau' | 'freecell', col: number) => {
      if (game.won) return;
      const src = gameRef.current;
      let card: Card | null = null;
      if (area === 'tableau' && src.tableau[col].length > 0) {
        card = src.tableau[col][src.tableau[col].length - 1];
      } else if (area === 'freecell') {
        card = src.freeCells[col];
      }
      if (!card) return;
      const fi = canMoveToFoundation(card, src.foundations);
      if (fi < 0) return;
      const cardIndex = area === 'tableau' ? src.tableau[col].length - 1 : 0;
      attemptMove({ area, col, cardIndex }, [card], 'foundation', fi);
      setSelected(null);
    },
    [game, attemptMove],
  );

  // ---- Pointer-capture drag and drop ----

  const beginDrag = useCallback(
    (area: 'tableau' | 'freecell', col: number, cardIndex: number) => (e: React.PointerEvent) => {
      if (gameRef.current.won) return;
      const src = gameRef.current;
      let cards: Card[] = [];
      let effectiveIndex = cardIndex;

      if (area === 'freecell') {
        const c = src.freeCells[col];
        if (!c) return;
        cards = [c];
        effectiveIndex = 0;
      } else {
        const pile = src.tableau[col];
        if (pile.length === 0) return;
        const startIdx = sequenceStart(pile);
        effectiveIndex = cardIndex >= startIdx ? cardIndex : pile.length - 1;
        cards = pile.slice(effectiveIndex);
      }

      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      dragTargetRef.current = target;
      setSelected(null);
      setDrag({
        area,
        col,
        cardIndex: effectiveIndex,
        cards,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        moved: false,
      });
    },
    [],
  );

  useEffect(() => {
    const target = dragTargetRef.current;
    if (!drag || !target) return;

    const handleMove = (e: PointerEvent) => {
      setDrag((d) => {
        if (!d) return d;
        const moved = d.moved || Math.abs(e.clientX - d.startX) > 4 || Math.abs(e.clientY - d.startY) > 4;
        return { ...d, x: e.clientX, y: e.clientY, moved };
      });
    };

    const finish = (clientX: number, clientY: number, pointerId: number) => {
      target.releasePointerCapture(pointerId);
      const d = drag;
      if (!d.moved) {
        // Treat as a click on the origin card
        handleClick(d.area, d.col, d.cardIndex);
        setDrag(null);
        return;
      }
      const under = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const zoneEl = under?.closest('[data-dropzone]') as HTMLElement | null;
      const zone = zoneEl?.dataset.dropzone;
      if (zone) {
        const [zoneArea, zoneColStr] = zone.split('-');
        const zoneCol = parseInt(zoneColStr, 10);
        if (zoneArea === 'tableau' || zoneArea === 'freecell' || zoneArea === 'foundation') {
          attemptMove({ area: d.area, col: d.col, cardIndex: d.cardIndex }, d.cards, zoneArea, zoneCol);
        }
      }
      setDrag(null);
    };

    const handleUp = (e: PointerEvent) => finish(e.clientX, e.clientY, e.pointerId);
    const handleLost = () => setDrag(null);

    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
    target.addEventListener('lostpointercapture', handleLost);
    return () => {
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
      target.removeEventListener('lostpointercapture', handleLost);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.pointerId]);

  // ---- Menu actions ----

  const openSelectGame = useCallback(() => {
    setGameNumInput(String(game.gameNum));
    setDialog({ kind: 'selectGame' });
  }, [game.gameNum]);

  const confirmSelectGame = useCallback(() => {
    const n = parseInt(gameNumInput, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 32000) {
      newGame(n);
      setDialog(null);
    } else {
      playSound('error');
    }
  }, [gameNumInput, newGame]);

  const menus: MenuDefinition[] = [
    {
      label: 'Game',
      items: [
        { label: 'New Game', shortcut: 'F2', onClick: () => newGame() },
        { label: 'Restart', onClick: () => newGame(game.gameNum) },
        { label: '', separator: true },
        { label: 'Select Game...', onClick: openSelectGame },
        { label: '', separator: true },
        { label: 'Undo', shortcut: 'Ctrl+Z', onClick: handleUndo, disabled: history.length === 0 },
        { label: '', separator: true },
        { label: 'Statistics...', onClick: () => setDialog({ kind: 'stats' }) },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About FreeCell...', onClick: () => window.dispatchEvent(new CustomEvent('win98-system-dialog', { detail: { title: 'About FreeCell', message: 'FreeCell for Windows 98\\n\\nThere are 32,000 numbered games. It is believed (almost) all of them can be won.', icon: 'info' } })) }],
    },
  ];

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <MenuBar menus={menus} />

      <div className="relative flex-1 bg-[#008000] p-2 overflow-auto">
        {showWinAnim && (
          <WinCascade
            foundations={game.foundations}
            onDone={() => {
              setShowWinAnim(false);
              setShowWinDialog(true);
            }}
          />
        )}

        {showWinDialog && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40">
            <Dialog98
              title="FreeCell"
              icon="info"
              message={
                <div>
                  <div className="font-bold mb-1">You win!</div>
                  <div>
                    Game #{game.gameNum} completed in {game.moves} moves.
                  </div>
                  <div className="mt-1">Current streak: {stats.streak}</div>
                </div>
              }
              buttons={[{ label: 'New Game', onClick: () => { setShowWinDialog(false); newGame(); }, default: true }]}
            />
          </div>
        )}

        {dialog?.kind === 'selectGame' && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40">
            <Dialog98
              title="Select Game"
              icon="question"
              message={
                <div className="flex flex-col gap-2">
                  <div>Enter a game number (1-32000):</div>
                  <Input98
                    type="number"
                    min={1}
                    max={32000}
                    value={gameNumInput}
                    autoFocus
                    onChange={(e) => setGameNumInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmSelectGame();
                      if (e.key === 'Escape') setDialog(null);
                    }}
                  />
                </div>
              }
              buttons={[
                { label: 'OK', onClick: confirmSelectGame, default: true },
                { label: 'Cancel', onClick: () => setDialog(null) },
              ]}
            />
          </div>
        )}

        {dialog?.kind === 'moveError' && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40">
            <Dialog98
              title="FreeCell"
              icon="error"
              message={dialog.message}
              buttons={[{ label: 'OK', onClick: () => setDialog(null), default: true }]}
            />
          </div>
        )}

        {dialog?.kind === 'stats' && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40">
            <Dialog98
              title="Statistics"
              icon="info"
              message={
                <div className="flex flex-col gap-[2px]">
                  <div>Games played: {stats.gamesPlayed}</div>
                  <div>Games won: {stats.gamesWon}</div>
                  <div>Win rate: {winRate}%</div>
                  <div>Current streak: {stats.streak}</div>
                  <div>Best streak: {stats.bestStreak}</div>
                </div>
              }
              buttons={[{ label: 'OK', onClick: () => setDialog(null), default: true }]}
            />
          </div>
        )}

        {/* Top row: Free cells + Foundations */}
        <div className="flex justify-between mb-3">
          <div className="flex gap-1">
            {game.freeCells.map((cell, i) => (
              <div
                key={i}
                data-dropzone={`freecell-${i}`}
                onClick={() => !cell && handleClick('freecell', i)}
                onDoubleClick={() => cell && handleDoubleClick('freecell', i)}
              >
                {cell ? (
                  <div className={selected?.area === 'freecell' && selected?.col === i ? 'ring-2 ring-yellow-300 rounded-[3px]' : ''}>
                    <CardView
                      card={cell}
                      faded={drag?.area === 'freecell' && drag?.col === i}
                      onPointerDown={beginDrag('freecell', i, 0)}
                    />
                  </div>
                ) : (
                  <EmptySlot variant="freecell" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {game.foundations.map((f, i) => (
              <div key={i} data-dropzone={`foundation-${i}`} onClick={() => handleClick('foundation', i)}>
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
            <div
              key={col}
              data-dropzone={`tableau-${col}`}
              className="relative w-[54px]"
              style={{ minHeight: 74 }}
            >
              {pile.length === 0 ? (
                <EmptySlot onClick={() => handleClick('tableau', col)} />
              ) : (
                pile.map((card, i) => {
                  const isDragging = drag?.area === 'tableau' && drag?.col === col && i >= drag?.cardIndex;
                  return (
                    <div
                      key={i}
                      className="absolute left-0"
                      style={{ top: i * 18 }}
                      onClick={() => handleClick('tableau', col, i)}
                      onDoubleClick={() => i === pile.length - 1 && handleDoubleClick('tableau', col)}
                    >
                      <div
                        className={
                          selected?.area === 'tableau' && selected?.col === col && i >= selected?.cardIndex
                            ? 'ring-2 ring-yellow-300 rounded-[3px]'
                            : ''
                        }
                      >
                        <CardView card={card} faded={isDragging} onPointerDown={beginDrag('tableau', col, i)} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>
      </div>

      {drag?.moved && (
        <div
          className="fixed pointer-events-none z-[100]"
          style={{ left: drag.x - 27, top: drag.y - 20 }}
        >
          {drag.cards.map((card, i) => (
            <div key={i} className="absolute left-0" style={{ top: i * 18 }}>
              <CardView card={card} />
            </div>
          ))}
        </div>
      )}

      <StatusBar98
        panels={[
          { content: `Game #${game.gameNum}` },
          { content: `Moves: ${game.moves}`, width: 80 },
          { content: `Free cells left: ${game.freeCells.filter((c) => c === null).length}`, width: 130 },
        ]}
      />
    </div>
  );
}
