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
} from '../engine/coaster';

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
