import { makeRng } from '../engine/rng';
import {
  Cart,
  GameState,
  LANDMARKS,
  HUNT_BAG_CAP,
  FERRY_COST,
  professionCash,
  scoreMultiplier,
  computeStoreTotal,
  remainingCash,
  canAfford,
  initialState,
  foodPerDay,
  milesPerDay,
  healthDelta,
  aliveCount,
  advanceDay,
  travel,
  resolveRiver,
  riverDepth,
  resolveHunt,
  computeScore,
  formatDate,
  deathCheck,
  makeTombstone,
  nextLandmark,
} from '../engine/oregon';

const CART: Cart = { oxen: 6, food: 800, ammo: 10, clothing: 5, parts: 3 };

function freshBanker(): GameState {
  return initialState('banker', CART);
}

describe('store / budget math', () => {
  it('gives each profession its starting cash and inverse multiplier', () => {
    expect(professionCash('banker')).toBe(1600);
    expect(professionCash('carpenter')).toBe(800);
    expect(professionCash('farmer')).toBe(400);
    expect(scoreMultiplier('banker')).toBe(1);
    expect(scoreMultiplier('carpenter')).toBe(2);
    expect(scoreMultiplier('farmer')).toBe(3);
  });

  it('sums a cart at the listed prices', () => {
    // 6*40 + 800*0.2 + 10*2 + 5*10 + 3*10 = 240 + 160 + 20 + 50 + 30 = 500
    expect(computeStoreTotal(CART)).toBe(500);
  });

  it('computes remaining cash and affordability', () => {
    expect(remainingCash('banker', CART)).toBe(1100);
    expect(canAfford('banker', CART)).toBe(true);
    const pricey: Cart = { oxen: 20, food: 2000, ammo: 0, clothing: 0, parts: 0 };
    expect(canAfford('farmer', pricey)).toBe(false);
    expect(remainingCash('farmer', pricey)).toBeLessThan(0);
  });

  it('seeds initial state from the cart', () => {
    const s = freshBanker();
    expect(s.cash).toBe(1100);
    expect(s.oxen).toBe(6);
    expect(s.food).toBe(800);
    expect(s.health).toBe(100);
    expect(aliveCount(s)).toBe(5);
    expect(s.status).toBe('traveling');
    expect(s.landmarkIndex).toBe(0);
  });
});

describe('daily consumption', () => {
  it('scales food use by rations and alive count', () => {
    const s = freshBanker();
    expect(foodPerDay({ ...s, rations: 'filling' })).toBe(15); // 3 * 5
    expect(foodPerDay({ ...s, rations: 'meager' })).toBe(10);
    expect(foodPerDay({ ...s, rations: 'bare-bones' })).toBe(5);
  });

  it('never returns zero miles when oxen are present and zero when none', () => {
    const s = freshBanker();
    const rand = makeRng(42);
    for (let i = 0; i < 20; i++) {
      expect(milesPerDay(s, rand)).toBeGreaterThan(0);
    }
    expect(milesPerDay({ ...s, oxen: 0 }, rand)).toBe(0);
  });

  it('grueling pace / bare-bones rations hurt health', () => {
    const s = freshBanker();
    expect(healthDelta({ ...s, pace: 'steady', rations: 'filling' }, true)).toBeGreaterThan(0);
    expect(healthDelta({ ...s, pace: 'grueling', rations: 'bare-bones' }, true)).toBeLessThan(0);
    expect(healthDelta({ ...s, pace: 'steady', rations: 'filling' }, false)).toBeLessThan(
      healthDelta({ ...s, pace: 'steady', rations: 'filling' }, true),
    );
  });
});

