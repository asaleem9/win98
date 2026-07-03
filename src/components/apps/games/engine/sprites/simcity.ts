// SimCity isometric sprite sheet. Ground diamonds and auto-tiled roads are
// generated from pure geometry helpers so their rows are always rectangular;
// buildings come out of a small tower generator (recolor char `L` = a lit
// window, darkened when a zone loses power); the characterful units — monster,
// tornado, cars, trucks, smoke — are stamped from ASCII templates into a
// fixed-size matrix so a miscounted row can never produce a broken frame.
//
// Every def validates via simcity.test.ts. Ground/road tiles are 32x16 (the
// house iso size); props and units are drawn bottom-center on their tile.

import type { SpriteDef } from './sprite';

// One shared palette for the whole sheet. Chars are distinct and single, so any
// subset can appear in a frame; unused entries are harmless to validateSpriteDef.
export const PAL = {
  k: '#141210', // outline
  w: '#f4f4e2', // white highlight
  L: '#ffe07a', // lit window (recolor target)

  // grass / dirt / water ground
  G: '#6fb149',
  g: '#559239',
  h: '#3f7029',
  D: '#c39b6a',
  j: '#9c774a',
  J: '#6e5330',
  A: '#63a0d8',
  a: '#3f74ab',
  z: '#29527d',

  // road
  R: '#7a7e86',
  r: '#5f636b',
  n: '#45484f',
  Y: '#d8c24a',

  // residential (warm brick + red roof)
  B: '#cf8a54',
  b: '#a5643a',
  o: '#7d4a2a',
  E: '#d0503a',
  e: '#93321f',

  // commercial (blue glass)
  C: '#8fb4d8',
  c: '#5a83b0',
  u: '#3d5f88',

  // industrial (tan panel)
  I: '#c2b184',
  i: '#8f7f56',
  x: '#5f5333',

  // metal
  M: '#c9cdd4',
  m: '#8b909a',
  p: '#5c616b',

  // smoke / cloud
  S: '#dcdcdc',
  s: '#a6a6a6',

  // fire
  F: '#ffcf3f',
  O: '#f0872a',
  P: '#c23a1a',

  // tornado funnel
  T: '#b9bec6',
  t: '#7c828c',

  // foliage (park + trees)
  V: '#57a83e',
  v: '#3c7a2a',

  // civic accents
  U: '#3b6fd0', // police blue
  Q: '#d83a2a', // fire red
} as const;

/** Windows go dark when a zone is unpowered — pass as compileSprite recolor. */
export const UNLIT_WINDOWS: Record<string, string> = { L: '#2b2e44' };

// ---- Matrix toolkit -------------------------------------------------------

type Matrix = string[][];

function mat(w: number, h: number): Matrix {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
}

function put(m: Matrix, x: number, y: number, ch: string): void {
  if (y < 0 || y >= m.length) return;
  if (x < 0 || x >= m[0].length) return;
  m[y][x] = ch;
}

function rect(m: Matrix, x: number, y: number, w: number, h: number, ch: string): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(m, xx, yy, ch);
}

/** Stamp an ASCII template ('.' transparent) with its top-left at (x, y). */
function stamp(m: Matrix, x: number, y: number, tmpl: string[]): void {
  for (let ry = 0; ry < tmpl.length; ry++) {
    const row = tmpl[ry];
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      if (ch !== '.') put(m, x + rx, y + ry, ch);
    }
  }
}

function toRows(m: Matrix): string[] {
  return m.map((row) => row.join(''));
}

/** Left/right column of the 32x16 iso diamond at row r (rows outside are empty). */
function diamondSpan(r: number): [number, number] {
  const s = r < 8 ? r : 15 - r;
  return [14 - 2 * s, 17 + 2 * s];
}

// ---- Ground ---------------------------------------------------------------

function groundDiamond(fill: string, edge: string, hi: string): string[] {
  const m = mat(32, 16);
  for (let r = 0; r < 16; r++) {
    const [left, right] = diamondSpan(r);
    for (let c = left; c <= right; c++) {
      const onEdge = c <= left + 1 || c >= right - 1 || r === 0 || r === 15;
      if (onEdge) put(m, c, r, edge);
      else if (r < 7 && c < 16) put(m, c, r, hi); // sun on the upper-left facet
      else put(m, c, r, fill);
    }
  }
  return toRows(m);
}

