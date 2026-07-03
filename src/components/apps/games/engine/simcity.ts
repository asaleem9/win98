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
  | 'police'
  | 'firestation'
  | 'park'
  | 'rubble';

export type Tool =
  | 'bulldoze'
  | 'road'
  | 'power'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'powerplant'
  | 'police'
  | 'firestation'
  | 'park';

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

// A twister crosses the map along a drifting path, pulping whatever it touches.
export interface Tornado {
  x: number;
  y: number;
  vx: number; // drift per step, roughly one tile
  vy: number;
  steps: number; // life remaining
}

// A truck launched from a fire station toward a blaze. `path` is a list of tile
// indices (station first, a road tile beside the fire last); `pos` is the
// fractional position along it so the renderer can slide the truck smoothly.
export interface FireTruck {
  path: number[];
  pos: number;
  target: number; // the burning tile it is racing to douse
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
  policeFunding: number; // percent, 0..100
  fireFunding: number; // percent, 0..100
  month: number; // total months elapsed (year = 1900 + month/12)
  population: number;
  jobs: number;
  demand: Demand;
  income: number;
  expenses: number;
  monster: Monster | null;
  tornado: Tornado | null;
  truck: FireTruck | null;
}

export const MAX_LEVEL = 5;
export const POP_PER_LEVEL = 50;
export const JOBS_PER_LEVEL = 50;
export const DEV_THRESHOLD = 0.15;
const GROW_RATE = 0.6; // scales demand into a per-tick growth probability
const DECAY_RATE = 0.25; // per-tick abandonment probability when unserviced
const FIRE_DURATION = 3;
const TAX_FACTOR = 1;

// One police station keeps this many citizens in line at full funding; one fire
// station suppresses this much blaze. Coverage below the population it must
// serve leaves a crime/fire gap.
const POLICE_CAPACITY = 3000;
const CRIME_GROWTH_PENALTY = 0.7; // how hard unchecked crime bites commercial growth

export const TOOL_COSTS: Record<Tool, number> = {
  bulldoze: 1,
  road: 10,
  power: 5,
  residential: 20,
  commercial: 20,
  industrial: 20,
  powerplant: 300,
  police: 500,
  firestation: 500,
  park: 50,
};

export const MAINTENANCE = {
  road: 1,
  powerplant: 10,
  police: 10, // scaled by policeFunding at settle time
  firestation: 10, // scaled by fireFunding
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
    policeFunding: 100,
    fireFunding: 100,
    month: 0,
    population: 0,
    jobs: 0,
    demand: { r: 0.35, c: 0, i: 0.4 },
    income: 0,
    expenses: 0,
    monster: null,
    tornado: null,
    truck: null,
  };
}

