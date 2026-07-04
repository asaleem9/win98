// Age of Empires II sprite sheet — the medieval cast the RTS engine draws for
// the Dark/Feudal/Castle-age skirmish. Villagers and the four soldier types are
// authored with the faction chars (R r q) so the engine recolors them per team;
// stone (M m n), timber (B b d), thatch/wheat (h H) and skin (S s t) stay fixed.
// Buildings read isometric through wide rooflines rather than any engine change.
//
// Style follows common.ts / rts-common.ts: mnemonic palette chars, one comment
// per sprite naming its size, and a validate-all test (aoe2.test.ts).
//
// Note: the engine renders harvestable resource patches as flat colored diamonds,
// so the berry bush and tree cluster below are authored for the sheet but do not
// appear on the live map (food/wood patches show as gold/timber diamonds). The
// Farm sprite *is* wired up — a placed Farm is a building, so its tilled field
// draws, with a food diamond sitting on top. See AgeOfEmpires2.tsx.

import type { SpriteDef } from './sprite';
import { OUTLINE, WHITE, SKIN, FOLIAGE, WOOD, METAL, FACTION_RED } from './palettes';

// Custom era tones that no shared fragment covers.
const GOLD = { y: '#e8c34a' } as const; // banner finials, flag trim
const WHEAT = { h: '#d4b24a', H: '#efd77a' } as const; // farm crop mid / light
const BERRY = { e: '#b0304a', p: '#e0687a' } as const; // berry dark / light

// ---------------------------------------------------------------------------
// Units — authored with faction chars (R r q); the engine recolors per team.
// ---------------------------------------------------------------------------

// Villager — 12x14, 2 frames (idle / step). A tunic-clad peasant; the engine's
// cargo chip shows what they carry, so no tool is drawn. Skin face over a
// team-tinted tunic (R r) and brown legs (b).
export const VILLAGER: SpriteDef = {
  palette: { ...OUTLINE, ...SKIN, ...FACTION_RED, b: WOOD.b },
  frames: [
    [
      '....kkkk....',
      '...kSSSSk...',
      '...kSssSk...',
      '...kSssSk...',
      '....kkkk....',
      '...kRRRRk...',
      '..kRRRRRRk..',
      '..kRRrrRRk..',
      '..kRRrrRRk..',
      '...kRRRRk...',
      '...kb..bk...',
      '...kb..bk...',
      '...kb..bk...',
      '...kk..kk...',
    ],
    [
      '....kkkk....',
      '...kSSSSk...',
      '...kSssSk...',
      '...kSssSk...',
      '....kkkk....',
      '...kRRRRk...',
      '..kRRRRRRk..',
      '..kRRrrRRk..',
      '..kRRrrRRk..',
      '...kRRRRk...',
      '..kb...bk...',
      '..kb...bk...',
      '..kb...bk...',
      '..kk...kk...',
    ],
  ],
};

// Militia — 12x15, 2 frames. Dark-Age footman: bare head, team tunic (R r),
// short sword (M) and a white round shield (w). Frame 1 lowers the blade mid-step.
export const MILITIA: SpriteDef = {
  palette: { ...OUTLINE, ...SKIN, ...FACTION_RED, ...WHITE, ...METAL, b: WOOD.b },
  frames: [
    [
      '....kkkk....',
      '...kSSSSk...',
      '...kSssSk...',
      '....kkkk....',
      '..kRRRRk.M..',
      '..RRRRRRkM..',
      '.kRRrrRRkM..',
      '.kRRrrRRMk..',
      '.wkRRRRkk...',
      '.wwkRRk.....',
      '..kRRRRk....',
      '..kb..bk....',
      '..kb..bk....',
      '..kk..kk....',
      '............',
    ],
    [
      '....kkkk....',
      '...kSSSSk...',
      '...kSssSk...',
      '....kkkk....',
      '..kRRRRk....',
      '..RRRRRRk...',
      '.kRRrrRRk.M.',
      '.kRRrrRRkMk.',
      '.wkRRRRkMk..',
      '.wwkRRkk....',
      '..kRRRRk....',
      '..kb...bk...',
      '..kb...bk...',
      '..kk...kk...',
      '............',
    ],
  ],
};

