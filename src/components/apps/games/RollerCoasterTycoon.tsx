'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Button98 } from '@/components/ui/Button98';
import { Dialog98 } from '@/components/ui/Dialog98';
import { cn } from '@/lib/cn';
import { playSound } from '@/lib/sounds';
import { useSettings } from '@/contexts/SettingsContext';
import { useGameLoop } from './engine/loop';
import {
  PieceType,
  TrackCell,
  Validation,
  Ratings,
  CoasterSim,
  ParkSim,
  isAdjacent,
  validateTrack,
  computeRatings,
  rideValue,
  parkValue,
  stepPark,
  WIN_TARGET,
} from './engine/coaster';

const GAME_ID = 'rollercoaster-tycoon';

const COLS = 12;
const ROWS = 8;
const CELL = 40;
const CANVAS_W = COLS * CELL;
const CANVAS_H = ROWS * CELL;

const START_CASH = 3000;
const MAX_COASTERS = 3;

const PIECES: { type: PieceType; label: string; color: string }[] = [
  { type: 'straight', label: 'Straight', color: '#9aa0a6' },
  { type: 'turn', label: 'Turn', color: '#e8b923' },
  { type: 'lift', label: 'Lift Hill', color: '#3a7bd5' },
  { type: 'drop', label: 'Drop', color: '#e8752a' },
  { type: 'loop', label: 'Loop', color: '#9c4dcc' },
];

const PIECE_COLOR: Record<PieceType, string> = {
  station: '#7a4a1e',
  straight: '#9aa0a6',
  turn: '#e8b923',
  lift: '#3a7bd5',
  drop: '#e8752a',
  loop: '#9c4dcc',
};

function makeCoaster(id: number, stationY: number): CoasterSim {
  return {
    id,
    name: `Coaster ${id}`,
    layout: [{ x: 1, y: stationY, type: 'station' }],
    open: false,
    price: 3,
    totalRiders: 0,
    carPos: 0,
    riderAcc: 0,
    happiness: 0.6,
  };
}

function makeInitialSim(): ParkSim {
  return {
    coasters: [makeCoaster(1, 2)],
    activeIndex: 0,
    cash: START_CASH,
    lastMilestone: 0,
    hudAcc: 0,
  };
}

function validRideValues(coasters: CoasterSim[]): number[] {
  const out: number[] = [];
  for (const c of coasters) {
    if (validateTrack(c.layout).valid) {
      out.push(rideValue(computeRatings(c.layout), c.layout));
    }
  }
  return out;
}

// Read-only snapshot of the sim used for rendering the HUD/panels. Kept in
// React state so the render body never has to touch the mutable simRef.
interface CoasterView {
  id: number;
  name: string;
  open: boolean;
  price: number;
  totalRiders: number;
  happiness: number;
  ratings: Ratings;
  valid: boolean;
  reason: Validation['reason'];
}

interface ParkView {
  activeIndex: number;
  cash: number;
  parkValue: number;
  coasters: CoasterView[];
}

function buildView(sim: ParkSim): ParkView {
  return {
    activeIndex: sim.activeIndex,
    cash: sim.cash,
    parkValue: parkValue(validRideValues(sim.coasters), sim.cash),
    coasters: sim.coasters.map((c) => {
      const v = validateTrack(c.layout);
      return {
        id: c.id,
        name: c.name,
        open: c.open,
        price: c.price,
        totalRiders: c.totalRiders,
        happiness: c.happiness,
        ratings: computeRatings(c.layout),
        valid: v.valid,
        reason: v.reason,
      };
    }),
  };
}

const REASON_TEXT: Record<Validation['reason'], string> = {
  ok: 'Ride is ready to open!',
  empty: 'Place some track first.',
  'no-station': 'The ride must start at the station.',
  'too-short': 'The track is too short — build a proper circuit.',
  'multiple-stations': 'A ride can only have one station.',
  overlap: 'Two pieces overlap. Track cannot cross itself.',
  disconnected: 'The track has a gap — every piece must connect.',
  'not-a-loop': 'The track must loop back to the station to open.',
};

