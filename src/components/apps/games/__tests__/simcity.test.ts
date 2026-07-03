import { makeRng } from '../engine/rng';
import {
  createCity,
  applyTool,
  computePowerGrid,
  hasRoadAccess,
  computeStats,
  computeDemand,
  computeBudget,
  canDevelop,
  tickCity,
  startFire,
  spreadFire,
  spawnMonster,
  stepMonster,
  spawnTornado,
  stepTornado,
  roadPathToFire,
  dispatchTruck,
  stepTruck,
  suppressFires,
  policeCoverage,
  crimeFactor,
  fireSuppressionProb,
  truckSpeed,
  unpoweredZoneCount,
  generateHeadline,
  generateStories,
  generateEdition,
  milestoneForPopulation,
  newMilestones,
  idx,
  MAX_LEVEL,
  POP_PER_LEVEL,
  TOOL_COSTS,
  MAINTENANCE,
  Tool,
  CityState,
} from '../engine/simcity';

const W = 24;
const H = 18;

function put(city: CityState, x: number, y: number, tool: Tool): CityState {
  const res = applyTool(city.grid, city.width, city.height, x, y, tool);
  return { ...city, grid: res.grid };
}

/** Small city: a power plant, a residential zone next to it, and a road. */
function servicedCity(): CityState {
  let c = createCity(W, H);
  c = put(c, 0, 0, 'powerplant'); // conducts power
  c = put(c, 1, 0, 'residential'); // adjacent to plant -> powered
  c = put(c, 1, 1, 'road'); // adjacent to residential -> road access
  return c;
}

describe('power propagation', () => {
  it('flows from a power plant through conducting tiles', () => {
    let c = createCity(W, H);
    c = put(c, 0, 0, 'powerplant');
    c = put(c, 1, 0, 'power'); // power line
    c = put(c, 2, 0, 'residential');
    const powered = computePowerGrid(c.grid, W, H);
    expect(powered[idx(0, 0, W)]).toBe(true);
    expect(powered[idx(1, 0, W)]).toBe(true);
    expect(powered[idx(2, 0, W)]).toBe(true);
  });

  it('does not power tiles across an empty gap', () => {
    let c = createCity(W, H);
    c = put(c, 0, 0, 'powerplant');
    // gap at (1,0) is empty; zone at (2,0) is isolated
    c = put(c, 2, 0, 'residential');
    const powered = computePowerGrid(c.grid, W, H);
    expect(powered[idx(2, 0, W)]).toBe(false);
  });

  it('a burning plant supplies no power', () => {
    let c = createCity(W, H);
    c = put(c, 0, 0, 'powerplant');
    c = put(c, 1, 0, 'residential');
    c = startFire(c, makeRng(1), 0, 0);
    const powered = computePowerGrid(c.grid, W, H);
    expect(powered[idx(1, 0, W)]).toBe(false);
  });
});

describe('road access', () => {
  it('detects an adjacent road', () => {
    let c = createCity(W, H);
    c = put(c, 5, 5, 'residential');
    expect(hasRoadAccess(c.grid, 5, 5, W, H)).toBe(false);
    c = put(c, 5, 6, 'road');
    expect(hasRoadAccess(c.grid, 5, 5, W, H)).toBe(true);
  });
});

