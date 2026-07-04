// SkiFree sheet. The downhill cast and clutter: the skier's five poses, the
// Abominable Snowman (run + eat cycles), the dog and other slope traffic, and
// the static field props — firs, rocks, stumps, ramps, slalom flags, a lift
// tower/chair, and a mogul. Snow, the distance meter, and floating text are
// painted straight to canvas in the app; sprites carry the crisp figures.
// Authored per README; common.ts is the reference for the conventions.

import type { SpriteDef } from './sprite';

// Shared-ish colors, declared per def so each palette stays self-contained.
const K = '#22201d'; // outline
const WT = '#f5f6f2'; // white / highlight
const SK = '#f0c49a'; // skin

// ---- the skier, five poses ----

// Facing straight downhill — 14x16. Red jacket (J/j), navy pants (P), skin face
// with goggles (w), yellow skis (Y) tracking down.
export const SKIER_DOWN: SpriteDef = {
  palette: { k: K, w: WT, S: SK, J: '#d63a2f', j: '#9e2820', P: '#33417a', Y: '#e8c23a' },
  frames: [
    [
      '.....kkkk.....',
      '....kSSSSk....',
      '....kSwwSk....',
      '....kSSSSk....',
      '.....kJJk.....',
      '...kkJJJJkk...',
      '..kJJJJJJJJk..',
      '..kJJJJJJJJk..',
      '..kJjJJJJjJk..',
      '...kJJJJJJk...',
      '....kPPPPk....',
      '....kPPPPk....',
      '....kP..Pk....',
      '...kYk..kYk...',
      '..kYYk..kYYk..',
      '..Yk......kY..',
    ],
  ],
};

// Carving to one side — 14x16, drawn facing left; the app flips it for right.
// Skis sweep off to the downhill edge.
export const SKIER_SIDE: SpriteDef = {
  palette: { k: K, w: WT, S: SK, J: '#d63a2f', j: '#9e2820', P: '#33417a', Y: '#e8c23a' },
  frames: [
    [
      '.....kkkk.....',
      '....kSSSSk....',
      '....kSwwSk....',
      '....kSSSSk....',
      '.....kJJk.....',
      '...kkJJJJk....',
      '..kJJJJJJJk...',
      '..kJJJJJJJk...',
      '...kJjJJJk....',
      '....kPPPk.....',
      '....kPPPk.....',
      '...kPPPk......',
      '..kPPk........',
      '.kYYk.........',
      'YYk...........',
      'Yk............',
    ],
  ],
};

// Speed tuck — 14x14, crouched low with skis together for the fast line.
export const SKIER_TUCK: SpriteDef = {
  palette: { k: K, w: WT, S: SK, J: '#d63a2f', j: '#9e2820', P: '#33417a', Y: '#e8c23a' },
  frames: [
    [
      '.....kkkk.....',
      '....kSSSSk....',
      '....kSwwSk....',
      '...kJJJJJJk...',
      '..kJJJJJJJJk..',
      '..kJjJJJJjJk..',
      '..kJJJJJJJJk..',
      '...kPPPPPPk...',
      '...kPPPPPPk...',
      '....kPPPPk....',
      '....kP..Pk....',
      '...kYk..kYk...',
      '...kYk..kYk...',
      '...kYk..kYk...',
    ],
  ],
};

// Airborne off a ramp — 14x13, spread-eagle with skis in a V.
export const SKIER_AIR: SpriteDef = {
  palette: { k: K, w: WT, S: SK, J: '#d63a2f', j: '#9e2820', P: '#33417a', Y: '#e8c23a' },
  frames: [
    [
      '.....kkkk.....',
      '....kSSSSk....',
      '....kSwwSk....',
      '....kSSSSk....',
      '.kkkJJJJkkk...',
      '.kJJJJJJJJJk..',
      '..kJJJJJJk....',
      '...kJjJJk.....',
      '...kPPPPk.....',
      '..kPP..PPk....',
      '.kYk....kYk...',
      'kYk......kYk..',
      'Yk........kY..',
    ],
  ],
};

