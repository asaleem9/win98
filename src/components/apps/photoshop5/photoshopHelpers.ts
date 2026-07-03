// Pure helpers for the Photoshop 5 app. Kept free of DOM/canvas types where
// possible so they're easy to unit test without a real rendering context.

export interface PsLayer {
  id: string;
  name: string;
  visible: boolean;
}

/** Inverts RGB channels in place, leaves alpha untouched. */
export function invertPixels(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
}

/**
 * Simple box blur, applied in place. Averages each pixel with its
 * neighbors within `radius` pixels. Pure function of width/height so it
 * can run against any ImageData-shaped buffer without touching the DOM.
 */
export function boxBlurPixels(data: Uint8ClampedArray, width: number, height: number, radius = 2): void {
  const src = Uint8ClampedArray.from(data);
  const getIdx = (x: number, y: number) => (y * width + x) * 4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const idx = getIdx(nx, ny);
          r += src[idx];
          g += src[idx + 1];
          b += src[idx + 2];
          a += src[idx + 3];
          count++;
        }
      }
      const idx = getIdx(x, y);
      data[idx] = r / count;
      data[idx + 1] = g / count;
      data[idx + 2] = b / count;
      data[idx + 3] = a / count;
    }
  }
}

/** Picks the next default layer name, e.g. "Layer 1", "Layer 2", ... */
export function nextLayerName(layers: PsLayer[]): string {
  let n = 1;
  const names = new Set(layers.map((l) => l.name));
  while (names.has(`Layer ${n}`)) n++;
  return `Layer ${n}`;
}

/** Returns a new layers array with a fresh layer appended (drawn on top). */
export function addLayer(layers: PsLayer[], factory: () => PsLayer): PsLayer[] {
  return [...layers, factory()];
}

/**
 * Returns a new layers array with the given layer removed. Refuses to
 * remove the last remaining layer — returns the original array unchanged.
 */
export function removeLayer(layers: PsLayer[], id: string): PsLayer[] {
  if (layers.length <= 1) return layers;
  return layers.filter((l) => l.id !== id);
}
