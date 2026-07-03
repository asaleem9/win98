// Diablo II sprite sheet — monsters, the Andariel boss, a summoned skeleton, item
// icons, class portraits and a gold pile. Authored as text like every other
// sheet; three tiny builders keep the rows a fixed width and derive the white
// hit-flash frame so combat can flash a struck foe. Every def is collected in
// DIABLO_SPRITES for the validate-all test.

import type { SpriteDef } from './sprite';
import type { Item, CharClass, PotionType } from '../diablo';

// One shared palette spread into every def. Chars are mnemonic and unique, so a
// def can use any subset; unused entries are harmless. '.' is transparency.
const PAL: Record<string, string> = {
  k: '#161310', // outline
  W: '#ffffff', // hit-flash white
  w: '#efe9db', // bone/steel highlight
  r: '#b83a3a', R: '#e06a6a', q: '#7a1f1f', // red: mid / light / dark
  s: '#d9a066', S: '#f0c49a', t: '#9c6b43', // skin: mid / light / shadow
  g: '#6f8f4a', G: '#93b060', f: '#3f5a2a', // rot-green: mid / light / dark
  b: '#e6e0c6', c: '#b0a684', n: '#7d745a', // bone: light / mid / dark
  u: '#9c6b3f', U: '#7a5230', z: '#4a3018', // brown: light / mid / dark
  M: '#c6ccd4', m: '#8a8f99', N: '#565a63', // steel: light / mid / dark
  V: '#5b9bd5', v: '#3a6ea5', C: '#26406e', // blue: light / mid / deep
  y: '#ffcf3f', Y: '#fff2c0', o: '#d88a2a', L: '#a8801f', // gold + orange
  p: '#8a3ab8', P: '#b46ae0', // purple: mid / light
  H: '#d98aa0', h: '#a85a70', // andariel flesh: light / mid
  x: '#7dff6a', X: '#6ad0ff', // eye-glow: undead-green / friendly-blue
};

const padRow = (w: number, r: string) => (r + '.'.repeat(w)).slice(0, w);
const padFrame = (w: number, rows: string[]) => rows.map((r) => padRow(w, r));
const flashOf = (rows: string[]) => rows.map((r) => r.replace(/[^.]/g, 'W'));

/** A creature: an idle frame, a 1px bob for life, and a white hit-flash. */
function unit(w: number, idle: string[]): SpriteDef {
  const p = padFrame(w, idle);
  const empty = '.'.repeat(w);
  return { palette: PAL, frames: [p, [empty, ...p.slice(0, -1)], flashOf(p)] };
}

/** Explicit animation frames plus a derived flash (used for the boss aura). */
function anim(w: number, frames: string[][]): SpriteDef {
  const ps = frames.map((f) => padFrame(w, f));
  return { palette: PAL, frames: [...ps, flashOf(ps[0])] };
}

/** A single static frame (item icons, portraits, gold). */
function still(w: number, rows: string[]): SpriteDef {
  return { palette: PAL, frames: [padFrame(w, rows)] };
}

// ---------------------------------------------------------------------------
// Monsters — 24x24, matching the names in ENEMY_TYPES
// ---------------------------------------------------------------------------

export const MON_FALLEN = unit(24, [
  '',
  '',
  '.......k...k....',
  '......krk.krk...',
  '......krrkrrk...',
  '.....krRRRRRk..M',
  '.....kRyRyRRk.kM',
  '.....kRRRRRRk.kMk',
  '.....kkRnRkk.kMk',
  '......krrrk..kUk',
  '.....krRRRrk.kUk',
  '....krRRRRRrkkUk',
  '....kRRRRRRRk.U.',
  '....kRrRRRrRk.U.',
  '....kkRRRRkk.U..',
  '.....krk.krk.U..',
  '.....krk.krk.U..',
  '....kkk...kkk...',
  '',
  '',
  '',
  '',
  '',
  '',
]);

export const MON_ZOMBIE = unit(24, [
  '',
  '.........kkkkk',
  '........kGGGGGk',
  '.......kGGgggGGk',
  '.......kGgsggsGk',
  '.......kGggnggGk',
  '.......kkGgggGkk',
  '........kkGGGkk',
  '......kkkGGGGGkkk',
  '....kkGGGgggggGGGkk',
  '...kGGkGggfffgGkGGGk',
  '...kGGkGgfgggfgGkGGk',
  '...kGGkGggfffgGkGGk',
  '...kkGkkGgggggGkkGk',
  '.....k..kGgffgGk..k',
  '........kGgggggGk',
  '........kGgfgfgGk',
  '........kGgg.gggk',
  '........kGGk.kGGk',
  '........kGk...kGk',
  '........kGk...kGk',
  '.......kUUk..kUUk',
  '.......kkkk..kkkk',
  '',
]);