// Wiped out — 14x12, sat in a spray of snow with skis stuck up.
export const SKIER_CRASH: SpriteDef = {
  palette: { k: K, w: WT, S: SK, J: '#d63a2f', P: '#33417a', Y: '#e8c23a' },
  frames: [
    [
      '.Y..........Y.',
      '.Y....kk....Y.',
      '..Y..kSSk..Y..',
      '..Y..kSSk..Y..',
      '...Y.kJJk.Y...',
      '...kkJJJJkk...',
      '..kJJJJJJJJk..',
      '..kJJJJJJJJk..',
      '...kPPPPPPk...',
      '....kPPPPk....',
      '.....kkkk.....',
      '..wwwwwwwwww..',
    ],
  ],
};

// ---- the Abominable Snow Monster ----

// Run cycle — 16x19, 2 frames (legs swap). Off-white fur (F), grey-blue belly
// (b), black eyes, red maw (m) with white teeth (w).
export const YETI_RUN: SpriteDef = {
  palette: { k: K, w: WT, F: '#eef2f6', b: '#a9bfd0', m: '#c0303a' },
  frames: [
    [
      '.....kkkkkk.....',
      '...kkFFFFFFkk...',
      '..kFFFFFFFFFFk..',
      '..kFkFFFFFFkFk..',
      '..kFFFFFFFFFFk..',
      '..kFFmmmmmmFFk..',
      '..kFmwwwwwwmFk..',
      '.kFFFFFFFFFFFFk.',
      'kFFFFFFFFFFFFFFk',
      'kFkFFFFFFFFFFkFk',
      'kFkFFbbbbbbFFkFk',
      '.kFFFbbbbbbFFFk.',
      '.kFFFbbbbbbFFFk.',
      '.kFFFFbbbbFFFFk.',
      '..kFFFFFFFFFFk..',
      '..kFFFk..kFFFk..',
      '..kFFk....kFFk..',
      '.kFFk......kFFk.',
      '.kkk........kkk.',
    ],
    [
      '.....kkkkkk.....',
      '...kkFFFFFFkk...',
      '..kFFFFFFFFFFk..',
      '..kFkFFFFFFkFk..',
      '..kFFFFFFFFFFk..',
      '..kFFmmmmmmFFk..',
      '..kFmwwwwwwmFk..',
      '.kFFFFFFFFFFFFk.',
      'kFFFFFFFFFFFFFFk',
      'kFkFFFFFFFFFFkFk',
      'kFkFFbbbbbbFFkFk',
      '.kFFFbbbbbbFFFk.',
      '.kFFFbbbbbbFFFk.',
      '.kFFFFbbbbFFFFk.',
      '..kFFFFFFFFFFk..',
      '..kFFFk..kFFFk..',
      '.kFFFk....kFFk..',
      'kFFk......kFFk..',
      'kkk........kkk..',
    ],
  ],
};

// Eat cycle — 16x19, 2 frames. Frame 0 gobbles (jaws open, boots poking out),
// frame 1 is the satisfied lick with the maw shut.
export const YETI_EAT: SpriteDef = {
  palette: { k: K, w: WT, F: '#eef2f6', b: '#a9bfd0', m: '#c0303a', Y: '#e8c23a' },
  frames: [
    [
      '.....kkkkkk.....',
      '...kkFFFFFFkk...',
      '..kFFFFFFFFFFk..',
      '..kFkFFFFFFkFk..',
      '..kFFFFFFFFFFk..',
      '..kmmmmmmmmmmk..',
      '..kmYmmmmmmYmk..',
      '.kFFmmmmmmmmFFk.',
      'kFFFFFFFFFFFFFFk',
      'kFkFFFFFFFFFFkFk',
      'kFkFFbbbbbbFFkFk',
      '.kFFFbbbbbbFFFk.',
      '.kFFFbbbbbbFFFk.',
      '.kFFFFbbbbFFFFk.',
      '..kFFFFFFFFFFk..',
      '..kFFFk..kFFFk..',
      '..kFFk....kFFk..',
      '.kFFk......kFFk.',
      '.kkk........kkk.',
    ],
    [
      '.....kkkkkk.....',
      '...kkFFFFFFkk...',
      '..kFFFFFFFFFFk..',
      '..kFkFFFFFFkFk..',
      '..kFFFFFFFFFFk..',
      '..kFFFFFFFFFFk..',
      '..kFFmwwmwwFFk..',
      '.kFFFFFFFFFFFFk.',
      'kFFFFFFFFFFFFFFk',
      'kFkFFFFFFFFFFkFk',
      'kFkFFbbbbbbFFkFk',
      '.kFFbbbbbbbbFFk.',
      '.kFFbbbbbbbbFFk.',
      '.kFFFFbbbbFFFFk.',
      '..kFFFFFFFFFFk..',
      '..kFFFk..kFFFk..',
      '..kFFk....kFFk..',
      '.kFFk......kFFk.',
      '.kkk........kkk.',
    ],
  ],
};

