// Pure helpers for the Photoshop 5 app. Kept free of DOM/canvas types where
// possible so they're easy to unit test without a real rendering context.
// Filters and selection math operate on raw pixel buffers (Uint8ClampedArray in
// RGBA order) plus width/height, mirroring the ImageData shape the component
// hands them.

export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';

export interface PsLayer {
  id: string;
  name: string;
  visible: boolean;
  /** 0-100. */
  opacity: number;
  blend: BlendMode;
}

// --- color -----------------------------------------------------------------

/** Parses '#rgb' or '#rrggbb' into [r,g,b]. Bad input falls back to black. */
export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return [0, 0, 0];
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Converts 0-255 rgb components to a #rrggbb hex string. */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map((c) => c.toString(16).padStart(2, '0')).join('');
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// --- filters ---------------------------------------------------------------

/** Inverts RGB channels in place, leaves alpha untouched. */
export function invertPixels(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
}

/**
 * Simple box blur, applied in place. Averages each pixel with its neighbors
 * within `radius` pixels. Pure function of width/height so it can run against
 * any ImageData-shaped buffer without touching the DOM.
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

/**
 * Applies a 3x3 convolution kernel in place. Edges clamp to the nearest valid
 * pixel. When `gray` is set the result is written to all three channels equally,
 * which is what Emboss and Find Edges want.
 */
export function convolve3x3(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  kernel: number[],
  divisor = 1,
  offset = 0,
  gray = false,
): void {
  const src = Uint8ClampedArray.from(data);
  const at = (x: number, y: number) => {
    const cx = x < 0 ? 0 : x >= width ? width - 1 : x;
    const cy = y < 0 ? 0 : y >= height ? height - 1 : y;
    return (cy * width + cx) * 4;
  };
  const div = divisor === 0 ? 1 : divisor;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const idx = at(x + dx, y + dy);
          const weight = kernel[k++];
          r += src[idx] * weight;
          g += src[idx + 1] * weight;
          b += src[idx + 2] * weight;
        }
      }
      const idx = (y * width + x) * 4;
      if (gray) {
        const v = clamp255((r + g + b) / (3 * div) + offset);
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
      } else {
        data[idx] = clamp255(r / div + offset);
        data[idx + 1] = clamp255(g / div + offset);
        data[idx + 2] = clamp255(b / div + offset);
      }
    }
  }
}

/** Sharpen via a standard 3x3 high-pass kernel. */
export function sharpenPixels(data: Uint8ClampedArray, width: number, height: number): void {
  convolve3x3(data, width, height, [0, -1, 0, -1, 5, -1, 0, -1, 0], 1, 0);
}

/** Emboss: directional gradient rendered around neutral grey (flat -> grey). */
export function embossPixels(data: Uint8ClampedArray, width: number, height: number): void {
  convolve3x3(data, width, height, [-2, -1, 0, -1, 0, 1, 0, 1, 2], 1, 128, true);
}

/** Find Edges: Laplacian magnitude, brightest where the image changes fastest. */
export function findEdgesPixels(data: Uint8ClampedArray, width: number, height: number): void {
  convolve3x3(data, width, height, [-1, -1, -1, -1, 8, -1, -1, -1, -1], 1, 0, true);
}

/** Mosaic (pixelate): replaces each `cellSize` block with its average color. */
export function mosaicPixels(data: Uint8ClampedArray, width: number, height: number, cellSize: number): void {
  const cell = Math.max(1, Math.floor(cellSize));
  const src = Uint8ClampedArray.from(data);
  for (let by = 0; by < height; by += cell) {
    for (let bx = 0; bx < width; bx += cell) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      const maxY = Math.min(by + cell, height);
      const maxX = Math.min(bx + cell, width);
      for (let y = by; y < maxY; y++) {
        for (let x = bx; x < maxX; x++) {
          const idx = (y * width + x) * 4;
          r += src[idx]; g += src[idx + 1]; b += src[idx + 2]; a += src[idx + 3];
          count++;
        }
      }
      r /= count; g /= count; b /= count; a /= count;
      for (let y = by; y < maxY; y++) {
        for (let x = bx; x < maxX; x++) {
          const idx = (y * width + x) * 4;
          data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a;
        }
      }
    }
  }
}

