import {
  Layout,
  validateTrack,
  countPieces,
  computeRatings,
  ticketDemand,
  perRiderIncome,
  guestSatisfaction,
  rideValue,
  parkValue,
  reachedMilestone,
  hasWon,
  PARK_MILESTONES,
  WIN_TARGET,
  MAX_HEIGHT,
  nextPieceHeight,
  createParkSim,
  stepPark,
  stepPeep,
  stepHandyman,
  stepResearch,
  buildStall,
  togglePath,
  hireHandyman,
  dirtiness,
  bfsPath,
  adjacentPathTile,
  RESEARCH_TIME,
  STALL_COST,
  STALL_INCOME,
  PATH_COST,
  type Peep,
  type ParkSim,
  type StepEvents,
} from '../engine/coaster';

function makeEvents(): StepEvents {
  return { sales: 0, pukes: 0, sweeps: 0, boarded: 0, unlockedResearch: null, lastSaleAt: null };
}

function makePeep(sim: ParkSim, over: Partial<Peep>): Peep {
  const p: Peep = {
    id: sim.nextPeepId++,
    x: sim.gate.x,
    y: sim.gate.y,
    z: 0,
    facing: 1,
    state: 'walking',
    stateT: 0,
    animT: 0,
    path: [],
    goal: 'wander',
    targetId: -1,
    nausea: 0,
    happiness: 0.7,
    hunger: 0,
    shirt: 0,
    hasBalloon: false,
    rideCoaster: -1,
    seat: 0,
    done: false,
    ...over,
  };
  return p;
}

// A small closed loop: station -> right -> down -> left back under station -> up to station.
const validLoop: Layout = [
  { x: 0, y: 0, type: 'station' },
  { x: 1, y: 0, type: 'lift' },
  { x: 1, y: 1, type: 'drop' },
  { x: 0, y: 1, type: 'straight' },
];

describe('validateTrack', () => {
  it('accepts a closed loop that returns to the station', () => {
    const res = validateTrack(validLoop);
    expect(res.valid).toBe(true);
    expect(res.reason).toBe('ok');
  });

  it('rejects an empty layout', () => {
    expect(validateTrack([]).reason).toBe('empty');
  });

  it('rejects a layout that does not start with a station', () => {
    const res = validateTrack([
      { x: 0, y: 0, type: 'straight' },
      { x: 1, y: 0, type: 'straight' },
    ]);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('no-station');
  });

  it('rejects a track too short to form a loop', () => {
    const res = validateTrack([
      { x: 0, y: 0, type: 'station' },
      { x: 1, y: 0, type: 'straight' },
    ]);
    expect(res.reason).toBe('too-short');
  });

  it('rejects a disconnected path', () => {
    const res = validateTrack([
      { x: 0, y: 0, type: 'station' },
      { x: 5, y: 0, type: 'straight' },
      { x: 6, y: 0, type: 'straight' },
      { x: 6, y: 1, type: 'straight' },
    ]);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('disconnected');
  });

  it('rejects overlapping cells', () => {
    const res = validateTrack([
      { x: 0, y: 0, type: 'station' },
      { x: 1, y: 0, type: 'straight' },
      { x: 0, y: 0, type: 'straight' },
      { x: 0, y: 1, type: 'straight' },
    ]);
    expect(res.reason).toBe('overlap');
  });

  it('rejects an open path that never returns to the station', () => {
    const res = validateTrack([
      { x: 0, y: 0, type: 'station' },
      { x: 1, y: 0, type: 'straight' },
      { x: 2, y: 0, type: 'straight' },
      { x: 3, y: 0, type: 'straight' },
    ]);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('not-a-loop');
  });

  it('rejects more than one station', () => {
    const res = validateTrack([
      { x: 0, y: 0, type: 'station' },
      { x: 1, y: 0, type: 'station' },
      { x: 1, y: 1, type: 'straight' },
      { x: 0, y: 1, type: 'straight' },
    ]);
    expect(res.reason).toBe('multiple-stations');
  });
});