export default function RollerCoasterTycoon({ windowId }: AppComponentProps) {
  void windowId;
  const { getAppPref, setAppPref } = useSettings();

  const [mode, setMode] = useState<'title' | 'park'>('title');
  const [selectedPiece, setSelectedPiece] = useState<PieceType>('straight');
  const [view, setView] = useState<ParkView>(() => buildView(makeInitialSim()));
  const [buildError, setBuildError] = useState<Validation['reason'] | null>(null);
  const [milestoneValue, setMilestoneValue] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [best, setBest] = useState<number>(() => getAppPref<number>(GAME_ID, 'bestParkValue', 0));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<ParkSim>(makeInitialSim());

  const bump = useCallback(() => setView(buildView(simRef.current)), []);

  const startNewGame = useCallback(() => {
    simRef.current = makeInitialSim();
    setWon(false);
    setMilestoneValue(null);
    setSelectedPiece('straight');
    setMode('park');
    bump();
  }, [bump]);

  const active = view.coasters[view.activeIndex];
  const activeRatings = active ? active.ratings : null;

  // --- placement ---------------------------------------------------------
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const sim = simRef.current;
      const c = sim.coasters[sim.activeIndex];
      if (!c || c.open) {
        playSound('error');
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const cx = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
      const cy = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
      if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return;

      const last = c.layout[c.layout.length - 1];
      // Clicking the last-placed piece removes it (station stays).
      if (last && last.x === cx && last.y === cy) {
        if (c.layout.length > 1) {
          c.layout.pop();
          playSound('ding');
          bump();
        }
        return;
      }
      if (c.layout.some((p) => p.x === cx && p.y === cy)) {
        playSound('error');
        return;
      }
      const next: TrackCell = { x: cx, y: cy, type: selectedPiece };
      if (!isAdjacent(last, next)) {
        playSound('error');
        return;
      }
      c.layout.push(next);
      playSound('ding');
      bump();
    },
    [selectedPiece, bump],
  );

  const openRide = useCallback(() => {
    const c = simRef.current.coasters[simRef.current.activeIndex];
    if (!c) return;
    const v = validateTrack(c.layout);
    if (!v.valid) {
      setBuildError(v.reason);
      playSound('error');
      return;
    }
    c.open = true;
    c.carPos = 0;
    playSound('chord');
    bump();
  }, [bump]);

  const closeRide = useCallback(() => {
    const c = simRef.current.coasters[simRef.current.activeIndex];
    if (!c) return;
    c.open = false;
    bump();
  }, [bump]);

  const clearTrack = useCallback(() => {
    const c = simRef.current.coasters[simRef.current.activeIndex];
    if (!c || c.open) return;
    c.layout = [c.layout[0]];
    playSound('ding');
    bump();
  }, [bump]);

  const addCoaster = useCallback(() => {
    const sim = simRef.current;
    if (sim.coasters.length >= MAX_COASTERS) return;
    const id = sim.coasters.length + 1;
    sim.coasters.push(makeCoaster(id, 2 + (id - 1) * 2));
    sim.activeIndex = sim.coasters.length - 1;
    playSound('ding');
    bump();
  }, [bump]);

  const selectCoaster = useCallback(
    (i: number) => {
      simRef.current.activeIndex = i;
      bump();
    },
    [bump],
  );

  const setPrice = useCallback(
    (p: number) => {
      const c = simRef.current.coasters[simRef.current.activeIndex];
      if (!c) return;
      c.price = p;
      bump();
    },
    [bump],
  );

  // --- rendering ---------------------------------------------------------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sim = simRef.current;

    // sky + grass
    const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    sky.addColorStop(0, '#8fd3ff');
    sky.addColorStop(0.45, '#bfe6b0');
    sky.addColorStop(1, '#3a9e5c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, CANVAS_H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(CANVAS_W, y * CELL);
      ctx.stroke();
    }

    const center = (cell: TrackCell) => ({
      cx: cell.x * CELL + CELL / 2,
      cy: cell.y * CELL + CELL / 2,
    });

    sim.coasters.forEach((c, idx) => {
      const isActive = idx === sim.activeIndex;
      const alpha = isActive ? 1 : 0.35;

      // connecting rail
      if (c.layout.length > 1) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = isActive ? 6 : 4;
        ctx.beginPath();
        const first = center(c.layout[0]);
        ctx.moveTo(first.cx, first.cy);
        for (let i = 1; i < c.layout.length; i++) {
          const p = center(c.layout[i]);
          ctx.lineTo(p.cx, p.cy);
        }
        if (validateTrack(c.layout).valid) ctx.lineTo(first.cx, first.cy);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // pieces
      c.layout.forEach((cell) => {
        const { cx, cy } = center(cell);
        ctx.globalAlpha = alpha;
        if (cell.type === 'station') {
          ctx.fillStyle = '#7a4a1e';
          ctx.fillRect(cx - 12, cy - 10, 24, 20);
          ctx.fillStyle = '#c0392b';
          ctx.beginPath();
          ctx.moveTo(cx - 14, cy - 10);
          ctx.lineTo(cx, cy - 20);
          ctx.lineTo(cx + 14, cy - 10);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = PIECE_COLOR[cell.type];
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });

      // train car (only when open + valid loop)
      if (c.open && c.layout.length > 1 && validateTrack(c.layout).valid) {
        const n = c.layout.length;
        const i0 = Math.floor(c.carPos) % n;
        const i1 = (i0 + 1) % n;
        const t = c.carPos - Math.floor(c.carPos);
        const a = center(c.layout[i0]);
        const b = center(c.layout[i1]);
        const px = a.cx + (b.cx - a.cx) * t;
        const py = a.cy + (b.cy - a.cy) * t;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffde59';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7a5a00';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // little queue of guests by the station
        const st = center(c.layout[0]);
        const queueLen = Math.min(6, Math.floor(c.happiness * 8));
        for (let q = 0; q < queueLen; q++) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'][q % 4];
          ctx.beginPath();
          ctx.arc(st.cx + 16 + q * 6, st.cy + 14, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    });
  }, []);

  // --- simulation --------------------------------------------------------
  useGameLoop(
    useCallback(
      (dt) => {
        const res = stepPark(simRef.current, dt);
        if (res.hudReady) {
          if (res.won) {
            setWon(true);
            playSound('cardWin');
          } else if (res.newMilestone !== null) {
            setMilestoneValue(res.newMilestone);
            playSound('cardWin');
          }
          setBest((b) => {
            if (res.parkValue > b) {
              setAppPref(GAME_ID, 'bestParkValue', res.parkValue);
              return res.parkValue;
            }
            return b;
          });
          bump();
        }
        draw();
      },
      [draw, bump, setAppPref],
    ),
    mode === 'park',
  );

  // Redraw on any structural/HUD change (in addition to per-frame loop draws).
  useEffect(() => {
    if (mode === 'park') draw();
  }, [mode, view, draw]);

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  // --- title screen ------------------------------------------------------
  if (mode === 'title') {
    return (
      <div className="flex flex-col h-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#2d8a4e] via-[#3a9e5c] to-[#1a5e32]" />
        <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-[#4a9eff] via-[#6db3ff] to-[#87ceeb]">
          <div className="absolute top-[15%] left-[10%] w-16 h-6 bg-white rounded-full opacity-80" />
          <div className="absolute top-[12%] left-[14%] w-12 h-5 bg-white rounded-full opacity-80" />
          <div className="absolute top-[25%] right-[20%] w-20 h-7 bg-white rounded-full opacity-70" />
          <div className="absolute top-[22%] right-[17%] w-14 h-5 bg-white rounded-full opacity-70" />
        </div>
        <div className="absolute bottom-[30%] left-0 right-0 h-[35%]">
          <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
            <path
              d="M0,80 Q50,10 100,50 Q130,75 160,30 Q190,-10 220,40 Q250,70 280,20 Q310,-5 340,50 Q370,80 400,60"
              fill="none"
              stroke="#654321"
              strokeWidth="3"
            />
            <path
              d="M0,83 Q50,13 100,53 Q130,78 160,33 Q190,-7 220,43 Q250,73 280,23 Q310,-2 340,53 Q370,83 400,63"
              fill="none"
              stroke="#8B6914"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-2 p-4">
          <div className="text-center mb-2">
            <h1
              className="text-[28px] font-bold leading-tight"
              style={{
                color: '#FFD700',
                textShadow: '2px 2px 0 #8B4513, -1px -1px 0 #654321, 1px -1px 0 #654321, -1px 1px 0 #654321',
                fontFamily: 'serif',
              }}
            >
              RollerCoaster Tycoon
            </h1>
            <div
              className="text-[14px] mt-1"
              style={{ color: '#FFF8DC', textShadow: '1px 1px 0 #654321', fontFamily: 'serif' }}
            >
              Forest Frontiers
            </div>
          </div>

          <div className="w-[120px] h-[80px] relative mb-3">
            <div className="absolute bottom-0 left-[10px] w-[20px] h-[60px] bg-gradient-to-b from-[#8B4513] to-[#654321] rounded-t-sm" />
            <div className="absolute bottom-0 right-[10px] w-[20px] h-[60px] bg-gradient-to-b from-[#8B4513] to-[#654321] rounded-t-sm" />
            <div className="absolute top-[10px] left-[5px] right-[5px] h-[20px] bg-gradient-to-b from-[#DAA520] to-[#B8860B] rounded-t-lg flex items-center justify-center">
              <span className="text-[8px] text-white font-bold">PARK ENTRANCE</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-[200px]">
            <button
              onClick={startNewGame}
              className="py-2 px-4 text-[13px] font-bold cursor-pointer border-2 rounded-sm"
              style={{
                background: 'linear-gradient(to bottom, #FFD700, #DAA520)',
                borderColor: '#8B4513',
                color: '#4a2800',
                textShadow: '0 1px 0 rgba(255,255,255,0.3)',
                fontFamily: 'serif',
              }}
            >
              New Game
            </button>
            {['Load Game', 'Options', 'Exit'].map((label) => (
              <button
                key={label}
                onClick={() => playSound('error')}
                className="py-2 px-4 text-[13px] font-bold cursor-pointer border-2 rounded-sm"
                style={{
                  background: 'linear-gradient(to bottom, #FFD700, #DAA520)',
                  borderColor: '#8B4513',
                  color: '#4a2800',
                  textShadow: '0 1px 0 rgba(255,255,255,0.3)',
                  fontFamily: 'serif',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {best > 0 && (
            <div className="mt-1 text-[10px] text-[#FFF8DC]" style={{ textShadow: '1px 1px 0 #000' }}>
              Best Park Value: {fmt(best)}
            </div>
          )}
          <div className="mt-2 text-[10px] text-[#d4e8d4]" style={{ textShadow: '1px 1px 0 #000' }}>
            &copy; 1999 Chris Sawyer
          </div>
        </div>
      </div>
    );
  }

  // --- park / builder ----------------------------------------------------
  const rideOpen = active?.open ?? false;

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] overflow-hidden">
      {/* Top status bar */}
      <div className="flex items-center gap-3 px-2 py-1 bg-[linear-gradient(to_right,#1a5e32,#2d8a4e)] text-white">
        <span className="font-bold">🎢 Forest Frontiers</span>
        <span>Cash: <b>{fmt(view.cash)}</b></span>
        <span>Park Value: <b>{fmt(view.parkValue)}</b></span>
        <span className="opacity-80">Goal: {fmt(WIN_TARGET)}</span>
        <span className="ml-auto opacity-90">Best: {fmt(best)}</span>
      </div>

      {/* Coaster tabs */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[var(--win98-button-shadow)]">
        {view.coasters.map((c, i) => (
          <Button98
            key={c.id}
            active={i === view.activeIndex}
            onClick={() => selectCoaster(i)}
            className="min-w-0 px-2"
          >
            {c.name}{c.open ? ' ●' : ''}
          </Button98>
        ))}
        {view.coasters.length < MAX_COASTERS && (
          <Button98 onClick={addCoaster} className="min-w-0 px-2">+ New Coaster</Button98>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Canvas park view */}
        <div className="flex-1 min-w-0 p-2 flex items-start justify-center bg-[#20232a]">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onClick={handleCanvasClick}
            className={cn('w-full h-auto max-w-full border-2 border-[var(--win98-button-dark-shadow)]', !rideOpen && 'cursor-crosshair')}
            style={{ imageRendering: 'pixelated', aspectRatio: `${COLS} / ${ROWS}` }}
          />
        </div>

        {/* Right control panel */}
        <div className="w-[180px] shrink-0 border-l border-[var(--win98-button-shadow)] p-2 flex flex-col gap-2 overflow-y-auto">
          {/* Ratings */}
          {activeRatings && (
            <div className="border border-[var(--win98-button-shadow)] p-1.5 bg-white/40">
              <div className="font-bold mb-1">Ratings</div>
              <RatingRow label="Excitement" value={activeRatings.excitement} color="#2e8b57" />
              <RatingRow label="Intensity" value={activeRatings.intensity} color="#d2691e" />
              <RatingRow label="Nausea" value={activeRatings.nausea} color="#9c4dcc" />
            </div>
          )}

          {/* Build palette */}
          <div>
            <div className="font-bold mb-1">Track Pieces</div>
            <div className="grid grid-cols-1 gap-1">
              {PIECES.map((p) => (
                <Button98
                  key={p.type}
                  active={selectedPiece === p.type}
                  disabled={rideOpen}
                  onClick={() => setSelectedPiece(p.type)}
                  className="min-w-0 justify-start gap-2"
                >
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: p.color }} />
                  {p.label}
                </Button98>
              ))}
            </div>
            <div className="text-[10px] mt-1 text-[var(--win98-button-shadow)]">
              Click a cell next to the last piece. Click the last piece to undo.
            </div>
          </div>

          {/* Build controls */}
          <div className="flex gap-1">
            <Button98 disabled={rideOpen} onClick={clearTrack} className="min-w-0 flex-1">Clear</Button98>
            {rideOpen ? (
              <Button98 onClick={closeRide} className="min-w-0 flex-1">Close Ride</Button98>
            ) : (
              <Button98 onClick={openRide} className="min-w-0 flex-1 font-bold">Open Ride!</Button98>
            )}
          </div>

          {active && !active.valid && !rideOpen && (
            <div className="text-[10px] text-[#a00]">{REASON_TEXT[active.reason]}</div>
          )}

          {/* Ticket + stats */}
          {active && (
            <div className="border border-[var(--win98-button-shadow)] p-1.5 bg-white/40">
              <div className="font-bold mb-1">Ticket: ${active.price}</div>
              <input
                type="range"
                min={0}
                max={15}
                step={1}
                value={active.price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-[10px] mt-1">Total riders: {active.totalRiders}</div>
              <div className="text-[10px]">Happiness: {Math.round(active.happiness * 100)}%</div>
              <div className="text-[10px]">Status: {rideOpen ? 'OPEN' : 'closed'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Build error dialog */}
      {buildError && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/30">
          <Dialog98
            title="Cannot Open Ride"
            icon="warning"
            message={REASON_TEXT[buildError]}
            buttons={[{ label: 'OK', onClick: () => setBuildError(null), default: true }]}
          />
        </div>
      )}

      {/* Milestone dialog */}
      {milestoneValue !== null && !won && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/30">
          <Dialog98
            title="Park Milestone!"
            icon="info"
            message={`Your park value just passed ${fmt(milestoneValue)}! Guests are flocking to Forest Frontiers.`}
            buttons={[{ label: 'Hooray!', onClick: () => setMilestoneValue(null), default: true }]}
          />
        </div>
      )}

      {/* Win dialog */}
      {won && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
          <Dialog98
            title="Scenario Complete!"
            icon="info"
            message={`Congratulations! Forest Frontiers reached a park value of ${fmt(WIN_TARGET)}. You are a true RollerCoaster Tycoon!`}
            buttons={[
              { label: 'Keep Building', onClick: () => setWon(false) },
              { label: 'Main Menu', onClick: () => { setWon(false); setMode('title'); }, default: true },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function RatingRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1 mb-0.5">
      <span className="w-[62px]">{label}</span>
      <div className="flex-1 h-2 bg-[var(--win98-button-shadow)] border border-[var(--win98-button-dark-shadow)]">
        <div className="h-full" style={{ width: `${(value / 10) * 100}%`, background: color }} />
      </div>
      <span className="w-[26px] text-right tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}