export const GROUND_GRASS: SpriteDef = { palette: PAL, frames: [groundDiamond('g', 'h', 'G')] };
export const GROUND_DIRT: SpriteDef = { palette: PAL, frames: [groundDiamond('j', 'J', 'D')] };

// Water gets a second frame with the highlight nudged for a gentle shimmer.
export const GROUND_WATER: SpriteDef = {
  palette: PAL,
  frames: [waterDiamond(0), waterDiamond(1)],
};

function waterDiamond(phase: number): string[] {
  const m = mat(32, 16);
  for (let r = 0; r < 16; r++) {
    const [left, right] = diamondSpan(r);
    for (let c = left; c <= right; c++) {
      const onEdge = c <= left + 1 || c >= right - 1 || r === 0 || r === 15;
      if (onEdge) put(m, c, r, 'z');
      else put(m, c, r, 'a');
    }
  }
  // A couple of drifting highlight ripples.
  const ripples = phase === 0
    ? [[12, 5], [13, 5], [19, 9], [20, 9]]
    : [[16, 5], [17, 5], [11, 9], [12, 9]];
  for (const [x, y] of ripples) put(m, x, y, 'A');
  return toRows(m);
}

// ---- Roads (auto-tiled from a 4-neighbour mask) ---------------------------

// N = 1 (-y), E = 2 (+x), S = 4 (+y), W = 8 (-x). Screen directions are the four
// iso diagonals, so a straight road reads as a line across the diamond.
const ROAD_DIRS: Record<number, [number, number]> = {
  1: [2, -1], // N -> up-right
  2: [2, 1], //  E -> down-right
  4: [-2, 1], // S -> down-left
  8: [-2, -1], // W -> up-left
};

function roadTile(mask: number): string[] {
  const m = mat(32, 16);
  for (let r = 0; r < 16; r++) {
    const [left, right] = diamondSpan(r);
    for (let c = left; c <= right; c++) {
      const onEdge = c <= left + 1 || c >= right - 1 || r === 0 || r === 15;
      put(m, c, r, onEdge ? 'n' : 'r');
    }
  }
  // Lighter worn wheel path down the middle.
  put(m, 15, 8, 'R');
  put(m, 16, 8, 'R');
  if (mask === 0) {
    put(m, 15, 7, 'Y');
    put(m, 16, 8, 'Y');
    return toRows(m);
  }
  for (const bit of [1, 2, 4, 8]) {
    if (!(mask & bit)) continue;
    const [dx, dy] = ROAD_DIRS[bit];
    for (let k = 1; k <= 4; k++) {
      put(m, 16 + Math.round((dx * k) / 2), 8 + Math.round((dy * k) / 2), 'Y');
    }
  }
  return toRows(m);
}

/** All 16 connection variants; the renderer indexes this by neighbour mask. */
export const ROAD_TILES: SpriteDef[] = Array.from({ length: 16 }, (_, mask) => ({
  palette: PAL,
  frames: [roadTile(mask)],
}));

// Representative named variants (the sheet's "straight x2 / corners / cross").
export const ROAD_ISOLATED = ROAD_TILES[0];
export const ROAD_NS = ROAD_TILES[1 | 4];
export const ROAD_EW = ROAD_TILES[2 | 8];
export const ROAD_CORNER_NE = ROAD_TILES[1 | 2];
export const ROAD_CORNER_NW = ROAD_TILES[1 | 8];
export const ROAD_CORNER_SE = ROAD_TILES[4 | 2];
export const ROAD_CORNER_SW = ROAD_TILES[4 | 8];
export const ROAD_CROSS = ROAD_TILES[1 | 2 | 4 | 8];

// ---- Rubble ---------------------------------------------------------------

export const RUBBLE: SpriteDef = { palette: PAL, frames: [rubbleTile()] };

