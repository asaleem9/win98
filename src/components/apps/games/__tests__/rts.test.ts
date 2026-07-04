import {
  RtsConfig,
  Unit,
  createRtsState,
  trainUnit,
  placeBuilding,
  canPlaceAt,
  startResearch,
  isResearched,
  fireSuperweapon,
  superReady,
  stepRts,
  supplyUsed,
  playerBase,
  enemyBase,
  canAffordBag,
  unitsInRect,
  updateFog,
  fogAt,
  getCommandOptions,
  formatCost,
} from '../engine/rts';

function makeConfig(overrides: Partial<RtsConfig> = {}): RtsConfig {
  return {
    gameId: 'test',
    resources: [{ id: 'min', name: 'Minerals', color: '#0ff' }],
    startResources: { min: 200 },
    colors: { player: '#00f', enemy: '#f00', terrain: '#111', grid: '#222' },
    unitTypes: {
      worker: {
        name: 'Worker',
        role: 'worker',
        hp: 40,
        speed: 100,
        damage: 0,
        range: 0,
        rate: 1,
        cost: { min: 50 },
        supply: 1,
        trainedAt: 'base',
        sightRange: 110,
      },
      soldier: {
        name: 'Soldier',
        role: 'combat',
        hp: 45,
        speed: 100,
        damage: 10,
        range: 30,
        rate: 0.5,
        cost: { min: 50 },
        supply: 1,
        trainedAt: 'prod',
        sightRange: 120,
      },
    },
    buildingTypes: {
      base: { name: 'Base', hp: 200, cost: { min: 400 }, size: { w: 46, h: 46 }, isBase: true, buildTimeSec: 0, sightRange: 200 },
      depot: { name: 'Depot', hp: 100, cost: { min: 100 }, size: { w: 30, h: 30 }, supplyGrant: 8, buildTimeSec: 0 },
      prod: { name: 'Barracks', hp: 150, cost: { min: 150 }, size: { w: 38, h: 38 }, buildTimeSec: 0 },
    },
    startSupply: 10,
    aggroRange: 100,
    harvestAmount: 10,
    harvestTime: 0.5,
    map: {
      width: 400,
      height: 300,
      playerBase: { x: 60, y: 240 },
      enemyBase: { x: 340, y: 60 },
      patches: [{ x: 60, y: 200, amount: 100, resourceId: 'min' }],
    },
    startUnits: [{ typeId: 'worker', count: 2 }],
    enemyStartUnits: [{ typeId: 'soldier', count: 3 }],
    ai: { personality: 'swarm', buildOrder: [], attackWaves: [], rampFactor: 1 },
    winText: 'win',
    loseText: 'lose',
    ...overrides,
  };
}

function stepFor(s: ReturnType<typeof createRtsState>, seconds: number, dt = 0.05) {
  for (let t = 0; t < seconds; t += dt) stepRts(s, dt);
}

function testUnit(overrides: Partial<Unit> & Pick<Unit, 'id' | 'owner' | 'typeId' | 'role' | 'x' | 'y'>): Unit {
  return {
    hp: 45,
    maxHp: 45,
    mx: null,
    my: null,
    attackId: null,
    cooldown: 0,
    cargo: 0,
    cargoResource: null,
    patchId: null,
    phase: 'idle',
    mineTimer: 0,
    ...overrides,
  };
}

describe('createRtsState', () => {
  it('sets up bases, workers, and starting economy', () => {
    const s = createRtsState(makeConfig());
    expect(playerBase(s)).toBeDefined();
    expect(enemyBase(s)).toBeDefined();
    expect(s.resources.min).toBe(200);
    expect(supplyUsed(s)).toBe(2);
    expect(s.status).toBe('playing');
  });
});

describe('economy', () => {
  it('canAffordBag reflects current resources', () => {
    const s = createRtsState(makeConfig({ startResources: { min: 40 } }));
    expect(canAffordBag(s, { min: 50 })).toBe(false);
    expect(canAffordBag(s, { min: 40 })).toBe(true);
  });

  it('trainUnit spends resource and adds supply', () => {
    const s = createRtsState(makeConfig());
    const before = supplyUsed(s);
    expect(trainUnit(s, 'worker')).toBe(true);
    expect(s.resources.min).toBe(150);
    expect(supplyUsed(s)).toBe(before + 1);
  });

  it('respects the supply cap', () => {
    const s = createRtsState(makeConfig({ startSupply: 2, startResources: { min: 9999 } }));
    expect(trainUnit(s, 'worker')).toBe(false);
  });

  it('placing a depot raises the supply cap', () => {
    const s = createRtsState(makeConfig());
    const cap = s.supplyCap;
    expect(placeBuilding(s, 'depot', 200, 150)).toBe(true);
    expect(s.supplyCap).toBe(cap + 8);
    expect(s.resources.min).toBe(100);
  });

  it('trainUnit needs its production building first', () => {
    const s = createRtsState(makeConfig());
    expect(trainUnit(s, 'soldier')).toBe(false);
    expect(placeBuilding(s, 'prod', 200, 150)).toBe(true);
    expect(trainUnit(s, 'soldier')).toBe(true);
  });
});