export const MON_SKELETON = unit(24, [
  '',
  '........kkkkk',
  '.......kbbbbbk',
  '......kbbbbbbbk',
  '......kbxbbxbbk',
  '......kbbbbbbbk',
  '......kbnbnbnbk',
  '.......kbnbnbk',
  '........kkbkk',
  '......kkbbbbbkk',
  '....kbbkbbbbbkbbk',
  '...kbk.kbnbnbk.kbk',
  '...kbk.kbbbbbk.kbk',
  '...kbk.kbnbnbk.kbk',
  '...kbk..kbbbk..kbk',
  '...kkk...kbk...kkk',
  '.........kbk',
  '........kbbbbk',
  '........kbk.kbk',
  '........kbk.kbk',
  '.......kbk...kbk',
  '.......kbk...kbk',
  '......kkk...kkk',
  '',
]);

export const MON_QUILL_RAT = unit(24, [
  '',
  '',
  '.........k.k.k.k',
  '........kUkUkUkU',
  '.......kUkUkUkUk',
  '......kuuUuUuUuk',
  '.....kuuuuuuuuuk',
  '....kuUuuuuuuuUuk',
  '...kuuuuuuuuuuuuk',
  '..kuuuuuuuuuuuuuk',
  '.kuuuuuuuuuuuuuUk',
  '.kuuRkuuuuuuuuuuk',
  '.kuRRuuuuuuuuuuUk',
  '.kkuuuuuuuuuuuUuk',
  '..kkuUuuuuuuuUukk',
  '...kUk.kUk.kUk.k',
  '...kkk.kkk.kkk',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
]);

export const MON_CORRUPT_ROGUE = unit(24, [
  '',
  '.........kkkk',
  '........kzzzzk',
  '.......kzsSSszk',
  '.......kzSSSSzk',
  '.......kzSkSkzk',
  '.......kzSSSSzk',
  '........kkSSkk',
  '....U..kzzzzzk',
  '...Uw.kzUzzUzk',
  '..U.w.kzzzzzzk',
  '..U.w.kzUzzUzk',
  '..U.w.kzzzzzzk',
  '..U.w..kzzzzk',
  '...Uw..kzk.kzk',
  '...Uw..kzk.kzk',
  '..U.w..kUk.kUk',
  '.U..w..kUk.kUk',
  '.U.....kkk.kkk',
  '..U',
  '...U',
  '',
  '',
  '',
]);

// ---------------------------------------------------------------------------
// Andariel — 32x32 boss with a pulsing aura
// ---------------------------------------------------------------------------

const ANDARIEL_A = [
  '',
  '..............kkkk',
  '............kkHHHHkk',
  '.........o.kHHHHHHHHk.o',
  '...........kHHyHHyHHk',
  '...........kHHHHHHHHk',
  '...........kHhHHHHhHk',
  '............kHHnnHHk',
  '.......o.kkkkHHHHHHkkkk.o',
  '.......kqHHHHHHHHHHHHHHqk',
  '......kqHHHHHHhhhhHHHHHHqk',
  '......kqHHHHhHHHHhHHHHHHqk',
  '......kqHHHHHHHHHHHHHHHHqk',
  '.......kqHHHHHHHHHHHHHHqk',
  '........kqNNNNNNNNNNNNqk',
  '.......kNNNNNNNNNNNNNNNNk',
  '......kNNNqNNNNNNNNqNNNNk',
  '.....kNNNNNNNNNNNNNNNNNNk',
  '....kNNNNNNNNNNNNNNNNNNNNk',
  '...kNNNNNqNNNNNNNNqNNNNNNk',
  '...kNNNNNNNNNNNNNNNNNNNNk',
  '..kkNNNNNNNNNNNNNNNNNNkk',
  '.k.kkNNNNNNNNNNNNNNkk.k',
  'k.k..kkNNNNNNNNkk..k.k',
  '.k.k...kkkkkkkk...k.k.k',
  '..k.k...........k.k..k',
  '...k.k.........k.k....k',
  '....k.k.......k.k',
  '.....k.........k',
  '',
  '',
  '',
];