describe('countPieces', () => {
  it('tallies each piece type and total length', () => {
    const c = countPieces(validLoop);
    expect(c.length).toBe(4);
    expect(c.stations).toBe(1);
    expect(c.lifts).toBe(1);
    expect(c.drops).toBe(1);
    expect(c.straights).toBe(1);
  });
});

describe('computeRatings', () => {
  it('derives excitement/intensity/nausea from the layout counts', () => {
    // 1 station, 1 lift, 1 drop, 1 straight, length 4.
    const r = computeRatings(validLoop);
    // excitement = 1 + drops*0.8 + loops*1.5 + turns*0.3 + lifts*0.5 + len*0.05
    //            = 1 + 0.8 + 0 + 0 + 0.5 + 0.2 = 2.5
    expect(r.excitement).toBeCloseTo(2.5, 5);
    // intensity = 0.5 + 0.6 + 0 + 0 + 4*0.03 = 1.22
    expect(r.intensity).toBeCloseTo(1.22, 5);
    // nausea = 0.2 + 0 + 0 + 0.3 = 0.5
    expect(r.nausea).toBeCloseTo(0.5, 5);
  });

  it('scores loops and turns as more intense and nauseating', () => {
    const wild = computeRatings([
      { x: 0, y: 0, type: 'station' },
      { x: 1, y: 0, type: 'loop' },
      { x: 1, y: 1, type: 'turn' },
      { x: 0, y: 1, type: 'loop' },
    ]);
    expect(wild.intensity).toBeGreaterThan(2);
    expect(wild.nausea).toBeGreaterThan(1);
  });

  it('clamps ratings to a 0–10 range', () => {
    const huge: Layout = [{ x: 0, y: 0, type: 'station' }];
    for (let i = 1; i <= 40; i++) huge.push({ x: i, y: 0, type: 'loop' });
    const r = computeRatings(huge);
    expect(r.excitement).toBeLessThanOrEqual(10);
    expect(r.intensity).toBeLessThanOrEqual(10);
    expect(r.nausea).toBeLessThanOrEqual(10);
  });
});

describe('ticketDemand', () => {
  it('is full at zero price', () => {
    expect(ticketDemand(0, 6)).toBe(1);
  });

  it('falls as price rises and hits zero past what guests will pay', () => {
    const mid = ticketDemand(5, 6); // maxWilling = 6*1.5+2 = 11
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(ticketDemand(20, 6)).toBe(0);
  });

  it('lets more exciting rides charge more for the same demand', () => {
    const cheapRide = ticketDemand(5, 3);
    const thrillRide = ticketDemand(5, 9);
    expect(thrillRide).toBeGreaterThan(cheapRide);
  });
});

describe('perRiderIncome', () => {
  it('returns the ticket price for a paying rider', () => {
    expect(perRiderIncome(4)).toBe(4);
  });

  it('never goes negative', () => {
    expect(perRiderIncome(-3)).toBe(0);
  });
});

