import { buildWallTextures, packRGB, shade, TEX_SIZE, WALL, isDoorId } from '../texture';

describe('procedural wall textures', () => {
  it('builds a full-size texture for every material', () => {
    const tex = buildWallTextures();
    for (const id of [WALL.BRICK, WALL.STONE, WALL.METAL, WALL.CIRCUIT, WALL.DOOR, WALL.DOOR_SILVER, WALL.DOOR_GOLD, WALL.EXIT]) {
      expect(tex[id]).toBeInstanceOf(Uint32Array);
      expect(tex[id]).toHaveLength(TEX_SIZE * TEX_SIZE);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = buildWallTextures(1234);
    const b = buildWallTextures(1234);
    expect(Array.from(a[WALL.BRICK])).toEqual(Array.from(b[WALL.BRICK]));
    // A different seed produces different pixels.
    const c = buildWallTextures(5678);
    expect(Array.from(a[WALL.BRICK])).not.toEqual(Array.from(c[WALL.BRICK]));
  });

  it('fills every texel with an opaque colour', () => {
    const tex = buildWallTextures();
    const brick = tex[WALL.BRICK];
    for (let i = 0; i < brick.length; i += 257) {
      expect((brick[i] >>> 24) & 0xff).toBe(255); // alpha
    }
  });

  it('packs and shades colours without overflowing a channel', () => {
    const white = packRGB(255, 255, 255);
    const dark = shade(white, 0.5);
    expect(dark & 0xff).toBe(127); // 255*0.5 truncates to 127 when packed
    const clamped = shade(white, 2);
    expect(clamped & 0xff).toBe(255); // never exceeds 255
  });

  it('recognises door wall ids', () => {
    expect(isDoorId(WALL.DOOR)).toBe(true);
    expect(isDoorId(WALL.DOOR_SILVER)).toBe(true);
    expect(isDoorId(WALL.BRICK)).toBe(false);
  });
});