const ANDARIEL_B = [
  '..o........................o',
  '..............kkkk',
  '............kkHHHHkk',
  '...........kHHHHHHHHk',
  '.....o.....kHHyHHyHHk.....o',
  '...........kHHHHHHHHk',
  '...........kHhHHHHhHk',
  '............kHHnnHHk',
  '.........kkkkHHHHHHkkkk',
  '.....o.kqHHHHHHHHHHHHHHqk.o',
  '......kqHHHHHHhhhhHHHHHHqk',
  '......kqHHHHhHHHHhHHHHHHqk',
  '......kqHHHHHHHHHHHHHHHHqk',
  '.......kqHHHHHHHHHHHHHHqk',
  '....o...kqNNNNNNNNNNNNqk...o',
  '.......kNNNNNNNNNNNNNNNNk',
  '......kNNNqNNNNNNNNqNNNNk',
  '.....kNNNNNNNNNNNNNNNNNNk',
  '....kNNNNNNNNNNNNNNNNNNNNk',
  '...kNNNNNqNNNNNNNNqNNNNNNk',
  '..o.kNNNNNNNNNNNNNNNNNNNNk.o',
  '..kkNNNNNNNNNNNNNNNNNNkk',
  '.k.kkNNNNNNNNNNNNNNkk.k',
  'k.k..kkNNNNNNNNkk..k.k',
  '.k.k...kkkkkkkk...k.k.k',
  '..k.k...........k.k..k',
  '...k.k.........k.k....k',
  '....k.k.......k.k',
  '.....k.........k',
  '..o........................o',
  '',
  '',
];

export const MON_ANDARIEL = anim(32, [ANDARIEL_A, ANDARIEL_B]);

// ---------------------------------------------------------------------------
// Summoned skeleton ally — 24x24, blue eyes + shield to read as friendly
// ---------------------------------------------------------------------------

export const ALLY_SKELETON = unit(24, [
  '',
  '........kkkkk',
  '.......kbbbbbk',
  '......kbbbbbbbk',
  '......kbXbbXbbk',
  '......kbbbbbbbk',
  '......kbnbnbnbk',
  '.......kbnbnbk',
  '........kkbkk',
  '.....kkbbbbbkk',
  '.MMkbbkbbbbbkbbk',
  'MMMkbk.kbnbk.kbk',
  'MrMkbk.kbbbk.kbk',
  'MMMkbk.kbnbk.kbk',
  '.MMkbk..kbk..kbk',
  '..kkk...kbk..kkk',
  '.........kbk',
  '........kbbbbk',
  '........kbk.kbk',
  '........kbk.kbk',
  '.......kbk...kbk',
  '.......kbk...kbk',
  '......kkk...kkk',
  '',
]);

// ---------------------------------------------------------------------------
// Item icons — 12x12
// ---------------------------------------------------------------------------

export const ICON_SWORD = still(12, [
  '.....k',
  '....kMk',
  '....kMk',
  '....kMwk',
  '....kMwk',
  '....kMwk',
  '...yyMyyk',
  '....zUz',
  '....zUz',
  '....yoy',
  '.....k',
  '',
]);

export const ICON_AXE = still(12, [
  '.......kk',
  '......kMMk',
  '.....kMMMMk',
  '....kMMMMMk',
  '....kMMMwk',
  '....zkMk',
  '....zU',
  '...zU',
  '...U',
  '..zU',
  '..U',
  '',
]);

export const ICON_MACE = still(12, [
  '....kMMk',
  '...kMMMMk',
  '..kMMwMMMk',
  '..kMMMMMMk',
  '..kMMMMMMk',
  '...kMMMMk',
  '....kUk',
  '....kUk',
  '....kUk',
  '....kUk',
  '....kUk',
  '',
]);

export const ICON_BOW = still(12, [
  '....U',
  '...U.w',
  '..U..w',
  '.U...w',
  '.U...w',
  '.U...w',
  '.U...w',
  '.U...w',
  '.U...w',
  '..U..w',
  '...U.w',
  '....U',
]);

export const ICON_STAFF = still(12, [
  '.....VP',
  '....VPPV',
  '....VPPV',
  '.....VP',
  '.....U',
  '.....U',
  '.....U',
  '.....U',
  '.....U',
  '.....U',
  '.....U',
  '.....U',
]);

export const ICON_HELM = still(12, [
  '...kMMMMk',
  '..kMMMMMMk',
  '.kMMMMMMMMk',
  '.kMmMMMMmMk',
  '.kMm.MM.mMk',
  '.kMMMMMMMMk',
  '.kMMMMMMMMk',
  '..kMNNNNMk',
  '...kkkkkk',
  '',
  '',
  '',
]);