describe('zone development gating', () => {
  it('canDevelop requires power AND road access', () => {
    // powered but no road
    let c = createCity(W, H);
    c = put(c, 0, 0, 'powerplant');
    c = put(c, 1, 0, 'residential');
    expect(canDevelop(c, 1, 0)).toBe(false); // no road yet
    c = put(c, 1, 1, 'road');
    expect(canDevelop(c, 1, 0)).toBe(true); // now powered + road + base demand
  });

  it('grows a serviced zone but never an unpowered one', () => {
    const rand = makeRng(42);
    // serviced res zone
    let serviced = servicedCity();
    // unpowered res zone (road access but no power)
    let isolated = createCity(W, H);
    isolated = put(isolated, 10, 10, 'residential');
    isolated = put(isolated, 10, 11, 'road');

    for (let t = 0; t < 40; t++) {
      serviced = tickCity(serviced, rand);
      isolated = tickCity(isolated, rand);
    }
    expect(serviced.grid[idx(1, 0, W)].level).toBeGreaterThan(0);
    expect(serviced.population).toBeGreaterThan(0);
    // unpowered zone can never develop
    expect(isolated.grid[idx(10, 10, W)].level).toBe(0);
    expect(isolated.population).toBe(0);
  });

  it('never exceeds MAX_LEVEL', () => {
    const rand = makeRng(7);
    let c = servicedCity();
    for (let t = 0; t < 200; t++) c = tickCity(c, rand);
    for (const tile of c.grid) expect(tile.level).toBeLessThanOrEqual(MAX_LEVEL);
  });
});

describe('RCI demand', () => {
  it('empty city seeds residential and industrial demand', () => {
    const d = computeDemand(computeStats(createCity(W, H).grid));
    expect(d.r).toBeGreaterThan(0);
    expect(d.i).toBeGreaterThan(0);
    expect(d.c).toBe(0);
  });

  it('a large residential population creates commercial demand', () => {
    const stats = { population: 3000, jobs: 0, comJobs: 0, indJobs: 0 };
    const d = computeDemand(stats);
    expect(d.c).toBeGreaterThan(0);
  });

  it('plentiful jobs raise residential demand above the empty baseline', () => {
    const low = computeDemand({ population: 500, jobs: 0, comJobs: 0, indJobs: 0 });
    const high = computeDemand({ population: 500, jobs: 2000, comJobs: 1000, indJobs: 1000 });
    expect(high.r).toBeGreaterThan(low.r);
  });
});

describe('budget math', () => {
  it('income scales with tax rate, expenses with roads and plants', () => {
    let c = createCity(W, H);
    c = put(c, 0, 0, 'powerplant');
    c = put(c, 1, 0, 'road');
    c = put(c, 2, 0, 'road');
    // hand-set a residential population by developing a tile
    c.grid[idx(5, 5, W)] = { type: 'residential', level: 4, powered: true, fire: 0 };
    c.taxRate = 10;

    const stats = computeStats(c.grid);
    expect(stats.population).toBe(4 * POP_PER_LEVEL);

    const b = computeBudget(c, stats);
    // 200 pop * 10% = 20
    expect(b.income).toBe(Math.round((stats.population + stats.jobs) * 0.1));
    // 2 roads * 1 + 1 plant * 10 = 12
    expect(b.expenses).toBe(2 * MAINTENANCE.road + 1 * MAINTENANCE.powerplant);
    expect(b.net).toBe(b.income - b.expenses);
  });

  it('tick applies the net to cash', () => {
    const rand = makeRng(3);
    let c = createCity(W, H);
    c = put(c, 0, 0, 'powerplant'); // 10/month maintenance, no income yet
    const before = c.cash;
    c = tickCity(c, rand);
    expect(c.cash).toBe(before - MAINTENANCE.powerplant);
    expect(c.expenses).toBe(MAINTENANCE.powerplant);
  });
});

describe('tool placement', () => {
  it('charges the listed cost and blocks building on occupied tiles', () => {
    let c = createCity(W, H);
    const road = applyTool(c.grid, W, H, 3, 3, 'road');
    expect(road.placed).toBe(true);
    expect(road.cost).toBe(TOOL_COSTS.road);
    c = { ...c, grid: road.grid };
    // can't drop a residential zone on the road
    const blocked = applyTool(c.grid, W, H, 3, 3, 'residential');
    expect(blocked.placed).toBe(false);
    expect(blocked.cost).toBe(0);
    // bulldoze clears it
    const bull = applyTool(c.grid, W, H, 3, 3, 'bulldoze');
    expect(bull.placed).toBe(true);
    expect(bull.grid[idx(3, 3, W)].type).toBe('empty');
  });
});

