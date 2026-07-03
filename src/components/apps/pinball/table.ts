// The mission-era table additions: launch-lane rollovers, a spinner, the
// hyperspace kicker hole and a feed ramp. Geometry and the hit tests live here
// as pure functions so the physics loop and the tests share exactly one source
// of truth — the app only wires them to scoring and art. Everything is additive;
// the original bumpers, targets, slings and flippers are untouched.

import { Segment, Vec2, closestPointOnSegment, distance } from './physics';

/** Rollover zones across the top; skating over one lights a launch lane. */
export const LAUNCH_LANES: Vec2[] = [
  { x: 66, y: 30 },
  { x: 100, y: 24 },
  { x: 134, y: 30 },
];
export const LANE_ZONE_R = 12;
export const LANE_POINTS = 500;

/** Left-orbit spinner. Flat segment the ball passes *through* — no bounce. */
export const SPINNER: Segment = { a: { x: 26, y: 104 }, b: { x: 26, y: 56 } };
export const SPINNER_ZONE = 11;
export const SPINNER_POINTS = 350;
export const SPIN_COOLDOWN_MS = 110;

export interface Hole {
  pos: Vec2;
  radius: number;
}

/** Hyperspace kicker: captures the ball, holds, then spits it back up-table. */
export const HYPERSPACE: Hole = { pos: { x: 216, y: 180 }, radius: 12 };
export const HYPERSPACE_POINTS = 2500;
export const HYPERSPACE_HOLD_MS = 1000;
/** Velocity the kicker ejects a captured ball with (up and to the left). */
export const HYPERSPACE_EJECT: Vec2 = { x: -60, y: -320 };

/** Feed ramp on the left — deflects a rolling ball back up into the orbit. */
export const RAMP_LANE: Segment = { a: { x: 14, y: 246 }, b: { x: 52, y: 206 } };
export const RAMP_POINTS = 750;
/** Extra upward kick the ramp adds so it actually feeds the upper table. */
export const RAMP_ASSIST = 110;

/** Which launch lane the ball is over, or -1 for none. */
export function laneAt(pos: Vec2): number {
  for (let i = 0; i < LAUNCH_LANES.length; i++) {
    if (distance(pos, LAUNCH_LANES[i]) < LANE_ZONE_R) return i;
  }
  return -1;
}

/** True when the ball is passing over the spinner blade. */
export function overSpinner(pos: Vec2): boolean {
  return distance(pos, closestPointOnSegment(pos, SPINNER)) < SPINNER_ZONE;
}

/** True when the ball has fallen into the hyperspace hole. */
export function inHyperspace(pos: Vec2): boolean {
  return distance(pos, HYPERSPACE.pos) < HYPERSPACE.radius;
}
