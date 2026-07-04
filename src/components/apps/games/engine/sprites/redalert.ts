// Command & Conquer: Red Alert sprite sheet — the Allied/Soviet cast the RTS
// engine draws for the ore-war skirmish. Vehicles and infantry are authored with
// the faction chars (R r q) so the engine recolors them per team (Allies blue,
// Soviets red); steel (M m n), skin (S s t), ore (y Y z) and Tesla arcs (i, w)
// stay fixed. Buildings read as chunky top-down structures with team-tinted
// roofs and banners.
//
// Style follows common.ts / rts-common.ts: mnemonic palette chars, one comment
// per sprite naming its size, and a validate-all test (redalert.test.ts).
//
// Note: the ore cluster below is authored for the sheet, but the engine renders
// resource patches as flat diamonds, so it is not wired into the live map — it
// documents the ore field's intended look. Everything else is wired into
// CNC_CONFIG in CommandConquer.tsx.

import type { SpriteDef } from './sprite';
import { OUTLINE, WHITE, SKIN, METAL, FACTION_RED } from './palettes';

// Custom tones no shared fragment covers.
const ORE = { y: '#e0c840', Y: '#f4e07a', z: '#a8901f' } as const; // ore mid / light / dark
const ELEC = { i: '#8fdcff' } as const; // Tesla arc / window glow

// ---------------------------------------------------------------------------
// Units — authored with faction chars (R r q); the engine recolors per team.
// ---------------------------------------------------------------------------

// Ore Truck — 16x12. A chunky six-wheeled harvester: team-tinted hull (R r) with
// a steel cab (M n) and a heaped ore load (y Y) on the hopper. Big and slow; the
// engine's cargo chip shows it hauling home.
export const ORE_TRUCK: SpriteDef = {
  palette: { ...OUTLINE, ...METAL, ...FACTION_RED, ...ORE },
  frames: [
    [
      '................',
      '....yyyyyy......',
      '...yYYyyYYy.....',
      '..kRRRRRRRRkk...',
      '.kRRRRRRRRRMMk..',
      '.kRrrrrrrRRMnk..',
      '.kRRRRRRRRRMMk..',
      '.kRRRRRRRRRRRk..',
      '.kkMMkkkkMMkkk..',
      '..kk..kk..kk....',
      '..kk..kk..kk....',
      '................',
    ],
  ],
};

// Rifle Infantry — 12x14, 2 frames (idle / step). Cheap conscript: skin face
// (S s), team fatigues (R r) and a slung rifle (M) held to the side. Frame 1
// shifts the stride.
export const RIFLE_INFANTRY: SpriteDef = {
  palette: { ...OUTLINE, ...SKIN, ...FACTION_RED, ...METAL },
  frames: [
    [
      '....kkkk....',
      '...kSSSSk...',
      '...kSssSk...',
      '....kkkk....',
      '...kRRRRk.M.',
      '..kRRRRRRkM.',
      '..kRRrrRRkM.',
      '..kRRrrRRMk.',
      '..kRRRRRRk..',
      '...kRRRRk...',
      '...kn..nk...',
      '...kn..nk...',
      '...kk..kk...',
      '............',
    ],
    [
      '....kkkk....',
      '...kSSSSk...',
      '...kSssSk...',
      '....kkkk....',
      '...kRRRRk.M.',
      '..kRRRRRRkM.',
      '..kRRrrRRkM.',
      '..kRRrrRRMk.',
      '..kRRRRRRk..',
      '...kRRRRk...',
      '..kn...nk...',
      '..kn...nk...',
      '..kk...kk...',
      '............',
    ],
  ],
};

// Rocket Soldier — 12x15, 2 frames. Anti-armor trooper: helmeted (M) with a
// bazooka braced across the shoulders (M m) and a warhead tip (y). Frame 1
// recoils the tube as the legs step.
export const ROCKET_SOLDIER: SpriteDef = {
  palette: { ...OUTLINE, ...SKIN, ...FACTION_RED, ...METAL, ...ORE },
  frames: [
    [
      '....kkkk....',
      '...kSSSSk...',
      '...kSssSk...',
      '....kkkk....',
      '...kRRRRk...',
      '..kRRRRRRk..',
      '.MMMMMMMMy..',
      '.mmmmmmmMy..',
      '..kRRrrRk...',
      '..kRRRRRk...',
      '...kRRRk....',
      '...kn.nk....',
      '...kn.nk....',
      '...kk.kk....',
      '............',
    ],
    [
      '....kkkk....',
      '...kSSSSk...',
      '...kSssSk...',
      '....kkkk....',
      '...kRRRRk...',
      '..kRRRRRRk..',
      'MMMMMMMMy...',
      'mmmmmmmMy...',
      '..kRRrrRk...',
      '..kRRRRRk...',
      '...kRRRk....',
      '..kn...nk...',
      '..kn...nk...',
      '..kk...kk...',
      '............',
    ],
  ],
};

