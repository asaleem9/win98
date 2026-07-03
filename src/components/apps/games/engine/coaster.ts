// Pure ride math for RollerCoaster Tycoon — no React, no DOM.
// Everything here is deterministic and unit-tested in ../__tests__/coaster.test.ts.

import { clamp, makeRng, randInt, weightedPick, type Rand } from './rng';

export type PieceType = 'station' | 'straight' | 'turn' | 'lift' | 'drop' | 'loop';

/** Highest elevation level a piece can sit at; ground is 0. */
export const MAX_HEIGHT = 3;

/** A single placed track piece on the builder grid. */
export interface TrackCell {
  x: number;
  y: number;
  type: PieceType;
  /** Elevation level 0–MAX_HEIGHT. Absent means ground (0). */
  height?: number;
}

/** Height of a cell, treating an absent value as ground level. */
export function cellHeight(cell: TrackCell): number {
  return cell.height ?? 0;
}

/** Ordered layout: index 0 is the station, subsequent cells follow the path. */
export type Layout = TrackCell[];

export interface PieceCounts {
  length: number;
  stations: number;
  straights: number;
  turns: number;
  lifts: number;
  drops: number;
  loops: number;
}

export interface Ratings {
  excitement: number;
  intensity: number;
  nausea: number;
}

export interface Validation {
  valid: boolean;
  /** 'ok' when valid, otherwise a machine-readable reason. */
  reason:
    | 'ok'
    | 'empty'
    | 'no-station'
    | 'too-short'
    | 'multiple-stations'
    | 'overlap'
    | 'disconnected'
    | 'not-a-loop'
    | 'not-level'
    | 'too-steep';
}

const MIN_LOOP_LENGTH = 4;

/** Two cells are neighbours if orthogonally adjacent (Manhattan distance 1). */
export function isAdjacent(a: TrackCell, b: TrackCell): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

/** Tally the piece types in a layout. */
export function countPieces(layout: Layout): PieceCounts {
  const counts: PieceCounts = {
    length: layout.length,
    stations: 0,
    straights: 0,
    turns: 0,
    lifts: 0,
    drops: 0,
    loops: 0,
  };
  for (const cell of layout) {
    switch (cell.type) {
      case 'station':
        counts.stations++;
        break;
      case 'straight':
        counts.straights++;
        break;
      case 'turn':
        counts.turns++;
        break;
      case 'lift':
        counts.lifts++;
        break;
      case 'drop':
        counts.drops++;
        break;
      case 'loop':
        counts.loops++;
        break;
    }
  }
  return counts;
}

/**
 * A layout is a valid, openable ride when it starts at the (single) station,
 * every consecutive piece is adjacent, no cell is reused, and the final piece
 * connects back to the station — i.e. the track forms a closed loop.
 */