// ---- other slope traffic ----

// Dog — 16x11, 2 frames, brown mutt loping left; the app prints its "woof!".
export const DOG: SpriteDef = {
  palette: { k: K, w: WT, B: '#b07840', d: '#7a5028' },
  frames: [
    [
      '.kk.............',
      'kBBk.....kkkkk..',
      'kBBBkkdBBBBBBBkk',
      'kwBBBBBBBBBBBBBk',
      '.kBBBBBBBBBBBBk.',
      '.kBBBBBBBBBBBBk.',
      '.kBk.kBk.kBk.Bk.',
      '.kBk.kBk.kBk.Bk.',
      '.kk..kk..kk..kk.',
      '................',
      '................',
    ],
    [
      '.kk.............',
      'kBBk.....kkkkk..',
      'kBBBkkdBBBBBBBkk',
      'kwBBBBBBBBBBBBBk',
      '.kBBBBBBBBBBBBk.',
      '.kBBBBBBBBBBBBk.',
      'kBk..kBk.kBk..Bk',
      'kBk..kBk.kBk..Bk',
      'kk...kk..kk...kk',
      '................',
      '................',
    ],
  ],
};

// Snowboarder — 12x18, reckless green rider on an orange board.
export const SNOWBOARDER: SpriteDef = {
  palette: { k: K, w: WT, S: SK, g: '#3f9a4a', G: '#5cc267', P: '#2a2a33', o: '#e07a2a' },
  frames: [
    [
      '....kkkk....',
      '...kSSSSk...',
      '...kSwwSk...',
      '....kggk....',
      '..kkgggggk..',
      '.kgggggggk..',
      '.kgGgggggk..',
      '..kgggggk...',
      '...kPPPPk...',
      '...kPPPPk...',
      '...kPPPPk...',
      '..kPk..kPk..',
      '..kk....kk..',
      '.oooooooooo.',
      'oooooooooooo',
      '.kooooooook.',
      '..kkkkkkkk..',
      '............',
    ],
  ],
};

// Other skier — 12x16, a teal-jacketed local weaving down ahead of you.
export const OTHER_SKIER: SpriteDef = {
  palette: { k: K, w: WT, S: SK, T: '#2ba0a0', t: '#1d7070', P: '#33417a', Y: '#e8c23a' },
  frames: [
    [
      '...kkkk.....',
      '..kSSSSk....',
      '..kSwwSk....',
      '...kTTk.....',
      '.kkTTTTkk...',
      'kTTTTTTTTk..',
      'kTtTTTTtTk..',
      '.kTTTTTTk...',
      '..kPPPPk....',
      '..kPPPPk....',
      '..kP..Pk....',
      '.kYk..kYk...',
      'kYYk..kYYk..',
      'Yk......kY..',
      '............',
      '............',
    ],
  ],
};

// ---- static field props ----

// Snowy fir — 16x24, three tiers of green (G/g/f) with white caps and a trunk.
export const TREE_PINE: SpriteDef = {
  palette: { k: K, w: WT, G: '#5aa84a', g: '#3d7a34', f: '#28551f', d: '#5a3a1e' },
  frames: [
    [
      '.......kk.......',
      '......kGGk......',
      '......kggk......',
      '.....kGgggk.....',
      '.....kggggk.....',
      '....kGgggggk....',
      '....kgggggfk....',
      '...kGgggggffk...',
      '...kggggggffk...',
      '..kGgggggggffk..',
      '..kgggggggfffk..',
      '.kGgggggggggffk.',
      '.kgggggggggfffk.',
      'kGgggggggggggffk',
      'kkkkkgggggkkkkkk',
      '....kgggggfk....',
      '...kGgggggffk...',
      '..kgggggggfffk..',
      '.kkkkkkgggkkkkk.',
      '......kddk......',
      '......kddk......',
      '......kddk......',
      '.....kdddk......',
      '.....kkkkk......',
    ],
  ],
};

