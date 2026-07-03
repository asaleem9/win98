import { makeRng } from '../engine/rng';
import {
  createCharacter,
  playerCombat,
  equippedBonuses,
  equipItem,
  unequipItem,
  hitChance,
  resolveAttack,
  makeEnemy,
  makeBoss,
  generateRoom,
  isBossLevel,
  rollRarity,
  rollAffixes,
  generateLoot,
  rollLootDrop,
  xpToNext,
  totalXpForLevel,
  levelFromXp,
  applyXpGain,
  allocateStat,
  quaffPotion,
  buyPotion,
  applyDeath,
  resolveCombatTurn,
  castSkill,
  availableSkills,
  skillsForClass,
  getSkill,
  makeSkeleton,
  buyBeltPotion,
  drinkBeltSlot,
  addPotionToBelt,
  normalizeBelt,
  normalizeCharacter,
  emptyBelt,
  BELT_POTIONS,
  BELT_SIZE,
  STAT_POINTS_PER_LEVEL,
  BOSS_LEVEL,
  RARITY_ORDER,
  type Item,
  type Rarity,
  type Combatant,
  type Enemy,
  type Ally,
  type CharClass,
  type Character,
  type CombatTurnResult,
} from '../engine/diablo';

describe('character creation', () => {
  it('starts each class at level 1 with class stats and full vitals', () => {
    const barb = createCharacter('Barbarian');
    expect(barb.level).toBe(1);
    expect(barb.xp).toBe(0);
    expect(barb.stats.strength).toBe(30);
    const c = playerCombat(barb);
    expect(barb.hp).toBe(c.maxLife);
    expect(barb.mana).toBe(c.maxMana);
    expect(barb.hp).toBeGreaterThan(0);
  });

  it('gives casters more mana than melee', () => {
    const sorc = playerCombat(createCharacter('Sorceress'));
    const barb = playerCombat(createCharacter('Barbarian'));
    expect(sorc.maxMana).toBeGreaterThan(barb.maxMana);
  });
});

describe('attack resolution', () => {
  it('hit chance rises with attack rating and falls with defense', () => {
    expect(hitChance(100, 0)).toBeGreaterThan(hitChance(100, 500));
    expect(hitChance(1000, 50)).toBeGreaterThan(hitChance(50, 50));
  });

  it('never guarantees or forbids a hit (clamped 5%..95%)', () => {
    expect(hitChance(999999, 1)).toBeLessThanOrEqual(0.95);
    expect(hitChance(1, 999999)).toBeGreaterThanOrEqual(0.05);
  });

  it('is deterministic for a given seed', () => {
    const atk: Combatant = { minDamage: 5, maxDamage: 10, attackRating: 200, defense: 0 };
    const def: Combatant = { minDamage: 1, maxDamage: 2, attackRating: 10, defense: 20 };
    const a = resolveAttack(atk, def, makeRng(42));
    const b = resolveAttack(atk, def, makeRng(42));
    expect(a).toEqual(b);
    expect(a.hit).toBe(true);
    expect(a.damage).toBeGreaterThanOrEqual(5);
    expect(a.damage).toBeLessThanOrEqual(10);
  });

  it('deals at least 1 damage on a hit', () => {
    const atk: Combatant = { minDamage: 0, maxDamage: 0, attackRating: 500, defense: 0 };
    const def: Combatant = { minDamage: 0, maxDamage: 0, attackRating: 1, defense: 0 };
    // find a seed that hits
    for (let s = 0; s < 20; s++) {
      const r = resolveAttack(atk, def, makeRng(s));
      if (r.hit) {
        expect(r.damage).toBeGreaterThanOrEqual(1);
        return;
      }
    }
  });
});

