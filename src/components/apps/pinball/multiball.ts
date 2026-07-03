// Multiball bookkeeping, kept pure so the "a life is only lost when the last
// ball drains" rule can be tested without spinning up the whole game loop. A
// PlayBall wraps the physics BallState with its lifecycle phase and a short
// position history for the fading trail the app draws.

import { BallState, Vec2 } from './physics';

export type BallPhase = 'onPlunger' | 'inPlay' | 'captured';

export interface PlayBall {
  state: BallState;
  phase: BallPhase;
  /** When a captured (hyperspace) ball should eject; 0 otherwise. */
  captureUntil: number;
  /** Recent positions, newest last, for the motion trail. */
  trail: Vec2[];
}

export const MAX_TRAIL = 8;

/** x2 while more than one ball is on the table, x1 otherwise. */
export function scoreMultiplier(ballsInPlay: number): number {
  return ballsInPlay > 1 ? 2 : 1;
}

export interface DrainResult<T> {
  survivors: T[];
  drained: T[];
  /** True only when draining emptied the table — that's when a life is lost. */
  emptied: boolean;
}

/**
 * Split balls into those still live and those that drained. `emptied` is the
 * whole point: it's true only when the table had balls and now has none, so the
 * caller docks a life exactly once no matter how many balls were in play.
 */
export function reapDrained<T>(balls: T[], isDrained: (b: T) => boolean): DrainResult<T> {
  const survivors: T[] = [];
  const drained: T[] = [];
  for (const b of balls) {
    if (isDrained(b)) drained.push(b);
    else survivors.push(b);
  }
  return { survivors, drained, emptied: survivors.length === 0 && drained.length > 0 };
}

/** Push a position onto a trail, dropping the oldest past MAX_TRAIL. */
export function pushTrail(trail: Vec2[], pos: Vec2): Vec2[] {
  const next = trail.length >= MAX_TRAIL ? trail.slice(1) : trail.slice();
  next.push({ x: pos.x, y: pos.y });
  return next;
}