// Medium Tank — 16x13. The Allied mainstay: a team-tinted hull (R r) with a
// steel turret (M m) and a barrel jutting right, riding on dark treads (n k).
export const MEDIUM_TANK: SpriteDef = {
  palette: { ...OUTLINE, ...FACTION_RED, ...METAL },
  frames: [
    [
      '................',
      '.kkkkkkkkkkkk...',
      '.kRRRRRRRRRRk...',
      '.kRRRRRRRRRRk...',
      '.kRRRMMMMRRRkMMk',
      '.kRRRMmmMRRRk...',
      '.kRRRMMMMRRRk...',
      '.kRRRRRRRRRRk...',
      '.kRRRRRRRRRRk...',
      '.kkkkkkkkkkkk...',
      '.nknknknknkn....',
      '.nknknknknkn....',
      '................',
    ],
  ],
};

// Tanya — 12x15, 2 frames. The Allied hero commando: blonde hair (y), skin face
// (S s), team combat gear (R r) and dual pistols (M) at the ready. Frame 1 steps
// while holding aim. Deadly but fragile.
export const TANYA: SpriteDef = {
  palette: { ...OUTLINE, ...SKIN, ...FACTION_RED, ...METAL, ...ORE },
  frames: [
    [
      '...yyyy.....',
      '..ySSSSy....',
      '..ySssSy....',
      '...kSSk.....',
      '...kRRk.....',
      '.nkRRRRkn...',
      '.MkRRRRkM...',
      '..kRRRRk....',
      '..kRrrRk....',
      '..kRRRRk....',
      '...kRRk.....',
      '...kS.Sk....',
      '...kn.nk....',
      '...kk.kk....',
      '............',
    ],
    [
      '...yyyy.....',
      '..ySSSSy....',
      '..ySssSy....',
      '...kSSk.....',
      '...kRRk.....',
      '.nkRRRRkn...',
      '.MkRRRRkM...',
      '..kRRRRk....',
      '..kRrrRk....',
      '..kRRRRk....',
      '...kRRk.....',
      '..kS...Sk...',
      '..kn...nk...',
      '..kk...kk...',
      '............',
    ],
  ],
};

// Heavy Tank — 18x15. The Soviet workhorse, bigger than the Allied Medium Tank:
// a broad team hull (R r) with twin barrels (M m) and heavier treads (n). Only
// the Soviets field it from the start; the engine recolors it red for them.
export const HEAVY_TANK: SpriteDef = {
  palette: { ...OUTLINE, ...FACTION_RED, ...METAL },
  frames: [
    [
      '..................',
      '..kkkkkkkkkkkk....',
      '..kRRRRRRRRRRk....',
      '..kRRRRRRRRRRk....',
      '..kRRMMMMMRRk.MMMk',
      '..kRRMmmmMRRk.....',
      '..kRRMMMMMRRk.MMMk',
      '..kRRRRRRRRRRk....',
      '..kRRRRRRRRRRk....',
      '..kkkkkkkkkkkk....',
      '..nknknknknkn.....',
      '..nknknknknkn.....',
      '..nknknknknkn.....',
      '..................',
      '..................',
    ],
  ],
};

// ---------------------------------------------------------------------------
// Buildings — steel (M m n) shells with team-tinted roofs and banners; ELEC
// glow (i) for lit windows.
// ---------------------------------------------------------------------------