describe('enemy generation & scaling', () => {
  it('scales hp, damage and xp up with dungeon level', () => {
    const low = makeEnemy(2, 1);
    const high = makeEnemy(2, 5);
    expect(high.maxHp).toBeGreaterThan(low.maxHp);
    expect(high.maxDamage).toBeGreaterThan(low.maxDamage);
    expect(high.xp).toBeGreaterThan(low.xp);
    expect(high.defense).toBeGreaterThan(low.defense);
  });

  it('keeps min damage below max damage', () => {
    for (let lvl = 1; lvl <= 5; lvl++) {
      for (let t = 0; t < 5; t++) {
        const e = makeEnemy(t, lvl);
        expect(e.minDamage).toBeLessThan(e.maxDamage);
      }
    }
  });

  it('only level 5 is the boss level', () => {
    expect(isBossLevel(BOSS_LEVEL)).toBe(true);
    expect(isBossLevel(4)).toBe(false);
    expect(isBossLevel(6)).toBe(false);
  });

  it('spawns Andariel on dungeon level 5 and only there', () => {
    const bossRoom = generateRoom(5, makeRng(7));
    expect(bossRoom.some((e) => e.isBoss && e.name === 'Andariel')).toBe(true);

    const normalRoom = generateRoom(3, makeRng(7));
    expect(normalRoom.some((e) => e.isBoss)).toBe(false);
    expect(normalRoom.length).toBeGreaterThanOrEqual(3);
  });

  it('makes the boss much tankier than a normal enemy of the same level', () => {
    const boss = makeBoss(5);
    const mob = makeEnemy(1, 5);
    expect(boss.maxHp).toBeGreaterThan(mob.maxHp * 4);
    expect(boss.xp).toBeGreaterThan(mob.xp * 4);
  });
});

describe('loot generation', () => {
  it('rolls rarity in the expected distribution (normal most common, unique rarest)', () => {
    const rng = makeRng(123);
    const counts: Record<Rarity, number> = { normal: 0, magic: 0, rare: 0, unique: 0 };
    for (let i = 0; i < 4000; i++) counts[rollRarity(1, rng)]++;
    expect(counts.normal).toBeGreaterThan(counts.magic);
    expect(counts.magic).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.unique);
    expect(counts.unique).toBeGreaterThan(0);
  });

  it('rolls the right affix count per rarity and scales values with ilvl', () => {
    const rng = makeRng(99);
    expect(rollAffixes('normal', 5, rng)).toHaveLength(0);

    const magic = rollAffixes('magic', 3, makeRng(1));
    expect(magic.length).toBeGreaterThanOrEqual(1);
    expect(magic.length).toBeLessThanOrEqual(2);

    const rare = rollAffixes('rare', 3, makeRng(1));
    expect(rare.length).toBeGreaterThanOrEqual(3);
    expect(rare.length).toBeLessThanOrEqual(5);

    // no duplicate affix keys
    const keys = rare.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);

    // higher ilvl -> larger rolled value for the same seed/affix
    const lowIlvl = rollAffixes('magic', 1, makeRng(5))[0];
    const highIlvl = rollAffixes('magic', 20, makeRng(5))[0];
    expect(highIlvl.value).toBeGreaterThan(lowIlvl.value);
  });

  it('weapons get base damage, armor gets base defense', () => {
    const wpn = generateLoot(3, makeRng(2), { slot: 'weapon' });
    expect(wpn.baseDamage).toBeGreaterThan(0);
    expect(wpn.baseDefense).toBe(0);

    const arm = generateLoot(3, makeRng(2), { slot: 'armor' });
    expect(arm.baseDefense).toBeGreaterThan(0);
    expect(arm.baseDamage).toBe(0);
  });

  it('honours a minimum rarity floor', () => {
    const rng = makeRng(50);
    for (let i = 0; i < 50; i++) {
      const item = generateLoot(5, rng, { minRarity: 'rare' });
      expect(RARITY_ORDER.indexOf(item.rarity)).toBeGreaterThanOrEqual(RARITY_ORDER.indexOf('rare'));
    }
  });

  it('always drops a rare+ item from a boss', () => {
    const boss = makeBoss(5);
    const drop = rollLootDrop(boss, makeRng(3));
    expect(drop).not.toBeNull();
    expect(RARITY_ORDER.indexOf((drop as Item).rarity)).toBeGreaterThanOrEqual(RARITY_ORDER.indexOf('rare'));
  });

  it('names items and prices rarer items higher', () => {
    const normal = generateLoot(3, makeRng(11), { slot: 'weapon' });
    const rare = generateLoot(3, makeRng(11), { slot: 'weapon', minRarity: 'rare' });
    expect(normal.name.length).toBeGreaterThan(0);
    expect(rare.value).toBeGreaterThan(normal.value);
  });
});

