// Procedural wall textures for the raycaster. Every surface is generated once
// into a flat Uint32Array of packed RGBA (the same byte order an ImageData's
// Uint32 view uses on little-endian hardware: 0xAABBGGRR), so the column
// renderer can sample a texel with a single array read. All patterns are driven
// by the shared seeded RNG, which keeps them deterministic — the same wall looks
// identical every run, and the sheet can be snapshot-tested without a DOM.

import { makeRng, type Rand } from '../engine/rng';

export const TEX_SIZE = 64;

// Wall-type ids stored in the level grid. 0 is empty space. Door ids double as
// the door tile marker for the raycaster and the texture key for the door face.
export const WALL = {
  EMPTY: 0,
  BRICK: 1,
  STONE: 2,
  METAL: 3,
  CIRCUIT: 4,
  DOOR: 5,
  DOOR_SILVER: 6,
  DOOR_GOLD: 7,
  EXIT: 8,
} as const;

export type WallId = (typeof WALL)[keyof typeof WALL];

/** Door tiles are the ones the ray march treats as a thin sliding plane. */
export function isDoorId(id: number): boolean {
  return id === WALL.DOOR || id === WALL.DOOR_SILVER || id === WALL.DOOR_GOLD;
}

/** Pack 8-bit channels into the ABGR word an ImageData Uint32 view expects. */
export function packRGB(r: number, g: number, b: number, a = 255): number {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** Multiply a packed color's RGB by `f` (alpha preserved). Used for depth fog. */
export function shade(color: number, f: number): number {
  const r = (color & 0xff) * f;
  const g = ((color >> 8) & 0xff) * f;
  const b = ((color >> 16) & 0xff) * f;
  const a = color & 0xff000000;
  return (a | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r)) >>> 0;
}

// -- small pattern helpers ---------------------------------------------------

function fill(px: Uint32Array, color: number): void {
  px.fill(color);
}

function set(px: Uint32Array, x: number, y: number, color: number): void {
  if (x < 0 || y < 0 || x >= TEX_SIZE || y >= TEX_SIZE) return;
  px[y * TEX_SIZE + x] = color;
}

// A grain that nudges each texel a few levels lighter/darker so flat fills read
// as rough material instead of plastic.
function grain(px: Uint32Array, rand: Rand, amount: number): void {
  for (let i = 0; i < px.length; i++) {
    const n = 1 + (rand() - 0.5) * amount;
    px[i] = shade(px[i], n);
  }
}

function vline(px: Uint32Array, x: number, y0: number, y1: number, color: number): void {
  for (let y = y0; y <= y1; y++) set(px, x, y, color);
}

function hline(px: Uint32Array, y: number, x0: number, x1: number, color: number): void {
  for (let x = x0; x <= x1; x++) set(px, x, y, color);
}

function rect(px: Uint32Array, x0: number, y0: number, w: number, h: number, color: number): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(px, x, y, color);
}

// -- individual materials ----------------------------------------------------

function brick(seed: number): Uint32Array {
  const px = new Uint32Array(TEX_SIZE * TEX_SIZE);
  const rand = makeRng(seed);
  const mortar = packRGB(60, 52, 48);
  fill(px, mortar);
  const brickH = 16;
  const brickW = 32;
  for (let row = 0; row * brickH < TEX_SIZE; row++) {
    const offset = row % 2 === 0 ? 0 : -brickW / 2;
    for (let col = -1; col * brickW < TEX_SIZE; col++) {
      const bx = col * brickW + offset;
      const by = row * brickH;
      // Per-brick base tone, warm red-brown with variation.
      const tone = 0.82 + rand() * 0.3;
      const base = shade(packRGB(150, 74, 54), tone);
      rect(px, bx + 1, by + 1, brickW - 2, brickH - 2, base);
      // Top/left highlight, bottom/right shadow for a slight bevel.
      hline(px, by + 1, bx + 1, bx + brickW - 2, shade(base, 1.25));
      vline(px, bx + 1, by + 1, by + brickH - 2, shade(base, 1.15));
      hline(px, by + brickH - 2, bx + 1, bx + brickW - 2, shade(base, 0.7));
    }
  }
  grain(px, rand, 0.22);
  return px;
}

