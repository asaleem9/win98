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
  ParkSim,
  StallType,
  Unlockable,
  isAdjacent,
  cellHeight,
  validateTrack,
  computeRatings,
  rideValue,
  parkValue,
  dirtiness,
  nextPieceHeight,
  createParkSim,
  makeCoaster,
  stepPark,
  trackPointAt,
  buildStall,
  togglePath,
  hireHandyman,
  inBounds,
  WIN_TARGET,
  MAX_COASTERS,
  STALL_COST,
  HANDYMAN_HIRE_COST,
  RESEARCH_ORDER,
} from './engine/coaster';
import {
  compileSprite,
  drawSprite,
  animFrame,
  isoToScreen,
  screenToIso,
  drawIsoTileOutline,
  type SpriteDef,
} from './engine/sprites';
import {
  GROUND_GRASS,
  GROUND_PATH,
  GROUND_WATER,
  GROUND_FLOWER,
  RAIL_STRAIGHT_TX,
  RAIL_STRAIGHT_TY,
  RAIL_ES,
  RAIL_EN,
  RAIL_WS,
  RAIL_WN,
  TRACK_STATION,
  TRACK_LIFT,
  TRACK_DROP,
  TRACK_LOOP,
  TRACK_SUPPORT,
  TRAIN_CAR_SE,
  TRAIN_CAR_NE,
  TRAIN_CAR_SW,
  TRAIN_CAR_NW,
  PEEP_WALK,
  PEEP_RIDE,
  PEEP_DIZZY,
  PEEP_VOMIT,
  HANDYMAN_WALK,
  HANDYMAN_SWEEP,
  STALL_FOOD,
  STALL_DRINK,
  STALL_BALLOON,
  BALLOON,
  TREE_PINE,
  TREE_ROUND,
  TREE_BUSH,
  ENTRANCE_GATE,
  FENCE,
  VOMIT_PUDDLE,
  COIN,
} from './engine/sprites/rct';

const GAME_ID = 'rollercoaster-tycoon';

// --- iso projection ------------------------------------------------------
const TW = 32;
const TH = 16;
const HW = TW / 2;
const HH = TH / 2;
const HZ = 8; // pixels a track piece lifts per elevation level
const CANVAS_W = 480;
const CANVAS_H = 320;
const ORIGIN = { x: 192, y: 52 };

const tileTop = (tx: number, ty: number) => isoToScreen(tx, ty, TW, TH, ORIGIN);
const tileCenter = (tx: number, ty: number) => {
  const t = tileTop(tx, ty);
  return { x: t.x, y: t.y + HH };
};

// --- sprite lookups ------------------------------------------------------
const GROUND_SPRITE: Record<string, SpriteDef> = {
  grass: GROUND_GRASS,
  path: GROUND_PATH,
  water: GROUND_WATER,
  flower: GROUND_FLOWER,
};
const TREE_SPRITE: Record<string, SpriteDef> = { tree1: TREE_PINE, tree2: TREE_ROUND, tree3: TREE_BUSH };
const STALL_SPRITE: Record<StallType, SpriteDef> = {
  food: STALL_FOOD,
  drink: STALL_DRINK,
  balloon: STALL_BALLOON,
};
const CAR_SPRITE: Record<string, SpriteDef> = {
  SE: TRAIN_CAR_SE,
  NE: TRAIN_CAR_NE,
  SW: TRAIN_CAR_SW,
  NW: TRAIN_CAR_NW,
};

// Six shirt tints for the crowd, so a queue reads as individuals.
const SHIRT_COLORS: Record<string, string>[] = [
  { R: '#e0685f', r: '#c23a2f' },
  { R: '#6a8ae0', r: '#3a5ab8' },
  { R: '#6ad07a', r: '#3a9a4a' },
  { R: '#e6c84f', r: '#c9a520' },
  { R: '#b46ae0', r: '#8a3ab8' },
  { R: '#e59a4a', r: '#c9702a' },
];
const BALLOON_COLORS = ['#e0503a', '#4a90d9', '#f2d23a', '#6ad07a', '#b46ae0'];
// One recolor per coaster, plus a darker tint for its lead car (the "engine").
const COASTER_COLORS: { R: string; q: string }[] = [
  { R: '#d84a3a', q: '#7a1f16' },
  { R: '#3a7bd5', q: '#1f3f7a' },
  { R: '#9c4dcc', q: '#4f1f6a' },
];

