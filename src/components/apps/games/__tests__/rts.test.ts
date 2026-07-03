import {
  RtsConfig,
  createRtsState,
  trainWorker,
  trainSoldier,
  placeBuilding,
  advanceAge,
  stepRts,
  supplyUsed,
  playerBase,
  enemyBase,
  canAfford,
  unitsInRect,
} from '../engine/rts';

function makeConfig(overrides: Partial<RtsConfig> = {}): RtsConfig {
  return {
    gameId: 'test',
    resourceName: 'Minerals',
    workerName: 'Worker',
    soldierName: 'Soldier',
    baseName: 'Base',
    depotName: 'Depot',
    prodName: 'Barracks',
    enemyBaseName: 'Enemy',
    colors: { player: '#00f', enemy: '#f00', resource: '#0ff', terrain: '#111', grid: '#222' },
    costs: { worker: 50, depot: 100, prod: 150, soldier: 50 },
    supplyPerDepot: 8,
    startSupply: 10,
    stats: {
      workerHp: 40,
      workerSpeed: 100,
      soldierHp: 45,
      soldierSpeed: 100,
      soldierDamage: 10,
      soldierRange: 30,
      soldierRate: 0.5,
      baseHp: 200,
      depotHp: 100,
      prodHp: 150,
      aggroRange: 100,
      harvestAmount: 10,
      harvestTime: 0.5,
    },
    map: {
      width: 400,
      height: 300,
      playerBase: { x: 60, y: 240 },
      enemyBase: { x: 340, y: 60 },
      patches: [{ x: 60, y: 200, amount: 100 }],
    },
    waveIntervalSec: 1000,
    startResource: 200,
    startWorkers: 2,
    winText: 'win',
    loseText: 'lose',
    ...overrides,
  };
}

describe('createRtsState', () => {
  it('sets up bases, workers, and starting economy', () => {
    const s = createRtsState(makeConfig());
    expect(playerBase(s)).toBeDefined();
    expect(enemyBase(s)).toBeDefined();
    expect(s.resource).toBe(200);
    expect(supplyUsed(s)).toBe(2); // startWorkers
    expect(s.status).toBe('playing');
  });
});

describe('economy', () => {
  it('canAfford reflects current resource', () => {
    const s = createRtsState(makeConfig({ startResource: 40 }));
    expect(canAfford(s, 50)).toBe(false);
    expect(canAfford(s, 40)).toBe(true);
  });

  it('trainWorker spends resource and adds supply', () => {
    const s = createRtsState(makeConfig());
    const before = supplyUsed(s);
    expect(trainWorker(s)).toBe(true);
    expect(s.resource).toBe(150);
    expect(supplyUsed(s)).toBe(before + 1);
  });

  it('respects the supply cap', () => {
    const s = createRtsState(makeConfig({ startSupply: 2, startResource: 9999 }));
    expect(trainWorker(s)).toBe(false); // already at 2/2
  });

  it('placeBuilding a depot raises the supply cap', () => {
    const s = createRtsState(makeConfig());
    const cap = s.supplyCap;
    expect(placeBuilding(s, 'depot', 150, 150)).toBe(true);
    expect(s.supplyCap).toBe(cap + 8);
    expect(s.resource).toBe(100);
  });

  it('rejects overlapping buildings', () => {
    const s = createRtsState(makeConfig({ startResource: 9999 }));
    const b = playerBase(s)!;
    expect(placeBuilding(s, 'depot', b.x, b.y)).toBe(false);
  });

  it('trainSoldier needs a barracks first', () => {
    const s = createRtsState(makeConfig());
    expect(trainSoldier(s)).toBe(false);
    expect(placeBuilding(s, 'prod', 150, 150)).toBe(true);
    expect(trainSoldier(s)).toBe(true);
  });
});

describe('harvesting', () => {
  it('workers deliver resource back to base over time', () => {
    const s = createRtsState(makeConfig());
    const start = s.resource;
    for (let i = 0; i < 600; i++) stepRts(s, 0.05); // ~30s
    expect(s.resource).toBeGreaterThan(start);
  });
});

describe('combat and win/lose', () => {
  it('an enemy base with no hp triggers a win', () => {
    const s = createRtsState(makeConfig());
    const eb = enemyBase(s)!;
    eb.hp = 0;
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
    const cfg = makeConfig();
    const s = createRtsState(cfg);
    // clear enemies, place one player soldier next to one enemy soldier
    s.units = s.units.filter((u) => u.owner === 'player' && u.kind === 'worker');
    s.units.push({
      id: 9001, owner: 'player', kind: 'soldier', x: 100, y: 100, hp: 45, maxHp: 45,
      mx: null, my: null, attackId: null, cooldown: 0, cargo: 0, patchId: null, phase: 'idle', mineTimer: 0,
    });
    s.units.push({
      id: 9002, owner: 'enemy', kind: 'soldier', x: 110, y: 100, hp: 20, maxHp: 45,
      mx: null, my: null, attackId: null, cooldown: 0, cargo: 0, patchId: null, phase: 'idle', mineTimer: 0,
    });
    for (let i = 0; i < 300; i++) stepRts(s, 0.05);
    expect(s.units.find((u) => u.id === 9002)).toBeUndefined();
    expect(s.kills).toBeGreaterThanOrEqual(1);
  });
});

describe('advanceAge', () => {
  it('buffs player soldier damage once and is gated by cost', () => {
    const cfg = makeConfig({
      startResource: 100,
      advance: { cost: 200, label: 'Feudal', damageMult: 2, hpMult: 1.5, announce: 'advanced' },
    });
    const s = createRtsState(cfg);
    expect(advanceAge(s)).toBe(false); // can't afford 200 with 100
    s.resource = 500;
    expect(advanceAge(s)).toBe(true);
    expect(s.advanced).toBe(true);
    expect(s.playerDmgMult).toBe(2);
    expect(advanceAge(s)).toBe(false); // only once
  });

  it('is unavailable when no advance config is set', () => {
    const s = createRtsState(makeConfig({ startResource: 9999 }));
    expect(advanceAge(s)).toBe(false);
  });
});

describe('unitsInRect', () => {
  it('selects only player units inside the rectangle', () => {
    const s = createRtsState(makeConfig());
    const ids = unitsInRect(s, 0, 0, s.config.map.width, s.config.map.height);
    // all player units, no enemies
    expect(ids.length).toBe(s.units.filter((u) => u.owner === 'player').length);
  });
});