// Man-at-Arms — 12x16, 2 frames. Feudal upgrade of the militia: mail and a full
// helm (M m), team surcoat (R r), sword (M) and a white kite shield (w). Heavier
// than the militia it replaces.
export const MAN_AT_ARMS: SpriteDef = {
  palette: { ...OUTLINE, ...METAL, ...FACTION_RED, ...WHITE },
  frames: [
    [
      '....MMMM....',
      '...MMMMMM...',
      '...MkMMkM...',
      '....MMMM....',
      '..mMRRMm.M..',
      '..MRRRRMkM..',
      '.wMRRrrMkM..',
      'wwMRRrrMMk..',
      'wwMRRRRMk...',
      '.wMRRRRMk...',
      '..mMMMMm....',
      '..Mn..nM....',
      '..Mn..nM....',
      '..Mn..nM....',
      '..kk..kk....',
      '............',
    ],
    [
      '....MMMM....',
      '...MMMMMM...',
      '...MkMMkM...',
      '....MMMM....',
      '..mMRRMm....',
      '..MRRRRMk.M.',
      '.wMRRrrMkMk.',
      'wwMRRrrMMk..',
      'wwMRRRRMk...',
      '.wMRRRRMk...',
      '..mMMMMm....',
      '..Mn...nM...',
      '..Mn...nM...',
      '..Mn...nM...',
      '..kk...kk...',
      '............',
    ],
  ],
};

// Archer — 12x15, 2 frames. Feudal ranged unit: team tunic (R r), a longbow (B)
// with dark string (d) held to the side. Frame 0 draws the bow, frame 1 steps.
export const ARCHER: SpriteDef = {
  palette: { ...OUTLINE, ...SKIN, ...FACTION_RED, ...WOOD },
  frames: [
    [
      '...kkkk.....',
      '..kSSSSk.B..',
      '..kSssSk.B..',
      '...kkkk.dB..',
      '..kRRRRkdB..',
      '.kRRRRRRdB..',
      '.kRRrrRRdB..',
      '.kRRRRRRdB..',
      '..kRRRRkdB..',
      '..kRRRRk.B..',
      '...kRRk..B..',
      '..kb..bk....',
      '..kb..bk....',
      '..kk..kk....',
      '............',
    ],
    [
      '...kkkk.....',
      '..kSSSSk.B..',
      '..kSssSk.B..',
      '...kkkk..B..',
      '..kRRRRk.B..',
      '.kRRRRRR.B..',
      '.kRRrrRRdB..',
      '.kRRRRRRdB..',
      '..kRRRRk.B..',
      '..kRRRRk.B..',
      '...kRRk..B..',
      '..kb...bk...',
      '..kb...bk...',
      '..kk...kk...',
      '............',
    ],
  ],
};

// Knight — 16x16, 2 frames. A mounted, armored rider: brown horse (B b d), team
// surcoat and plume (R r) over mail (M m), lance raised. Frame 1 shifts the legs
// into a gallop. Wider than the foot soldiers so the horse reads.
export const KNIGHT: SpriteDef = {
  palette: { ...OUTLINE, ...METAL, ...FACTION_RED, ...WOOD },
  frames: [
    [
      '................',
      '.........k......',
      '......MMMk......',
      '.....MMRMk......',
      '.....MRRRk......',
      '....mMRRRMm.....',
      '..BBBRRRRRBB....',
      '.BBBBBBBBBBBB...',
      'BBBBbbbbbbbBBBb.',
      'dBBbbbbbbbbBBbb.',
      '.b.bb....bb.Bb..',
      '.b.bb....bb.bb..',
      '.d.dd....dd.d...',
      '.k.kk....kk.k...',
      '................',
      '................',
    ],
    [
      '................',
      '.........k......',
      '......MMMk......',
      '.....MMRMk......',
      '.....MRRRk......',
      '....mMRRRMm.....',
      '..BBBRRRRRBB....',
      '.BBBBBBBBBBBB...',
      'BBBBbbbbbbbBBBb.',
      'dBBbbbbbbbbBBbb.',
      '..b.bb..bb.Bb...',
      '..b.bb..bb.bb...',
      '..d.dd..dd.d....',
      '..k.kk..kk.k....',
      '................',
      '................',
    ],
  ],
};