const CONDUCTS: ReadonlySet<TileType> = new Set<TileType>([
  'road',
  'power',
  'residential',
  'commercial',
  'industrial',
  'powerplant',
  'police',
  'firestation',
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
  let police = 0;
  let fire = 0;
  for (const t of city.grid) {
    if (t.type === 'road') roads++;
    else if (t.type === 'powerplant') plants++;
    else if (t.type === 'police') police++;
    else if (t.type === 'firestation') fire++;
  }
  const policeFunding = (city.policeFunding ?? 100) / 100;
  const fireFunding = (city.fireFunding ?? 100) / 100;
  const income = Math.round((s.population + s.jobs) * (city.taxRate / 100) * TAX_FACTOR);
  const expenses =
    roads * MAINTENANCE.road +
    plants * MAINTENANCE.powerplant +
    Math.round(police * MAINTENANCE.police * policeFunding) +
    Math.round(fire * MAINTENANCE.firestation * fireFunding);
  return { income, expenses, net: income - expenses };
}

function countType(grid: Tile[], type: TileType): number {
  let n = 0;
  for (const t of grid) if (t.type === type && t.fire === 0) n++;
  return n;
}

/**
 * Fraction of the citizenry a police force can actually cover. Each station
 * handles POLICE_CAPACITY people at full funding; a lightly funded or
 * understaffed force leaves gaps. An empty city is trivially safe (1).
 */
export function policeCoverage(city: CityState): number {
  const pop = computeStats(city.grid).population;
  if (pop <= 0) return 1;
  const stations = countType(city.grid, 'police');
  const capacity = stations * POLICE_CAPACITY * ((city.policeFunding ?? 100) / 100);
  return clamp(capacity / pop, 0, 1);
}

/** Crime rides on the gap between population and police coverage (0 calm..1 lawless). */
export function crimeFactor(city: CityState): number {
  return 1 - policeCoverage(city);
}

/** Zones (level > 0) that are wired for nothing — used for blackout headlines. */
export function unpoweredZoneCount(grid: Tile[]): number {
  let n = 0;
  for (const t of grid) if (isZone(t.type) && t.level > 0 && !t.powered && t.fire === 0) n++;
  return n;
}

/**
 * Per-tick chance that the fire brigade knocks a burning tile down a notch.
 * Scales straight off the fire budget so the slider visibly tames disasters.
 */
export function fireSuppressionProb(city: CityState): number {
  return clamp(((city.fireFunding ?? 100) / 100) * 0.5, 0, 1);
}

/** Fire-truck travel speed in tiles per tick — a well-funded brigade rolls faster. */
export function truckSpeed(city: CityState): number {
  return 1 + Math.round(((city.fireFunding ?? 100) / 100) * 2); // 1..3
}

/** Knock burning tiles down early where the brigade reaches them; saves buildings. */
export function suppressFires(city: CityState, rand: Rand): CityState {
  const prob = fireSuppressionProb(city);
  if (prob <= 0) return city;
  let touched = false;
  const grid = city.grid.map((t) => {
    if (t.fire > 0 && chance(rand, prob)) {
      touched = true;
      return { ...t, fire: t.fire - 1 }; // reaching 0 leaves the building standing
    }
    return t;
  });
  return touched ? { ...city, grid } : city;
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
  'police',
  'firestation',
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

// ---- Fire-truck dispatch --------------------------------------------------

function roadNeighbors(grid: Tile[], i: number, width: number, height: number): number[] {
  const x = i % width;
  const y = Math.floor(i / width);
  const out: number[] = [];
  for (const [dx, dy] of NEIGHBORS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny, width, height)) continue;
    const ni = idx(nx, ny, width);
    if (grid[ni].type === 'road' && grid[ni].fire === 0) out.push(ni);
  }
  return out;
}

/** True if a burning flammable tile sits orthogonally next to tile `i`. */
function touchesFire(grid: Tile[], i: number, width: number, height: number): boolean {
  const x = i % width;
  const y = Math.floor(i / width);
  for (const [dx, dy] of NEIGHBORS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny, width, height)) continue;
    if (grid[idx(nx, ny, width)].fire > 0) return true;
  }
  return false;
}

/**
 * Breadth-first search across road tiles from any of `starts` to the first road
 * tile that borders a fire. Returns the tile-index path (start..fireside road)
 * or null when no drivable route reaches the blaze. Pure and deterministic.
 */
export function roadPathToFire(city: CityState, starts: number[]): number[] | null {
  const { grid, width, height } = city;
  const prev = new Map<number, number>();
  const seen = new Set<number>(starts);
  const queue: number[] = [...starts];
  for (const s of starts) {
    if (grid[s].type === 'road' && grid[s].fire === 0 && touchesFire(grid, s, width, height)) {
      return [s];
    }
  }
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    for (const ni of roadNeighbors(grid, cur, width, height)) {
      if (seen.has(ni)) continue;
      seen.add(ni);
      prev.set(ni, cur);
      if (touchesFire(grid, ni, width, height)) {
        const path: number[] = [ni];
        let back = cur;
        while (back !== -1) {
          path.unshift(back);
          back = prev.has(back) ? (prev.get(back) as number) : -1;
        }
        return path;
      }
      queue.push(ni);
    }
  }
  return null;
}

/**
 * Send the nearest able fire station's truck toward the nearest blaze. Returns a
 * truck (station tile first, then the road route) or null when no station has a
 * road path to any fire. If a truck is already out, keep it.
 */
export function dispatchTruck(city: CityState): FireTruck | null {
  if (city.truck) return city.truck;
  const { grid, width, height } = city;
  const stations: number[] = [];
  for (let i = 0; i < grid.length; i++) {
    if (grid[i].type === 'firestation' && grid[i].fire === 0) stations.push(i);
  }
  if (!stations.length) return null;

  let best: FireTruck | null = null;
  for (const station of stations) {
    const starts = roadNeighbors(grid, station, width, height);
    if (!starts.length) continue;
    const path = roadPathToFire(city, starts);
    if (!path) continue;
    // Find the actual burning tile this route ends beside.
    const last = path[path.length - 1];
    const lx = last % width;
    const ly = Math.floor(last / width);
    let target = -1;
    for (const [dx, dy] of NEIGHBORS) {
      const nx = lx + dx;
      const ny = ly + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      if (grid[idx(nx, ny, width)].fire > 0) {
        target = idx(nx, ny, width);
        break;
      }
    }
    if (target < 0) continue;
    const full = [station, ...path];
    if (!best || full.length < best.path.length) {
      best = { path: full, pos: 0, target };
    }
  }
  return best;
}

