// StarCraft sprite sheet — the Terran-vs-Zerg cast the RTS engine draws for the
// skirmish. Terran units and structures are authored with the faction chars
// (R r q) so the engine tints them per team (player = blue), while their metal
// (M m n), white (w) and warm accents (o y) stay fixed. The Zerg strains reuse
// the same faction chars, so the enemy recolor (purple) washes them alien.
//
// Style follows common.ts / rts-common.ts: mnemonic palette chars, one comment
// per sprite naming its size, and a validate-all test (starcraft.test.ts).
//
// Note: the mineral crystal and vespene geyser below are wired to the minerals
// and gas resources (ResourceDef.sprite), so their patches draw as crystal
// clusters and geysers on the live map instead of flat diamonds.

import type { SpriteDef } from './sprite';
import { OUTLINE, WHITE, METAL, FACTION_RED } from './palettes';

// Custom tones no shared fragment covers.
const ACCENT = { o: '#f0872a', y: '#ffcf3f' } as const; // flame / warning lamps
const GAS = { A: '#43d17a', a: '#238f4f' } as const; // vespene light / dark
const CRYSTAL = { C: '#8fe6f0', c: '#3fb8d0' } as const; // mineral light / dark
const CROSS = { p: '#e23c3c' } as const; // medic red cross

// ---------------------------------------------------------------------------
// Terran units — authored with faction chars (R r q); the engine tints per team.
// ---------------------------------------------------------------------------

// SCV — 12x12, 1 frame. A boxy construction pod: metal shell (M m n) around a
// team-tinted cockpit (R) with a white viewport (w) and stubby claw legs.
export const SCV: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, ...METAL, R: FACTION_RED.R },
  frames: [
    [
      '....kkkk....',
      '..kkMMMMkk..',
      '.kMMRRRRMMk.',
      '.kMRRwwRRMk.',
      '.kMRRwwRRMk.',
      '.kMMRRRRMMk.',
      'kMMmMMMMmMMk',
      'kMnmMMMMmnMk',
      '.knmMMMMmnk.',
      '..k.MMMM.k..',
      '...kMmmMk...',
      '...kk..kk...',
    ],
  ],
};

// Marine — 12x14, 2 frames. Powered-armor trooper: team suit (R r), white visor
// (w) and a metal gauss rifle (M) held to the side. Frame 1 opens the stride.
export const MARINE: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, M: METAL.M, R: FACTION_RED.R, r: FACTION_RED.r, n: METAL.n },
  frames: [
    [
      '....kkkk....',
      '...kMMMMk...',
      '...kMwwMk...',
      '...kMMMMk...',
      '..kRRRRRRk..',
      '.kRRRRRRMk..',
      '.kRRrrRRMk..',
      '.kRRrrRRMk..',
      '.kRRRRRRk...',
      '..kRRRRk....',
      '..kRRRRk....',
      '..kn..nk....',
      '..kn..nk....',
      '..kk..kk....',
    ],
    [
      '....kkkk....',
      '...kMMMMk...',
      '...kMwwMk...',
      '...kMMMMk...',
      '..kRRRRRRk..',
      '.kRRRRRRMk..',
      '.kRRrrRRMk..',
      '.kRRrrRRMk..',
      '.kRRRRRRk...',
      '..kRRRRk....',
      '..kRRRRk....',
      '..kn...nk...',
      '..kn...nk...',
      '..kk...kk...',
    ],
  ],
};

// Firebat — 12x14, 2 frames. Squat flame trooper: heavy team suit (R r) with a
// white visor and twin nozzles (M) venting fire to the side. Frame 1 flares the
// flame fuller (o y w). Short range, hits a splash of clustered enemies.
export const FIREBAT: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, ...ACCENT, M: METAL.M, n: METAL.n, R: FACTION_RED.R, r: FACTION_RED.r },
  frames: [
    [
      '...kkkk.....',
      '..kMMMMk....',
      '..kMwwMk....',
      '..kMMMMk....',
      '.kRRRRRRk...',
      '.kRRRRRRk.o.',
      '.kRRrrRRMMoy',
      '.kRRrrRRMMoy',
      '.kRRRRRRk.o.',
      '.kRRRRRRk...',
      '.kRRRRRRk...',
      '.kn....nk...',
      '.kn....nk...',
      '.kk....kk...',
    ],
    [
      '...kkkk.....',
      '..kMMMMk....',
      '..kMwwMk....',
      '..kMMMMk....',
      '.kRRRRRRk.o.',
      '.kRRRRRRkoyo',
      '.kRRrrRRMoyw',
      '.kRRrrRRMoyw',
      '.kRRRRRRkoyo',
      '.kRRRRRRk.o.',
      '.kRRRRRRk...',
      '.kn....nk...',
      '.kn....nk...',
      '.kk....kk...',
    ],
  ],
};