export function validateTrack(layout: Layout): Validation {
  if (layout.length === 0) return { valid: false, reason: 'empty' };
  if (layout[0].type !== 'station') return { valid: false, reason: 'no-station' };

  const counts = countPieces(layout);
  if (counts.stations !== 1) return { valid: false, reason: 'multiple-stations' };
  if (layout.length < MIN_LOOP_LENGTH) return { valid: false, reason: 'too-short' };

  const seen = new Set<string>();
  for (const cell of layout) {
    const key = `${cell.x},${cell.y}`;
    if (seen.has(key)) return { valid: false, reason: 'overlap' };
    seen.add(key);
  }

  for (let i = 1; i < layout.length; i++) {
    if (!isAdjacent(layout[i - 1], layout[i])) {
      return { valid: false, reason: 'disconnected' };
    }
  }

  // Closes the loop: last piece must sit next to the station.
  if (!isAdjacent(layout[layout.length - 1], layout[0])) {
    return { valid: false, reason: 'not-a-loop' };
  }

  // Elevation: every piece must sit within the buildable height band, the
  // circuit has to come back down to the station's level to close, and total
  // climbing is capped by how many lift hills push the train uphill.
  for (const cell of layout) {
    const h = cellHeight(cell);
    if (h < 0 || h > MAX_HEIGHT) return { valid: false, reason: 'too-steep' };
  }
  if (cellHeight(layout[layout.length - 1]) !== cellHeight(layout[0])) {
    return { valid: false, reason: 'not-level' };
  }
  let totalClimb = 0;
  for (let i = 1; i < layout.length; i++) {
    const d = cellHeight(layout[i]) - cellHeight(layout[i - 1]);
    if (d > 0) totalClimb += d;
  }
  if (totalClimb > counts.lifts * 2) return { valid: false, reason: 'too-steep' };

  return { valid: true, reason: 'ok' };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Excitement / Intensity / Nausea derived from what the layout contains.
 * Scaled to a roughly 0–10 range like the real game's ratings.
 */
export function computeRatings(layout: Layout): Ratings {
  const c = countPieces(layout);
  const len = c.length;

  // Height changes add thrill on top of the piece mix: the biggest single
  // descent is the money shot (excitement + a lurch of nausea), and every foot
  // of drop adds a little more. A flat track leaves these at zero, so ratings
  // for a layout with no elevation are unchanged.
  let maxDrop = 0;
  let totalDrop = 0;
  for (let i = 1; i < layout.length; i++) {
    const d = cellHeight(layout[i - 1]) - cellHeight(layout[i]);
    if (d > 0) {
      totalDrop += d;
      if (d > maxDrop) maxDrop = d;
    }
  }

  const excitement = clamp(
    1.0 + c.drops * 0.8 + c.loops * 1.5 + c.turns * 0.3 + c.lifts * 0.5 + len * 0.05
      + maxDrop * 0.7 + totalDrop * 0.2,
    0,
    10,
  );
  const intensity = clamp(
    0.5 + c.drops * 0.6 + c.loops * 1.2 + c.turns * 0.2 + len * 0.03 + maxDrop * 0.35,
    0,
    10,
  );
  const nausea = clamp(
    0.2 + c.loops * 1.0 + c.turns * 0.5 + c.drops * 0.3 + maxDrop * 0.5 + totalDrop * 0.1,
    0,
    10,
  );

  return {
    excitement: round2(excitement),
    intensity: round2(intensity),
    nausea: round2(nausea),
  };
}

/**
 * Fraction of arriving guests (0–1) willing to buy a ticket at `price` for a
 * ride of the given excitement. More exciting rides tolerate higher prices;
 * push the price too high and demand collapses to zero.
 */
export function ticketDemand(price: number, excitement: number): number {
  const maxWilling = excitement * 1.5 + 2;
  if (maxWilling <= 0) return 0;
  return clamp(1 - price / maxWilling, 0, 1);
}

/** Income booked for a single rider at the given ticket price. */
export function perRiderIncome(price: number): number {
  return Math.max(0, price);
}

/**
 * Guest satisfaction (0–1) blending a good excitement/intensity balance,
 * a nausea penalty, and whether the ticket felt fair for the excitement.
 */
export function guestSatisfaction(ratings: Ratings, price: number): number {
  const value = ratings.excitement - ratings.intensity * 0.3 - ratings.nausea * 0.5;
  const priceFairness = ticketDemand(price, ratings.excitement);
  const raw = value / 10 + priceFairness * 0.4;
  return clamp(raw, 0, 1);
}

/** Capital value of a single built ride from its ratings and size. */
export function rideValue(ratings: Ratings, layout: Layout): number {
  const len = layout.length;
  return Math.round(ratings.excitement * 120 + ratings.intensity * 30 + len * 15);
}

/** Total park value = cash on hand plus the value of every built ride. */
export function parkValue(rideValues: number[], cash: number): number {
  return Math.round(rideValues.reduce((sum, v) => sum + v, 0) + cash);
}

/** Era-style milestone ladder for park value. */
export const PARK_MILESTONES: readonly number[] = [2500, 5000, 10000, 25000];

/** Final win target — reaching this pops the victory dialog. */
export const WIN_TARGET = PARK_MILESTONES[PARK_MILESTONES.length - 1];

/**
 * Highest milestone the park has reached at `value`, or null if none yet.
 * Used to fire the milestone chime exactly once as thresholds are crossed.
 */
export function reachedMilestone(value: number): number | null {
  let hit: number | null = null;
  for (const m of PARK_MILESTONES) {
    if (value >= m) hit = m;
  }
  return hit;
}

/** Whether the park has hit the final win target. */
export function hasWon(value: number): boolean {
  return value >= WIN_TARGET;
}

// --- park geometry -------------------------------------------------------
// The park is a tiled field rendered isometrically by the component. Peeps walk
// only on 'path' tiles; the rest is scenery. All of this is plain data so the
// whole living sim below can run and be tested without a DOM.

export const GRID_W = 16;
export const GRID_H = 12;
export const START_CASH = 3000;
export const MAX_COASTERS = 3;

export type Terrain = 'grass' | 'path' | 'water' | 'flower';
export type DecorType = 'tree1' | 'tree2' | 'tree3' | 'fence';
export type StallType = 'food' | 'drink' | 'balloon';

/** An integer tile coordinate. Peep/handyman positions use the same axes but float. */
export interface TileXY {
  x: number;
  y: number;
}

export interface Decor extends TileXY {
  type: DecorType;
}

export interface Stall extends TileXY {
  id: number;
  type: StallType;
}

export interface Puddle extends TileXY {
  id: number;
  /** Seconds since it was left; the sprite can dry with age. */
  age: number;
}

// --- peeps ---------------------------------------------------------------

export type PeepState =
  | 'walking'
  | 'leaving'
  | 'queuing'
  | 'riding'
  | 'dizzy'
  | 'vomiting'
  | 'buying';

export type PeepGoal = 'ride' | 'stall' | 'wander' | 'exit';

/** How many recolorable shirt tints the peep sprite is drawn with. */
export const SHIRT_VARIANTS = 6;

export interface Peep {
  id: number;
  x: number;
  y: number;
  /** Elevation while riding, so guests lift with the track; 0 on foot. */
  z: number;
  facing: 1 | -1;
  state: PeepState;
  stateT: number;
  animT: number;
  path: TileXY[];
  goal: PeepGoal;
  /** Coaster id or stall id, depending on goal. */
  targetId: number;
  nausea: number;
  happiness: number;
  hunger: number;
  shirt: number;
  hasBalloon: boolean;
  rideCoaster: number;
  seat: number;
  done: boolean;
}

export interface Handyman {
  id: number;
  x: number;
  y: number;
  facing: 1 | -1;
  state: 'walking' | 'sweeping';
  stateT: number;
  animT: number;
  path: TileXY[];
  targetPuddle: number | null;
}

// --- research ------------------------------------------------------------

export type Unlockable = 'drop' | 'loop' | 'balloonStall';

/** Order the research lab unlocks new toys, one at a time. */
export const RESEARCH_ORDER: readonly Unlockable[] = ['drop', 'loop', 'balloonStall'];

/** Seconds of running the park before the next item is unlocked. */
export const RESEARCH_TIME = 25;

export interface Research {
  /** Progress toward the next item, 0–1. */
  progress: number;
  queueIndex: number;
  unlocked: Record<Unlockable, boolean>;
}

// --- economy knobs -------------------------------------------------------

export const STALL_COST: Record<StallType, number> = { food: 250, drink: 220, balloon: 300 };
export const STALL_INCOME: Record<StallType, number> = { food: 6, drink: 5, balloon: 9 };
export const PATH_COST = 8;
export const HANDYMAN_HIRE_COST = 200;
export const HANDYMAN_WAGE = 2; // $/second per handyman

export const MAX_PEEPS = 40;
const PEEP_SPEED = 1.6; // tiles/second
const HANDYMAN_SPEED = 1.5;
const TRAIN_SPEED = 3.2; // track cells/second
const CAR_CAPACITY = 6;
const CAR_SPACING = 0.85; // cells between rendered cars
const DIZZY_TIME = 2.0;
const VOMIT_TIME = 1.1;
const BUY_TIME = 1.5;
const SWEEP_TIME = 1.4;
const VOMIT_THRESHOLD = 0.68;
const DIRTY_CAP = 8; // puddles for maximum grime
const MAX_PUDDLES = 24;

// --- runtime simulation --------------------------------------------------
// These mutate their inputs and live here (not in the React component) so the
// component's render/effect bodies stay side-effect free.

export interface CoasterSim {
  id: number;
  name: string;
  layout: Layout;
  open: boolean;
  price: number;
  totalRiders: number;
  carPos: number;
  riderAcc: number;
  happiness: number;
  /** Peep ids waiting at the station, front of line first. */
  queue: number[];
  /** Peep ids currently on the train, seat order. */
  riders: number[];
  /** Test-run in progress: the train laps once with no guests aboard. */
  testing: boolean;
  testLap: number;
}

export interface ParkSim {
  coasters: CoasterSim[];
  activeIndex: number;
  cash: number;
  lastMilestone: number;
  hudAcc: number;
  gridW: number;
  gridH: number;
  terrain: Terrain[][];
  gate: TileXY;
  stalls: Stall[];
  peeps: Peep[];
  handymen: Handyman[];
  puddles: Puddle[];
  decor: Decor[];
  research: Research;
  nextPeepId: number;
  nextStallId: number;
  nextPuddleId: number;
  nextHandymanId: number;
  spawnAcc: number;
  totalGuests: number;
  rng: Rand;
  seed: number;
}

/** Things worth a sound or a particle that happened during a step. */
export interface StepEvents {
  sales: number;
  pukes: number;
  sweeps: number;
  boarded: number;
  unlockedResearch: Unlockable | null;
  lastSaleAt: TileXY | null;
}

export interface StepResult {
  /** True on the frames where enough time passed to refresh the HUD. */
  hudReady: boolean;
  parkValue: number;
  /** A milestone value if a new one was crossed this step, else null. */
  newMilestone: number | null;
  won: boolean;
  events: StepEvents;
}

/** A fresh coaster with a single station piece at (x, y). */
export function makeCoaster(id: number, name: string, x: number, y: number): CoasterSim {
  return {
    id,
    name,
    layout: [{ x, y, type: 'station', height: 0 }],
    open: false,
    price: 3,
    totalRiders: 0,
    carPos: 0,
    riderAcc: 0,
    happiness: 0.6,
    queue: [],
    riders: [],
    testing: false,
    testLap: 0,
  };
}

/** Where a newly placed piece sits: lifts climb, drops descend, the rest hold. */
export function nextPieceHeight(prevHeight: number, type: PieceType): number {
  if (type === 'lift') return Math.min(MAX_HEIGHT, prevHeight + 1);
  if (type === 'drop') return Math.max(0, prevHeight - 1);
  return prevHeight;
}

/** Build the starting park: a path spine off the gate, one coaster, one stall. */
export function createParkSim(seed: number = Date.now()): ParkSim {
  const s = seed >>> 0;
  const rng = makeRng(s);

  const terrain: Terrain[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    const row: Terrain[] = [];
    for (let x = 0; x < GRID_W; x++) row.push('grass');
    terrain.push(row);
  }
  // A T of paths: a spine up from the gate and a promenade across the middle.
  for (let y = 4; y <= 11; y++) terrain[y][8] = 'path';
  for (let x = 2; x <= 13; x++) terrain[7][x] = 'path';
  // A little scenery.
  for (const [x, y] of [[2, 2], [3, 2], [2, 3], [3, 3]] as const) terrain[y][x] = 'water';
  for (const [x, y] of [[12, 3], [13, 3], [12, 9], [13, 9]] as const) terrain[y][x] = 'flower';

  return {
    coasters: [makeCoaster(1, 'Coaster 1', 8, 3)],
    activeIndex: 0,
    cash: START_CASH,
    lastMilestone: 0,
    hudAcc: 0,
    gridW: GRID_W,
    gridH: GRID_H,
    terrain,
    gate: { x: 8, y: 11 },
    stalls: [{ id: 1, type: 'food', x: 10, y: 6 }],
    peeps: [],
    handymen: [],
    puddles: [],
    decor: [
      { type: 'tree1', x: 2, y: 9 },
      { type: 'tree2', x: 13, y: 10 },
      { type: 'tree3', x: 3, y: 10 },
      { type: 'tree1', x: 12, y: 2 },
      { type: 'tree2', x: 5, y: 2 },
      { type: 'tree3', x: 11, y: 2 },
      { type: 'fence', x: 6, y: 11 },
      { type: 'fence', x: 7, y: 11 },
      { type: 'fence', x: 9, y: 11 },
      { type: 'fence', x: 10, y: 11 },
    ],
    research: { progress: 0, queueIndex: 0, unlocked: { drop: false, loop: false, balloonStall: false } },
    nextPeepId: 1,
    nextStallId: 2,
    nextPuddleId: 1,
    nextHandymanId: 1,
    spawnAcc: 0,
    totalGuests: 0,
    rng,
    seed: s,
  };
}

// --- grid + pathing helpers ----------------------------------------------

export function inBounds(sim: ParkSim, x: number, y: number): boolean {
  return x >= 0 && x < sim.gridW && y >= 0 && y < sim.gridH;
}

export function isPath(sim: ParkSim, x: number, y: number): boolean {
  return inBounds(sim, x, y) && sim.terrain[y][x] === 'path';
}

function stallAt(sim: ParkSim, x: number, y: number): Stall | undefined {
  return sim.stalls.find((s) => s.x === x && s.y === y);
}

function trackAt(sim: ParkSim, x: number, y: number): boolean {
  return sim.coasters.some((c) => c.layout.some((cell) => cell.x === x && cell.y === y));
}

const DIRS: readonly TileXY[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** First orthogonally-adjacent path tile to (x, y), or null. */
export function adjacentPathTile(sim: ParkSim, x: number, y: number): TileXY | null {
  for (const d of DIRS) {
    if (isPath(sim, x + d.x, y + d.y)) return { x: x + d.x, y: y + d.y };
  }
  return null;
}

function randomPathTile(sim: ParkSim): TileXY | null {
  const tiles: TileXY[] = [];
  for (let y = 0; y < sim.gridH; y++) {
    for (let x = 0; x < sim.gridW; x++) if (sim.terrain[y][x] === 'path') tiles.push({ x, y });
  }
  if (tiles.length === 0) return null;
  return tiles[Math.floor(sim.rng() * tiles.length)];
}

const key = (x: number, y: number) => y * 1000 + x;

/**
 * Shortest walk over path tiles from `start` to `goal`, as the list of tile
 * waypoints after the start (goal last). Empty if already there or unreachable.
 */
export function bfsPath(sim: ParkSim, start: TileXY, goal: TileXY): TileXY[] {
  if (start.x === goal.x && start.y === goal.y) return [];
  const prev = new Map<number, number>();
  const seen = new Set<number>([key(start.x, start.y)]);
  let frontier: TileXY[] = [start];
  const goalKey = key(goal.x, goal.y);
  let found = false;
  while (frontier.length && !found) {
    const next: TileXY[] = [];
    for (const t of frontier) {
      for (const d of DIRS) {
        const nx = t.x + d.x;
        const ny = t.y + d.y;
        const k = key(nx, ny);
        if (seen.has(k) || !isPath(sim, nx, ny)) continue;
        seen.add(k);
        prev.set(k, key(t.x, t.y));
        if (k === goalKey) {
          found = true;
          break;
        }
        next.push({ x: nx, y: ny });
      }
      if (found) break;
    }
    frontier = next;
  }
  if (!found) return [];
  const out: TileXY[] = [];
  let cur = goalKey;
  const startKey = key(start.x, start.y);
  while (cur !== startKey) {
    out.push({ x: cur % 1000, y: Math.floor(cur / 1000) });
    const p = prev.get(cur);
    if (p === undefined) break;
    cur = p;
  }
  out.reverse();
  return out;
}

const tileOf = (w: { x: number; y: number }): TileXY => ({ x: Math.round(w.x), y: Math.round(w.y) });
const mod = (n: number, m: number) => ((n % m) + m) % m;

interface Walker {
  x: number;
  y: number;
  facing: 1 | -1;
  path: TileXY[];
}

/** Step a walker toward its next waypoint. Returns true on the frame it arrives. */
function walkAlong(w: Walker, dt: number, speed: number): boolean {
  if (w.path.length === 0) return true;
  const wp = w.path[0];
  const dx = wp.x - w.x;
  const dy = wp.y - w.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-4) {
    w.path.shift();
    return w.path.length === 0;
  }
  // Screen-x of iso motion is (dx - dy); face the way we slide across the glass.
  w.facing = dx - dy >= 0 ? 1 : -1;
  const step = speed * dt;
  if (dist <= step) {
    w.x = wp.x;
    w.y = wp.y;
    w.path.shift();
    return w.path.length === 0;
  }
  w.x += (dx / dist) * step;
  w.y += (dy / dist) * step;
  return false;
}

// --- lookups -------------------------------------------------------------

const peepById = (sim: ParkSim, id: number) => sim.peeps.find((p) => p.id === id);
const coasterById = (sim: ParkSim, id: number) => sim.coasters.find((c) => c.id === id);
const stallById = (sim: ParkSim, id: number) => sim.stalls.find((s) => s.id === id);

// --- peep behaviour ------------------------------------------------------

/** Point on the track at a fractional position, with interpolated height. */
export function trackPointAt(layout: Layout, pos: number): { x: number; y: number; h: number } {
  const n = layout.length;
  const i0 = mod(Math.floor(pos), n);
  const i1 = (i0 + 1) % n;
  const t = pos - Math.floor(pos);
  const a = layout[i0];
  const b = layout[i1];
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    h: cellHeight(a) + (cellHeight(b) - cellHeight(a)) * t,
  };
}

