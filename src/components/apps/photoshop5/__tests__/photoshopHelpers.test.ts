import {
  invertPixels,
  boxBlurPixels,
  convolve3x3,
  sharpenPixels,
  embossPixels,
  findEdgesPixels,
  mosaicPixels,
  addNoisePixels,
  adjustBrightnessContrast,
  adjustHueSaturation,
  hexToRgb,
  rgbToHex,
  rectMask,
  polygonMask,
  magicWandMask,
  maskBounds,
  selectionBoundary,
  isSelected,
  clipToSelection,
  floodFill,
  linearGradient,
  blendChannel,
  compositePixel,
  nextLayerName,
  duplicatedName,
  addLayer,
  removeLayer,
  reorderLayers,
  serializePsd,
  deserializePsd,
  PsLayer,
  PsdDocument,
} from '../photoshopHelpers';

// Small helper: build a flat RGBA buffer of one color.
function solid(w: number, h: number, r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
  }
  return data;
}

const bg = (opacity = 100): PsLayer => ({ id: 'a', name: 'Background', visible: true, opacity, blend: 'normal' });

describe('color helpers', () => {
  it('parses #rrggbb and #rgb', () => {
    expect(hexToRgb('#ff8800')).toEqual([255, 136, 0]);
    expect(hexToRgb('#f80')).toEqual([255, 136, 0]);
  });
  it('falls back to black on garbage', () => {
    expect(hexToRgb('nope')).toEqual([0, 0, 0]);
  });
  it('round-trips through rgbToHex', () => {
    expect(rgbToHex(...hexToRgb('#123456'))).toBe('#123456');
  });
});

describe('invertPixels', () => {
  it('inverts RGB channels and leaves alpha untouched', () => {
    const data = Uint8ClampedArray.from([0, 128, 255, 255, 255, 0, 0, 128]);
    invertPixels(data);
    expect(Array.from(data)).toEqual([255, 127, 0, 255, 0, 255, 255, 128]);
  });
});

describe('boxBlurPixels', () => {
  it('leaves a flat image unchanged', () => {
    const data = solid(3, 3, 100, 150, 200);
    boxBlurPixels(data, 3, 3, 1);
    expect(data[0]).toBe(100);
    expect(data[1]).toBe(150);
    expect(data[2]).toBe(200);
  });
  it('smooths a sharp edge', () => {
    const data = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255]);
    boxBlurPixels(data, 3, 1, 1);
    expect(data[4]).toBeGreaterThan(0);
    expect(data[4]).toBeLessThan(255);
  });
});

describe('convolution filters', () => {
  it('sharpen identity kernel keeps a flat image flat', () => {
    const data = solid(3, 3, 120, 120, 120);
    sharpenPixels(data, 3, 3);
    // center weight 5 minus 4 neighbors of equal value = same value
    expect(data[16]).toBe(120);
  });
  it('emboss renders a flat image as neutral grey', () => {
    const data = solid(3, 3, 100, 100, 100);
    embossPixels(data, 3, 3);
    // sum of kernel weights is 0, so flat input -> offset (128)
    expect(data[16]).toBe(128);
  });
  it('find edges produces black on a flat image', () => {
    const data = solid(3, 3, 90, 90, 90);
    findEdgesPixels(data, 3, 3);
    expect(data[16]).toBe(0);
  });
  it('convolve3x3 gray writes equal channels', () => {
    const data = solid(2, 2, 10, 200, 50);
    convolve3x3(data, 2, 2, [0, 0, 0, 0, 1, 0, 0, 0, 0], 1, 0, true);
    expect(data[0]).toBe(data[1]);
    expect(data[1]).toBe(data[2]);
  });
});

describe('mosaicPixels', () => {
  it('replaces a block with its average', () => {
    // 2x1 image, two colors — cellSize 2 averages both into one color.
    const data = new Uint8ClampedArray([0, 0, 0, 255, 100, 100, 100, 255]);
    mosaicPixels(data, 2, 1, 2);
    expect(data[0]).toBe(50);
    expect(data[4]).toBe(50);
  });
});

describe('addNoisePixels', () => {
  it('is deterministic with an injected rng', () => {
    const data = solid(1, 1, 100, 100, 100);
    addNoisePixels(data, 10, () => 1); // (1*2-1)*10 = +10
    expect(data[0]).toBe(110);
    expect(data[3]).toBe(255); // alpha untouched
  });
  it('a mid rng leaves pixels unchanged', () => {
    const data = solid(1, 1, 100, 100, 100);
    addNoisePixels(data, 10, () => 0.5);
    expect(data[0]).toBe(100);
  });
});

describe('adjustBrightnessContrast', () => {
  it('is the identity at zero', () => {
    const data = solid(1, 1, 90, 130, 200);
    adjustBrightnessContrast(data, 0, 0);
    expect(Array.from(data.slice(0, 3))).toEqual([90, 130, 200]);
  });
  it('brightness up lightens', () => {
    const data = solid(1, 1, 100, 100, 100);
    adjustBrightnessContrast(data, 50, 0);
    expect(data[0]).toBeGreaterThan(100);
  });
  it('high contrast pushes toward extremes', () => {
    const data = new Uint8ClampedArray([100, 100, 100, 255, 200, 200, 200, 255]);
    adjustBrightnessContrast(data, 0, 100);
    expect(data[0]).toBe(0);
    expect(data[4]).toBe(255);
  });
});