describe('fire', () => {
  it('spreads to adjacent flammable tiles and leaves rubble', () => {
    const rand = makeRng(5);
    let c = createCity(W, H);
    // a row of houses
    for (let x = 3; x <= 8; x++) c = put(c, x, 4, 'residential');
    c = startFire(c, rand, 3, 4);
    expect(c.grid[idx(3, 4, W)].fire).toBeGreaterThan(0);

    let spread = false;
    let rubble = false;
    for (let t = 0; t < 12; t++) {
      c = spreadFire(c, rand);
      if (c.grid.filter((tile) => tile.fire > 0).length > 1) spread = true;
      if (c.grid.some((tile) => tile.type === 'rubble')) rubble = true;
    }
    expect(spread).toBe(true);
    expect(rubble).toBe(true);
    // fire eventually burns itself out
    expect(c.grid.every((tile) => tile.fire === 0)).toBe(true);
  });
});

describe('monster', () => {
  it('stomps tiles into rubble and eventually leaves', () => {
    const rand = makeRng(9);
    let c = createCity(W, H);
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) c = put(c, x, y, 'residential');
    c = spawnMonster(c, rand, 12, 9);
    expect(c.monster).not.toBeNull();
    for (let t = 0; t < 30 && c.monster; t++) c = stepMonster(c, rand);
    expect(c.monster).toBeNull();
    expect(c.grid.some((tile) => tile.type === 'rubble')).toBe(true);
  });
});

describe('population tally & milestones', () => {
  it('tallies population from developed residential tiles', () => {
    const c = createCity(W, H);
    c.grid[idx(2, 2, W)] = { type: 'residential', level: 3, powered: true, fire: 0 };
    c.grid[idx(3, 2, W)] = { type: 'residential', level: 5, powered: true, fire: 0 };
    expect(computeStats(c.grid).population).toBe((3 + 5) * POP_PER_LEVEL);
  });

  it('detects only freshly crossed milestones', () => {
    expect(newMilestones(0, 500)).toHaveLength(0);
    expect(newMilestones(0, 1500).map((m) => m.title)).toEqual(['Village']);
    expect(newMilestones(900, 2500).map((m) => m.title)).toEqual(['Village', 'Town']);
    expect(newMilestones(2000, 2500)).toHaveLength(0);
  });

  it('milestoneForPopulation returns the highest tier reached', () => {
    expect(milestoneForPopulation(0)).toBeNull();
    expect(milestoneForPopulation(1500)?.title).toBe('Village');
    expect(milestoneForPopulation(20000)?.title).toBe('City');
    expect(milestoneForPopulation(500000)?.title).toBe('Metropolis');
  });
});

// A residential row hand-set to full development for a real population figure.
function populatedCity(tiles = 10): CityState {
  const c = createCity(W, H);
  for (let x = 0; x < tiles; x++) c.grid[idx(x, 2, W)] = { type: 'residential', level: 5, powered: true, fire: 0 };
  return c;
}

