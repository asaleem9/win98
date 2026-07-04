import {
  emptyCombo,
  addTrick,
  addBasePoints,
  comboMultiplier,
  comboValue,
  comboText,
  comboTrickList,
  trickBasePoints,
  trickName,
  trickSpin,
  validateLanding,
  emptyManual,
  enterManual,
  updateManual,
  manualHasBailed,
  manualExpired,
  manualPopReady,
  MANUAL_INPUT_WINDOW,
  MANUAL_POINTS_PER_SEC,
  MANUAL_MAX_TIME,
  emptySkate,
  collectLetter,
  skateCount,
  skateComplete,
  skateBonus,
  mergeSkateBadge,
  SKATE_LETTERS,
  SKATE_BONUS,
  specialGain,
  specialAfterLanding,
  specialArmed,
  specialAfterBail,
  spendSpecial,
  SPECIAL_MAX,
  TONY_LEVELS,
} from '../engine/trick';

describe('extended air-trick roster', () => {
  it('scores the two new air tricks and the 900 distinctly', () => {
    expect(trickBasePoints('judo')).toBe(180);
    expect(trickBasePoints('christ')).toBe(240);
    expect(trickBasePoints('the900')).toBe(2500);
  });

  it('gives every scoring trick its own base value', () => {
    const ids = ['kickflip', 'heelflip', 'grab', 'judo', 'christ', 'manual', 'grind', 'the900'];
    const pts = ids.map(trickBasePoints);
    expect(new Set(pts).size).toBe(pts.length);
  });

  it('names the 900 and spins it to a clean upright landing', () => {
    expect(trickName('the900')).toBe('The 900');
    expect(trickSpin('the900') % 360).toBe(0);
    expect(validateLanding(trickSpin('the900'))).toBe('clean');
  });
});

describe('manual link', () => {
  it('opens only when Up follows Down inside the pop window', () => {
    expect(manualPopReady(1.0, 1.2)).toBe(true);
    expect(manualPopReady(1.0, 1.0 + MANUAL_INPUT_WINDOW)).toBe(true);
    expect(manualPopReady(1.0, 1.0 + MANUAL_INPUT_WINDOW + 0.01)).toBe(false);
    expect(manualPopReady(-1, 0.1)).toBe(false); // never primed
    expect(manualPopReady(1.0, 0.9)).toBe(false); // Up before Down
  });

  it('starts centered and drifts, paying out points per second', () => {
    const m = enterManual(1); // steady rightward pull
    expect(m.active).toBe(true);
    expect(m.balance).toBe(0);

    const r = updateManual(m, 0, 0.5); // no correction for half a second
    expect(r.manual.balance).toBeGreaterThan(0);
    expect(r.gained).toBe(Math.floor(MANUAL_POINTS_PER_SEC * 0.5));
  });

  it('holds center when the correction matches the drift', () => {
    const held = updateManual(enterManual(1), 1, 0.5); // input +1 cancels drift +1
    expect(held.manual.balance).toBeCloseTo(0, 5);
  });

  it('accrues whole points and carries the sub-point remainder', () => {
    const r1 = updateManual(enterManual(0), 0, 0.016); // 1.6 pts -> 1, .6 carried
    expect(r1.gained).toBe(1);
    const r2 = updateManual(r1.manual, 0, 0.016); // .6 + 1.6 = 2.2 -> 2
    expect(r2.gained).toBe(2);
  });

  it('keeps the multiplier climbing through the manual into the next trick', () => {
    let c = emptyCombo();
    c = addTrick(c, 'kickflip'); // x1
    c = addTrick(c, 'grind'); // x2
    c = addTrick(c, 'manual'); // x3 — the manual link
    expect(comboMultiplier(c)).toBe(3);
    c = addBasePoints(c, 250); // per-second manual points, multiplier untouched
    expect(comboMultiplier(c)).toBe(3);
    c = addTrick(c, 'heelflip'); // x4 — chained out of the manual
    expect(comboMultiplier(c)).toBe(4);
    expect(comboValue(c)).toBe(c.basePoints * 4);
  });

  it('bails past the balance threshold — the whole combo is at stake', () => {
    const r = updateManual(enterManual(5), 0, 1); // hard drift, no correction
    expect(manualHasBailed(r.manual)).toBe(true);
  });

  it('coasts out after the max hold time', () => {
    const long = { ...enterManual(0), time: MANUAL_MAX_TIME };
    expect(manualExpired(long)).toBe(true);
    expect(manualExpired(enterManual(0))).toBe(false);
  });

  it('an empty manual is inert', () => {
    const m = emptyManual();
    expect(m.active).toBe(false);
    expect(manualHasBailed(m)).toBe(false);
  });
});