// Medic — 12x14, 1 frame. White field-medic suit (w) with a red cross (p) on the
// chest and team shoulder trim (R). Carries no weapon; mends nearby wounded.
export const MEDIC: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, ...CROSS, R: FACTION_RED.R, n: METAL.n },
  frames: [
    [
      '....kkkk....',
      '...kwwwwk...',
      '...kwwwwk...',
      '...kkkkkk...',
      '..kwwwwwwk..',
      '.kwwwppwwwk.',
      '.kwwppppwwk.',
      '.kwwwppwwwk.',
      '.kRwwwwwwRk.',
      '..kwwwwwwk..',
      '..kwwwwwwk..',
      '..kn..nk....',
      '..kn..nk....',
      '..kk..kk....',
    ],
  ],
};

// Siege Tank — 16x13, 1 frame. A tracked assault tank: team-tinted turret (R r)
// over a metal hull (M m n) with a long cannon barrel to the right and segmented
// treads below. Slow, long range, devastating splash.
export const SIEGE_TANK: SpriteDef = {
  palette: { ...OUTLINE, ...METAL, R: FACTION_RED.R, r: FACTION_RED.r },
  frames: [
    [
      '................',
      '.....kkkk.......',
      '....kRRRRk......',
      '...kRRRRRRkkkkk.',
      '...kRRrrRRnnnnk.',
      '..kMMRRRRMMkkkk.',
      '.kMMMMMMMMMMk...',
      'kMMMMMMMMMMMMk..',
      'kMnMMMMMMMMnMk..',
      'kMMMMMMMMMMMMk..',
      'kkkkkkkkkkkkkk..',
      'knknknknknknkk..',
      'kkkkkkkkkkkkkk..',
    ],
  ],
};

// ---------------------------------------------------------------------------
// Zerg units — the enemy swarm. Same faction chars (R r q); the purple enemy
// recolor makes them read as living carapace, bone (w) claws stay fixed.
// ---------------------------------------------------------------------------

// Zergling — 12x12, 2 frames. A small pouncing beast: team carapace (R) with a
// dark dorsal ridge (q) and bone claws (w). The two frames skitter its legs.
export const ZERGLING: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, R: FACTION_RED.R, q: FACTION_RED.q },
  frames: [
    [
      '............',
      '..w......w..',
      '..wk....kw..',
      '...kRRRRk...',
      '..kRRRRRRk..',
      '.kRRqqqqRRk.',
      '.kRRqqqqRRk.',
      '.kRRRRRRRRk.',
      '..kRRRRRRk..',
      '..k.kk.k.k..',
      '.k..kk..k...',
      '............',
    ],
    [
      '............',
      '...w....w...',
      '..wk....kw..',
      '...kRRRRk...',
      '..kRRRRRRk..',
      '.kRRqqqqRRk.',
      '.kRRqqqqRRk.',
      '.kRRRRRRRRk.',
      '..kRRRRRRk..',
      '.k.kk.kk.k..',
      '..k..kk...k.',
      '............',
    ],
  ],
};

