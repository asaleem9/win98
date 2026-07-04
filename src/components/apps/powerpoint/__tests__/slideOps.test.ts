import { reorderSlides, encodeSlideClipboard, decodeSlideClipboard, Slide } from '../slideOps';

describe('reorderSlides', () => {
  it('moves an item forward', () => {
    expect(reorderSlides(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('moves an item backward', () => {
    expect(reorderSlides(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('returns a copy unchanged when from === to', () => {
    const arr = ['a', 'b'];
    const out = reorderSlides(arr, 1, 1);
    expect(out).toEqual(arr);
    expect(out).not.toBe(arr);
  });
});

describe('slide clipboard', () => {
  const slide: Slide = { title: 'Hello', bullets: ['one', 'two'], bg: '#cfe2f3' };

  it('round-trips a slide through encode/decode', () => {
    expect(decodeSlideClipboard(encodeSlideClipboard(slide))).toEqual(slide);
  });

  it('rejects text that is not an encoded slide', () => {
    expect(decodeSlideClipboard('just some copied text')).toBeNull();
    expect(decodeSlideClipboard('{"tag":"other"}')).toBeNull();
  });
});