export const ICON_ARMOR = still(12, [
  '..kmmmmmmk',
  '.kMMMMMMMMk',
  'kMMMmmmmMMMk',
  'kMMm....mMMk',
  'kMMMmmmmMMMk',
  'kMMMMMMMMMMk',
  'kMMMMNNMMMMk',
  '.kMMMNNMMMk',
  '.kMMMMMMMMk',
  '..kMMMMMMk',
  '...kkkkkk',
  '',
]);

export const ICON_SHIELD = still(12, [
  '..kMMMMMMk',
  '.kMMwMMMMMk',
  'kMMMwMMMMMMk',
  'kMMMwMrrMMMk',
  'kMMMwMrrMMMk',
  'kMMMMMMMMMMk',
  '.kMMMMMMMMk',
  '..kMMMMMMk',
  '...kMMMMk',
  '....kMMk',
  '.....kk',
  '',
]);

export const ICON_RING = still(12, [
  '',
  '....yyyy',
  '...y.PP.y',
  '..y.PWWP.y',
  '..y.PPPP.y',
  '..y......y',
  '..y......y',
  '...y....y',
  '....yyyy',
  '',
  '',
  '',
]);

export const ICON_AMULET = still(12, [
  '...y....y',
  '..y......y',
  '.y........y',
  '..y......y',
  '...y.yy.y',
  '....yPPy',
  '...yPWWPy',
  '...yPPPPy',
  '....yPPy',
  '.....yy',
  '',
  '',
]);

export const ICON_BOOTS = still(12, [
  '',
  '.zz...zz',
  '.zUz..zUz',
  '.zUz..zUz',
  '.zUz..zUz',
  '.zUz..zUz',
  '.zUzz.zUzz',
  '.zUUUzzUUUz',
  '.zUUUzzUUUz',
  '.kkkkkkkkkk',
  '',
  '',
]);

export const ICON_POTION_RED = still(12, [
  '....kkk',
  '....kwk',
  '....kwk',
  '...kMMMk',
  '..kMrrrMk',
  '.kMrRRRrMk',
  '.kMrRRRrMk',
  '.kMrrrrrMk',
  '.kMqrrrqMk',
  '..kMqqqMk',
  '...kkkkk',
  '',
]);

export const ICON_POTION_BLUE = still(12, [
  '....kkk',
  '....kwk',
  '....kwk',
  '...kMMMk',
  '..kMvvvMk',
  '.kMvVVVvMk',
  '.kMvVVVvMk',
  '.kMvvvvvMk',
  '.kMCvvvCMk',
  '..kMCCCMk',
  '...kkkkk',
  '',
]);

// ---------------------------------------------------------------------------
// Class portraits — 16x16 head shots
// ---------------------------------------------------------------------------

export const PORTRAIT_AMAZON = still(16, [
  '',
  '.....ttttt',
  '....tsssssst',
  '...tsSSSSSsst',
  '...VVVVVVVVVt',
  '...tSSSSSSSSt',
  '...tSSkSSkSSt',
  '...tSSSSSSSSt',
  '...tSSStttSSt',
  '...tSSSSSSSSt',
  '....tSSSSSSt',
  '....ttttttt',
  '.....uu.uu',
  '...uuu...uuu',
  '..u.........u',
  '',
]);

export const PORTRAIT_NECROMANCER = still(16, [
  '',
  '....pppppp',
  '...pPPPPPPp',
  '..pPPkkkkPPp',
  '..pPkwwwwkPp',
  '..pkwSSSSwkp',
  '..pkwSkSkSwp',
  '..pkwSSSSSwp',
  '..pkwSttSSwp',
  '..pPkwSSSwkPp',
  '...pPkwwwkPp',
  '....pPkkkPp',
  '.....pPPPp',
  '......ppp',
  '',
  '',
]);

export const PORTRAIT_BARBARIAN = still(16, [
  '',
  '....kkkkkkk',
  '...kzzzzzzzk',
  '..kzzssssszk',
  '..kzsSSSSSsk',
  '..kzSSSSSSSk',
  '..krSSkSSkSrk',
  '..kzSSSSSSSk',
  '..kzSStttSSk',
  '..kzSSqqqSSk',
  '..kzsSqqqSsk',
  '...kzzqqqzk',
  '....kzzzzk',
  '.....kkkk',
  '',
  '',
]);

