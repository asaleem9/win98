import {
  DIABLO_SPRITES,
  MONSTER_SPRITES,
  CLASS_PORTRAITS,
  POTION_ICONS,
  MON_ANDARIEL,
  iconForItem,
  spriteForEnemy,
} from '../diablo';
import { validateSpriteDef, compileSprite } from '../sprite';

describe('diablo sprite sheet', () => {
  for (const [name, def] of Object.entries(DIABLO_SPRITES)) {
    it(`${name} validates clean`, () => {
      expect(validateSpriteDef(def)).toEqual([]);
    });

    it(`${name} compiles to a strip of the frame size`, () => {
      const s = compileSprite(def);
      expect(s.frameWidth).toBe(def.frames[0][0].length);
      expect(s.frameHeight).toBe(def.frames[0].length);
      expect(s.frameCount).toBe(def.frames.length);
      expect(s.canvas.width).toBe(s.frameWidth * s.frameCount);
    });
  }

  it('sizes creatures, the boss and icons as documented', () => {
    // monsters 24x24 with idle + bob + flash
    const zombie = MONSTER_SPRITES.Zombie;
    expect(zombie.frames[0][0].length).toBe(24);
    expect(zombie.frames[0].length).toBe(24);
    expect(zombie.frames).toHaveLength(3);

    // boss 32x32 with two aura frames + flash
    expect(MON_ANDARIEL.frames[0][0].length).toBe(32);
    expect(MON_ANDARIEL.frames[0].length).toBe(32);
    expect(MON_ANDARIEL.frames).toHaveLength(3);

    // item icons 12x12, single frame
    expect(POTION_ICONS.health.frames[0][0].length).toBe(12);
    expect(POTION_ICONS.health.frames).toHaveLength(1);

    // portraits 16x16
    expect(CLASS_PORTRAITS.Sorceress.frames[0][0].length).toBe(16);
  });

  it('covers every enemy name and every class', () => {
    for (const name of ['Fallen', 'Zombie', 'Skeleton', 'Quill Rat', 'Corrupt Rogue']) {
      expect(spriteForEnemy(name, false)).toBe(MONSTER_SPRITES[name]);
    }
    expect(spriteForEnemy('anything', true)).toBe(MON_ANDARIEL);
    expect(Object.keys(CLASS_PORTRAITS).sort()).toEqual([
      'Amazon',
      'Barbarian',
      'Necromancer',
      'Paladin',
      'Sorceress',
    ]);
  });

  it('maps weapon bases to fitting icons', () => {
    expect(iconForItem({ slot: 'weapon', base: 'Hand Axe' })).not.toBe(iconForItem({ slot: 'weapon', base: 'Short Sword' }));
    expect(iconForItem({ slot: 'weapon', base: 'War Hammer' })).toBe(iconForItem({ slot: 'weapon', base: 'Mace' }));
    expect(iconForItem({ slot: 'armor', base: 'Chain Mail' })).toBe(DIABLO_SPRITES.ICON_ARMOR);
    expect(iconForItem({ slot: 'helm', base: 'Full Helm' })).toBe(DIABLO_SPRITES.ICON_HELM);
    expect(iconForItem({ slot: 'ring', base: 'Ring' })).toBe(DIABLO_SPRITES.ICON_RING);
    expect(iconForItem({ slot: 'amulet', base: 'Amulet' })).toBe(DIABLO_SPRITES.ICON_AMULET);
  });
});
