// Pure game logic for The Oregon Trail. Everything that touches randomness takes
// an explicit `rand: () => number` so tests can feed makeRng(seed) and get
// deterministic results. The React component (OregonTrail.tsx) is only a UI shell
// that calls into these functions and renders the returned state + event log.

import { Rand, randInt, pick, chance, weightedPick, clamp } from './rng';

export type Profession = 'banker' | 'carpenter' | 'farmer';
export type Pace = 'steady' | 'strenuous' | 'grueling';
export type Rations = 'filling' | 'meager' | 'bare-bones';
export type RiverMethod = 'ford' | 'caulk' | 'ferry';
export type Status = 'traveling' | 'atRiver' | 'dead' | 'arrived';

export interface Member {
  name: string;
  alive: boolean;
  illness: string | null;
}

export interface Cart {
  oxen: number;
  food: number; // lbs
  ammo: number; // boxes (20 bullets each)
  clothing: number; // sets
  parts: number; // spare wagon parts
}

export interface GameState {
  profession: Profession;
  cash: number;
  oxen: number;
  food: number; // lbs
  ammo: number; // boxes
  clothing: number; // sets
  parts: number; // spare wagon parts
  miles: number;
  day: number; // days elapsed since departure
  health: number; // 0..100, higher is healthier
  members: Member[];
  landmarkIndex: number; // index into LANDMARKS of the last one reached
  pace: Pace;
  rations: Rations;
  status: Status;
  causeOfDeath?: string;
}

export interface Landmark {
  name: string;
  miles: number;
  river?: boolean;
}

export interface Tombstone {
  name: string;
  miles: number;
  epitaph: string;
  date: string;
}