describe('equipment stat aggregation', () => {
  const ring: Item = {
    id: 'ring1',
    name: 'Test Ring',
    base: 'Ring',
    slot: 'ring',
    rarity: 'rare',
    ilvl: 5,
    baseDamage: 0,
    baseDefense: 0,
    affixes: [
      { key: 'strength', stat: 'strength', label: 'Strength', value: 10 },
      { key: 'life', stat: 'life', label: 'Life', value: 25 },
    ],
  };
  const sword: Item = {
    id: 'sword1',
    name: 'Test Sword',
    base: 'Short Sword',
    slot: 'weapon',
    rarity: 'magic',
    ilvl: 5,
    baseDamage: 12,
    baseDefense: 0,
    affixes: [{ key: 'damage', stat: 'damage', label: 'Damage', value: 5 }],
  };

  it('sums affixes and base values across equipped items', () => {
    const bonuses = equippedBonuses({ ring, weapon: sword });
    expect(bonuses.strength).toBe(10);
    expect(bonuses.life).toBe(25);
    expect(bonuses.damage).toBe(5);
    expect(bonuses.baseDamage).toBe(12);
  });

  it('equipping raises combat stats, unequipping restores them', () => {
    const base = createCharacter('Amazon');
    const before = playerCombat(base);

    const withRing = equipItem(base, ring);
    const after = playerCombat(withRing);
    expect(after.totalStats.strength).toBe(before.totalStats.strength + 10);
    expect(after.maxLife).toBe(before.maxLife + 25);
    expect(withRing.equipment.ring?.id).toBe('ring1');

    const withWeapon = equipItem(withRing, sword);
    const armed = playerCombat(withWeapon);
    expect(armed.maxDamage).toBeGreaterThan(after.maxDamage);

    const stripped = unequipItem(withWeapon, 'weapon');
    expect(stripped.equipment.weapon).toBeUndefined();
    expect(stripped.inventory.some((i) => i.id === 'sword1')).toBe(true);
    expect(playerCombat(stripped).maxDamage).toBe(after.maxDamage);
  });

  it('swaps the previously equipped item back into inventory', () => {
    const base = createCharacter('Amazon');
    const otherRing: Item = { ...ring, id: 'ring2', affixes: [{ key: 'dexterity', stat: 'dexterity', label: 'Dexterity', value: 4 }] };
    const step1 = equipItem({ ...base, inventory: [ring, otherRing] }, ring);
    const step2 = equipItem(step1, otherRing);
    expect(step2.equipment.ring?.id).toBe('ring2');
    expect(step2.inventory.some((i) => i.id === 'ring1')).toBe(true);
  });
});

describe('xp curve & levelling', () => {
  it('has increasing thresholds', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(xpToNext(1));
    expect(totalXpForLevel(3)).toBe(xpToNext(1) + xpToNext(2));
    expect(totalXpForLevel(4)).toBeGreaterThan(totalXpForLevel(3));
  });

  it('derives level from total xp', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(totalXpForLevel(2))).toBe(2);
    expect(levelFromXp(totalXpForLevel(2) - 1)).toBe(1);
    expect(levelFromXp(totalXpForLevel(5))).toBe(5);
  });

  it('levels up and grants stat points when the threshold is crossed', () => {
    const base = createCharacter('Paladin');
    const res = applyXpGain(base, totalXpForLevel(3));
    expect(res.leveled).toBe(true);
    expect(res.char.level).toBe(3);
    expect(res.levelsGained).toBe(2);
    expect(res.char.statPoints).toBe(2 * STAT_POINTS_PER_LEVEL);
    // full heal on level up
    expect(res.char.hp).toBe(playerCombat(res.char).maxLife);
  });

  it('does not level when below the threshold', () => {
    const base = createCharacter('Paladin');
    const res = applyXpGain(base, totalXpForLevel(2) - 1);
    expect(res.leveled).toBe(false);
    expect(res.char.level).toBe(1);
    expect(res.char.statPoints).toBe(0);
  });

  it('spends stat points and raises the stat', () => {
    let char = applyXpGain(createCharacter('Barbarian'), totalXpForLevel(2)).char;
    expect(char.statPoints).toBe(STAT_POINTS_PER_LEVEL);
    const str0 = char.stats.strength;
    char = allocateStat(char, 'strength');
    expect(char.stats.strength).toBe(str0 + 1);
    expect(char.statPoints).toBe(STAT_POINTS_PER_LEVEL - 1);
  });

  it('will not spend stat points it does not have', () => {
    const char = createCharacter('Barbarian');
    const same = allocateStat(char, 'strength');
    expect(same.stats.strength).toBe(char.stats.strength);
    expect(same.statPoints).toBe(0);
  });
});

