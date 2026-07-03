// Space Cadet pinball sheet. Table props that light up: bumper caps with a lit
// and unlit frame, the launch-lane mission lights, the hyperspace kicker hole,
// and a four-frame spinner. Backdrop and lane guides are painted straight to
// canvas in the app — sprites are only for the parts that need a crisp on/off
// pop. Authored per README; common.ts is the reference for the conventions.

import type { SpriteDef } from './sprite';

// Bumper cap — 16x16, 2 frames. Frame 0 rests cool (steel-blue B with an H
// highlight up the top-left); frame 1 fires hot (yellow y, white w highlight).
// The app scales it to each bumper's radius and pops the scale on a hit.
export const BUMPER_CAP: SpriteDef = {
  palette: {
    k: '#1a1030',
    B: '#3f3f9a',
    H: '#6f6fd8',
    y: '#ffd23f',
    w: '#fff6cf',
  },
  frames: [
    [
      '.....kkkkkk.....',
      '...kkHHHBBBkk...',
      '..kHHHBBBBBBBk..',
      '.kHHBBBBBBBBBBk.',
      '.kHBBBBBBBBBBBk.',
      'kHBBBBBBBBBBBBBk',
      'kBBBBBBBBBBBBBBk',
      'kBBBBBBBBBBBBBBk',
      'kBBBBBBBBBBBBBBk',
      'kBBBBBBBBBBBBBBk',
      'kBBBBBBBBBBBBBBk',
      '.kBBBBBBBBBBBBk.',
      '.kBBBBBBBBBBBBk.',
      '..kBBBBBBBBBBk..',
      '...kkBBBBBBkk...',
      '.....kkkkkk.....',
    ],
    [
      '.....kkkkkk.....',
      '...kkwwwyyykk...',
      '..kwwwyyyyyyyk..',
      '.kwwyyyyyyyyyyk.',
      '.kwyyyyyyyyyyyk.',
      'kwyyyyyyyyyyyyyk',
      'kyyyyyyyyyyyyyyk',
      'kyyyyyyyyyyyyyyk',
      'kyyyyyyyyyyyyyyk',
      'kyyyyyyyyyyyyyyk',
      'kyyyyyyyyyyyyyyk',
      '.kyyyyyyyyyyyyk.',
      '.kyyyyyyyyyyyyk.',
      '..kyyyyyyyyyyk..',
      '...kkyyyyyykk...',
      '.....kkkkkk.....',
    ],
  ],
};

// Mission light — 8x8, 2 frames. A round lane lamp: frame 0 dim (d), frame 1 lit
// green (G) with a white core. Chased/blinked by the app when select is armed.
export const MISSION_LIGHT: SpriteDef = {
  palette: {
    k: '#141018',
    d: '#2a3a2a',
    G: '#6dff5a',
    w: '#e8ffe0',
  },
  frames: [
    [
      '..kkkk..',
      '.kddddk.',
      'kddddddk',
      'kddddddk',
      'kddddddk',
      'kddddddk',
      '.kddddk.',
      '..kkkk..',
    ],
    [
      '..kkkk..',
      '.kGGGGk.',
      'kGGwwGGk',
      'kGwwwwGk',
      'kGwwwwGk',
      'kGGwwGGk',
      '.kGGGGk.',
      '..kkkk..',
    ],
  ],
};

// Hyperspace kicker — 16x16, 2 frames. A ringed hole: frame 0 idle (purple rim
// p over a dark well h), frame 1 charged (bright rim P, cyan glow c, white core)
// while it holds and ejects the ball.
export const KICKER: SpriteDef = {
  palette: {
    k: '#0a0818',
    p: '#5a2a8a',
    h: '#140a24',
    P: '#b06aff',
    c: '#4be0ff',
    w: '#eaffff',
  },
  frames: [
    [
      '.....kkkkkk.....',
      '...kkppppppkk...',
      '..kppphhhhpppk..',
      '.kpphhhhhhhhppk.',
      '.kphhhhhhhhhhpk.',
      'kphhhhhhhhhhhhpk',
      'kphhhhhhhhhhhhpk',
      'kphhhhhhhhhhhhpk',
      'kphhhhhhhhhhhhpk',
      'kphhhhhhhhhhhhpk',
      'kphhhhhhhhhhhhpk',
      '.kphhhhhhhhhhpk.',
      '.kpphhhhhhhhppk.',
      '..kppphhhhpppk..',
      '...kkppppppkk...',
      '.....kkkkkk.....',
    ],
    [
      '.....kkkkkk.....',
      '...kkPPPPPPkk...',
      '..kPPPccccPPPk..',
      '.kPPccccccccPPk.',
      '.kPccccccccccPk.',
      'kPccccccccccccPk',
      'kPccccccccccccPk',
      'kPcccccwwcccccPk',
      'kPcccccwwcccccPk',
      'kPccccccccccccPk',
      'kPccccccccccccPk',
      '.kPccccccccccPk.',
      '.kPPccccccccPPk.',
      '..kPPPccccPPPk..',
      '...kkPPPPPPkk...',
      '.....kkkkkk.....',
    ],
  ],
};

// Spinner — 12x12, 4 frames of a bar rotating a half turn (horizontal ->
// diagonal -> vertical -> diagonal). Bright metal M with a white glint w; the
// app cycles frames off the spin speed so it whirls when the ball passes through.
export const SPINNER: SpriteDef = {
  palette: {
    k: '#141018',
    M: '#c8ccd6',
    w: '#ffffff',
  },
  frames: [
    [
      '............',
      '............',
      '............',
      '............',
      '.kMMMMMMMMk.',
      'kMwwwwwwwwMk',
      'kMwwwwwwwwMk',
      '.kMMMMMMMMk.',
      '............',
      '............',
      '............',
      '............',
    ],
    [
      'wM..........',
      '.wM.........',
      '..wM........',
      '...wM.......',
      '....wM......',
      '.....wM.....',
      '......wM....',
      '.......wM...',
      '........wM..',
      '.........wM.',
      '..........wM',
      '...........w',
    ],
    [
      '....kMMk....',
      '...kMwwMk...',
      '...kMwwMk...',
      '...kMwwMk...',
      '...kMwwMk...',
      '...kMwwMk...',
      '...kMwwMk...',
      '...kMwwMk...',
      '...kMwwMk...',
      '...kMwwMk...',
      '...kMwwMk...',
      '....kMMk....',
    ],
    [
      '..........Mw',
      '.........Mw.',
      '........Mw..',
      '.......Mw...',
      '......Mw....',
      '.....Mw.....',
      '....Mw......',
      '...Mw.......',
      '..Mw........',
      '.Mw.........',
      'Mw..........',
      'w...........',
    ],
  ],
};

/** Every sprite in this sheet, for the validate-all test and demo listings. */
export const PINBALL_SPRITES: Record<string, SpriteDef> = {
  BUMPER_CAP,
  MISSION_LIGHT,
  KICKER,
  SPINNER,
};