function stone(seed: number): Uint32Array {
  const px = new Uint32Array(TEX_SIZE * TEX_SIZE);
  const rand = makeRng(seed);
  const seam = packRGB(38, 40, 44);
  fill(px, seam);
  const cell = 32;
  for (let ry = 0; ry < TEX_SIZE; ry += cell) {
    for (let rx = 0; rx < TEX_SIZE; rx += cell) {
      const tone = 0.85 + rand() * 0.28;
      const base = shade(packRGB(120, 122, 128), tone);
      rect(px, rx + 1, ry + 1, cell - 2, cell - 2, base);
      hline(px, ry + 1, rx + 1, rx + cell - 2, shade(base, 1.2));
      vline(px, rx + 1, ry + 1, ry + cell - 2, shade(base, 1.12));
      hline(px, ry + cell - 2, rx + 1, rx + cell - 2, shade(base, 0.72));
      // A crack or two wandering down the block.
      let cx = rx + 6 + Math.floor(rand() * (cell - 12));
      for (let y = ry + 3; y < ry + cell - 3; y++) {
        set(px, cx, y, shade(base, 0.55));
        if (rand() < 0.35) cx += rand() < 0.5 ? 1 : -1;
      }
    }
  }
  grain(px, rand, 0.18);
  return px;
}

function metal(seed: number): Uint32Array {
  const px = new Uint32Array(TEX_SIZE * TEX_SIZE);
  const rand = makeRng(seed);
  const base = packRGB(118, 124, 134);
  fill(px, base);
  // Vertical brushed panels separated by dark seams.
  const panelW = 21;
  for (let x = 0; x < TEX_SIZE; x++) {
    const inPanel = x % panelW;
    let c = base;
    if (inPanel === 0) c = shade(base, 0.5);
    else if (inPanel === 1) c = shade(base, 0.72);
    else if (inPanel < 4) c = shade(base, 1.22);
    else c = shade(base, 0.9 + (rand() - 0.5) * 0.12);
    vline(px, x, 0, TEX_SIZE - 1, c);
  }
  // Horizontal bolt bands with rivets.
  for (const by of [8, 32, 56]) {
    hline(px, by - 1, 0, TEX_SIZE - 1, shade(base, 0.55));
    hline(px, by, 0, TEX_SIZE - 1, shade(base, 1.3));
    for (let x = 10; x < TEX_SIZE; x += panelW) {
      set(px, x, by, shade(base, 1.6));
      set(px, x + 1, by, shade(base, 0.6));
      set(px, x, by + 1, shade(base, 0.6));
    }
  }
  grain(px, rand, 0.12);
  return px;
}

function circuit(seed: number): Uint32Array {
  const px = new Uint32Array(TEX_SIZE * TEX_SIZE);
  const rand = makeRng(seed);
  const board = packRGB(18, 46, 36);
  fill(px, board);
  const trace = packRGB(64, 196, 128);
  const traceDim = packRGB(36, 120, 84);
  // A grid of traces with right-angle turns and solder nodes.
  for (let i = 0; i < 10; i++) {
    let x = 4 + Math.floor(rand() * 56);
    let y = 4 + Math.floor(rand() * 56);
    const len = 8 + Math.floor(rand() * 20);
    let horiz = rand() < 0.5;
    for (let s = 0; s < len; s++) {
      set(px, x, y, s % 6 === 0 ? traceDim : trace);
      if (horiz) x += 1;
      else y += 1;
      if (rand() < 0.18) horiz = !horiz;
      if (x >= TEX_SIZE || y >= TEX_SIZE) break;
    }
    // Solder node at the end.
    rect(px, x - 1, y - 1, 2, 2, packRGB(150, 230, 170));
  }
  // Chips.
  for (let i = 0; i < 4; i++) {
    const cx = 6 + Math.floor(rand() * 44);
    const cy = 6 + Math.floor(rand() * 44);
    rect(px, cx, cy, 10, 6, packRGB(20, 22, 24));
    hline(px, cy, cx, cx + 9, packRGB(40, 44, 48));
    for (let p = 0; p < 5; p++) {
      set(px, cx + 1 + p * 2, cy - 1, packRGB(190, 190, 120));
      set(px, cx + 1 + p * 2, cy + 6, packRGB(190, 190, 120));
    }
  }
  grain(px, rand, 0.14);
  return px;
}

