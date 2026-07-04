import {
  BASE_SPEED,
  TUCK_MULT,
  UNITS_PER_METER,
  metersToUnits,
  unitsToMeters,
  steerVelocity,
  descentSpeed,
  directionFromPointer,
  isSolid,
  obstacleFootprint,
  obstacleRegion,
  playerFootprint,
  boxesOverlap,
  collidesWith,
  overRegion,
  gatesFrom,
  evaluateGate,
  slalomTime,
  slalomPlacement,
  SLALOM_FINISH_M,
  MISSED_GATE_PENALTY_S,
  yetiSpeed,
  yetiHasSpawned,
  yetiCatches,
  YETI_SPAWN_M,
  YETI_BASE_SPEED,
  YETI_HUNGER_STEP,
  trickPoints,
  flipLandsClean,
  FLIP_ROTATION,
  genObstacles,
  genLiftTowers,
  type Obstacle,
} from '../engine/skifree';

describe('distance <-> metres', () => {
  it('round-trips through the unit scale', () => {
    expect(metersToUnits(100)).toBe(100 * UNITS_PER_METER);
    expect(unitsToMeters(metersToUnits(2000))).toBe(2000);
  });
});

describe('steering + speed model', () => {
  it('points straight down with no lateral drift', () => {
    const v = steerVelocity('down', false);
    expect(v.vx).toBe(0);
    expect(v.vy).toBeCloseTo(BASE_SPEED);
  });

  it('tucking only boosts a straight-down line', () => {
    expect(descentSpeed('down', true)).toBeCloseTo(BASE_SPEED * TUCK_MULT);
    // a traverse ignores the tuck boost — that is how you brake near the yeti
    expect(descentSpeed('left', true)).toBeCloseTo(descentSpeed('left', false));
  });

  it('traverses trade descent for lateral movement', () => {
    const down = descentSpeed('down', false);
    expect(descentSpeed('diagLeft', false)).toBeLessThan(down);
    expect(descentSpeed('left', false)).toBeLessThan(descentSpeed('diagLeft', false));
    expect(steerVelocity('left', false).vx).toBeLessThan(0);
    expect(steerVelocity('right', false).vx).toBeGreaterThan(0);
  });

  it('maps a pointer offset to a pose by how far off-centre it is', () => {
    expect(directionFromPointer(0)).toBe('down');
    expect(directionFromPointer(-30)).toBe('diagLeft');
    expect(directionFromPointer(30)).toBe('diagRight');
    expect(directionFromPointer(-200)).toBe('left');
    expect(directionFromPointer(200)).toBe('right');
  });
});