describe('adjustHueSaturation', () => {
  it('fully desaturates to greyscale', () => {
    const data = solid(1, 1, 200, 50, 20);
    adjustHueSaturation(data, 0, -100, 0);
    expect(data[0]).toBe(data[1]);
    expect(data[1]).toBe(data[2]);
  });
  it('rotates red toward green', () => {
    const data = solid(1, 1, 255, 0, 0);
    adjustHueSaturation(data, 120, 0, 0);
    expect(data[1]).toBeGreaterThan(data[0]);
    expect(data[1]).toBeGreaterThan(data[2]);
  });
});

describe('rectMask', () => {
  it('marks pixels inside the rect only', () => {
    const mask = rectMask(1, 1, 2, 2, 4, 4);
    expect(mask[0]).toBe(0);
    expect(mask[1 * 4 + 1]).toBe(1);
    expect(mask[2 * 4 + 2]).toBe(1);
    expect(mask[3 * 4 + 3]).toBe(0);
  });
  it('clamps out-of-bounds rects', () => {
    const mask = rectMask(-5, -5, 100, 100, 3, 3);
    expect(mask.every((v) => v === 1)).toBe(true);
  });
});

describe('polygonMask', () => {
  it('fills the interior of a square', () => {
    const mask = polygonMask([{ x: 1, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 4 }, { x: 1, y: 4 }], 6, 6);
    expect(mask[2 * 6 + 2]).toBe(1);
    expect(mask[0]).toBe(0);
  });
  it('returns an empty mask for degenerate paths', () => {
    const mask = polygonMask([{ x: 0, y: 0 }, { x: 1, y: 1 }], 4, 4);
    expect(mask.every((v) => v === 0)).toBe(true);
  });
});

describe('magicWandMask', () => {
  it('selects the contiguous region within tolerance', () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 255, 10, 10, 10, 255, 255, 255, 255, 255,
    ]);
    const wide = magicWandMask(data, 3, 1, 0, 0, 20);
    expect(Array.from(wide)).toEqual([1, 1, 0]);
    const narrow = magicWandMask(data, 3, 1, 0, 0, 0);
    expect(Array.from(narrow)).toEqual([1, 0, 0]);
  });
});

describe('maskBounds', () => {
  it('finds the tight bounding box', () => {
    const mask = rectMask(1, 2, 2, 1, 5, 5);
    expect(maskBounds(mask, 5, 5)).toEqual({ x: 1, y: 2, w: 2, h: 1 });
  });
  it('returns null for empty masks', () => {
    expect(maskBounds(new Uint8Array(9), 3, 3)).toBeNull();
  });
});

describe('selectionBoundary', () => {
  it('reports every pixel of a 2x2 fill as a boundary', () => {
    const mask = rectMask(0, 0, 2, 2, 2, 2); // 2x2 -> all four pixels are edges
    const b = selectionBoundary(mask, 2, 2);
    expect(b.length).toBe(2 * 2 * 2);
  });
  it('excludes fully-surrounded interior pixels', () => {
    const big = rectMask(0, 0, 5, 5, 5, 5);
    const b = selectionBoundary(big, 5, 5);
    // interior pixel (2,2) should not be in the boundary
    let hasCenter = false;
    for (let i = 0; i < b.length; i += 2) if (b[i] === 2 && b[i + 1] === 2) hasCenter = true;
    expect(hasCenter).toBe(false);
  });
});

describe('isSelected', () => {
  it('treats a null mask as everywhere', () => {
    expect(isSelected(null, 3, 4, 10)).toBe(true);
  });
  it('reads the mask value', () => {
    const mask = rectMask(0, 0, 1, 1, 2, 2);
    expect(isSelected(mask, 0, 0, 2)).toBe(true);
    expect(isSelected(mask, 1, 1, 2)).toBe(false);
  });
});

describe('clipToSelection', () => {
  it('restores pixels outside the mask', () => {
    const original = solid(2, 1, 10, 20, 30);
    const edited = solid(2, 1, 99, 99, 99);
    const mask = new Uint8Array([1, 0]); // keep pixel 0's edit, revert pixel 1
    clipToSelection(edited, original, mask);
    expect(Array.from(edited.slice(0, 4))).toEqual([99, 99, 99, 255]);
    expect(Array.from(edited.slice(4, 8))).toEqual([10, 20, 30, 255]);
  });
  it('is a no-op for a null mask', () => {
    const edited = solid(1, 1, 99, 99, 99);
    clipToSelection(edited, solid(1, 1, 0, 0, 0), null);
    expect(edited[0]).toBe(99);
  });
});