// ---------------------------------------------------------------------------
// Buildings — stone (M m n) and timber (B b d) with team-tinted roofs/banners.
// ---------------------------------------------------------------------------

// Town Center — 32x22. The base: a broad, low team-colored roofline over a
// stone hall with a central banner, so it reads as an isometric keep against the
// smaller sprites around it. Wider than it is tall for the 2:1 roof.
export const TOWN_CENTER: SpriteDef = {
  palette: { ...OUTLINE, ...METAL, ...FACTION_RED, ...WHITE, ...GOLD, b: WOOD.b, d: WOOD.d },
  frames: [
    [
      '...............ky...............',
      '...............kRy..............',
      '..............kRRRk.............',
      '............kRRRRRRRk...........',
      '..........kRRRRrRRRRRk..........',
      '........kRRRRrrrrRRRRRk.........',
      '......kRRRRRrrrrrrRRRRRRk.......',
      '.....kRRRRRRrrrrrrRRRRRRRk......',
      '....kkkkkkkkkkkkkkkkkkkkkkkk....',
      '....nMMMMMMMMMMMMMMMMMMMMMMn....',
      '....MMMbMMMMMMMMMMMMMMMbMMMM....',
      '....MMMbMMwwMMMMMMwwMMMbMMMM....',
      '....MMMbMMwwMMMMMMwwMMMbMMMM....',
      '....MMMbMMMMMMMMMMMMMMMbMMMM....',
      '....MMMbMMMMMdddddMMMMMbMMMM....',
      '....MMMbMMMMMdbbbdMMMMMbMMMM....',
      '....MMMbMMMMMdbbbdMMMMMbMMMM....',
      '....nnnnnnnnndbbbdnnnnnnnnnn....',
      '....MMMMMMMMMdbbbdMMMMMMMMMM....',
      '....kkkkkkkkkkkkkkkkkkkkkkkk....',
      '................................',
      '................................',
    ],
  ],
};

// House — 18x16. Timber walls (B b) under a team-tinted roof (R r), two shuttered
// windows (w) and a dark doorway. Small; raises the population cap.
export const HOUSE: SpriteDef = {
  palette: { ...OUTLINE, ...FACTION_RED, ...WOOD, ...WHITE },
  frames: [
    [
      '.....kRRRRRRk.....',
      '....kRRRRRRRRk....',
      '...kRRRRrrRRRRk...',
      '..kRRRRrrrrRRRRk..',
      '.kRRRRRrrrrRRRRRk.',
      'kkkkkkkkkkkkkkkkkk',
      '.kBBBBBBBBBBBBBBk.',
      '.kBBBwwBBBBwwBBBk.',
      '.kBBBwwBBBBwwBBBk.',
      '.kBBBBBBBBBBBBBBk.',
      '.kBBBBBddBBBBBBBk.',
      '.kBBBBBddBBBBBBBk.',
      '.kBBBBBddBBBBBBBk.',
      '.kbbbbbddbbbbbbbk.',
      '.kkkkkkkkkkkkkkkk.',
      '..................',
    ],
  ],
};

// Barracks — 24x18. Battlemented stone hall (M n) with a team banner over the
// gate; trains militia and (after the Feudal Age) men-at-arms. Squat and solid.
export const BARRACKS: SpriteDef = {
  palette: { ...OUTLINE, ...METAL, ...FACTION_RED, ...WHITE, b: WOOD.b, d: WOOD.d },
  frames: [
    [
      'M.M.M.M.M.M.M.M.M.M.M.M.',
      'MMMMMMMMMMMMMMMMMMMMMMMM',
      'MnMMMMMMMMMMMMMMMMMMMMnM',
      'MMMMMMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMkRRkMMMMMMMMMMMM',
      'MMMMMMMMkRRkMMMMMMMMMMMM',
      'MMMMMMMMkRRkMMMMMMMMMMMM',
      'nnnnnnnnnnnnnnnnnnnnnnnn',
      'MMMMMMMMMMMMMMMMMMMMMMMM',
      'MMwwMMMMMMMMMMMMMMMMwwMM',
      'MMwwMMMMMMMMMMMMMMMMwwMM',
      'MMMMMMMMMdddddMMMMMMMMMM',
      'MMMMMMMMMdbbbdMMMMMMMMMM',
      'MMMMMMMMMdbbbdMMMMMMMMMM',
      'MMMMMMMMMdbbbdMMMMMMMMMM',
      'nnnnnnnnndbbbdnnnnnnnnnn',
      'kkkkkkkkkkkkkkkkkkkkkkkk',
      '........................',
    ],
  ],
};