describe('police coverage & crime', () => {
  it('an empty city is crime-free', () => {
    const c = createCity(W, H);
    expect(policeCoverage(c)).toBe(1);
    expect(crimeFactor(c)).toBe(0);
  });

  it('a populous unpoliced city has high crime that stations and funding reduce', () => {
    const c = populatedCity(10); // 10 * 5 * 50 = 2500 citizens
    expect(crimeFactor(c)).toBeGreaterThan(0.5);

    c.grid[idx(0, 4, W)] = { type: 'police', level: 0, powered: true, fire: 0 };
    const policed = crimeFactor(c);
    expect(policed).toBeLessThan(0.5);

    // The same station at low funding covers fewer citizens.
    expect(crimeFactor({ ...c, policeFunding: 20 })).toBeGreaterThan(policed);
  });

  it('crime dampens commercial growth relative to residential', () => {
    // A crime-ridden city grows commercial zones slower than an identical
    // well-policed one over many ticks.
    const build = (police: boolean): CityState => {
      let c = createCity(W, H);
      c = put(c, 0, 0, 'powerplant');
      c = put(c, 1, 0, 'commercial');
      c = put(c, 1, 1, 'road');
      // Seed a big population so demand and crime are both high.
      for (let x = 5; x < 20; x++) c.grid[idx(x, 8, W)] = { type: 'residential', level: 5, powered: true, fire: 0 };
      if (police) for (let x = 0; x < 3; x++) c.grid[idx(x, 4, W)] = { type: 'police', level: 0, powered: true, fire: 0 };
      return c;
    };
    const rand = makeRng(99);
    let unsafe = build(false);
    let safe = build(true);
    for (let t = 0; t < 60; t++) {
      unsafe = tickCity(unsafe, rand);
      safe = tickCity(safe, rand);
    }
    expect(safe.grid[idx(1, 0, W)].level).toBeGreaterThanOrEqual(unsafe.grid[idx(1, 0, W)].level);
  });
});

describe('fire funding effects', () => {
  it('suppression probability and truck speed rise with funding', () => {
    const lo = createCity(W, H);
    expect(fireSuppressionProb({ ...lo, fireFunding: 0 })).toBe(0);
    expect(fireSuppressionProb({ ...lo, fireFunding: 100 })).toBeGreaterThan(0);
    expect(truckSpeed({ ...lo, fireFunding: 100 })).toBeGreaterThan(truckSpeed({ ...lo, fireFunding: 0 }));
  });

  it('unfunded brigade never suppresses (returns the same state)', () => {
    const rand = makeRng(3);
    let c = createCity(W, H);
    c = put(c, 3, 3, 'residential');
    c = startFire(c, rand, 3, 3);
    c = { ...c, fireFunding: 0 };
    expect(suppressFires(c, rand)).toBe(c);
  });

  it('a funded brigade never raises a tile\'s fire', () => {
    const rand = makeRng(8);
    let c = createCity(W, H);
    c = put(c, 3, 3, 'residential');
    c = startFire(c, rand, 3, 3);
    const before = c.grid[idx(3, 3, W)].fire;
    const after = suppressFires({ ...c, fireFunding: 100 }, rand);
    expect(after.grid[idx(3, 3, W)].fire).toBeLessThanOrEqual(before);
  });
});

describe('fire truck dispatch', () => {
  // Station -> road -> road -> road -> burning house.
  function truckScenario(): CityState {
    let c = createCity(W, H);
    c = put(c, 5, 5, 'firestation');
    c = put(c, 5, 6, 'road');
    c = put(c, 5, 7, 'road');
    c = put(c, 5, 8, 'road');
    c = put(c, 5, 9, 'residential');
    c = startFire(c, makeRng(1), 5, 9);
    return c;
  }

  it('finds a road route from a station to the blaze', () => {
    const c = truckScenario();
    const truck = dispatchTruck(c);
    expect(truck).not.toBeNull();
    expect(truck!.path[0]).toBe(idx(5, 5, W)); // the station launches the truck
    expect(truck!.target).toBe(idx(5, 9, W));
  });

  it('returns no truck when no road reaches the fire', () => {
    let c = createCity(W, H);
    c = put(c, 5, 5, 'firestation');
    c = put(c, 10, 10, 'residential');
    c = startFire(c, makeRng(1), 10, 10);
    expect(dispatchTruck(c)).toBeNull();
    expect(roadPathToFire(c, [])).toBeNull();
  });

  it('a dispatched truck reaches the fire and douses it', () => {
    let c = truckScenario();
    c = { ...c, truck: dispatchTruck(c) };
    expect(c.truck).not.toBeNull();
    for (let t = 0; t < 12 && c.truck; t++) c = stepTruck(c);
    expect(c.grid[idx(5, 9, W)].fire).toBe(0);
    expect(c.truck).toBeNull();
  });
});