// Tesla Coil — 12x24, 2 frames. The signature Soviet defense: a tall steel mast
// (M n) on a team base (R), the head crackling with electricity. Frame 0 is
// dormant; frame 1 throws arcs (i) and a white flash (w) — the engine loops them.
export const TESLA_COIL: SpriteDef = {
  palette: { ...OUTLINE, ...WHITE, ...METAL, ...FACTION_RED, ...ELEC },
  frames: [
    [
      '....MMMM....',
      '...MMMMMM...',
      '...MkkkkM...',
      '....MMMM....',
      '.....MM.....',
      '.....MM.....',
      '.....MM.....',
      '.....MM.....',
      '....nMMn....',
      '.....MM.....',
      '.....MM.....',
      '.....MM.....',
      '.....MM.....',
      '....nMMn....',
      '.....MM.....',
      '.....MM.....',
      '.....MM.....',
      '....kMMk....',
      '...kRRRRk...',
      '..kRRRRRRk..',
      '..kRRRRRRk..',
      '..kkkkkkkk..',
      '............',
      '............',
    ],
    [
      '.i..MMMM..i.',
      'w..MMMMMM..w',
      '.i.MkkkkM.i.',
      '..iwMMMMwi..',
      '.....MM.....',
      '.....MM.....',
      '.....MM.....',
      '.....MM.....',
      '....nMMn....',
      '.....MM.....',
      '.....MM.....',
      '.....MM.....',
      '.....MM.....',
      '....nMMn....',
      '.....MM.....',
      '.....MM.....',
      '.....MM.....',
      '....kMMk....',
      '...kRRRRk...',
      '..kRRRRRRk..',
      '..kRRRRRRk..',
      '..kkkkkkkk..',
      '............',
      '............',
    ],
  ],
};

// Pillbox — 16x12. The Allied forward defense: a squat concrete dome (M) with a
// dark firing slit (k), a team band (R) and a shadowed base (n). Cheap; the
// core of a truck-protecting perimeter.
export const PILLBOX: SpriteDef = {
  palette: { ...OUTLINE, ...METAL, ...FACTION_RED },
  frames: [
    [
      '................',
      '....MMMMMMMM....',
      '..MMMMMMMMMMMM..',
      '.MMMMMMMMMMMMMM.',
      '.MMkkkkkkkkkkMM.',
      '.MMMMMMMMMMMMMM.',
      '.MMMMMRRRRMMMMMM',
      '.nMMMMMMMMMMMMn.',
      '.nnMMMMMMMMMMnn.',
      '.nnnnnnnnnnnnnn.',
      '..kkkkkkkkkkkk..',
      '................',
    ],
  ],
};

// Construction Yard — 30x22. The base for both sides: a broad team-roofed (R r)
// hall over a steel wall (M m n) with lit windows (i), a rolling vehicle door
// and a crane arm at the top. Recolored per owner.
export const CON_YARD: SpriteDef = {
  palette: { ...OUTLINE, ...FACTION_RED, ...METAL, ...ELEC },
  frames: [
    [
      '..............................',
      '........MM....................',
      '........MM....MMMMMMMMMM......',
      '........MM....M........M......',
      '........MM....M........M......',
      '..kkkkkkkkkkkkkkkkkkkk........',
      '..kRRRRRRRRRRRRRRRRRRk........',
      '..kRRRRRRRRRRRRRRRRRRk........',
      '..kRRrrRRRRrrRRRRrrRRk........',
      '..kkkkkkkkkkkkkkkkkkkk........',
      '..kMMMMMMMMMMMMMMMMMMk........',
      '..kMkkMMkkMMkkMMkkMMMk........',
      '..kMkkMMkkMMkkMMkkMMMk........',
      '..kMMMMMMMMMMMMMMMMMMk........',
      '..kMMMMMkkkkkkMMMMMMMk........',
      '..kMMMMMkiiiikMMMMMMMk........',
      '..kMMMMMkiiiikMMMMMMMk........',
      '..kMMMMMkiiiikMMMMMMMk........',
      '..nnnnnnnnnnnnnnnnnnnn........',
      '..kkkkkkkkkkkkkkkkkkkk........',
      '..............................',
      '..............................',
    ],
  ],
};

// Power Plant — 24x18. Two cooling stacks (M n) over a team-roofed (R) steel
// block with lit dials and windows (i). Placing one grants the supply that keeps
// the base powered.
export const POWER_PLANT: SpriteDef = {
  palette: { ...OUTLINE, ...FACTION_RED, ...METAL, ...ELEC },
  frames: [
    [
      '........................',
      '.....MM........MM.......',
      '....MMMM......MMMM......',
      '....MnnM......MnnM......',
      '....MMMM......MMMM......',
      '..kkkkkkkkkkkkkkkkkk....',
      '..kRRRRRRRRRRRRRRRRk....',
      '..kRRRRRRRRRRRRRRRRk....',
      '..kkkkkkkkkkkkkkkkkk....',
      '..kMMMMMMMMMMMMMMMMk....',
      '..kMMkiikMMkiikMMMMk....',
      '..kMMMMMMMMMMMMMMMMk....',
      '..kMMiMMMMiMMMMiMMMk....',
      '..kMMMMMMMMMMMMMMMMk....',
      '..nnnnnnnnnnnnnnnnnn....',
      '..kkkkkkkkkkkkkkkkkk....',
      '........................',
      '........................',
    ],
  ],
};