// Hydralisk — 14x16, 2 frames. A tall serpent that spits spines: team carapace
// (R) over a dark spine ridge (q), bone quills (w) fanning from its flanks.
// Frame 1 lowers the quills as it slithers. Ranged, tougher than a zergling.
export const HYDRALISK: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, R: FACTION_RED.R, q: FACTION_RED.q },
  frames: [
    [
      '..............',
      '.....kkkk.....',
      '....kRRRRk....',
      '...kRRwwRRk...',
      '...kRRRRRRk...',
      'w..kRRRRRRk..w',
      'wk.kRRRRRRk.kw',
      '.wkRRRRRRRRkw.',
      '..kRRqqqqRRk..',
      '.kRRRqqqqRRRk.',
      '.kRRRRRRRRRRk.',
      '..kRRRRRRRRk..',
      '...kRRRRRRk...',
      '...kRRRRRRk...',
      '....kk..kk....',
      '..............',
    ],
    [
      '..............',
      '.....kkkk.....',
      '....kRRRRk....',
      '...kRRwwRRk...',
      '...kRRRRRRk...',
      '...kRRRRRRk...',
      'w..kRRRRRRk..w',
      'wk.kRRRRRRk.kw',
      '.wkRRqqqqRRkw.',
      '.kRRRqqqqRRRk.',
      '.kRRRRRRRRRRk.',
      '..kRRRRRRRRk..',
      '...kRRRRRRk...',
      '...kRRRRRRk...',
      '...kk....kk...',
      '..............',
    ],
  ],
};

// ---------------------------------------------------------------------------
// Terran buildings — metal (M m n) hulls with team-tinted roofs and stripes.
// ---------------------------------------------------------------------------

// Command Center — 28x21. The base: a broad metal fortress (M m n) crowned with
// a team-colored roof (R r), lit viewports (w), a central landing pad (y) and a
// dark bay door. The enemy shares this type, tinted purple as its Hive.
export const COMMAND_CENTER: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, ...METAL, ...ACCENT, R: FACTION_RED.R, r: FACTION_RED.r },
  frames: [
    [
      '............................',
      '......kkkkkkkkkkkkkk........',
      '.....kRRRRRRRRRRRRRRk.......',
      '....kRRRRRRRRRRRRRRRRk......',
      '...kRRRRRRrrrrRRRRRRRRk.....',
      '..kkkkkkkkkkkkkkkkkkkkkk....',
      '..kMMMMMMMMMMMMMMMMMMMMk....',
      '..kMMwwMMMMMMMMMMMMwwMMk....',
      '..kMMwwMMMMMMMMMMMMwwMMk....',
      '..kMMMMMMMMMMMMMMMMMMMMk....',
      '..kMnMMMMMMMMMMMMMMMMnMk....',
      '..kMMMMMMkkkkkkMMMMMMMMk....',
      '..kMMMMMMkyyyykMMMMMMMMk....',
      '..kMMMMMMkyyyykMMMMMMMMk....',
      '..kMMMMMMkkkkkkMMMMMMMMk....',
      '..kMMMMMMMMMMMMMMMMMMMMk....',
      '..kMnMMMMMMMMMMMMMMMMnMk....',
      '..kMMMMMnnnnnnnMMMMMMMMk....',
      '..kMMMMMnMMMMMnMMMMMMMMk....',
      '..kkkkkkkkkkkkkkkkkkkkkk....',
      '............................',
    ],
  ],
};

// Supply Depot — 20x13. A low armored bunker (M m n) with a team stripe (R) and
// a lit central hatch (y). Small footprint; raises the supply cap.
export const DEPOT: SpriteDef = {
  palette: { ...OUTLINE, ...METAL, ...ACCENT, R: FACTION_RED.R },
  frames: [
    [
      '...kkkkkkkkkkkkkk...',
      '..kMMMMMMMMMMMMMMk..',
      '.kMMRRRRRRRRRRRRMMk.',
      '.kMMRRRRRRRRRRRRMMk.',
      '.kMMMMMMMMMMMMMMMMk.',
      '.kMnMMMMMMMMMMMMnMk.',
      '.kMMMMkkkkkkkkMMMMk.',
      '.kMMMMkyyyyyykMMMMk.',
      '.kMMMMkyyyyyykMMMMk.',
      '.kMMMMkkkkkkkkMMMMk.',
      '.kMnMMMMMMMMMMMMnMk.',
      '.kMMMMMMMMMMMMMMMMk.',
      '.kkkkkkkkkkkkkkkkkk.',
    ],
  ],
};