function rubbleTile(): string[] {
  const m = mat(32, 16);
  for (let r = 0; r < 16; r++) {
    const [left, right] = diamondSpan(r);
    for (let c = left; c <= right; c++) {
      const onEdge = c <= left + 1 || c >= right - 1 || r === 0 || r === 15;
      put(m, c, r, onEdge ? 'J' : 'j');
    }
  }
  // Scattered debris chunks and charred bits.
  const debris: Array<[number, number, string]> = [
    [12, 5, 'k'], [18, 6, 'p'], [15, 8, 'k'], [20, 9, 'm'],
    [10, 8, 'p'], [22, 7, 'k'], [14, 10, 'm'], [17, 11, 'k'], [13, 7, 'M'],
  ];
  for (const [x, y, ch] of debris) put(m, x, y, ch);
  return toRows(m);
}

// ---- Buildings ------------------------------------------------------------

interface TowerColors {
  wall: string;
  shade: string;
  roof: string;
  outline?: string;
}

// A flat-topped block with a window grid, centered on a 32-wide sprite. Height
// and window density carry the zone's density stage.
function tower(bw: number, h: number, colors: TowerColors): string[] {
  const W = 32;
  const left = Math.floor((W - bw) / 2);
  const top = 0;
  const bottom = h - 1;
  const right = left + bw - 1;
  const k = colors.outline ?? 'k';
  const m = mat(W, h);

  // Body + right-side shade.
  rect(m, left, top, bw, h, colors.wall);
  rect(m, right - 1, top, 2, h, colors.shade);
  // Roof cap.
  rect(m, left, top, bw, 2, colors.roof);
  // Outline.
  for (let x = left; x <= right; x++) {
    put(m, x, top, k);
    put(m, x, bottom, k);
  }
  for (let y = top; y <= bottom; y++) {
    put(m, left, y, k);
    put(m, right, y, k);
  }
  // Window grid (2x2 blocks), inset from the edges, skipping a ground-floor door.
  for (let wy = 4; wy <= h - 5; wy += 3) {
    for (let wx = left + 2; wx <= right - 3; wx += 3) {
      put(m, wx, wy, 'L');
      put(m, wx + 1, wy, 'L');
      put(m, wx, wy + 1, 'L');
      put(m, wx + 1, wy + 1, 'L');
    }
  }
  // Door.
  const dx = Math.floor((left + right) / 2);
  put(m, dx, bottom - 1, 'k');
  put(m, dx + 1, bottom - 1, 'k');
  put(m, dx, bottom - 2, 'k');
  put(m, dx + 1, bottom - 2, 'k');
  return toRows(m);
}

const RES: TowerColors = { wall: 'B', shade: 'b', roof: 'E' };
const COM: TowerColors = { wall: 'C', shade: 'c', roof: 'u' };
const IND: TowerColors = { wall: 'I', shade: 'i', roof: 'x' };

export const RES_1: SpriteDef = { palette: PAL, frames: [tower(14, 14, RES)] };
export const RES_2: SpriteDef = { palette: PAL, frames: [tower(18, 22, RES)] };
export const RES_3: SpriteDef = { palette: PAL, frames: [tower(22, 32, RES)] };

export const COM_1: SpriteDef = { palette: PAL, frames: [tower(14, 16, COM)] };
export const COM_2: SpriteDef = { palette: PAL, frames: [tower(18, 26, COM)] };
export const COM_3: SpriteDef = { palette: PAL, frames: [tower(22, 36, COM)] };

// Industrial blocks are squat and carry a smokestack on the roof.
function indBlock(bw: number, h: number): string[] {
  const rows = tower(bw, h, IND);
  const m = rows.map((r) => r.split(''));
  const stackX = Math.floor((32 - bw) / 2) + 2;
  for (let y = 0; y < 4; y++) put(m, stackX, y, 'm');
  for (let y = 0; y < 4; y++) put(m, stackX + 1, y, 'p');
  put(m, stackX, 0, 'M');
  return toRows(m);
}

