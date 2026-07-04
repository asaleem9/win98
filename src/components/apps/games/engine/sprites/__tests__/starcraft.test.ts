import { STARCRAFT_SPRITES } from '../starcraft';
import { validateSpriteDef, compileSprite } from '../sprite';

describe('starcraft sprite sheet', () => {
  for (const [name, def] of Object.entries(STARCRAFT_SPRITES)) {
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

  it('sizes the Terran-vs-Zerg cast as documented', () => {
    // small units (12-16px), 2-frame walkers animate
    expect(MARINE_SIZE()).toEqual([12, 14]);
    expect(STARCRAFT_SPRITES.MARINE.frames).toHaveLength(2);
    expect(STARCRAFT_SPRITES.ZERGLING.frames).toHaveLength(2);
    expect(STARCRAFT_SPRITES.HYDRALISK.frames).toHaveLength(2);
    // buildings sit in the 20-28px band
    expect(STARCRAFT_SPRITES.COMMAND_CENTER.frames[0][0].length).toBe(28);
    expect(STARCRAFT_SPRITES.SUNKEN_COLONY.frames[0][0].length).toBe(20);
  });

  it('ships the full unit, building and prop roster', () => {
    expect(Object.keys(STARCRAFT_SPRITES).sort()).toEqual([
      'BARRACKS',
      'COMMAND_CENTER',
      'DEPOT',
      'FACTORY',
      'FIREBAT',
      'GAS_GEYSER',
      'HYDRALISK',
      'MARINE',
      'MEDIC',
      'MINERAL_CRYSTAL',
      'MISSILE_TURRET',
      'REFINERY',
      'SCV',
      'SIEGE_TANK',
      'SUNKEN_COLONY',
      'ZERGLING',
    ]);
  });
});

function MARINE_SIZE(): [number, number] {
  const f = STARCRAFT_SPRITES.MARINE.frames[0];
  return [f[0].length, f.length];
}
