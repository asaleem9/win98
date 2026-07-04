'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';
import { Button98 } from '@/components/ui/Button98';
import { cn } from '@/lib/cn';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import { makeRng, randInt } from './engine/rng';
import { useInterval, useGameLoop } from './engine/loop';
import { useWindowActive, PauseVeil } from './engine/focusPause';
import {
  CityState,
  Tool,
  Milestone,
  NewsEdition,
  createCity,
  applyTool,
  tickCity,
  startFire,
  spawnMonster,
  spawnTornado,
  newMilestones,
  generateEdition,
  cityYear,
  cityMonthName,
  isZone,
  idx,
  TOOL_COSTS,
} from './engine/simcity';
import { compileSprite, drawSprite, animFrame, type SpriteDef } from './engine/sprites/sprite';
import { isoToScreen, screenToIso, isoDepth, drawIsoTileOutline } from './engine/sprites/iso';
import {
  GROUND_GRASS,
  RUBBLE,
  POWER_PLANT,
  POWER_LINE,
  POLICE_STATION,
  FIRE_STATION,
  PARK,
  CONSTRUCTION,
  SMOKE,
  FIRE,
  MONSTER,
  TORNADO,
  CAR,
  FIRE_TRUCK,
  UNLIT_WINDOWS,
  zoneSprite,
  roadSprite,
} from './engine/sprites/simcity';

const GRID_W = 24;
const GRID_H = 18;
const TICK_MS = 1500;

const TILE_W = 32;
const TILE_H = 16;
const ORIGIN = { x: 288, y: 54 };
const CANVAS_W = 672;
const CANVAS_H = 404;

// Painter's order for the whole grid, precomputed once (dimensions are fixed).
const DRAW_ORDER = (() => {
  const arr: { x: number; y: number; i: number }[] = [];
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) arr.push({ x, y, i: y * GRID_W + x });
  arr.sort((a, b) => isoDepth(a.x, a.y) - isoDepth(b.x, b.y));
  return arr;
})();

interface ToolDef {
  tool: Tool;
  label: string;
  glyph: string;
  color: string;
}

const TOOLS: ToolDef[] = [
  { tool: 'bulldoze', label: 'Bulldoze', glyph: '✕', color: '#c0392b' },
  { tool: 'road', label: 'Road', glyph: '≡', color: '#555555' },
  { tool: 'power', label: 'Power Line', glyph: '⌁', color: '#f1c40f' },
  { tool: 'residential', label: 'Residential', glyph: '⌂', color: '#2ecc40' },
  { tool: 'commercial', label: 'Commercial', glyph: '$', color: '#0074d9' },
  { tool: 'industrial', label: 'Industrial', glyph: '⚙', color: '#ffcc00' },
  { tool: 'powerplant', label: 'Power Plant', glyph: '⚡', color: '#e67e22' },
  { tool: 'police', label: 'Police', glyph: '⚖', color: '#3b6fd0' },
  { tool: 'firestation', label: 'Fire Dept', glyph: '✚', color: '#d83a2a' },
  { tool: 'park', label: 'Park', glyph: '❖', color: '#2e8b3d' },
];

// Zoning colors for empty (level-0) lots and the hover footprint.
const ZONE_TINT: Partial<Record<Tool, string>> = {
  residential: '#46b45a',
  commercial: '#2a7ad4',
  industrial: '#d8bf3c',
  road: '#888888',
  power: '#f1c40f',
  powerplant: '#e67e22',
  police: '#3b6fd0',
  firestation: '#d83a2a',
  park: '#2e8b3d',
  bulldoze: '#c0392b',
};

const CAR_COLORS = ['#d83a2a', '#3b6fd0', '#e6e6e6', '#2e8b3d', '#e0a030', '#8a4fbf'];

interface Car {
  a: number; // current road tile
  b: number; // road tile being driven toward
  prev: number; // where it came from (avoid immediate U-turns)
  t: number; // 0..1 along a->b
  speed: number; // tiles/sec
  color: string;
}

function RciBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-3 text-[10px] font-bold" style={{ color }}>
        {label}
      </span>
      <div className="flex-1 h-[10px] bg-black/20 border border-[var(--win98-button-shadow)]">
        <div className="h-full" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function tileTop(x: number, y: number) {
  return isoToScreen(x, y, TILE_W, TILE_H, ORIGIN);
}

/** Orthogonal road-connection mask for tile (x,y): N=1, E=2, S=4, W=8. */
function roadMaskAt(city: CityState, x: number, y: number): number {
  const g = city.grid;
  let mask = 0;
  if (y > 0 && g[idx(x, y - 1, GRID_W)].type === 'road') mask |= 1;
  if (x < GRID_W - 1 && g[idx(x + 1, y, GRID_W)].type === 'road') mask |= 2;
  if (y < GRID_H - 1 && g[idx(x, y + 1, GRID_W)].type === 'road') mask |= 4;
  if (x > 0 && g[idx(x - 1, y, GRID_W)].type === 'road') mask |= 8;
  return mask;
}