export const IND_1: SpriteDef = { palette: PAL, frames: [indBlock(16, 14)] };
export const IND_2: SpriteDef = { palette: PAL, frames: [indBlock(20, 18)] };
export const IND_3: SpriteDef = { palette: PAL, frames: [indBlock(24, 24)] };

// ---- Civic + utility buildings --------------------------------------------

export const POWER_PLANT: SpriteDef = { palette: PAL, frames: [powerPlant()] };

function powerPlant(): string[] {
  const m = mat(32, 24);
  // Main hall.
  rect(m, 4, 10, 24, 13, 'p');
  rect(m, 4, 10, 24, 2, 'n');
  for (let x = 4; x < 28; x++) {
    put(m, x, 10, 'k');
    put(m, x, 22, 'k');
  }
  for (let y = 10; y < 23; y++) {
    put(m, 4, y, 'k');
    put(m, 27, y, 'k');
  }
  // Two cooling towers.
  stamp(m, 6, 2, [
    'kMMk',
    'MmmM',
    'kMMk',
    'kmmk',
    'kMMk',
    'kmmk',
    'kMMk',
  ]);
  stamp(m, 14, 0, [
    'kMMk',
    'MmmM',
    'kMMk',
    'kmmk',
    'kMMk',
    'kmmk',
    'kMMk',
    'kmmk',
    'kMMk',
  ]);
  // A stack and a lightning insignia.
  rect(m, 23, 4, 2, 6, 'm');
  put(m, 23, 4, 'M');
  stamp(m, 12, 14, [
    '.F.',
    'FF.',
    '.FF',
    '.F.',
  ]);
  return toRows(m);
}

export const POWER_LINE: SpriteDef = { palette: PAL, frames: [powerLine()] };

function powerLine(): string[] {
  const m = mat(12, 20);
  // Lattice pylon.
  stamp(m, 3, 2, [
    'kMMk',
    'kmMk',
    'MmmM',
    'kmMk',
    'MmmM',
    'kmMk',
    'MmmM',
    'kmMk',
    'kMMk',
  ]);
  // Cross-arms + wires.
  stamp(m, 0, 4, ['mmmmmmmmmmmm']);
  stamp(m, 0, 8, ['mmmmmmmmmmmm']);
  put(m, 0, 5, 'p');
  put(m, 11, 5, 'p');
  put(m, 0, 9, 'p');
  put(m, 11, 9, 'p');
  return toRows(m);
}

export const POLICE_STATION: SpriteDef = { palette: PAL, frames: [civic('U', 'w')] };
export const FIRE_STATION: SpriteDef = { palette: PAL, frames: [civic('Q', 'F')] };

// Shared civic building: pale block, colored sign band, garage door.
function civic(sign: string, badge: string): string[] {
  const m = mat(28, 20);
  const left = 3;
  const right = 24;
  rect(m, left, 2, right - left + 1, 17, 'M');
  rect(m, right - 1, 2, 2, 17, 'm');
  for (let x = left; x <= right; x++) {
    put(m, x, 2, 'k');
    put(m, x, 18, 'k');
  }
  for (let y = 2; y <= 18; y++) {
    put(m, left, y, 'k');
    put(m, right, y, 'k');
  }
  // Sign band.
  rect(m, left + 1, 4, right - left - 1, 3, sign);
  put(m, 13, 5, badge);
  put(m, 14, 5, badge);
  // Garage / windows.
  rect(m, 6, 10, 6, 8, 'p');
  put(m, 6, 10, 'k');
  put(m, 11, 10, 'k');
  rect(m, 16, 10, 5, 4, 'L');
  return toRows(m);
}

export const PARK: SpriteDef = { palette: PAL, frames: [park()] };

function park(): string[] {
  const m = mat(32, 18);
  // Grass diamond base.
  for (let r = 2; r < 18; r++) {
    const [left, right] = diamondSpan(r - 2);
    for (let c = left; c <= right; c++) {
      const onEdge = c <= left + 1 || c >= right - 1 || r === 2 || r === 17;
      put(m, c, r, onEdge ? 'h' : 'g');
    }
  }
  // Three little trees + a pond.
  const tree = ['.V.', 'VVV', '.v.', '.o.'];
  stamp(m, 8, 3, tree);
  stamp(m, 19, 4, tree);
  stamp(m, 14, 8, tree);
  stamp(m, 5, 10, ['AAA', 'AaA']);
  return toRows(m);
}