describe('multi-resource costs', () => {
  it('checks and spends every resource in a cost bag', () => {
    const cfg = makeConfig({
      resources: [
        { id: 'min', name: 'Minerals', color: '#0ff' },
        { id: 'gas', name: 'Gas', color: '#0f0' },
      ],
      startResources: { min: 200, gas: 100 },
    });
    cfg.unitTypes.soldier.cost = { min: 50, gas: 25 };
    const s = createRtsState(cfg);
    placeBuilding(s, 'prod', 200, 150);
    s.resources.min = 200;
    s.resources.gas = 100;
    expect(canAffordBag(s, { min: 50, gas: 25 })).toBe(true);
    expect(canAffordBag(s, { min: 50, gas: 200 })).toBe(false);
    expect(trainUnit(s, 'soldier')).toBe(true);
    expect(s.resources.min).toBe(150);
    expect(s.resources.gas).toBe(75);
  });

  it('formatCost orders resources by the config list', () => {
    const cfg = makeConfig({
      resources: [
        { id: 'min', name: 'Minerals', color: '#0ff' },
        { id: 'gas', name: 'Gas', color: '#0f0' },
      ],
    });
    expect(formatCost(cfg, { gas: 25, min: 50 })).toBe('50/25');
  });
});

describe('harvesting', () => {
  it('workers deliver resource back to base over time', () => {
    const s = createRtsState(makeConfig());
    const start = s.resources.min;
    stepFor(s, 30);
    expect(s.resources.min).toBeGreaterThan(start);
  });
});

describe('canPlaceAt', () => {
  it('rejects overlap with an existing building', () => {
    const s = createRtsState(makeConfig());
    const b = playerBase(s)!;
    expect(canPlaceAt(s, 'depot', b.x, b.y)).toBe(false);
  });

  it('accepts an open, in-bounds spot', () => {
    const s = createRtsState(makeConfig());
    expect(canPlaceAt(s, 'depot', 200, 150)).toBe(true);
  });

  it('rejects a footprint that runs off the map', () => {
    const s = createRtsState(makeConfig());
    expect(canPlaceAt(s, 'depot', 5, 5)).toBe(false);
  });
});

describe('fog of war', () => {
  it('leaves distant terrain unexplored and the home base visible', () => {
    const s = createRtsState(makeConfig());
    expect(fogAt(s, 60, 240)).toBe(2);
    const eb = enemyBase(s)!;
    expect(fogAt(s, eb.x, eb.y)).toBe(0);
  });

  it('a scout reveals a tile, then it drops to explored when the scout leaves', () => {
    const s = createRtsState(makeConfig());
    const scout = testUnit({ id: 5000, owner: 'player', typeId: 'worker', role: 'worker', x: 300, y: 150 });
    s.units.push(scout);
    updateFog(s);
    expect(fogAt(s, 300, 150)).toBe(2);
    s.units = s.units.filter((u) => u.id !== 5000);
    updateFog(s);
    expect(fogAt(s, 300, 150)).toBe(1);
  });

  it('reveals the whole map when fog is disabled', () => {
    const s = createRtsState(makeConfig({ fogOfWar: false }));
    const eb = enemyBase(s)!;
    expect(fogAt(s, eb.x, eb.y)).toBe(2);
  });
});