/**
 * Adds monochromatic noise in place. `amount` is the maximum +/- deviation per
 * channel (0-255). `rng` defaults to Math.random but can be injected for
 * deterministic tests.
 */
export function addNoisePixels(
  data: Uint8ClampedArray,
  amount: number,
  rng: () => number = Math.random,
): void {
  for (let i = 0; i < data.length; i += 4) {
    const n = (rng() * 2 - 1) * amount;
    data[i] = clamp255(data[i] + n);
    data[i + 1] = clamp255(data[i + 1] + n);
    data[i + 2] = clamp255(data[i + 2] + n);
  }
}

/**
 * Brightness/Contrast adjustment in place. Both inputs are -100..100. Contrast
 * pivots around mid-grey (128); brightness is a flat channel offset.
 */
export function adjustBrightnessContrast(data: Uint8ClampedArray, brightness: number, contrast: number): void {
  const b = (brightness / 100) * 255;
  // Standard contrast factor curve.
  const c = contrast / 100;
  const factor = (1.015 * (c + 1)) / (1.015 - c);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp255(factor * (data[i] + b - 128) + 128);
    data[i + 1] = clamp255(factor * (data[i + 1] + b - 128) + 128);
    data[i + 2] = clamp255(factor * (data[i + 2] + b - 128) + 128);
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) { r = c; g = x; }
  else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; }
  else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = l - c / 2;
  return [clamp255((r + m) * 255), clamp255((g + m) * 255), clamp255((b + m) * 255)];
}

/**
 * Hue/Saturation/Lightness adjustment in place. `hueDeg` is -180..180 (rotation),
 * `sat` and `light` are -100..100 (relative percentages).
 */
export function adjustHueSaturation(data: Uint8ClampedArray, hueDeg: number, sat: number, light: number): void {
  const satMul = 1 + sat / 100;
  const lightAdd = light / 100;
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const nh = h + hueDeg;
    const ns = clamp01(s * satMul);
    const nl = clamp01(l + lightAdd);
    const [r, g, b] = hslToRgb(nh, ns, nl);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
}

// --- selection -------------------------------------------------------------

/** Builds a rectangular selection mask (1 inside the rect, 0 outside). */
export function rectMask(rx: number, ry: number, rw: number, rh: number, width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  const x0 = Math.max(0, Math.min(width, Math.round(rx)));
  const y0 = Math.max(0, Math.min(height, Math.round(ry)));
  const x1 = Math.max(0, Math.min(width, Math.round(rx + rw)));
  const y1 = Math.max(0, Math.min(height, Math.round(ry + rh)));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) mask[y * width + x] = 1;
  }
  return mask;
}

/** Builds a mask from a polygon path using the even-odd fill rule. */
export function polygonMask(points: { x: number; y: number }[], width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (points.length < 3) return mask;
  for (let y = 0; y < height; y++) {
    const nodes: number[] = [];
    let j = points.length - 1;
    for (let i = 0; i < points.length; i++) {
      const yi = points[i].y, yj = points[j].y;
      if ((yi < y && yj >= y) || (yj < y && yi >= y)) {
        nodes.push(points[i].x + ((y - yi) / (yj - yi)) * (points[j].x - points[i].x));
      }
      j = i;
    }
    nodes.sort((a, b) => a - b);
    for (let k = 0; k + 1 < nodes.length; k += 2) {
      const start = Math.max(0, Math.ceil(nodes[k]));
      const end = Math.min(width - 1, Math.floor(nodes[k + 1]));
      for (let x = start; x <= end; x++) mask[y * width + x] = 1;
    }
  }
  return mask;
}

/**
 * Contiguous tolerance-based selection (magic wand). Returns a mask of pixels
 * reachable from (sx,sy) whose color is within `tolerance` (max channel diff)
 * of the seed pixel.
 */
export function magicWandMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  sx: number,
  sy: number,
  tolerance: number,
): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (sx < 0 || sx >= width || sy < 0 || sy >= height) return mask;
  const seed = (sy * width + sx) * 4;
  const tr = data[seed], tg = data[seed + 1], tb = data[seed + 2];
  const stack = [sx, sy];
  while (stack.length) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const p = y * width + x;
    if (mask[p]) continue;
    const i = p * 4;
    if (
      Math.abs(data[i] - tr) > tolerance ||
      Math.abs(data[i + 1] - tg) > tolerance ||
      Math.abs(data[i + 2] - tb) > tolerance
    ) continue;
    mask[p] = 1;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  return mask;
}

