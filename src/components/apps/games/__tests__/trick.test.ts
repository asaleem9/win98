import {
  TRICKS,
  GRIND_TRICK,
  trickBasePoints,
  emptyCombo,
  addTrick,
  comboMultiplier,
  comboValue,
  updateGrindBalance,
  grindHasBailed,
  angleFromUpright,
  validateLanding,
  landingMultiplier,
  bankCombo,
  goalTier,
  finalScore,
  SCORE_GOALS,
} from '../engine/trick';

describe('trick base points', () => {
  it('returns the defined points for each air trick', () => {
    expect(trickBasePoints('kickflip')).toBe(TRICKS.kickflip.points);
    expect(trickBasePoints('grab')).toBe(150);
    expect(trickBasePoints('manual')).toBe(80);
  });

  it('knows the grind trick and unknown ids', () => {
    expect(trickBasePoints('grind')).toBe(GRIND_TRICK.points);
    expect(trickBasePoints('nope')).toBe(0);
  });
});

describe('combo multiplier growth', () => {
  it('starts at x1 and rises by one per trick', () => {
    let c = emptyCombo();
    expect(comboMultiplier(c)).toBe(1);
    c = addTrick(c, 'kickflip');
    expect(comboMultiplier(c)).toBe(1);
    c = addTrick(c, 'heelflip');
    expect(comboMultiplier(c)).toBe(2);
    c = addTrick(c, 'grab');
    expect(comboMultiplier(c)).toBe(3);
  });

  it('accumulates base points and scales the value by the multiplier', () => {
    let c = emptyCombo();
    c = addTrick(c, 'kickflip'); // 100, x1
    expect(comboValue(c)).toBe(100);
    c = addTrick(c, 'manual'); // +80 => 180 base, x2
    expect(c.basePoints).toBe(180);
    expect(comboValue(c)).toBe(360);
  });

  it('does not mutate the previous combo state', () => {
    const c0 = emptyCombo();
    const c1 = addTrick(c0, 'grab');
    expect(c0.tricks).toHaveLength(0);
    expect(c1.tricks).toHaveLength(1);
  });
});

describe('grind balance update', () => {
  it('drift pushes the meter away from center', () => {
    const b = updateGrindBalance(0, 1, 0, 0.5);
    expect(b).toBeGreaterThan(0);
  });

  it('a matching correction cancels the drift', () => {
    const b = updateGrindBalance(0.3, 1, 1, 0.5);
    expect(b).toBeCloseTo(0.3, 5);
  });

  it('clamps to the [-2, 2] range', () => {
    expect(updateGrindBalance(1.9, 5, 0, 1)).toBe(2);
    expect(updateGrindBalance(-1.9, -5, 0, 1)).toBe(-2);
  });

  it('bails once balance reaches the threshold', () => {
    expect(grindHasBailed(0.5)).toBe(false);
    expect(grindHasBailed(1)).toBe(true);
    expect(grindHasBailed(-1.2)).toBe(true);
  });
});

describe('landing validation', () => {
  it('near-upright rotations land clean', () => {
    expect(validateLanding(0)).toBe('clean');
    expect(validateLanding(360)).toBe('clean');
    expect(validateLanding(20)).toBe('clean');
    expect(validateLanding(-15)).toBe('clean');
  });

  it('slightly off rotations are sketchy', () => {
    expect(validateLanding(40)).toBe('sketchy');
    expect(validateLanding(320)).toBe('sketchy');
  });

  it('over-rotated / upside-down landings bail', () => {
    expect(validateLanding(180)).toBe('bail');
    expect(validateLanding(100)).toBe('bail');
  });

  it('measures the smallest angle from upright', () => {
    expect(angleFromUpright(0)).toBe(0);
    expect(angleFromUpright(360)).toBe(0);
    expect(angleFromUpright(90)).toBe(90);
    expect(angleFromUpright(350)).toBe(10);
  });

  it('banks full value clean, half sketchy, nothing on a bail', () => {
    let c = emptyCombo();
    c = addTrick(c, 'kickflip');
    c = addTrick(c, 'heelflip'); // 220 base, x2 => 440
    expect(landingMultiplier('clean')).toBe(1);
    expect(bankCombo(c, 'clean')).toBe(440);
    expect(bankCombo(c, 'sketchy')).toBe(220);
    expect(bankCombo(c, 'bail')).toBe(0);
  });
});

describe('goal tiers', () => {
  it('maps score to the highest tier reached', () => {
    expect(goalTier(0)).toBe('none');
    expect(goalTier(SCORE_GOALS.bronze - 1)).toBe('none');
    expect(goalTier(SCORE_GOALS.bronze)).toBe('bronze');
    expect(goalTier(SCORE_GOALS.silver)).toBe('silver');
    expect(goalTier(SCORE_GOALS.gold)).toBe('gold');
    expect(goalTier(999999)).toBe('gold');
  });

  it('respects custom thresholds', () => {
    expect(goalTier(50, { bronze: 10, silver: 100, gold: 1000 })).toBe('bronze');
  });
});

describe('final score', () => {
  it('sums every banked combo', () => {
    expect(finalScore([])).toBe(0);
    expect(finalScore([440, 0, 1200, 360])).toBe(2000);
  });
});