/** Screen-space slot a queuing peep should stand in, fanning back from the station. */
export function queueSlot(sim: ParkSim, c: CoasterSim, index: number): TileXY {
  const st = c.layout[0];
  const anchor = adjacentPathTile(sim, st.x, st.y) ?? { x: st.x, y: st.y + 1 };
  const dx = anchor.x - st.x;
  const dy = anchor.y - st.y;
  return { x: anchor.x + dx * index * 0.55, y: anchor.y + dy * index * 0.55 };
}

interface Candidate {
  goal: PeepGoal;
  id: number;
}

function candidateWeight(sim: ParkSim, p: Peep, cand: Candidate): number {
  if (cand.goal === 'ride') {
    const c = coasterById(sim, cand.id);
    if (!c || !c.open || !validateTrack(c.layout).valid) return 0;
    const r = computeRatings(c.layout);
    // Guests chase excitement but shy away from punishing intensity and steep tickets.
    return Math.max(0.12, r.excitement - r.intensity * 0.4 - c.price * 0.15);
  }
  if (cand.goal === 'stall') {
    const s = stallById(sim, cand.id);
    if (!s) return 0;
    if (s.type === 'balloon') return 0.5;
    return 0.6 + p.hunger * 1.4;
  }
  return 0.4; // wander
}