describe('advanceDay / travel progression', () => {
  it('moves the wagon forward and consumes food each day', () => {
    const s = freshBanker();
    const { state } = advanceDay(s, makeRng(7));
    expect(state.day).toBe(1);
    expect(state.miles).toBeGreaterThan(0);
    expect(state.food).toBeLessThan(s.food);
  });

  it('reaches landmarks in strictly increasing order, and can reach the valley', () => {
    let anyArrived = false;
    for (let seed = 0; seed < 25; seed++) {
      // A lavishly provisioned party on filling rations to keep health up.
      let s: GameState = initialState('banker', { oxen: 6, food: 3000, ammo: 10, clothing: 5, parts: 5 });
      const rand = makeRng(seed);
      let guard = 0;
      let lastIdx = s.landmarkIndex;
      while (s.status !== 'arrived' && s.status !== 'dead' && guard < 3000) {
        const step = s.status === 'atRiver' ? resolveRiver(s, 'ferry', 4, rand) : advanceDay(s, rand);
        // landmark index never decreases and only steps up by one at a time
        expect(step.state.landmarkIndex).toBeGreaterThanOrEqual(lastIdx);
        expect(step.state.landmarkIndex - lastIdx).toBeLessThanOrEqual(1);
        lastIdx = step.state.landmarkIndex;
        s = step.state;
        guard++;
      }
      if (s.status === 'arrived') {
        anyArrived = true;
        expect(s.landmarkIndex).toBe(LANDMARKS.length - 1);
        expect(s.miles).toBe(2000);
      }
    }
    expect(anyArrived).toBe(true);
  });

  it('parks at a river landmark and waits for a crossing choice', () => {
    let s = freshBanker();
    const rand = makeRng(5);
    let guard = 0;
    while (s.status === 'traveling' && guard < 500) {
      s = advanceDay(s, rand).state;
      guard++;
    }
    expect(s.status).toBe('atRiver');
    expect(LANDMARKS[s.landmarkIndex].river).toBe(true);
  });

  it('travel() stops on the first eventful day or after maxDays', () => {
    const s = freshBanker();
    const { state } = travel(s, makeRng(9), 6);
    expect(state.day).toBeGreaterThan(0);
    expect(state.day).toBeLessThanOrEqual(6);
  });
});

describe('death detection', () => {
  it('flags an empty party as dead', () => {
    const s = freshBanker();
    const wiped = { ...s, members: s.members.map((m) => ({ ...m, alive: false })) };
    expect(deathCheck(wiped)).toMatch(/perished/);
  });

  it('flags zero health with the active illness as cause', () => {
    const s = freshBanker();
    const sick: GameState = {
      ...s,
      health: 0,
      members: s.members.map((m, i) => (i === 0 ? { ...m, illness: 'cholera' } : m)),
    };
    expect(deathCheck(sick)).toBe('died of cholera');
  });

  it('flags a wagon with no oxen as stranded', () => {
    const s = freshBanker();
    expect(deathCheck({ ...s, oxen: 0 })).toMatch(/stranded/);
  });

  it('advanceDay sets dead status and cause when the party starves out', () => {
    const s: GameState = { ...freshBanker(), food: 0, health: 5, rations: 'bare-bones', pace: 'grueling' };
    let cur = s;
    const rand = makeRng(3);
    let guard = 0;
    while (cur.status === 'traveling' && guard < 50) {
      cur = advanceDay(cur, rand).state;
      guard++;
    }
    expect(cur.status).toBe('dead');
    expect(cur.causeOfDeath).toBeTruthy();
  });
});

