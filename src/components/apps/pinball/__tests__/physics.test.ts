import {
  stepBall,
  collideBumper,
  collideSegment,
  rankFromScore,
  add,
  sub,
  scale,
  dot,
  length,
  normalize,
} from '../physics';

describe('vector helpers', () => {
  it('adds, subtracts and scales', () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
    expect(sub({ x: 5, y: 5 }, { x: 2, y: 1 })).toEqual({ x: 3, y: 4 });
    expect(scale({ x: 2, y: 3 }, 2)).toEqual({ x: 4, y: 6 });
  });

  it('computes dot product and length', () => {
    expect(dot({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
    expect(length({ x: 3, y: 4 })).toBe(5);
  });

  it('normalizes a vector, and returns zero vector for a zero-length input', () => {
    const n = normalize({ x: 3, y: 4 });
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe('stepBall', () => {
  const bounds = { width: 200, height: 400 };

  it('integrates gravity into vertical velocity and position each tick', () => {
    const ball = { pos: { x: 100, y: 100 }, vel: { x: 0, y: 0 }, radius: 5 };
    const next = stepBall(ball, 1 / 60, bounds, { gravity: 600 });
    expect(next.vel.y).toBeCloseTo(600 / 60);
    expect(next.pos.y).toBeGreaterThan(ball.pos.y);
    // no horizontal forces, so x should not move
    expect(next.pos.x).toBeCloseTo(100);
  });

  it('reflects off the left wall and loses energy per restitution', () => {
    const ball = { pos: { x: 3, y: 100 }, vel: { x: -100, y: 0 }, radius: 5 };
    const next = stepBall(ball, 1 / 60, bounds, { gravity: 0, restitution: 0.5 });
    expect(next.pos.x).toBe(5); // clamped to radius
    expect(next.vel.x).toBeCloseTo(50); // reflected and damped
  });

  it('reflects off the right wall', () => {
    const ball = { pos: { x: 197, y: 100 }, vel: { x: 100, y: 0 }, radius: 5 };
    const next = stepBall(ball, 1 / 60, bounds, { gravity: 0, restitution: 0.8 });
    expect(next.pos.x).toBe(195); // clamped to width - radius
    expect(next.vel.x).toBeCloseTo(-80);
  });

  it('reflects off the top wall but leaves the bottom open for draining', () => {
    const ball = { pos: { x: 100, y: 3 }, vel: { x: 0, y: -50 }, radius: 5 };
    const next = stepBall(ball, 1 / 60, bounds, { gravity: 0, restitution: 0.5 });
    expect(next.pos.y).toBe(5);
    expect(next.vel.y).toBeCloseTo(25);

    const falling = { pos: { x: 100, y: 500 }, vel: { x: 0, y: 200 }, radius: 5 };
    const nextFalling = stepBall(falling, 1 / 60, bounds, { gravity: 0 });
    expect(nextFalling.pos.y).toBeGreaterThan(400); // no bottom clamp
  });
});

describe('collideBumper', () => {
  const bumper = { pos: { x: 100, y: 100 }, radius: 15, strength: 300 };

  it('reports no hit when the ball is far away', () => {
    const ball = { pos: { x: 200, y: 200 }, vel: { x: 0, y: 0 }, radius: 5 };
    const result = collideBumper(ball, bumper);
    expect(result.hit).toBe(false);
  });

  it('pushes the ball out along the normal and imparts bumper strength', () => {
    // Ball approaching from directly above, overlapping the bumper.
    const ball = { pos: { x: 100, y: 90 }, vel: { x: 0, y: 10 }, radius: 5 };
    const result = collideBumper(ball, bumper);
    expect(result.hit).toBe(true);
    // pushed out to bumper.radius + ball.radius along the normal (straight up)
    expect(result.pos.y).toBeCloseTo(100 - 20);
    // velocity should now point away from the bumper (upward, negative y)
    expect(result.vel.y).toBeLessThan(0);
    expect(length(result.vel)).toBeCloseTo(bumper.strength);
  });
});

describe('collideSegment', () => {
  it('reflects a ball moving into a horizontal segment', () => {
    const seg = { a: { x: 0, y: 100 }, b: { x: 200, y: 100 } };
    const ball = { pos: { x: 100, y: 97 }, vel: { x: 0, y: 50 }, radius: 5 };
    const result = collideSegment(ball, seg, 0.5);
    expect(result.hit).toBe(true);
    expect(result.vel.y).toBeLessThan(0); // bounced back upward
  });

  it('does not affect a ball moving away from the segment', () => {
    const seg = { a: { x: 0, y: 100 }, b: { x: 200, y: 100 } };
    const ball = { pos: { x: 100, y: 97 }, vel: { x: 0, y: -50 }, radius: 5 };
    const result = collideSegment(ball, seg, 0.5);
    expect(result.hit).toBe(true);
    expect(result.vel).toEqual(ball.vel);
  });

  it('reports no hit when far from the segment', () => {
    const seg = { a: { x: 0, y: 100 }, b: { x: 200, y: 100 } };
    const ball = { pos: { x: 100, y: 0 }, vel: { x: 0, y: 0 }, radius: 5 };
    expect(collideSegment(ball, seg).hit).toBe(false);
  });
});

describe('rankFromScore', () => {
  it('starts at Cadet', () => {
    expect(rankFromScore(0)).toBe('Cadet');
    expect(rankFromScore(4999)).toBe('Cadet');
  });

  it('promotes exactly at each threshold', () => {
    expect(rankFromScore(5_000)).toBe('Ensign');
    expect(rankFromScore(15_000)).toBe('Lieutenant');
    expect(rankFromScore(75_000)).toBe('Commander');
  });

  it('caps out at the top rank for very high scores', () => {
    expect(rankFromScore(10_000_000)).toBe('Fleet Admiral');
  });
});
