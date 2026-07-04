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

export interface StageConfig {
  width: number;
  height: number;
  bg: string;
  fps: number;
}

export interface FlaDocument {
  app: 'flash';
  version: 1;
  stage: StageConfig;
  totalFrames: number;
  layers: Layer[];
}

/** Serialize a movie to the compact .fla JSON we persist to the filesystem. */
export function serializeFla(doc: FlaDocument): string {
  return JSON.stringify(doc);
}

/** Parse a .fla payload back into a document, or null when it isn't ours. */
export function deserializeFla(json: string): FlaDocument | null {
  try {
    const parsed = JSON.parse(json) as FlaDocument;
    if (parsed && parsed.app === 'flash' && parsed.stage && Array.isArray(parsed.layers)) {
      return parsed;
    }
  } catch {
    // not JSON / not our shape
  }
  return null;
}