/**
 * Advance the active truck along its path. On arrival it douses the target fire
 * (the building survives) and heads home (truck cleared). A truck whose target
 * has already gone out is recalled immediately.
 */
export function stepTruck(city: CityState): CityState {
  const truck = city.truck;
  if (!truck) return city;
  if (city.grid[truck.target].fire === 0) return { ...city, truck: null };

  const pos = truck.pos + truckSpeed(city);
  const end = truck.path.length - 1;
  if (pos >= end) {
    const grid = cloneGrid(city.grid);
    grid[truck.target] = { ...grid[truck.target], fire: 0 };
    return { ...city, grid, truck: null };
  }
  return { ...city, truck: { ...truck, pos } };
}

// ---- Tornado --------------------------------------------------------------

const DRIFTS: ReadonlyArray<[number, number]> = [
  [1, 0],
  [1, 1],
  [0, 1],
  [1, -1],
];

/** Spin up a twister at a map edge, aimed roughly across the city. */
export function spawnTornado(city: CityState, rand: Rand, x?: number, y?: number): CityState {
  const px = x ?? randInt(rand, 0, city.width - 1);
  const py = y ?? 0;
  const [vx, vy] = DRIFTS[randInt(rand, 0, DRIFTS.length - 1)];
  return { ...city, tornado: { x: px, y: py, vx, vy, steps: randInt(rand, 10, 16) } };
}

/**
 * Move the tornado one drifting step and fling everything in a small radius to
 * rubble. It expires after its life runs out or when it wanders off the map.
 */
export function stepTornado(city: CityState, rand: Rand): CityState {
  if (!city.tornado) return city;
  const { width, height } = city;
  const grid = cloneGrid(city.grid);
  let { x, y, vx, vy, steps } = city.tornado;

  // Pulp the current tile and its orthogonal neighbors.
  for (const [dx, dy] of [[0, 0], ...NEIGHBORS] as ReadonlyArray<[number, number]>) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny, width, height)) continue;
    const ni = idx(nx, ny, width);
    if (grid[ni].type !== 'empty' && grid[ni].type !== 'rubble') {
      grid[ni] = { type: 'rubble', level: 0, powered: false, fire: 0 };
    }
  }

  // Drift, wobbling occasionally so the path isn't a straight line.
  if (chance(rand, 0.35)) {
    [vx, vy] = DRIFTS[randInt(rand, 0, DRIFTS.length - 1)];
  }
  x += vx;
  y += vy;
  steps -= 1;

  const gone = steps <= 0 || !inBounds(x, y, width, height);
  return { ...city, grid, tornado: gone ? null : { x, y, vx, vy, steps } };
}

/**
 * One month of simulation: run disasters, develop/abandon zones based on power,
 * roads and demand, then tally population/jobs and settle the budget.
 */