// Archery Range — 24x18. A thatch-roofed (h) timber hall (B b) with two window
// slits; unlocked in the Feudal Age to train archers. Wooden, not stone.
export const ARCHERY_RANGE: SpriteDef = {
  palette: { ...OUTLINE, ...WOOD, ...WHITE, ...WHEAT },
  frames: [
    [
      '..bbbbbbbbbbbbbbbbbbbb..',
      '.bhhhhhhhhhhhhhhhhhhhhb.',
      'bhhhhhhhhhhhhhhhhhhhhhhb',
      'kddddddddddddddddddddddk',
      'kBBBBBBBBBBBBBBBBBBBBBBk',
      'kBBBBBBwwBBBBBBwwBBBBBBk',
      'kBBBBBBwwBBBBBBwwBBBBBBk',
      'kBBBBBBBBBBBBBBBBBBBBBBk',
      'kBBBBBBBBBBBBBBBBBBBBBBk',
      'kBBBBBBBBBBBBBBBBBBBBBBk',
      'kBBBBBBBBBddddBBBBBBBBBk',
      'kBBBBBBBBBdbbdBBBBBBBBBk',
      'kBBBBBBBBBdbbdBBBBBBBBBk',
      'kBBBBBBBBBdbbdBBBBBBBBBk',
      'kbbbbbbbbbdbbdbbbbbbbbbk',
      'kbbbbbbbbbdbbdbbbbbbbbbk',
      'kkkkkkkkkkkkkkkkkkkkkkkk',
      '........................',
    ],
  ],
};

// Stable — 24x18. A big gabled timber barn (B b) with a team pennant at the peak
// and an arched horse doorway; unlocked in the Castle Age to train knights.
export const STABLE: SpriteDef = {
  palette: { ...OUTLINE, ...FACTION_RED, ...WOOD },
  frames: [
    [
      '...........kk...........',
      '..........kRRk..........',
      '.........kRRRRk.........',
      '........kRRRRRRk........',
      '.......kBBBBBBBBk.......',
      '......kBBBBBBBBBBk......',
      '.....kBBBBBBBBBBBBk.....',
      '....kBBBBBBBBBBBBBBk....',
      '...kBBBBBBBBBBBBBBBBk...',
      '..kbbbbbbbbbbbbbbbbbbk..',
      '..kbBBBBBBBBBBBBBBBBbk..',
      '..kbBBBBkkkkkkkkBBBBbk..',
      '..kbBBBkkkkkkkkkkBBBbk..',
      '..kbBBkkkkkkkkkkkkBBbk..',
      '..kbBBkkkkkkkkkkkkBBbk..',
      '..kbBBkkkkkkkkkkkkBBbk..',
      '..kbbbkkkkkkkkkkkkbbbk..',
      '..kkkkkkkkkkkkkkkkkkkk..',
    ],
  ],
};

// Farm — 24x14. A fenced (b) field of tilled furrows (d) and ripening wheat
// (h H). Flat and wide; placing one seeds a renewable food patch.
export const FARM: SpriteDef = {
  palette: { ...OUTLINE, ...WHEAT, b: WOOD.b, d: WOOD.d },
  frames: [
    [
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'bHhHhHhHhHhHhHhHhHhHhHhb',
      'bhHhHhHhHhHhHhHhHhHhHhHb',
      'bddddddddddddddddddddddb',
      'bhHhHhHhHhHhHhHhHhHhHhHb',
      'bHhHhHhHhHhHhHhHhHhHhHhb',
      'bddddddddddddddddddddddb',
      'bHhHhHhHhHhHhHhHhHhHhHhb',
      'bhHhHhHhHhHhHhHhHhHhHhHb',
      'bddddddddddddddddddddddb',
      'bHhHhHhHhHhHhHhHhHhHhHhb',
      'bhHhHhHhHhHhHhHhHhHhHhHb',
      'bbbbbbbbbbbbbbbbbbbbbbbb',
      'kkkkkkkkkkkkkkkkkkkkkkkk',
    ],
  ],
};

