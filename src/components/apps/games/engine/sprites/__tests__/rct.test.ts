import { RCT_SPRITES, GROUND_GRASS, GROUND_PATH, GROUND_WATER, GROUND_FLOWER } from '../rct';
import { validateSpriteDef, compileSprite } from '../sprite';

describe('rct sprite sheet', () => {
  for (const [name, def] of Object.entries(RCT_SPRITES)) {
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

  it('ground tiles are all 32x16 diamonds', () => {
    for (const g of [GROUND_GRASS, GROUND_PATH, GROUND_WATER, GROUND_FLOWER]) {
      expect(g.frames[0][0].length).toBe(32);
      expect(g.frames[0].length).toBe(16);
    }
  });

  it('ships a full living-park inventory', () => {
    // Peeps in every state, the puke/sweep pair, track + train, stalls and decor.
    for (const key of [
      'PEEP_WALK', 'PEEP_RIDE', 'PEEP_DIZZY', 'PEEP_VOMIT', 'PEEP_SIT',
      'HANDYMAN_WALK', 'HANDYMAN_SWEEP', 'VOMIT_PUDDLE',
      'TRAIN_CAR_SE', 'TRAIN_CAR_SW', 'TRAIN_CAR_NE', 'TRAIN_CAR_NW',
      'STALL_FOOD', 'STALL_DRINK', 'STALL_BALLOON', 'COIN',
    ]) {
      expect(RCT_SPRITES[key]).toBeDefined();
    }
    expect(Object.keys(RCT_SPRITES).length).toBeGreaterThanOrEqual(35);
  });

  it('walking peeps have two frames for the stride', () => {
    expect(RCT_SPRITES.PEEP_WALK.frames.length).toBe(2);
    expect(RCT_SPRITES.HANDYMAN_WALK.frames.length).toBe(2);
  });
});