const PIECES: { type: PieceType; label: string; color: string; locked?: Unlockable }[] = [
  { type: 'straight', label: 'Straight', color: '#9aa0a6' },
  { type: 'turn', label: 'Turn', color: '#e8b923' },
  { type: 'lift', label: 'Lift Hill', color: '#3a7bd5' },
  { type: 'drop', label: 'Drop', color: '#e8752a', locked: 'drop' },
  { type: 'loop', label: 'Loop', color: '#9c4dcc', locked: 'loop' },
];

type Tool = PieceType | 'path' | 'stall-food' | 'stall-drink' | 'stall-balloon';

const REASON_TEXT: Record<Validation['reason'], string> = {
  ok: 'Ride is ready to open!',
  empty: 'Place some track first.',
  'no-station': 'The ride must start at the station.',
  'too-short': 'The track is too short — build a proper circuit.',
  'multiple-stations': 'A ride can only have one station.',
  overlap: 'Two pieces overlap. Track cannot cross itself.',
  disconnected: 'The track has a gap — every piece must connect.',
  'not-a-loop': 'The track must loop back to the station to open.',
  'not-level': 'The circuit must come back down to the station height.',
  'too-steep': 'Too much climbing — add lift hills or ease the grade.',
};

const RESEARCH_LABEL: Record<Unlockable, string> = {
  drop: 'Drop pieces',
  loop: 'Vertical loops',
  balloonStall: 'Balloon stall',
};

// --- view snapshot (kept in React state; render body never touches simRef) --
interface CoasterView {
  id: number;
  name: string;
  open: boolean;
  testing: boolean;
  price: number;
  totalRiders: number;
  happiness: number;
  ratings: Ratings;
  valid: boolean;
  reason: Validation['reason'];
  length: number;
  queueLen: number;
}

interface ParkView {
  activeIndex: number;
  cash: number;
  parkValue: number;
  guests: number;
  puddles: number;
  handymen: number;
  dirt: number;
  research: { progress: number; next: Unlockable | null; unlocked: Record<Unlockable, boolean> };
  coasters: CoasterView[];
}

function validRideValues(sim: ParkSim): number[] {
  const out: number[] = [];
  for (const c of sim.coasters) {
    if (validateTrack(c.layout).valid) out.push(rideValue(computeRatings(c.layout), c.layout));
  }
  return out;
}

function buildView(sim: ParkSim): ParkView {
  return {
    activeIndex: sim.activeIndex,
    cash: sim.cash,
    parkValue: parkValue(validRideValues(sim), sim.cash),
    guests: sim.peeps.length,
    puddles: sim.puddles.length,
    handymen: sim.handymen.length,
    dirt: dirtiness(sim),
    research: {
      progress: sim.research.progress,
      next: RESEARCH_ORDER[sim.research.queueIndex] ?? null,
      unlocked: { ...sim.research.unlocked },
    },
    coasters: sim.coasters.map((c) => {
      const v = validateTrack(c.layout);
      return {
        id: c.id,
        name: c.name,
        open: c.open,
        testing: c.testing,
        price: c.price,
        totalRiders: c.totalRiders,
        happiness: c.happiness,
        ratings: computeRatings(c.layout),
        valid: v.valid,
        reason: v.reason,
        length: c.layout.length,
        queueLen: c.queue.length,
      };
    }),
  };
}

// --- track orientation ---------------------------------------------------
type Dir = 'E' | 'W' | 'S' | 'N';
function dirBetween(a: TrackCell, b: TrackCell): Dir | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 1) return 'E';
  if (dx === -1) return 'W';
  if (dy === 1) return 'S';
  if (dy === -1) return 'N';
  return null;
}
function railDefFor(dirs: Set<Dir>): SpriteDef {
  const has = (d: Dir) => dirs.has(d);
  const one = dirs.size === 1;
  if ((has('E') && has('W')) || (one && (has('E') || has('W')))) return RAIL_STRAIGHT_TX;
  if ((has('N') && has('S')) || (one && (has('N') || has('S')))) return RAIL_STRAIGHT_TY;
  if (has('E') && has('S')) return RAIL_ES;
  if (has('E') && has('N')) return RAIL_EN;
  if (has('W') && has('S')) return RAIL_WS;
  if (has('W') && has('N')) return RAIL_WN;
  return RAIL_STRAIGHT_TX;
}