// ---- Zone growth scaffold -------------------------------------------------

export const CONSTRUCTION: SpriteDef = { palette: PAL, frames: [construction()] };

function construction(): string[] {
  const m = mat(24, 22);
  // Foundation slab.
  rect(m, 4, 17, 16, 4, 'p');
  rect(m, 4, 17, 16, 1, 'm');
  // Timber scaffold frame.
  stamp(m, 3, 3, [
    'b............b',
    'b............b',
    'bBBBBBBBBBBBBb',
    'b............b',
    'b............b',
    'bBBBBBBBBBBBBb',
    'b............b',
    'b............b',
    'bBBBBBBBBBBBBb',
    'b............b',
  ]);
  // Diagonal braces + a crane arm.
  put(m, 5, 6, 'B');
  put(m, 8, 9, 'B');
  put(m, 11, 12, 'B');
  stamp(m, 14, 0, ['MMMMMM', '.....M', '.....M', '.....M']);
  put(m, 19, 4, 'L');
  return toRows(m);
}

// ---- Industrial smoke -----------------------------------------------------

export const SMOKE: SpriteDef = {
  palette: PAL,
  frames: [
    [
      '....ss....',
      '...ssSs...',
      '..sSSSSs..',
      '..sSSSss..',
      '...ssss...',
      '....ss....',
      '.....s....',
      '.....s....',
      '.....s....',
      '..........',
    ],
    [
      '..........',
      '...ss.....',
      '..sSSs....',
      '.sSSSSs...',
      '.sSSSss...',
      '..ssss....',
      '...s......',
      '....s.....',
      '...s......',
      '....s.....',
    ],
  ],
};

// ---- Fire (2 frames) ------------------------------------------------------

export const FIRE: SpriteDef = {
  palette: PAL,
  frames: [
    [
      '................',
      '.......P........',
      '......PO........',
      '.....POOP.......',
      '....POFOP.......',
      '....POFFOP......',
      '...POFFFOOP.....',
      '...POFFFFOP.....',
      '..POFFwFFOOP....',
      '..POFFFFFFOP....',
      '..POOFFFFOOP....',
      '...POOFFOOP.....',
      '....POOOOOP.....',
      '.....PPPPP......',
      '................',
      '................',
    ],
    [
      '................',
      '.........P......',
      '........PO......',
      '.......POOP.....',
      '.....POOFOP.....',
      '....POFFFOP.....',
      '....POFFFOOP....',
      '...POFFwFFOP....',
      '...POFFFFFOP....',
      '..POOFFFFFOOP...',
      '..POFFFFFFOOP...',
      '..POOFFFFOOP....',
      '...POOOOOOP.....',
      '....PPPPPP......',
      '................',
      '................',
    ],
  ],
};

// ---- Monster (2-frame walk) -----------------------------------------------

const MONSTER_HEAD = [
  '.....kkk....',
  '....kGGGk...',
  '...kGGGGGk..',
  '...kGwGwGk..',
  '...kGGGGGk..',
  '..kGGGGGGGk.',
  '.kvGGGGGGGvk',
  '.kGGGGGGGGGk',
  '.kvGGGGGGGvk',
  '.kGGGGGGGGGk',
  '..kGGGGGGGk.',
  '...kGGGGGk..',
];

export const MONSTER: SpriteDef = {
  palette: PAL,
  frames: [monsterFrame(0), monsterFrame(1)],
};