describe('river crossings by depth + choice', () => {
  it('ferry costs cash and is nearly always safe', () => {
    const s = freshBanker();
    let safe = 0;
    for (let seed = 0; seed < 40; seed++) {
      const { state } = resolveRiver(s, 'ferry', 10, makeRng(seed));
      expect(state.cash).toBe(s.cash - FERRY_COST);
      if (state.oxen === s.oxen && state.food === s.food) safe++;
    }
    expect(safe).toBeGreaterThan(30);
  });

  it('deep fords are far riskier than shallow ones', () => {
    const s = freshBanker();
    let shallowMishaps = 0;
    let deepMishaps = 0;
    for (let seed = 0; seed < 60; seed++) {
      const shallow = resolveRiver(s, 'ford', 2, makeRng(seed)).state;
      const deep = resolveRiver(s, 'ford', 12, makeRng(seed)).state;
      if (shallow.oxen < s.oxen || shallow.food < s.food || aliveCount(shallow) < aliveCount(s)) shallowMishaps++;
      if (deep.oxen < s.oxen || deep.food < s.food || aliveCount(deep) < aliveCount(s)) deepMishaps++;
    }
    expect(deepMishaps).toBeGreaterThan(shallowMishaps);
  });

  it('returns the party to traveling after a successful crossing', () => {
    const s = { ...freshBanker(), status: 'atRiver' as const };
    const { state } = resolveRiver(s, 'ferry', 4, makeRng(1));
    expect(state.status === 'traveling' || state.status === 'dead').toBe(true);
  });

  it('produces a plausible depth', () => {
    const rand = makeRng(11);
    for (let i = 0; i < 20; i++) {
      const d = riverDepth(rand);
      expect(d).toBeGreaterThanOrEqual(2);
      expect(d).toBeLessThanOrEqual(12);
    }
  });
});

describe('hunting bag cap and ammo', () => {
  it('caps carried meat at the bag limit', () => {
    const s = freshBanker();
    const { state } = resolveHunt(s, 500, 3);
    expect(state.food).toBe(s.food + HUNT_BAG_CAP);
  });

  it('adds partial hauls under the cap', () => {
    const s = freshBanker();
    const { state } = resolveHunt(s, 40, 2);
    expect(state.food).toBe(s.food + 40);
  });

  it('deducts ammo in boxes of 20 bullets, rounded up', () => {
    const s = { ...freshBanker(), ammo: 10 };
    expect(resolveHunt(s, 10, 1).state.ammo).toBe(9); // ceil(1/20) = 1 box
    expect(resolveHunt(s, 10, 25).state.ammo).toBe(8); // ceil(25/20) = 2 boxes
    expect(resolveHunt(s, 10, 0).state.ammo).toBe(10); // no shots, no ammo used
  });

  it('never lets ammo go negative', () => {
    const s = { ...freshBanker(), ammo: 1 };
    expect(resolveHunt(s, 10, 200).state.ammo).toBe(0);
  });
});

describe('scoring', () => {
  it('rewards survivors, supplies, and arrival', () => {
    const arrived: GameState = { ...freshBanker(), status: 'arrived', miles: 2000 };
    const base = computeScore(arrived);
    expect(base).toBeGreaterThan(0);
    // fewer oxen -> lower score
    expect(computeScore({ ...arrived, oxen: 1 })).toBeLessThan(base);
    // dead party mid-trail scores less than a full arrival
    const died: GameState = { ...freshBanker(), status: 'dead', miles: 800 };
    expect(computeScore(died)).toBeLessThan(base);
  });

  it('applies the profession multiplier', () => {
    const banker: GameState = { ...initialState('banker', CART), status: 'arrived', miles: 2000 };
    const farmer: GameState = { ...initialState('farmer', CART), status: 'arrived', miles: 2000, cash: banker.cash };
    // identical resources but farmer triples the payout
    expect(computeScore(farmer)).toBeGreaterThan(computeScore(banker));
  });
});

describe('dates, tombstones, landmarks', () => {
  it('formats dates from the March 1 1848 departure', () => {
    expect(formatDate(0)).toBe('March 1, 1848');
    expect(formatDate(30)).toBe('March 31, 1848');
    expect(formatDate(31)).toBe('April 1, 1848');
  });

  it('builds a tombstone snapshot', () => {
    const s = { ...freshBanker(), miles: 640, day: 45 };
    const t = makeTombstone(s, 'Ezra', 'Bit off more trail than he could chew.');
    expect(t.name).toBe('Ezra');
    expect(t.miles).toBe(640);
    expect(t.epitaph).toMatch(/trail/);
    expect(t.date).toContain('1848');
  });

  it('reports the next landmark', () => {
    const s = freshBanker();
    expect(nextLandmark(s)?.name).toBe(LANDMARKS[1].name);
    expect(nextLandmark({ ...s, landmarkIndex: LANDMARKS.length - 1 })).toBeNull();
  });
});
