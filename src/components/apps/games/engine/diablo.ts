// Pure combat / loot / progression logic for the Diablo II loot-clicker.
// Deliberately free of React so it can be unit-tested and so the UI shell in
// Diablo2.tsx can stay a thin presenter. All randomness flows through a `Rand`
// (see ./rng) so tests can seed it and get repeatable rolls.

import { Rand, randInt, pick, weightedPick, clamp, chance } from './rng';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CharClass = 'Amazon' | 'Necromancer' | 'Barbarian' | 'Sorceress' | 'Paladin';
export type Rarity = 'normal' | 'magic' | 'rare' | 'unique';
export type ItemSlot = 'weapon' | 'armor' | 'helm' | 'ring' | 'amulet';
export type StatKey = 'strength' | 'dexterity' | 'vitality' | 'energy';
export type AffixStat =
  | 'strength'
  | 'dexterity'
  | 'vitality'
  | 'energy'
  | 'life'
  | 'mana'
  | 'damage'
  | 'defense'
  | 'attackRating';

export interface Stats {
  strength: number;
  dexterity: number;
  vitality: number;
  energy: number;
}

export interface Affix {
  key: AffixStat;
  stat: AffixStat;
  label: string;
  value: number;
}

export interface Item {
  id: string;
  name: string;
  base: string;
  slot: ItemSlot;
  rarity: Rarity;
  ilvl: number;
  baseDamage: number; // weapon top-end damage (0 for non-weapons)
  baseDefense: number; // armor/helm defense (0 otherwise)
  affixes: Affix[];
  value: number; // gold sell value
}

export interface Character {
  cls: CharClass;
  level: number;
  xp: number;
  stats: Stats;
  statPoints: number;
  gold: number;
  hp: number;
  mana: number;
  potions: number;
  /** Four quick-slots of typed potions; superseded the raw `potions` count in the UI. */
  belt: BeltSlot[];
  inventory: Item[];
  equipment: Partial<Record<ItemSlot, Item>>;
  bestDungeonLevel: number;
}

export type PotionType = 'health' | 'mana';
/** A belt slot holds one potion or nothing. */
export type BeltSlot = PotionType | null;

export interface Combatant {
  minDamage: number;
  maxDamage: number;
  attackRating: number;
  defense: number;
}

export interface Enemy extends Combatant {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  xp: number;
  goldMin: number;
  goldMax: number;
  isBoss: boolean;
  /** Turns of Frost Nova slow remaining; a slowed foe skips its counter-attack. */
  slowTurns?: number;
}

