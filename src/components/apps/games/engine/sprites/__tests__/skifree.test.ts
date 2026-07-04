import { SKIFREE_SPRITES } from '../skifree';
import { validateSpriteDef, compileSprite } from '../sprite';

describe('skifree sprite sheet', () => {
  for (const [name, def] of Object.entries(SKIFREE_SPRITES)) {
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

  it('ships the whole downhill cast the app draws', () => {
    expect(Object.keys(SKIFREE_SPRITES).sort()).toEqual([
      'DOG',
      'FLAG_BLUE',
      'FLAG_RED',
      'JUMP',
      'LIFT_CHAIR',
      'LIFT_TOWER',
      'MOGUL',
      'OTHER_SKIER',
      'ROCK',
      'SKIER_AIR',
      'SKIER_CRASH',
      'SKIER_DOWN',
      'SKIER_SIDE',
      'SKIER_TUCK',
      'SNOWBOARDER',
      'STUMP',
      'TREE_DEAD',
      'TREE_PINE',
      'TREE_SNOWY',
      'YETI_EAT',
      'YETI_RUN',
    ]);
  });

  it('animates the yeti and dog with two frames each', () => {
    expect(SKIFREE_SPRITES.YETI_RUN.frames).toHaveLength(2);
    expect(SKIFREE_SPRITES.YETI_EAT.frames).toHaveLength(2);
    expect(SKIFREE_SPRITES.DOG.frames).toHaveLength(2);
  });
});
