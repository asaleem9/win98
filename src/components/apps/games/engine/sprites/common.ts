// Canonical shared sprites — and the reference for how to author a sheet. Note
// the conventions: mnemonic palette chars, rows kept visually readable, a
// comment naming each sprite and its size, and a test (common.test.ts) that
// asserts every def validates. Copy this style for new sheets.

import type { SpriteDef } from './sprite';
import { OUTLINE, FOLIAGE, WOOD } from './palettes';

// Explosion — 3 frames, 16x16. Ignition puff -> full fireball -> hollow
// dissipating ring. Warm ramp: pale core (w), yellow (y), orange (o), red (r).
export const EXPLOSION: SpriteDef = {
  palette: {
    w: '#fff2c0',
    y: '#ffcf3f',
    o: '#f0872a',
    r: '#c23a1a',
  },
  frames: [
    [
      '................',
      '................',
      '................',
      '.......oo.......',
      '......oyyo......',
      '.....oyyyyo.....',
      '.....oywwyo.....',
      '.....oywwyo.....',
      '.....oyyyyo.....',
      '......oyyo......',
      '.......oo.......',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    [
      '......oyyo......',
      '....oryyyyro....',
      '...oryyyyyyro...',
      '..oryywwwwyyro..',
      '..oryywwwwyyro..',
      '.orryywwwwyyrro.',
      '.orryywwwwyyrro.',
      '.orryywwwwyyrro.',
      '.orryywwwwyyrro.',
      '.orryywwwwyyrro.',
      '.orryywwwwyyrro.',
      '..oryywwwwyyro..',
      '..oryywwwwyyro..',
      '...oryyyyyyro...',
      '....oryyyyro....',
      '......oyyo......',
    ],
    [
      '......orro......',
      '....or....ro....',
      '...r........r...',
      '..r..........r..',
      '..r..........r..',
      '.o............o.',
      '.o............o.',
      '.o............o.',
      '.o............o.',
      '.o............o.',
      '.o............o.',
      '..r..........r..',
      '..r..........r..',
      '...r........r...',
      '....or....ro....',
      '......orro......',
    ],
  ],
};

// Shadow blob — 16x8. A flattened, semi-transparent ellipse to ground units and
// props. Drop it at the sprite's feet before the sprite itself.
export const SHADOW_BLOB: SpriteDef = {
  palette: { o: '#0000004d' },
  frames: [
    [
      '....oooooooo....',
      '..oooooooooooo..',
      '.oooooooooooooo.',
      'oooooooooooooooo',
      'oooooooooooooooo',
      '.oooooooooooooo.',
      '..oooooooooooo..',
      '....oooooooo....',
    ],
  ],
};

// Selection ring — 16x8. A bright 2:1 ellipse outline that matches an iso tile
// footprint; draw under a selected unit.
export const SELECTION_RING: SpriteDef = {
  palette: { G: '#7dff6a' },
  frames: [
    [
      '.....GGGGGG.....',
      '...GG......GG...',
      '..G..........G..',
      '.G............G.',
      '.G............G.',
      '..G..........G..',
      '...GG......GG...',
      '.....GGGGGG.....',
    ],
  ],
};

// Tree — 16x24. Broadleaf canopy over a short trunk. Light falls upper-left
// (G highlight) into g mid and f shadow lower-right; trunk is wood b/d. Draw
// bottom-center so the trunk plants on the ground.
export const TREE: SpriteDef = {
  palette: {
    ...OUTLINE,
    ...FOLIAGE,
    b: WOOD.b,
    d: WOOD.d,
  },
  frames: [
    [
      '......kGGk......',
      '....kGGGgggk....',
      '...kGGGgggggk...',
      '..kGGGgggggggk..',
      '..kGGggggggffk..',
      '.kGGggggggggffk.',
      '.kGGggggggggffk.',
      '.kGggggggggfffk.',
      '.kGggggggggfffk.',
      '.kgggggggfffffk.',
      '.kgggggggfffffk.',
      '..kgggggfffffk..',
      '..kgggggfffffk..',
      '...kgggfffffk...',
      '....kggffffk....',
      '.....kgfffk.....',
      '......kbdk......',
      '......kbdk......',
      '......kbdk......',
      '......kbdk......',
      '......kbdk......',
      '......kbdk......',
      '......kbdk......',
      '.....kbbddk.....',
    ],
  ],
};

/** Every sprite in this sheet, for the validate-all test and demo listings. */
export const COMMON_SPRITES: Record<string, SpriteDef> = {
  EXPLOSION,
  SHADOW_BLOB,
  SELECTION_RING,
  TREE,
};