export const PORTRAIT_SORCERESS = still(16, [
  '',
  '.....oooo',
  '....oRRRRo',
  '...oRRoooRRo',
  '..oRRoSSSoRRo',
  '..oRoSSSSSoRo',
  '..oRoSkSkSoRo',
  '..oRoSSSSSoRo',
  '..oRoSStSSoRo',
  '..oRRoSSSoRRo',
  '...oRRoooRRo',
  '....oRRRRo',
  '.....VVVV',
  '....VvvvvV',
  '',
  '',
]);

export const PORTRAIT_PALADIN = still(16, [
  '',
  '....MMMMMM',
  '...MMMMMMMM',
  '..MMMwwwwMMM',
  '..MMwSSSSwMM',
  '..MMwSkSkSwM',
  '..My.SSSS.yM',
  '..MMwSSSSSwM',
  '..MMwStttSwM',
  '...MwSSSSSwM',
  '...MMwSSSwMM',
  '....MMwwwMM',
  '.....MMMM',
  '......yy',
  '.....yyyy',
  '',
]);

// ---------------------------------------------------------------------------
// Gold pile — 16x16
// ---------------------------------------------------------------------------

export const GOLD_PILE = still(16, [
  '',
  '',
  '',
  '.......yy',
  '......yYyy',
  '.....yYyyoy',
  '....yyyoyyoy',
  '...yYyyoyyyoy',
  '..yyoyyyoyyyoy',
  '.yYyyoyyyoyyyyy',
  '.yyoyyyoyyyoyyLy',
  '.LyyyoyyyoyyyLoy',
  '.oLyyyyyyyyLLooy',
  '..oLLLLLLLLLoo',
  '',
  '',
]);

// ---------------------------------------------------------------------------
// Collections + lookups
// ---------------------------------------------------------------------------

/** Every def in this sheet, for the validate-all test. */
export const DIABLO_SPRITES: Record<string, SpriteDef> = {
  MON_FALLEN,
  MON_ZOMBIE,
  MON_SKELETON,
  MON_QUILL_RAT,
  MON_CORRUPT_ROGUE,
  MON_ANDARIEL,
  ALLY_SKELETON,
  ICON_SWORD,
  ICON_AXE,
  ICON_MACE,
  ICON_BOW,
  ICON_STAFF,
  ICON_HELM,
  ICON_ARMOR,
  ICON_SHIELD,
  ICON_RING,
  ICON_AMULET,
  ICON_BOOTS,
  ICON_POTION_RED,
  ICON_POTION_BLUE,
  PORTRAIT_AMAZON,
  PORTRAIT_NECROMANCER,
  PORTRAIT_BARBARIAN,
  PORTRAIT_SORCERESS,
  PORTRAIT_PALADIN,
  GOLD_PILE,
};

/** Enemy display name -> sprite (matches ENEMY_TYPES + the boss). */
export const MONSTER_SPRITES: Record<string, SpriteDef> = {
  Fallen: MON_FALLEN,
  Zombie: MON_ZOMBIE,
  Skeleton: MON_SKELETON,
  'Quill Rat': MON_QUILL_RAT,
  'Corrupt Rogue': MON_CORRUPT_ROGUE,
  Andariel: MON_ANDARIEL,
};

export const CLASS_PORTRAITS: Record<CharClass, SpriteDef> = {
  Amazon: PORTRAIT_AMAZON,
  Necromancer: PORTRAIT_NECROMANCER,
  Barbarian: PORTRAIT_BARBARIAN,
  Sorceress: PORTRAIT_SORCERESS,
  Paladin: PORTRAIT_PALADIN,
};

export const POTION_ICONS: Record<PotionType, SpriteDef> = {
  health: ICON_POTION_RED,
  mana: ICON_POTION_BLUE,
};

/** Best-fit icon for an inventory/loot item, by slot and (for weapons) base name. */
export function iconForItem(item: Pick<Item, 'slot' | 'base'>): SpriteDef {
  if (item.slot === 'weapon') {
    const b = item.base.toLowerCase();
    if (b.includes('axe')) return ICON_AXE;
    if (b.includes('hammer') || b.includes('mace')) return ICON_MACE;
    return ICON_SWORD;
  }
  if (item.slot === 'armor') return ICON_ARMOR;
  if (item.slot === 'helm') return ICON_HELM;
  if (item.slot === 'ring') return ICON_RING;
  if (item.slot === 'amulet') return ICON_AMULET;
  return ICON_SWORD;
}

/** Sprite for an enemy by name, falling back to the Fallen imp. */
export function spriteForEnemy(name: string, isBoss: boolean): SpriteDef {
  if (isBoss) return MON_ANDARIEL;
  return MONSTER_SPRITES[name] ?? MON_FALLEN;
}