// Barracks — 24x16. A metal infantry hall (M m n) with a team banner on a mast,
// two lit windows (w) and a dark doorway. Trains marines, firebats and medics.
export const BARRACKS: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, ...METAL, R: FACTION_RED.R },
  frames: [
    [
      '..........kk............',
      '..........kRk...........',
      '..........kRRk..........',
      '..kkkkkkkkkkkkkkkkkkkk..',
      '.kMMMMMMMMMMMMMMMMMMMMk.',
      '.kMnMMMMMMMMMMMMMMMMnMk.',
      '.kMMMMMMMMMMMMMMMMMMMMk.',
      '.kMMwwMMMMMMMMMMMMwwMMk.',
      '.kMMwwMMMMMMMMMMMMwwMMk.',
      '.kMMMMMMMMMMMMMMMMMMMMk.',
      '.kMnMMMMMMMMMMMMMMMMnMk.',
      '.kMMMMMMMMkkkkMMMMMMMMk.',
      '.kMMMMMMMMknnkMMMMMMMMk.',
      '.kMMMMMMMMknnkMMMMMMMMk.',
      '.kMMMMMMMMknnkMMMMMMMMk.',
      '.kkkkkkkkkkkkkkkkkkkkkk.',
    ],
  ],
};

// Factory — 26x16. A heavy industrial works (M m n) with a smokestack venting
// exhaust (n), a team stripe (R) and a wide garage door. Builds siege tanks.
export const FACTORY: SpriteDef = {
  palette: { ...OUTLINE, ...METAL, R: FACTION_RED.R },
  frames: [
    [
      '.....k....................',
      '.....knn..................',
      '.....knn..................',
      '.kkkkkkkkkkkkkkkkkkkkkkkk.',
      '.kMMMMMMMMMMMMMMMMMMMMMMk.',
      '.kMnMMMMMMMMMMMMMMMMMMnMk.',
      '.kMMMMMMMMMMMMMMMMMMMMMMk.',
      '.kMMRRRRRRRRRRRRRRRRRRMMk.',
      '.kMMRRRRRRRRRRRRRRRRRRMMk.',
      '.kMMMMMMMMMMMMMMMMMMMMMMk.',
      '.kMnMMMMMMMMMMMMMMMMMMnMk.',
      '.kMMMMkkkkkkkkkkkkkkMMMMk.',
      '.kMMMMknnnnnnnnnnnnkMMMMk.',
      '.kMMMMknnnnnnnnnnnnkMMMMk.',
      '.kMMMMknnnnnnnnnnnnkMMMMk.',
      '.kkkkkkkkkkkkkkkkkkkkkkkk.',
    ],
  ],
};

// Refinery — 22x14. A vespene plant: metal housing (M m n) flanked by two green
// gas tanks (A a) with a team stripe (R) and a piped extraction door. Placing it
// seeds a fresh gas patch, so it doubles the geyser's income.
export const REFINERY: SpriteDef = {
  palette: { ...OUTLINE, ...METAL, ...GAS, R: FACTION_RED.R },
  frames: [
    [
      '..kkkkkkkkkkkkkkkkkk..',
      '.kMMMMMMMMMMMMMMMMMMk.',
      '.kMMRRRRRRRRRRRRRRMMk.',
      '.kMMMMMMMMMMMMMMMMMMk.',
      '.kMAAAkMMMMMMMMkAAAMk.',
      '.kMAAAkMMMMMMMMkAAAMk.',
      '.kMAaAkMMMMMMMMkAaAMk.',
      '.kMAaAkMMMMMMMMkAaAMk.',
      '.kMaaakMMMMMMMMkaaaMk.',
      '.kMMMMMMMMMMMMMMMMMMk.',
      '.kMnMMMMMMMMMMMMMMnMk.',
      '.kMMMMMMkkkkkkMMMMMMk.',
      '.kMMMMMMkaaaakMMMMMMk.',
      '.kkkkkkkkkkkkkkkkkkkk.',
    ],
  ],
};