export function tickCity(city: CityState, rand: Rand): CityState {
  let state = city;

  // 1. Disasters resolve first, then the fire brigade responds.
  if (state.grid.some((t) => t.fire > 0)) {
    state = spreadFire(state, rand);
    state = suppressFires(state, rand);
    state = { ...state, truck: dispatchTruck(state) };
  } else if (state.truck) {
    state = { ...state, truck: null };
  }
  if (state.truck) state = stepTruck(state);
  if (state.monster) state = stepMonster(state, rand);
  if (state.tornado) state = stepTornado(state, rand);

  const { width, height } = state;
  const grid = cloneGrid(state.grid);

  // 2. Power + demand snapshot for this tick. Crime dampens commercial growth.
  const powered = computePowerGrid(grid, width, height);
  const preStats = computeStats(grid);
  const demand = computeDemand(preStats);
  const crime = crimeFactor(state);

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
      const safety = t.type === 'commercial' ? 1 - crime * CRIME_GROWTH_PENALTY : 1;
      if (t.level < MAX_LEVEL && chance(rand, d * GROW_RATE * safety)) t.level += 1;
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

// ---- Newspaper ------------------------------------------------------------

/** Highest milestone the population has already reached, or null below Village. */
export function milestoneForPopulation(pop: number): Milestone | null {
  let reached: Milestone | null = null;
  for (const m of MILESTONES) if (pop >= m.pop) reached = m;
  return reached;
}

export interface NewsEdition {
  masthead: string;
  date: string;
  headline: string;
  stories: string[];
}

const MASTHEAD = 'The Emulation Times';

function activeDisaster(state: CityState): 'tornado' | 'monster' | 'fire' | null {
  if (state.tornado) return 'tornado';
  if (state.monster) return 'monster';
  if (state.grid.some((t) => t.fire > 0)) return 'fire';
  return null;
}

/**
 * The lead headline, chosen from real sim signals in priority order: a fresh
 * milestone trumps all, then any active disaster, then blackouts, crime waves,
 * heavy taxes, and finally the mood of a quiet month. Pure — no RNG, so a given
 * state always prints the same front page.
 */
export function generateHeadline(state: CityState, milestone?: Milestone | null): string {
  const pop = state.population;
  if (milestone) return `OUR CITY REACHES ${milestone.title.toUpperCase()} STATUS`;

  const disaster = activeDisaster(state);
  if (disaster === 'tornado') return 'TWISTER CARVES PATH OF RUIN THROUGH DOWNTOWN';
  if (disaster === 'monster') return 'MONSTER RAMPAGE! CITIZENS FLEE IN TERROR';
  if (disaster === 'fire') return 'INFERNO! FLAMES ENGULF CITY BLOCKS';

  if (unpoweredZoneCount(state.grid) >= 3) return 'BLACKOUT: RESIDENTS DEMAND THE LIGHTS BACK ON';
  if (pop >= 1000 && crimeFactor(state) > 0.5) return 'CRIME WAVE GRIPS THE STREETS';
  if (state.taxRate > 9) return `TAXPAYERS REVOLT OVER ${state.taxRate}% RATE`;
  if (pop >= 1000) return 'BOOM TIMES: CITY GROWS BY LEAPS AND BOUNDS';
  return 'MAYOR VOWS TO BUILD A BRIGHTER TOMORROW';
}

/**
 * Two to three supporting stories: the reason the edition printed plus flavor
 * pulled from funds, demand and services. Deterministic, like the headline.
 */
export function generateStories(state: CityState, milestone?: Milestone | null): string[] {
  const stories: string[] = [];
  const pop = state.population.toLocaleString();

  if (milestone) {
    stories.push(`${milestone.message}`);
  }

  const disaster = activeDisaster(state);
  if (disaster === 'fire') {
    stories.push('Fire crews battle blazes across the city. Officials urge mayors to fund the brigade and build more stations.');
  } else if (disaster === 'monster') {
    stories.push('A gigantic beast tramples everything in its path. The National Guard has been mobilized.');
  } else if (disaster === 'tornado') {
    stories.push('A violent twister has flattened whole blocks. Cleanup crews survey the rubble.');
  }

  if (unpoweredZoneCount(state.grid) >= 1) {
    stories.push('Whole neighborhoods sit in the dark. Engineers say a power plant and connecting lines are overdue.');
  }
  if (pop !== '0' && crimeFactor(state) > 0.5) {
    stories.push('With police stretched thin, petty crime is on the rise downtown. Business owners are worried.');
  }
  if (state.taxRate > 9) {
    stories.push(`City Hall's ${state.taxRate}% tax rate draws grumbles at the diner counter, though the coffers are grateful.`);
  }
  if (state.cash < 0) {
    stories.push('The treasury has slipped into the red. Advisers warn of belt-tightening ahead.');
  }

  if (stories.length < 2) {
    stories.push(`Population holds at ${pop}. Surveyors note fresh demand for ${topDemand(state.demand)} development.`);
  }
  if (stories.length < 2) {
    stories.push('A quiet month at City Hall. The mayor was seen cutting a ribbon at the new park.');
  }
  return stories.slice(0, 3);
}

function topDemand(d: Demand): string {
  const entries: [string, number][] = [
    ['residential', d.r],
    ['commercial', d.c],
    ['industrial', d.i],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

/** Assemble a full front page for the given state (and optional milestone event). */
export function generateEdition(state: CityState, milestone?: Milestone | null): NewsEdition {
  return {
    masthead: MASTHEAD,
    date: `${cityMonthName(state.month)} ${cityYear(state.month)}`,
    headline: generateHeadline(state, milestone),
    stories: generateStories(state, milestone),
  };
}

export function cityYear(month: number): number {
  return 1900 + Math.floor(month / 12);
}

export function cityMonthName(month: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[((month % 12) + 12) % 12];
}
