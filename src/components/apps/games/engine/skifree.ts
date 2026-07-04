// Pure, deterministic logic for SkiFree: seeded obstacle fields, collision
// footprints, the yeti chase/catch math, slalom gate scoring, and the
// direction-driven speed model. No DOM, no React here — every export is safe to
// unit test on its own, and the canvas component just drives these.

import { makeRng, chance, weightedPick, clamp, type Rand } from './rng';

export type GameMode = 'freestyle' | 'slalom' | 'tree-slalom';

// Steering resolves — from the mouse or the arrow keys — to one of five poses.
export type Direction = 'left' | 'diagLeft' | 'down' | 'diagRight' | 'right';

export type ObstacleKind =
  | 'treePine'
  | 'treeSnowy'
  | 'treeDead'
  | 'rock'
  | 'stump'
  | 'jump'
  | 'mogul'
  | 'liftTower'
  | 'flagRed'
  | 'flagBlue';

export interface Obstacle {
  kind: ObstacleKind;
  x: number; // world x, 0 is the centre column the skier starts on
  y: number; // world y, grows as you head downhill
  gate?: number; // slalom gate id; a red + blue pair share one id
}

// ---- distance ----
// World units are the same as canvas pixels; a handful of them make a metre so
// the distance meter climbs the way the original's does.
export const UNITS_PER_METER = 4;
export const metersToUnits = (m: number) => m * UNITS_PER_METER;
export const unitsToMeters = (u: number) => u / UNITS_PER_METER;

// ---- speed model ----
export const BASE_SPEED = 220; // world units / second, pointed straight down
export const TUCK_MULT = 1.5; // Down / F fast-mode tuck
export const MOGUL_MULT = 0.55; // moguls scrub speed while you ride over them

export interface Vel {
  vx: number;
  vy: number;
}

// Unit velocity per pose: straight down is all descent, the traverses trade
// nearly all of it for lateral movement (that's how you brake and line up gates).
const DIR_VECTORS: Record<Direction, Vel> = {
  down: { vx: 0, vy: 1 },
  diagRight: { vx: 0.62, vy: 0.78 },
  diagLeft: { vx: -0.62, vy: 0.78 },
  right: { vx: 0.86, vy: 0.16 },
  left: { vx: -0.86, vy: 0.16 },
};

export function steerVelocity(dir: Direction, tuck: boolean, speed: number = BASE_SPEED): Vel {
  const base = DIR_VECTORS[dir];
  const boost = tuck && dir === 'down' ? TUCK_MULT : 1;
  return { vx: base.vx * speed, vy: base.vy * speed * boost };
}

/** Descent rate for a pose (world units/sec) — what the yeti has to out-run. */
export function descentSpeed(dir: Direction, tuck: boolean, speed: number = BASE_SPEED): number {
  return steerVelocity(dir, tuck, speed).vy;
}

/** Map a pointer's horizontal offset from the skier to a steering pose. */
export function directionFromPointer(dxFromPlayer: number): Direction {
  const a = Math.abs(dxFromPlayer);
  if (a < 14) return 'down';
  if (a < 60) return dxFromPlayer < 0 ? 'diagLeft' : 'diagRight';
  return dxFromPlayer < 0 ? 'left' : 'right';
}

// ---- collision ----
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Footprint (collision box) sizes at the base of each solid obstacle, centred
// on its foot point. Kinds absent here (jump, mogul, flags) never crash you.
const FOOTPRINTS: Partial<Record<ObstacleKind, { w: number; h: number }>> = {
  treePine: { w: 10, h: 7 },
  treeSnowy: { w: 10, h: 7 },
  treeDead: { w: 8, h: 7 },
  rock: { w: 14, h: 6 },
  stump: { w: 10, h: 5 },
  liftTower: { w: 8, h: 10 },
};

// Non-solid interactive kinds: riding over the region triggers a launch / slow.
const REGIONS: Partial<Record<ObstacleKind, { w: number; h: number }>> = {
  jump: { w: 22, h: 12 },
  mogul: { w: 20, h: 10 },
};

export const PLAYER_HALF_W = 5;
export const PLAYER_FOOT_H = 4;

