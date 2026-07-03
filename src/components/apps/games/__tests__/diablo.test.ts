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
  STAT_POINTS_PER_LEVEL,
  BOSS_LEVEL,
  RARITY_ORDER,
  type Item,
  type Rarity,
  type Combatant,
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
