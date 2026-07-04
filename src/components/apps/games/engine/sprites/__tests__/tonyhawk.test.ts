import { TONYHAWK_SPRITES } from '../tonyhawk';
import { validateSpriteDef, compileSprite } from '../sprite';

describe('tony hawk sprite sheet', () => {
  for (const [name, def] of Object.entries(TONYHAWK_SPRITES)) {
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

    it(`${name} is a 16x24 skater frame`, () => {
      expect(def.frames[0][0].length).toBe(16);
      expect(def.frames[0].length).toBe(24);
    });
  }

  it('covers every pose the run draws', () => {
    expect(Object.keys(TONYHAWK_SPRITES).sort()).toEqual([
      'SKATER_900',
      'SKATER_BAIL',
      'SKATER_CROUCH',
      'SKATER_GRAB',
      'SKATER_GRIND',
      'SKATER_KICKFLIP',
      'SKATER_MANUAL',
      'SKATER_OLLIE',
      'SKATER_PUSH',
    ]);
  });

  it('animates the push, kickflip and bail across two frames', () => {
    expect(TONYHAWK_SPRITES.SKATER_PUSH.frames).toHaveLength(2);
    expect(TONYHAWK_SPRITES.SKATER_KICKFLIP.frames).toHaveLength(2);
    expect(TONYHAWK_SPRITES.SKATER_BAIL.frames).toHaveLength(2);
  });
});
