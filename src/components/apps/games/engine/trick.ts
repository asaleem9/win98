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

/**
 * Air tricks. Left/Right = flips, Up = Method Air, Down = Judo Air; Christ Air is
 * the double-tap Up when the special isn't armed. `manual` isn't an air trick — it
 * lives here so the combo can chain a manual link by id like any other trick.
 */
export const TRICKS: Record<string, TrickDef> = {
  kickflip: { id: 'kickflip', name: 'Kickflip', points: 100, type: 'flip', spin: 180 },
  heelflip: { id: 'heelflip', name: 'Heelflip', points: 120, type: 'flip', spin: 180 },
  grab: { id: 'grab', name: 'Method Air', points: 150, type: 'grab', spin: 0 },
  judo: { id: 'judo', name: 'Judo Air', points: 180, type: 'grab', spin: 0 },
  christ: { id: 'christ', name: 'Christ Air', points: 240, type: 'grab', spin: 0 },
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

/**
 * The special-meter hero trick, armed only when the meter is full. Named for
 * Tony's famous 900; geometrically we spin two clean rotations so it lands
 * upright rather than fakie, which our upright landing check would otherwise bail.
 */
export const THE_900: TrickDef = {
  id: 'the900',
  name: 'The 900',
  points: 2500,
  type: 'flip',
  spin: 720,
};

/** Base points for a trick id (0 if unknown). */
export function trickBasePoints(id: string): number {
  if (id === GRIND_TRICK.id) return GRIND_TRICK.points;
  if (id === THE_900.id) return THE_900.points;
  return TRICKS[id]?.points ?? 0;
}

export function trickSpin(id: string): number {
  if (id === GRIND_TRICK.id) return GRIND_TRICK.spin;
  if (id === THE_900.id) return THE_900.spin;
  return TRICKS[id]?.spin ?? 0;
}

export function trickName(id: string): string {
  if (id === GRIND_TRICK.id) return GRIND_TRICK.name;
  if (id === THE_900.id) return THE_900.name;
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
 * Add loose base points to a combo without extending the trick chain, so a held
 * manual or grind can trickle in points each frame without inflating the
 * multiplier every tick. Keeps the trick list reference — it isn't touched.
 */
export function addBasePoints(combo: ComboState, points: number): ComboState {
  return { tricks: combo.tricks, basePoints: combo.basePoints + points };
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
 *
 * Silver/gold goals were nudged up ~15-20% over the pre-manual tuning to absorb
 * the new scoring surface (manual-linked mega-combos, the 5,000 SKATE bonus and
 * the 2,500 base 900). Bronze is left untouched: it gates level unlocks, and the
 * new mechanics make bronze easier, not harder — a beginner still clears it.
 */
export const TONY_LEVELS: readonly LevelDef[] = [
  {
    name: 'The Hangar',
    location: 'Mulhawk Airfield',
    scroll: 150,
    featureWeights: { rail: 4, ramp: 2, gap: 0.6, flat: 3 },
    railHeightRange: [48, 80],
    gapWidthRange: [60, 100],
    goals: { bronze: 3000, silver: 9000, gold: 17000 },
    palette: { sky: ['#0a0a16', '#181410', '#211a08'], ground: '#16161c', accent: '#ccff00' },
  },
  {
    name: 'School II',
    location: 'Southern California',
    scroll: 158,
    featureWeights: { rail: 3.5, ramp: 2, gap: 0.9, flat: 2.6 },
    railHeightRange: [52, 86],
    gapWidthRange: [70, 110],
    goals: { bronze: 4000, silver: 11000, gold: 21000 },
    palette: { sky: ['#1a2a44', '#2a4468', '#3a5a80'], ground: '#2a2e38', accent: '#ffd23f' },
  },
  {
    name: 'Marseille',
    location: 'Marseille, France',
    scroll: 166,
    featureWeights: { rail: 3, ramp: 2.4, gap: 1.2, flat: 2.2 },
    railHeightRange: [56, 92],
    gapWidthRange: [80, 120],
    goals: { bronze: 5500, silver: 14000, gold: 26000 },
    palette: { sky: ['#0a2436', '#0e3a4a', '#116b6b'], ground: '#183034', accent: '#ff7ac2' },
  },
  {
    name: 'NY City',
    location: 'New York City, NY',
    scroll: 174,
    featureWeights: { rail: 2.6, ramp: 2.4, gap: 1.6, flat: 2 },
    railHeightRange: [60, 96],
    gapWidthRange: [90, 135],
    goals: { bronze: 7000, silver: 18000, gold: 32000 },
    palette: { sky: ['#0a0616', '#160a2a', '#241040'], ground: '#141018', accent: '#7c5cff' },
  },
  {
    name: 'Venice Beach',
    location: 'Venice, CA',
    scroll: 182,
    featureWeights: { rail: 2.2, ramp: 3, gap: 1.8, flat: 1.8 },
    railHeightRange: [64, 104],
    gapWidthRange: [100, 145],
    goals: { bronze: 9000, silver: 22000, gold: 39000 },
    palette: { sky: ['#2a1030', '#5a1e40', '#a83a2e'], ground: '#241820', accent: '#ff5c3a' },
  },
  {
    name: 'Skatestreet',
    location: 'Ventura, CA',
    scroll: 190,
    featureWeights: { rail: 2.6, ramp: 3.2, gap: 2, flat: 1.5 },
    railHeightRange: [68, 112],
    gapWidthRange: [95, 140],
    goals: { bronze: 11000, silver: 26000, gold: 45000 },
    palette: { sky: ['#101820', '#182430', '#243848'], ground: '#181c22', accent: '#3ad6ff' },
  },
  {
    name: 'Philadelphia',
    location: 'Philadelphia, PA',
    scroll: 200,
    featureWeights: { rail: 2.2, ramp: 2.2, gap: 2.8, flat: 1.2 },
    railHeightRange: [64, 108],
    gapWidthRange: [110, 160],
    goals: { bronze: 13000, silver: 30000, gold: 51000 },
    palette: { sky: ['#12161a', '#1c2228', '#2a3238'], ground: '#161a1c', accent: '#9bff5c' },
  },
  {
    name: 'The Bullring',
    location: 'Mexico',
    scroll: 210,
    featureWeights: { rail: 2, ramp: 2.4, gap: 3.4, flat: 1 },
    railHeightRange: [72, 120],
    gapWidthRange: [120, 175],
    goals: { bronze: 15000, silver: 34000, gold: 57000 },
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

// ---------------------------------------------------------------------------
// Manuals — the combo link
// ---------------------------------------------------------------------------

/** Down→Up reversal within this many seconds pops a manual off a landing. */
export const MANUAL_INPUT_WINDOW = 0.4;
/** Base points a held manual trickles into the combo per second balanced. */
export const MANUAL_POINTS_PER_SEC = 100;
/** A manual coasts to a stop and banks after this long, so a run always resolves. */
export const MANUAL_MAX_TIME = 6;

/**
 * A grounded balance link. Reuses the grind balance math: `balance` lives in
 * [-2, 2] and bails at +/- GRIND_BAIL_THRESHOLD. `time` drives the per-second
 * payout; `accrual` carries the sub-point remainder between frames.
 */
export interface ManualState {
  active: boolean;
  balance: number;
  drift: number;
  time: number;
  accrual: number;
}

export function emptyManual(): ManualState {
  return { active: false, balance: 0, drift: 0, time: 0, accrual: 0 };
}

/** Pop into a fresh manual with the rail/ground's natural pull. */
export function enterManual(drift: number): ManualState {
  return { active: true, balance: 0, drift, time: 0, accrual: 0 };
}

/**
 * Whether an Up press at `upAt` follows a Down press at `downAt` closely enough
 * to pop a manual. A negative `downAt` means Down was never primed.
 */
export function manualPopReady(downAt: number, upAt: number, window = MANUAL_INPUT_WINDOW): boolean {
  return downAt >= 0 && upAt >= downAt && upAt - downAt <= window;
}

export interface ManualStep {
  manual: ManualState;
  /** Whole base points earned this frame, ready to fold into the combo. */
  gained: number;
}

/**
 * Advance a manual one frame: drift the balance (corrected by `input`, -1 left /
 * +1 right), age it, and accrue the per-second payout. Returns the next state and
 * the whole points earned this step.
 */
export function updateManual(
  m: ManualState,
  input: number,
  dt: number,
  rate = MANUAL_POINTS_PER_SEC,
): ManualStep {
  const balance = updateGrindBalance(m.balance, m.drift, input, dt);
  const carried = m.accrual + rate * dt;
  const gained = Math.floor(carried);
  return {
    manual: { ...m, balance, time: m.time + dt, accrual: carried - gained },
    gained,
  };
}

export function manualHasBailed(m: ManualState): boolean {
  return grindHasBailed(m.balance);
}

/** A manual that has coasted past its max hold time cashes out on its own. */
export function manualExpired(m: ManualState, max = MANUAL_MAX_TIME): boolean {
  return m.time >= max;
}

// ---------------------------------------------------------------------------
// Combo banner text
// ---------------------------------------------------------------------------

/**
 * Human trick names for the running combo, with consecutive repeats collapsed to
 * "Name xN" — so a long grind reads "50-50 Grind x4" rather than a wall of it.
 */
export function comboTrickList(combo: ComboState): string[] {
  const out: string[] = [];
  let name = '';
  let run = 0;
  const flush = () => {
    if (run === 0) return;
    out.push(run > 1 ? `${name} x${run}` : name);
  };
  for (const id of combo.tricks) {
    const n = trickName(id);
    if (n === name) {
      run++;
    } else {
      flush();
      name = n;
      run = 1;
    }
  }
  flush();
  return out;
}

/** THPS-style banner: "Kickflip + 50-50 Grind + Manual". Empty for no combo. */
export function comboText(combo: ComboState): string {
  return comboTrickList(combo).join(' + ');
}

// ---------------------------------------------------------------------------
// S-K-A-T-E letters
// ---------------------------------------------------------------------------

export const SKATE_LETTERS = ['S', 'K', 'A', 'T', 'E'] as const;
export type SkateLetter = (typeof SKATE_LETTERS)[number];

/** Bonus banked once all five letters are grabbed in a single run. */
export const SKATE_BONUS = 5000;

/** A run's letter tally — one flag per letter, in S-K-A-T-E order. */
export function emptySkate(): boolean[] {
  return SKATE_LETTERS.map(() => false);
}

export function collectLetter(collected: readonly boolean[], index: number): boolean[] {
  return SKATE_LETTERS.map((_, i) => collected[i] === true || i === index);
}

export function skateCount(collected: readonly boolean[]): number {
  return collected.filter(Boolean).length;
}

export function skateComplete(collected: readonly boolean[]): boolean {
  return skateCount(collected) >= SKATE_LETTERS.length;
}

/** SKATE_BONUS once every letter is collected, otherwise 0. */
export function skateBonus(collected: readonly boolean[]): number {
  return skateComplete(collected) ? SKATE_BONUS : 0;
}

/**
 * Fold a completed run into the persistent per-level badge array. A level keeps
 * its badge once earned — a later incomplete run never clears it.
 */
export function mergeSkateBadge(
  badges: readonly boolean[],
  levelIndex: number,
  complete: boolean,
): boolean[] {
  return TONY_LEVELS.map((_, i) => (badges[i] === true) || (i === levelIndex && complete));
}

// ---------------------------------------------------------------------------
// Special meter
// ---------------------------------------------------------------------------

/** The meter is full — and the 900 armed — at this fill. */
export const SPECIAL_MAX = 100;

/** How much a landing feeds the special meter, scaled by combo length. */
export function specialGain(landing: Landing, comboSize: number): number {
  if (landing === 'clean') return 14 + comboSize * 4;
  if (landing === 'sketchy') return 6 + comboSize * 2;
  return 0;
}

/** Meter after a landing of the given quality and combo size, clamped to [0, MAX]. */
export function specialAfterLanding(fill: number, landing: Landing, comboSize: number): number {
  return clamp(fill + specialGain(landing, comboSize), 0, SPECIAL_MAX);
}

/** Full meter arms the 900. */
export function specialArmed(fill: number): boolean {
  return fill >= SPECIAL_MAX;
}

/** A bail dumps the whole meter. */
export function specialAfterBail(): number {
  return 0;
}

/** Firing the 900 spends the meter. */
export function spendSpecial(): number {
  return 0;
}
