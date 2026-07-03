import { SIMCITY_SPRITES, ROAD_TILES, zoneSprite, roadSprite, RES_1, RES_3 } from '../simcity';
import { validateSpriteDef, compileSprite } from '../sprite';

describe('simcity sprite sheet', () => {
  for (const [name, def] of Object.entries(SIMCITY_SPRITES)) {
    it(`${name} validates clean`, () => {
      expect(validateSpriteDef(def)).toEqual([]);
    });

    it(`${name} compiles to a rectangular strip`, () => {
      const s = compileSprite(def);
      expect(s.frameWidth).toBe(def.frames[0][0].length);
      expect(s.frameHeight).toBe(def.frames[0].length);
      expect(s.canvas.width).toBe(s.frameWidth * s.frameCount);
    });
  }

  it('ground tiles are the 32x16 iso size', () => {
    for (const name of ['GROUND_GRASS', 'GROUND_DIRT', 'GROUND_WATER']) {
      const def = SIMCITY_SPRITES[name];
      expect(def.frames[0][0].length).toBe(32);
      expect(def.frames[0].length).toBe(16);
    }
  });

  it('exposes all 16 road connection variants', () => {
    expect(ROAD_TILES).toHaveLength(16);
    for (const def of ROAD_TILES) {
      expect(def.frames[0][0].length).toBe(32);
      expect(def.frames[0].length).toBe(16);
    }
  });

  it('roadSprite masks off out-of-range bits', () => {
    expect(roadSprite(15)).toBe(ROAD_TILES[15]);
    expect(roadSprite(16 | 3)).toBe(ROAD_TILES[3]);
  });

  it('zoneSprite maps development level to a density stage', () => {
    expect(zoneSprite('residential', 1)).toBe(RES_1);
    expect(zoneSprite('residential', 2)).toBe(RES_1);
    expect(zoneSprite('residential', 3)).not.toBe(RES_1);
    expect(zoneSprite('residential', 5)).toBe(RES_3);
  });

  it('buildings carry a lit-window char for the unpowered recolor', () => {
    const hasWindow = RES_3.frames[0].some((row) => row.includes('L'));
    expect(hasWindow).toBe(true);
  });
});