describe('S-K-A-T-E letters', () => {
  it('spells SKATE with five empty slots', () => {
    expect(SKATE_LETTERS).toEqual(['S', 'K', 'A', 'T', 'E']);
    expect(emptySkate()).toEqual([false, false, false, false, false]);
  });

  it('collects letters idempotently and counts them', () => {
    let s = emptySkate();
    s = collectLetter(s, 2);
    expect(skateCount(s)).toBe(1);
    s = collectLetter(s, 2); // same letter again — no double count
    expect(skateCount(s)).toBe(1);
    s = collectLetter(s, 0);
    expect(skateCount(s)).toBe(2);
    expect(skateComplete(s)).toBe(false);
    expect(skateBonus(s)).toBe(0);
  });

  it('pays the bonus once every letter is grabbed', () => {
    let s = emptySkate();
    for (let i = 0; i < 5; i++) s = collectLetter(s, i);
    expect(skateComplete(s)).toBe(true);
    expect(skateBonus(s)).toBe(SKATE_BONUS);
  });

  it('persists a per-level badge and never clears an earned one', () => {
    const n = TONY_LEVELS.length;
    let badges: boolean[] = new Array(n).fill(false);
    badges = mergeSkateBadge(badges, 3, true);
    expect(badges[3]).toBe(true);
    expect(badges.filter(Boolean)).toHaveLength(1);

    // a later incomplete run elsewhere leaves level 3's badge alone
    badges = mergeSkateBadge(badges, 5, false);
    expect(badges[3]).toBe(true);
    expect(badges[5]).toBe(false);

    // merging always returns a full-length array, even from a short input
    expect(mergeSkateBadge([], 3, false)).toHaveLength(n);
  });
});

describe('special meter', () => {
  it('fills more from clean landings and bigger combos', () => {
    expect(specialGain('clean', 3)).toBeGreaterThan(specialGain('sketchy', 3));
    expect(specialGain('clean', 6)).toBeGreaterThan(specialGain('clean', 2));
    expect(specialGain('bail', 5)).toBe(0);
  });

  it('accumulates and clamps at the max', () => {
    const f = specialAfterLanding(0, 'clean', 4);
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThanOrEqual(SPECIAL_MAX);
    expect(specialAfterLanding(90, 'clean', 50)).toBe(SPECIAL_MAX);
  });

  it('arms only at full and disarms below', () => {
    expect(specialArmed(SPECIAL_MAX)).toBe(true);
    expect(specialArmed(SPECIAL_MAX - 1)).toBe(false);
    expect(specialArmed(0)).toBe(false);
  });

  it('a bail dumps it and firing the 900 spends it', () => {
    expect(specialAfterBail()).toBe(0);
    expect(spendSpecial()).toBe(0);
  });

  it('takes several clean combos to arm — not one landing', () => {
    let f = 0;
    let landings = 0;
    while (!specialArmed(f) && landings < 20) {
      f = specialAfterLanding(f, 'clean', 3);
      landings++;
    }
    expect(specialArmed(f)).toBe(true);
    expect(landings).toBeGreaterThan(1);
  });
});

describe('combo banner text', () => {
  it('composes trick names in order', () => {
    let c = emptyCombo();
    c = addTrick(c, 'kickflip');
    c = addTrick(c, 'grind');
    c = addTrick(c, 'manual');
    expect(comboText(c)).toBe('Kickflip + 50-50 Grind + Manual');
  });

  it('collapses consecutive repeats to Name xN', () => {
    let c = emptyCombo();
    c = addTrick(c, 'grind');
    c = addTrick(c, 'grind');
    c = addTrick(c, 'grind');
    c = addTrick(c, 'kickflip');
    expect(comboTrickList(c)).toEqual(['50-50 Grind x3', 'Kickflip']);
    expect(comboText(c)).toBe('50-50 Grind x3 + Kickflip');
  });

  it('is empty for an empty combo', () => {
    expect(comboText(emptyCombo())).toBe('');
    expect(comboTrickList(emptyCombo())).toEqual([]);
  });
});
