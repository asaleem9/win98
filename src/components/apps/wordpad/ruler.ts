// Pure ruler geometry for WordPad: where the margin / indent markers may sit,
// how they map to editor padding, and where the next tab stop lands. All in
// pixels relative to the ruler track so the component stays a thin renderer.

/** Default tab interval, ~0.5in at the ruler's working scale. */
export const DEFAULT_TAB_PX = 48;

/** Fallback track width used before the ruler has been measured. */
export const FALLBACK_RULER_WIDTH = 600;

export function clampMarker(x: number, min: number, max: number): number {
  if (Number.isNaN(x)) return min;
  return Math.min(max, Math.max(min, x));
}

export interface IndentInput {
  rulerWidth: number;
  leftPx: number;
  rightPx: number;
  firstLinePx: number;
}

export interface IndentStyle {
  paddingLeft: number;
  paddingRight: number;
  textIndent: number;
}

/**
 * Turn marker positions into editor styles. The left/first-line markers are
 * measured from the track's left edge; the right marker's distance from the
 * right edge becomes the right padding.
 */
export function computeIndents({ rulerWidth, leftPx, rightPx, firstLinePx }: IndentInput): IndentStyle {
  return {
    paddingLeft: Math.max(0, leftPx),
    paddingRight: Math.max(0, rulerWidth - rightPx),
    textIndent: firstLinePx - leftPx,
  };
}

/**
 * The next tab stop to the right of `caretX`. Custom stops take priority; past
 * the last one (or with none set) it falls back to the default grid.
 */
export function nextTabStop(caretX: number, tabStops: number[], defaultInterval = DEFAULT_TAB_PX): number {
  const sorted = [...tabStops].sort((a, b) => a - b);
  for (const stop of sorted) {
    if (stop > caretX + 0.5) return stop;
  }
  const base = sorted.length ? sorted[sorted.length - 1] : 0;
  const from = Math.max(caretX, base);
  const steps = Math.floor((from - base) / defaultInterval) + 1;
  return base + steps * defaultInterval;
}

/** Toggle a tab stop near `x` (within `tolerance`), returning a new sorted list. */
export function toggleTabStop(tabStops: number[], x: number, tolerance = 6): number[] {
  const near = tabStops.find((s) => Math.abs(s - x) <= tolerance);
  const next = near !== undefined ? tabStops.filter((s) => s !== near) : [...tabStops, x];
  return next.sort((a, b) => a - b);
}
