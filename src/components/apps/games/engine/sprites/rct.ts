// RollerCoaster Tycoon sprite sheet — the living-park art. Ground diamonds are
// 32x16 (2:1, see README); track pieces, props and guests are small so a crowd
// of them stays cheap to blit. Peep shirts, train bodies and balloons are drawn
// with the faction chars (R/r/q) so they recolor per guest / per coaster.
//
// A couple of the shape-y sprites (ground diamonds, rails) are built by tiny
// generators instead of hand-typed rows — the resulting frames are still plain
// string[][] and get linted by rct.test.ts like every other def.

import type { SpriteDef } from './sprite';

// --- generators ----------------------------------------------------------

// A filled 2:1 diamond: [startCol, width] per row, top point to bottom point.
const DIAMOND: readonly [number, number][] = [
  [15, 2], [13, 6], [11, 10], [9, 14], [7, 18], [5, 22], [3, 26], [1, 30],
  [1, 30], [3, 26], [5, 22], [7, 18], [9, 14], [11, 10], [13, 6], [15, 2],
];

/** A 32x16 ground diamond, light on the sunlit top half, darker below, with
 *  optional accent pixels ("row,col": char) dropped onto the interior. */
function groundFrame(top: string, bot: string, accents: Record<string, string> = {}): string[] {
  const rows = DIAMOND.map(([start, width], r) => {
    const fill = r < 8 ? top : bot;
    const cells = new Array<string>(32).fill('.');
    for (let c = start; c < start + width; c++) cells[c] = fill;
    return cells;
  });
  for (const k of Object.keys(accents)) {
    const [r, c] = k.split(',').map(Number);
    rows[r][c] = accents[k];
  }
  return rows.map((cells) => cells.join(''));
}

function blank(w: number, h: number): string[][] {
  return Array.from({ length: h }, () => new Array<string>(w).fill('.'));
}

