// Pure SimCity simulation. No React, no canvas, no Math.random/Date.now — every
// stochastic decision takes a `rand: () => number` so the whole thing is
// deterministic under makeRng(seed) and unit-testable. SimCity.tsx owns the
// React state and simply threads a state object through these functions.

import { Rand, chance, clamp, randInt } from './rng';

export type TileType =
  | 'empty'
  | 'road'
  | 'power'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'powerplant'
  | 'rubble';

export type Tool =
  | 'bulldoze'
  | 'road'
  | 'power'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'powerplant';

export interface Tile {
  type: TileType;
  level: number; // zone development 0..MAX_LEVEL
  powered: boolean;
  fire: number; // >0 = burning, counts down each tick
}

export interface Monster {
  x: number;
  y: number;
  steps: number; // stomps remaining
}

export interface Demand {
  r: number; // 0..1
  c: number;
  i: number;
}

export interface CityState {
  width: number;
  height: number;
  grid: Tile[]; // row-major, length width*height
  cash: number;
  taxRate: number; // percent, 0..20
  month: number; // total months elapsed (year = 1900 + month/12)
  population: number;
  jobs: number;
  demand: Demand;
  income: number;
  expenses: number;
  monster: Monster | null;
}

export const MAX_LEVEL = 5;
export const POP_PER_LEVEL = 50;
export const JOBS_PER_LEVEL = 50;
export const DEV_THRESHOLD = 0.15;
const GROW_RATE = 0.6; // scales demand into a per-tick growth probability
const DECAY_RATE = 0.25; // per-tick abandonment probability when unserviced
const FIRE_DURATION = 3;
const TAX_FACTOR = 1;

export const TOOL_COSTS: Record<Tool, number> = {
  bulldoze: 1,
  road: 10,
  power: 5,
  residential: 20,
  commercial: 20,
  industrial: 20,
  powerplant: 300,
};

export const MAINTENANCE = {
  road: 1,
  powerplant: 10,
};

export interface Milestone {
  pop: number;
  title: string;
  message: string;
}

export const MILESTONES: Milestone[] = [
  { pop: 1000, title: 'Village', message: 'Your settlement is now a Village! Word is spreading that this is a fine place to build a home.' },
  { pop: 2000, title: 'Town', message: 'Congratulations, Mayor — your Village has grown into a bustling Town.' },
  { pop: 10000, title: 'City', message: 'It is official: you preside over a proper City. The skyline is starting to look impressive!' },
  { pop: 50000, title: 'Capital', message: 'Your City has become a regional Capital. Neighboring mayors watch with envy.' },
  { pop: 100000, title: 'Metropolis', message: 'A gleaming Metropolis! You have built one of the great cities of the age.' },
];

/** Milestones whose threshold sits in (prevPop, newPop] — i.e. just crossed. */
export function newMilestones(prevPop: number, newPop: number): Milestone[] {
  return MILESTONES.filter((m) => m.pop > prevPop && m.pop <= newPop);
}

export const idx = (x: number, y: number, width: number): number => y * width + x;

export function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function cloneTile(t: Tile): Tile {
  return { type: t.type, level: t.level, powered: t.powered, fire: t.fire };
}

function cloneGrid(grid: Tile[]): Tile[] {
  return grid.map(cloneTile);
}

export function createCity(width: number, height: number, cash = 20000): CityState {
  const grid: Tile[] = Array.from({ length: width * height }, () => ({
    type: 'empty' as TileType,
    level: 0,
    powered: false,
    fire: 0,
  }));
  return {
    width,
    height,
    grid,
    cash,
    taxRate: 7,
    month: 0,
    population: 0,
    jobs: 0,
    demand: { r: 0.35, c: 0, i: 0.4 },
    income: 0,
    expenses: 0,
    monster: null,
  };
}

const CONDUCTS: ReadonlySet<TileType> = new Set<TileType>([
  'road',
  'power',
  'residential',
  'commercial',
  'industrial',
  'powerplant',
]);

const ZONE_TYPES: ReadonlySet<TileType> = new Set<TileType>([
  'residential',
  'commercial',
  'industrial',
]);

export function isZone(type: TileType): boolean {
  return ZONE_TYPES.has(type);
}

const NEIGHBORS: ReadonlyArray<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Flood power out from every power plant. Power conducts through roads, power
 * lines and any developed/zoned tile (but not through empty ground, rubble or a
 * burning tile). Returns a boolean array parallel to the grid.
 */
export function computePowerGrid(grid: Tile[], width: number, height: number): boolean[] {
  const powered = new Array<boolean>(width * height).fill(false);
  const queue: number[] = [];
  for (let i = 0; i < grid.length; i++) {
    if (grid[i].type === 'powerplant' && grid[i].fire === 0) {
      powered[i] = true;
      queue.push(i);
    }
  }
  while (queue.length) {
    const cur = queue.pop() as number;
    const x = cur % width;
    const y = Math.floor(cur / width);
    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      const ni = idx(nx, ny, width);
      if (powered[ni]) continue;
      const t = grid[ni];
      if (t.fire === 0 && CONDUCTS.has(t.type)) {
        powered[ni] = true;
        queue.push(ni);
      }
    }
  }
  return powered;
}