describe('tornado', () => {
  function runTornado(seed: number): CityState {
    const rand = makeRng(seed);
    let c = createCity(W, H);
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) c = put(c, x, y, 'commercial');
    c = spawnTornado(c, rand, 12, 0);
    for (let t = 0; t < 25 && c.tornado; t++) c = stepTornado(c, rand);
    return c;
  }

  it('spawns, pulps buildings into rubble, and eventually leaves', () => {
    const c = runTornado(11);
    expect(c.tornado).toBeNull();
    expect(c.grid.some((t) => t.type === 'rubble')).toBe(true);
  });

  it('follows a deterministic path for a given seed', () => {
    const a = runTornado(7).grid.map((t) => t.type);
    const b = runTornado(7).grid.map((t) => t.type);
    expect(a).toEqual(b);
  });
});

describe('newspaper headlines', () => {
  it('milestone editions announce the new tier', () => {
    const c = createCity(W, H);
    expect(generateHeadline(c, milestoneForPopulation(1500))).toContain('VILLAGE');
  });

  it('an active disaster leads the front page', () => {
    let fire = put(createCity(W, H), 3, 3, 'residential');
    fire = startFire(fire, makeRng(1), 3, 3);
    expect(generateHeadline(fire)).toContain('INFERNO');
    expect(generateHeadline(spawnTornado(createCity(W, H), makeRng(1)))).toContain('TWISTER');
  });

  it('blackouts and high taxes surface when no disaster is running', () => {
    const dark = createCity(W, H);
    for (let k = 0; k < 4; k++) dark.grid[idx(k, 0, W)] = { type: 'residential', level: 2, powered: false, fire: 0 };
    expect(unpoweredZoneCount(dark.grid)).toBeGreaterThanOrEqual(3);
    expect(generateHeadline(dark)).toContain('BLACKOUT');

    expect(generateHeadline({ ...createCity(W, H), taxRate: 12 })).toContain('12%');
    expect(generateHeadline(createCity(W, H))).toContain('MAYOR');
  });

  it('generateStories returns 2-3 flavored stories and leads with the milestone', () => {
    const m = milestoneForPopulation(1500)!;
    const stories = generateStories(createCity(W, H), m);
    expect(stories[0]).toBe(m.message);
    const taxed = generateStories({ ...createCity(W, H), taxRate: 12 });
    expect(taxed.length).toBeGreaterThanOrEqual(2);
    expect(taxed.length).toBeLessThanOrEqual(3);
  });

  it('generateEdition assembles a full masthead front page', () => {
    const e = generateEdition(createCity(W, H));
    expect(e.masthead).toBe('The Emulation Times');
    expect(e.headline.length).toBeGreaterThan(0);
    expect(e.stories.length).toBeGreaterThanOrEqual(2);
  });
});

describe('civic tool placement & funded budget', () => {
  it('places police / fire / park at their listed costs', () => {
    const c = createCity(W, H);
    expect(applyTool(c.grid, W, H, 4, 4, 'police').cost).toBe(TOOL_COSTS.police);
    expect(applyTool(c.grid, W, H, 6, 6, 'firestation').cost).toBe(TOOL_COSTS.firestation);
    expect(applyTool(c.grid, W, H, 8, 8, 'park').cost).toBe(TOOL_COSTS.park);
  });

  it('funding sliders scale station upkeep in the budget', () => {
    const c = createCity(W, H);
    c.grid[idx(0, 0, W)] = { type: 'police', level: 0, powered: true, fire: 0 };
    const full = computeBudget({ ...c, policeFunding: 100 });
    const half = computeBudget({ ...c, policeFunding: 50 });
    expect(full.expenses).toBeGreaterThan(half.expenses);
    expect(full.expenses).toBe(MAINTENANCE.police);
  });
});
