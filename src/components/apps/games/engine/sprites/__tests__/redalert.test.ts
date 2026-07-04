import { REDALERT_SPRITES, RIFLE_INFANTRY, ROCKET_SOLDIER, TANYA, TESLA_COIL } from '../redalert';
import { validateSpriteDef, compileSprite } from '../sprite';

describe('redalert sprite sheet', () => {
  for (const [name, def] of Object.entries(REDALERT_SPRITES)) {
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

  it('ships the full Allied/Soviet cast', () => {
    expect(Object.keys(REDALERT_SPRITES).sort()).toEqual([
      'BARRACKS',
      'CON_YARD',
      'HEAVY_TANK',
      'MEDIUM_TANK',
      'ORE_CLUSTER',
      'ORE_TRUCK',
      'PILLBOX',
      'POWER_PLANT',
      'RIFLE_INFANTRY',
      'ROCKET_SOLDIER',
      'TANYA',
      'TESLA_COIL',
      'WAR_FACTORY',
    ]);
  });

  it('animates the infantry, the hero and the crackling Tesla Coil', () => {
    // Two-frame walk cycles for the foot soldiers and Tanya.
    expect(RIFLE_INFANTRY.frames).toHaveLength(2);
    expect(ROCKET_SOLDIER.frames).toHaveLength(2);
    expect(TANYA.frames).toHaveLength(2);
    // The Tesla Coil holds two frames so the head can crackle.
    expect(TESLA_COIL.frames).toHaveLength(2);
    expect(TESLA_COIL.frames[0][0].length).toBe(12);
    expect(TESLA_COIL.frames[0].length).toBe(24);
  });
});