describe('tech tree', () => {
  function upgradeConfig() {
    return makeConfig({
      upgrades: [
        {
          id: 'feudal',
          name: 'Feudal',
          cost: { min: 100 },
          researchTimeSec: 5,
          researchAt: 'prod',
          prereqBuilding: 'prod',
          effects: [{ unitTypeId: 'soldier', dmgMult: 2, hpMult: 1.5 }],
          announce: 'advanced',
        },
      ],
    });
  }

  it('gates research on prereq building, cost, and one-time completion', () => {
    const s = createRtsState(upgradeConfig());
    expect(startResearch(s, 'feudal')).toBe(false); // no prod yet
    placeBuilding(s, 'prod', 200, 150);
    s.resources.min = 40;
    expect(startResearch(s, 'feudal')).toBe(false); // can't afford
    s.resources.min = 500;
    expect(startResearch(s, 'feudal')).toBe(true);
    expect(startResearch(s, 'feudal')).toBe(false); // already researching
  });

  it('applies effects to existing and future units on completion', () => {
    const s = createRtsState(upgradeConfig());
    placeBuilding(s, 'prod', 200, 150);
    s.resources.min = 999;
    trainUnit(s, 'soldier');
    const early = s.units.find((u) => u.owner === 'player' && u.typeId === 'soldier')!;
    const baseMaxHp = early.maxHp;
    startResearch(s, 'feudal');
    stepFor(s, 6);
    expect(isResearched(s, 'feudal')).toBe(true);
    expect(early.maxHp).toBe(Math.round(baseMaxHp * 1.5));
    expect(s.unitMods.soldier.dmg).toBe(2);
    // a freshly trained soldier is also buffed
    s.resources.min = 999;
    trainUnit(s, 'soldier');
    const late = s.units.filter((u) => u.owner === 'player' && u.typeId === 'soldier').at(-1)!;
    expect(late.maxHp).toBe(Math.round(45 * 1.5));
  });
});

describe('combat and win/lose', () => {
  it('an enemy base with no hp triggers a win', () => {
    const s = createRtsState(makeConfig());
    enemyBase(s)!.hp = 0;
    stepRts(s, 0.016);
    expect(s.status).toBe('won');
  });

  it('losing the player base triggers a loss', () => {
    const s = createRtsState(makeConfig());
    playerBase(s)!.hp = 0;
    stepRts(s, 0.016);
    expect(s.status).toBe('lost');
  });

  it('player soldiers destroy nearby enemy units', () => {
    const s = createRtsState(makeConfig());
    s.units = s.units.filter((u) => u.owner === 'player' && u.role === 'worker');
    s.units.push(testUnit({ id: 9001, owner: 'player', typeId: 'soldier', role: 'combat', x: 100, y: 100 }));
    s.units.push(testUnit({ id: 9002, owner: 'enemy', typeId: 'soldier', role: 'combat', x: 110, y: 100, hp: 20 }));
    stepFor(s, 15);
    expect(s.units.find((u) => u.id === 9002)).toBeUndefined();
    expect(s.kills).toBeGreaterThanOrEqual(1);
  });
});

describe('defensive buildings', () => {
  it('a building with an attack fires on enemies in range', () => {
    const cfg = makeConfig();
    cfg.buildingTypes.turret = {
      name: 'Turret',
      hp: 300,
      cost: { min: 75 },
      size: { w: 24, h: 24 },
      buildTimeSec: 0,
      attack: { damage: 20, range: 80, rate: 0.5 },
    };
    const s = createRtsState(cfg);
    s.resources.min = 999;
    expect(placeBuilding(s, 'turret', 200, 200)).toBe(true);
    const enemy = testUnit({ id: 8000, owner: 'enemy', typeId: 'soldier', role: 'combat', x: 220, y: 200, hp: 60, maxHp: 60 });
    s.units.push(enemy);
    stepRts(s, 0.05);
    expect(enemy.hp).toBeLessThan(60);
  });
});

describe('superweapon', () => {
  it('charges over its cooldown, then deals AoE inside its radius only', () => {
    const cfg = makeConfig({
      superweapon: { name: 'Nuke', cooldownSec: 10, damage: 200, radius: 60, color: '#f00' },
    });
    const s = createRtsState(cfg);
    expect(superReady(s)).toBe(false);
    expect(fireSuperweapon(s, 300, 300)).toBe(false);
    stepFor(s, 11);
    expect(superReady(s)).toBe(true);
    const near = testUnit({ id: 8100, owner: 'enemy', typeId: 'soldier', role: 'combat', x: 300, y: 300, hp: 100, maxHp: 100 });
    const far = testUnit({ id: 8101, owner: 'enemy', typeId: 'soldier', role: 'combat', x: 200, y: 300, hp: 100, maxHp: 100 });
    s.units.push(near, far);
    expect(fireSuperweapon(s, 300, 300)).toBe(true);
    expect(near.hp).toBeLessThan(0);
    expect(far.hp).toBe(100);
    expect(superReady(s)).toBe(false);
  });
});