function roadNeighborTiles(city: CityState, i: number): number[] {
  const x = i % GRID_W;
  const y = Math.floor(i / GRID_W);
  const out: number[] = [];
  const g = city.grid;
  if (y > 0 && g[idx(x, y - 1, GRID_W)].type === 'road') out.push(idx(x, y - 1, GRID_W));
  if (x < GRID_W - 1 && g[idx(x + 1, y, GRID_W)].type === 'road') out.push(idx(x + 1, y, GRID_W));
  if (y < GRID_H - 1 && g[idx(x, y + 1, GRID_W)].type === 'road') out.push(idx(x, y + 1, GRID_W));
  if (x > 0 && g[idx(x - 1, y, GRID_W)].type === 'road') out.push(idx(x - 1, y, GRID_W));
  return out;
}

// Advance the decorative traffic: spawn/despawn to match population, then walk
// each car toward its next road tile. Mutates `cars` in place (kept out of the
// component so it doesn't trip the hook mutation rule).
function updateCars(cars: Car[], state: CityState, rng: () => number, dt: number): Car[] {
  const target = state.population > 0 ? Math.min(36, Math.floor(state.population / 120) + 2) : 0;

  const drivable: number[] = [];
  for (let i = 0; i < state.grid.length; i++) {
    if (state.grid[i].type === 'road' && roadNeighborTiles(state, i).length > 0) drivable.push(i);
  }
  if (!drivable.length) return [];

  while (cars.length < target) {
    const a = drivable[Math.floor(rng() * drivable.length)];
    const nbrs = roadNeighborTiles(state, a);
    const b = nbrs[Math.floor(rng() * nbrs.length)];
    cars.push({ a, b, prev: a, t: 0, speed: 0.6 + rng() * 0.7, color: CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)] });
  }
  while (cars.length > target) cars.pop();

  for (const car of cars) {
    if (state.grid[car.a]?.type !== 'road' || state.grid[car.b]?.type !== 'road') {
      car.a = drivable[Math.floor(rng() * drivable.length)];
      car.prev = car.a;
      const nbrs = roadNeighborTiles(state, car.a);
      car.b = nbrs[Math.floor(rng() * nbrs.length)];
      car.t = 0;
      continue;
    }
    car.t += car.speed * dt;
    while (car.t >= 1) {
      car.t -= 1;
      car.prev = car.a;
      car.a = car.b;
      const nbrs = roadNeighborTiles(state, car.a);
      const fwd = nbrs.filter((n) => n !== car.prev);
      const choices = fwd.length ? fwd : nbrs;
      car.b = choices.length ? choices[Math.floor(rng() * choices.length)] : car.a;
    }
  }
  return cars;
}

// Draw a single occupied tile's content (roads, buildings, disasters, smoke).
function drawTile(
  ctx: CanvasRenderingContext2D,
  state: CityState,
  x: number,
  y: number,
  time: number,
  constructMap: Map<number, number>,
) {
  const i = idx(x, y, GRID_W);
  const t = state.grid[i];
  const top = tileTop(x, y);
  const baseY = top.y + TILE_H;

  switch (t.type) {
    case 'road':
      drawSprite(ctx, compileSprite(roadSprite(roadMaskAt(state, x, y))), top.x, baseY, { anchor: 'bottom-center' });
      break;
    case 'power':
      drawSprite(ctx, compileSprite(POWER_LINE), top.x, baseY - 1, { anchor: 'bottom-center' });
      break;
    case 'powerplant':
      drawSprite(ctx, compileSprite(POWER_PLANT), top.x, baseY + 2, { anchor: 'bottom-center' });
      break;
    case 'police':
      drawSprite(ctx, compileSprite(POLICE_STATION), top.x, baseY + 2, { anchor: 'bottom-center' });
      break;
    case 'firestation':
      drawSprite(ctx, compileSprite(FIRE_STATION), top.x, baseY + 2, { anchor: 'bottom-center' });
      break;
    case 'park':
      drawSprite(ctx, compileSprite(PARK), top.x, baseY, { anchor: 'bottom-center' });
      break;
    case 'rubble':
      drawSprite(ctx, compileSprite(RUBBLE), top.x, baseY, { anchor: 'bottom-center' });
      break;
    case 'residential':
    case 'commercial':
    case 'industrial': {
      const tint = ZONE_TINT[t.type] as string;
      const buildUntil = constructMap.get(i);
      if (t.level === 0) {
        drawIsoTileOutline(ctx, x, y, TILE_W, TILE_H, ORIGIN, { fill: `${tint}55`, stroke: `${tint}aa`, lineWidth: 1 });
      } else if (buildUntil && buildUntil > time) {
        drawIsoTileOutline(ctx, x, y, TILE_W, TILE_H, ORIGIN, { fill: `${tint}33` });
        drawSprite(ctx, compileSprite(CONSTRUCTION), top.x, baseY + 1, { anchor: 'bottom-center' });
      } else {
        const def = zoneSprite(t.type, t.level);
        const sprite = t.powered ? compileSprite(def) : compileSprite(def, { recolor: UNLIT_WINDOWS });
        drawSprite(ctx, sprite, top.x, baseY + 1, { anchor: 'bottom-center' });
        // Industrial smoke when powered and productive.
        if (t.type === 'industrial' && t.powered) {
          const puffTop = top.y + TILE_H - def.frames[0].length;
          const bob = (Math.sin(time * 2 + i) + 1) * 3;
          drawSprite(ctx, compileSprite(SMOKE), top.x - 5, puffTop - 4 - bob, {
            anchor: 'bottom-center',
            frame: animFrame(time + i * 0.13, 4, 2),
          });
        }
      }
      break;
    }
    default:
      break;
  }

  if (t.fire > 0) {
    drawSprite(ctx, compileSprite(FIRE), top.x, top.y + TILE_H + 2, {
      anchor: 'bottom-center',
      frame: animFrame(time, 8, 2),
    });
  }
}