// Barracks — 24x16. Infantry hall: a team pennant (R r) over a steel shed (M n)
// with shuttered windows and a team-marked doorway. Trains the rifle, rocket and
// Tanya cast.
export const BARRACKS: SpriteDef = {
  palette: { ...OUTLINE, ...FACTION_RED, ...METAL },
  frames: [
    [
      '...........R............',
      '...........RR...........',
      '...........Rr...........',
      '...........k............',
      '..MMMMMMMMMMMMMMMMMMMM..',
      '.MMMMMMMMMMMMMMMMMMMMMM.',
      '.kkkkkkkkkkkkkkkkkkkkkk.',
      '.kMMMMMMMMMMMMMMMMMMMMk.',
      '.kMMkkMMMMMMMMMMMMkkMMk.',
      '.kMMkkMMMMMMMMMMMMkkMMk.',
      '.kMMMMMMMkkkkkkMMMMMMMk.',
      '.kMMMMMMMkRRRRkMMMMMMMk.',
      '.kMMMMMMMkRRRRkMMMMMMMk.',
      '.nnnnnnnnkRRRRknnnnnnnn.',
      '.kkkkkkkkkkkkkkkkkkkkkk.',
      '........................',
    ],
  ],
};

// War Factory — 28x18. The vehicle plant: a wide steel hangar (M n) with a
// roof vent, a team stripe (R) and a big lit roll-up door (i). Builds the Medium
// Tank (and, once Soviet Ordnance is captured, the Heavy Tank).
export const WAR_FACTORY: SpriteDef = {
  palette: { ...OUTLINE, ...FACTION_RED, ...METAL, ...ELEC },
  frames: [
    [
      '............................',
      '.......MMMMMM...............',
      '......MMMMMMMM..............',
      '..MMMMMMMMMMMMMMMMMMMMMMMM..',
      '..kkkkkkkkkkkkkkkkkkkkkkkk..',
      '..kRRRRRRRRRRRRRRRRRRRRRRk..',
      '..kRRRRRRRRRRRRRRRRRRRRRRk..',
      '..kkkkkkkkkkkkkkkkkkkkkkkk..',
      '..kMMMMMMMMMMMMMMMMMMMMMMk..',
      '..kMMMMMMMMMMMMMMMMMMMMMMk..',
      '..kMkkkkkkkkkkkkkkkkkkkkMk..',
      '..kMkiiiiiiiiiiiiiiiiiikMk..',
      '..kMkiiiiiiiiiiiiiiiiiikMk..',
      '..kMkiiiiiiiiiiiiiiiiiikMk..',
      '..kMkkkkkkkkkkkkkkkkkkkkMk..',
      '..nnnnnnnnnnnnnnnnnnnnnnnn..',
      '..kkkkkkkkkkkkkkkkkkkkkkkk..',
      '............................',
    ],
  ],
};

// ---------------------------------------------------------------------------
// Neutral prop — the engine draws ore patches as diamonds, so this is authored
// for the sheet but not wired into the live map (see the file header).
// ---------------------------------------------------------------------------

// Ore cluster — 14x12. A heap of raw ore crystals (y Y z) the trucks harvest;
// light glints off the upper faces (Y), shadow pools at the base (z).
export const ORE_CLUSTER: SpriteDef = {
  palette: { ...ORE },
  frames: [
    [
      '..............',
      '....yy..yy....',
      '...yYYyyYYy...',
      '..yYYyyyyYYy..',
      '.zyYyyyyyyYz..',
      '.zyyyYYyyyyz..',
      '.zzyyyyyyzz...',
      '..zyYyyyYz....',
      '..zzyyyyzz....',
      '...zzyyzz.....',
      '....zzzz......',
      '..............',
    ],
  ],
};

/** Every sprite in this sheet, for the validate-all test and config wiring. */
export const REDALERT_SPRITES: Record<string, SpriteDef> = {
  ORE_TRUCK,
  RIFLE_INFANTRY,
  ROCKET_SOLDIER,
  MEDIUM_TANK,
  TANYA,
  HEAVY_TANK,
  TESLA_COIL,
  PILLBOX,
  CON_YARD,
  POWER_PLANT,
  BARRACKS,
  WAR_FACTORY,
  ORE_CLUSTER,
};
