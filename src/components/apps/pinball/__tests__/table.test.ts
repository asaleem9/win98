import {
  LAUNCH_LANES,
  SPINNER,
  HYPERSPACE,
  HYPERSPACE_POINTS,
  SPINNER_POINTS,
  laneAt,
  overSpinner,
  inHyperspace,
} from '../table';

describe('launch-lane detection', () => {
  it('reports the lane the ball sits on', () => {
    expect(laneAt(LAUNCH_LANES[0])).toBe(0);
    expect(laneAt(LAUNCH_LANES[1])).toBe(1);
    expect(laneAt(LAUNCH_LANES[2])).toBe(2);
  });

  it('reports -1 well away from the lanes', () => {
    expect(laneAt({ x: 140, y: 400 })).toBe(-1);
  });
});

describe('spinner pass-through', () => {
  it('registers a pass when the ball crosses the blade', () => {
    const mid = { x: (SPINNER.a.x + SPINNER.b.x) / 2, y: (SPINNER.a.y + SPINNER.b.y) / 2 };
    expect(overSpinner(mid)).toBe(true);
  });

  it('ignores the ball when it is nowhere near the spinner', () => {
    expect(overSpinner({ x: 200, y: 400 })).toBe(false);
  });
});

describe('hyperspace hole', () => {
  it('captures a ball dropped into the hole', () => {
    expect(inHyperspace(HYPERSPACE.pos)).toBe(true);
  });

  it('does not capture a ball outside the hole radius', () => {
    expect(inHyperspace({ x: HYPERSPACE.pos.x + HYPERSPACE.radius + 5, y: HYPERSPACE.pos.y })).toBe(false);
  });
});

describe('scoring values', () => {
  it('rewards the hyperspace kicker more than a spinner pass', () => {
    expect(HYPERSPACE_POINTS).toBeGreaterThan(SPINNER_POINTS);
  });
});
