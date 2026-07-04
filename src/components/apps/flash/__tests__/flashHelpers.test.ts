import {
  createEmptyFrames,
  isBlankFrame,
  nextFrame,
  nextLayerName,
  serializeFla,
  deserializeFla,
  FlaDocument,
} from '../flashHelpers';

describe('nextFrame', () => {
  it('advances by one', () => {
    expect(nextFrame(1, 60)).toBe(2);
    expect(nextFrame(30, 60)).toBe(31);
  });

  it('loops back to 1 after the last frame', () => {
    expect(nextFrame(60, 60)).toBe(1);
  });

  it('is a no-op when total is zero', () => {
    expect(nextFrame(5, 0)).toBe(5);
  });
});

describe('createEmptyFrames', () => {
  it('creates the requested number of null slots', () => {
    const frames = createEmptyFrames(60);
    expect(frames).toHaveLength(60);
    expect(frames.every((f) => f === null)).toBe(true);
  });

  it('handles zero total', () => {
    expect(createEmptyFrames(0)).toEqual([]);
  });
});

describe('isBlankFrame', () => {
  it('treats null as blank', () => {
    expect(isBlankFrame(null)).toBe(true);
  });

  it('treats a dataURL string as non-blank', () => {
    expect(isBlankFrame('data:image/png;base64,abc')).toBe(false);
  });
});

describe('nextLayerName', () => {
  it('names the first layer "Layer 2" after one existing layer', () => {
    expect(nextLayerName([{ name: 'Layer 1' }])).toBe('Layer 2');
  });

  it('skips names already in use', () => {
    expect(nextLayerName([{ name: 'Layer 1' }, { name: 'Layer 2' }])).toBe('Layer 3');
  });

  it('handles an empty layer list', () => {
    expect(nextLayerName([])).toBe('Layer 1');
  });

  it('fills a gap left by a renamed layer', () => {
    expect(nextLayerName([{ name: 'Layer 1' }, { name: 'Background' }])).toBe('Layer 2');
  });
});

describe('.fla serialization', () => {
  const doc: FlaDocument = {
    app: 'flash',
    version: 1,
    stage: { width: 640, height: 480, bg: '#112233', fps: 24 },
    totalFrames: 60,
    layers: [
      { name: 'Layer 1', visible: true, locked: false, frames: [null, 'data:image/png;base64,abc', null] },
      { name: 'Layer 2', visible: false, locked: true, frames: createEmptyFrames(3) },
    ],
  };

  it('round-trips a movie through serialize/deserialize', () => {
    expect(deserializeFla(serializeFla(doc))).toEqual(doc);
  });

  it('rejects payloads that are not Flash movies', () => {
    expect(deserializeFla('not json')).toBeNull();
    expect(deserializeFla('{"app":"excel"}')).toBeNull();
  });
});