// Snow-laden fir — 16x24, the same silhouette buried under heavy snow (w).
export const TREE_SNOWY: SpriteDef = {
  palette: { k: K, w: WT, G: '#5aa84a', g: '#3d7a34', f: '#28551f', d: '#5a3a1e' },
  frames: [
    [
      '.......kk.......',
      '......kwwk......',
      '......kwwk......',
      '.....kwwwwk.....',
      '.....kwggwk.....',
      '....kwggggwk....',
      '....kwgggfwk....',
      '...kwggggffwk...',
      '...kwgggwffwk...',
      '..kwggggwgffwk..',
      '..kwgggggwffwk..',
      '.kwggwggggwffwk.',
      '.kwgggggwgfffwk.',
      'kwggggwggggwffwk',
      'kkkkkwggggwkkkkk',
      '....kwgggwfk....',
      '...kwgggwffwk...',
      '..kwggggwfffwk..',
      '.kkkkkwgggkkkkk.',
      '......kddk......',
      '......kddk......',
      '......kddk......',
      '.....kdddk......',
      '.....kkkkk......',
    ],
  ],
};

// Dead tree — 16x24, a bare grey-brown snag with a few crooked branches.
export const TREE_DEAD: SpriteDef = {
  palette: { k: K, B: '#8a6a44', d: '#5a3a1e' },
  frames: [
    [
      '.......kk.......',
      '.......Bd.......',
      '...k...Bd...k...',
      '...Bk..Bd..kB...',
      '....Bk.Bd.kB....',
      '.....BkBdkB.....',
      '......BBdB......',
      'k.....BBdB.....k',
      'Bk....BBdB....kB',
      '.Bk...BBdB...kB.',
      '..Bk..BBdB..kB..',
      '...BkkBBdBkkB...',
      '....BBBBdBBB....',
      '......BBdB......',
      '......BBdB......',
      '...k..BBdB..k...',
      '...Bk.BBdB.kB...',
      '....BkBBdBkB....',
      '......BBdB......',
      '......BBdB......',
      '......BBdB......',
      '......BBdB......',
      '.....kBddBk.....',
      '.....kkkkkk.....',
    ],
  ],
};

// Rock — 16x11, a rounded grey boulder half-sunk in snow.
export const ROCK: SpriteDef = {
  palette: { k: K, w: WT, M: '#b8bcc4', m: '#888d97', n: '#565a63' },
  frames: [
    [
      '................',
      '.....kkkkk......',
      '...kkMMMMMkk....',
      '..kMMMMMMMMmk...',
      '.kMMMMwMMMmmmk..',
      '.kMMMMMMmmmmnk..',
      'kMMMmmmmmmnnnnk.',
      'kmmmmmmnnnnnnnk.',
      'kmmnnnnnnnnnnnk.',
      '.kkkkkkkkkkkkk..',
      '................',
    ],
  ],
};

// Stump — 12x12, a cut trunk with growth rings, poking out of the snow.
export const STUMP: SpriteDef = {
  palette: { k: K, B: '#a3743f', b: '#7a5230', d: '#4a3018', n: '#c99a63' },
  frames: [
    [
      '............',
      '...kkkkkk...',
      '..kBnBnBnk..',
      '.kBnbnbnBBk.',
      '.kBnbdbnnBk.',
      '.kbnbdbnbBk.',
      '.kBnbbbnbBk.',
      '.kbBnbnBbbk.',
      '.kbbBbBbbdk.',
      '..kbbbbbdk..',
      '...kkkkkk...',
      '............',
    ],
  ],
};

