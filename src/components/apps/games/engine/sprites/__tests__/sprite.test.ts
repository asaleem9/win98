import {
  validateSpriteDef,
  compileSprite,
  animFrame,
  type SpriteDef,
} from '../sprite';

const good: SpriteDef = {
  palette: { k: '#000', w: '#fff' },
  frames: [
    ['kw', 'wk'],
    ['ww', 'kk'],
  ],
};

describe('validateSpriteDef', () => {
  it('accepts a clean def', () => {
    expect(validateSpriteDef(good)).toEqual([]);
  });

  it('flags empty frames', () => {
    expect(validateSpriteDef({ palette: { k: '#000' }, frames: [] }).length).toBeGreaterThan(0);
  });

  it('flags a frame with no rows', () => {
    const errs = validateSpriteDef({ palette: { k: '#000' }, frames: [[]] });
    expect(errs.some((e) => /no rows/.test(e))).toBe(true);
  });

  it('flags unequal row lengths within a frame', () => {
    const errs = validateSpriteDef({ palette: { k: '#000' }, frames: [['kk', 'k']] });
    expect(errs.some((e) => /wide/.test(e))).toBe(true);
  });

  it('flags frames with mismatched dimensions', () => {
    const errs = validateSpriteDef({
      palette: { k: '#000' },
      frames: [['kk', 'kk'], ['kkk', 'kkk']],
    });
    expect(errs.some((e) => /expected 2x2/.test(e))).toBe(true);
  });

  it('flags chars missing from the palette', () => {
    const errs = validateSpriteDef({ palette: { k: '#000' }, frames: [['kx']] });
    expect(errs.some((e) => /'x'.*missing/.test(e))).toBe(true);
  });

  it("flags '.' defined in the palette", () => {
    const errs = validateSpriteDef({ palette: { '.': '#000', k: '#000' }, frames: [['k']] });
    expect(errs.some((e) => /reserved/.test(e))).toBe(true);
  });

  it('treats . in frames as transparent, not a missing char', () => {
    expect(validateSpriteDef({ palette: { k: '#000' }, frames: [['k.', '.k']] })).toEqual([]);
  });
});

describe('animFrame', () => {
  it('advances at fps and wraps', () => {
    expect(animFrame(0, 10, 4)).toBe(0);
    expect(animFrame(0.05, 10, 4)).toBe(0);
    expect(animFrame(0.1, 10, 4)).toBe(1);
    expect(animFrame(0.3, 10, 4)).toBe(3);
    expect(animFrame(0.4, 10, 4)).toBe(0); // 4 % 4
    expect(animFrame(0.95, 10, 4)).toBe(1); // 9 % 4
  });

  it('guards zero frame count', () => {
    expect(animFrame(1, 10, 0)).toBe(0);
  });

  it('never returns a negative index', () => {
    expect(animFrame(-0.25, 10, 4)).toBeGreaterThanOrEqual(0);
  });
});

describe('compileSprite', () => {
  it('sizes the strip canvas correctly', () => {
    const s = compileSprite(good);
    expect(s.frameCount).toBe(2);
    expect(s.frameWidth).toBe(2);
    expect(s.frameHeight).toBe(2);
    expect(s.canvas.width).toBe(4); // 2 frames * 2px
    expect(s.canvas.height).toBe(2);
  });

  it('bakes scale into the dimensions', () => {
    const s = compileSprite(good, { scale: 3 });
    expect(s.frameWidth).toBe(6);
    expect(s.frameHeight).toBe(6);
    expect(s.canvas.width).toBe(12);
  });

  it('caches by def identity and opts', () => {
    const a = compileSprite(good, { scale: 2 });
    const b = compileSprite(good, { scale: 2 });
    expect(a).toBe(b);
    const c = compileSprite(good, { scale: 4 });
    expect(c).not.toBe(a);
  });

  it('draws pixels when a 2d context is available', () => {
    const s = compileSprite(good);
    const ctx = s.canvas.getContext('2d');
    if (!ctx) return; // jsdom has no 2d context — dimensions were still asserted above
    const { data } = ctx.getImageData(0, 0, 1, 1);
    expect(data[3]).toBeGreaterThan(0); // top-left cell 'k' is opaque
  });
});
