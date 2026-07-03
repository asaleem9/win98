// Shared RTS combat + world sprites: the living-world layer the three strategy
// titles draw on top of their unit/building art. Muzzle flashes, travelling
// projectiles, corpses, a carried-load chip, and construction scaffolds. The
// selection ring, shadow blob, and explosion come straight from common.ts —
// re-exported here so an RTS only needs one import. Author style matches
// common.ts: mnemonic palette chars, a comment per sprite, a validate-all test.

import type { SpriteDef } from './sprite';
import { OUTLINE, WOOD, METAL } from './palettes';
import { EXPLOSION, SHADOW_BLOB, SELECTION_RING } from './common';

export { EXPLOSION, SHADOW_BLOB, SELECTION_RING };

// Muzzle flash — 8x8, 2 frames. A quick warm burst pinned to a firing unit's
// barrel. Frame 0 is the ignition puff, frame 1 the fuller star with rays.
// Warm ramp: pale core (w), yellow (y), orange (o).
export const MUZZLE_FLASH: SpriteDef = {
  palette: { w: '#fff2c0', y: '#ffcf3f', o: '#f0872a' },
  frames: [
    [
      '........',
      '...oo...',
      '..oyyo..',
      '.oywwyo.',
      '.oywwyo.',
      '..oyyo..',
      '...oo...',
      '........',
    ],
    [
      '...oo...',
      '.o.yy.o.',
      '..oyyo..',
      'oyywwyyo',
      'oyywwyyo',
      '..oyyo..',
      '.o.yy.o.',
      '...oo...',
    ],
  ],
};

// Projectile — 6x6. A small bright tracer bolt drawn centered on its position
// as it flies from shooter to target. Pale core (w) inside a warm shell (y/o).
export const PROJECTILE: SpriteDef = {
  palette: { w: '#fff2c0', y: '#ffcf3f', o: '#f0872a' },
  frames: [
    [
      '..ww..',
      '.wyyw.',
      'wyooyw',
      'wyooyw',
      '.wyyw.',
      '..ww..',
    ],
  ],
};

// Corpse — 12x8. A fallen unit slumped on the ground, drawn where a unit died
// and faded out via draw-time alpha. Neutral dark tones so it reads on any
// faction: outline (k) over metal shadow (n).
export const CORPSE: SpriteDef = {
  palette: { ...OUTLINE, ...METAL },
  frames: [
    [
      '............',
      '............',
      '..kk..kk....',
      '.knnk.knk...',
      '.knnnknnk...',
      '..knnnnk....',
      '...kkk......',
      '............',
    ],
  ],
};

// Rubble — 12x6. A collapsed building's debris pile; replaces a destroyed
// structure and fades like a corpse. Metal light/mid/dark (M m n) over outline.
export const RUBBLE: SpriteDef = {
  palette: { ...OUTLINE, ...METAL },
  frames: [
    [
      '............',
      '...nn.mn....',
      '..nmMmmn.n..',
      '.nmMMmmnmmn.',
      '.mmnmMmmnmm.',
      '.nnmmnnmmnn.',
    ],
  ],
};

// Cargo chip — 6x6. The load a worker carries home; a small bright nugget drawn
// above the unit on its return trip. Gold gem: white rim (w) over yellow (y).
export const CARGO_CHIP: SpriteDef = {
  palette: { w: '#fff2c0', y: '#ffd23f' },
  frames: [
    [
      '..ww..',
      '.wyyw.',
      'wyyyyw',
      'wyyyyw',
      '.wyyw.',
      '..ww..',
    ],
  ],
};

// Construction scaffold — 16x16, 2 stages by build progress. Wooden framing
// (B b d) drawn scaled over a building's footprint while it's raising. Stage 0
// is the base posts, stage 1 fills in beams and cross-bracing.
export const SCAFFOLD: SpriteDef = {
  palette: { ...OUTLINE, ...WOOD },
  frames: [
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.b............b.',
      '.b............b.',
      '.b............b.',
      '.b............b.',
      '.bbbbbbbbbbbbbb.',
      '................',
    ],
    [
      '................',
      '.bbbbbbbbbbbbbb.',
      '.b............b.',
      '.b...bb..bb...b.',
      '.b...bb..bb...b.',
      '.b............b.',
      '.b....bbbb....b.',
      '.b............b.',
      '.b...bb..bb...b.',
      '.b...bb..bb...b.',
      '.b............b.',
      '.b............b.',
      '.b............b.',
      '.b............b.',
      '.bbbbbbbbbbbbbb.',
      '................',
    ],
  ],
};

/** Every sprite this sheet owns (plus the re-exports), for the validate-all test. */
export const RTS_COMMON_SPRITES: Record<string, SpriteDef> = {
  MUZZLE_FLASH,
  PROJECTILE,
  CORPSE,
  RUBBLE,
  CARGO_CHIP,
  SCAFFOLD,
  EXPLOSION,
  SHADOW_BLOB,
  SELECTION_RING,
};