// Jump ramp — 20x12, a wedge of packed snow you launch off.
export const JUMP: SpriteDef = {
  palette: { k: K, w: WT, m: '#9aa4b0', s: '#c9d3dd' },
  frames: [
    [
      '....................',
      '................kkk.',
      '.............kkkwwwk',
      '..........kkkwwwwwsk',
      '.......kkkwwwwwwwwsk',
      '....kkkwwwwwwwwwwssk',
      '..kkwwwwwwwwwwwwsssk',
      '.kwwwwwwwwwwwwssssmk',
      'kwwwwwwwwwwsssssmmmk',
      'kwssssssssssmmmmmmmk',
      'kmmmmmmmmmmmmmmmmmmk',
      '.kkkkkkkkkkkkkkkkkk.',
    ],
  ],
};

// Slalom flag (red) — 8x18, a pennant on a thin pole. Blue is the mirror.
export const FLAG_RED: SpriteDef = {
  palette: { k: K, n: '#767b85', R: '#d63a2f', r: '#9e2820' },
  frames: [
    [
      '.knk....',
      '.kRRRRk.',
      '.kRRRRk.',
      '.kRRRrk.',
      '.kRRrk..',
      '.kRrk...',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.kkk....',
    ],
  ],
};

// Slalom flag (blue) — 8x18.
export const FLAG_BLUE: SpriteDef = {
  palette: { k: K, n: '#767b85', U: '#2f5ad6', u: '#1d3a9e' },
  frames: [
    [
      '.knk....',
      '.kUUUUk.',
      '.kUUUUk.',
      '.kUUUuk.',
      '.kUUuk..',
      '.kUuk...',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.knk....',
      '.kkk....',
    ],
  ],
};

// Lift tower — 12x36, a tall steel pylon with a cross-arm near the top.
export const LIFT_TOWER: SpriteDef = {
  palette: { k: K, M: '#c2c7cf', m: '#8a8f99', n: '#565a63' },
  frames: [
    [
      'kMmnnnnnnmMk',
      'kMmnnnnnnmMk',
      '.kMmnnnnmMk.',
      '..kMmnnmMk..',
      '...kMmmMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '...kMmnMk...',
      '..kMmnnmMk..',
      '..kMmnnmMk..',
      '.kMmnnnnmMk.',
      '.kMmnnnnmMk.',
      'kMmnnnnnnmMk',
      'kMmnnnnnnmMk',
    ],
  ],
};

// Lift chair — 14x14, a hanger bar and a two-seat chair swaying overhead.
export const LIFT_CHAIR: SpriteDef = {
  palette: { k: K, M: '#c2c7cf', m: '#8a8f99', P: '#33417a' },
  frames: [
    [
      '......kk......',
      '......km......',
      '......km......',
      '......km......',
      '......km......',
      'kkkkkkmMkkkk..',
      'kMMMMMMMMMMk..',
      'kMPPPPPPPPMk..',
      'kMPPPPPPPPMk..',
      'kMkkkkkkkkMk..',
      'kMk......kMk..',
      'kMk......kMk..',
      'kMk......kMk..',
      '.kk......kk...',
    ],
  ],
};

// Mogul — 16x8, a low bump of snow that scrubs your speed.
export const MOGUL: SpriteDef = {
  palette: { w: WT, s: '#d3dde7', b: '#b7c3cf' },
  frames: [
    [
      '................',
      '.....wwwww......',
      '...wwwwwwwss....',
      '..wwwwwwwwsssb..',
      '.wwwwwwwsssssbb.',
      '..wwwsssssssbb..',
      '....sssssbbb....',
      '................',
    ],
  ],
};

/** Every sprite in this sheet, for the validate-all test and demo listings. */
export const SKIFREE_SPRITES: Record<string, SpriteDef> = {
  SKIER_DOWN,
  SKIER_SIDE,
  SKIER_TUCK,
  SKIER_AIR,
  SKIER_CRASH,
  YETI_RUN,
  YETI_EAT,
  DOG,
  SNOWBOARDER,
  OTHER_SKIER,
  TREE_PINE,
  TREE_SNOWY,
  TREE_DEAD,
  ROCK,
  STUMP,
  JUMP,
  FLAG_RED,
  FLAG_BLUE,
  LIFT_TOWER,
  LIFT_CHAIR,
  MOGUL,
};