/** Tight bounding box of the set pixels in a mask, or null when empty. */
export function maskBounds(mask: Uint8Array, width: number, height: number): { x: number; y: number; w: number; h: number } | null {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Boundary pixels of a mask: every set pixel that has at least one unset (or
 * off-canvas) 4-neighbor. Returned as a flat [x0,y0,x1,y1,...] list, which the
 * marching-ants overlay recolors each animation frame.
 */
export function selectionBoundary(mask: Uint8Array, width: number, height: number): number[] {
  const out: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      const edge =
        x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
        !mask[y * width + (x - 1)] || !mask[y * width + (x + 1)] ||
        !mask[(y - 1) * width + x] || !mask[(y + 1) * width + x];
      if (edge) out.push(x, y);
    }
  }
  return out;
}

/** True when (x,y) is inside the selection. A null mask means "everywhere". */
export function isSelected(mask: Uint8Array | null, x: number, y: number, width: number): boolean {
  if (!mask) return true;
  return mask[y * width + x] === 1;
}

/**
 * Confines an edit to the selection: wherever the mask is 0, restore the pixel
 * to its pre-edit value. A null mask leaves everything as edited.
 */
export function clipToSelection(edited: Uint8ClampedArray, original: Uint8ClampedArray, mask: Uint8Array | null): void {
  if (!mask) return;
  for (let p = 0; p < mask.length; p++) {
    if (mask[p] === 0) {
      const i = p * 4;
      edited[i] = original[i];
      edited[i + 1] = original[i + 1];
      edited[i + 2] = original[i + 2];
      edited[i + 3] = original[i + 3];
    }
  }
}

// --- flood fill ------------------------------------------------------------

/**
 * Contiguous flood fill with tolerance, applied in place. Fills pixels reachable
 * from (sx,sy) whose color is within `tolerance` (max channel diff) of the seed,
 * clipped to `mask` when one is supplied. Returns the number of pixels filled.
 */
export function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  sx: number,
  sy: number,
  fill: RGBA,
  tolerance: number,
  mask: Uint8Array | null = null,
): number {
  if (sx < 0 || sx >= width || sy < 0 || sy >= height) return 0;
  if (mask && mask[sy * width + sx] === 0) return 0;
  const seed = (sy * width + sx) * 4;
  const tr = data[seed], tg = data[seed + 1], tb = data[seed + 2];
  const visited = new Uint8Array(width * height);
  const stack = [sx, sy];
  let filled = 0;
  while (stack.length) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const p = y * width + x;
    if (visited[p]) continue;
    if (mask && mask[p] === 0) continue;
    const i = p * 4;
    if (
      Math.abs(data[i] - tr) > tolerance ||
      Math.abs(data[i + 1] - tg) > tolerance ||
      Math.abs(data[i + 2] - tb) > tolerance
    ) continue;
    visited[p] = 1;
    data[i] = fill[0]; data[i + 1] = fill[1]; data[i + 2] = fill[2]; data[i + 3] = fill[3];
    filled++;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  return filled;
}

// --- gradient --------------------------------------------------------------

/**
 * Draws a linear gradient from color `c0` at (x0,y0) to `c1` at (x1,y1), applied
 * in place. Each pixel's position is projected onto the gradient axis and
 * clamped to the endpoints. Respects `mask` when supplied.
 */
export function linearGradient(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  c0: RGB,
  c1: RGB,
  mask: Uint8Array | null = null,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy || 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (mask && mask[p] === 0) continue;
      let t = ((x - x0) * dx + (y - y0) * dy) / lenSq;
      t = clamp01(t);
      const i = p * 4;
      data[i] = c0[0] + (c1[0] - c0[0]) * t;
      data[i + 1] = c0[1] + (c1[1] - c0[1]) * t;
      data[i + 2] = c0[2] + (c1[2] - c0[2]) * t;
      data[i + 3] = 255;
    }
  }
}

// --- layer compositing math ------------------------------------------------

