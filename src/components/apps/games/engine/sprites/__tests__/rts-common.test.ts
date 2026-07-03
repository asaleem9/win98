import { RTS_COMMON_SPRITES } from '../rts-common';
import { validateSpriteDef, compileSprite } from '../sprite';

describe('rts-common sprite sheet', () => {
  for (const [name, def] of Object.entries(RTS_COMMON_SPRITES)) {
    it(`${name} validates clean`, () => {
      expect(validateSpriteDef(def)).toEqual([]);
    });

    it(`${name} compiles to the expected strip size`, () => {
      const s = compileSprite(def);
      expect(s.frameWidth).toBe(def.frames[0][0].length);
      expect(s.frameHeight).toBe(def.frames[0].length);
      expect(s.frameCount).toBe(def.frames.length);
      expect(s.canvas.width).toBe(s.frameWidth * s.frameCount);
    });
  }

  it('ships the combat + world sprites the engine draws', () => {
    expect(Object.keys(RTS_COMMON_SPRITES).sort()).toEqual([
      'CARGO_CHIP',
      'CORPSE',
      'EXPLOSION',
      'MUZZLE_FLASH',
      'PROJECTILE',
      'RUBBLE',
      'SCAFFOLD',
      'SELECTION_RING',
      'SHADOW_BLOB',
    ]);
  });
});