export interface AttackResult {
  hit: boolean;
  damage: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BOSS_LEVEL = 5;
export const STAT_POINTS_PER_LEVEL = 5;
export const RARITY_ORDER: Rarity[] = ['normal', 'magic', 'rare', 'unique'];

export const RARITY_COLORS: Record<Rarity, string> = {
  normal: '#ffffff',
  magic: '#6969ff',
  rare: '#ffff64',
  unique: '#a89060',
};

interface ClassData {
  stats: Stats;
  baseLife: number;
  baseMana: number;
  desc: string;
}

export const CLASS_DATA: Record<CharClass, ClassData> = {
  Amazon: { stats: { strength: 20, dexterity: 25, vitality: 20, energy: 15 }, baseLife: 50, baseMana: 15, desc: 'Skilled fighter who uses bow and javelin' },
  Necromancer: { stats: { strength: 15, dexterity: 25, vitality: 15, energy: 25 }, baseLife: 45, baseMana: 25, desc: 'Summoner of the undead' },
  Barbarian: { stats: { strength: 30, dexterity: 20, vitality: 25, energy: 10 }, baseLife: 55, baseMana: 10, desc: 'Powerful melee warrior' },
  Sorceress: { stats: { strength: 10, dexterity: 25, vitality: 10, energy: 35 }, baseLife: 40, baseMana: 35, desc: 'Master of elemental magic' },
  Paladin: { stats: { strength: 25, dexterity: 20, vitality: 25, energy: 15 }, baseLife: 55, baseMana: 15, desc: 'Holy warrior of faith' },
};

// ---------------------------------------------------------------------------
// Character creation & derived combat stats
// ---------------------------------------------------------------------------

export function createCharacter(cls: CharClass): Character {
  const data = CLASS_DATA[cls];
  const base: Character = {
    cls,
    level: 1,
    xp: 0,
    stats: { ...data.stats },
    statPoints: 0,
    gold: 0,
    hp: 0,
    mana: 0,
    potions: 3,
    belt: ['health', 'health', 'mana', null],
    inventory: [],
    equipment: {},
    bestDungeonLevel: 1,
  };
  const c = playerCombat(base);
  base.hp = c.maxLife;
  base.mana = c.maxMana;
  return base;
}

export interface EquipBonuses {
  strength: number;
  dexterity: number;
  vitality: number;
  energy: number;
  life: number;
  mana: number;
  damage: number;
  defense: number;
  attackRating: number;
  baseDamage: number;
  baseDefense: number;
}

/** Sum every affix and base value across the currently equipped items. */
export function equippedBonuses(equipment: Partial<Record<ItemSlot, Item>>): EquipBonuses {
  const b: EquipBonuses = {
    strength: 0, dexterity: 0, vitality: 0, energy: 0,
    life: 0, mana: 0, damage: 0, defense: 0, attackRating: 0,
    baseDamage: 0, baseDefense: 0,
  };
  for (const slot of Object.keys(equipment) as ItemSlot[]) {
    const item = equipment[slot];
    if (!item) continue;
    b.baseDamage += item.baseDamage;
    b.baseDefense += item.baseDefense;
    for (const a of item.affixes) {
      b[a.stat] += a.value;
    }
  }
  return b;
}

export interface PlayerCombat extends Combatant {
  maxLife: number;
  maxMana: number;
  totalStats: Stats;
}

/** Fold base stats + equipment into the numbers combat actually uses. */
export function playerCombat(char: Character): PlayerCombat {
  const b = equippedBonuses(char.equipment);
  const data = CLASS_DATA[char.cls];

  const totalStats: Stats = {
    strength: char.stats.strength + b.strength,
    dexterity: char.stats.dexterity + b.dexterity,
    vitality: char.stats.vitality + b.vitality,
    energy: char.stats.energy + b.energy,
  };

  const weaponTop = 2 + b.baseDamage; // bare-hands top-end is 2
  const strMul = 1 + totalStats.strength / 200;
  const maxDamage = Math.max(1, Math.round((weaponTop + b.damage) * strMul));
  const minDamage = Math.max(1, Math.round(maxDamage * 0.5));

  const defense = 2 + b.baseDefense + b.defense + Math.floor(totalStats.dexterity / 4);
  const attackRating = 20 + char.level * 10 + totalStats.dexterity * 3 + b.attackRating;
  const maxLife = data.baseLife + totalStats.vitality * 4 + char.level * 2 + b.life;
  const maxMana = data.baseMana + totalStats.energy * 3 + b.mana;

  return { minDamage, maxDamage, attackRating, defense, maxLife, maxMana, totalStats };
}

// ---------------------------------------------------------------------------
// Attack resolution
// ---------------------------------------------------------------------------

/** Probability the attacker lands a blow, clamped so nothing is a sure thing. */
export function hitChance(attackRating: number, defense: number): number {
  const ar = Math.max(1, attackRating);
  const df = Math.max(0, defense);
  return clamp(ar / (ar + df), 0.05, 0.95);
}

export function resolveAttack(attacker: Combatant, defender: Combatant, rand: Rand): AttackResult {
  const p = hitChance(attacker.attackRating, defender.defense);
  if (rand() >= p) return { hit: false, damage: 0 };
  const damage = Math.max(1, randInt(rand, attacker.minDamage, attacker.maxDamage));
  return { hit: true, damage };
}

// ---------------------------------------------------------------------------
// Enemy generation
// ---------------------------------------------------------------------------

interface EnemyType {
  name: string;
  hpMul: number;
  dmgMul: number;
  xpMul: number;
}

export const ENEMY_TYPES: EnemyType[] = [
  { name: 'Fallen', hpMul: 0.8, dmgMul: 0.8, xpMul: 0.9 },
  { name: 'Zombie', hpMul: 1.4, dmgMul: 0.9, xpMul: 1.1 },
  { name: 'Skeleton', hpMul: 1.0, dmgMul: 1.1, xpMul: 1.0 },
  { name: 'Quill Rat', hpMul: 0.7, dmgMul: 1.2, xpMul: 0.95 },
  { name: 'Corrupt Rogue', hpMul: 1.1, dmgMul: 1.15, xpMul: 1.2 },
];

let enemyCounter = 0;
function nextEnemyId(): string {
  enemyCounter += 1;
  return `e${enemyCounter}`;
}

/** Deterministic per (type, level) — used by both the room roller and tests. */
export function makeEnemy(typeIndex: number, dungeonLevel: number, id?: string): Enemy {
  const t = ENEMY_TYPES[((typeIndex % ENEMY_TYPES.length) + ENEMY_TYPES.length) % ENEMY_TYPES.length];
  const baseHp = 14 + dungeonLevel * 9;
  const hp = Math.round(baseHp * t.hpMul);
  const minDamage = Math.max(1, Math.round((2 + dungeonLevel * 1.6) * t.dmgMul));
  const maxDamage = Math.max(minDamage + 1, Math.round((4 + dungeonLevel * 2.6) * t.dmgMul));
  const defense = 4 + dungeonLevel * 4;
  const attackRating = 22 + dungeonLevel * 12;
  const xp = Math.round((10 + dungeonLevel * 7) * t.xpMul);
  const goldMin = 2 + dungeonLevel * 2;
  const goldMax = 6 + dungeonLevel * 6;
  return {
    id: id ?? nextEnemyId(),
    name: t.name,
    hp,
    maxHp: hp,
    minDamage,
    maxDamage,
    defense,
    attackRating,
    xp,
    goldMin,
    goldMax,
    isBoss: false,
  };
}

/** Andariel-style boss: tanky, hits hard, guaranteed rare+ drop on defeat. */
export function makeBoss(dungeonLevel: number, id?: string): Enemy {
  const base = makeEnemy(1, dungeonLevel);
  return {
    id: id ?? nextEnemyId(),
    name: 'Andariel',
    hp: base.maxHp * 8,
    maxHp: base.maxHp * 8,
    minDamage: Math.round(base.minDamage * 2.2),
    maxDamage: Math.round(base.maxDamage * 2.2),
    defense: base.defense * 2,
    attackRating: Math.round(base.attackRating * 1.6),
    xp: base.xp * 12,
    goldMin: base.goldMin * 8,
    goldMax: base.goldMax * 8,
    isBoss: true,
  };
}

export function isBossLevel(dungeonLevel: number): boolean {
  return dungeonLevel === BOSS_LEVEL;
}

/** Build the set of enemies for a dungeon room. Boss levels end with Andariel. */
export function generateRoom(dungeonLevel: number, rand: Rand): Enemy[] {
  if (isBossLevel(dungeonLevel)) {
    const minions = randInt(rand, 1, 2);
    const enemies: Enemy[] = [];
    for (let i = 0; i < minions; i++) {
      enemies.push(makeEnemy(randInt(rand, 0, ENEMY_TYPES.length - 1), dungeonLevel));
    }
    enemies.push(makeBoss(dungeonLevel));
    return enemies;
  }
  const count = randInt(rand, 3, 5);
  const enemies: Enemy[] = [];
  for (let i = 0; i < count; i++) {
    enemies.push(makeEnemy(randInt(rand, 0, ENEMY_TYPES.length - 1), dungeonLevel));
  }
  return enemies;
}

// ---------------------------------------------------------------------------
// Loot generation
// ---------------------------------------------------------------------------

const SLOT_BASES: Record<ItemSlot, string[]> = {
  weapon: ['Short Sword', 'Hand Axe', 'Mace', 'Long Sword', 'War Hammer', 'Broad Sword'],
  armor: ['Quilted Armor', 'Leather Armor', 'Ring Mail', 'Chain Mail', 'Breast Plate'],
  helm: ['Cap', 'Skull Cap', 'Helm', 'Full Helm'],
  ring: ['Ring'],
  amulet: ['Amulet'],
};

const SLOTS: ItemSlot[] = ['weapon', 'armor', 'helm', 'ring', 'amulet'];

interface AffixDef {
  key: AffixStat;
  label: string;
  min: number;
  max: number;
  perLevel: number;
}

export const AFFIX_POOL: AffixDef[] = [
  { key: 'strength', label: 'Strength', min: 1, max: 5, perLevel: 0.5 },
  { key: 'dexterity', label: 'Dexterity', min: 1, max: 5, perLevel: 0.5 },
  { key: 'vitality', label: 'Vitality', min: 1, max: 6, perLevel: 0.6 },
  { key: 'energy', label: 'Energy', min: 1, max: 5, perLevel: 0.4 },
  { key: 'life', label: 'Life', min: 5, max: 15, perLevel: 2 },
  { key: 'mana', label: 'Mana', min: 3, max: 10, perLevel: 1.5 },
  { key: 'damage', label: 'Damage', min: 1, max: 4, perLevel: 0.8 },
  { key: 'defense', label: 'Defense', min: 2, max: 8, perLevel: 1.2 },
  { key: 'attackRating', label: 'Attack Rating', min: 5, max: 20, perLevel: 3 },
];

const AFFIX_COUNT: Record<Rarity, [number, number]> = {
  normal: [0, 0],
  magic: [1, 2],
  rare: [3, 5],
  unique: [4, 6],
};

const MAGIC_PREFIXES = ['Sharp', 'Fortified', 'Vicious', 'Stout', 'Gleaming', 'Jagged', 'Cruel', 'Sturdy'];
const MAGIC_SUFFIXES = ['of the Bear', 'of Skill', 'of Vigor', 'of the Fox', 'of Warding', 'of Health', 'of the Wolf', 'of Might'];
const RARE_A = ['Corpse', 'Blood', 'Grim', 'Dread', 'Storm', 'Doom', 'Vile', 'Shadow'];
const RARE_B = ['Bite', 'Ward', 'Fang', 'Wound', 'Song', 'Grasp', 'Brand', 'Scourge'];
const UNIQUE_NAMES = ['The Gnasher', "Deaths Hand", 'Hellclap', 'Bladebuckle', 'The Diggler', 'Skewer of Krintiz'];

/** Weighted rarity roll. Deeper levels bump the rare/unique odds a little. */
export function rollRarity(dungeonLevel: number, rand: Rand): Rarity {
  const lvlBoost = dungeonLevel;
  return weightedPick<Rarity>(rand, [
    ['normal', 60],
    ['magic', 27 + lvlBoost],
    ['rare', 10 + lvlBoost * 0.6],
    ['unique', 3 + lvlBoost * 0.2],
  ]);
}

export function rollAffixes(rarity: Rarity, ilvl: number, rand: Rand): Affix[] {
  const [lo, hi] = AFFIX_COUNT[rarity];
  const count = randInt(rand, lo, hi);
  const pool = [...AFFIX_POOL];
  const out: Affix[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = randInt(rand, 0, pool.length - 1);
    const def = pool.splice(idx, 1)[0];
    const value = randInt(rand, def.min, def.max) + Math.floor(ilvl * def.perLevel);
    out.push({ key: def.key, stat: def.key, label: def.label, value });
  }
  return out;
}

function buildName(base: string, slot: ItemSlot, rarity: Rarity, rand: Rand): string {
  if (rarity === 'normal') return base;
  if (rarity === 'magic') {
    // one prefix or one suffix
    if (rand() < 0.5) return `${pick(rand, MAGIC_PREFIXES)} ${base}`;
    return `${base} ${pick(rand, MAGIC_SUFFIXES)}`;
  }
  if (rarity === 'rare') return `${pick(rand, RARE_A)} ${pick(rand, RARE_B)}`;
  return pick(rand, UNIQUE_NAMES);
}

export interface LootOptions {
  minRarity?: Rarity;
  slot?: ItemSlot;
}

let itemCounter = 0;
function nextItemId(): string {
  itemCounter += 1;
  return `i${itemCounter}`;
}

export function generateLoot(dungeonLevel: number, rand: Rand, opts: LootOptions = {}): Item {
  let rarity = rollRarity(dungeonLevel, rand);
  if (opts.minRarity && RARITY_ORDER.indexOf(rarity) < RARITY_ORDER.indexOf(opts.minRarity)) {
    rarity = opts.minRarity;
  }
  const slot = opts.slot ?? pick(rand, SLOTS);
  const base = pick(rand, SLOT_BASES[slot]);

  let baseDamage = 0;
  let baseDefense = 0;
  if (slot === 'weapon') {
    baseDamage = randInt(rand, 3 + dungeonLevel, 6 + dungeonLevel * 2);
  } else if (slot === 'armor' || slot === 'helm') {
    baseDefense = randInt(rand, 2 + dungeonLevel, 5 + dungeonLevel * 2);
  }

  const affixes = rollAffixes(rarity, dungeonLevel, rand);
  const name = buildName(base, slot, rarity, rand);

  const rarityMul: Record<Rarity, number> = { normal: 1, magic: 3, rare: 8, unique: 20 };
  const affixWorth = affixes.reduce((s, a) => s + a.value, 0);
  const value = Math.max(1, Math.round((5 + baseDamage + baseDefense + affixWorth) * rarityMul[rarity]));

  return {
    id: nextItemId(),
    name,
    base,
    slot,
    rarity,
    ilvl: dungeonLevel,
    baseDamage,
    baseDefense,
    affixes,
    value,
  };
}

/** Roll whether a slain enemy drops loot at all (bosses always drop). */
export function rollLootDrop(enemy: Enemy, rand: Rand): Item | null {
  if (enemy.isBoss) {
    return generateLoot(Math.max(enemy.hp, BOSS_LEVEL), rand, { minRarity: 'rare' });
  }
  const dropChance = 0.35;
  if (rand() >= dropChance) return null;
  return generateLoot(1, rand);
}

// ---------------------------------------------------------------------------
// Equipment mutations
// ---------------------------------------------------------------------------

export function equipItem(char: Character, item: Item): Character {
  const inventory = char.inventory.filter((i) => i.id !== item.id);
  const previous = char.equipment[item.slot];
  if (previous) inventory.push(previous);
  const equipment = { ...char.equipment, [item.slot]: item };
  return clampVitals({ ...char, inventory, equipment });
}

export function unequipItem(char: Character, slot: ItemSlot): Character {
  const equipped = char.equipment[slot];
  if (!equipped) return char;
  const equipment = { ...char.equipment };
  delete equipment[slot];
  const inventory = [...char.inventory, equipped];
  return clampVitals({ ...char, inventory, equipment });
}

export function sellItem(char: Character, itemId: string): Character {
  const item = char.inventory.find((i) => i.id === itemId);
  if (!item) return char;
  return {
    ...char,
    inventory: char.inventory.filter((i) => i.id !== itemId),
    gold: char.gold + item.value,
  };
}

/** Clamp current hp/mana so they never exceed a freshly recomputed maximum. */
export function clampVitals(char: Character): Character {
  const c = playerCombat(char);
  return {
    ...char,
    hp: Math.min(char.hp, c.maxLife),
    mana: Math.min(char.mana, c.maxMana),
  };
}

// ---------------------------------------------------------------------------
// XP, levelling and progression
// ---------------------------------------------------------------------------

/** XP required to advance from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return 100 * level;
}

/** Cumulative XP required to *be* `level`. */
export function totalXpForLevel(level: number): number {
  let sum = 0;
  for (let k = 1; k < level; k++) sum += xpToNext(k);
  return sum;
}

export function levelFromXp(xp: number): number {
  let lvl = 1;
  while (xp >= totalXpForLevel(lvl + 1)) lvl++;
  return lvl;
}

export interface XpResult {
  char: Character;
  leveled: boolean;
  levelsGained: number;
}

export function applyXpGain(char: Character, amount: number): XpResult {
  const xp = char.xp + amount;
  let level = char.level;
  let statPoints = char.statPoints;
  while (xp >= totalXpForLevel(level + 1)) {
    level++;
    statPoints += STAT_POINTS_PER_LEVEL;
  }
  const leveled = level > char.level;
  const next: Character = { ...char, xp, level, statPoints };
  if (leveled) {
    const c = playerCombat(next);
    next.hp = c.maxLife;
    next.mana = c.maxMana;
  }
  return { char: next, leveled, levelsGained: level - char.level };
}

export function allocateStat(char: Character, key: StatKey): Character {
  if (char.statPoints <= 0) return char;
  const stats: Stats = { ...char.stats, [key]: char.stats[key] + 1 };
  return clampVitals({ ...char, stats, statPoints: char.statPoints - 1 });
}

// ---------------------------------------------------------------------------
// Potions, death, gold
// ---------------------------------------------------------------------------

export const POTION_HEAL = 40;
export const POTION_COST = 30;

export function quaffPotion(char: Character): Character {
  if (char.potions <= 0) return char;
  const c = playerCombat(char);
  return {
    ...char,
    potions: char.potions - 1,
    hp: Math.min(c.maxLife, char.hp + POTION_HEAL),
  };
}

export function buyPotion(char: Character): Character {
  if (char.gold < POTION_COST) return char;
  return { ...char, gold: char.gold - POTION_COST, potions: char.potions + 1 };
}

export function grantGold(enemy: Enemy, rand: Rand): number {
  return randInt(rand, enemy.goldMin, enemy.goldMax);
}

/** On death: lose a quarter of gold, revive at full health back in town. */
export function applyDeath(char: Character): { char: Character; goldLost: number } {
  const goldLost = Math.floor(char.gold * 0.25);
  const c = playerCombat(char);
  return {
    char: { ...char, gold: char.gold - goldLost, hp: c.maxLife, mana: c.maxMana },
    goldLost,
  };
}

// ---------------------------------------------------------------------------
// Combat turn resolution
// ---------------------------------------------------------------------------

/** Sounds a single combat turn can cue; a subset of the app's SoundId set. */
export type CombatSound = 'ding' | 'menuClick' | 'chord' | 'cardWin' | 'error';

/** A log line and/or sound to surface, in the order it happened. */
export interface CombatEvent {
  log?: string;
  sound?: CombatSound;
}

export interface CombatTurnResult {
  /** Enemy roster after the turn (target removed on a kill, emptied on death). */
  enemies: Enemy[];
  /** Character after xp/gold/hp/mana/death changes are folded in. */
  character: Character;
  /** Summoned ally after the turn (attacks, damage taken, or destruction). */
  ally: Ally | null;
  /** Ordered log/sound cues to fire once each. */
  events: CombatEvent[];
  /** First item dropped this action, if any (kept for back-compat). */
  drop: Item | null;
  /** Every item dropped this action (AoE can slay several foes at once). */
  drops: Item[];
  /** Belt potions dropped this action, already folded into `character.belt`. */
  potionDrops: PotionType[];
  goldGained: number;
  xpGained: number;
  leveledUp: boolean;
  /** At least one enemy was slain this action. */
  enemyDefeated: boolean;
  /** Ids of every enemy slain this action (for crumble animations). */
  defeatedIds: string[];
  /** The boss was among the slain. */
  bossDown: boolean;
  /** The player was killed by the retaliation. */
  died: boolean;
  /** Gold lost to the death penalty (0 unless `died`). */
  goldLost: number;
  /** Mana spent (0 for a basic attack). */
  manaSpent: number;
  /** Life restored to the player this action (Holy Bolt self-heal). */
  healed: number;
  /** Ids of enemies struck this action (for hit-flash animations). */
  hitIds: string[];
  /** The skill cast, or null for a basic attack. */
  skillId: string | null;
  /** Ids of enemies newly slowed this action. */
  slowedIds: string[];
  /** Ids of enemies stunned this action. */
  stunnedIds: string[];
}

/** Chance a slain (non-boss) enemy also coughs up a belt potion. */
export const POTION_DROP_CHANCE = 0.12;

/** A summoned combatant that fights alongside the player until slain. */
export interface Ally {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  minDamage: number;
  maxDamage: number;
  attackRating: number;
}

/** Raise a skeletal warrior scaled to the caster's level. */
export function makeSkeleton(character: Character): Ally {
  const lvl = character.level;
  const hp = 18 + lvl * 7;
  return {
    id: 'skeleton',
    name: 'Skeleton',
    hp,
    maxHp: hp,
    minDamage: 2 + lvl,
    maxDamage: 5 + lvl * 2,
    attackRating: 30 + lvl * 12,
  };
}

// Internal mutable scratch used by the shared resolvers. The public entry points
// clone character/enemies/ally into it, so the caller's inputs are never touched.
interface CombatState {
  char: Character;
  enemies: Enemy[];
  ally: Ally | null;
  events: CombatEvent[];
  hitIds: string[];
  defeatedIds: string[];
  drops: Item[];
  potionDrops: PotionType[];
  slowedIds: string[];
  stunnedIds: string[];
  goldGained: number;
  xpGained: number;
  leveledUp: boolean;
  bossDown: boolean;
  healed: number;
}

function newState(char: Character, enemies: Enemy[], ally: Ally | null): CombatState {
  return {
    char,
    enemies: enemies.map((e) => ({ ...e })),
    ally: ally ? { ...ally } : null,
    events: [],
    hitIds: [],
    defeatedIds: [],
    drops: [],
    potionDrops: [],
    slowedIds: [],
    stunnedIds: [],
    goldGained: 0,
    xpGained: 0,
    leveledUp: false,
    bossDown: false,
    healed: 0,
  };
}

function toCombatant(c: PlayerCombat): Combatant {
  return { minDamage: c.minDamage, maxDamage: c.maxDamage, attackRating: c.attackRating, defense: c.defense };
}

/** Roll a skill's magic damage: scales off top-end damage and energy, auto-hits. */
function spellDamage(combat: PlayerCombat, mult: number, energyScale: number, rand: Rand): number {
  const top = Math.max(1, Math.round(combat.maxDamage * mult + combat.totalStats.energy * energyScale));
  const lo = Math.max(1, Math.round(top * 0.7));
  return Math.max(1, randInt(rand, lo, top));
}

/** A physical skill blow: an ordinary attack roll with the weapon damage scaled. */
function skillStrike(combat: PlayerCombat, mult: number, enemy: Enemy, rand: Rand): AttackResult {
  return resolveAttack(
    {
      minDamage: Math.max(1, Math.round(combat.minDamage * mult)),
      maxDamage: Math.max(1, Math.round(combat.maxDamage * mult)),
      attackRating: combat.attackRating,
      defense: combat.defense,
    },
    enemy,
    rand,
  );
}

// Reward resolution for a slain enemy. Mirrors the original kill order — loot,
// gold, xp — then appends a potion roll, so seeded tests of the earlier rolls are
// undisturbed.
interface KillYield {
  character: Character;
  events: CombatEvent[];
  drop: Item | null;
  potionDrop: PotionType | null;
  goldGained: number;
  xpGained: number;
  leveled: boolean;
}
function resolveKill(rewardChar: Character, enemy: Enemy, rand: Rand): KillYield {
  const events: CombatEvent[] = [];
  events.push({ log: `${enemy.name} dies!` });
  const drop = rollLootDrop(enemy, rand);
  const goldGained = grantGold(enemy, rand);
  const xpRes = applyXpGain({ ...rewardChar, gold: rewardChar.gold + goldGained }, enemy.xp);
  let updated = xpRes.char;
  if (xpRes.leveled) {
    events.push({
      sound: 'chord',
      log: `Welcome to level ${updated.level}! ${xpRes.levelsGained * STAT_POINTS_PER_LEVEL} stat points to spend.`,
    });
  }
  if (drop) {
    const rareDrop = drop.rarity === 'rare' || drop.rarity === 'unique';
    events.push({ sound: rareDrop ? 'cardWin' : undefined, log: `${enemy.name} drops ${drop.name}.` });
  }
  if (enemy.isBoss) {
    events.push({ sound: 'cardWin', log: 'Andariel is slain! The Maiden of Anguish falls.' });
  }
  let potionDrop: PotionType | null = null;
  if (!enemy.isBoss && chance(rand, POTION_DROP_CHANCE)) {
    potionDrop = rand() < 0.5 ? 'health' : 'mana';
    updated = addPotionToBelt(updated, potionDrop);
    events.push({ log: `${enemy.name} drops a ${BELT_POTIONS[potionDrop].label}.` });
  }
  return { character: updated, events, drop, potionDrop, goldGained, xpGained: enemy.xp, leveled: xpRes.leveled };
}

// Fold a slain enemy's rewards into the running state.
function slay(S: CombatState, enemy: Enemy, rand: Rand): void {
  S.defeatedIds.push(enemy.id);
  if (enemy.isBoss) S.bossDown = true;
  const k = resolveKill(S.char, enemy, rand);
  S.char = k.character;
  for (const ev of k.events) S.events.push(ev);
  if (k.drop) S.drops.push(k.drop);
  if (k.potionDrop) S.potionDrops.push(k.potionDrop);
  S.goldGained += k.goldGained;
  S.xpGained += k.xpGained;
  S.leveledUp = S.leveledUp || k.leveled;
}

// Apply an already-rolled amount of damage to one enemy, resolving death.
function applyDamage(S: CombatState, id: string, damage: number, rand: Rand, logHit: (name: string, dmg: number) => string): void {
  const idx = S.enemies.findIndex((e) => e.id === id);
  if (idx === -1) return;
  const e = S.enemies[idx];
  S.hitIds.push(id);
  const hp = e.hp - damage;
  S.events.push({ sound: 'ding', log: logHit(e.name, damage) });
  if (hp <= 0) {
    slay(S, e, rand);
    S.enemies = S.enemies.filter((x) => x.id !== id);
  } else {
    S.enemies = S.enemies.map((x) => (x.id === id ? { ...x, hp } : x));
  }
}

// The summoned ally, when present, strikes a random living foe. Draws no RNG when
// there is no ally, so a basic attack's roll sequence is unchanged.
function skeletonPhase(S: CombatState, rand: Rand): void {
  if (!S.ally) return;
  const living = S.enemies.filter((e) => e.hp > 0);
  if (living.length === 0) return;
  const t = living[randInt(rand, 0, living.length - 1)];
  const atk = resolveAttack({ minDamage: S.ally.minDamage, maxDamage: S.ally.maxDamage, attackRating: S.ally.attackRating, defense: 0 }, t, rand);
  if (atk.hit) applyDamage(S, t.id, atk.damage, rand, (n, d) => `Your skeleton hits ${n} for ${d}.`);
  else S.events.push({ log: `Your skeleton misses ${t.name}.` });
}

// A single foe counter-attacks. A slowed or stunned foe skips it. With an ally on
// the field the blow may land on the skeleton instead of the player. Returns
// whether the player was killed. The ally-target roll only fires when an ally
// exists, so the no-ally path draws exactly one attack roll as before.
function retaliatePhase(S: CombatState, retaliator: Enemy | null, combat: PlayerCombat, rand: Rand): boolean {
  if (!retaliator) return false;
  const current = S.enemies.find((e) => e.id === retaliator.id);
  if (!current || current.hp <= 0) return false;
  if ((current.slowTurns ?? 0) > 0) return false;
  if (S.stunnedIds.includes(current.id)) return false;

  let hitAlly = false;
  if (S.ally) hitAlly = rand() < 0.5;
  const atk = resolveAttack(current, combat, rand);
  if (!atk.hit) return false;

  if (hitAlly && S.ally) {
    const hp = S.ally.hp - atk.damage;
    if (hp <= 0) {
      S.events.push({ log: `${current.name} destroys your skeleton!` });
      S.ally = null;
    } else {
      S.events.push({ log: `${current.name} hits your skeleton for ${atk.damage}.` });
      S.ally = { ...S.ally, hp };
    }
    return false;
  }

  const playerHp = S.char.hp - atk.damage;
  S.events.push({ log: `${current.name} hits you for ${atk.damage}.` });
  if (playerHp <= 0) {
    S.events.push({ sound: 'error' });
    return true;
  }
  S.char = { ...S.char, hp: playerHp };
  return false;
}

// Tick down slow timers on the surviving roster (no-op when nobody is slowed).
function decrementSlow(enemies: Enemy[]): Enemy[] {
  if (!enemies.some((e) => (e.slowTurns ?? 0) > 0)) return enemies;
  return enemies.map((e) => ((e.slowTurns ?? 0) > 0 ? { ...e, slowTurns: (e.slowTurns as number) - 1 } : e));
}

// Assemble the immutable result from the scratch state.
function finalize(S: CombatState, opts: { died: boolean; skillId: string | null; manaSpent: number }): CombatTurnResult {
  if (opts.died) {
    const dead = applyDeath(S.char);
    return {
      enemies: [],
      character: dead.char,
      ally: null,
      events: S.events,
      drop: S.drops[0] ?? null,
      drops: S.drops,
      potionDrops: S.potionDrops,
      goldGained: S.goldGained,
      xpGained: S.xpGained,
      leveledUp: S.leveledUp,
      enemyDefeated: S.defeatedIds.length > 0,
      defeatedIds: S.defeatedIds,
      bossDown: S.bossDown,
      died: true,
      goldLost: dead.goldLost,
      manaSpent: opts.manaSpent,
      healed: S.healed,
      hitIds: S.hitIds,
      skillId: opts.skillId,
      slowedIds: S.slowedIds,
      stunnedIds: S.stunnedIds,
    };
  }
  return {
    enemies: decrementSlow(S.enemies),
    character: S.char,
    ally: S.ally,
    events: S.events,
    drop: S.drops[0] ?? null,
    drops: S.drops,
    potionDrops: S.potionDrops,
    goldGained: S.goldGained,
    xpGained: S.xpGained,
    leveledUp: S.leveledUp,
    enemyDefeated: S.defeatedIds.length > 0,
    defeatedIds: S.defeatedIds,
    bossDown: S.bossDown,
    died: false,
    goldLost: 0,
    manaSpent: opts.manaSpent,
    healed: S.healed,
    hitIds: S.hitIds,
    skillId: opts.skillId,
    slowedIds: S.slowedIds,
    stunnedIds: S.stunnedIds,
  };
}

/**
 * Resolve one player attack against `enemyId` as a single pure step. All
 * randomness flows through `rand`, and every consequence — new roster, updated
 * character/ally, loot, log/sound cues — is returned rather than applied, so the
 * UI can commit each effect exactly once. Pass a summoned `ally` to let a
 * skeleton fight alongside. Returns null if the target is gone.
 */
export function resolveCombatTurn(
  character: Character,
  enemies: Enemy[],
  enemyId: string,
  rand: Rand,
  ally: Ally | null = null,
): CombatTurnResult | null {
  const idx = enemies.findIndex((e) => e.id === enemyId);
  if (idx === -1) return null;
  const combat = playerCombat(character);
  const S = newState(character, enemies, ally);
  const target = S.enemies[idx];

  const hit = resolveAttack(toCombatant(combat), target, rand);
  if (hit.hit) applyDamage(S, enemyId, hit.damage, rand, (n, d) => `You hit ${n} for ${d}.`);
  else S.events.push({ sound: 'menuClick', log: `You miss ${target.name}.` });

  skeletonPhase(S, rand);

  // Only the struck target counters, and only if it survived — preserving the
  // original one-retaliator model even in a crowded room.
  const survivor = S.enemies.find((e) => e.id === enemyId) ?? null;
  const died = retaliatePhase(S, survivor, combat, rand);
  return finalize(S, { died, skillId: null, manaSpent: 0 });
}

// ---------------------------------------------------------------------------
// Class skills
// ---------------------------------------------------------------------------

/** How a skill picks its targets. */
export type SkillTargeting = 'single' | 'all' | 'pierce' | 'any' | 'summon';
/** Coarse visual family, used by the UI animation layer. */
export type SkillEffect = 'bolt' | 'nova' | 'whirl' | 'pierce' | 'melee' | 'summon' | 'volley';

export interface SkillDef {
  id: string;
  cls: CharClass;
  name: string;
  manaCost: number;
  /** Character level the skill becomes available at. */
  unlockLevel: number;
  /** Turns before it can be cast again (0 = only mana-gated). Enforced by the UI. */
  cooldown: number;
  targeting: SkillTargeting;
  effect: SkillEffect;
  /** Auto-hitting spell (true) vs. an attack-roll physical blow (false). */
  magic: boolean;
  /** Damage scale vs. top-end weapon damage per strike. */
  dmgMult: number;
  /** Flat magic bonus from energy (spells only). */
  energyScale: number;
  /** Number of strikes at a single target (Jab / Zeal). */
  hits: number;
  /** 1-based order within the class, mapped to hotkeys 1..N. */
  hotkey: number;
  desc: string;
}

export const SKILLS: SkillDef[] = [
  // Sorceress
  { id: 'firebolt', cls: 'Sorceress', name: 'Fire Bolt', manaCost: 4, unlockLevel: 1, cooldown: 0, targeting: 'single', effect: 'bolt', magic: true, dmgMult: 2.2, energyScale: 0.6, hits: 1, hotkey: 1, desc: 'A searing bolt of fire — heavy single-target damage.' },
  { id: 'frostnova', cls: 'Sorceress', name: 'Frost Nova', manaCost: 9, unlockLevel: 6, cooldown: 3, targeting: 'all', effect: 'nova', magic: true, dmgMult: 0.8, energyScale: 0.35, hits: 1, hotkey: 2, desc: 'A ring of frost — damages every foe and slows them for 2 turns.' },
  // Barbarian
  { id: 'bash', cls: 'Barbarian', name: 'Bash', manaCost: 3, unlockLevel: 1, cooldown: 0, targeting: 'single', effect: 'melee', magic: false, dmgMult: 1.7, energyScale: 0, hits: 1, hotkey: 1, desc: "A crushing blow that stuns, skipping the foe's counter." },
  { id: 'whirlwind', cls: 'Barbarian', name: 'Whirlwind', manaCost: 10, unlockLevel: 6, cooldown: 3, targeting: 'all', effect: 'whirl', magic: false, dmgMult: 0.7, energyScale: 0, hits: 1, hotkey: 2, desc: 'Spin through the whole pack for reduced damage.' },
  // Necromancer
  { id: 'bonespear', cls: 'Necromancer', name: 'Bone Spear', manaCost: 5, unlockLevel: 1, cooldown: 0, targeting: 'pierce', effect: 'pierce', magic: true, dmgMult: 1.6, energyScale: 0.5, hits: 1, hotkey: 1, desc: 'A spear of bone that pierces the target and the foe behind it.' },
  { id: 'raiseskeleton', cls: 'Necromancer', name: 'Raise Skeleton', manaCost: 8, unlockLevel: 6, cooldown: 5, targeting: 'summon', effect: 'summon', magic: false, dmgMult: 0, energyScale: 0, hits: 1, hotkey: 2, desc: 'Raise a skeletal warrior that fights at your side until slain.' },
  // Paladin
  { id: 'holybolt', cls: 'Paladin', name: 'Holy Bolt', manaCost: 4, unlockLevel: 1, cooldown: 0, targeting: 'any', effect: 'bolt', magic: true, dmgMult: 1.5, energyScale: 0.5, hits: 1, hotkey: 1, desc: 'Holy light: smite a foe, or cast with no target to heal yourself.' },
  { id: 'zeal', cls: 'Paladin', name: 'Zeal', manaCost: 4, unlockLevel: 6, cooldown: 0, targeting: 'single', effect: 'melee', magic: false, dmgMult: 0.9, energyScale: 0, hits: 2, hotkey: 2, desc: 'Strike the target twice in righteous fury.' },
  // Amazon
  { id: 'jab', cls: 'Amazon', name: 'Jab', manaCost: 3, unlockLevel: 1, cooldown: 0, targeting: 'single', effect: 'melee', magic: false, dmgMult: 0.85, energyScale: 0, hits: 2, hotkey: 1, desc: 'Two quick spear jabs at a single foe.' },
  { id: 'multishot', cls: 'Amazon', name: 'Multiple Shot', manaCost: 7, unlockLevel: 6, cooldown: 3, targeting: 'all', effect: 'volley', magic: false, dmgMult: 0.6, energyScale: 0, hits: 1, hotkey: 2, desc: 'Loose a spray of arrows at every enemy for reduced damage.' },
];

export function getSkill(id: string): SkillDef | undefined {
  return SKILLS.find((s) => s.id === id);
}

/** Every skill a class can ever learn, in hotkey order. */
export function skillsForClass(cls: CharClass): SkillDef[] {
  return SKILLS.filter((s) => s.cls === cls).sort((a, b) => a.hotkey - b.hotkey);
}

/** Skills a character has unlocked at their current level. */
export function availableSkills(char: Character): SkillDef[] {
  return skillsForClass(char.cls).filter((s) => char.level >= s.unlockLevel);
}

/**
 * Resolve one skill cast as a single pure step, sharing resolveCombatTurn's
 * internals and result shape. `targetId` is required for single/pierce skills,
 * optional for Holy Bolt (null = self-heal), and ignored by AoE/summon skills.
 * Returns null if the skill can't be cast (wrong class, not yet unlocked, or not
 * enough mana), so the UI can also disable the button as a courtesy.
 */
export function castSkill(
  character: Character,
  enemies: Enemy[],
  targetId: string | null,
  skillId: string,
  rand: Rand,
  ally: Ally | null = null,
): CombatTurnResult | null {
  const skill = getSkill(skillId);
  if (!skill || skill.cls !== character.cls) return null;
  if (character.level < skill.unlockLevel) return null;
  if (character.mana < skill.manaCost) return null;

  const combat = playerCombat(character);
  const S = newState({ ...character, mana: character.mana - skill.manaCost }, enemies, ally);
  S.events.push({ sound: 'chord', log: `You cast ${skill.name}.` });

  let damagedTarget = false;

  if (skill.targeting === 'summon') {
    S.ally = makeSkeleton(character);
    S.events.push({ log: 'A skeletal warrior rises to serve you.' });
  } else if (skill.targeting === 'any') {
    const t = targetId ? S.enemies.find((e) => e.id === targetId && e.hp > 0) : null;
    if (t) {
      const dmg = spellDamage(combat, skill.dmgMult, skill.energyScale, rand);
      applyDamage(S, t.id, dmg, rand, (n, d) => `${skill.name} smites ${n} for ${d}.`);
      damagedTarget = true;
    } else {
      const heal = Math.max(1, Math.round(combat.maxLife * 0.3 + combat.totalStats.energy * skill.energyScale));
      const before = S.char.hp;
      S.char = { ...S.char, hp: Math.min(combat.maxLife, S.char.hp + heal) };
      S.healed = S.char.hp - before;
      S.events.push({ sound: 'ding', log: `Holy light restores ${S.healed} life.` });
    }
  } else if (skill.targeting === 'all') {
    const ids = S.enemies.filter((e) => e.hp > 0).map((e) => e.id);
    for (const id of ids) {
      if (skill.magic) {
        const dmg = spellDamage(combat, skill.dmgMult, skill.energyScale, rand);
        applyDamage(S, id, dmg, rand, (n, d) => `${skill.name} hits ${n} for ${d}.`);
      } else {
        const e = S.enemies.find((x) => x.id === id);
        if (!e) continue;
        const atk = skillStrike(combat, skill.dmgMult, e, rand);
        if (atk.hit) applyDamage(S, id, atk.damage, rand, (n, d) => `${skill.name} hits ${n} for ${d}.`);
        else S.events.push({ log: `${skill.name} misses ${e.name}.` });
      }
    }
    if (skill.id === 'frostnova' && S.enemies.length > 0) {
      S.enemies = S.enemies.map((e) => {
        S.slowedIds.push(e.id);
        return { ...e, slowTurns: 2 };
      });
      S.events.push({ sound: 'chord', log: 'Frost grips your enemies, slowing them.' });
    }
  } else if (skill.targeting === 'pierce') {
    const i = S.enemies.findIndex((e) => e.id === targetId);
    if (i !== -1) {
      const primary = S.enemies[i];
      const adjacent = S.enemies[i + 1] ?? S.enemies[i - 1] ?? null;
      const dmg1 = spellDamage(combat, skill.dmgMult, skill.energyScale, rand);
      applyDamage(S, primary.id, dmg1, rand, (n, d) => `${skill.name} pierces ${n} for ${d}.`);
      damagedTarget = true;
      if (adjacent) {
        const dmg2 = spellDamage(combat, skill.dmgMult * 0.6, skill.energyScale * 0.6, rand);
        applyDamage(S, adjacent.id, dmg2, rand, (n, d) => `${skill.name} tears through ${n} for ${d}.`);
      }
    }
  } else {
    // single-target: one auto-hit spell, or `hits` physical blows
    const strikes = Math.max(1, skill.hits);
    for (let h = 0; h < strikes; h++) {
      const t = S.enemies.find((e) => e.id === targetId && e.hp > 0);
      if (!t) break;
      if (skill.magic) {
        const dmg = spellDamage(combat, skill.dmgMult, skill.energyScale, rand);
        applyDamage(S, t.id, dmg, rand, (n, d) => `${skill.name} hits ${n} for ${d}.`);
        damagedTarget = true;
      } else {
        const atk = skillStrike(combat, skill.dmgMult, t, rand);
        if (atk.hit) {
          applyDamage(S, t.id, atk.damage, rand, (n, d) => `${skill.name} hits ${n} for ${d}.`);
          damagedTarget = true;
        } else {
          S.events.push({ log: `${skill.name} misses ${t.name}.` });
        }
      }
    }
    if (skill.id === 'bash' && damagedTarget && targetId && S.enemies.some((e) => e.id === targetId)) {
      S.stunnedIds.push(targetId);
      S.events.push({ log: 'The blow stuns your foe!' });
    }
  }

  skeletonPhase(S, rand);

  // Single-target skills provoke only their target; wider casts draw one nearby foe.
  let retaliator: Enemy | null;
  if (skill.targeting === 'single' || skill.targeting === 'pierce' || (skill.targeting === 'any' && damagedTarget)) {
    retaliator = S.enemies.find((e) => e.id === targetId) ?? null;
  } else {
    retaliator = S.enemies.find((e) => e.hp > 0) ?? null;
  }
  const died = retaliatePhase(S, retaliator, combat, rand);
  return finalize(S, { died, skillId: skill.id, manaSpent: skill.manaCost });
}

// ---------------------------------------------------------------------------
// Potion belt
// ---------------------------------------------------------------------------

export const BELT_SIZE = 4;

export interface PotionInfo {
  label: string;
  cost: number;
  restore: number;
  kind: 'hp' | 'mana';
  color: string;
}

export const BELT_POTIONS: Record<PotionType, PotionInfo> = {
  health: { label: 'Health Potion', cost: 30, restore: 45, kind: 'hp', color: '#d23a2a' },
  mana: { label: 'Mana Potion', cost: 25, restore: 40, kind: 'mana', color: '#3a5ab8' },
};

export function emptyBelt(): BeltSlot[] {
  return Array.from({ length: BELT_SIZE }, () => null);
}

/** Coerce any saved belt into a well-formed 4-slot array of valid potion types. */
export function normalizeBelt(belt: BeltSlot[] | undefined): BeltSlot[] {
  const out = Array.isArray(belt) ? belt.slice(0, BELT_SIZE) : [];
  while (out.length < BELT_SIZE) out.push(null);
  return out.map((s) => (s === 'health' || s === 'mana' ? s : null));
}

/** Drop a potion into the first empty belt slot; a no-op when the belt is full. */
export function addPotionToBelt(char: Character, type: PotionType): Character {
  const belt = normalizeBelt(char.belt);
  const idx = belt.findIndex((s) => s === null);
  if (idx === -1) return char;
  const next = [...belt];
  next[idx] = type;
  return { ...char, belt: next };
}

/** Buy a belt potion in town: needs gold and a free slot. */
export function buyBeltPotion(char: Character, type: PotionType): Character {
  const info = BELT_POTIONS[type];
  const belt = normalizeBelt(char.belt);
  if (char.gold < info.cost) return char;
  if (!belt.some((s) => s === null)) return char;
  const stocked = addPotionToBelt({ ...char, belt }, type);
  return { ...stocked, gold: char.gold - info.cost };
}

/** Drink the potion in a belt slot: instant restore, slot emptied. */
export function drinkBeltSlot(char: Character, index: number): Character {
  const belt = normalizeBelt(char.belt);
  const type = belt[index];
  if (!type) return char;
  const info = BELT_POTIONS[type];
  const combat = playerCombat(char);
  const next = [...belt];
  next[index] = null;
  if (info.kind === 'hp') {
    return { ...char, belt: next, hp: Math.min(combat.maxLife, char.hp + info.restore) };
  }
  return { ...char, belt: next, mana: Math.min(combat.maxMana, char.mana + info.restore) };
}

// ---------------------------------------------------------------------------
// Save migration
// ---------------------------------------------------------------------------

/**
 * Coerce a possibly-old saved character into the current shape, defaulting any
 * fields added since the save was written (belt, potions, etc). Skills are level
 * derived, so no separate list needs migrating.
 */
export function normalizeCharacter(raw: (Partial<Character> & { cls: CharClass }) | null | undefined): Character | null {
  if (!raw || !raw.cls) return null;
  const base = createCharacter(raw.cls);
  return {
    ...base,
    ...raw,
    stats: { ...base.stats, ...(raw.stats ?? {}) },
    equipment: raw.equipment ?? {},
    inventory: raw.inventory ?? [],
    belt: normalizeBelt(raw.belt),
    potions: typeof raw.potions === 'number' ? raw.potions : base.potions,
  };
}