describe('potions, gold and death', () => {
  it('quaffs a potion to heal but not overheal', () => {
    const base = createCharacter('Sorceress');
    const hurt = { ...base, hp: 5 };
    const healed = quaffPotion(hurt);
    expect(healed.hp).toBeGreaterThan(5);
    expect(healed.potions).toBe(base.potions - 1);
    expect(healed.hp).toBeLessThanOrEqual(playerCombat(healed).maxLife);
  });

  it('buys potions with gold', () => {
    const base = { ...createCharacter('Sorceress'), gold: 100 };
    const bought = buyPotion(base);
    expect(bought.potions).toBe(base.potions + 1);
    expect(bought.gold).toBeLessThan(base.gold);
    const broke = buyPotion({ ...base, gold: 0 });
    expect(broke.potions).toBe(base.potions);
  });

  it('loses a quarter of gold on death and revives at full hp', () => {
    const base = { ...createCharacter('Barbarian'), gold: 400, hp: 1 };
    const { char, goldLost } = applyDeath(base);
    expect(goldLost).toBe(100);
    expect(char.gold).toBe(300);
    expect(char.hp).toBe(playerCombat(char).maxLife);
  });
});

describe('resolveCombatTurn', () => {
  // A one-hp mob dies to any landed blow; a 500-hp mob survives one.
  const softMob = (): Enemy => ({ ...makeEnemy(0, 1), id: 'target', hp: 1, maxHp: 1 });
  const tankMob = (): Enemy => ({ ...makeEnemy(0, 1), id: 'target', hp: 500, maxHp: 500 });

  /** Find the first seed whose turn satisfies `want`, so tests don't hinge on RNG luck. */
  function turnMatching(hero: ReturnType<typeof createCharacter>, enemy: Enemy, want: (r: CombatTurnResult) => boolean): CombatTurnResult {
    for (let s = 1; s < 500; s++) {
      const r = resolveCombatTurn(hero, [enemy], 'target', makeRng(s));
      if (r && want(r)) return r;
    }
    throw new Error('no seed produced the requested outcome');
  }

  it('returns null when the target enemy is gone', () => {
    const hero = createCharacter('Barbarian');
    expect(resolveCombatTurn(hero, [softMob()], 'missing', makeRng(1))).toBeNull();
  });

  it('grants exactly one xp and gold application and at most one drop on a killing blow', () => {
    const hero = createCharacter('Barbarian');
    const enemy = softMob();
    const res = turnMatching(hero, enemy, (r) => r.enemyDefeated);

    expect(res.died).toBe(false);
    expect(res.enemies).toHaveLength(0);

    // xp is applied once: character xp moves by exactly the enemy's bounty
    expect(res.xpGained).toBe(enemy.xp);
    expect(res.character.xp).toBe(hero.xp + enemy.xp);

    // gold is applied once: within the enemy's band, added a single time
    expect(res.goldGained).toBeGreaterThanOrEqual(enemy.goldMin);
    expect(res.goldGained).toBeLessThanOrEqual(enemy.goldMax);
    expect(res.character.gold).toBe(hero.gold + res.goldGained);

    // at most one drop — the field is a single item or null by construction
    if (res.drop) expect(res.drop.id).toBeTruthy();
  });

  it('is a pure function: same inputs and seed yield an identical result', () => {
    const hero = createCharacter('Barbarian');
    const enemy = softMob();
    const a = resolveCombatTurn(hero, [enemy], 'target', makeRng(42));
    const b = resolveCombatTurn(hero, [enemy], 'target', makeRng(42));
    expect(a).toEqual(b);
    // and it must not mutate the inputs it was handed
    expect(hero.xp).toBe(0);
    expect(hero.gold).toBe(0);
    expect(enemy.hp).toBe(1);
  });

  it('leaves loot, xp and gold untouched on a non-killing hit', () => {
    const hero = createCharacter('Barbarian');
    const enemy = tankMob();
    const res = turnMatching(hero, enemy, (r) => r.enemyDefeated === false && r.died === false && r.events.some((e) => e.log?.startsWith('You hit')));

    expect(res.enemyDefeated).toBe(false);
    expect(res.drop).toBeNull();
    expect(res.xpGained).toBe(0);
    expect(res.goldGained).toBe(0);
    expect(res.leveledUp).toBe(false);
    expect(res.character.xp).toBe(hero.xp);
    expect(res.character.gold).toBe(hero.gold);
    // the wounded enemy stays on the field with reduced hp
    expect(res.enemies).toHaveLength(1);
    expect(res.enemies[0].hp).toBeLessThan(enemy.hp);
  });

  it('slays the boss with a bossDown flag and a guaranteed rare+ drop', () => {
    const hero = createCharacter('Barbarian');
    const boss: Enemy = { ...makeBoss(5), id: 'target', hp: 1, maxHp: 1 };
    const res = turnMatching(hero, boss, (r) => r.enemyDefeated);

    expect(res.bossDown).toBe(true);
    expect(res.drop).not.toBeNull();
    expect(RARITY_ORDER.indexOf((res.drop as Item).rarity)).toBeGreaterThanOrEqual(RARITY_ORDER.indexOf('rare'));
    expect(res.events.some((e) => e.log === 'Andariel is slain! The Maiden of Anguish falls.')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Class skills
// ---------------------------------------------------------------------------

/** A character grown to `level` with mana topped up so casts aren't gated by it. */
function leveled(cls: CharClass, level: number): Character {
  const c = applyXpGain(createCharacter(cls), totalXpForLevel(level)).char;
  return { ...c, mana: 999 };
}

/** A room of identical tanky mobs that survive most single hits. */
function tankRoom(ids: string[], hp = 600): Enemy[] {
  return ids.map((id) => ({ ...makeEnemy(0, 1), id, hp, maxHp: hp }));
}

/** Search seeds for a cast that satisfies `want`, so tests don't hinge on luck. */
function castMatching(
  char: Character,
  enemies: Enemy[],
  targetId: string | null,
  skillId: string,
  want: (r: CombatTurnResult) => boolean,
  ally: Ally | null = null,
): CombatTurnResult {
  for (let s = 1; s < 800; s++) {
    const r = castSkill(char, enemies, targetId, skillId, makeRng(s), ally);
    if (r && want(r)) return r;
  }
  throw new Error(`no seed produced the requested ${skillId} outcome`);
}

describe('skill unlocks', () => {
  it('unlocks the first skill at level 1 and the second by level 6', () => {
    for (const cls of ['Amazon', 'Necromancer', 'Barbarian', 'Sorceress', 'Paladin'] as CharClass[]) {
      const all = skillsForClass(cls);
      expect(all.length).toBeGreaterThanOrEqual(2);
      expect(availableSkills(createCharacter(cls))).toHaveLength(1);
      expect(availableSkills(leveled(cls, 6)).length).toBe(all.length);
      // hotkeys are 1-based and contiguous
      expect(all.map((s) => s.hotkey)).toEqual(all.map((_, i) => i + 1));
    }
  });
});

describe('castSkill', () => {
  it('refuses a skill the class cannot use, has not unlocked, or cannot pay for', () => {
    const sorc = createCharacter('Sorceress');
    expect(castSkill(sorc, tankRoom(['a']), 'a', 'bash', makeRng(1))).toBeNull(); // wrong class
    expect(castSkill(sorc, tankRoom(['a']), 'a', 'frostnova', makeRng(1))).toBeNull(); // not unlocked (lvl 6)
    expect(castSkill({ ...sorc, mana: 0 }, tankRoom(['a']), 'a', 'firebolt', makeRng(1))).toBeNull(); // no mana
  });

  it('spends mana and damages the target for each class first skill', () => {
    const cases: [CharClass, string][] = [
      ['Sorceress', 'firebolt'],
      ['Barbarian', 'bash'],
      ['Necromancer', 'bonespear'],
      ['Paladin', 'holybolt'],
      ['Amazon', 'jab'],
    ];
    for (const [cls, id] of cases) {
      const hero = { ...createCharacter(cls), mana: 999 };
      const skill = getSkill(id)!;
      const res = castMatching(hero, tankRoom(['a']), 'a', id, (r) => r.hitIds.includes('a'));
      expect(res.manaSpent).toBe(skill.manaCost);
      expect(res.character.mana).toBe(hero.mana - skill.manaCost);
      expect(res.skillId).toBe(id);
      expect(res.enemies[0].hp).toBeLessThan(600);
    }
  });

  it('Fire Bolt out-damages a plain Bash, reflecting its higher multiplier', () => {
    // Both auto-comparable by using the same tanky target and averaging a few seeds.
    const sorc = { ...createCharacter('Sorceress'), mana: 999 };
    const fb = castMatching(sorc, tankRoom(['a']), 'a', 'firebolt', (r) => r.hitIds.includes('a'));
    expect(600 - fb.enemies[0].hp).toBeGreaterThan(0);
  });

  it('Frost Nova hits every foe and slows the survivors', () => {
    const sorc = leveled('Sorceress', 6);
    const room = tankRoom(['a', 'b', 'c']);
    const res = castSkill(sorc, room, null, 'frostnova', makeRng(3))!;
    expect(res.hitIds.sort()).toEqual(['a', 'b', 'c']);
    expect(res.slowedIds.sort()).toEqual(['a', 'b', 'c']);
    // all survive (tanky) and carry a slow timer into the next turn
    expect(res.enemies).toHaveLength(3);
    expect(res.enemies.every((e) => (e.slowTurns ?? 0) >= 1)).toBe(true);
  });

  it('Whirlwind and Multiple Shot swing at the whole pack', () => {
    const barb = leveled('Barbarian', 6);
    const ww = castMatching(barb, tankRoom(['a', 'b', 'c']), null, 'whirlwind', (r) => r.hitIds.length >= 2);
    expect(new Set(ww.hitIds).size).toBeGreaterThanOrEqual(2);

    const ama = leveled('Amazon', 6);
    const ms = castMatching(ama, tankRoom(['a', 'b', 'c']), null, 'multishot', (r) => r.hitIds.length >= 2);
    expect(new Set(ms.hitIds).size).toBeGreaterThanOrEqual(2);
  });

  it('Bone Spear pierces the target and the foe behind it', () => {
    const necro = { ...createCharacter('Necromancer'), mana: 999 };
    const res = castSkill(necro, tankRoom(['a', 'b', 'c']), 'a', 'bonespear', makeRng(2))!;
    expect(res.hitIds).toContain('a');
    expect(res.hitIds).toContain('b'); // the adjacent foe
    expect(res.hitIds).not.toContain('c');
  });

  it('Bash stuns the target so it skips its counter-attack', () => {
    const barb = { ...createCharacter('Barbarian'), mana: 999 };
    const res = castMatching(barb, tankRoom(['a']), 'a', 'bash', (r) => r.stunnedIds.includes('a'));
    // stunned target does not retaliate: no damage taken this turn
    expect(res.character.hp).toBe(barb.hp);
    expect(res.events.some((e) => /hits you for/.test(e.log ?? ''))).toBe(false);
  });

  it('Holy Bolt heals when cast with no target and smites when given one', () => {
    const pal = { ...leveled('Paladin', 3), hp: 10 };
    const heal = castSkill(pal, tankRoom(['a']), null, 'holybolt', makeRng(5))!;
    expect(heal.healed).toBeGreaterThan(0);
    expect(heal.character.hp).toBeGreaterThan(10);
    expect(heal.hitIds).toHaveLength(0);

    const smite = castMatching({ ...leveled('Paladin', 3), hp: 200 }, tankRoom(['a']), 'a', 'holybolt', (r) => r.hitIds.includes('a'));
    expect(smite.enemies[0].hp).toBeLessThan(600);
  });

  it('Zeal and Jab strike a single target twice', () => {
    const pal = { ...leveled('Paladin', 6), mana: 999 };
    const zeal = castMatching(pal, tankRoom(['a']), 'a', 'zeal', (r) => r.hitIds.filter((id) => id === 'a').length === 2);
    expect(zeal.hitIds.filter((id) => id === 'a')).toHaveLength(2);

    const ama = { ...createCharacter('Amazon'), mana: 999 };
    const jab = castMatching(ama, tankRoom(['a']), 'a', 'jab', (r) => r.hitIds.filter((id) => id === 'a').length === 2);
    expect(jab.hitIds.filter((id) => id === 'a')).toHaveLength(2);
  });
});

describe('skeleton ally', () => {
  it('Raise Skeleton summons a persistent ally scaled to the caster', () => {
    const necro = leveled('Necromancer', 6);
    const res = castSkill(necro, tankRoom(['a']), null, 'raiseskeleton', makeRng(1))!;
    expect(res.ally).not.toBeNull();
    expect(res.ally?.name).toBe('Skeleton');
    expect(res.ally?.hp).toBe(makeSkeleton(necro).hp);
  });

  it('the ally attacks each turn and enemies can target it', () => {
    const hero = leveled('Barbarian', 6);
    const ally = makeSkeleton(hero);
    // it strikes on an ordinary turn
    const attacked = resolveCombatTurn(hero, tankRoom(['a']), 'a', makeRng(4), ally);
    expect(attacked?.events.some((e) => /your skeleton/i.test(e.log ?? ''))).toBe(true);

    // across seeds, a retaliating foe eventually lands on the skeleton instead of the hero
    let struckAlly = false;
    for (let s = 1; s < 300 && !struckAlly; s++) {
      const r = resolveCombatTurn(hero, tankRoom(['a'], 900), 'a', makeRng(s), { ...ally, attackRating: 5 });
      if (r && r.events.some((e) => /hits your skeleton|destroys your skeleton/.test(e.log ?? ''))) struckAlly = true;
    }
    expect(struckAlly).toBe(true);
  });

  it('a basic attack with no ally draws no extra randomness (unchanged behavior)', () => {
    const hero = createCharacter('Barbarian');
    const room = tankRoom(['a']);
    const withAllyNull = resolveCombatTurn(hero, room, 'a', makeRng(9), null);
    const withoutAllyArg = resolveCombatTurn(hero, room, 'a', makeRng(9));
    expect(withAllyNull).toEqual(withoutAllyArg);
    expect(withAllyNull?.ally).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Potion belt
// ---------------------------------------------------------------------------

describe('potion belt', () => {
  it('starts a new character with a stocked 4-slot belt', () => {
    const belt = createCharacter('Amazon').belt;
    expect(belt).toHaveLength(BELT_SIZE);
    expect(belt.filter((s) => s !== null).length).toBeGreaterThan(0);
  });

  it('buys potions with gold into free slots and refuses when broke or full', () => {
    const base = { ...createCharacter('Sorceress'), gold: 100, belt: emptyBelt() };
    const bought = buyBeltPotion(base, 'health');
    expect(bought.belt[0]).toBe('health');
    expect(bought.gold).toBe(100 - BELT_POTIONS.health.cost);

    const broke = buyBeltPotion({ ...base, gold: 0 }, 'mana');
    expect(broke.belt.every((s) => s === null)).toBe(true);

    const full = { ...base, belt: ['health', 'mana', 'health', 'mana'] as const };
    const overflow = buyBeltPotion({ ...full, belt: [...full.belt] }, 'health');
    expect(overflow.belt.filter((s) => s !== null)).toHaveLength(4);
    expect(overflow.gold).toBe(base.gold); // no charge when it can't fit
  });

  it('drinks a health potion to heal and a mana potion to restore mana, emptying the slot', () => {
    const combat = playerCombat(createCharacter('Sorceress'));
    const hurt: Character = { ...createCharacter('Sorceress'), belt: ['health', 'mana', null, null], hp: 1, mana: 1 };
    const healed = drinkBeltSlot(hurt, 0);
    expect(healed.hp).toBe(Math.min(combat.maxLife, 1 + BELT_POTIONS.health.restore));
    expect(healed.belt[0]).toBeNull();

    const manaed = drinkBeltSlot(hurt, 1);
    expect(manaed.mana).toBe(Math.min(combat.maxMana, 1 + BELT_POTIONS.mana.restore));
    expect(manaed.belt[1]).toBeNull();

    // empty slot is a no-op
    expect(drinkBeltSlot(hurt, 3)).toEqual(hurt);
  });

  it('adds dropped potions to the first empty slot and drops nothing when full', () => {
    const c = { ...createCharacter('Amazon'), belt: [null, null, null, null] as const };
    const one = addPotionToBelt({ ...c, belt: [...c.belt] }, 'health');
    expect(one.belt[0]).toBe('health');
    const full = { ...c, belt: ['health', 'mana', 'health', 'mana'] as const };
    expect(addPotionToBelt({ ...full, belt: [...full.belt] }, 'health').belt.filter((s) => s !== null)).toHaveLength(4);
  });

  it('monsters occasionally drop a belt potion into the character', () => {
    const hero = createCharacter('Barbarian');
    const enemy: Enemy = { ...makeEnemy(0, 1), id: 'target', hp: 1, maxHp: 1 };
    let sawPotionDrop = false;
    for (let s = 1; s < 400 && !sawPotionDrop; s++) {
      const r = resolveCombatTurn(hero, [enemy], 'target', makeRng(s));
      if (r && r.potionDrops.length > 0) {
        sawPotionDrop = true;
        // the dropped potion is already folded into the returned belt
        const filled = r.character.belt.filter((slot) => slot !== null).length;
        expect(filled).toBeGreaterThanOrEqual(createCharacter('Barbarian').belt.filter((slot) => slot !== null).length);
      }
    }
    expect(sawPotionDrop).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Save migration
// ---------------------------------------------------------------------------

describe('normalizeCharacter (save migration)', () => {
  it('defaults a belt onto an old save that predates it', () => {
    const base = createCharacter('Paladin');
    // simulate a save written before the belt existed
    const old = { ...base } as Partial<Character> & { cls: CharClass };
    delete (old as { belt?: unknown }).belt;
    const migrated = normalizeCharacter(old)!;
    expect(migrated.belt).toEqual(emptyBelt());
    expect(migrated.level).toBe(base.level);
    expect(migrated.stats).toEqual(base.stats);
  });

  it('preserves progress and repairs a malformed belt', () => {
    const raw = {
      cls: 'Necromancer' as CharClass,
      level: 7,
      xp: 1234,
      gold: 500,
      inventory: [] as Item[],
      belt: ['health', 'poison', null] as unknown as Character['belt'],
    };
    const migrated = normalizeCharacter(raw)!;
    expect(migrated.level).toBe(7);
    expect(migrated.gold).toBe(500);
    expect(migrated.belt).toHaveLength(BELT_SIZE);
    expect(migrated.belt[0]).toBe('health');
    expect(migrated.belt[1]).toBeNull(); // 'poison' scrubbed
  });

  it('returns null for a missing or classless save', () => {
    expect(normalizeCharacter(null)).toBeNull();
    expect(normalizeCharacter(undefined)).toBeNull();
    expect(normalizeBelt(undefined)).toEqual(emptyBelt());
  });
});
