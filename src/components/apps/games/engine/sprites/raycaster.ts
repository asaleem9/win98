// HUD sprites for the Bunker 98 raycaster, authored in the shared text-art
// format so they render crisply through <PixelSprite>. The status bar mugshot
// (four health states as frames) and the keycard / ammo icons live here; the
// in-world robots and pickups are drawn separately as procedural RGBA billboards
// (they need per-texel access the raycaster can sample). Every def is linted by
// __tests__/raycaster.test.ts.

import type { SpriteDef } from './sprite';
import { OUTLINE, WHITE } from './palettes';

const HELMET = {
  n: '#2c3a48', // rim / dark
  H: '#3f5266', // helmet mid
  h: '#5f7488', // helmet light
  j: '#8a929c', // jaw metal
} as const;

// Visor glow per health tier + battle damage.
const FACE_INK = {
  V: '#7fe6ff', // healthy — cyan
  Y: '#ffcf5a', // hurt — amber
  R: '#e2453a', // critical — red
  x: '#37424c', // dead — dark
  b: '#b03028', // blood
} as const;

/** Mugshot: frame 0 healthy, 1 hurt, 2 critical, 3 dead. */
export const HUD_FACE: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, ...HELMET, ...FACE_INK },
  frames: [
    [
      '................',
      '....nnnnnnnn....',
      '...khHHHHHHHk...',
      '...hhHHHHHHHH...',
      '...hHHHHHHHHH...',
      '...nnnnnnnnnn...',
      '...HnVVVVVVnH...',
      '...HVVVVVVVVH...',
      '...HnnnnnnnnH...',
      '...HjjjjjjjjH...',
      '....jjkkkkjj....',
      '.....jjjjjj.....',
      '......HHHH......',
      '................',
      '................',
      '................',
    ],
    [
      '................',
      '....nnnnnnnn....',
      '...khHHHHHHHk...',
      '...hhHHHHHHHH...',
      '...hHHHHHHHHH...',
      '...nnnnnnnnnn...',
      '...HnYYYYYYnH...',
      '...HYYYYYYYYH...',
      '...HnnnnnnbnH...',
      '...HjbjjjjjjH...',
      '....jjkkkkjj....',
      '.....jjjjjj.....',
      '......HHHH......',
      '................',
      '................',
      '................',
    ],
    [
      '................',
      '....nnnnnnnn....',
      '...khHHHHHHHk...',
      '...hhHHHHHHHH...',
      '...hHHHHHHHHH...',
      '...nnnnnnnnnn...',
      '...HnRRRRRRnH...',
      '...HRRRRRRbRH...',
      '...HnnbnnnbnH...',
      '...HjbjjjjbjH...',
      '....jbwwwwjj....',
      '.....jjjjjj.....',
      '......HHHH......',
      '................',
      '................',
      '................',
    ],
    [
      '................',
      '....nnnnnnnn....',
      '...khHHHHHHHk...',
      '...hhHHHHHHHH...',
      '...hHHHHHHHHH...',
      '...nnnnnnnnnn...',
      '...HnxxxxxxnH...',
      '...HxxxxxxbxH...',
      '...HnnbnnnbnH...',
      '...HjbjjjjbjH...',
      '....bbkkkkjj....',
      '.....jjjjjj.....',
      '......HbbH......',
      '.......bb.......',
      '................',
      '................',
    ],
  ],
};

const KEY_METAL = { M: '#e8ebf2', m: '#b9bec9', d: '#33363e' } as const;
const KEY_GOLD = { G: '#ffe08a', g: '#d8a83c', d: '#33363e' } as const;

const KEY_FRAME = (hi: string, lo: string): string[] => [
  '................',
  '................',
  '................',
  '...kkkkkkkkkk...',
  `...k${hi.repeat(8)}k...`,
  `...k${lo.repeat(8)}k...`,
  `...k${lo}dddddd${lo}k...`,
  `...k${lo}kkkkkk${lo}k...`,
  `...k${lo}kkkkkk${lo}k...`,
  `...k${lo}${lo}${lo}${lo}${lo}ww${lo}k...`,
  `...k${lo}${lo}${lo}${lo}${lo}ww${lo}k...`,
  `...k${lo.repeat(8)}k...`,
  '...kkkkkkkkkk...',
  '................',
  '................',
  '................',
];

export const HUD_KEY_SILVER: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, ...KEY_METAL },
  frames: [KEY_FRAME('M', 'm')],
};

export const HUD_KEY_GOLD: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, ...KEY_GOLD },
  frames: [KEY_FRAME('G', 'g')],
};

export const HUD_AMMO: SpriteDef = {
  palette: {
    ...OUTLINE,
    C: '#8fb4ff',
    c: '#4c76c8',
    e: '#a8d4ff',
    y: '#d2d24a',
  },
  frames: [
    [
      '................',
      '.......yy.......',
      '.....kkyykk.....',
      '.....kCCCCk.....',
      '.....kCCCCk.....',
      '.....kcccck.....',
      '.....keeeek.....',
      '.....kcccck.....',
      '.....kcccck.....',
      '.....keeeek.....',
      '.....kcccck.....',
      '.....kcccck.....',
      '.....kcccck.....',
      '.....kkkkkk.....',
      '................',
      '................',
    ],
  ],
};

/** Every HUD def, for the validation test to lint in one loop. */
export const RAYCASTER_HUD_SPRITES: Record<string, SpriteDef> = {
  HUD_FACE,
  HUD_KEY_SILVER,
  HUD_KEY_GOLD,
  HUD_AMMO,
};
