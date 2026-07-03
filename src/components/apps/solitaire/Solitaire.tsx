'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Dialog98 } from '@/components/ui/Dialog98';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import {
  type Card,
  type GameState,
  type ScoringMode,
  SUITS,
  SUIT_SYMBOLS,
  rankLabel,
  suitColor,
  initGame,
  canPlaceOnTableau,
  canPlaceOnFoundation,
  checkWin,
  isValidSequence,
  scoreForMove,
  timeBonus,
  vegasStartingScore,
} from './logic';

type AreaKind = 'tableau' | 'waste' | 'foundation';

interface CardLocation {
  area: AreaKind;
  col: number;
  cardIndex: number;
}

interface HistoryEntry {
  game: GameState;
}

const CARD_W = 58;
const CARD_H = 80;

function applyStartingScore(g: GameState, mode: ScoringMode): GameState {
  if (mode === 'vegas') return { ...g, score: vegasStartingScore() };
  return { ...g, score: 0 };
}

function CardView({ card, faded }: { card: Card; faded?: boolean }) {
  if (!card.faceUp) {
    return (
      <div
        className="w-[58px] h-[80px] rounded-[3px] border border-[#333] bg-[#1a5276] select-none flex-shrink-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 6px)',
          opacity: faded ? 0.5 : 1,
        }}
      />
    );
  }

  const color = suitColor(card.suit) === 'red' ? '#c00' : '#000';

  return (
    <div
      className="w-[58px] h-[80px] rounded-[3px] border border-[#999] bg-white select-none flex-shrink-0 relative font-[family-name:var(--win98-font)]"
      style={{ opacity: faded ? 0.5 : 1 }}
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

function EmptySlot({
  label,
  dropId,
  highlight,
}: {
  label?: string;
  dropId?: string;
  highlight?: boolean;
}) {
  return (
    <div
      data-drop-id={dropId}
      className="w-[58px] h-[80px] rounded-[3px] border-2 border-dashed flex items-center justify-center text-[20px] select-none"
      style={{
        borderColor: highlight ? '#ffff00' : 'rgba(255,255,255,0.3)',
        color: 'rgba(255,255,255,0.4)',
        backgroundColor: highlight ? 'rgba(255,255,0,0.15)' : 'transparent',
      }}
    >
      {label}
    </div>
  );
}

// Renders the classic bouncing-card win animation on a canvas overlay.
function WinAnimation({ foundations, width, height }: { foundations: Card[][]; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const allCards = foundations.flat();
    const bouncers = allCards.map((card, i) => ({
      card,
      x: 40 + (i % 8) * 60,
      y: -20 - Math.random() * 400,
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 2,
      color: suitColor(card.suit) === 'red' ? '#c00' : '#000',
      trail: [] as { x: number; y: number }[],
    }));

    const gravity = 0.35;
    const bounceDamping = 0.72;
    let rafId = 0;

    function drawCard(x: number, y: number, color: string, alpha: number) {
      if (!ctx) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, 40, 56);
      ctx.strokeStyle = '#999';
      ctx.strokeRect(x, y, 40, 56);
      ctx.fillStyle = color;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('*', x + 15, y + 32);
      ctx.globalAlpha = 1;
    }

    function tick() {
      if (!ctx) return;
      ctx.fillStyle = 'rgba(0,128,0,0.15)';
      ctx.fillRect(0, 0, width, height);

      for (const b of bouncers) {
        b.vy += gravity;
        b.x += b.vx;
        b.y += b.vy;

        if (b.y + 56 > height) {
          b.y = height - 56;
          b.vy = -b.vy * bounceDamping;
        }
        if (b.x < 0 || b.x + 40 > width) {
          b.vx = -b.vx;
          b.x = Math.max(0, Math.min(width - 40, b.x));
        }

        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 6) b.trail.shift();
      }

      for (const b of bouncers) {
        b.trail.forEach((pos, i) => {
          drawCard(pos.x, pos.y, b.color, ((i + 1) / b.trail.length) * 0.5);
        });
        drawCard(b.x, b.y, b.color, 1);
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [foundations, width, height]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-40" />;
}

export default function Solitaire(_props: AppComponentProps) {
  const { getAppPref, setAppPref } = useSettings();

  const initialDrawCount = getAppPref<1 | 3>('solitaire', 'drawCount', 1);
  const initialScoringMode = getAppPref<ScoringMode>('solitaire', 'scoringMode', 'standard');

  const [drawCount, setDrawCount] = useState<1 | 3>(initialDrawCount);
  const [scoringMode, setScoringMode] = useState<ScoringMode>(initialScoringMode);
  const [game, setGame] = useState<GameState>(() =>
    applyStartingScore(initGame(initialDrawCount), initialScoringMode),
  );
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState<CardLocation | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 560, height: 380 });

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const update = () => setBoardSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ----- Timer -----
  useEffect(() => {
    if (!running || game.won) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running, game.won]);

  const pushHistory = useCallback((prevGame: GameState) => {
    setHistory((h) => [...h, { game: prevGame }]);
  }, []);

  const newGame = useCallback(
    (dc?: 1 | 3, mode?: ScoringMode) => {
      const useDc = dc ?? drawCount;
      const useMode = mode ?? scoringMode;
      setGame(applyStartingScore(initGame(useDc), useMode));
      setSelected(null);
      setHistory([]);
      setElapsedSeconds(0);
      setRunning(true);
    },
    [drawCount, scoringMode],
  );

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setGame(last.game);
      setSelected(null);
      return h.slice(0, -1);
    });
  }, []);

  const finalizeWin = useCallback(
    (g: GameState): GameState => {
      if (!checkWin(g.foundations)) return g;
      let score = g.score;
      if (scoringMode === 'standard') {
        score += timeBonus(elapsedSeconds);
      }
      setRunning(false);
      const wins = getAppPref<number>('solitaire', 'gamesWon', 0);
      setAppPref('solitaire', 'gamesWon', wins + 1);
      playSound('cardWin');
      return { ...g, score, won: true };
    },
    [scoringMode, elapsedSeconds, getAppPref, setAppPref],
  );

  const drawFromStock = useCallback(() => {
    if (game.won) return;
    pushHistory(game);
    setGame((prev) => {
      if (prev.stock.length === 0) {
        const gainedOrLost = scoreForMove('stockRecycle', scoringMode);
        return {
          ...prev,
          stock: prev.waste.map((c) => ({ ...c, faceUp: false })).reverse(),
          waste: [],
          score: prev.score + gainedOrLost,
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
    playSound('cardFlip');
    setSelected(null);
  }, [game, pushHistory, scoringMode]);

  // Removes `count` cards from the top of a source pile, returns the resulting piles plus the moved cards.
  const extractFromSource = useCallback(
    (g: GameState, src: CardLocation, count: number) => {
      const tableau = g.tableau.map((c) => [...c]);
      let waste = [...g.waste];
      const foundations = g.foundations.map((f) => [...f]);
      let moved: Card[] = [];
      let flippedBonus = 0;

      if (src.area === 'tableau') {
        const pile = tableau[src.col];
        moved = pile.slice(pile.length - count);
        tableau[src.col] = pile.slice(0, pile.length - count);
        if (tableau[src.col].length > 0) {
          const topIdx = tableau[src.col].length - 1;
          if (!tableau[src.col][topIdx].faceUp) {
            tableau[src.col][topIdx] = { ...tableau[src.col][topIdx], faceUp: true };
            flippedBonus = scoreForMove('turnOverTableauCard', scoringMode);
          }
        }
      } else if (src.area === 'waste') {
        moved = waste.slice(waste.length - count);
        waste = waste.slice(0, waste.length - count);
      } else if (src.area === 'foundation') {
        const f = foundations[src.col];
        moved = f.slice(f.length - count);
        foundations[src.col] = f.slice(0, f.length - count);
      }

      return { tableau, waste, foundations, moved, flippedBonus };
    },
    [scoringMode],
  );

  // Attempts to move `count` cards from `src` onto `dst`. Returns true if the move happened.
  const attemptMove = useCallback(
    (src: CardLocation, dst: { area: AreaKind; col: number }, count: number): boolean => {
      let success = false;
      setGame((prev) => {
        if (prev.won) return prev;
        let cards: Card[];
        if (src.area === 'waste') cards = prev.waste.slice(prev.waste.length - count);
        else if (src.area === 'tableau') cards = prev.tableau[src.col].slice(prev.tableau[src.col].length - count);
        else cards = prev.foundations[src.col].slice(prev.foundations[src.col].length - count);

        if (cards.length === 0) return prev;

        // Same-pile no-op.
        if (src.area === dst.area && src.col === dst.col) return prev;

        if (dst.area === 'foundation') {
          if (cards.length !== 1 || !canPlaceOnFoundation(cards[0], prev.foundations[dst.col])) return prev;
          const { tableau, waste, foundations, flippedBonus } = extractFromSource(prev, src, 1);
          foundations[dst.col] = [...foundations[dst.col], { ...cards[0], faceUp: true }];
          const moveScore =
            (src.area === 'waste'
              ? scoreForMove('wasteToFoundation', scoringMode)
              : src.area === 'tableau'
                ? scoreForMove('tableauToFoundation', scoringMode)
                : 0) + flippedBonus;
          let next: GameState = {
            ...prev,
            tableau,
            waste,
            foundations,
            moves: prev.moves + 1,
            score: prev.score + moveScore,
          };
          next = finalizeWin(next);
          success = true;
          return next;
        }

        if (dst.area === 'tableau') {
          if (!canPlaceOnTableau(cards[0], prev.tableau[dst.col])) return prev;
          const { tableau, waste, foundations, flippedBonus } = extractFromSource(prev, src, count);
          tableau[dst.col] = [...tableau[dst.col], ...cards.map((c) => ({ ...c, faceUp: true }))];
          const moveScore =
            (src.area === 'waste'
              ? scoreForMove('wasteToTableau', scoringMode)
              : src.area === 'foundation'
                ? scoreForMove('foundationToTableau', scoringMode)
                : 0) + flippedBonus;
          success = true;
          return {
            ...prev,
            tableau,
            waste,
            foundations,
            moves: prev.moves + 1,
            score: prev.score + moveScore,
          };
        }

        return prev;
      });
      return success;
    },
    [scoringMode, finalizeWin, extractFromSource],
  );

  const tryMoveWithHistory = useCallback(
    (src: CardLocation, dst: { area: AreaKind; col: number }, count: number) => {
      pushHistory(game);
      const ok = attemptMove(src, dst, count);
      if (ok) {
        playSound('cardFlip');
      } else {
        // Undo the speculative history push since nothing changed.
        setHistory((h) => h.slice(0, -1));
      }
      return ok;
    },
    [game, attemptMove, pushHistory],
  );

  const tryAutoMoveToFoundation = useCallback(
    (card: Card, sourceArea: 'tableau' | 'waste', sourceCol: number): boolean => {
      for (let fi = 0; fi < 4; fi++) {
        if (canPlaceOnFoundation(card, game.foundations[fi])) {
          return tryMoveWithHistory({ area: sourceArea, col: sourceCol, cardIndex: 0 }, { area: 'foundation', col: fi }, 1);
        }
      }
      return false;
    },
    [game, tryMoveWithHistory],
  );

  // ----- Click-to-move fallback -----
  const handleCardClick = useCallback(
    (area: AreaKind, col: number, cardIndex: number) => {
      if (game.won) return;

      if (selected && selected.area === area && selected.col === col && selected.cardIndex === cardIndex) {
        setSelected(null);
        return;
      }

      if (selected) {
        const count =
          selected.area === 'tableau' ? game.tableau[selected.col].length - selected.cardIndex : 1;
        const moved = tryMoveWithHistory(selected, { area, col }, count);
        if (!moved) playSound('error');
        setSelected(null);
        return;
      }

      if (area === 'waste' && game.waste.length > 0) {
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
    },
    [game, selected, tryMoveWithHistory],
  );

  const handleDoubleClick = useCallback(
    (area: 'tableau' | 'waste', col: number) => {
      if (game.won) return;
      if (area === 'waste' && game.waste.length > 0) {
        tryAutoMoveToFoundation(game.waste[game.waste.length - 1], 'waste', 0);
      } else if (area === 'tableau' && game.tableau[col].length > 0) {
        const card = game.tableau[col][game.tableau[col].length - 1];
        if (card.faceUp) tryAutoMoveToFoundation(card, 'tableau', col);
      }
      setSelected(null);
    },
    [game, tryAutoMoveToFoundation],
  );

  // ----- Pointer drag-and-drop -----
  interface DragState {
    src: CardLocation;
    cards: Card[];
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  }
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const getDragCards = useCallback(
    (area: AreaKind, col: number, cardIndex: number): Card[] | null => {
      if (area === 'waste') return [game.waste[game.waste.length - 1]];
      if (area === 'foundation') return [game.foundations[col][game.foundations[col].length - 1]];
      const pile = game.tableau[col];
      const seq = pile.slice(cardIndex);
      if (!isValidSequence(seq)) return null;
      return seq;
    },
    [game],
  );

  const onCardPointerDown = useCallback(
    (e: React.PointerEvent, area: AreaKind, col: number, cardIndex: number) => {
      if (game.won) return;
      if (e.button !== 0) return;
      const cards = getDragCards(area, col, cardIndex);
      if (!cards || cards.length === 0) return;

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const state: DragState = {
        src: { area, col, cardIndex },
        cards,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
      };
      dragRef.current = state;
      setDrag(state);
      setSelected(null);
    },
    [game, getDragCards],
  );

  const onBoardPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const next = { ...dragRef.current, x: e.clientX, y: e.clientY };
    dragRef.current = next;
    setDrag(next);

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const dropEl = el?.closest('[data-drop-id]') as HTMLElement | null;
    setDropTarget(dropEl?.dataset.dropId ?? null);
  }, []);

  const onBoardPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const state = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      setDropTarget(null);
      if (!state) return;

      try {
        (e.target as HTMLElement).releasePointerCapture(state.pointerId);
      } catch {
        // pointer may already be released
      }

      const dx = Math.abs(e.clientX - state.startX);
      const dy = Math.abs(e.clientY - state.startY);
      if (dx < 4 && dy < 4) {
        // Treat as a click rather than a drag.
        handleCardClick(state.src.area, state.src.col, state.src.cardIndex);
        return;
      }

      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const dropEl = el?.closest('[data-drop-id]') as HTMLElement | null;
      if (!dropEl) return;

      const [areaStr, colStr] = dropEl.dataset.dropId!.split('-');
      const dst = { area: areaStr as AreaKind, col: Number(colStr) };
      tryMoveWithHistory(state.src, dst, state.cards.length);
    },
    [handleCardClick, tryMoveWithHistory],
  );

  const isSelected = (area: string, col: number, cardIndex: number) =>
    selected?.area === area && selected?.col === col && selected?.cardIndex === cardIndex;

  const isInSelectedRange = (area: string, col: number, cardIndex: number) =>
    selected?.area === 'tableau' && area === 'tableau' && selected?.col === col && cardIndex >= selected?.cardIndex;

  const isBeingDragged = (area: string, col: number, cardIndex: number) =>
    drag?.src.area === area && drag?.src.col === col && cardIndex >= drag?.src.cardIndex;

  // ----- Menu wiring -----
  const setScoring = (mode: ScoringMode) => {
    setScoringMode(mode);
    setAppPref('solitaire', 'scoringMode', mode);
    newGame(undefined, mode);
  };

  const setDraw = (dc: 1 | 3) => {
    setDrawCount(dc);
    setAppPref('solitaire', 'drawCount', dc);
    newGame(dc);
  };

  const menus: MenuDefinition[] = [
    {
      label: 'Game',
      items: [
        { label: 'New Game', shortcut: 'F2', onClick: () => newGame() },
        { label: 'Undo', shortcut: 'Ctrl+Z', onClick: handleUndo, disabled: history.length === 0 },
        { label: '', separator: true },
        { label: 'Draw One', checked: drawCount === 1, onClick: () => setDraw(1) },
        { label: 'Draw Three', checked: drawCount === 3, onClick: () => setDraw(3) },
        { label: '', separator: true },
        { label: 'Standard Scoring', checked: scoringMode === 'standard', onClick: () => setScoring('standard') },
        { label: 'Vegas Scoring', checked: scoringMode === 'vegas', onClick: () => setScoring('vegas') },
        { label: 'No Scoring', checked: scoringMode === 'none', onClick: () => setScoring('none') },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About Solitaire...', onClick: () => setShowAbout(true) }],
    },
  ];

  const gamesWon = getAppPref<number>('solitaire', 'gamesWon', 0);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <MenuBar menus={menus} />

      <div
        ref={boardRef}
        className="flex-1 bg-[#008000] p-3 overflow-auto relative select-none"
        onPointerMove={onBoardPointerMove}
        onPointerUp={onBoardPointerUp}
        onPointerCancel={onBoardPointerUp}
      >
        {game.won && (
          <>
            <WinAnimation foundations={game.foundations} width={boardSize.width} height={boardSize.height} />
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <Dialog98
                title="Solitaire"
                icon="info"
                message={
                  <div>
                    <div className="font-bold mb-1">Congratulations, you won!</div>
                    <div>Moves: {game.moves}</div>
                    <div>Time: {formatTime(elapsedSeconds)}</div>
                    <div>Score: {game.score}</div>
                    <div>Games won this session: {gamesWon}</div>
                  </div>
                }
                buttons={[{ label: 'New Game', onClick: () => newGame(), default: true }]}
              />
            </div>
          </>
        )}

        {showAbout && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40">
            <Dialog98
              title="About Solitaire"
              icon="info"
              message={
                <div>
                  <div className="font-bold mb-1">Solitaire</div>
                  <div>A single-player card game for Windows 98.</div>
                  <div className="mt-2">Drag cards or click to move them. Double-click sends a card to the foundation.</div>
                </div>
              }
              buttons={[{ label: 'OK', onClick: () => setShowAbout(false), default: true }]}
            />
          </div>
        )}

        {/* Top row: Stock/Waste + Foundations */}
        <div className="flex gap-3 mb-4">
          {/* Stock */}
          <div onClick={drawFromStock} className="cursor-pointer">
            {game.stock.length > 0 ? (
              <CardView card={{ suit: 'spades', rank: 1, faceUp: false }} />
            ) : (
              <EmptySlot label="&#8635;" />
            )}
          </div>

          {/* Waste */}
          <div
            data-drop-id="waste-0"
            onClick={() => game.waste.length > 0 && handleCardClick('waste', 0, game.waste.length - 1)}
            onDoubleClick={() => handleDoubleClick('waste', 0)}
            onPointerDown={(e) => game.waste.length > 0 && onCardPointerDown(e, 'waste', 0, game.waste.length - 1)}
          >
            {game.waste.length > 0 ? (
              <div
                className={
                  (isSelected('waste', 0, game.waste.length - 1) ? 'ring-2 ring-yellow-300 rounded-[3px] ' : '') +
                  (isBeingDragged('waste', 0, game.waste.length - 1) ? 'opacity-30' : '')
                }
              >
                <CardView card={game.waste[game.waste.length - 1]} />
              </div>
            ) : (
              <EmptySlot dropId="waste-0" />
            )}
          </div>

          <div className="w-[58px]" /> {/* Spacer */}

          {/* Foundations */}
          {game.foundations.map((foundation, fi) => (
            <div
              key={fi}
              data-drop-id={`foundation-${fi}`}
              onClick={() => handleCardClick('foundation', fi, foundation.length - 1)}
              onPointerDown={(e) => foundation.length > 0 && onCardPointerDown(e, 'foundation', fi, foundation.length - 1)}
            >
              {foundation.length > 0 ? (
                <div
                  className={
                    (isSelected('foundation', fi, foundation.length - 1) ? 'ring-2 ring-yellow-300 rounded-[3px] ' : '') +
                    (isBeingDragged('foundation', fi, foundation.length - 1) ? 'opacity-30' : '')
                  }
                >
                  <CardView card={foundation[foundation.length - 1]} />
                </div>
              ) : (
                <EmptySlot label={SUIT_SYMBOLS[SUITS[fi]]} dropId={`foundation-${fi}`} highlight={dropTarget === `foundation-${fi}`} />
              )}
            </div>
          ))}
        </div>

        {/* Tableau */}
        <div className="flex gap-3">
          {game.tableau.map((pile, col) => (
            <div key={col} className="relative w-[58px]" style={{ minHeight: 80 }} data-drop-id={`tableau-${col}`}>
              {pile.length === 0 ? (
                <EmptySlot dropId={`tableau-${col}`} highlight={dropTarget === `tableau-${col}`} />
              ) : (
                pile.map((card, i) => (
                  <div
                    key={i}
                    className="absolute left-0"
                    style={{ top: i * (card.faceUp ? 20 : 8) }}
                    onClick={() => card.faceUp && handleCardClick('tableau', col, i)}
                    onDoubleClick={() => i === pile.length - 1 && handleDoubleClick('tableau', col)}
                    onPointerDown={(e) => card.faceUp && onCardPointerDown(e, 'tableau', col, i)}
                  >
                    <div
                      className={
                        (isInSelectedRange('tableau', col, i) ? 'ring-2 ring-yellow-300 rounded-[3px] ' : '') +
                        (isBeingDragged('tableau', col, i) ? 'opacity-30' : '')
                      }
                    >
                      <CardView card={card} />
                    </div>
                  </div>
                ))
              )}
              {dropTarget === `tableau-${col}` && pile.length > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none border-2 border-dashed border-yellow-300 rounded-[3px]"
                  style={{ top: (pile.length - 1) * 20, height: 80 }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Floating drag layer */}
        {drag && (
          <div className="fixed z-50 pointer-events-none" style={{ left: drag.x - CARD_W / 2, top: drag.y - CARD_H / 2 }}>
            <div className="relative" style={{ width: CARD_W, height: CARD_H + (drag.cards.length - 1) * 20 }}>
              {drag.cards.map((c, i) => (
                <div key={i} className="absolute left-0" style={{ top: i * 20 }}>
                  <CardView card={c} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <StatusBar98
        panels={[
          { content: game.won ? 'You win!' : `Moves: ${game.moves}` },
          { content: `Score: ${game.score}`, width: 80 },
          { content: formatTime(elapsedSeconds), width: 60 },
          { content: `Draw ${game.drawCount}`, width: 60 },
          { content: `Stock: ${game.stock.length}`, width: 70 },
        ]}
      />
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