describe('guestSatisfaction', () => {
  it('stays within 0–1', () => {
    const r = computeRatings(validLoop);
    const s = guestSatisfaction(r, 3);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('drops when the ticket is overpriced', () => {
    const r = computeRatings(validLoop);
    expect(guestSatisfaction(r, 1)).toBeGreaterThan(guestSatisfaction(r, 15));
  });
});

describe('parkValue and milestones', () => {
  it('rideValue rewards excitement and size', () => {
    const r = computeRatings(validLoop);
    // excitement 2.5, intensity 1.22, len 4 => 2.5*120 + 1.22*30 + 4*15 = 396.6 -> 397
    expect(rideValue(r, validLoop)).toBe(397);
  });

  it('sums ride values with cash on hand', () => {
    expect(parkValue([1000, 2000], 500)).toBe(3500);
  });

  it('detects the highest reached milestone', () => {
    expect(reachedMilestone(100)).toBeNull();
    expect(reachedMilestone(2500)).toBe(2500);
    expect(reachedMilestone(6000)).toBe(5000);
    expect(reachedMilestone(999999)).toBe(PARK_MILESTONES[PARK_MILESTONES.length - 1]);
  });

  it('wins at the final target', () => {
    expect(hasWon(WIN_TARGET - 1)).toBe(false);
    expect(hasWon(WIN_TARGET)).toBe(true);
  });
});

describe('track elevation', () => {
  it('accepts a hill that lifts up, drops back down and returns level', () => {
    const loop: Layout = [
      { x: 0, y: 0, type: 'station', height: 0 },
      { x: 1, y: 0, type: 'lift', height: 1 },
      { x: 1, y: 1, type: 'drop', height: 0 },
      { x: 0, y: 1, type: 'straight', height: 0 },
    ];
    expect(validateTrack(loop)).toEqual({ valid: true, reason: 'ok' });
  });

  it('rejects a circuit that never comes back down to the station', () => {
    const loop: Layout = [
      { x: 0, y: 0, type: 'station', height: 0 },
      { x: 1, y: 0, type: 'lift', height: 1 },
      { x: 1, y: 1, type: 'straight', height: 1 },
      { x: 0, y: 1, type: 'straight', height: 1 },
    ];
    expect(validateTrack(loop).reason).toBe('not-level');
  });

  it('rejects climbing more than the lift hills can pull', () => {
    const loop: Layout = [
      { x: 0, y: 0, type: 'station', height: 0 },
      { x: 1, y: 0, type: 'lift', height: 1 },
      { x: 1, y: 1, type: 'straight', height: 3 }, // +2 with no extra lift to back it
      { x: 0, y: 1, type: 'straight', height: 0 },
    ];
    expect(validateTrack(loop).reason).toBe('too-steep');
  });

  it('treats a track with no heights exactly as ground level', () => {
    const flat: Layout = [
      { x: 0, y: 0, type: 'station' },
      { x: 1, y: 0, type: 'lift' },
      { x: 1, y: 1, type: 'drop' },
      { x: 0, y: 1, type: 'straight' },
    ];
    expect(validateTrack(flat).valid).toBe(true);
  });

  it('scores a big drop as more exciting and more nauseating', () => {
    const flat: Layout = [
      { x: 0, y: 0, type: 'station', height: 0 },
      { x: 1, y: 0, type: 'lift', height: 0 },
      { x: 1, y: 1, type: 'drop', height: 0 },
      { x: 0, y: 1, type: 'straight', height: 0 },
    ];
    const hilly: Layout = [
      { x: 0, y: 0, type: 'station', height: 0 },
      { x: 1, y: 0, type: 'lift', height: 2 },
      { x: 1, y: 1, type: 'drop', height: 0 }, // a 2-level plunge
      { x: 0, y: 1, type: 'straight', height: 0 },
    ];
    expect(computeRatings(hilly).excitement).toBeGreaterThan(computeRatings(flat).excitement);
    expect(computeRatings(hilly).nausea).toBeGreaterThan(computeRatings(flat).nausea);
  });

  it('nextPieceHeight climbs on lifts, descends on drops, holds otherwise', () => {
    expect(nextPieceHeight(0, 'lift')).toBe(1);
    expect(nextPieceHeight(MAX_HEIGHT, 'lift')).toBe(MAX_HEIGHT); // clamped
    expect(nextPieceHeight(2, 'drop')).toBe(1);
    expect(nextPieceHeight(0, 'drop')).toBe(0); // clamped
    expect(nextPieceHeight(2, 'straight')).toBe(2);
  });
});

describe('park geometry + pathing', () => {
  it('lays a connected path network the guests can walk', () => {
    const sim = createParkSim(1);
    const path = bfsPath(sim, sim.gate, { x: 2, y: 7 });
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ x: 2, y: 7 });
  });

  it('returns no route to an unreachable grass corner', () => {
    const sim = createParkSim(1);
    expect(bfsPath(sim, sim.gate, { x: 0, y: 0 })).toEqual([]);
  });

  it('finds the path tile beside a ride station', () => {
    const sim = createParkSim(1);
    const st = sim.coasters[0].layout[0];
    expect(adjacentPathTile(sim, st.x, st.y)).toEqual({ x: 8, y: 4 });
  });
});