describe('collision footprints', () => {
  it('classifies solid clutter vs interactive regions', () => {
    expect(isSolid('treePine')).toBe(true);
    expect(isSolid('rock')).toBe(true);
    expect(isSolid('liftTower')).toBe(true);
    expect(isSolid('jump')).toBe(false);
    expect(isSolid('mogul')).toBe(false);
    expect(isSolid('flagRed')).toBe(false);
  });

  it('gives solids a footprint and interactives a region, not both', () => {
    const tree: Obstacle = { kind: 'treePine', x: 0, y: 0 };
    const jump: Obstacle = { kind: 'jump', x: 0, y: 0 };
    expect(obstacleFootprint(tree)).not.toBeNull();
    expect(obstacleRegion(tree)).toBeNull();
    expect(obstacleFootprint(jump)).toBeNull();
    expect(obstacleRegion(jump)).not.toBeNull();
  });

  it('detects a box overlap and a clear miss', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(boxesOverlap(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(boxesOverlap(a, { x: 20, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it('crashes a skier standing on a tree but not one a stride away', () => {
    const tree: Obstacle = { kind: 'treePine', x: 100, y: 100 };
    expect(collidesWith(100, 100, tree)).toBe(true);
    expect(collidesWith(140, 100, tree)).toBe(false);
  });

  it('lets an airborne skier clear ground clutter but not the tall lift towers', () => {
    const tree: Obstacle = { kind: 'treePine', x: 100, y: 100 };
    const tower: Obstacle = { kind: 'liftTower', x: 100, y: 100 };
    expect(collidesWith(100, 100, tree, true)).toBe(false);
    expect(collidesWith(100, 100, tower, true)).toBe(true);
  });

  it('fires a region trigger only while riding over a jump', () => {
    const jump: Obstacle = { kind: 'jump', x: 100, y: 100 };
    expect(overRegion(100, 100, jump)).toBe(true);
    expect(overRegion(100, 130, jump)).toBe(false);
    // player footprint is anchored at the feet
    expect(boxesOverlap(playerFootprint(100, 100), obstacleRegion(jump)!)).toBe(true);
  });
});

describe('slalom gates', () => {
  const flags: Obstacle[] = [
    { kind: 'flagRed', x: -40, y: metersToUnits(200), gate: 0 },
    { kind: 'flagBlue', x: 40, y: metersToUnits(200), gate: 0 },
    { kind: 'flagRed', x: 10, y: metersToUnits(100), gate: 1 },
    { kind: 'flagBlue', x: 90, y: metersToUnits(100), gate: 1 },
  ];

  it('pairs red/blue posts into gates sorted downhill', () => {
    const gates = gatesFrom(flags);
    expect(gates.map((g) => g.id)).toEqual([1, 0]); // y=100m comes before y=200m
    expect(gates[1]).toMatchObject({ id: 0, leftX: -40, rightX: 40 });
  });

  it('drops a half-open gate that is missing a post', () => {
    const lone: Obstacle[] = [{ kind: 'flagRed', x: 0, y: 10, gate: 5 }];
    expect(gatesFrom(lone)).toEqual([]);
  });

  it('passes a crossing between the posts and misses one outside', () => {
    const gate = gatesFrom(flags).find((g) => g.id === 0)!;
    expect(evaluateGate(gate, 0)).toBe('passed');
    expect(evaluateGate(gate, -40)).toBe('passed'); // touching a post counts
    expect(evaluateGate(gate, 80)).toBe('missed');
  });

  it('adds the fixed penalty per blown gate to the raw time', () => {
    expect(slalomTime(30, 0)).toBe(30);
    expect(slalomTime(30, 3)).toBe(30 + 3 * MISSED_GATE_PENALTY_S);
  });

  it('places faster runs higher on the podium', () => {
    expect(slalomPlacement(20)).toBe(1);
    expect(slalomPlacement(25)).toBe(2);
    expect(slalomPlacement(40)).toBeGreaterThan(3);
  });
});

describe('the yeti', () => {
  it('spawns once the meter passes 2,000m', () => {
    expect(YETI_SPAWN_M).toBe(2000);
    expect(yetiHasSpawned(1999)).toBe(false);
    expect(yetiHasSpawned(2000)).toBe(true);
    expect(yetiHasSpawned(2500)).toBe(true);
  });

  it('gets faster with every meal', () => {
    expect(yetiSpeed(0)).toBe(YETI_BASE_SPEED);
    expect(yetiSpeed(3)).toBe(YETI_BASE_SPEED + 3 * YETI_HUNGER_STEP);
    expect(yetiSpeed(1)).toBeGreaterThan(yetiSpeed(0));
  });

  it('starts slower than a full tuck so a clean line can still escape', () => {
    expect(yetiSpeed(0)).toBeLessThan(descentSpeed('down', true));
    expect(yetiSpeed(0)).toBeGreaterThan(BASE_SPEED);
  });

  it('catches the skier inside its reach and not beyond it', () => {
    expect(yetiCatches(100, 100, 105, 100, 16)).toBe(true);
    expect(yetiCatches(100, 100, 100, 100, 16)).toBe(true);
    expect(yetiCatches(100, 100, 140, 100, 16)).toBe(false);
  });
});

describe('air tricks', () => {
  it('scores each trick by its table value', () => {
    expect(trickPoints('flip')).toBe(100);
    expect(trickPoints('twist')).toBe(50);
    expect(trickPoints('spread')).toBeGreaterThan(0);
  });

  it('lands a completed flip clean but bails a half-turned one', () => {
    expect(flipLandsClean(0)).toBe(true);
    expect(flipLandsClean(FLIP_ROTATION)).toBe(true);
    expect(flipLandsClean(FLIP_ROTATION * 2)).toBe(true);
    expect(flipLandsClean(FLIP_ROTATION / 2)).toBe(false);
  });
});

describe('obstacle generation', () => {
  it('is deterministic for a given seed + mode', () => {
    const a = genObstacles(1234, { mode: 'freestyle' });
    const b = genObstacles(1234, { mode: 'freestyle' });
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('lays out differently for different seeds', () => {
    const a = genObstacles(1, { mode: 'freestyle' });
    const b = genObstacles(2, { mode: 'freestyle' });
    expect(a).not.toEqual(b);
  });

  it('sorts the field top-to-bottom for painter drawing', () => {
    const field = genObstacles(99, { mode: 'freestyle' });
    for (let i = 1; i < field.length; i++) {
      expect(field[i].y).toBeGreaterThanOrEqual(field[i - 1].y);
    }
  });

  it('threads slalom gates only into the slalom modes', () => {
    const free = genObstacles(7, { mode: 'freestyle' });
    const slalom = genObstacles(7, { mode: 'slalom' });
    expect(free.some((o) => o.gate !== undefined)).toBe(false);
    expect(slalom.some((o) => o.kind === 'flagRed' && o.gate !== undefined)).toBe(true);
    // and the gates finish around the slalom line
    const lastGateM = Math.max(
      ...slalom.filter((o) => o.gate !== undefined).map((o) => unitsToMeters(o.y)),
    );
    expect(lastGateM).toBeLessThanOrEqual(SLALOM_FINISH_M);
  });

  it('thickens the field as it drops downhill', () => {
    const field = genObstacles(42, { mode: 'freestyle', startM: 0, lengthM: 4000 });
    const top = field.filter((o) => unitsToMeters(o.y) < 1000).length;
    const bottom = field.filter(
      (o) => unitsToMeters(o.y) >= 3000 && unitsToMeters(o.y) < 4000,
    ).length;
    expect(bottom).toBeGreaterThan(top);
  });

  it('strings lift towers straight down a fixed column', () => {
    const towers = genLiftTowers(-200, 4, 30);
    expect(towers).toHaveLength(4);
    expect(towers.every((t) => t.kind === 'liftTower' && t.x === -200)).toBe(true);
    expect(towers[1].y).toBeGreaterThan(towers[0].y);
  });
});
