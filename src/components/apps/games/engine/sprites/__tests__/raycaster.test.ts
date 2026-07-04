import { validateSpriteDef } from '../sprite';
import { RAYCASTER_HUD_SPRITES, HUD_FACE } from '../raycaster';

describe('raycaster HUD sprites', () => {
  for (const [name, def] of Object.entries(RAYCASTER_HUD_SPRITES)) {
    it(`${name} is a clean sprite def`, () => {
      expect(validateSpriteDef(def)).toEqual([]);
    });
  }

  it('mugshot carries a frame for every health tier', () => {
    // healthy / hurt / critical / dead
    expect(HUD_FACE.frames).toHaveLength(4);
  });
});