/** Point a peep at a fresh destination and route it there. False if unreachable. */
function assignFor(sim: ParkSim, p: Peep, cand: Candidate): boolean {
  let target: TileXY | null = null;
  if (cand.goal === 'ride') {
    const c = coasterById(sim, cand.id);
    if (!c) return false;
    target = adjacentPathTile(sim, c.layout[0].x, c.layout[0].y);
  } else if (cand.goal === 'stall') {
    const s = stallById(sim, cand.id);
    if (!s) return false;
    target = adjacentPathTile(sim, s.x, s.y);
  } else if (cand.goal === 'wander') {
    target = randomPathTile(sim);
  } else {
    target = sim.gate;
  }
  if (!target) return false;
  const start = tileOf(p);
  const path = bfsPath(sim, start, target);
  if (path.length === 0 && !(start.x === target.x && start.y === target.y)) return false;
  p.goal = cand.goal;
  p.targetId = cand.id;
  p.path = path;
  p.state = cand.goal === 'exit' ? 'leaving' : 'walking';
  p.stateT = 0;
  return true;
}

/** Weighted goal roll with graceful fallbacks so no peep ever gets stuck. */
function pickAndAssign(sim: ParkSim, p: Peep): void {
  const cands: Candidate[] = [];
  for (const c of sim.coasters) cands.push({ goal: 'ride', id: c.id });
  for (const s of sim.stalls) cands.push({ goal: 'stall', id: s.id });
  cands.push({ goal: 'wander', id: -1 });

  const entries = cands
    .map((c) => [c, candidateWeight(sim, p, c)] as [Candidate, number])
    .filter(([, w]) => w > 0);

  if (entries.length > 0) {
    const chosen = weightedPick(sim.rng, entries);
    if (assignFor(sim, p, chosen)) return;
  }
  if (assignFor(sim, p, { goal: 'exit', id: -1 })) return;
  p.done = true;
}

