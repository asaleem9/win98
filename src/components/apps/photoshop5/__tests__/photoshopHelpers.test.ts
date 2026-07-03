import { invertPixels, boxBlurPixels, nextLayerName, addLayer, removeLayer, PsLayer } from '../photoshopHelpers';

describe('invertPixels', () => {
  it('inverts RGB channels and leaves alpha untouched', () => {
    const data = Uint8ClampedArray.from([0, 128, 255, 255, 255, 0, 0, 128]);
    invertPixels(data);
    expect(Array.from(data)).toEqual([255, 127, 0, 255, 0, 255, 255, 128]);
  });

  it('handles empty arrays', () => {
    const data = new Uint8ClampedArray(0);
    expect(() => invertPixels(data)).not.toThrow();
  });
});

describe('boxBlurPixels', () => {
  it('averages a flat color image to itself', () => {
    const width = 3, height = 3;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 100; data[i + 1] = 150; data[i + 2] = 200; data[i + 3] = 255;
    }
    boxBlurPixels(data, width, height, 1);
    for (let i = 0; i < data.length; i += 4) {
      expect(data[i]).toBe(100);
      expect(data[i + 1]).toBe(150);
      expect(data[i + 2]).toBe(200);
      expect(data[i + 3]).toBe(255);
    }
  });

  it('smooths a sharp edge toward the average of neighbors', () => {
    const width = 3, height = 1;
    const data = new Uint8ClampedArray([
      0, 0, 0, 255,
      0, 0, 0, 255,
      255, 255, 255, 255,
    ]);
    boxBlurPixels(data, width, height, 1);
    // middle pixel should now be somewhere between black and white
    expect(data[4]).toBeGreaterThan(0);
    expect(data[4]).toBeLessThan(255);
  });
});

describe('nextLayerName', () => {
  it('returns Layer 1 for an empty list', () => {
    expect(nextLayerName([])).toBe('Layer 1');
  });

  it('skips names already taken', () => {
    const layers: PsLayer[] = [
      { id: 'a', name: 'Layer 1', visible: true },
      { id: 'b', name: 'Layer 2', visible: true },
    ];
    expect(nextLayerName(layers)).toBe('Layer 3');
  });

  it('fills gaps left by deleted layers', () => {
    const layers: PsLayer[] = [{ id: 'a', name: 'Layer 2', visible: true }];
    expect(nextLayerName(layers)).toBe('Layer 1');
  });
});

describe('addLayer', () => {
  it('appends a new layer built from the factory without mutating input', () => {
    const layers: PsLayer[] = [{ id: 'bg', name: 'Background', visible: true }];
    const result = addLayer(layers, () => ({ id: 'new', name: 'Layer 1', visible: true }));
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('new');
    expect(layers).toHaveLength(1);
  });
});

describe('removeLayer', () => {
  it('removes the given layer by id', () => {
    const layers: PsLayer[] = [
      { id: 'a', name: 'Layer 1', visible: true },
      { id: 'b', name: 'Layer 2', visible: true },
    ];
    const result = removeLayer(layers, 'a');
    expect(result).toEqual([{ id: 'b', name: 'Layer 2', visible: true }]);
  });

  it('refuses to remove the last remaining layer', () => {
    const layers: PsLayer[] = [{ id: 'a', name: 'Layer 1', visible: true }];
    const result = removeLayer(layers, 'a');
    expect(result).toBe(layers);
  });
});