function monsterFrame(step: number): string[] {
  const m = mat(12, 22);
  stamp(m, 0, 0, MONSTER_HEAD);
  // Arms.
  put(m, 0, 8, 'G');
  put(m, 11, 8, 'G');
  // Legs alternate so it reads as a stomp.
  if (step === 0) {
    stamp(m, 3, 12, [
      'kGGGGk',
      'kGk.kG',
      'kGk.kG',
      'kGk..k',
      'kkk...',
    ]);
    stamp(m, 3, 17, ['.....G', '....kG', '...kGk', '..kkk.']);
  } else {
    stamp(m, 3, 12, [
      'kGGGGk',
      'Gk.kGk',
      'Gk.kGk',
      'k..kGk',
      '...kkk',
    ]);
    stamp(m, 3, 17, ['G.....', 'Gk....', 'kGk...', '.kkk..']);
  }
  return toRows(m);
}

// ---- Tornado (2-frame sway) -----------------------------------------------

export const TORNADO: SpriteDef = {
  palette: PAL,
  frames: [
    [
      '..TTTTTTTT..',
      '.tTTTTTTTTt.',
      '..tTTTTTTt..',
      '...tTTTTt...',
      '...TTTTTT...',
      '....tTTt....',
      '....TTTT....',
      '.....tTt....',
      '....tTTt....',
      '.....TTt....',
      '.....tTt....',
      '......Tt....',
      '.....tTt....',
      '......t.....',
      '.....tt.....',
      '......t.....',
    ],
    [
      '..TTTTTTTT..',
      '.tTTTTTTTTt.',
      '..tTTTTTTt..',
      '...tTTTTt...',
      '...TTTTTT...',
      '....tTTt....',
      '....TTTT....',
      '....tTt.....',
      '....tTTt....',
      '....tTT.....',
      '....tTt.....',
      '....tT......',
      '....tTt.....',
      '.....t......',
      '.....tt.....',
      '.....t......',
    ],
  ],
};

// ---- Vehicles -------------------------------------------------------------

// Small car; recolor `Q` at draw time for traffic variety.
export const CAR: SpriteDef = {
  palette: PAL,
  frames: [
    [
      '..........',
      '...QQQQ...',
      '..QLLLLQ..',
      '.QQQQQQQQ.',
      '.QQQQQQQQ.',
      '..k.QQ.k..',
      '..........',
      '..........',
    ],
  ],
};

export const FIRE_TRUCK: SpriteDef = {
  palette: PAL,
  frames: [
    [
      '................',
      '....QQQQQQQ.....',
      '...QLLLQQQQQ....',
      '..QQQQQQQQQQQ...',
      '..QwwQQQQwwQQ...',
      '..QQQQQQQQQQQ...',
      '...k.QQ..QQ.k...',
      '...kk.....kk....',
      '................',
      '................',
    ],
  ],
};

// ---- Sheet manifest -------------------------------------------------------

/** Every def in the sheet — the validate-all test loops this. */
export const SIMCITY_SPRITES: Record<string, SpriteDef> = {
  GROUND_GRASS,
  GROUND_DIRT,
  GROUND_WATER,
  ...Object.fromEntries(ROAD_TILES.map((def, i) => [`ROAD_${i}`, def])),
  RUBBLE,
  RES_1,
  RES_2,
  RES_3,
  COM_1,
  COM_2,
  COM_3,
  IND_1,
  IND_2,
  IND_3,
  POWER_PLANT,
  POWER_LINE,
  POLICE_STATION,
  FIRE_STATION,
  PARK,
  CONSTRUCTION,
  SMOKE,
  FIRE,
  MONSTER,
  TORNADO,
  CAR,
  FIRE_TRUCK,
};

/** Zone building sprite for a type + development level (1..MAX). */
export function zoneSprite(type: 'residential' | 'commercial' | 'industrial', level: number): SpriteDef {
  const stage = level >= 5 ? 3 : level >= 3 ? 2 : 1;
  if (type === 'residential') return stage === 3 ? RES_3 : stage === 2 ? RES_2 : RES_1;
  if (type === 'commercial') return stage === 3 ? COM_3 : stage === 2 ? COM_2 : COM_1;
  return stage === 3 ? IND_3 : stage === 2 ? IND_2 : IND_1;
}

/** Road variant for a 4-neighbour connection mask (N=1, E=2, S=4, W=8). */
export function roadSprite(mask: number): SpriteDef {
  return ROAD_TILES[mask & 15];
}