function pickNextAfterActivity(sim: ParkSim, p: Peep): void {
  p.hunger = clamp(p.hunger + 0.15, 0, 1);
  const leaveChance = 0.22 + (1 - p.happiness) * 0.5 + dirtiness(sim) * 0.3;
  if (sim.rng() < leaveChance) {
    if (!assignFor(sim, p, { goal: 'exit', id: -1 })) p.done = true;
    return;
  }
  pickAndAssign(sim, p);
}

function onArrive(sim: ParkSim, p: Peep): void {
  if (p.goal === 'ride') {
    const c = coasterById(sim, p.targetId);
    if (c && c.open && validateTrack(c.layout).valid) {
      c.queue.push(p.id);
      p.state = 'queuing';
      p.stateT = 0;
    } else {
      pickNextAfterActivity(sim, p);
    }
  } else if (p.goal === 'stall') {
    p.state = 'buying';
    p.stateT = 0;
  } else if (p.goal === 'exit') {
    p.done = true;
  } else {
    pickNextAfterActivity(sim, p);
  }
}

/** Advance one guest's state machine. */
export function stepPeep(sim: ParkSim, p: Peep, dt: number, events: StepEvents): void {
  p.stateT += dt;
  p.animT += dt;

  switch (p.state) {
    case 'walking':
    case 'leaving': {
      if (walkAlong(p, dt, PEEP_SPEED)) onArrive(sim, p);
      break;
    }
    case 'queuing': {
      const c = coasterById(sim, p.targetId);
      if (!c || !c.open) {
        // Ride shut while we waited — bail out of the line.
        if (c) c.queue = c.queue.filter((id) => id !== p.id);
        pickNextAfterActivity(sim, p);
        break;
      }
      const idx = c.queue.indexOf(p.id);
      const slot = queueSlot(sim, c, Math.max(0, idx));
      p.x = slot.x;
      p.y = slot.y;
      break;
    }
    case 'riding':
      // Position is driven by the train in updateRiderPositions.
      break;
    case 'dizzy': {
      if (p.stateT >= DIZZY_TIME) {
        if (p.nausea > VOMIT_THRESHOLD) {
          p.state = 'vomiting';
          p.stateT = 0;
        } else {
          pickNextAfterActivity(sim, p);
        }
      }
      break;
    }
    case 'vomiting': {
      if (p.stateT >= VOMIT_TIME) {
        spawnPuddle(sim, Math.round(p.x), Math.round(p.y));
        events.pukes++;
        p.nausea = clamp(p.nausea - 0.5, 0, 1);
        p.happiness = clamp(p.happiness - 0.08, 0, 1);
        pickNextAfterActivity(sim, p);
      }
      break;
    }
    case 'buying': {
      if (p.stateT >= BUY_TIME) {
        const s = stallById(sim, p.targetId);
        if (s) {
          sim.cash += STALL_INCOME[s.type];
          events.sales++;
          events.lastSaleAt = { x: s.x, y: s.y };
          p.hunger = 0;
          p.happiness = clamp(p.happiness + 0.1, 0, 1);
          if (s.type === 'balloon') p.hasBalloon = true;
        }
        pickNextAfterActivity(sim, p);
      }
      break;
    }
  }
}

