// Pure math + physics for the pinball table. Nothing here touches the DOM,
// canvas, or React state, so it can be unit tested directly and reused by
// the render loop without worrying about side effects sneaking in.

export interface Vec2 {
  x: number;
  y: number;
}

export const vec = (x: number, y: number): Vec2 => ({ x, y });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const length = (a: Vec2): number => Math.sqrt(dot(a, a));
export const distance = (a: Vec2, b: Vec2): number => length(sub(a, b));

export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  if (len < 1e-9) return { x: 0, y: 0 };
  return { x: a.x / len, y: a.y / len };
}

export interface BallState {
  pos: Vec2;
  vel: Vec2;
  radius: number;
}

export interface TableBounds {
  width: number;
  height: number;
}

export const GRAVITY = 520; // px/s^2, downward
export const DEFAULT_RESTITUTION = 0.72;

/**
 * Advance a ball one fixed timestep: apply gravity, integrate position, and
 * reflect off the left/right/top walls of the table. The bottom is left open
 * on purpose — draining is a game-rules concern the caller decides on, not a
 * physics one.
 */
export function stepBall(
  ball: BallState,
  dt: number,
  bounds: TableBounds,
  opts: { gravity?: number; restitution?: number } = {},
): BallState {
  const gravity = opts.gravity ?? GRAVITY;
  const restitution = opts.restitution ?? DEFAULT_RESTITUTION;
  const r = ball.radius;

  let vx = ball.vel.x;
  let vy = ball.vel.y + gravity * dt;
  let x = ball.pos.x + vx * dt;
  let y = ball.pos.y + vy * dt;

  if (x - r < 0) {
    x = r;
    vx = -vx * restitution;
  } else if (x + r > bounds.width) {
    x = bounds.width - r;
    vx = -vx * restitution;
  }

  if (y - r < 0) {
    y = r;
    vy = -vy * restitution;
  }

  return { pos: { x, y }, vel: { x: vx, y: vy }, radius: r };
}

export interface Bumper {
  pos: Vec2;
  radius: number;
  strength: number; // outgoing speed imparted on hit
}

export interface CollisionResult {
  hit: boolean;
  pos: Vec2;
  vel: Vec2;
}

/** Circle-circle collision between the ball and a round bumper. */
export function collideBumper(ball: BallState, bumper: Bumper): CollisionResult {
  const delta = sub(ball.pos, bumper.pos);
  const dist = length(delta);
  const minDist = ball.radius + bumper.radius;
  if (dist >= minDist || dist < 1e-9) {
    return { hit: false, pos: ball.pos, vel: ball.vel };
  }
  const normal = scale(delta, 1 / dist);
  const pos = add(bumper.pos, scale(normal, minDist));
  const speed = Math.max(length(ball.vel), bumper.strength);
  const vel = scale(normal, speed);
  return { hit: true, pos, vel };
}

export interface Segment {
  a: Vec2;
  b: Vec2;
}

export function closestPointOnSegment(p: Vec2, seg: Segment): Vec2 {
  const ab = sub(seg.b, seg.a);
  const abLenSq = dot(ab, ab);
  if (abLenSq < 1e-9) return seg.a;
  let t = dot(sub(p, seg.a), ab) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  return add(seg.a, scale(ab, t));
}

/** Circle-segment collision, used for walls, ramps, flippers and slingshots. */
export function collideSegment(
  ball: BallState,
  seg: Segment,
  restitution: number = DEFAULT_RESTITUTION,
): CollisionResult {
  const closest = closestPointOnSegment(ball.pos, seg);
  const delta = sub(ball.pos, closest);
  const dist = length(delta);
  if (dist >= ball.radius || dist < 1e-9) {
    return { hit: false, pos: ball.pos, vel: ball.vel };
  }
  const normal = scale(delta, 1 / dist);
  const pos = add(closest, scale(normal, ball.radius));
  const vn = dot(ball.vel, normal);
  // Only reflect if the ball is moving into the segment; otherwise leave it be.
  const vel = vn < 0 ? sub(ball.vel, scale(normal, (1 + restitution) * vn)) : ball.vel;
  return { hit: true, pos, vel };
}

export interface RankTier {
  threshold: number;
  name: string;
}

export const RANKS: RankTier[] = [
  { threshold: 0, name: 'Cadet' },
  { threshold: 5_000, name: 'Ensign' },
  { threshold: 15_000, name: 'Lieutenant' },
  { threshold: 35_000, name: 'Lt. Commander' },
  { threshold: 75_000, name: 'Commander' },
  { threshold: 150_000, name: 'Captain' },
  { threshold: 300_000, name: 'Commodore' },
  { threshold: 600_000, name: 'Admiral' },
  { threshold: 1_000_000, name: 'Fleet Admiral' },
];

export function rankFromScore(score: number): string {
  let rank = RANKS[0].name;
  for (const tier of RANKS) {
    if (score >= tier.threshold) rank = tier.name;
    else break;
  }
  return rank;
}
