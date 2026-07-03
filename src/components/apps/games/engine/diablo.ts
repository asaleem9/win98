// Pure combat / loot / progression logic for the Diablo II loot-clicker.
// Deliberately free of React so it can be unit-tested and so the UI shell in
// Diablo2.tsx can stay a thin presenter. All randomness flows through a `Rand`
// (see ./rng) so tests can seed it and get repeatable rolls.

import { Rand, randInt, pick, weightedPick, clamp } from './rng';

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
  inventory: Item[];
  equipment: Partial<Record<ItemSlot, Item>>;
  bestDungeonLevel: number;
}

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
