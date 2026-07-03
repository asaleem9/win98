// Pure ride math for RollerCoaster Tycoon — no React, no DOM.
// Everything here is deterministic and unit-tested in ../__tests__/coaster.test.ts.

import { clamp } from './rng';

export type PieceType = 'station' | 'straight' | 'turn' | 'lift' | 'drop' | 'loop';

/** A single placed track piece on the builder grid. */
export interface TrackCell {
  x: number;
  y: number;
  type: PieceType;
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
    | 'not-a-loop';
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

  const excitement = clamp(
    1.0 + c.drops * 0.8 + c.loops * 1.5 + c.turns * 0.3 + c.lifts * 0.5 + len * 0.05,
    0,
    10,
  );
  const intensity = clamp(
    0.5 + c.drops * 0.6 + c.loops * 1.2 + c.turns * 0.2 + len * 0.03,
    0,
    10,
  );
  const nausea = clamp(
    0.2 + c.loops * 1.0 + c.turns * 0.5 + c.drops * 0.3,
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
}

export interface ParkSim {
  coasters: CoasterSim[];
  activeIndex: number;
  cash: number;
  lastMilestone: number;
  hudAcc: number;
}

export interface StepResult {
  /** True on the frames where enough time passed to refresh the HUD. */
  hudReady: boolean;
  parkValue: number;
  /** A milestone value if a new one was crossed this step, else null. */
  newMilestone: number | null;
  won: boolean;
}

/** Advance one open coaster; returns the cash it earned this tick. */
function stepCoaster(c: CoasterSim, dt: number): number {
  if (!c.open || !validateTrack(c.layout).valid) return 0;
  const ratings = computeRatings(c.layout);
  const demand = ticketDemand(c.price, ratings.excitement);
  const target = guestSatisfaction(ratings, c.price);
  c.happiness += (target - c.happiness) * Math.min(1, dt * 0.6);
  const arrivalRate = 2.2 * demand * (0.4 + 0.6 * c.happiness);
  c.riderAcc += arrivalRate * dt;
  let gain = 0;
  if (c.riderAcc >= 1) {
    const n = Math.floor(c.riderAcc);
    c.riderAcc -= n;
    c.totalRiders += n;
    gain = n * perRiderIncome(c.price);
  }
  c.carPos = (c.carPos + dt * 3.2) % c.layout.length;
  return gain;
}

/**
 * Advance the whole park by dt seconds. Mutates the sim in place and reports
 * whether the HUD should refresh and whether a milestone/win was crossed.
 */
export function stepPark(sim: ParkSim, dt: number): StepResult {
  let cashGain = 0;
  for (const c of sim.coasters) cashGain += stepCoaster(c, dt);
  sim.cash += cashGain;

  sim.hudAcc += dt;
  if (sim.hudAcc < 0.2) {
    return { hudReady: false, parkValue: 0, newMilestone: null, won: false };
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
  return { hudReady: true, parkValue: pv, newMilestone, won: newMilestone !== null && hasWon(pv) };
}
