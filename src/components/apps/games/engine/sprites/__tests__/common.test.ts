import { COMMON_SPRITES } from '../common';
import { validateSpriteDef, compileSprite } from '../sprite';

describe('common sprite sheet', () => {
  for (const [name, def] of Object.entries(COMMON_SPRITES)) {
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

  it('exposes the four canonical sprites', () => {
    expect(Object.keys(COMMON_SPRITES).sort()).toEqual([
      'EXPLOSION',
      'SELECTION_RING',
      'SHADOW_BLOB',
      'TREE',
    ]);
  });
});
