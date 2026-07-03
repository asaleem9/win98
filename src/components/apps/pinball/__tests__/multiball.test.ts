import { scoreMultiplier, reapDrained, pushTrail, MAX_TRAIL, PlayBall } from '../multiball';

function ball(x: number, y: number, phase: PlayBall['phase'] = 'inPlay'): PlayBall {
  return { state: { pos: { x, y }, vel: { x: 0, y: 0 }, radius: 6.5 }, phase, captureUntil: 0, trail: [] };
}

describe('scoreMultiplier', () => {
  it('is x1 for a single ball and x2 for multiball', () => {
    expect(scoreMultiplier(0)).toBe(1);
    expect(scoreMultiplier(1)).toBe(1);
    expect(scoreMultiplier(2)).toBe(2);
    expect(scoreMultiplier(3)).toBe(2);
  });
});

describe('reapDrained — a life is lost only when the last ball drains', () => {
  const belowTable = (b: PlayBall) => b.state.pos.y > 470;

  it('losing one of several balls keeps the table alive', () => {
    const balls = [ball(100, 500), ball(120, 200), ball(140, 200)];
    const { survivors, drained, emptied } = reapDrained(balls, belowTable);
    expect(drained).toHaveLength(1);
    expect(survivors).toHaveLength(2);
    expect(emptied).toBe(false);
  });

  it('draining the final ball empties the table (life lost)', () => {
    const balls = [ball(100, 500)];
    const { survivors, emptied } = reapDrained(balls, belowTable);
    expect(survivors).toHaveLength(0);
    expect(emptied).toBe(true);
  });

  it('is never "emptied" when nothing drained', () => {
    const balls = [ball(100, 200), ball(120, 200)];
    const { emptied, survivors } = reapDrained(balls, belowTable);
    expect(emptied).toBe(false);
    expect(survivors).toHaveLength(2);
  });

  it('draining every ball at once still empties exactly once', () => {
    const balls = [ball(100, 500), ball(120, 500)];
    const { survivors, drained, emptied } = reapDrained(balls, belowTable);
    expect(survivors).toHaveLength(0);
    expect(drained).toHaveLength(2);
    expect(emptied).toBe(true);
  });
});

describe('pushTrail', () => {
  it('appends the newest position last', () => {
    const t = pushTrail(pushTrail([], { x: 1, y: 1 }), { x: 2, y: 2 });
    expect(t[t.length - 1]).toEqual({ x: 2, y: 2 });
  });

  it('caps the trail length', () => {
    let t: { x: number; y: number }[] = [];
    for (let i = 0; i < MAX_TRAIL + 5; i++) t = pushTrail(t, { x: i, y: i });
    expect(t).toHaveLength(MAX_TRAIL);
    // oldest entries fell off the front
    expect(t[t.length - 1]).toEqual({ x: MAX_TRAIL + 4, y: MAX_TRAIL + 4 });
  });

  it('does not mutate the input array', () => {
    const original: { x: number; y: number }[] = [];
    pushTrail(original, { x: 1, y: 1 });
    expect(original).toHaveLength(0);
  });
});
