// Pure trick + scoring logic for TonyHawk2. No React, no canvas, no globals —
// everything here is deterministic and unit-testable. The component drives the
// canvas/input/loop and calls into these helpers for anything score-shaped.

import { clamp } from './rng';

export type TrickType = 'flip' | 'grab' | 'manual' | 'grind';

export interface TrickDef {
  id: string;
  name: string;
  /** Base points before the combo multiplier is applied. */
  points: number;
  type: TrickType;
  /** How far this trick spins the board, in degrees (flips only). */
  spin: number;
}

/** Air tricks, keyed by control. Left/Right = flips, Up = grab, Down = manual. */
export const TRICKS: Record<string, TrickDef> = {
  kickflip: { id: 'kickflip', name: 'Kickflip', points: 100, type: 'flip', spin: 180 },
  heelflip: { id: 'heelflip', name: 'Heelflip', points: 120, type: 'flip', spin: 180 },
  grab: { id: 'grab', name: 'Method Air', points: 150, type: 'grab', spin: 0 },
  manual: { id: 'manual', name: 'Manual', points: 80, type: 'manual', spin: 0 },
};

/** Grind is not keyed to a control — it starts automatically when you ride a rail. */
export const GRIND_TRICK: TrickDef = {
  id: 'grind',
  name: '50-50 Grind',
  points: 60,
  type: 'grind',
  spin: 0,
};

/** Base points for a trick id (0 if unknown). */
export function trickBasePoints(id: string): number {
  if (id === GRIND_TRICK.id) return GRIND_TRICK.points;
  return TRICKS[id]?.points ?? 0;
}

export function trickSpin(id: string): number {
  if (id === GRIND_TRICK.id) return GRIND_TRICK.spin;
  return TRICKS[id]?.spin ?? 0;
}

export function trickName(id: string): string {
  if (id === GRIND_TRICK.id) return GRIND_TRICK.name;
  return TRICKS[id]?.name ?? id;
}

// ---------------------------------------------------------------------------
// Combo accumulation
// ---------------------------------------------------------------------------

export interface ComboState {
  /** Trick ids in the order performed during the current, un-banked combo. */
  tricks: string[];
  /** Running sum of base points for those tricks. */
  basePoints: number;
}

export function emptyCombo(): ComboState {
  return { tricks: [], basePoints: 0 };
}

/** Append a trick to the combo, returning a new state (does not mutate). */
export function addTrick(combo: ComboState, id: string): ComboState {
  return {
    tricks: [...combo.tricks, id],
    basePoints: combo.basePoints + trickBasePoints(id),
  };
}

/**
 * The rising multiplier: it grows with every trick chained. First trick is x1,
 * each additional trick adds one to the multiplier (x2, x3, ...).
 */
export function comboMultiplier(combo: ComboState): number {
  return Math.max(1, combo.tricks.length);
}

/** Points the combo is currently worth if banked cleanly. */
export function comboValue(combo: ComboState): number {
  return combo.basePoints * comboMultiplier(combo);
}

// ---------------------------------------------------------------------------
// Grind balance
// ---------------------------------------------------------------------------

/** Balance leaves the rail once it hits +/- this. */
export const GRIND_BAIL_THRESHOLD = 1;

/**
 * Advance a grind balance meter. `balance` and the result live in [-2, 2] with 0
 * centered. `drift` is the rail's natural pull this frame (deg-ish, signed) and
 * `input` is the player's correction (-1 pressing left, +1 pressing right). A
 * correction opposite the drift keeps you centered.
 */
export function updateGrindBalance(
  balance: number,
  drift: number,
  input: number,
  dt: number,
  rate = 1.6,
): number {
  return clamp(balance + (drift - input) * dt * rate, -2, 2);
}

export function grindHasBailed(balance: number): boolean {
  return Math.abs(balance) >= GRIND_BAIL_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Landing validation
// ---------------------------------------------------------------------------

export type Landing = 'clean' | 'sketchy' | 'bail';

/** Smallest angle (deg, 0-180) between a rotation and upright (a multiple of 360). */
export function angleFromUpright(rotation: number): number {
  const m = ((rotation % 360) + 360) % 360;
  return Math.min(m, 360 - m);
}

/**
 * Judge a landing from how upright the board is. Near-upright is clean, a bit
 * off is a sketchy landing (reduced payout), badly over-rotated is a bail.
 */
export function validateLanding(rotation: number): Landing {
  const off = angleFromUpright(rotation);
  if (off <= 25) return 'clean';
  if (off <= 55) return 'sketchy';
  return 'bail';
}

/** Fraction of the combo value awarded for a given landing quality. */
export function landingMultiplier(landing: Landing): number {
  if (landing === 'clean') return 1;
  if (landing === 'sketchy') return 0.5;
  return 0;
}

/** Points actually banked from a combo given how it was landed. */
export function bankCombo(combo: ComboState, landing: Landing): number {
  return Math.round(comboValue(combo) * landingMultiplier(landing));
}

// ---------------------------------------------------------------------------
// Score goals
// ---------------------------------------------------------------------------

export interface ScoreGoals {
  bronze: number;
  silver: number;
  gold: number;
}

export const SCORE_GOALS: ScoreGoals = { bronze: 5000, silver: 15000, gold: 30000 };

export type GoalTier = 'none' | 'bronze' | 'silver' | 'gold';

export function goalTier(score: number, goals: ScoreGoals = SCORE_GOALS): GoalTier {
  if (score >= goals.gold) return 'gold';
  if (score >= goals.silver) return 'silver';
  if (score >= goals.bronze) return 'bronze';
  return 'none';
}

/** Sum of all banked combos = final run score. */
export function finalScore(banked: readonly number[]): number {
  return banked.reduce((sum, v) => sum + v, 0);
}