interface Particle {
  x: number;
  y: number;
  t: number;
}

/** Age coin particles and drop the spent ones. Kept out of the render loop so
 *  the mutation doesn't trip the hook-immutability lint. */
function advanceParticles(list: Particle[], dt: number): Particle[] {
  for (const p of list) p.t += dt;
  return list.filter((p) => p.t < 0.9);
}

export default function RollerCoasterTycoon({ windowId }: AppComponentProps) {
  void windowId;
  const { getAppPref, setAppPref } = useSettings();

  const [mode, setMode] = useState<'title' | 'park'>('title');
  const [tool, setTool] = useState<Tool>('straight');
  const [view, setView] = useState<ParkView>(() => buildView(createParkSim(1)));
  const [buildError, setBuildError] = useState<Validation['reason'] | null>(null);
  const [milestoneValue, setMilestoneValue] = useState<number | null>(null);
  const [researchToast, setResearchToast] = useState<Unlockable | null>(null);
  const [won, setWon] = useState(false);
  const [best, setBest] = useState<number>(() => getAppPref<number>(GAME_ID, 'bestParkValue', 0));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terrainRef = useRef<HTMLCanvasElement | null>(null);
  const terrainDirty = useRef(true);
  const simRef = useRef<ParkSim>(createParkSim(1));
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const dragging = useRef(false);
  const lastTile = useRef<{ x: number; y: number } | null>(null);
  const lastDing = useRef(0);
  const bestSaved = useRef(best);

  const bump = useCallback(() => setView(buildView(simRef.current)), []);

  const startNewGame = useCallback(() => {
    simRef.current = createParkSim(Date.now());
    terrainDirty.current = true;
    particlesRef.current = [];
    setWon(false);
    setMilestoneValue(null);
    setResearchToast(null);
    setTool('straight');
    setMode('park');
    bump();
  }, [bump]);

  const active = view.coasters[view.activeIndex];
  const activeRatings = active ? active.ratings : null;
  const rideOpen = active?.open ?? false;
  const rideTesting = active?.testing ?? false;

  // --- placement ---------------------------------------------------------
  const applyToolAt = useCallback(
    (cx: number, cy: number, isDrag: boolean) => {
      const sim = simRef.current;
      if (!inBounds(sim, cx, cy)) return;

      // Scenery tools work whether or not a ride is running.
      if (tool === 'path') {
        if (isDrag) {
          if (sim.terrain[cy][cx] === 'grass' || sim.terrain[cy][cx] === 'flower') togglePath(sim, cx, cy);
        } else {
          const r = togglePath(sim, cx, cy);
          playSound(r === 'blocked' ? 'error' : 'ding');
        }
        bump();
        return;
      }
      if (tool === 'stall-food' || tool === 'stall-drink' || tool === 'stall-balloon') {
        if (isDrag) return;
        const type = tool.slice(6) as StallType;
        playSound(buildStall(sim, type, cx, cy) ? 'chord' : 'error');
        bump();
        return;
      }

      // Track pieces — only on the active, closed ride.
      const c = sim.coasters[sim.activeIndex];
      if (!c || c.open || c.testing) {
        if (!isDrag) playSound('error');
        return;
      }
      const last = c.layout[c.layout.length - 1];
      if (!isDrag && last && last.x === cx && last.y === cy) {
        if (c.layout.length > 1) {
          c.layout.pop();
          playSound('ding');
          bump();
        }
        return;
      }
      if (c.layout.some((p) => p.x === cx && p.y === cy)) return;
      if (sim.terrain[cy][cx] === 'water') {
        if (!isDrag) playSound('error');
        return;
      }
      const next: TrackCell = {
        x: cx,
        y: cy,
        type: tool,
        height: nextPieceHeight(cellHeight(last), tool),
      };
      if (!isAdjacent(last, next)) {
        if (!isDrag) playSound('error');
        return;
      }
      c.layout.push(next);
      playSound('ding');
      bump();
    },
    [tool, bump],
  );

  const toTile = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * CANVAS_W;
    const sy = ((clientY - rect.top) / rect.height) * CANVAS_H;
    const iso = screenToIso(sx, sy, TW, TH, ORIGIN);
    return { x: Math.floor(iso.tx), y: Math.floor(iso.ty) };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const t = toTile(e.clientX, e.clientY);
      if (!t) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragging.current = true;
      lastTile.current = t;
      applyToolAt(t.x, t.y, false);
    },
    [toTile, applyToolAt],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const t = toTile(e.clientX, e.clientY);
      hoverRef.current = t;
      if (!t || !dragging.current) return;
      if (lastTile.current && lastTile.current.x === t.x && lastTile.current.y === t.y) return;
      lastTile.current = t;
      applyToolAt(t.x, t.y, true);
    },
    [toTile, applyToolAt],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    lastTile.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be gone */
    }
  }, []);

  // --- ride controls -----------------------------------------------------
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
    c.testing = false;
    c.carPos = 0;
    playSound('chord');
    bump();
  }, [bump]);

  const testRide = useCallback(() => {
    const c = simRef.current.coasters[simRef.current.activeIndex];
    if (!c) return;
    const v = validateTrack(c.layout);
    if (!v.valid) {
      setBuildError(v.reason);
      playSound('error');
      return;
    }
    c.open = false;
    c.testing = true;
    c.testLap = 0;
    c.carPos = 0;
    playSound('ding');
    bump();
  }, [bump]);

  const closeRide = useCallback(() => {
    const c = simRef.current.coasters[simRef.current.activeIndex];
    if (!c) return;
    c.open = false;
    c.testing = false;
    bump();
  }, [bump]);

  const clearTrack = useCallback(() => {
    const c = simRef.current.coasters[simRef.current.activeIndex];
    if (!c || c.open || c.testing) return;
    c.layout = [c.layout[0]];
    playSound('ding');
    bump();
  }, [bump]);

  const addCoaster = useCallback(() => {
    const sim = simRef.current;
    if (sim.coasters.length >= MAX_COASTERS) return;
    const id = sim.coasters.length + 1;
    // Drop the new station a couple of tiles along from the first one.
    sim.coasters.push(makeCoaster(id, `Coaster ${id}`, 6 + id, 3));
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

  const doHire = useCallback(() => {
    playSound(hireHandyman(simRef.current) ? 'chord' : 'error');
    bump();
  }, [bump]);

  // --- rendering ---------------------------------------------------------
  const drawTerrain = useCallback((sim: ParkSim) => {
    let buf = terrainRef.current;
    if (!buf) {
      buf = document.createElement('canvas');
      buf.width = CANVAS_W;
      buf.height = CANVAS_H;
      terrainRef.current = buf;
    }
    const ctx = buf.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    for (let ty = 0; ty < sim.gridH; ty++) {
      for (let tx = 0; tx < sim.gridW; tx++) {
        const t = tileTop(tx, ty);
        const sprite = compileSprite(GROUND_SPRITE[sim.terrain[ty][tx]]);
        drawSprite(ctx, sprite, t.x - HW, t.y, { anchor: 'top-left' });
      }
    }
    terrainDirty.current = false;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sim = simRef.current;

    // Sky wash behind the park.
    const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    sky.addColorStop(0, '#9fd4ef');
    sky.addColorStop(1, '#cfeccf');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (terrainDirty.current) drawTerrain(sim);
    if (terrainRef.current) ctx.drawImage(terrainRef.current, 0, 0);

    // Collect every moving/standing thing and paint back-to-front.
    interface Item {
      d: number;
      r: number;
      fn: () => void;
    }
    const items: Item[] = [];
    const push = (tx: number, ty: number, rank: number, fn: () => void) =>
      items.push({ d: tx + ty, r: rank, fn });

    // Puddles (flat on the ground).
    for (const pd of sim.puddles) {
      const frame = pd.age < 4 ? 0 : 1;
      push(pd.x, pd.y, 1, () => {
        const c = tileCenter(pd.x, pd.y);
        drawSprite(ctx, compileSprite(VOMIT_PUDDLE), c.x, c.y + 3, { frame, anchor: 'center' });
      });
    }

    // Decor.
    for (const d of sim.decor) {
      const sprite = d.type === 'fence' ? FENCE : TREE_SPRITE[d.type];
      push(d.x, d.y, 3, () => {
        const c = tileCenter(d.x, d.y);
        drawSprite(ctx, compileSprite(sprite), c.x, c.y + 2, { anchor: 'bottom-center' });
      });
    }

    // Gate.
    push(sim.gate.x, sim.gate.y, 3, () => {
      const c = tileCenter(sim.gate.x, sim.gate.y);
      drawSprite(ctx, compileSprite(ENTRANCE_GATE), c.x, c.y + 4, { anchor: 'bottom-center' });
    });

    // Stalls.
    for (const s of sim.stalls) {
      push(s.x, s.y, 3, () => {
        const c = tileCenter(s.x, s.y);
        drawSprite(ctx, compileSprite(STALL_SPRITE[s.type]), c.x, c.y + 3, { anchor: 'bottom-center' });
      });
    }

    // Track: rails, markers, supports, plus a connecting spine across heights.
    sim.coasters.forEach((c, ci) => {
      const isActive = ci === sim.activeIndex;
      const alpha = isActive ? 1 : 0.4;
      const valid = validateTrack(c.layout).valid;
      const n = c.layout.length;
      const color = COASTER_COLORS[ci % COASTER_COLORS.length];

      const centerOf = (cell: TrackCell) => {
        const c0 = tileCenter(cell.x, cell.y);
        return { x: c0.x, y: c0.y - cellHeight(cell) * HZ };
      };

      // Spine connectors between consecutive pieces (and the closing leg).
      const segs: [TrackCell, TrackCell][] = [];
      for (let i = 0; i < n - 1; i++) segs.push([c.layout[i], c.layout[i + 1]]);
      if (valid && n > 1) segs.push([c.layout[n - 1], c.layout[0]]);
      for (const [a, b] of segs) {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        push(mx, my, 2, () => {
          const pa = centerOf(a);
          const pb = centerOf(b);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = '#4a3a2a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        });
      }

      c.layout.forEach((cell, i) => {
        const dirs = new Set<Dir>();
        if (i > 0) {
          const d = dirBetween(cell, c.layout[i - 1]);
          if (d) dirs.add(d);
        }
        if (i < n - 1) {
          const d = dirBetween(cell, c.layout[i + 1]);
          if (d) dirs.add(d);
        }
        if (valid && n > 1 && (i === 0 || i === n - 1)) {
          const other = i === 0 ? c.layout[n - 1] : c.layout[0];
          const d = dirBetween(cell, other);
          if (d) dirs.add(d);
        }

        push(cell.x, cell.y, 4, () => {
          const p = centerOf(cell);
          const ground = tileCenter(cell.x, cell.y);
          ctx.globalAlpha = alpha;
          // Support posts down to the ground for elevated pieces.
          for (let h = 0; h < cellHeight(cell); h++) {
            drawSprite(ctx, compileSprite(TRACK_SUPPORT), ground.x, ground.y - h * HZ, {
              anchor: 'bottom-center',
            });
          }
          if (cell.type === 'station') {
            drawSprite(ctx, compileSprite(TRACK_STATION), p.x, p.y + HH + 2, { anchor: 'bottom-center' });
          } else {
            drawSprite(ctx, compileSprite(railDefFor(dirs)), p.x, p.y, { anchor: 'center' });
            if (cell.type === 'lift') drawSprite(ctx, compileSprite(TRACK_LIFT), p.x, p.y - 2, { anchor: 'center' });
            if (cell.type === 'drop') drawSprite(ctx, compileSprite(TRACK_DROP), p.x, p.y - 2, { anchor: 'center' });
            if (cell.type === 'loop') drawSprite(ctx, compileSprite(TRACK_LOOP), p.x, p.y + 4, { anchor: 'bottom-center' });
          }
          ctx.globalAlpha = 1;
        });
      });

      // Train: an engine and two cars strung along the track.
      if ((c.open || c.testing) && valid && n > 1) {
        for (let s = 0; s < 3; s++) {
          const pos = ((c.carPos - s * 0.85) % n + n) % n;
          const pt = trackPointAt(c.layout, pos);
          const ahead = trackPointAt(c.layout, (pos + 0.2) % n);
          const dtx = ahead.x - pt.x;
          const dty = ahead.y - pt.y;
          let dir: string;
          if (Math.abs(dtx) >= Math.abs(dty)) dir = dtx >= 0 ? 'SE' : 'NW';
          else dir = dty >= 0 ? 'SW' : 'NE';
          const recolor = s === 0 ? { R: color.q, q: '#161310' } : color;
          push(pt.x, pt.y, 6, () => {
            const cc = tileCenter(pt.x, pt.y);
            drawSprite(ctx, compileSprite(CAR_SPRITE[dir], { recolor }), cc.x, cc.y - pt.h * HZ + 2, {
              anchor: 'bottom-center',
            });
          });
        }
        if (c.testing) {
          const pt = trackPointAt(c.layout, c.carPos);
          push(pt.x, pt.y, 8, () => {
            const cc = tileCenter(pt.x, pt.y);
            const y = cc.y - pt.h * HZ - 10;
            ctx.strokeStyle = `rgba(255,230,90,${0.5 + 0.4 * Math.sin(performance.now() / 120)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cc.x, y, 12, 0, Math.PI * 2);
            ctx.stroke();
          });
        }
      }
    });

    // Guests.
    for (const p of sim.peeps) {
      let def: SpriteDef = PEEP_WALK;
      if (p.state === 'riding') def = PEEP_RIDE;
      else if (p.state === 'dizzy') def = PEEP_DIZZY;
      else if (p.state === 'vomiting') def = PEEP_VOMIT;
      const moving = p.state === 'walking' || p.state === 'leaving';
      const frame = moving
        ? animFrame(p.animT, 7, def.frames.length)
        : p.state === 'dizzy'
          ? animFrame(p.animT, 6, def.frames.length)
          : 0;
      const recolor = SHIRT_COLORS[p.shirt % SHIRT_COLORS.length];
      const rank = p.state === 'riding' ? 7 : 5;
      push(p.x, p.y, rank, () => {
        const c = tileCenter(p.x, p.y);
        const y = c.y - p.z * HZ + 1;
        drawSprite(ctx, compileSprite(def, { recolor, flipX: p.facing < 0 }), c.x, y, {
          frame,
          anchor: 'bottom-center',
        });
        if (p.hasBalloon && p.state !== 'riding') {
          const bc = BALLOON_COLORS[p.shirt % BALLOON_COLORS.length];
          drawSprite(ctx, compileSprite(BALLOON, { recolor: { R: bc } }), c.x + 4, y - 8, {
            anchor: 'bottom-center',
          });
        }
      });
    }

    // Handymen.
    for (const h of sim.handymen) {
      const def = h.state === 'sweeping' ? HANDYMAN_SWEEP : HANDYMAN_WALK;
      const frame = animFrame(h.animT, h.state === 'sweeping' ? 8 : 6, def.frames.length);
      push(h.x, h.y, 5, () => {
        const c = tileCenter(h.x, h.y);
        drawSprite(ctx, compileSprite(def, { flipX: h.facing < 0 }), c.x, c.y + 1, {
          frame,
          anchor: 'bottom-center',
        });
      });
    }

    // Coin particles floating up off stalls.
    for (const pt of particlesRef.current) {
      push(pt.x, pt.y, 9, () => {
        const c = tileCenter(pt.x, pt.y);
        ctx.globalAlpha = Math.max(0, 1 - pt.t / 0.9);
        drawSprite(ctx, compileSprite(COIN), c.x, c.y - 12 - pt.t * 20, {
          frame: animFrame(pt.t, 8, 2),
          anchor: 'center',
        });
        ctx.globalAlpha = 1;
      });
    }

    items.sort((a, b) => a.d - b.d || a.r - b.r);
    for (const it of items) it.fn();

    // Build cursor.
    const hov = hoverRef.current;
    if (hov && inBounds(sim, hov.x, hov.y) && !rideOpen) {
      drawIsoTileOutline(ctx, hov.x, hov.y, TW, TH, ORIGIN, {
        stroke: 'rgba(255,240,120,0.9)',
        lineWidth: 1.5,
      });
    }
  }, [drawTerrain, rideOpen]);

  // --- simulation --------------------------------------------------------
  useGameLoop(
    useCallback(
      (dt) => {
        const sim = simRef.current;
        const res = stepPark(sim, dt);

        if (res.events.lastSaleAt) {
          particlesRef.current = [
            ...particlesRef.current,
            { x: res.events.lastSaleAt.x, y: res.events.lastSaleAt.y, t: 0 },
          ];
          const now = performance.now();
          if (now - lastDing.current > 1100) {
            lastDing.current = now;
            playSound('ding');
          }
        }
        particlesRef.current = advanceParticles(particlesRef.current, dt);

        if (res.events.unlockedResearch) {
          setResearchToast(res.events.unlockedResearch);
          playSound('chord');
          window.setTimeout(() => setResearchToast(null), 3500);
        }

        if (res.hudReady) {
          if (res.won) {
            setWon(true);
            playSound('cardWin');
          } else if (res.newMilestone !== null) {
            setMilestoneValue(res.newMilestone);
            playSound('cardWin');
          }
          if (res.parkValue > bestSaved.current) {
            bestSaved.current = res.parkValue;
            setBest(res.parkValue);
            setAppPref(GAME_ID, 'bestParkValue', res.parkValue);
          }
          bump();
        }
        draw();
      },
      [draw, bump, setAppPref],
    ),
    mode === 'park',
  );

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
  const unlocked = view.research.unlocked;
  const stallTools: { tool: Tool; label: string; type: StallType; locked?: boolean }[] = [
    { tool: 'stall-food', label: 'Food', type: 'food' },
    { tool: 'stall-drink', label: 'Drink', type: 'drink' },
    { tool: 'stall-balloon', label: 'Balloon', type: 'balloon', locked: !unlocked.balloonStall },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] overflow-hidden">
      {/* Top status bar */}
      <div className="flex items-center gap-3 px-2 py-1 bg-[linear-gradient(to_right,#1a5e32,#2d8a4e)] text-white">
        <span className="font-bold">🎢 Forest Frontiers</span>
        <span>Cash: <b>{fmt(view.cash)}</b></span>
        <span>Value: <b>{fmt(view.parkValue)}</b></span>
        <span className="opacity-80">Goal: {fmt(WIN_TARGET)}</span>
        <span>👥 {view.guests}</span>
        {view.puddles > 0 && <span title="Puddles">🤢 {view.puddles}</span>}
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
            {c.name}{c.open ? ' ●' : c.testing ? ' ◌' : ''}
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
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => {
              hoverRef.current = null;
            }}
            className={cn(
              'w-full h-auto max-w-full border-2 border-[var(--win98-button-dark-shadow)] touch-none',
              !rideOpen && 'cursor-crosshair',
            )}
            style={{ imageRendering: 'pixelated', aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
          />
        </div>

        {/* Right control panel */}
        <div className="w-[190px] shrink-0 border-l border-[var(--win98-button-shadow)] p-2 flex flex-col gap-2 overflow-y-auto">
          {/* Ratings */}
          {activeRatings && (
            <div className="border border-[var(--win98-button-shadow)] p-1.5 bg-white/40">
              <div className="font-bold mb-1">Ratings</div>
              <RatingRow label="Excitement" value={activeRatings.excitement} color="#2e8b57" />
              <RatingRow label="Intensity" value={activeRatings.intensity} color="#d2691e" />
              <RatingRow label="Nausea" value={activeRatings.nausea} color="#9c4dcc" />
            </div>
          )}

          {/* Track pieces */}
          <div>
            <div className="font-bold mb-1">Track Pieces</div>
            <div className="grid grid-cols-1 gap-1">
              {PIECES.map((p) => {
                const locked = p.locked && !unlocked[p.locked];
                return (
                  <Button98
                    key={p.type}
                    active={tool === p.type}
                    disabled={rideOpen || rideTesting || locked}
                    onClick={() => setTool(p.type)}
                    className="min-w-0 justify-start gap-2"
                  >
                    <span className="inline-block w-3 h-3 rounded-full" style={{ background: p.color }} />
                    {p.label}{locked ? ' 🔒' : ''}
                  </Button98>
                );
              })}
            </div>
            <div className="text-[10px] mt-1 text-[var(--win98-button-shadow)]">
              Drag to lay track. Lifts climb, drops descend. Click the last piece to undo.
            </div>
          </div>

          {/* Scenery + staff */}
          <div>
            <div className="font-bold mb-1">Scenery &amp; Staff</div>
            <div className="grid grid-cols-2 gap-1">
              <Button98 active={tool === 'path'} onClick={() => setTool('path')} className="min-w-0 col-span-2">
                Path (${8})
              </Button98>
              {stallTools.map((s) => (
                <Button98
                  key={s.tool}
                  active={tool === s.tool}
                  disabled={s.locked}
                  onClick={() => setTool(s.tool)}
                  className="min-w-0"
                >
                  {s.label}{s.locked ? ' 🔒' : ''}
                </Button98>
              ))}
              <Button98 onClick={doHire} className="min-w-0">
                Handyman
              </Button98>
            </div>
            <div className="text-[10px] mt-1 text-[var(--win98-button-shadow)]">
              Stall ${STALL_COST.food}+. Handyman ${HANDYMAN_HIRE_COST} + wages. On staff: {view.handymen}.
            </div>
          </div>

          {/* Build controls */}
          <div className="flex gap-1">
            <Button98 disabled={rideOpen || rideTesting} onClick={clearTrack} className="min-w-0 flex-1">Clear</Button98>
            {rideOpen ? (
              <Button98 onClick={closeRide} className="min-w-0 flex-1">Close</Button98>
            ) : (
              <>
                <Button98 disabled={rideTesting} onClick={testRide} className="min-w-0 flex-1">Test</Button98>
                <Button98 onClick={openRide} className="min-w-0 flex-1 font-bold">Open!</Button98>
              </>
            )}
          </div>

          {rideTesting && (
            <div className="text-[10px] text-[#1a6e32] font-bold">Test run in progress — one lap…</div>
          )}
          {active && !active.valid && !rideOpen && !rideTesting && (
            <div className="text-[10px] text-[#a00]">{REASON_TEXT[active.reason]}</div>
          )}

          {/* Research */}
          <div className="border border-[var(--win98-button-shadow)] p-1.5 bg-white/40">
            <div className="font-bold mb-1">Research</div>
            {view.research.next ? (
              <>
                <div className="text-[10px]">Developing: {RESEARCH_LABEL[view.research.next]}</div>
                <div className="h-2 mt-1 bg-[var(--win98-button-shadow)] border border-[var(--win98-button-dark-shadow)]">
                  <div className="h-full bg-[#3a7bd5]" style={{ width: `${Math.round(view.research.progress * 100)}%` }} />
                </div>
              </>
            ) : (
              <div className="text-[10px]">All rides researched!</div>
            )}
          </div>

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
              <div className="text-[10px] mt-1">Riders: {active.totalRiders} · Queue: {active.queueLen}</div>
              <div className="text-[10px]">Happiness: {Math.round(active.happiness * 100)}%</div>
              <div className="text-[10px]">Status: {active.open ? 'OPEN' : active.testing ? 'testing' : 'closed'}</div>
            </div>
          )}
        </div>
      </div>

      {/* Research toast */}
      {researchToast && (
        <div className="absolute bottom-2 left-2 z-30 px-3 py-1.5 bg-[#1a5e32] text-white text-[11px] border border-white/40 shadow">
          🔬 New research: <b>{RESEARCH_LABEL[researchToast]}</b> unlocked!
        </div>
      )}

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