describe('peep state machine', () => {
  it('goes dizzy then vomits, leaving a puddle behind', () => {
    const sim = createParkSim(2);
    const p = makePeep(sim, { state: 'dizzy', stateT: 0, nausea: 1, x: 8, y: 8 });
    sim.peeps.push(p);
    const ev = makeEvents();

    stepPeep(sim, p, 2.5, ev); // past DIZZY_TIME
    expect(p.state).toBe('vomiting');

    stepPeep(sim, p, 1.5, ev); // past VOMIT_TIME
    expect(ev.pukes).toBe(1);
    expect(sim.puddles).toHaveLength(1);
    expect(sim.puddles[0]).toMatchObject({ x: 8, y: 8 });
    expect(p.state).not.toBe('vomiting');
    expect(p.nausea).toBeLessThan(1);
  });

  it('a merely thrilled guest gets dizzy but walks off without puking', () => {
    const sim = createParkSim(2);
    const p = makePeep(sim, { state: 'dizzy', stateT: 0, nausea: 0.1, x: 8, y: 8 });
    sim.peeps.push(p);
    stepPeep(sim, p, 2.5, makeEvents());
    expect(p.state).not.toBe('vomiting');
    expect(sim.puddles).toHaveLength(0);
  });

  it('rings up a sale when a guest finishes buying at a stall', () => {
    const sim = createParkSim(3);
    const stall = sim.stalls[0];
    const p = makePeep(sim, { state: 'buying', stateT: 0, goal: 'stall', targetId: stall.id, x: 10, y: 7 });
    sim.peeps.push(p);
    const cash0 = sim.cash;
    const ev = makeEvents();

    stepPeep(sim, p, 2.0, ev); // past BUY_TIME
    expect(ev.sales).toBe(1);
    expect(sim.cash).toBe(cash0 + STALL_INCOME[stall.type]);
    expect(ev.lastSaleAt).toEqual({ x: stall.x, y: stall.y });
    expect(p.state).not.toBe('buying');
  });

  it('kicks a queuing guest out of line when the ride closes', () => {
    const sim = createParkSim(4);
    const c = sim.coasters[0];
    c.open = false;
    const p = makePeep(sim, { state: 'queuing', goal: 'ride', targetId: c.id });
    c.queue.push(p.id);
    sim.peeps.push(p);
    stepPeep(sim, p, 0.1, makeEvents());
    expect(p.state).not.toBe('queuing');
    expect(c.queue).not.toContain(p.id);
  });
});

describe('handyman', () => {
  it('walks to a puddle and sweeps it away', () => {
    const sim = createParkSim(5);
    expect(hireHandyman(sim)).toBe(true);
    const h = sim.handymen[0];
    sim.puddles.push({ id: sim.nextPuddleId++, x: 8, y: 9, age: 0 });

    let swept = false;
    let sawSweeping = false;
    for (let i = 0; i < 500 && sim.puddles.length > 0; i++) {
      const ev = makeEvents();
      stepHandyman(sim, h, 0.1, ev);
      if (h.state === 'sweeping') sawSweeping = true;
      if (ev.sweeps > 0) swept = true;
    }
    expect(sim.puddles).toHaveLength(0);
    expect(sawSweeping).toBe(true);
    expect(swept).toBe(true);
  });

  it('charges a hiring fee and refuses when broke', () => {
    const sim = createParkSim(5);
    sim.cash = 50;
    expect(hireHandyman(sim)).toBe(false);
    expect(sim.handymen).toHaveLength(0);
  });
});

