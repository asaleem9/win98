// Pure helpers for the frame-by-frame animation model. Kept free of DOM/React
// so they're trivial to unit test.

export interface Layer {
  name: string;
  visible: boolean;
  locked: boolean;
  frames: (string | null)[];
}

/** Advances a frame counter, looping back to 1 after the last frame. */
export function nextFrame(current: number, total: number): number {
  if (total <= 0) return current;
  return current >= total ? 1 : current + 1;
}

/** Creates a blank set of per-frame snapshots (all empty). */
export function createEmptyFrames(total: number): (string | null)[] {
  return Array.from({ length: total }, () => null);
}

/** Picks the next default name for a new layer, avoiding collisions. */
export function nextLayerName(layers: { name: string }[]): string {
  const existing = new Set(layers.map((l) => l.name));
  let n = 1;
  while (existing.has(`Layer ${n}`)) {
    n += 1;
  }
  return `Layer ${n}`;
}

/** A frame with no snapshot (never drawn on) counts as blank. */
export function isBlankFrame(snapshot: string | null): boolean {
  return snapshot === null;
}