/** Blends one channel of `top` over `base` per the given blend mode (0-255). */
export function blendChannel(base: number, top: number, mode: BlendMode): number {
  const b = base / 255, t = top / 255;
  let r: number;
  switch (mode) {
    case 'multiply': r = b * t; break;
    case 'screen': r = 1 - (1 - b) * (1 - t); break;
    case 'overlay': r = b < 0.5 ? 2 * b * t : 1 - 2 * (1 - b) * (1 - t); break;
    default: r = t; break;
  }
  return Math.round(r * 255);
}

/**
 * Composites an opaque `top` color over `base` with a blend mode and layer
 * opacity (0-100). This is the per-pixel math the stacked layers approximate
 * via CSS mix-blend-mode + opacity, and it's what the flattened export uses.
 */
export function compositePixel(base: RGB, top: RGB, mode: BlendMode, opacity: number): RGB {
  const o = clamp01(opacity / 100);
  const out: RGB = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const blended = blendChannel(base[c], top[c], mode);
    out[c] = Math.round(base[c] * (1 - o) + blended * o);
  }
  return out;
}

// --- layer list operations -------------------------------------------------

/** Picks the next default layer name, e.g. "Layer 1", "Layer 2", ... */
export function nextLayerName(layers: PsLayer[]): string {
  let n = 1;
  const names = new Set(layers.map((l) => l.name));
  while (names.has(`Layer ${n}`)) n++;
  return `Layer ${n}`;
}

/** Name for a duplicated layer, e.g. "Layer 1" -> "Layer 1 copy". */
export function duplicatedName(name: string): string {
  return `${name} copy`;
}

/** Returns a new layers array with a fresh layer appended (drawn on top). */
export function addLayer(layers: PsLayer[], factory: () => PsLayer): PsLayer[] {
  return [...layers, factory()];
}

/**
 * Returns a new layers array with the given layer removed. Refuses to remove the
 * last remaining layer — returns the original array unchanged.
 */
export function removeLayer(layers: PsLayer[], id: string): PsLayer[] {
  if (layers.length <= 1) return layers;
  return layers.filter((l) => l.id !== id);
}

/** Moves the layer at `from` to index `to`, returning a new array. */
export function reorderLayers(layers: PsLayer[], from: number, to: number): PsLayer[] {
  if (from === to || from < 0 || from >= layers.length || to < 0 || to >= layers.length) return layers;
  const next = layers.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// --- .psd serialization ----------------------------------------------------
//
// Our ".psd" is JSON, not Adobe's binary format. Shape:
//   {
//     format: 'psd-json',
//     version: 1,
//     width, height,           // document pixel size
//     layers: [                // bottom-to-top order
//       { name, opacity, blend, visible, dataUrl }
//     ]
//   }
// dataUrl is a flattened PNG data URL of that single layer's pixels, so a
// document survives a round-trip through the virtual filesystem as plain text.

export interface PsdLayerData {
  name: string;
  opacity: number;
  blend: BlendMode;
  visible: boolean;
  dataUrl: string;
}

export interface PsdDocument {
  format: 'psd-json';
  version: 1;
  width: number;
  height: number;
  layers: PsdLayerData[];
}

const BLEND_MODES: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay'];

export function serializePsd(doc: PsdDocument): string {
  return JSON.stringify(doc);
}

/** Parses a serialized .psd document, returning null when it isn't one. */
export function deserializePsd(json: string): PsdDocument | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (obj.format !== 'psd-json') return null;
  if (typeof obj.width !== 'number' || typeof obj.height !== 'number') return null;
  if (!Array.isArray(obj.layers)) return null;
  const layers: PsdLayerData[] = [];
  for (const raw of obj.layers) {
    if (!raw || typeof raw !== 'object') return null;
    const l = raw as Record<string, unknown>;
    if (typeof l.name !== 'string' || typeof l.dataUrl !== 'string') return null;
    layers.push({
      name: l.name,
      dataUrl: l.dataUrl,
      opacity: typeof l.opacity === 'number' ? l.opacity : 100,
      blend: BLEND_MODES.includes(l.blend as BlendMode) ? (l.blend as BlendMode) : 'normal',
      visible: l.visible !== false,
    });
  }
  return { format: 'psd-json', version: 1, width: obj.width, height: obj.height, layers };
}