// Missile Turret — 16x15, 1 frame. A swiveling anti-swarm battery: a boxed
// launcher head (M) with white missile ports (w) on a team-tinted mount (R).
export const MISSILE_TURRET: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, M: METAL.M, R: FACTION_RED.R },
  frames: [
    [
      '....kkkkkkkk....',
      '...kMMMMMMMMk...',
      '..kMwwMMMMwwMk..',
      '..kMwwMMMMwwMk..',
      '..kMMMMMMMMMMk..',
      '...kMMMMMMMMk...',
      '....kMRRMk......',
      '.....kMMk.......',
      '.....kMMk.......',
      '.....kMMk.......',
      '....kMMMMk......',
      '...kMRRRRMk.....',
      '..kMRRRRRRMk....',
      '..kMMMMMMMMk....',
      '..kkkkkkkkkk....',
    ],
  ],
};

// Sunken Colony — 20x19, 1 frame. The Zerg's rooted defense: a fleshy carapace
// mound (R) over a dark base (q) with a bone spike (w) crowning a whipping
// tentacle. Purple under the enemy recolor; fires on anything that nears the Hive.
export const SUNKEN_COLONY: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, R: FACTION_RED.R, q: FACTION_RED.q },
  frames: [
    [
      '.........kk.........',
      '........kwwk........',
      '........kRRk........',
      '.......kRRRRk.......',
      '......kRRqqRRk......',
      '.....kRRqqqqRRk.....',
      '....kRRRqqqqRRRk....',
      '...kRRRRqqqqRRRRk...',
      '..kRRRRRqqqqRRRRRk..',
      '..kRRRRRRqqRRRRRRk..',
      '..kwRRRRRRRRRRRRwk..',
      '.kwqRRRRRRRRRRRRqwk.',
      '.kqqRRRRRRRRRRRRqqk.',
      '.kqqqRRRRRRRRRRqqqk.',
      '..kqqqqRRRRRRqqqqk..',
      '..kqqqqqqqqqqqqqqk..',
      '...kqqqqqqqqqqqqk...',
      '....kkqqqqqqqqkk....',
      '......kkkkkkkk......',
    ],
  ],
};

// ---------------------------------------------------------------------------
// Neutral map props — wired to the minerals/gas resources, so patches draw these
// instead of the fallback diamond (see the file header).
// ---------------------------------------------------------------------------

// Mineral crystal — 14x14, 1 frame. A cluster of cyan crystal shards (C c) with
// bright facet highlights (w); the mineral the Terran economy runs on.
export const MINERAL_CRYSTAL: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, ...CRYSTAL },
  frames: [
    [
      '..............',
      '......kk......',
      '.....kCwk.....',
      '....kCCCwk....',
      '...kCCCCCwk...',
      '..kCCCCcCwk...',
      '..kCCCcCCwk...',
      '..kCCcCCCwk...',
      '..kCcCCCCwk...',
      '...kcCCCwk....',
      '...kcCCwk.....',
      '....kccwk.....',
      '.....kck......',
      '..............',
    ],
  ],
};

// Vespene geyser — 16x11, 1 frame. A cracked rock vent (m n) exhaling green gas
// (A a); build a Refinery over one to tap it.
export const GAS_GEYSER: SpriteDef = {
  palette: { ...OUTLINE, ...GAS, m: METAL.m, n: METAL.n },
  frames: [
    [
      '......AA........',
      '.....AaaA.......',
      '....AaAAaA......',
      '...kmmmmmmk.....',
      '..kmnAAAAnmk....',
      '.kmnAaaaaAnmk...',
      '.kmnAaaaaAnmk...',
      '.kmnnAAAAnnmk...',
      '.kmmnnnnnnmmk...',
      '..kmmmmmmmmk....',
      '...kkkkkkkk.....',
    ],
  ],
};

/** Every sprite in this sheet, for the validate-all test and config wiring. */
export const STARCRAFT_SPRITES: Record<string, SpriteDef> = {
  SCV,
  MARINE,
  FIREBAT,
  MEDIC,
  SIEGE_TANK,
  ZERGLING,
  HYDRALISK,
  COMMAND_CENTER,
  DEPOT,
  BARRACKS,
  FACTORY,
  REFINERY,
  MISSILE_TURRET,
  SUNKEN_COLONY,
  MINERAL_CRYSTAL,
  GAS_GEYSER,
};
