// Shared prefs bucket for the Mouse applet.
export const MOUSE_APP_ID = 'mouse';

export const MOUSE_DEFAULTS = {
  swapButtons: false,
  doubleClickSpeed: 500, // ms detection window
  pointerScheme: 'none',
  pointerSpeed: 5, // 1..10, cosmetic
  trails: false,
  trailLength: 5, // ghost count, 2..MAX_TRAIL
} as const;

export const DOUBLE_CLICK_MIN = 200; // fastest window (ms)
export const DOUBLE_CLICK_MAX = 900; // slowest window (ms)
export const SPEED_MIN = 1;
export const SPEED_MAX = 10;

/** Slider position (1 = Slow .. 10 = Fast) → detection window in ms. */
export function msFromSpeed(speed: number): number {
  const s = Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(speed)));
  const t = (s - SPEED_MIN) / (SPEED_MAX - SPEED_MIN); // 0 (slow) .. 1 (fast)
  return Math.round(DOUBLE_CLICK_MAX - t * (DOUBLE_CLICK_MAX - DOUBLE_CLICK_MIN));
}

/** Detection window in ms → nearest slider position (1 = Slow .. 10 = Fast). */
export function speedFromMs(ms: number): number {
  const clamped = Math.min(DOUBLE_CLICK_MAX, Math.max(DOUBLE_CLICK_MIN, ms));
  const t = (DOUBLE_CLICK_MAX - clamped) / (DOUBLE_CLICK_MAX - DOUBLE_CLICK_MIN);
  return Math.round(SPEED_MIN + t * (SPEED_MAX - SPEED_MIN));
}

/**
 * Two clicks count as a double-click when the gap falls inside the window. A
 * non-positive `prevTs` means there was no prior click to pair with.
 */
export function isDoubleClick(prevTs: number, nowTs: number, windowMs: number): boolean {
  if (prevTs <= 0) return false;
  return nowTs - prevTs <= windowMs;
}
