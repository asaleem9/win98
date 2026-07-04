import { AOE2_SPRITES, TOWN_CENTER, VILLAGER } from '../aoe2';
import { validateSpriteDef, compileSprite } from '../sprite';

describe('aoe2 sprite sheet', () => {
  for (const [name, def] of Object.entries(AOE2_SPRITES)) {
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

  it('ships the full medieval cast: units, buildings, and map props', () => {
    for (const key of [
      'VILLAGER', 'MILITIA', 'MAN_AT_ARMS', 'ARCHER', 'KNIGHT',
      'TOWN_CENTER', 'HOUSE', 'BARRACKS', 'ARCHERY_RANGE', 'STABLE', 'FARM', 'WATCH_TOWER',
      'BERRY_BUSH', 'TREE_CLUSTER',
    ]) {
      expect(AOE2_SPRITES[key]).toBeDefined();
    }
    expect(Object.keys(AOE2_SPRITES).length).toBeGreaterThanOrEqual(14);
  });

  it('mobile units carry a second frame for the walk cycle', () => {
    for (const key of ['VILLAGER', 'MILITIA', 'MAN_AT_ARMS', 'ARCHER', 'KNIGHT']) {
      expect(AOE2_SPRITES[key].frames.length).toBe(2);
    }
  });

  it('the Town Center reads as a wide isometric keep (roughly 2:1)', () => {
    const w = TOWN_CENTER.frames[0][0].length;
    const h = TOWN_CENTER.frames[0].length;
    expect(w).toBeGreaterThan(h);
    expect(w).toBeGreaterThanOrEqual(30);
  });

  it('villagers are authored with faction chars so the engine can recolor them', () => {
    const flat = VILLAGER.frames.flat().join('');
    expect(flat).toMatch(/R/); // faction light
    expect(flat).toMatch(/r/); // faction mid
  });
});