/** True if any orthogonal neighbor is a (non-burning) road. */
export function hasRoadAccess(grid: Tile[], x: number, y: number, width: number, height: number): boolean {
  for (const [dx, dy] of NEIGHBORS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny, width, height)) continue;
    const t = grid[idx(nx, ny, width)];
    if (t.type === 'road' && t.fire === 0) return true;
  }
  return false;
}

export interface CityStats {
  population: number;
  jobs: number;
  comJobs: number;
  indJobs: number;
}

export function computeStats(grid: Tile[]): CityStats {
  let population = 0;
  let comJobs = 0;
  let indJobs = 0;
  for (const t of grid) {
    if (t.fire > 0) continue;
    if (t.type === 'residential') population += t.level * POP_PER_LEVEL;
    else if (t.type === 'commercial') comJobs += t.level * JOBS_PER_LEVEL;
    else if (t.type === 'industrial') indJobs += t.level * JOBS_PER_LEVEL;
  }
  return { population, jobs: comJobs + indJobs, comJobs, indJobs };
}

/**
 * RCI demand from the population/jobs balance. Residents want jobs; shops and
 * factories want customers/workers. Small base seeds bootstrap an empty map.
 */
export function computeDemand(stats: CityStats): Demand {
  const { population, jobs, comJobs, indJobs } = stats;
  return {
    r: clamp(0.35 + (jobs - population) / 800, 0, 1),
    c: clamp((population - comJobs * 3) / 600, 0, 1),
    i: clamp(0.4 + (population - indJobs * 3) / 600, 0, 1),
  };
}

function demandFor(type: TileType, d: Demand): number {
  if (type === 'residential') return d.r;
  if (type === 'commercial') return d.c;
  if (type === 'industrial') return d.i;
  return 0;
}

/**
 * Deterministic development gate: a zone can only grow when it is powered, has
 * road access and there is demand for its type. The random tick uses this to
 * decide *whether* growth is even possible — growth never happens otherwise.
 */
export function canDevelop(city: CityState, x: number, y: number, powered?: boolean[], demand?: Demand): boolean {
  const { grid, width, height } = city;
  const i = idx(x, y, width);
  const t = grid[i];
  if (!isZone(t.type) || t.fire > 0) return false;
  const pw = powered ? powered[i] : computePowerGrid(grid, width, height)[i];
  if (!pw) return false;
  if (!hasRoadAccess(grid, x, y, width, height)) return false;
  const d = demand ?? computeDemand(computeStats(grid));
  return demandFor(t.type, d) > DEV_THRESHOLD;
}

export interface Budget {
  income: number;
  expenses: number;
  net: number;
}

export function computeBudget(city: CityState, stats?: CityStats): Budget {
  const s = stats ?? computeStats(city.grid);
  let roads = 0;
  let plants = 0;
  for (const t of city.grid) {
    if (t.type === 'road') roads++;
    else if (t.type === 'powerplant') plants++;
  }
  const income = Math.round((s.population + s.jobs) * (city.taxRate / 100) * TAX_FACTOR);
  const expenses = roads * MAINTENANCE.road + plants * MAINTENANCE.powerplant;
  return { income, expenses, net: income - expenses };
}

/** Place a tool. Pure: returns the new grid + cost, or placed=false if a no-op. */
export function applyTool(
  grid: Tile[],
  width: number,
  height: number,
  x: number,
  y: number,
  tool: Tool,
): { grid: Tile[]; cost: number; placed: boolean } {
  if (!inBounds(x, y, width, height)) return { grid, cost: 0, placed: false };
  const i = idx(x, y, width);
  const cur = grid[i];

  if (tool === 'bulldoze') {
    if (cur.type === 'empty' && cur.fire === 0) return { grid, cost: 0, placed: false };
    const next = cloneGrid(grid);
    next[i] = { type: 'empty', level: 0, powered: false, fire: 0 };
    return { grid: next, cost: TOOL_COSTS.bulldoze, placed: true };
  }

  // Building tools: only on clear ground (empty or rubble), and not on itself.
  if (cur.fire > 0) return { grid, cost: 0, placed: false };
  if (cur.type === tool) return { grid, cost: 0, placed: false };
  if (cur.type !== 'empty' && cur.type !== 'rubble') return { grid, cost: 0, placed: false };

  const next = cloneGrid(grid);
  next[i] = { type: tool as TileType, level: 0, powered: false, fire: 0 };
  return { grid: next, cost: TOOL_COSTS[tool], placed: true };
}

const FLAMMABLE: ReadonlySet<TileType> = new Set<TileType>([
  'residential',
  'commercial',
  'industrial',
  'powerplant',
]);