function spawnPuddle(sim: ParkSim, x: number, y: number): void {
  sim.puddles.push({ id: sim.nextPuddleId++, x, y, age: 0 });
  if (sim.puddles.length > MAX_PUDDLES) sim.puddles.shift();
}

function spawnOnePeep(sim: ParkSim): void {
  const p: Peep = {
    id: sim.nextPeepId++,
    x: sim.gate.x,
    y: sim.gate.y,
    z: 0,
    facing: 1,
    state: 'walking',
    stateT: 0,
    animT: sim.rng() * 10,
    path: [],
    goal: 'wander',
    targetId: -1,
    nausea: 0,
    happiness: 0.7,
    hunger: sim.rng() * 0.5,
    shirt: randInt(sim.rng, 0, SHIRT_VARIANTS - 1),
    hasBalloon: false,
    rideCoaster: -1,
    seat: 0,
    done: false,
  };
  sim.peeps.push(p);
  sim.totalGuests++;
  pickAndAssign(sim, p);
}

/** How grimy the park is, 0–1, from the number of unswept puddles. */
export function dirtiness(sim: ParkSim): number {
  return clamp(sim.puddles.length / DIRTY_CAP, 0, 1);
}

/** Sum of how enticing the open rides are right now; feeds the arrival rate. */
export function parkAttractiveness(sim: ParkSim): number {
  let a = 0;
  for (const c of sim.coasters) {
    if (c.open && validateTrack(c.layout).valid) {
      const r = computeRatings(c.layout);
      a += ticketDemand(c.price, r.excitement) * (0.4 + 0.6 * c.happiness);
    }
  }
  return a;
}

function spawnPeeps(sim: ParkSim, dt: number): void {
  if (sim.peeps.length >= MAX_PEEPS) return;
  const rate = (0.55 + parkAttractiveness(sim) * 1.6) * (1 - dirtiness(sim) * 0.7);
  sim.spawnAcc += rate * dt;
  while (sim.spawnAcc >= 1 && sim.peeps.length < MAX_PEEPS) {
    sim.spawnAcc -= 1;
    spawnOnePeep(sim);
  }
}

// --- coaster train -------------------------------------------------------

