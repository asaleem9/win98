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
  TONY_LEVELS,
  tierRank,
  higherTier,
  isLevelUnlocked,
  unlockedLevelCount,
  type GoalTier,
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

describe('level definitions', () => {
  it('ships eight levels', () => {
    expect(TONY_LEVELS).toHaveLength(8);
  });

  it('has ascending medal goals on every level', () => {
    for (const level of TONY_LEVELS) {
      expect(level.goals.bronze).toBeLessThan(level.goals.silver);
      expect(level.goals.silver).toBeLessThan(level.goals.gold);
    }
  });

  it('uses positive feature weights and sane ranges', () => {
    for (const level of TONY_LEVELS) {
      const w = level.featureWeights;
      expect(w.rail).toBeGreaterThan(0);
      expect(w.ramp).toBeGreaterThan(0);
      expect(w.gap).toBeGreaterThan(0);
      expect(w.flat).toBeGreaterThan(0);
      expect(level.scroll).toBeGreaterThan(0);
      expect(level.railHeightRange[0]).toBeLessThanOrEqual(level.railHeightRange[1]);
      expect(level.gapWidthRange[0]).toBeLessThanOrEqual(level.gapWidthRange[1]);
      expect(level.palette.sky).toHaveLength(3);
    }
  });

  it('ramps difficulty upward — later levels scroll faster with steeper gold goals', () => {
    for (let i = 1; i < TONY_LEVELS.length; i++) {
      expect(TONY_LEVELS[i].scroll).toBeGreaterThan(TONY_LEVELS[i - 1].scroll);
      expect(TONY_LEVELS[i].goals.gold).toBeGreaterThan(TONY_LEVELS[i - 1].goals.gold);
    }
  });

  it('wires each level to its own goal thresholds', () => {
    for (const level of TONY_LEVELS) {
      const { bronze, silver, gold } = level.goals;
      expect(goalTier(bronze - 1, level.goals)).toBe('none');
      expect(goalTier(bronze, level.goals)).toBe('bronze');
      expect(goalTier(silver, level.goals)).toBe('silver');
      expect(goalTier(gold, level.goals)).toBe('gold');
    }
  });
});

describe('tier comparison', () => {
  it('orders the tiers', () => {
    expect(tierRank('none')).toBe(0);
    expect(tierRank('bronze')).toBe(1);
    expect(tierRank('silver')).toBe(2);
    expect(tierRank('gold')).toBe(3);
  });

  it('keeps the better of two tiers', () => {
    expect(higherTier('none', 'bronze')).toBe('bronze');
    expect(higherTier('gold', 'silver')).toBe('gold');
    expect(higherTier('silver', 'silver')).toBe('silver');
  });
});

describe('medal-gated progression', () => {
  const none: GoalTier[] = new Array(TONY_LEVELS.length).fill('none');

  it('opens only the first level with no medals', () => {
    expect(isLevelUnlocked(0, none)).toBe(true);
    expect(isLevelUnlocked(1, none)).toBe(false);
    expect(unlockedLevelCount(none)).toBe(1);
  });

  it('unlocks the next level once the prior one earns bronze', () => {
    const tiers = [...none];
    tiers[0] = 'bronze';
    expect(isLevelUnlocked(1, tiers)).toBe(true);
    expect(isLevelUnlocked(2, tiers)).toBe(false);
    expect(unlockedLevelCount(tiers)).toBe(2);
  });

  it('treats silver and gold as unlocking too', () => {
    const tiers = [...none];
    tiers[0] = 'gold';
    tiers[1] = 'silver';
    expect(unlockedLevelCount(tiers)).toBe(3);
  });

  it('unlocks the whole ladder when every level is cleared', () => {
    const all: GoalTier[] = new Array(TONY_LEVELS.length).fill('gold');
    expect(unlockedLevelCount(all)).toBe(TONY_LEVELS.length);
    expect(isLevelUnlocked(TONY_LEVELS.length, all)).toBe(false);
  });

  it('stops at the first level without a medal', () => {
    const tiers = [...none];
    tiers[0] = 'bronze';
    tiers[1] = 'none';
    tiers[2] = 'gold'; // stranded — should not count while level 1 is unearned
    expect(unlockedLevelCount(tiers)).toBe(2);
  });
});