export function isSolid(kind: ObstacleKind): boolean {
  return Object.prototype.hasOwnProperty.call(FOOTPRINTS, kind);
}

export function obstacleFootprint(o: Obstacle): Box | null {
  const f = FOOTPRINTS[o.kind];
  if (!f) return null;
  return { x: o.x - f.w / 2, y: o.y - f.h, w: f.w, h: f.h };
}

export function obstacleRegion(o: Obstacle): Box | null {
  const r = REGIONS[o.kind];
  if (!r) return null;
  return { x: o.x - r.w / 2, y: o.y - r.h, w: r.w, h: r.h };
}

export function playerFootprint(x: number, y: number): Box {
  return { x: x - PLAYER_HALF_W, y: y - PLAYER_FOOT_H, w: PLAYER_HALF_W * 2, h: PLAYER_FOOT_H };
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * True when a skier at (x, y) crashes into a solid obstacle. Airborne skiers
 * clear ground clutter — only the tall lift towers can still clip them.
 */
export function collidesWith(x: number, y: number, o: Obstacle, airborne: boolean = false): boolean {
  const fp = obstacleFootprint(o);
  if (!fp) return false;
  if (airborne && o.kind !== 'liftTower') return false;
  return boxesOverlap(playerFootprint(x, y), fp);
}

/** True when a skier at (x, y) is riding over an interactive region (jump/mogul). */
export function overRegion(x: number, y: number, o: Obstacle): boolean {
  const r = obstacleRegion(o);
  if (!r) return false;
  return boxesOverlap(playerFootprint(x, y), r);
}

// ---- slalom gates ----
export interface Gate {
  id: number;
  y: number;
  leftX: number;
  rightX: number;
}

export const SLALOM_FINISH_M = 1500;
export const MISSED_GATE_PENALTY_S = 2; // seconds tacked on for each blown gate

/** Rebuild gates from a flag list by pairing red (left) and blue (right) posts. */
export function gatesFrom(obstacles: Obstacle[]): Gate[] {
  const byId = new Map<number, Partial<Gate>>();
  for (const o of obstacles) {
    if (o.gate === undefined) continue;
    const g = byId.get(o.gate) ?? { id: o.gate, y: o.y };
    if (o.kind === 'flagRed') g.leftX = o.x;
    if (o.kind === 'flagBlue') g.rightX = o.x;
    byId.set(o.gate, g);
  }
  return [...byId.values()]
    .filter((g): g is Gate => g.leftX !== undefined && g.rightX !== undefined)
    .sort((a, b) => a.y - b.y);
}

/** Did the skier's crossing-x fall between the posts? */
export function evaluateGate(gate: Gate, crossX: number): 'passed' | 'missed' {
  return crossX >= gate.leftX && crossX <= gate.rightX ? 'passed' : 'missed';
}

/** Final slalom time = raw run time plus the penalty for every missed gate. */
export function slalomTime(rawSeconds: number, missedGates: number): number {
  return rawSeconds + missedGates * MISSED_GATE_PENALTY_S;
}

/** A rough podium placement from a finishing time (faster = better place). */
export function slalomPlacement(totalSeconds: number): number {
  if (totalSeconds <= 22) return 1;
  if (totalSeconds <= 28) return 2;
  if (totalSeconds <= 36) return 3;
  return 4;
}

// ---- the yeti ----
export const YETI_SPAWN_M = 2000;
export const SECOND_YETI_M = 4000;
export const YETI_BASE_SPEED = 250; // above BASE_SPEED, below a full tuck
export const YETI_HUNGER_STEP = 9; // each meal makes the next chase faster
export const YETI_CATCH_RADIUS = 16; // world units

export function yetiSpeed(hunger: number): number {
  return YETI_BASE_SPEED + hunger * YETI_HUNGER_STEP;
}

export function yetiHasSpawned(distanceM: number, spawnM: number = YETI_SPAWN_M): boolean {
  return distanceM >= spawnM;
}

export function yetiCatches(
  yetiX: number,
  yetiY: number,
  px: number,
  py: number,
  radius: number = YETI_CATCH_RADIUS,
): boolean {
  const dx = yetiX - px;
  const dy = yetiY - py;
  return dx * dx + dy * dy <= radius * radius;
}

// ---- air tricks / style ----
export type Trick = 'flip' | 'daffy' | 'spread' | 'twist';

export const TRICK_POINTS: Record<Trick, number> = {
  flip: 100,
  twist: 50,
  daffy: 40,
  spread: 30,
};

export function trickPoints(t: Trick): number {
  return TRICK_POINTS[t];
}

// A flip needs a full rotation to land clean; bail if you're still upside down.
export const FLIP_ROTATION = Math.PI * 2;

export function flipLandsClean(rotation: number): boolean {
  const off = Math.abs(((rotation % FLIP_ROTATION) + FLIP_ROTATION) % FLIP_ROTATION);
  return off < 0.6 || off > FLIP_ROTATION - 0.6;
}

// ---- obstacle generation ----
export interface GenOpts {
  mode: GameMode;
  startM?: number; // clear run-in before the field begins
  lengthM?: number; // how far down the slope to populate
  laneHalfWidth?: number; // world-x spread each side of centre
}

function sceneryKind(rand: Rand, mode: GameMode): ObstacleKind {
  if (mode === 'tree-slalom') {
    return weightedPick<ObstacleKind>(rand, [
      ['treePine', 5],
      ['treeSnowy', 4],
      ['treeDead', 2],
      ['mogul', 2],
      ['jump', 1],
      ['rock', 1],
    ]);
  }
  return weightedPick<ObstacleKind>(rand, [
    ['treePine', 4],
    ['treeSnowy', 3],
    ['treeDead', 2],
    ['rock', 3],
    ['stump', 2],
    ['mogul', 3],
    ['jump', 2],
  ]);
}

function genGates(
  rand: Rand,
  startM: number,
  endM: number,
  halfW: number,
): Obstacle[] {
  const out: Obstacle[] = [];
  const spacing = 55; // metres between gates
  let id = 0;
  for (let m = startM + 40; m < endM - 30; m += spacing) {
    const centre = (rand() * 2 - 1) * (halfW * 0.5);
    const width = 70 + rand() * 40; // world-x gap between the two posts
    const y = metersToUnits(m);
    out.push({ kind: 'flagRed', x: centre - width / 2, y, gate: id });
    out.push({ kind: 'flagBlue', x: centre + width / 2, y, gate: id });
    id++;
  }
  return out;
}

/**
 * The whole obstacle field for a run, seeded so a given seed + mode always
 * lays out identically. Density thickens the further down you get, and slalom
 * modes thread red/blue gates through the scenery. Sorted top-to-bottom for
 * painter's-order drawing.
 */
export function genObstacles(seed: number, opts: GenOpts): Obstacle[] {
  const rand = makeRng(seed);
  const startM = opts.startM ?? 60;
  const lengthM =
    opts.lengthM ?? (opts.mode === 'freestyle' ? 6000 : SLALOM_FINISH_M + 30);
  const halfW = opts.laneHalfWidth ?? 320;
  const out: Obstacle[] = [];

  if (opts.mode === 'slalom' || opts.mode === 'tree-slalom') {
    out.push(...genGates(rand, startM, lengthM, halfW));
  }

  let m = startM;
  while (m < lengthM) {
    const depth = clamp((m - startM) / Math.max(1, lengthM - startM), 0, 1);
    const gap = clamp(38 - depth * 22, 12, 40); // rows crowd together downhill
    const extra = chance(rand, depth * 0.6) ? 1 : 0;
    for (let i = 0; i < 1 + extra; i++) {
      const kind = sceneryKind(rand, opts.mode);
      const x = (rand() * 2 - 1) * halfW;
      out.push({ kind, x, y: metersToUnits(m + rand() * gap) });
    }
    m += gap;
  }

  return out.sort((a, b) => a.y - b.y);
}

/** A single lift line of tower + implied chairs strung down the left edge near
 *  the top of the slope — decorative, but the towers themselves are solid. */
export function genLiftTowers(startX: number, countTowers: number, spacingM: number): Obstacle[] {
  const out: Obstacle[] = [];
  for (let i = 0; i < countTowers; i++) {
    out.push({ kind: 'liftTower', x: startX, y: metersToUnits(20 + i * spacingM) });
  }
  return out;
}