function drawCar(ctx: CanvasRenderingContext2D, fx: number, fy: number, car: Car) {
  const top = isoToScreen(fx, fy, TILE_W, TILE_H, ORIGIN);
  drawSprite(ctx, compileSprite(CAR, { recolor: { Q: car.color } }), top.x, top.y + TILE_H / 2 + 3, {
    anchor: 'bottom-center',
  });
}

function drawUnit(ctx: CanvasRenderingContext2D, def: SpriteDef, fx: number, fy: number, frame: number) {
  const top = isoToScreen(fx, fy, TILE_W, TILE_H, ORIGIN);
  drawSprite(ctx, compileSprite(def), top.x, top.y + TILE_H / 2 + 4, { anchor: 'bottom-center', frame });
}

export default function SimCity({ windowId }: AppComponentProps) {
  const { getAppPref, setAppPref } = useSettings();
  const windowActive = useWindowActive(windowId);

  const [started, setStarted] = useState(false);
  const [showCdError, setShowCdError] = useState(false);
  const [city, setCity] = useState<CityState>(() => createCity(GRID_W, GRID_H));
  const [tool, setTool] = useState<Tool>('road');
  const [running, setRunning] = useState(true);
  const [news, setNews] = useState<{ edition: NewsEdition; milestone: Milestone | null } | null>(null);
  const [showBudget, setShowBudget] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const [bestPop, setBestPop] = useState<number>(() => getAppPref<number>('simcity', 'bestPopulation', 0));

  const [rng] = useState<() => number>(() => makeRng(Math.floor(Math.random() * 0x7fffffff)));

  // ---- Render-loop mutable state (refs so the loop reads fresh without restart)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const terrainRef = useRef<HTMLCanvasElement | null>(null);
  const cityRef = useRef(city);
  const toolRef = useRef(tool);
  const runningRef = useRef(running);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const paintingRef = useRef(false);
  const timeRef = useRef(0);
  const carsRef = useRef<Car[]>([]);
  const prevLevelsRef = useRef<number[]>([]);
  const constructRef = useRef<Map<number, number>>(new Map());
  const monsterPosRef = useRef<{ x: number; y: number } | null>(null);
  const tornadoPosRef = useRef<{ x: number; y: number } | null>(null);
  const truckRef = useRef<{ path: number[]; progress: number } | null>(null);
  const bestPopRef = useRef(bestPop);

  // Mirror the latest state into refs the render loop / tick read without restarting.
  useEffect(() => {
    cityRef.current = city;
    toolRef.current = tool;
    runningRef.current = running;
    bestPopRef.current = bestPop;
  });

  const notify = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash((cur) => (cur === msg ? null : cur)), 1400);
  }, []);

  const openEdition = useCallback((state: CityState, milestone: Milestone | null) => {
    setNews({ edition: generateEdition(state, milestone), milestone });
    playSound(milestone ? 'chord' : 'exclamation');
  }, []);

  // Detect zone growth so the renderer can flash a construction scaffold, and
  // keep a level snapshot for next time.
  useEffect(() => {
    const prev = prevLevelsRef.current;
    city.grid.forEach((t, i) => {
      const lvl = isZone(t.type) ? t.level : 0;
      if (prev[i] !== undefined && lvl > prev[i]) constructRef.current.set(i, timeRef.current + 0.7);
      prev[i] = lvl;
    });
  }, [city]);

  // One simulated month. Side effects (fanfare, best-pop persistence) run after
  // the reducer, never nested inside it, so they can't setState during render.
  useInterval(
    () => {
      const prev = cityRef.current;
      const next = tickCity(prev, rng);
      setCity(next);

      const crossed = newMilestones(prev.population, next.population);
      if (crossed.length) openEdition(next, crossed[crossed.length - 1]);

      if (next.population > bestPopRef.current) {
        bestPopRef.current = next.population;
        setBestPop(next.population);
        setAppPref('simcity', 'bestPopulation', next.population);
      }
    },
    TICK_MS,
    started && running && !news && windowActive,
  );

  // ---- Placement ----
  const place = useCallback(
    (x: number, y: number) => {
      setCity((prev) => {
        const res = applyTool(prev.grid, prev.width, prev.height, x, y, toolRef.current);
        if (!res.placed) return prev;
        if (prev.cash < res.cost) {
          playSound('error');
          notify('Insufficient funds!');
          return prev;
        }
        playSound('ding');
        return { ...prev, grid: res.grid, cash: prev.cash - res.cost };
      });
    },
    [notify],
  );

  const tileAt = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const sx = (clientX - rect.left) * (CANVAS_W / rect.width);
    const sy = (clientY - rect.top) * (CANVAS_H / rect.height);
    const { tx, ty } = screenToIso(sx, sy, TILE_W, TILE_H, ORIGIN);
    const x = Math.floor(tx);
    const y = Math.floor(ty);
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return null;
    return { x, y };
  }, []);

  const handleDown = useCallback(
    (e: React.PointerEvent) => {
      const tile = tileAt(e.clientX, e.clientY);
      if (!tile) return;
      paintingRef.current = true;
      hoverRef.current = tile;
      place(tile.x, tile.y);
    },
    [tileAt, place],
  );
  const handleMove = useCallback(
    (e: React.PointerEvent) => {
      const tile = tileAt(e.clientX, e.clientY);
      hoverRef.current = tile;
      if (tile && paintingRef.current) place(tile.x, tile.y);
    },
    [tileAt, place],
  );
  const stopPaint = useCallback(() => {
    paintingRef.current = false;
  }, []);
  const handleLeave = useCallback(() => {
    paintingRef.current = false;
    hoverRef.current = null;
  }, []);

  // ---- Disasters ----
  const triggerFire = useCallback(() => {
    setCity((prev) => {
      const next = startFire(prev, rng);
      if (next === prev) {
        notify('Nothing flammable to burn!');
        return prev;
      }
      playSound('mineExplosion');
      notify('Fire reported downtown!');
      openEdition(next, null);
      return next;
    });
  }, [notify, rng, openEdition]);

  const triggerMonster = useCallback(() => {
    setCity((prev) => {
      playSound('mineExplosion');
      notify('A monster rampages through the city!');
      const next = spawnMonster(prev, rng, randInt(rng, 2, GRID_W - 3), randInt(rng, 2, GRID_H - 3));
      openEdition(next, null);
      return next;
    });
  }, [notify, rng, openEdition]);

  const triggerTornado = useCallback(() => {
    setCity((prev) => {
      playSound('mineExplosion');
      notify('A tornado touches down!');
      const next = spawnTornado(prev, rng);
      openEdition(next, null);
      return next;
    });
  }, [notify, rng, openEdition]);

  const newCity = useCallback(() => {
    carsRef.current = [];
    constructRef.current.clear();
    prevLevelsRef.current = [];
    monsterPosRef.current = null;
    tornadoPosRef.current = null;
    truckRef.current = null;
    setCity(createCity(GRID_W, GRID_H));
    setRunning(true);
    setNews(null);
    setStarted(true);
  }, []);

  const setTax = useCallback((rate: number) => setCity((prev) => ({ ...prev, taxRate: rate })), []);
  const setPoliceFunding = useCallback((v: number) => setCity((prev) => ({ ...prev, policeFunding: v })), []);
  const setFireFunding = useCallback((v: number) => setCity((prev) => ({ ...prev, fireFunding: v })), []);

  // ---- Fit the fixed-resolution canvas into its container ----
  useEffect(() => {
    if (!started) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || typeof ResizeObserver === 'undefined') return;
    const fit = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw === 0 || ch === 0) return;
      const scale = Math.min(cw / CANVAS_W, ch / CANVAS_H);
      canvas.style.width = `${Math.max(1, Math.floor(CANVAS_W * scale))}px`;
      canvas.style.height = `${Math.max(1, Math.floor(CANVAS_H * scale))}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [started]);

  // ---- Draw one frame ----
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = cityRef.current;
    const time = timeRef.current;

    // Static terrain (grass) — built once, reused every frame.
    if (!terrainRef.current) {
      const t = document.createElement('canvas');
      t.width = CANVAS_W;
      t.height = CANVAS_H;
      const tctx = t.getContext('2d');
      if (tctx) {
        const grass = compileSprite(GROUND_GRASS);
        for (const { x, y } of DRAW_ORDER) {
          const top = tileTop(x, y);
          drawSprite(tctx, grass, top.x, top.y + TILE_H, { anchor: 'bottom-center' });
        }
      }
      terrainRef.current = t;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#20331f';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    if (terrainRef.current) ctx.drawImage(terrainRef.current, 0, 0);

    // Smooth entity positions toward the sim's discrete tiles (reassign, not
    // mutate, so the ref objects stay immutable to the compiler).
    const ease = Math.min(1, 8 * (1 / 60));
    if (state.monster) {
      const p = monsterPosRef.current ?? { x: state.monster.x, y: state.monster.y };
      monsterPosRef.current = { x: p.x + (state.monster.x - p.x) * ease, y: p.y + (state.monster.y - p.y) * ease };
    } else monsterPosRef.current = null;
    if (state.tornado) {
      const p = tornadoPosRef.current ?? { x: state.tornado.x, y: state.tornado.y };
      tornadoPosRef.current = { x: p.x + (state.tornado.x - p.x) * ease, y: p.y + (state.tornado.y - p.y) * ease };
    } else tornadoPosRef.current = null;

    // Build the depth-sorted draw list: tiles + dynamic units.
    type Item = { depth: number; sub: number; kind: string; x: number; y: number; data?: unknown };
    const items: Item[] = [];
    for (const { x, y, i } of DRAW_ORDER) {
      const t = state.grid[i];
      if (t.type !== 'empty' || t.fire > 0) items.push({ depth: isoDepth(x, y), sub: 0, kind: 'tile', x, y });
    }
    for (const car of carsRef.current) {
      const ax = car.a % GRID_W;
      const ay = Math.floor(car.a / GRID_W);
      const bx = car.b % GRID_W;
      const by = Math.floor(car.b / GRID_W);
      const fx = ax + (bx - ax) * car.t;
      const fy = ay + (by - ay) * car.t;
      items.push({ depth: isoDepth(fx, fy), sub: 1, kind: 'car', x: fx, y: fy, data: car });
    }
    if (truckRef.current) {
      const { path, progress } = truckRef.current;
      const f = progress * (path.length - 1);
      const i0 = Math.min(path.length - 1, Math.floor(f));
      const i1 = Math.min(path.length - 1, i0 + 1);
      const frac = f - i0;
      const ax = path[i0] % GRID_W;
      const ay = Math.floor(path[i0] / GRID_W);
      const bx = path[i1] % GRID_W;
      const by = Math.floor(path[i1] / GRID_W);
      const fx = ax + (bx - ax) * frac;
      const fy = ay + (by - ay) * frac;
      items.push({ depth: isoDepth(fx, fy) + 5, sub: 2, kind: 'truck', x: fx, y: fy });
    }
    if (monsterPosRef.current) {
      const p = monsterPosRef.current;
      items.push({ depth: isoDepth(p.x, p.y) + 9, sub: 3, kind: 'monster', x: p.x, y: p.y });
    }
    if (tornadoPosRef.current) {
      const p = tornadoPosRef.current;
      items.push({ depth: isoDepth(p.x, p.y) + 9, sub: 3, kind: 'tornado', x: p.x, y: p.y });
    }
    items.sort((a, b) => a.depth - b.depth || a.sub - b.sub);

    for (const item of items) {
      if (item.kind === 'tile') drawTile(ctx, state, item.x, item.y, time, constructRef.current);
      else if (item.kind === 'car') drawCar(ctx, item.x, item.y, item.data as Car);
      else if (item.kind === 'truck') drawUnit(ctx, FIRE_TRUCK, item.x, item.y, 0);
      else if (item.kind === 'monster') drawUnit(ctx, MONSTER, item.x, item.y, animFrame(time, 4, 2));
      else if (item.kind === 'tornado') drawUnit(ctx, TORNADO, item.x, item.y, animFrame(time, 6, 2));
    }

    // Hover highlight + tool footprint.
    const hover = hoverRef.current;
    if (hover) {
      const color = ZONE_TINT[toolRef.current] ?? '#ffffff';
      drawIsoTileOutline(ctx, hover.x, hover.y, TILE_W, TILE_H, ORIGIN, {
        fill: `${color}44`,
        stroke: color,
        lineWidth: 1.5,
      });
    }
  }, []);

  // ---- Render + animation loop ----
  useGameLoop(
    (dt) => {
      const clamped = Math.min(dt, 0.05);
      if (runningRef.current && !news) {
        timeRef.current += clamped;
        carsRef.current = updateCars(carsRef.current, cityRef.current, rng, clamped);
        // Advance the fire truck smoothly along its dispatched route.
        const truckState = cityRef.current.truck;
        if (truckState) {
          if (!truckRef.current || truckRef.current.path !== truckState.path) {
            truckRef.current = { path: truckState.path, progress: 0 };
          }
          const len = Math.max(1, truckRef.current.path.length - 1);
          truckRef.current.progress = Math.min(1, truckRef.current.progress + (dt * 3) / len);
        } else {
          truckRef.current = null;
        }
        // Expire finished construction scaffolds.
        for (const [k, until] of constructRef.current) if (until <= timeRef.current) constructRef.current.delete(k);
      }
      drawScene();
    },
    started && windowActive,
  );

  // ---- Title screen (preserved SimCity 2000 skyline) ----
  if (!started) {
    return (
      <div className="flex flex-col h-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#000033] via-[#000066] to-[#000044]" />
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute h-px bg-[#4488cc] left-0 right-0" style={{ top: `${i * 5 + 5}%` }} />
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[45%]">
          <svg viewBox="0 0 500 150" className="w-full h-full" preserveAspectRatio="xMidYMax meet">
            <rect x="30" y="50" width="25" height="100" fill="#1a3366" />
            <rect x="32" y="55" width="5" height="7" fill="#ffff66" opacity="0.7" />
            <rect x="42" y="55" width="5" height="7" fill="#ffff66" opacity="0.5" />
            <rect x="32" y="70" width="5" height="7" fill="#ffff66" opacity="0.6" />
            <rect x="70" y="20" width="30" height="130" fill="#1a3366" />
            <rect x="73" y="25" width="5" height="7" fill="#ffff66" opacity="0.8" />
            <rect x="88" y="25" width="5" height="7" fill="#ffff66" opacity="0.5" />
            <rect x="73" y="40" width="5" height="7" fill="#ffff66" opacity="0.4" />
            <rect x="88" y="55" width="5" height="7" fill="#ffff66" opacity="0.7" />
            <rect x="120" y="60" width="20" height="90" fill="#1a3366" />
            <rect x="123" y="65" width="4" height="6" fill="#ffff66" opacity="0.6" />
            <rect x="160" y="30" width="35" height="120" fill="#1a3366" />
            <rect x="163" y="35" width="5" height="7" fill="#ffff66" opacity="0.7" />
            <rect x="180" y="35" width="5" height="7" fill="#ffff66" opacity="0.5" />
            <rect x="163" y="50" width="5" height="7" fill="#ffff66" opacity="0.8" />
            <rect x="180" y="65" width="5" height="7" fill="#ffff66" opacity="0.4" />
            <rect x="210" y="70" width="18" height="80" fill="#1a3366" />
            <rect x="240" y="40" width="28" height="110" fill="#1a3366" />
            <rect x="243" y="45" width="5" height="7" fill="#ffff66" opacity="0.6" />
            <rect x="258" y="60" width="5" height="7" fill="#ffff66" opacity="0.7" />
            <rect x="285" y="15" width="22" height="135" fill="#1a3366" />
            <rect x="288" y="20" width="4" height="6" fill="#ffff66" opacity="0.8" />
            <rect x="288" y="35" width="4" height="6" fill="#ffff66" opacity="0.5" />
            <rect x="320" y="55" width="30" height="95" fill="#1a3366" />
            <rect x="323" y="60" width="5" height="7" fill="#ffff66" opacity="0.7" />
            <rect x="340" y="60" width="5" height="7" fill="#ffff66" opacity="0.4" />
            <rect x="370" y="75" width="15" height="75" fill="#1a3366" />
            <rect x="400" y="45" width="25" height="105" fill="#1a3366" />
            <rect x="403" y="50" width="5" height="7" fill="#ffff66" opacity="0.6" />
            <rect x="440" y="65" width="20" height="85" fill="#1a3366" />
            <rect x="470" y="80" width="30" height="70" fill="#1a3366" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-3 p-4">
          <h1
            className="text-[32px] font-bold tracking-wider"
            style={{ color: '#66aaff', textShadow: '0 0 20px rgba(100,170,255,0.5), 2px 2px 0 #001133', fontFamily: 'serif' }}
          >
            SimCity 2000
          </h1>
          <div className="text-[12px] text-[#88aacc] mb-4" style={{ fontFamily: 'serif' }}>
            The Ultimate City Simulator
          </div>

          <div className="flex flex-col gap-2 w-[180px]">
            {(['New City', 'Load City', 'Edit Scenario', 'Quit'] as const).map((label) => (
              <button
                key={label}
                onClick={() => (label === 'New City' ? newCity() : setShowCdError(true))}
                className="py-2 px-4 text-[12px] cursor-pointer border text-center"
                style={{ background: 'linear-gradient(to bottom, #2255aa, #113377)', borderColor: '#4488cc', color: '#aaccff', fontFamily: 'serif' }}
              >
                {label}
              </button>
            ))}
          </div>

          {bestPop > 0 && (
            <div className="mt-2 text-[11px] text-[#88bbff]" style={{ fontFamily: 'serif' }}>
              Best city on record: {bestPop.toLocaleString()} citizens
            </div>
          )}
          <div className="mt-2 text-[10px] text-[#446688]">&copy; 1993 Maxis Software</div>
        </div>

        {showCdError && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/30">
            <Dialog98
              title="SimCity 2000"
              icon="error"
              message="Please insert the SimCity 2000 CD-ROM to continue. (Try New City instead!)"
              buttons={[{ label: 'OK', onClick: () => setShowCdError(false), default: true }]}
            />
          </div>
        )}
      </div>
    );
  }

  // ---- Builder ----
  const year = cityYear(city.month);
  const month = cityMonthName(city.month);
  const net = city.income - city.expenses;

  return (
    <div className="relative flex h-full text-[11px] select-none bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)]">
      <PauseVeil windowId={windowId} show={!windowActive} />
      {/* Left toolbar */}
      <div className="w-[110px] flex-shrink-0 flex flex-col gap-1 p-1 border-r-2 border-[var(--win98-button-shadow)] overflow-y-auto">
        <div className="font-bold text-center">Tools</div>
        {TOOLS.map((t) => (
          <Button98
            key={t.tool}
            active={tool === t.tool}
            onClick={() => setTool(t.tool)}
            className="!min-w-0 !min-h-0 py-[2px] justify-start gap-1"
            title={`${t.label} — $${TOOL_COSTS[t.tool]}`}
          >
            <span className="w-4 text-center" style={{ color: t.color }}>
              {t.glyph}
            </span>
            <span className="flex-1 text-left truncate text-[10px]">{t.label}</span>
          </Button98>
        ))}
        <div className="mt-1 text-[9px] text-center text-[var(--win98-button-shadow)]">${TOOL_COSTS[tool]} / tile</div>

        <div className="mt-1 font-bold text-center">Disasters</div>
        <Button98 className="!min-w-0 !min-h-0 py-[2px]" onClick={triggerFire}>
          🔥 Fire
        </Button98>
        <Button98 className="!min-w-0 !min-h-0 py-[2px]" onClick={triggerMonster}>
          🦖 Monster
        </Button98>
        <Button98 className="!min-w-0 !min-h-0 py-[2px]" onClick={triggerTornado}>
          🌪 Tornado
        </Button98>

        <div className="mt-1 font-bold text-center">Sim</div>
        <Button98 className="!min-w-0 !min-h-0 py-[2px]" onClick={() => setRunning((r) => !r)}>
          {running ? '⏸ Pause' : '▶ Play'}
        </Button98>
        <Button98 className="!min-w-0 !min-h-0 py-[2px]" onClick={() => setShowBudget(true)}>
          ▤ Budget
        </Button98>
        <Button98 className="!min-w-0 !min-h-0 py-[2px]" onClick={() => setNews({ edition: generateEdition(city, null), milestone: null })}>
          ▦ News
        </Button98>
        <Button98 className="!min-w-0 !min-h-0 py-[2px]" onClick={newCity}>
          ✱ New City
        </Button98>
      </div>

      {/* Center: iso canvas */}
      <div className="flex-1 min-w-0 flex flex-col p-1 overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 min-h-0 flex items-center justify-center border-2 border-[var(--win98-button-shadow)] bg-[#20331f] overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="cursor-crosshair touch-none"
            style={{ imageRendering: 'pixelated' }}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={stopPaint}
            onPointerLeave={handleLeave}
          />
        </div>
      </div>

      {/* Right: dashboard */}
      <div className="w-[132px] flex-shrink-0 flex flex-col gap-1 p-1 border-l-2 border-[var(--win98-button-highlight)] overflow-y-auto">
        <div
          className="text-center font-bold py-[2px] text-white"
          style={{ background: 'linear-gradient(to right, var(--win98-titlebar-active-start), var(--win98-titlebar-active-end))' }}
        >
          {month} {year}
        </div>

        <div className="border border-[var(--win98-button-shadow)] p-1 bg-white text-black">
          <div className="flex justify-between">
            <span>Population</span>
            <span className="font-bold">{city.population.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Jobs</span>
            <span>{city.jobs.toLocaleString()}</span>
          </div>
        </div>

        <div className="border border-[var(--win98-button-shadow)] p-1 bg-white text-black">
          <div className="flex justify-between">
            <span>Funds</span>
            <span className={cn('font-bold', city.cash < 0 && 'text-red-600')}>${city.cash.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-green-700">
            <span>Income</span>
            <span>+${city.income}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Upkeep</span>
            <span>-${city.expenses}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--win98-button-shadow)] mt-[1px] pt-[1px]">
            <span>Net</span>
            <span className={cn(net < 0 ? 'text-red-600' : 'text-green-700')}>
              {net < 0 ? '-' : '+'}${Math.abs(net)}
            </span>
          </div>
        </div>

        <div className="border border-[var(--win98-button-shadow)] p-1 bg-[var(--win98-button-face)] flex flex-col gap-[3px]">
          <div className="font-bold">RCI Demand</div>
          <RciBar label="R" value={city.demand.r} color="#2ecc40" />
          <RciBar label="C" value={city.demand.c} color="#0074d9" />
          <RciBar label="I" value={city.demand.i} color="#ffcc00" />
        </div>

        <button
          onClick={() => setShowBudget(true)}
          className="border border-[var(--win98-button-shadow)] p-1 bg-[var(--win98-button-face)] text-left cursor-pointer hover:bg-[var(--win98-button-highlight)]"
        >
          <div className="font-bold">Budget</div>
          <div className="flex justify-between text-[10px]">
            <span>Tax</span>
            <span>{city.taxRate}%</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span>Police</span>
            <span>{city.policeFunding}%</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span>Fire</span>
            <span>{city.fireFunding}%</span>
          </div>
        </button>

        <div className="border border-[var(--win98-button-shadow)] p-1 bg-white text-black text-[10px]">
          Best ever: <span className="font-bold">{bestPop.toLocaleString()}</span>
        </div>
      </div>

      {flash && (
        <div className="absolute left-1/2 top-2 -translate-x-1/2 z-30 px-2 py-1 bg-black/80 text-white text-[11px] rounded-sm pointer-events-none">
          {flash}
        </div>
      )}

      {showBudget && (
        <BudgetWindow
          city={city}
          onTax={setTax}
          onPolice={setPoliceFunding}
          onFire={setFireFunding}
          onClose={() => setShowBudget(false)}
        />
      )}

      {news && (
        <Newspaper edition={news.edition} milestone={news.milestone} onClose={() => setNews(null)} />
      )}
    </div>
  );
}

// ---- Budget modal ----
function BudgetWindow({
  city,
  onTax,
  onPolice,
  onFire,
  onClose,
}: {
  city: CityState;
  onTax: (v: number) => void;
  onPolice: (v: number) => void;
  onFire: (v: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/30">
      <div className="w-[260px] bg-[var(--win98-button-face)] border-2 border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-shadow)] border-r-[var(--win98-button-shadow)] shadow-lg">
        <div
          className="flex items-center justify-between px-1 py-[2px] text-white font-bold"
          style={{ background: 'linear-gradient(to right, var(--win98-titlebar-active-start), var(--win98-titlebar-active-end))' }}
        >
          <span>City Budget</span>
          <button onClick={onClose} className="px-1 leading-none bg-[var(--win98-button-face)] text-black border border-[var(--win98-button-shadow)]">
            ✕
          </button>
        </div>
        <div className="p-2 flex flex-col gap-2 text-[11px]">
          <BudgetSlider label="Tax rate" value={city.taxRate} min={0} max={20} onChange={onTax} suffix="%" hint="Higher taxes fill the treasury but sour the mood." />
          <BudgetSlider label="Police funding" value={city.policeFunding} min={0} max={100} onChange={onPolice} suffix="%" hint="Funds coverage that keeps crime from choking commerce." />
          <BudgetSlider label="Fire funding" value={city.fireFunding} min={0} max={100} onChange={onFire} suffix="%" hint="Speeds trucks and helps crews snuff fires early." />
          <div className="border-t border-[var(--win98-button-shadow)] pt-1 flex justify-between">
            <span>Monthly income</span>
            <span className="text-green-700 font-bold">+${city.income}</span>
          </div>
          <div className="flex justify-between">
            <span>Monthly upkeep</span>
            <span className="text-red-600 font-bold">-${city.expenses}</span>
          </div>
          <div className="flex justify-end">
            <Button98 onClick={onClose}>Close</Button98>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetSlider({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix: string;
  hint: string;
}) {
  return (
    <div>
      <div className="flex justify-between font-bold">
        <span>{label}</span>
        <span>
          {value}
          {suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      <div className="text-[9px] text-[var(--win98-button-shadow)] leading-tight">{hint}</div>
    </div>
  );
}

// ---- Newspaper modal ----
function Newspaper({
  edition,
  milestone,
  onClose,
}: {
  edition: NewsEdition;
  milestone: Milestone | null;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/40 p-2">
      <div
        className="w-[300px] max-h-full overflow-y-auto border-2 border-black shadow-xl p-3"
        style={{ background: '#efe9d8', color: '#1a1a1a', fontFamily: 'Georgia, serif' }}
      >
        <div className="text-center border-b-4 border-double border-black pb-1 mb-1">
          <div className="text-[22px] font-bold tracking-tight leading-none" style={{ fontFamily: 'Georgia, serif' }}>
            {edition.masthead}
          </div>
          <div className="flex justify-between text-[9px] uppercase tracking-widest mt-[2px]">
            <span>Late Edition</span>
            <span>{edition.date}</span>
            <span>Price 5¢</span>
          </div>
        </div>

        {milestone && (
          <div className="text-center text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: '#8a1f1f' }}>
            ★ {milestone.title} Milestone ★
          </div>
        )}

        <div className="text-[17px] font-bold text-center leading-tight mb-2" style={{ fontFamily: 'Georgia, serif' }}>
          {edition.headline}
        </div>

        <div className="columns-2 gap-2 text-[10px] leading-snug text-justify" style={{ columnRule: '1px solid #999' }}>
          {edition.stories.map((s, i) => (
            <p key={i} className="mb-2 break-inside-avoid">
              <span className="font-bold">{i === 0 ? 'CITY DESK — ' : ''}</span>
              {s}
            </p>
          ))}
        </div>

        <div className="mt-2 flex justify-center border-t border-black pt-2">
          <Button98 onClick={onClose}>Read On</Button98>
        </div>
      </div>
    </div>
  );
}