function applyRideEffects(sim: ParkSim, p: Peep, ratings: Ratings): void {
  p.nausea = clamp(p.nausea + ratings.nausea * 0.05 + ratings.intensity * 0.03, 0, 1);
  p.happiness = clamp(p.happiness + ratings.excitement * 0.05 - ratings.intensity * 0.025, 0, 1);
  const c = coasterById(sim, p.rideCoaster);
  const exit = c ? adjacentPathTile(sim, c.layout[0].x, c.layout[0].y) ?? sim.gate : sim.gate;
  p.x = exit.x;
  p.y = exit.y;
  p.z = 0;
  p.rideCoaster = -1;
  p.seat = 0;
  if (p.nausea > VOMIT_THRESHOLD || ratings.intensity > 6.5) {
    p.state = 'dizzy';
    p.stateT = 0;
  } else {
    pickNextAfterActivity(sim, p);
  }
}

function dispatchTrain(sim: ParkSim, c: CoasterSim, ratings: Ratings, events: StepEvents): void {
  for (const id of c.riders) {
    const p = peepById(sim, id);
    if (p && p.state === 'riding') applyRideEffects(sim, p, ratings);
  }
  c.riders = [];
  while (c.riders.length < CAR_CAPACITY && c.queue.length > 0) {
    const id = c.queue.shift()!;
    const p = peepById(sim, id);
    if (!p || p.state !== 'queuing') continue;
    p.state = 'riding';
    p.stateT = 0;
    p.rideCoaster = c.id;
    p.seat = c.riders.length;
    c.riders.push(id);
    events.boarded++;
  }
}

function updateRiderPositions(sim: ParkSim, c: CoasterSim): void {
  const n = c.layout.length;
  c.riders.forEach((id, s) => {
    const p = peepById(sim, id);
    if (!p) return;
    const pt = trackPointAt(c.layout, mod(c.carPos - s * CAR_SPACING, n));
    p.x = pt.x;
    p.y = pt.y;
    p.z = pt.h;
  });
}

/** Advance one coaster: economy, train motion, loading/unloading. Returns cash earned. */
function stepCoaster(sim: ParkSim, c: CoasterSim, dt: number, events: StepEvents): number {
  const valid = validateTrack(c.layout).valid;
  const n = c.layout.length;

  if (c.testing) {
    if (!valid) {
      c.testing = false;
      return 0;
    }
    const prev = c.carPos;
    c.carPos = (c.carPos + dt * TRAIN_SPEED) % n;
    if (c.carPos < prev) {
      c.testLap += 1;
      if (c.testLap >= 1) {
        c.testing = false;
        c.carPos = 0;
      }
    }
    return 0;
  }

  if (!c.open || !valid) {
    c.riders = [];
    return 0;
  }

  const ratings = computeRatings(c.layout);
  const demand = ticketDemand(c.price, ratings.excitement);
  const target = guestSatisfaction(ratings, c.price) * (1 - dirtiness(sim) * 0.3);
  c.happiness += (target - c.happiness) * Math.min(1, dt * 0.6);

  const arrivalRate = 2.2 * demand * (0.4 + 0.6 * c.happiness);
  c.riderAcc += arrivalRate * dt;
  let gain = 0;
  if (c.riderAcc >= 1) {
    const k = Math.floor(c.riderAcc);
    c.riderAcc -= k;
    c.totalRiders += k;
    gain = k * perRiderIncome(c.price);
  }

  const prev = c.carPos;
  c.carPos = (c.carPos + dt * TRAIN_SPEED) % n;
  if (c.carPos < prev) dispatchTrain(sim, c, ratings, events);
  updateRiderPositions(sim, c);
  return gain;
}

// --- handyman ------------------------------------------------------------

function nearestPuddle(sim: ParkSim, h: Handyman): Puddle | null {
  let best: Puddle | null = null;
  let bestD = Infinity;
  for (const pd of sim.puddles) {
    const d = Math.abs(pd.x - h.x) + Math.abs(pd.y - h.y);
    if (d < bestD) {
      bestD = d;
      best = pd;
    }
  }
  return best;
}

/** Advance one handyman: hunt the nearest puddle, walk to it, sweep it away. */
export function stepHandyman(sim: ParkSim, h: Handyman, dt: number, events: StepEvents): void {
  h.stateT += dt;
  h.animT += dt;

  if (h.state === 'sweeping') {
    if (h.stateT >= SWEEP_TIME) {
      const idx = sim.puddles.findIndex((pd) => pd.id === h.targetPuddle);
      if (idx >= 0) {
        sim.puddles.splice(idx, 1);
        events.sweeps++;
      }
      h.targetPuddle = null;
      h.state = 'walking';
      h.stateT = 0;
      h.path = [];
    }
    return;
  }

  const targetGone = h.targetPuddle == null || !sim.puddles.some((pd) => pd.id === h.targetPuddle);
  if (targetGone) {
    const pd = nearestPuddle(sim, h);
    if (pd) {
      h.targetPuddle = pd.id;
      const start = tileOf(h);
      const goal = { x: pd.x, y: pd.y };
      let path = bfsPath(sim, start, goal);
      // Puddles can land just off the path; a short off-path hop guarantees the
      // sweep loop never stalls out with grime piling up.
      if (path.length === 0 && !(start.x === goal.x && start.y === goal.y)) path = [goal];
      h.path = path;
    } else {
      h.targetPuddle = null;
      if (h.path.length === 0) {
        const t = randomPathTile(sim);
        if (t) h.path = bfsPath(sim, tileOf(h), t);
      }
    }
  }

  if (walkAlong(h, dt, HANDYMAN_SPEED)) {
    if (h.targetPuddle != null) {
      h.state = 'sweeping';
      h.stateT = 0;
    } else {
      h.path = [];
    }
  }
}

