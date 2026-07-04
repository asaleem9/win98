import {
  msFromSpeed,
  speedFromMs,
  isDoubleClick,
  SPEED_MIN,
  SPEED_MAX,
  DOUBLE_CLICK_MIN,
  DOUBLE_CLICK_MAX,
} from '../mouseSettings';

describe('mouseSettings', () => {
  it('msFromSpeed maps slow → large window and fast → small window', () => {
    expect(msFromSpeed(SPEED_MIN)).toBe(DOUBLE_CLICK_MAX);
    expect(msFromSpeed(SPEED_MAX)).toBe(DOUBLE_CLICK_MIN);
    expect(msFromSpeed(1)).toBeGreaterThan(msFromSpeed(10));
  });

  it('speedFromMs inverts msFromSpeed at the ends', () => {
    expect(speedFromMs(DOUBLE_CLICK_MAX)).toBe(SPEED_MIN);
    expect(speedFromMs(DOUBLE_CLICK_MIN)).toBe(SPEED_MAX);
  });

  it('isDoubleClick honors the window and requires a prior click', () => {
    expect(isDoubleClick(0, 1000, 500)).toBe(false); // no prior click
    expect(isDoubleClick(1000, 1300, 500)).toBe(true); // within window
    expect(isDoubleClick(1000, 1600, 500)).toBe(false); // too slow
    expect(isDoubleClick(1000, 1500, 500)).toBe(true); // exactly at edge
  });
});