describe('stalls + paths as build actions', () => {
  it('places a food stall next to a path and bills for it', () => {
    const sim = createParkSim(6);
    const cash0 = sim.cash;
    expect(buildStall(sim, 'food', 9, 6)).toBe(true); // beside promenade tile (9,7)
    expect(sim.cash).toBe(cash0 - STALL_COST.food);
  });

  it('refuses a stall with no path beside it', () => {
    const sim = createParkSim(6);
    expect(buildStall(sim, 'food', 0, 0)).toBe(false);
  });

  it('gates the balloon stall behind research', () => {
    const sim = createParkSim(6);
    expect(buildStall(sim, 'balloon', 7, 6)).toBe(false);
    sim.research.unlocked.balloonStall = true;
    expect(buildStall(sim, 'balloon', 7, 6)).toBe(true);
  });

  it('paves and un-paves tiles but protects the gate', () => {
    const sim = createParkSim(6);
    const cash0 = sim.cash;
    expect(togglePath(sim, 5, 5)).toBe('built');
    expect(sim.terrain[5][5]).toBe('path');
    expect(sim.cash).toBe(cash0 - PATH_COST);
    expect(togglePath(sim, 5, 5)).toBe('removed');
    expect(sim.terrain[5][5]).toBe('grass');
    expect(togglePath(sim, sim.gate.x, sim.gate.y)).toBe('blocked');
  });
});

describe('research progression', () => {
  it('unlocks drop, then loop, then the balloon stall over time', () => {
    const sim = createParkSim(7);
    expect(sim.research.unlocked.drop).toBe(false);

    let first: string | null = null;
    for (let i = 0; i < 200 && !first; i++) first = stepResearch(sim, 0.5);
    expect(first).toBe('drop');
    expect(sim.research.unlocked.drop).toBe(true);

    for (let i = 0; i < 400; i++) stepResearch(sim, 0.5);
    expect(sim.research.unlocked.loop).toBe(true);
    expect(sim.research.unlocked.balloonStall).toBe(true);
  });

  it('progress needs a full research period to land the first unlock', () => {
    const sim = createParkSim(7);
    expect(stepResearch(sim, RESEARCH_TIME - 1)).toBeNull();
    expect(stepResearch(sim, 2)).toBe('drop');
  });
});

describe('living park integration', () => {
  it('spawns guests who ride an open coaster', () => {
    const sim = createParkSim(42);
    const c = sim.coasters[0];
    c.layout = [
      { x: 8, y: 3, type: 'station', height: 0 },
      { x: 9, y: 3, type: 'lift', height: 1 },
      { x: 9, y: 4, type: 'drop', height: 0 },
      { x: 8, y: 4, type: 'straight', height: 0 },
    ];
    expect(validateTrack(c.layout).valid).toBe(true);
    c.open = true;

    let boarded = 0;
    let sawPeep = false;
    for (let i = 0; i < 3000; i++) {
      const r = stepPark(sim, 0.1);
      boarded += r.events.boarded;
      if (sim.peeps.length > 0) sawPeep = true;
    }
    expect(sawPeep).toBe(true);
    expect(sim.totalGuests).toBeGreaterThan(0);
    expect(boarded).toBeGreaterThan(0);
  });

  it('is fully deterministic for a given seed', () => {
    const a = createParkSim(99);
    const b = createParkSim(99);
    for (let i = 0; i < 500; i++) {
      stepPark(a, 0.1);
      stepPark(b, 0.1);
    }
    expect(a.totalGuests).toBe(b.totalGuests);
    expect(a.peeps.length).toBe(b.peeps.length);
    expect(a.cash).toBeCloseTo(b.cash, 6);
  });

  it('reports grime that rises with unswept puddles', () => {
    const sim = createParkSim(8);
    expect(dirtiness(sim)).toBe(0);
    for (let i = 0; i < 4; i++) sim.puddles.push({ id: i, x: 8, y: 7, age: 0 });
    expect(dirtiness(sim)).toBeGreaterThan(0);
    expect(dirtiness(sim)).toBeLessThanOrEqual(1);
  });
});
