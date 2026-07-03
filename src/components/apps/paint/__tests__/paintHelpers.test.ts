import {
  invertImageData,
  flipImageDataHorizontal,
  flipImageDataVertical,
  isDataUrl,
  buildFileName,
  rgbToHex,
} from '../paintHelpers';

describe('invertImageData', () => {
  it('inverts rgb channels and leaves alpha alone', () => {
    const data = new Uint8ClampedArray([0, 128, 255, 255, 10, 20, 30, 100]);
    invertImageData(data);
    expect(Array.from(data)).toEqual([255, 127, 0, 255, 245, 235, 225, 100]);
  });

  it('handles empty data', () => {
    const data = new Uint8ClampedArray([]);
    expect(() => invertImageData(data)).not.toThrow();
  });
});

describe('flipImageDataHorizontal', () => {
  it('mirrors a 2x1 row', () => {
    // two pixels: red, blue
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);
    const img = { data, width: 2, height: 1 };
    flipImageDataHorizontal(img);
    expect(Array.from(data)).toEqual([0, 0, 255, 255, 255, 0, 0, 255]);
  });

  it('leaves odd-width middle column untouched', () => {
    const data = new Uint8ClampedArray([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
    const img = { data, width: 3, height: 1 };
    flipImageDataHorizontal(img);
    expect(Array.from(data)).toEqual([3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1]);
  });
});

describe('flipImageDataVertical', () => {
  it('mirrors a 1x2 column', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);
    const img = { data, width: 1, height: 2 };
    flipImageDataVertical(img);
    expect(Array.from(data)).toEqual([0, 0, 255, 255, 255, 0, 0, 255]);
  });
});

describe('isDataUrl', () => {
  it('recognizes data urls', () => {
    expect(isDataUrl('data:image/png;base64,abc')).toBe(true);
  });

  it('rejects plain strings and non-strings', () => {
    expect(isDataUrl('hello world')).toBe(false);
    expect(isDataUrl('')).toBe(false);
  });
});

describe('buildFileName', () => {
  it('appends .bmp when missing', () => {
    expect(buildFileName('drawing')).toBe('drawing.bmp');
  });

  it('replaces an existing extension', () => {
    expect(buildFileName('drawing.png')).toBe('drawing.bmp');
  });

  it('falls back to Untitled for blank input', () => {
    expect(buildFileName('   ')).toBe('Untitled.bmp');
  });
});

describe('rgbToHex', () => {
  it('converts rgb components to hex', () => {
    expect(rgbToHex(0, 128, 255)).toBe('#0080ff');
  });

  it('clamps out-of-range values', () => {
    expect(rgbToHex(-10, 300, 128)).toBe('#00ff80');
  });
});
