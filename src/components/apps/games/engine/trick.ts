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

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

/** Relative frequency each feature is rolled when a level's course is generated. */
export interface FeatureWeights {
  rail: number;
  ramp: number;
  gap: number;
  flat: number;
}

/** Canvas colors that give a level its own look. */
export interface LevelPalette {
  /** Sky gradient stops, top → horizon. */
  sky: readonly [string, string, string];
  /** Flat ground fill. */
  ground: string;
  /** Neon accent for rails, ramps, the ground edge and combo readout. */
  accent: string;
}

/**
 * A full level definition. Everything that makes one course feel different from
 * another lives here — auto-scroll speed, what the terrain throws at you, how
 * generous the medal goals are, and the palette the canvas paints with.
 */
export interface LevelDef {
  name: string;
  location: string;
  /** Auto-scroll speed in px/s. Higher = less reaction time. */
  scroll: number;
  featureWeights: FeatureWeights;
  /** Inclusive [min, max] rail height above the ground. */
  railHeightRange: readonly [number, number];
  /** Inclusive [min, max] gap width. */
  gapWidthRange: readonly [number, number];
  goals: ScoreGoals;
  palette: LevelPalette;
}

/**
 * The eight levels, ordered by difficulty. Early stages are slow, rail-heavy and
 * forgiving; later ones crank the scroll speed, lean on gaps and set steep gold
 * goals. Each carries its own palette so it reads differently at a glance.
 */
export const TONY_LEVELS: readonly LevelDef[] = [
  {
    name: 'The Hangar',
    location: 'Mulhawk Airfield',
    scroll: 150,
    featureWeights: { rail: 4, ramp: 2, gap: 0.6, flat: 3 },
    railHeightRange: [48, 80],
    gapWidthRange: [60, 100],
    goals: { bronze: 3000, silver: 8000, gold: 15000 },
    palette: { sky: ['#0a0a16', '#181410', '#211a08'], ground: '#16161c', accent: '#ccff00' },
  },
  {
    name: 'School II',
    location: 'Southern California',
    scroll: 158,
    featureWeights: { rail: 3.5, ramp: 2, gap: 0.9, flat: 2.6 },
    railHeightRange: [52, 86],
    gapWidthRange: [70, 110],
    goals: { bronze: 4000, silver: 10000, gold: 18000 },
    palette: { sky: ['#1a2a44', '#2a4468', '#3a5a80'], ground: '#2a2e38', accent: '#ffd23f' },
  },
  {
    name: 'Marseille',
    location: 'Marseille, France',
    scroll: 166,
    featureWeights: { rail: 3, ramp: 2.4, gap: 1.2, flat: 2.2 },
    railHeightRange: [56, 92],
    gapWidthRange: [80, 120],
    goals: { bronze: 5500, silver: 13000, gold: 23000 },
    palette: { sky: ['#0a2436', '#0e3a4a', '#116b6b'], ground: '#183034', accent: '#ff7ac2' },
  },
  {
    name: 'NY City',
    location: 'New York City, NY',
    scroll: 174,
    featureWeights: { rail: 2.6, ramp: 2.4, gap: 1.6, flat: 2 },
    railHeightRange: [60, 96],
    gapWidthRange: [90, 135],
    goals: { bronze: 7000, silver: 16000, gold: 28000 },
    palette: { sky: ['#0a0616', '#160a2a', '#241040'], ground: '#141018', accent: '#7c5cff' },
  },
  {
    name: 'Venice Beach',
    location: 'Venice, CA',
    scroll: 182,
    featureWeights: { rail: 2.2, ramp: 3, gap: 1.8, flat: 1.8 },
    railHeightRange: [64, 104],
    gapWidthRange: [100, 145],
    goals: { bronze: 9000, silver: 20000, gold: 34000 },
    palette: { sky: ['#2a1030', '#5a1e40', '#a83a2e'], ground: '#241820', accent: '#ff5c3a' },
  },
  {
    name: 'Skatestreet',
    location: 'Ventura, CA',
    scroll: 190,
    featureWeights: { rail: 2.6, ramp: 3.2, gap: 2, flat: 1.5 },
    railHeightRange: [68, 112],
    gapWidthRange: [95, 140],
    goals: { bronze: 11000, silver: 24000, gold: 40000 },
    palette: { sky: ['#101820', '#182430', '#243848'], ground: '#181c22', accent: '#3ad6ff' },
  },
  {
    name: 'Philadelphia',
    location: 'Philadelphia, PA',
    scroll: 200,
    featureWeights: { rail: 2.2, ramp: 2.2, gap: 2.8, flat: 1.2 },
    railHeightRange: [64, 108],
    gapWidthRange: [110, 160],
    goals: { bronze: 13000, silver: 27000, gold: 45000 },
    palette: { sky: ['#12161a', '#1c2228', '#2a3238'], ground: '#161a1c', accent: '#9bff5c' },
  },
  {
    name: 'The Bullring',
    location: 'Mexico',
    scroll: 210,
    featureWeights: { rail: 2, ramp: 2.4, gap: 3.4, flat: 1 },
    railHeightRange: [72, 120],
    gapWidthRange: [120, 175],
    goals: { bronze: 15000, silver: 30000, gold: 50000 },
    palette: { sky: ['#1a0608', '#3a0e10', '#661a12'], ground: '#20100c', accent: '#ffb020' },
  },
];

// ---------------------------------------------------------------------------
// Medal-gated progression
// ---------------------------------------------------------------------------

/** Orders the tiers so two can be compared or a best-of picked. */
export function tierRank(tier: GoalTier): number {
  switch (tier) {
    case 'gold':
      return 3;
    case 'silver':
      return 2;
    case 'bronze':
      return 1;
    default:
      return 0;
  }
}

/** The better of two tiers (ties keep the first). */
export function higherTier(a: GoalTier, b: GoalTier): GoalTier {
  return tierRank(a) >= tierRank(b) ? a : b;
}

/**
 * Whether a level is playable given the best tier earned on each earlier level.
 * The first level is always open; every other unlocks once the one before it has
 * earned at least a bronze medal.
 */
export function isLevelUnlocked(index: number, tiers: readonly GoalTier[]): boolean {
  if (index <= 0) return true;
  if (index >= TONY_LEVELS.length) return false;
  return tierRank(tiers[index - 1] ?? 'none') >= tierRank('bronze');
}

/** How many levels are currently unlocked (they open in order). */
export function unlockedLevelCount(tiers: readonly GoalTier[]): number {
  let count = 1;
  for (let i = 1; i < TONY_LEVELS.length; i++) {
    if (!isLevelUnlocked(i, tiers)) break;
    count++;
  }
  return count;
}