describe('floodFill', () => {
  it('fills contiguous pixels within tolerance and returns the count', () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 255, 10, 10, 10, 255, 255, 255, 255, 255,
    ]);
    const count = floodFill(data, 3, 1, 0, 0, [1, 2, 3, 255], 20);
    expect(count).toBe(2);
    expect(Array.from(data.slice(0, 4))).toEqual([1, 2, 3, 255]);
    expect(Array.from(data.slice(8, 12))).toEqual([255, 255, 255, 255]);
  });
  it('respects a clipping mask', () => {
    const data = solid(3, 1, 0, 0, 0);
    const mask = new Uint8Array([1, 0, 1]); // pixel 1 blocks the flood
    const count = floodFill(data, 3, 1, 0, 0, [5, 5, 5, 255], 255, mask);
    expect(count).toBe(1);
    expect(data[0]).toBe(5);
    expect(data[8]).toBe(0);
  });
});

describe('linearGradient', () => {
  it('interpolates black to white across the axis', () => {
    const data = solid(3, 1, 0, 0, 0);
    linearGradient(data, 3, 1, 0, 0, 2, 0, [0, 0, 0], [255, 255, 255]);
    expect(data[0]).toBe(0);
    expect(data[8]).toBe(255);
    expect(data[4]).toBeGreaterThan(0);
    expect(data[4]).toBeLessThan(255);
  });
});

describe('blendChannel', () => {
  it('implements the four modes', () => {
    expect(blendChannel(120, 200, 'normal')).toBe(200);
    expect(blendChannel(255, 128, 'multiply')).toBe(128);
    expect(blendChannel(0, 128, 'screen')).toBe(128);
    expect(blendChannel(255, 40, 'overlay')).toBe(255);
    expect(blendChannel(0, 200, 'overlay')).toBe(0);
  });
});

describe('compositePixel', () => {
  it('opacity 0 returns the base untouched', () => {
    expect(compositePixel([10, 20, 30], [200, 200, 200], 'normal', 0)).toEqual([10, 20, 30]);
  });
  it('full opacity normal returns the top color', () => {
    expect(compositePixel([10, 20, 30], [200, 100, 50], 'normal', 100)).toEqual([200, 100, 50]);
  });
  it('half opacity averages toward the blend result', () => {
    const out = compositePixel([0, 0, 0], [200, 200, 200], 'normal', 50);
    expect(out[0]).toBe(100);
  });
});

describe('layer list operations', () => {
  it('nextLayerName skips taken names', () => {
    expect(nextLayerName([])).toBe('Layer 1');
    expect(nextLayerName([{ ...bg(), name: 'Layer 1' }])).toBe('Layer 2');
  });
  it('duplicatedName appends copy', () => {
    expect(duplicatedName('Layer 1')).toBe('Layer 1 copy');
  });
  it('addLayer appends without mutating', () => {
    const layers = [bg()];
    const result = addLayer(layers, () => ({ id: 'n', name: 'Layer 1', visible: true, opacity: 100, blend: 'normal' }));
    expect(result).toHaveLength(2);
    expect(layers).toHaveLength(1);
  });
  it('removeLayer refuses to remove the last layer', () => {
    const layers = [bg()];
    expect(removeLayer(layers, 'a')).toBe(layers);
  });
  it('reorderLayers moves an item', () => {
    const layers: PsLayer[] = [
      { id: 'a', name: 'A', visible: true, opacity: 100, blend: 'normal' },
      { id: 'b', name: 'B', visible: true, opacity: 100, blend: 'normal' },
      { id: 'c', name: 'C', visible: true, opacity: 100, blend: 'normal' },
    ];
    expect(reorderLayers(layers, 0, 2).map((l) => l.id)).toEqual(['b', 'c', 'a']);
    expect(reorderLayers(layers, 1, 1)).toBe(layers);
  });
});

describe('psd serialization', () => {
  const doc: PsdDocument = {
    format: 'psd-json',
    version: 1,
    width: 40,
    height: 30,
    layers: [
      { name: 'Background', opacity: 100, blend: 'normal', visible: true, dataUrl: 'data:image/png;base64,AAAA' },
      { name: 'Layer 1', opacity: 50, blend: 'multiply', visible: false, dataUrl: 'data:image/png;base64,BBBB' },
    ],
  };

  it('round-trips a document', () => {
    const parsed = deserializePsd(serializePsd(doc));
    expect(parsed).toEqual(doc);
  });
  it('rejects non-psd JSON', () => {
    expect(deserializePsd('{"format":"other"}')).toBeNull();
    expect(deserializePsd('not json')).toBeNull();
    expect(deserializePsd('data:image/png;base64,AAAA')).toBeNull();
  });
  it('defaults missing layer fields', () => {
    const parsed = deserializePsd(JSON.stringify({
      format: 'psd-json', version: 1, width: 10, height: 10,
      layers: [{ name: 'X', dataUrl: 'data:foo' }],
    }));
    expect(parsed?.layers[0]).toEqual({ name: 'X', dataUrl: 'data:foo', opacity: 100, blend: 'normal', visible: true });
  });
});