function door(seed: number, accent: number): Uint32Array {
  const px = new Uint32Array(TEX_SIZE * TEX_SIZE);
  const rand = makeRng(seed);
  const base = packRGB(96, 102, 112);
  fill(px, base);
  // Framed edges.
  rect(px, 0, 0, TEX_SIZE, 3, shade(base, 0.6));
  rect(px, 0, TEX_SIZE - 3, TEX_SIZE, 3, shade(base, 0.6));
  rect(px, 0, 0, 3, TEX_SIZE, shade(base, 1.25));
  rect(px, TEX_SIZE - 3, 0, 3, TEX_SIZE, shade(base, 0.7));
  // Central seam where the two leaves meet.
  rect(px, TEX_SIZE / 2 - 1, 4, 2, TEX_SIZE - 8, shade(base, 0.45));
  // Recessed panels on each leaf.
  for (const px0 of [10, 36]) {
    rect(px, px0, 12, 18, 40, shade(base, 0.86));
    hline(px, 12, px0, px0 + 17, shade(base, 1.2));
    vline(px, px0, 12, 51, shade(base, 1.2));
    hline(px, 51, px0, px0 + 17, shade(base, 0.6));
    vline(px, px0 + 17, 12, 51, shade(base, 0.6));
  }
  // Hazard chevrons across the middle.
  for (let x = 6; x < TEX_SIZE - 6; x += 8) {
    for (let d = 0; d < 4; d++) {
      set(px, x + d, 30 + d, packRGB(210, 180, 40));
      set(px, x + d, 33 - d, packRGB(210, 180, 40));
    }
  }
  // Keycard reader panel, tinted by the door's accent color.
  rect(px, 27, 26, 10, 12, shade(base, 0.5));
  rect(px, 29, 28, 6, 4, accent);
  rect(px, 29, 33, 6, 2, shade(accent, 0.6));
  grain(px, rand, 0.08);
  return px;
}

function exitPanel(seed: number): Uint32Array {
  const px = new Uint32Array(TEX_SIZE * TEX_SIZE);
  const rand = makeRng(seed);
  const base = packRGB(70, 78, 90);
  fill(px, base);
  rect(px, 0, 0, 3, TEX_SIZE, shade(base, 1.3));
  rect(px, TEX_SIZE - 3, 0, 3, TEX_SIZE, shade(base, 0.6));
  // Big lever switch in a lit recess.
  rect(px, 20, 12, 24, 40, shade(base, 0.55));
  rect(px, 22, 14, 20, 36, packRGB(24, 30, 38));
  // Glowing green "GO" bar and the lever.
  rect(px, 26, 18, 12, 8, packRGB(70, 230, 110));
  rect(px, 30, 26, 4, 22, packRGB(180, 186, 196));
  rect(px, 27, 44, 10, 6, packRGB(210, 60, 60));
  // Corner indicator lamps.
  for (const [lx, ly] of [
    [8, 8],
    [56, 8],
    [8, 56],
    [56, 56],
  ]) {
    rect(px, lx - 1, ly - 1, 3, 3, packRGB(90, 240, 120));
  }
  grain(px, rand, 0.1);
  return px;
}

/**
 * Build every wall texture once, keyed by wall id. Seeds are fixed offsets of a
 * base seed so a run is fully deterministic but each material differs.
 */
export function buildWallTextures(baseSeed = 0x5a17): Record<number, Uint32Array> {
  return {
    [WALL.BRICK]: brick(baseSeed + 1),
    [WALL.STONE]: stone(baseSeed + 2),
    [WALL.METAL]: metal(baseSeed + 3),
    [WALL.CIRCUIT]: circuit(baseSeed + 4),
    [WALL.DOOR]: door(baseSeed + 5, packRGB(90, 200, 255)),
    [WALL.DOOR_SILVER]: door(baseSeed + 6, packRGB(210, 214, 224)),
    [WALL.DOOR_GOLD]: door(baseSeed + 7, packRGB(240, 200, 70)),
    [WALL.EXIT]: exitPanel(baseSeed + 8),
  };
}