describe('enemy AI', () => {
  it('executes its build order from the enemy economy', () => {
    const cfg = makeConfig({
      ai: {
        personality: 'boom',
        buildOrder: [{ atSec: 1, buildingTypeId: 'prod' }],
        attackWaves: [],
        rampFactor: 1,
      },
    });
    const s = createRtsState(cfg);
    s.enemyResources = 9999;
    stepFor(s, 1.5);
    expect(s.buildings.some((b) => b.owner === 'enemy' && b.typeId === 'prod')).toBe(true);
  });

  it('spawns scripted attack waves from the enemy base with the right composition', () => {
    const cfg = makeConfig({
      ai: {
        personality: 'swarm',
        buildOrder: [],
        attackWaves: [{ atSec: 2, comp: { soldier: 3 }, target: 'base' }],
        rampFactor: 1,
      },
    });
    const s = createRtsState(cfg);
    const before = s.units.filter((u) => u.owner === 'enemy' && u.orderTarget === 'base').length;
    stepFor(s, 2.5);
    const after = s.units.filter((u) => u.owner === 'enemy' && u.orderTarget === 'base').length;
    expect(after - before).toBe(3);
  });

  it('harass waves march their units at the nearest player worker', () => {
    const s = createRtsState(makeConfig({ aggroRange: 5 }));
    s.units = s.units.filter((u) => u.owner !== 'player');
    const worker = testUnit({ id: 7000, owner: 'player', typeId: 'worker', role: 'worker', x: 200, y: 200, mx: 200, my: 200 });
    s.units.push(worker);
    const har = testUnit({ id: 7001, owner: 'enemy', typeId: 'soldier', role: 'combat', x: 100, y: 100, orderTarget: 'workers' });
    s.units.push(har);
    stepRts(s, 0.05);
    expect(har.mx).toBe(worker.x);
    expect(har.my).toBe(worker.y);
  });
});

describe('command options', () => {
  it('greys units whose production building is missing and enables affordable builds', () => {
    const s = createRtsState(makeConfig());
    const opts = getCommandOptions(s);
    const soldier = opts.find((o) => o.kind === 'train' && o.id === 'soldier')!;
    expect(soldier.enabled).toBe(false);
    expect(soldier.reason).toMatch(/Barracks/);
    const worker = opts.find((o) => o.kind === 'train' && o.id === 'worker')!;
    expect(worker.enabled).toBe(true);
    const depot = opts.find((o) => o.kind === 'build' && o.id === 'depot')!;
    expect(depot.enabled).toBe(true);
    // base is never offered as a build option
    expect(opts.some((o) => o.kind === 'build' && o.id === 'base')).toBe(false);
  });

  it('omits hidden unit, building, and upgrade types from the panel entirely', () => {
    const cfg = makeConfig({
      upgrades: [
        { id: 'secret', name: 'Secret', cost: { min: 50 }, researchTimeSec: 5, researchAt: 'prod', effects: [], hidden: true },
        { id: 'shown', name: 'Shown', cost: { min: 50 }, researchTimeSec: 5, researchAt: 'prod', effects: [] },
      ],
    });
    cfg.unitTypes.soldier.hidden = true;
    cfg.buildingTypes.depot.hidden = true;
    const s = createRtsState(cfg);
    const opts = getCommandOptions(s);
    // Hidden entries never appear — not even greyed-out.
    expect(opts.some((o) => o.kind === 'train' && o.id === 'soldier')).toBe(false);
    expect(opts.some((o) => o.kind === 'build' && o.id === 'depot')).toBe(false);
    expect(opts.some((o) => o.kind === 'research' && o.id === 'secret')).toBe(false);
    // Non-hidden entries of every kind still show.
    expect(opts.some((o) => o.kind === 'train' && o.id === 'worker')).toBe(true);
    expect(opts.some((o) => o.kind === 'build' && o.id === 'prod')).toBe(true);
    expect(opts.some((o) => o.kind === 'research' && o.id === 'shown')).toBe(true);
  });
});

describe('unitsInRect', () => {
  it('selects only player units inside the rectangle', () => {
    const s = createRtsState(makeConfig());
    const ids = unitsInRect(s, 0, 0, s.config.map.width, s.config.map.height);
    expect(ids.length).toBe(s.units.filter((u) => u.owner === 'player').length);
  });
});