export function isFlammable(t: Tile): boolean {
  return FLAMMABLE.has(t.type);
}

/** Ignite the given tile (or a random flammable tile if none supplied). */
export function startFire(city: CityState, rand: Rand, x?: number, y?: number): CityState {
  const grid = cloneGrid(city.grid);
  let target = -1;
  if (x !== undefined && y !== undefined && inBounds(x, y, city.width, city.height)) {
    target = idx(x, y, city.width);
  } else {
    const flammable: number[] = [];
    for (let i = 0; i < grid.length; i++) if (isFlammable(grid[i]) && grid[i].fire === 0) flammable.push(i);
    if (flammable.length) target = flammable[randInt(rand, 0, flammable.length - 1)];
  }
  if (target >= 0) grid[target] = { ...grid[target], fire: FIRE_DURATION };
  return { ...city, grid };
}

/** One step of fire: burning tiles spread to flammable neighbors then burn down. */
export function spreadFire(city: CityState, rand: Rand): CityState {
  const { width, height } = city;
  const grid = cloneGrid(city.grid);
  const burning: number[] = [];
  for (let i = 0; i < grid.length; i++) if (grid[i].fire > 0) burning.push(i);

  // Spread first (using the snapshot of who was burning this tick).
  for (const b of burning) {
    const x = b % width;
    const y = Math.floor(b / width);
    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      const ni = idx(nx, ny, width);
      const t = grid[ni];
      if (t.fire === 0 && isFlammable(t) && chance(rand, 0.45)) {
        grid[ni] = { ...t, fire: FIRE_DURATION };
      }
    }
  }
  // Burn down the tiles that were already alight.
  for (const b of burning) {
    const t = grid[b];
    const fire = t.fire - 1;
    if (fire <= 0) grid[b] = { type: 'rubble', level: 0, powered: false, fire: 0 };
    else grid[b] = { ...t, fire };
  }
  return { ...city, grid };
}

/** Drop a monster onto the map to stomp a path of destruction. */
export function spawnMonster(city: CityState, rand: Rand, x?: number, y?: number): CityState {
  const px = x ?? randInt(rand, 0, city.width - 1);
  const py = y ?? randInt(rand, 0, city.height - 1);
  return { ...city, monster: { x: px, y: py, steps: 14 } };
}

/** Advance the monster one tile, flattening whatever it steps on to rubble. */
export function stepMonster(city: CityState, rand: Rand): CityState {
  if (!city.monster) return city;
  const { width, height } = city;
  const grid = cloneGrid(city.grid);
  let { x, y, steps } = city.monster;

  // Flatten current tile.
  const here = idx(x, y, width);
  if (grid[here].type !== 'empty') grid[here] = { type: 'rubble', level: 0, powered: false, fire: 0 };

  // Wander to a random in-bounds neighbor.
  const options = NEIGHBORS.filter(([dx, dy]) => inBounds(x + dx, y + dy, width, height));
  const [mx, my] = options[randInt(rand, 0, options.length - 1)];
  x += mx;
  y += my;
  steps -= 1;

  return { ...city, grid, monster: steps <= 0 ? null : { x, y, steps } };
}

/**
 * One month of simulation: run disasters, develop/abandon zones based on power,
 * roads and demand, then tally population/jobs and settle the budget.
 */
export function tickCity(city: CityState, rand: Rand): CityState {
  let state = city;

  // 1. Disasters resolve first.
  if (state.grid.some((t) => t.fire > 0)) state = spreadFire(state, rand);
  if (state.monster) state = stepMonster(state, rand);

  const { width, height } = state;
  const grid = cloneGrid(state.grid);

  // 2. Power + demand snapshot for this tick.
  const powered = computePowerGrid(grid, width, height);
  const preStats = computeStats(grid);
  const demand = computeDemand(preStats);

  // 3. Develop / abandon each zone tile.
  for (let i = 0; i < grid.length; i++) {
    const t = grid[i];
    t.powered = powered[i];
    if (!isZone(t.type) || t.fire > 0) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    const serviced = powered[i] && hasRoadAccess(grid, x, y, width, height);
    const d = demandFor(t.type, demand);
    if (serviced && d > DEV_THRESHOLD) {
      if (t.level < MAX_LEVEL && chance(rand, d * GROW_RATE)) t.level += 1;
    } else if (t.level > 0 && chance(rand, DECAY_RATE)) {
      t.level -= 1;
    }
  }

  // 4. Tally + budget.
  const stats = computeStats(grid);
  const budget = computeBudget({ ...state, grid }, stats);
  const finalDemand = computeDemand(stats);

  return {
    ...state,
    grid,
    cash: state.cash + budget.net,
    month: state.month + 1,
    population: stats.population,
    jobs: stats.jobs,
    demand: finalDemand,
    income: budget.income,
    expenses: budget.expenses,
  };
}

export function cityYear(month: number): number {
  return 1900 + Math.floor(month / 12);
}

export function cityMonthName(month: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[((month % 12) + 12) % 12];
}