// --- research ------------------------------------------------------------

/** Advance the research clock; returns a newly unlocked item, or null. */
export function stepResearch(sim: ParkSim, dt: number): Unlockable | null {
  const r = sim.research;
  if (r.queueIndex >= RESEARCH_ORDER.length) return null;
  r.progress += dt / RESEARCH_TIME;
  if (r.progress >= 1) {
    const item = RESEARCH_ORDER[r.queueIndex];
    r.unlocked[item] = true;
    r.queueIndex++;
    r.progress = 0;
    return item;
  }
  return null;
}

// --- player build actions (pure mutators the component calls) -------------

/** Turn a grass/flower tile into path (costs) or an existing path back to grass. */
export function togglePath(sim: ParkSim, x: number, y: number): 'built' | 'removed' | 'blocked' {
  if (!inBounds(sim, x, y)) return 'blocked';
  const t = sim.terrain[y][x];
  if (t === 'path') {
    if (sim.gate.x === x && sim.gate.y === y) return 'blocked';
    sim.terrain[y][x] = 'grass';
    return 'removed';
  }
  if (t === 'water') return 'blocked';
  if (stallAt(sim, x, y) || trackAt(sim, x, y)) return 'blocked';
  if (sim.cash < PATH_COST) return 'blocked';
  sim.cash -= PATH_COST;
  sim.terrain[y][x] = 'path';
  return 'built';
}

/** Place a stall on a path-adjacent grass tile. Returns whether it went down. */
export function buildStall(sim: ParkSim, type: StallType, x: number, y: number): boolean {
  if (!inBounds(sim, x, y)) return false;
  const t = sim.terrain[y][x];
  if (t === 'path' || t === 'water') return false;
  if (stallAt(sim, x, y) || trackAt(sim, x, y)) return false;
  if (!adjacentPathTile(sim, x, y)) return false;
  if (type === 'balloon' && !sim.research.unlocked.balloonStall) return false;
  if (sim.cash < STALL_COST[type]) return false;
  sim.cash -= STALL_COST[type];
  sim.stalls.push({ id: sim.nextStallId++, type, x, y });
  return true;
}

/** Hire a handyman (spawns at the gate). Returns whether the hire succeeded. */
export function hireHandyman(sim: ParkSim): boolean {
  if (sim.cash < HANDYMAN_HIRE_COST) return false;
  sim.cash -= HANDYMAN_HIRE_COST;
  sim.handymen.push({
    id: sim.nextHandymanId++,
    x: sim.gate.x,
    y: sim.gate.y,
    facing: 1,
    state: 'walking',
    stateT: 0,
    animT: 0,
    path: [],
    targetPuddle: null,
  });
  return true;
}

// --- top-level step ------------------------------------------------------

/**
 * Advance the whole park by dt seconds. Mutates the sim in place: research,
 * spawning, coasters, guests, handymen, wages — then, on a slower cadence,
 * recomputes park value and reports milestones. Returns per-frame events so the
 * component can fire sounds and particles.
 */
export function stepPark(sim: ParkSim, dt: number): StepResult {
  const events: StepEvents = {
    sales: 0,
    pukes: 0,
    sweeps: 0,
    boarded: 0,
    unlockedResearch: null,
    lastSaleAt: null,
  };

  events.unlockedResearch = stepResearch(sim, dt);
  spawnPeeps(sim, dt);

  let cashGain = 0;
  for (const c of sim.coasters) cashGain += stepCoaster(sim, c, dt, events);
  for (const p of sim.peeps) stepPeep(sim, p, dt, events);
  if (sim.peeps.some((p) => p.done)) sim.peeps = sim.peeps.filter((p) => !p.done);
  for (const h of sim.handymen) stepHandyman(sim, h, dt, events);
  for (const pd of sim.puddles) pd.age += dt;

  sim.cash += cashGain;
  sim.cash -= HANDYMAN_WAGE * sim.handymen.length * dt;
  if (sim.cash < 0) sim.cash = 0;

  sim.hudAcc += dt;
  if (sim.hudAcc < 0.2) {
    return { hudReady: false, parkValue: 0, newMilestone: null, won: false, events };
  }
  sim.hudAcc = 0;

  const values: number[] = [];
  for (const c of sim.coasters) {
    if (validateTrack(c.layout).valid) values.push(rideValue(computeRatings(c.layout), c.layout));
  }
  const pv = parkValue(values, sim.cash);

  let newMilestone: number | null = null;
  const m = reachedMilestone(pv);
  if (m !== null && m > sim.lastMilestone) {
    sim.lastMilestone = m;
    newMilestone = m;
  }
  return {
    hudReady: true,
    parkValue: pv,
    newMilestone,
    won: newMilestone !== null && hasWon(pv),
    events,
  };
}