export interface StepResult {
  state: GameState;
  events: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LANDMARKS: readonly Landmark[] = [
  { name: 'Independence, Missouri', miles: 0 },
  { name: 'Kansas River Crossing', miles: 100, river: true },
  { name: 'Fort Kearney', miles: 300 },
  { name: 'Chimney Rock', miles: 550 },
  { name: 'Fort Laramie', miles: 650 },
  { name: 'Independence Rock', miles: 830 },
  { name: 'South Pass', miles: 950 },
  { name: 'Fort Bridger', miles: 1050 },
  { name: 'Snake River Crossing', miles: 1300, river: true },
  { name: 'The Dalles', miles: 1700 },
  { name: 'Willamette Valley', miles: 2000 },
];

export const TOTAL_MILES = 2000;
export const HUNT_BAG_CAP = 100; // max lbs of meat you can haul back per trip
export const FERRY_COST = 8;

export const PRICES = {
  oxen: 40, // per ox
  food: 0.2, // per lb
  ammo: 2, // per box
  clothing: 10, // per set
  parts: 10, // per spare part
} as const;

const PROFESSION_CASH: Record<Profession, number> = {
  banker: 1600,
  carpenter: 800,
  farmer: 400,
};

const PROFESSION_MULT: Record<Profession, number> = {
  banker: 1,
  carpenter: 2,
  farmer: 3,
};

const RATION_LBS: Record<Rations, number> = {
  filling: 3,
  meager: 2,
  'bare-bones': 1,
};

const PACE_SPEED: Record<Pace, number> = {
  steady: 1,
  strenuous: 1.35,
  grueling: 1.7,
};

const ILLNESSES = ['dysentery', 'cholera', 'typhoid', 'measles', 'a fever'] as const;

const DEFAULT_MEMBERS = ['You', 'Charles', 'Hannah', 'Willie', 'Ada'];

// ---------------------------------------------------------------------------
// Store / setup math
// ---------------------------------------------------------------------------

export function professionCash(p: Profession): number {
  return PROFESSION_CASH[p];
}

export function scoreMultiplier(p: Profession): number {
  return PROFESSION_MULT[p];
}

/** Total cost of a shopping cart, in dollars (rounded to the cent). */
export function computeStoreTotal(cart: Cart): number {
  const raw =
    cart.oxen * PRICES.oxen +
    cart.food * PRICES.food +
    cart.ammo * PRICES.ammo +
    cart.clothing * PRICES.clothing +
    cart.parts * PRICES.parts;
  return Math.round(raw * 100) / 100;
}

/** Cash left after buying `cart` on `profession`'s starting budget. */
export function remainingCash(profession: Profession, cart: Cart): number {
  return Math.round((professionCash(profession) - computeStoreTotal(cart)) * 100) / 100;
}

export function canAfford(profession: Profession, cart: Cart): boolean {
  return remainingCash(profession, cart) >= 0;
}

export function initialState(profession: Profession, cart: Cart, names?: string[]): GameState {
  const roster = (names && names.length ? names : DEFAULT_MEMBERS).slice(0, 5);
  return {
    profession,
    cash: remainingCash(profession, cart),
    oxen: cart.oxen,
    food: cart.food,
    ammo: cart.ammo,
    clothing: cart.clothing,
    parts: cart.parts,
    miles: 0,
    day: 0,
    health: 100,
    members: roster.map((name) => ({ name, alive: true, illness: null })),
    landmarkIndex: 0,
    pace: 'steady',
    rations: 'filling',
    status: 'traveling',
  };
}

// ---------------------------------------------------------------------------
// Per-day consumption / progression
// ---------------------------------------------------------------------------

export function aliveCount(state: GameState): number {
  return state.members.filter((m) => m.alive).length;
}

/** Food eaten in a single day given rations and how many people are alive. */
export function foodPerDay(state: GameState): number {
  return RATION_LBS[state.rations] * Math.max(1, aliveCount(state));
}

/** Miles covered in a single day. Needs at least one ox to move. */
export function milesPerDay(state: GameState, rand: Rand): number {
  if (state.oxen <= 0) return 0;
  const base = 8 + Math.min(state.oxen, 8) * 1.5;
  const healthFactor = 0.6 + (state.health / 100) * 0.4; // sick parties crawl
  const jitter = 0.85 + rand() * 0.3;
  return Math.round(base * PACE_SPEED[state.pace] * healthFactor * jitter);
}

/** Net health change for a day (before illness/event effects). */
export function healthDelta(state: GameState, hasFood: boolean): number {
  let d = 0;
  if (state.pace === 'strenuous') d -= 2;
  if (state.pace === 'grueling') d -= 5;
  if (state.rations === 'filling') d += 3;
  if (state.rations === 'bare-bones') d -= 4;
  if (!hasFood) d -= 12;
  if (state.clothing < aliveCount(state)) d -= 2; // under-dressed for the cold
  return d;
}

// ---------------------------------------------------------------------------
// Illness / death helpers
// ---------------------------------------------------------------------------

function firstAlive(state: GameState, rand: Rand): Member | null {
  const alive = state.members.filter((m) => m.alive);
  if (!alive.length) return null;
  return pick(rand, alive);
}

/** Decide whether the party is dead and why. Mutates nothing; returns cause. */
export function deathCheck(state: GameState): string | null {
  if (aliveCount(state) <= 0) return 'the whole party has perished';
  if (state.health <= 0) {
    const sick = state.members.find((m) => m.alive && m.illness);
    return sick?.illness ? `died of ${sick.illness}` : 'died of exhaustion';
  }
  if (state.oxen <= 0) return 'the wagon is stranded with no oxen';
  return null;
}

// ---------------------------------------------------------------------------
// Random daily events
// ---------------------------------------------------------------------------

function applyEvent(state: GameState, events: string[], rand: Rand): GameState {
  const s = { ...state, members: state.members.map((m) => ({ ...m })) };
  const kind = weightedPick<string>(rand, [
    ['illness', 5],
    ['thief', 3],
    ['wagon', 3],
    ['badwater', 3],
    ['snakebite', 2],
    ['weather', 3],
    ['berries', 3],
    ['lostmember', 1],
  ]);

  switch (kind) {
    case 'illness': {
      const victim = firstAlive(s, rand);
      const ill = pick(rand, ILLNESSES);
      if (victim) {
        victim.illness = ill;
        s.health = clamp(s.health - randInt(rand, 12, 26), 0, 100);
        events.push(`${victim.name} has come down with ${ill}.`);
      }
      break;
    }
    case 'thief': {
      const roll = rand();
      if (roll < 0.4 && s.food > 0) {
        const lost = Math.min(s.food, randInt(rand, 20, 60));
        s.food -= lost;
        events.push(`A thief made off with ${lost} lbs of food in the night!`);
      } else if (roll < 0.7 && s.parts > 0) {
        s.parts -= 1;
        events.push('A thief stole one of your spare parts!');
      } else if (s.oxen > 1) {
        s.oxen -= 1;
        events.push('Raiders ran off with one of your oxen!');
      } else {
        s.food = Math.max(0, s.food - 15);
        events.push('A thief rummaged through your wagon and took some food.');
      }
      break;
    }
    case 'wagon': {
      const part = pick(rand, ['wheel', 'axle', 'wagon tongue']);
      if (s.parts > 0) {
        s.parts -= 1;
        events.push(`A broken ${part}! You used a spare part to fix it.`);
      } else {
        const lost = randInt(rand, 2, 5);
        s.day += lost;
        s.health = clamp(s.health - 4, 0, 100);
        events.push(`A broken ${part} and no spare — you lose ${lost} days repairing it.`);
      }
      break;
    }
    case 'badwater': {
      s.health = clamp(s.health - randInt(rand, 6, 14), 0, 100);
      events.push('Bad water. Everyone feels queasy.');
      break;
    }
    case 'snakebite': {
      const victim = firstAlive(s, rand);
      s.health = clamp(s.health - randInt(rand, 8, 18), 0, 100);
      events.push(`${victim ? victim.name : 'Someone'} was bitten by a rattlesnake!`);
      break;
    }
    case 'weather': {
      s.health = clamp(s.health + 4, 0, 100);
      s.miles += randInt(rand, 3, 10);
      events.push('Fair weather and good trail — you make extra progress.');
      break;
    }
    case 'berries': {
      const found = randInt(rand, 10, 30);
      s.food += found;
      events.push(`You found wild berries and game. +${found} lbs of food.`);
      break;
    }
    case 'lostmember': {
      const victim = firstAlive(s, rand);
      if (victim && aliveCount(s) > 1) {
        victim.alive = false;
        victim.illness = victim.illness ?? 'a sudden illness';
        events.push(`${victim.name} has died of ${victim.illness}.`);
      } else {
        s.health = clamp(s.health - 15, 0, 100);
        events.push('A hard, cold night saps the party’s strength.');
      }
      break;
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// Advance a single day
// ---------------------------------------------------------------------------

/**
 * Advance one day of travel. Returns a fresh state plus any notable event lines.
 * Sets status to 'atRiver' when a river landmark is reached, 'arrived' at the
 * Willamette Valley, or 'dead' on a death check.
 */
export function advanceDay(state: GameState, rand: Rand): StepResult {
  const events: string[] = [];
  if (state.status !== 'traveling') return { state, events };

  let s: GameState = { ...state, members: state.members.map((m) => ({ ...m })) };
  s.day += 1;

  // Movement
  const gained = milesPerDay(s, rand);
  s.miles = Math.min(TOTAL_MILES, s.miles + gained);

  // Food consumption
  const need = foodPerDay(s);
  const hasFood = s.food >= need;
  s.food = Math.max(0, s.food - need);
  if (!hasFood && need > 0) {
    events.push('You are out of food! The party goes hungry.');
  }

  // Health drift
  s.health = clamp(s.health + healthDelta(s, hasFood), 0, 100);

  // Random daily event (~13% of days)
  if (chance(rand, 0.13)) {
    s = applyEvent(s, events, rand);
  }

  // Landmark progression — reach every landmark whose mile marker we've passed.
  while (
    s.landmarkIndex + 1 < LANDMARKS.length &&
    s.miles >= LANDMARKS[s.landmarkIndex + 1].miles
  ) {
    s.landmarkIndex += 1;
    const lm = LANDMARKS[s.landmarkIndex];
    events.push(`You have reached ${lm.name}.`);
    if (lm.name === 'Willamette Valley') {
      s.miles = TOTAL_MILES;
      s.status = 'arrived';
      return { state: s, events };
    }
    if (lm.river) {
      // Park at the river until the player picks a crossing method.
      s.miles = lm.miles;
      s.status = 'atRiver';
      return { state: s, events };
    }
  }

  // Death check
  const cause = deathCheck(s);
  if (cause) {
    s.status = 'dead';
    s.causeOfDeath = cause;
    events.push(`The journey ends: ${cause}.`);
  }

  return { state: s, events };
}

/**
 * Travel forward until something notable happens (an event, a landmark, a river,
 * death, or arrival) or up to `maxDays` uneventful days pass. Keeps the "press
 * Continue and see what happens" rhythm without a click per day.
 */
export function travel(state: GameState, rand: Rand, maxDays = 6): StepResult {
  let s = state;
  const events: string[] = [];
  for (let i = 0; i < maxDays; i++) {
    const step = advanceDay(s, rand);
    s = step.state;
    events.push(...step.events);
    if (s.status !== 'traveling') break;
    if (step.events.length > 0) break;
  }
  return { state: s, events };
}

// ---------------------------------------------------------------------------
// River crossings
// ---------------------------------------------------------------------------

/** River depth in feet for the upcoming crossing. */
export function riverDepth(rand: Rand): number {
  return randInt(rand, 2, 12);
}

/**
 * Resolve a river crossing. Outcome depends on the chosen method and the river
 * depth. Deep fords can drown oxen, ruin food, or take a party member.
 */
export function resolveRiver(
  state: GameState,
  method: RiverMethod,
  depth: number,
  rand: Rand,
): StepResult {
  const events: string[] = [];
  const s: GameState = { ...state, members: state.members.map((m) => ({ ...m })) };

  // Danger scales with depth; each method shifts it.
  let danger: number;
  if (method === 'ferry') {
    danger = 0.05;
    s.cash = Math.max(0, s.cash - FERRY_COST);
    s.day += 2; // waiting your turn at the ferry
    events.push(`You paid $${FERRY_COST} and waited for the ferry.`);
  } else if (method === 'caulk') {
    danger = depth <= 4 ? 0.1 : 0.15 + (depth - 4) * 0.05;
    events.push('You caulk the wagon and float it across.');
  } else {
    // ford
    danger = depth <= 3 ? 0.08 : 0.2 + (depth - 3) * 0.09;
    events.push('You attempt to ford the river.');
  }
  danger = clamp(danger, 0, 0.95);

  if (chance(rand, danger)) {
    const mishap = weightedPick<string>(rand, [
      ['food', 4],
      ['ox', 3],
      ['member', 2],
    ]);
    if (mishap === 'food') {
      const lost = Math.min(s.food, randInt(rand, 30, 90));
      s.food -= lost;
      events.push(`The wagon tipped and ${lost} lbs of food washed away!`);
    } else if (mishap === 'ox' && s.oxen > 0) {
      s.oxen -= 1;
      events.push('An ox was swept away by the current and drowned!');
    } else {
      const victim = firstAlive(s, rand);
      if (victim && aliveCount(s) > 1) {
        victim.alive = false;
        events.push(`${victim.name} drowned crossing the river!`);
      } else {
        s.health = clamp(s.health - 25, 0, 100);
        events.push('You nearly drowned crossing the river.');
      }
    }
  } else {
    events.push('You made it across safely.');
  }

  s.status = 'traveling';
  const cause = deathCheck(s);
  if (cause) {
    s.status = 'dead';
    s.causeOfDeath = cause;
    events.push(`The journey ends: ${cause}.`);
  }
  return { state: s, events };
}

// ---------------------------------------------------------------------------
// Hunting
// ---------------------------------------------------------------------------

/** Meat (lbs) yielded by one animal of the given kind. */
export function animalMeat(kind: 'buffalo' | 'deer' | 'rabbit' | 'bird'): number {
  switch (kind) {
    case 'buffalo':
      return 350;
    case 'deer':
      return 50;
    case 'rabbit':
      return 12;
    case 'bird':
      return 8;
  }
}

/**
 * Resolve a hunt. `meatBagged` is the raw lbs from animals hit; `shotsFired` is
 * bullets spent. Meat carried home is capped at HUNT_BAG_CAP; ammo is deducted
 * in boxes of 20 (rounded up for the bullets used).
 */
export function resolveHunt(state: GameState, meatBagged: number, shotsFired: number): StepResult {
  const events: string[] = [];
  const s: GameState = { ...state };
  const carried = Math.min(HUNT_BAG_CAP, Math.max(0, Math.round(meatBagged)));
  const boxesUsed = Math.min(s.ammo, Math.ceil(Math.max(0, shotsFired) / 20));
  s.ammo = Math.max(0, s.ammo - boxesUsed);
  s.food += carried;
  s.day += 1; // a day spent hunting
  if (carried >= HUNT_BAG_CAP) {
    events.push(`You bagged more than you could carry — hauled back ${carried} lbs of meat.`);
  } else if (carried > 0) {
    events.push(`You brought back ${carried} lbs of meat.`);
  } else {
    events.push('You came back empty-handed.');
  }
  return { state: s, events };
}

// ---------------------------------------------------------------------------
// Scoring / tombstone
// ---------------------------------------------------------------------------

/** Final score. Higher professions (less starting cash) multiply the payout. */
export function computeScore(state: GameState): number {
  const alive = aliveCount(state);
  let pts =
    alive * 400 +
    state.oxen * 40 +
    Math.floor(state.food * 0.4) +
    Math.floor(state.cash) +
    state.parts * 20 +
    state.clothing * 10 +
    state.ammo * 5;
  pts += Math.floor(state.health * 2);
  pts += state.status === 'arrived' ? 500 : Math.floor(state.miles * 0.1);
  return Math.max(0, Math.round(pts * scoreMultiplier(state.profession)));
}

/** A calendar date string N days after March 1, 1848 (deterministic). */
export function formatDate(day: number): string {
  const d = new Date(1848, 2, 1);
  d.setDate(d.getDate() + Math.max(0, Math.floor(day)));
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function makeTombstone(state: GameState, leaderName: string, epitaph: string): Tombstone {
  return {
    name: leaderName || 'A pioneer',
    miles: state.miles,
    epitaph: epitaph || 'Rest in peace.',
    date: formatDate(state.day),
  };
}

export function nextLandmark(state: GameState): Landmark | null {
  const idx = state.landmarkIndex + 1;
  return idx < LANDMARKS.length ? LANDMARKS[idx] : null;
}
