import { PINBALL_SPRITES } from '../pinball';
import { validateSpriteDef, compileSprite } from '../sprite';

describe('pinball sprite sheet', () => {
  for (const [name, def] of Object.entries(PINBALL_SPRITES)) {
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

  it('exposes the table props the app draws', () => {
    expect(Object.keys(PINBALL_SPRITES).sort()).toEqual(['BUMPER_CAP', 'KICKER', 'MISSION_LIGHT', 'SPINNER']);
  });

  it('gives the bumper cap an unlit and a lit frame', () => {
    expect(PINBALL_SPRITES.BUMPER_CAP.frames).toHaveLength(2);
  });

  it('gives the spinner four rotation frames', () => {
    expect(PINBALL_SPRITES.SPINNER.frames).toHaveLength(4);
  });
});