// Watch Tower — 14x24. A tall battlemented stone spire (M n) with arrow-slit
// windows (w) and a team flag; unlocked in the Feudal Age, it fires on raiders.
export const WATCH_TOWER: SpriteDef = {
  palette: { ...OUTLINE, ...METAL, ...FACTION_RED, ...GOLD, ...WHITE, d: WOOD.d },
  frames: [
    [
      '......ky......',
      '......kRy.....',
      '......kRRy....',
      '......k.......',
      '.M.M.M.M.M.M..',
      '.MMMMMMMMMMMM.',
      '.MnMMMMMMMMnM.',
      '.MMMMMMMMMMMM.',
      '.MMMMMwwMMMMM.',
      '.MMMMMwwMMMMM.',
      '.MMMMMMMMMMMM.',
      '.nnnnnnnnnnnn.',
      '.MMMMMMMMMMMM.',
      '.MMMMMwwMMMMM.',
      '.MMMMMwwMMMMM.',
      '.MMMMMMMMMMMM.',
      '.nnnnnnnnnnnn.',
      '.MMMMMMMMMMMM.',
      '.MMMMMMMMMMMM.',
      '.MMMMkkkkMMMM.',
      '.MMMMkddkMMMM.',
      '.MMMMkddkMMMM.',
      '.nnnnkddknnnn.',
      'kkkkkkkkkkkkkk',
    ],
  ],
};

// ---------------------------------------------------------------------------
// Neutral map props — see the file header: the engine draws resource patches as
// diamonds, so these are authored for the sheet but not wired into the map.
// ---------------------------------------------------------------------------

// Berry bush — 14x12. A leafy mound (G g f) studded with ripe berries (e p);
// the food a Dark-Age economy lives on until farms take over.
export const BERRY_BUSH: SpriteDef = {
  palette: { ...OUTLINE, ...FOLIAGE, ...BERRY },
  frames: [
    [
      '...GGG..GGG...',
      '..GGGGGGGGGG..',
      '.GGgGGeGGGgGG.',
      '.GgGeGGGeGgGG.',
      'GGGGGGeGGGpGGG',
      'GgGGeGGgGGGGgG',
      'GGgGGGeGGGeGgG',
      '.GgGGgGGGgGGG.',
      '.fGgGGfGgGGfG.',
      '..fgGfGgGfgG..',
      '...fffggfff...',
      '....k.kk.k....',
    ],
  ],
};

// Tree cluster — 18x18. Two overlapping broadleaf canopies (G g f) on paired
// trunks (b d); a chunk of the forest lines that wall off the map's chokes.
export const TREE_CLUSTER: SpriteDef = {
  palette: { ...OUTLINE, ...FOLIAGE, b: WOOD.b, d: WOOD.d },
  frames: [
    [
      '.....GGG...GGG....',
      '...GGGGGG.GGGGGG..',
      '..GGGgGGGGGGGgGGG.',
      '.GGGgggGGGGGgggGG.',
      'GGGgggggGGGgggggGG',
      'GGgggffgGGgggffggG',
      'GgggffggGgggffgggG',
      'Ggggffggggggfffggf',
      '.gggffgggggffffgg.',
      '.ggffggggggfffggf.',
      '..gffgggggffffgg..',
      '..ffgggggfffffg...',
      '...fggggffffgg....',
      '.....bd...bd......',
      '.....bd...bd......',
      '.....bd...bd......',
      '....kbdk.kbdk.....',
      '..................',
    ],
  ],
};

/** Every sprite in this sheet, for the validate-all test and config wiring. */
export const AOE2_SPRITES: Record<string, SpriteDef> = {
  VILLAGER,
  MILITIA,
  MAN_AT_ARMS,
  ARCHER,
  KNIGHT,
  TOWN_CENTER,
  HOUSE,
  BARRACKS,
  ARCHERY_RANGE,
  STABLE,
  FARM,
  WATCH_TOWER,
  BERRY_BUSH,
  TREE_CLUSTER,
};