function line(g: string[][], x0: number, y0: number, x1: number, y1: number): void {
  // Bresenham, laying a 'M' rail with an 'n' shadow one pixel below it.
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  const h = g.length;
  const w = g[0].length;
  for (;;) {
    if (y >= 0 && y < h && x >= 0 && x < w) {
      if (y + 1 < h && g[y + 1][x] === '.') g[y + 1][x] = 'n';
      g[y][x] = 'M';
    }
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

// Connection midpoints on a 32x16 tile, and the tile centre.
const E = [24, 12]; // +tx neighbour (down-right)
const W = [8, 4]; //  -tx neighbour (up-left)
const S = [8, 12]; // +ty neighbour (down-left)
const N = [24, 4]; //  -ty neighbour (up-right)
const C = [16, 8];

/** Rasterize rail polylines through a 32x16 tile into a single frame. */
function railFrame(...pts: number[][][]): string[] {
  const g = blank(32, 16);
  for (const poly of pts) {
    for (let i = 0; i < poly.length - 1; i++) {
      line(g, poly[i][0], poly[i][1], poly[i + 1][0], poly[i + 1][1]);
    }
  }
  return g.map((r) => r.join(''));
}

const RAIL_PALETTE = { M: '#b8bdc7', n: '#6a6f78' };

// --- ground --------------------------------------------------------------

export const GROUND_GRASS: SpriteDef = {
  palette: { G: '#6ab04c', g: '#54923d' },
  frames: [groundFrame('G', 'g')],
};

export const GROUND_PATH: SpriteDef = {
  palette: { B: '#caa96b', b: '#a98950' },
  frames: [groundFrame('B', 'b')],
};

export const GROUND_WATER: SpriteDef = {
  palette: { V: '#4a86c8', v: '#356ba5', W: '#8fc0e6' },
  frames: [
    groundFrame('V', 'v', {
      '4,12': 'W', '4,13': 'W', '7,20': 'W', '7,21': 'W', '10,10': 'W', '10,11': 'W',
    }),
  ],
};

export const GROUND_FLOWER: SpriteDef = {
  palette: { G: '#6ab04c', g: '#54923d', y: '#f2d23a', p: '#e56aa0' },
  frames: [
    groundFrame('G', 'g', {
      '4,14': 'y', '5,12': 'p', '6,18': 'p', '8,10': 'y', '9,20': 'p', '10,16': 'y',
    }),
  ],
};

// --- rails (generated) ---------------------------------------------------

export const RAIL_STRAIGHT_TX: SpriteDef = { palette: RAIL_PALETTE, frames: [railFrame([W, E])] };
export const RAIL_STRAIGHT_TY: SpriteDef = { palette: RAIL_PALETTE, frames: [railFrame([N, S])] };
export const RAIL_ES: SpriteDef = { palette: RAIL_PALETTE, frames: [railFrame([E, C, S])] };
export const RAIL_EN: SpriteDef = { palette: RAIL_PALETTE, frames: [railFrame([E, C, N])] };
export const RAIL_WS: SpriteDef = { palette: RAIL_PALETTE, frames: [railFrame([W, C, S])] };
export const RAIL_WN: SpriteDef = { palette: RAIL_PALETTE, frames: [railFrame([W, C, N])] };

// --- track markers -------------------------------------------------------

export const TRACK_STATION: SpriteDef = {
  palette: { k: '#161310', R: '#c0392b', W: '#f4f4ec', B: '#b07a3f', b: '#7a5230' },
  frames: [
    [
      '..kkkkkkkkkkkkkkkkkkkk..',
      '..kRRRRRRRRRRRRRRRRRRk..',
      '..kRWRWRWRWRWRWRWRWRWk..',
      '..kkkkkkkkkkkkkkkkkkkk..',
      '..kB................Bk..',
      '..kB................Bk..',
      '..kBBBBBBBBBBBBBBBBBBk..',
      '..kbbbbbbbbbbbbbbbbbbk..',
      '...B..............B.....',
      '...B..............B.....',
    ],
  ],
};

export const TRACK_LIFT: SpriteDef = {
  palette: { Y: '#ffcf3f', o: '#f0872a' },
  frames: [
    [
      '............',
      '.....YY.....',
      '....YooY....',
      '...Yo..oY...',
      '.....YY.....',
      '....YooY....',
      '...Yo..oY...',
      '.....YY.....',
      '....YooY....',
      '...Yo..oY...',
      '............',
      '............',
    ],
  ],
};

export const TRACK_DROP: SpriteDef = {
  palette: { O: '#f0872a', r: '#c23a1a' },
  frames: [
    [
      '............',
      '...Or..rO...',
      '....OrrO....',
      '.....OO.....',
      '...Or..rO...',
      '....OrrO....',
      '.....OO.....',
      '...Or..rO...',
      '....OrrO....',
      '.....OO.....',
      '............',
      '............',
    ],
  ],
};

export const TRACK_LOOP: SpriteDef = {
  palette: { M: '#b8bdc7' },
  frames: [
    [
      '......MMMM......',
      '....MM....MM....',
      '...MM......MM...',
      '..MM........MM..',
      '..MM........MM..',
      '.MM..........MM.',
      '.MM..........MM.',
      '.MM..........MM.',
      '.MM..........MM.',
      '..MM........MM..',
      '..MM........MM..',
      '...MM......MM...',
      '....MM....MM....',
      '.....M....M.....',
      '.....M....M.....',
      '.....M....M.....',
    ],
  ],
};

export const TRACK_SUPPORT: SpriteDef = {
  palette: { M: '#9aa0aa', n: '#5a5f68' },
  frames: [
    Array.from({ length: 16 }, () => 'nMMn'),
  ],
};

// --- train (recolor R/q per coaster; lead car drawn darker = the engine) --

const CAR_R_FRAMES: string[][] = [
  [
    '................',
    '....kkkkkkkk....',
    '...kRRRRRRRRk...',
    '..kRRRRRRRRRRw..',
    '..kRRRRRRRRRRk..',
    '..kqqqqqqqqqqk..',
    '..kkkkkkkkkkkk..',
    '...kMk..kMk.....',
    '...knk..knk.....',
    '................',
  ],
  [
    '................',
    '....kkkkkkkk....',
    '...kRRRRRRRRk...',
    '..kRRRRRRRRRRw..',
    '..kRRRRRRRRRRk..',
    '..kqqqqqqqqqqk..',
    '..kkkkkkkkkkkk..',
    '...knk..knk.....',
    '...kMk..kMk.....',
    '................',
  ],
];

const CAR_L_FRAMES: string[][] = [
  [
    '................',
    '....kkkkkkkk....',
    '...kRRRRRRRRk...',
    '..wRRRRRRRRRRk..',
    '..kRRRRRRRRRRk..',
    '..kqqqqqqqqqqk..',
    '..kkkkkkkkkkkk..',
    '.....kMk..kMk...',
    '.....knk..knk...',
    '................',
  ],
  [
    '................',
    '....kkkkkkkk....',
    '...kRRRRRRRRk...',
    '..wRRRRRRRRRRk..',
    '..kRRRRRRRRRRk..',
    '..kqqqqqqqqqqk..',
    '..kkkkkkkkkkkk..',
    '.....knk..knk...',
    '.....kMk..kMk...',
    '................',
  ],
];

const CAR_PALETTE = { k: '#161310', R: '#d84a3a', q: '#7a1f16', M: '#c2c7cf', n: '#565a63', w: '#ffd9a0' };

export const TRAIN_CAR_SE: SpriteDef = { palette: CAR_PALETTE, frames: CAR_R_FRAMES };
export const TRAIN_CAR_NE: SpriteDef = { palette: CAR_PALETTE, frames: CAR_R_FRAMES };
export const TRAIN_CAR_SW: SpriteDef = { palette: CAR_PALETTE, frames: CAR_L_FRAMES };
export const TRAIN_CAR_NW: SpriteDef = { palette: CAR_PALETTE, frames: CAR_L_FRAMES };

// --- peeps (shirt recolor R/r) -------------------------------------------

const PEEP_PALETTE = { k: '#161310', S: '#f0c49a', R: '#e0685f', r: '#c23a2f', d: '#3a3330' };

export const PEEP_WALK: SpriteDef = {
  palette: PEEP_PALETTE,
  frames: [
    [
      '..kkk...',
      '.kSSSk..',
      '.kSSSk..',
      '.kRRRk..',
      '.rRRRr..',
      '..RRR...',
      '..d.d...',
      '..k.k...',
    ],
    [
      '..kkk...',
      '.kSSSk..',
      '.kSSSk..',
      '.kRRRk..',
      '.rRRRr..',
      '..RRR...',
      '..dd....',
      '..kk....',
    ],
  ],
};

export const PEEP_RIDE: SpriteDef = {
  palette: PEEP_PALETTE,
  frames: [
    [
      'S..kkk.S',
      'S.SSSk.S',
      '.kSSSk..',
      '.rRRRr..',
      '..RRR...',
      '..RRR...',
      '..d.d...',
      '..k.k...',
    ],
  ],
};

export const PEEP_DIZZY: SpriteDef = {
  palette: PEEP_PALETTE,
  frames: [
    [
      '...kkk..',
      '..kSSSk.',
      '..kSSSk.',
      '..kRRRk.',
      '..rRRRr.',
      '...RRR..',
      '...d.d..',
      '...k.k..',
    ],
    [
      '..kkk...',
      '.kSSSk..',
      '.kSSSk..',
      '.kRRRk..',
      '.rRRRr..',
      '..RRR...',
      '..d.d...',
      '..k.k...',
    ],
  ],
};

export const PEEP_VOMIT: SpriteDef = {
  palette: { ...PEEP_PALETTE, G: '#7db544' },
  frames: [
    [
      '.kkk....',
      'kSSSk...',
      'kSSSkG..',
      '.RRRkGG.',
      '.rRRr.G.',
      '..RR....',
      '..d.d...',
      '..k.k...',
    ],
  ],
};

export const PEEP_SIT: SpriteDef = {
  palette: PEEP_PALETTE,
  frames: [
    [
      '..kkk...',
      '.kSSSk..',
      '.kSSSk..',
      '.kRRRk..',
      '.rRRRr..',
      '..RRR...',
      '..ddd...',
      '.dd.dd..',
    ],
  ],
};

// --- handyman (blue uniform + broom) -------------------------------------

const HANDY_PALETTE = { k: '#161310', S: '#f0c49a', U: '#4a78c8', u: '#2e4f8f', B: '#a5763f', y: '#e6c84f' };

export const HANDYMAN_WALK: SpriteDef = {
  palette: HANDY_PALETTE,
  frames: [
    [
      '..UUU...',
      '.kSSSk..',
      '.kSSSk..',
      '.uUUUu.B',
      '..UUU.B.',
      '..UUUB..',
      '..u.u.yy',
      '..k.k.yy',
    ],
    [
      '..UUU...',
      '.kSSSk..',
      '.kSSSk..',
      '.uUUUu.B',
      '..UUU.B.',
      '..UUUB..',
      '..uu..yy',
      '..kk..yy',
    ],
  ],
};

export const HANDYMAN_SWEEP: SpriteDef = {
  palette: HANDY_PALETTE,
  frames: [
    [
      '..UUU...',
      '.kSSSk..',
      '.kSSSk..',
      '.uUUUu..',
      '..UUUB..',
      '...UBB..',
      '..u.uyy.',
      '..k.kyyy',
    ],
    [
      '..UUU...',
      '.kSSSk..',
      '.kSSSk..',
      '.uUUUu..',
      '..UUU.B.',
      '..UUU..B',
      '..u.u.yy',
      '..k.k.yy',
    ],
  ],
};

// --- stalls --------------------------------------------------------------

export const STALL_FOOD: SpriteDef = {
  palette: { k: '#161310', R: '#d84a3a', W: '#f4f4ec', B: '#b07a3f', b: '#5a3a1a', o: '#e6b96a', O: '#c98a3a', r: '#9c3a24' },
  frames: [
    [
      '...kkkkkkkkkk...',
      '..kRWRWRWRWRWk..',
      '..kWRWRWRWRWRk..',
      '..kkkkkkkkkkkk..',
      '..kBBBBBBBBBBk..',
      '..kBkkkkkkkkBk..',
      '..kBk......kBk..',
      '..kBk.oOo..kBk..',
      '..kBk.brb..kBk..',
      '..kBk.oOo..kBk..',
      '..kBk......kBk..',
      '..kBkkkkkkkkBk..',
      '..kBBBBBBBBBBk..',
      '..kkBBBBBBBBkk..',
      '...k.k....k.k...',
      '...k.k....k.k...',
    ],
  ],
};

export const STALL_DRINK: SpriteDef = {
  palette: { k: '#161310', U: '#3a6ea5', W: '#f4f4ec', B: '#b07a3f', M: '#cfe0ff', v: '#4a90d9' },
  frames: [
    [
      '...kkkkkkkkkk...',
      '..kUWUWUWUWUWk..',
      '..kWUWUWUWUWUk..',
      '..kkkkkkkkkkkk..',
      '..kBBBBBBBBBBk..',
      '..kBkkkkkkkkBk..',
      '..kBk......kBk..',
      '..kBk.MMM..kBk..',
      '..kBk.MvM..kBk..',
      '..kBk.MvM..kBk..',
      '..kBk......kBk..',
      '..kBkkkkkkkkBk..',
      '..kBBBBBBBBBBk..',
      '..kkBBBBBBBBkk..',
      '...k.k....k.k...',
      '...k.k....k.k...',
    ],
  ],
};

export const STALL_BALLOON: SpriteDef = {
  palette: { k: '#161310', B: '#b07a3f', P: '#e0503a', p: '#4a90d9', Q: '#f2d23a' },
  frames: [
    [
      '..PP...QQ..pp...',
      '.PPPP.QQQQ.pppp.',
      '..PP...QQ...pp..',
      '...k....k....k..',
      '..kkkkkkkkkkkk..',
      '..kBBBBBBBBBBk..',
      '..kBk......kBk..',
      '..kBk.PpP..kBk..',
      '..kBk.PPP..kBk..',
      '..kBk..k...kBk..',
      '..kBk......kBk..',
      '..kBkkkkkkkkBk..',
      '..kBBBBBBBBBBk..',
      '..kkBBBBBBBBkk..',
      '...k.k....k.k...',
      '...k.k....k.k...',
    ],
  ],
};

// --- props ---------------------------------------------------------------

export const BALLOON: SpriteDef = {
  palette: { R: '#e0503a', k: '#161310' },
  frames: [
    [
      '.RRR..',
      'RRRRR.',
      'RRRRR.',
      '.RRR..',
      '..k...',
      '..k...',
      '..k...',
      '..k...',
    ],
  ],
};

export const TREE_PINE: SpriteDef = {
  palette: { k: '#161310', G: '#3f7a2c', d: '#4a3018' },
  frames: [
    [
      '.....kk.....',
      '....kGGk....',
      '....kGGk....',
      '...kGGGGk...',
      '...kGGGGk...',
      '..kGGGGGGk..',
      '..kGGGGGGk..',
      '.kGGGGGGGGk.',
      '.kGGGGGGGGk.',
      'kGGGGGGGGGGk',
      '.kGGGGGGGGk.',
      '....kddk....',
      '....kddk....',
      '....kddk....',
    ],
  ],
};

export const TREE_ROUND: SpriteDef = {
  palette: { k: '#161310', G: '#4f8f33', d: '#4a3018' },
  frames: [
    [
      '....kGGk....',
      '..kGGGGGGk..',
      '.kGGGGGGGGk.',
      'kGGGGGGGGGGk',
      'kGGGGGGGGGGk',
      'kGGGGGGGGGGk',
      '.kGGGGGGGGk.',
      '..kGGGGGGk..',
      '...kGGGGk...',
      '....kddk....',
      '....kddk....',
      '....kddk....',
    ],
  ],
};

export const TREE_BUSH: SpriteDef = {
  palette: { k: '#161310', G: '#5aa33c', d: '#4a3018' },
  frames: [
    [
      '...kGGk...',
      '.kGGGGGGk.',
      'kGGGGGGGGk',
      'kGGGGGGGGk',
      '.kGGGGGGk.',
      '..kGGGGk..',
      '...kddk...',
      '...kddk...',
    ],
  ],
};

export const ENTRANCE_GATE: SpriteDef = {
  palette: { k: '#161310', M: '#e8c23a', R: '#c0392b', W: '#f4f4ec', B: '#8a5a2f' },
  frames: [
    [
      '..kkkkkkkkkkkk..',
      '..kMMMMMMMMMMk..',
      '..kMRRRRRRRRMk..',
      '..kMRWWWWWWRMk..',
      '..kMRWWWWWWRMk..',
      '..kkkk....kkkk..',
      '..kBk......kBk..',
      '..kBk......kBk..',
      '..kBk......kBk..',
      '..kBk......kBk..',
      '..kBk......kBk..',
      '..kBk......kBk..',
      '..kBk......kBk..',
      '..kBk......kBk..',
      '..kBk......kBk..',
      '..kBB......BBk..',
    ],
  ],
};

export const FENCE: SpriteDef = {
  palette: { B: '#c8b28a', b: '#8a7048' },
  frames: [
    [
      '.B..B..B..B..B..',
      '.B..B..B..B..B..',
      'BBBBBBBBBBBBBBBB',
      '.B..B..B..B..B..',
      '.B..B..B..B..B..',
      'BBBBBBBBBBBBBBBB',
      '.B..B..B..B..B..',
      '.b..b..b..b..b..',
    ],
  ],
};

export const VOMIT_PUDDLE: SpriteDef = {
  palette: { G: '#8fd14a', g: '#5f9e2f', f: '#3f6f26' },
  frames: [
    [
      '................',
      '....GGgg........',
      '..GGGGGGGGg.....',
      '.gGGGGGGGGGGg...',
      '.gGGGGGGGGGGg...',
      '..gGGGGGGGg.....',
      '....gggg........',
      '................',
    ],
    [
      '................',
      '................',
      '....gggf........',
      '..gggggggf......',
      '..gfggggf.......',
      '....gggf........',
      '................',
      '................',
    ],
  ],
};

export const COIN: SpriteDef = {
  palette: { k: '#161310', Y: '#ffe066', M: '#d9a520' },
  frames: [
    [
      '..kkkk..',
      '.kYYYYk.',
      'kYYMMYYk',
      'kYMMMMYk',
      'kYMMMMYk',
      'kYYMMYYk',
      '.kYYYYk.',
      '..kkkk..',
    ],
    [
      '..kkkk..',
      '..kYYk..',
      '..kMYk..',
      '..kMYk..',
      '..kMYk..',
      '..kMYk..',
      '..kYYk..',
      '..kkkk..',
    ],
  ],
};

/** Every sprite in the sheet — iterated by the validate-all test. */
export const RCT_SPRITES: Record<string, SpriteDef> = {
  GROUND_GRASS,
  GROUND_PATH,
  GROUND_WATER,
  GROUND_FLOWER,
  RAIL_STRAIGHT_TX,
  RAIL_STRAIGHT_TY,
  RAIL_ES,
  RAIL_EN,
  RAIL_WS,
  RAIL_WN,
  TRACK_STATION,
  TRACK_LIFT,
  TRACK_DROP,
  TRACK_LOOP,
  TRACK_SUPPORT,
  TRAIN_CAR_SE,
  TRAIN_CAR_NE,
  TRAIN_CAR_SW,
  TRAIN_CAR_NW,
  PEEP_WALK,
  PEEP_RIDE,
  PEEP_DIZZY,
  PEEP_VOMIT,
  PEEP_SIT,
  HANDYMAN_WALK,
  HANDYMAN_SWEEP,
  STALL_FOOD,
  STALL_DRINK,
  STALL_BALLOON,
  BALLOON,
  TREE_PINE,
  TREE_ROUND,
  TREE_BUSH,
  ENTRANCE_GATE,
  FENCE,
  VOMIT_PUDDLE,
  COIN,
};
