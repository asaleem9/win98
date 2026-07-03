import { buildSubrangeCodepoints, subrangeOptions } from '../unicodeRanges';

test('exposes all five subrange options', () => {
  expect(subrangeOptions.map((o) => o.id)).toEqual([
    'latin1', 'greek', 'cyrillic', 'box-drawing', 'symbols',
  ]);
});

test('latin1 range spans the expected codepoints', () => {
  const codes = buildSubrangeCodepoints('latin1');
  expect(codes[0]).toBe(0x0020);
  expect(codes[codes.length - 1]).toBe(0x00ff);
});

test('greek range spans the expected codepoints', () => {
  const codes = buildSubrangeCodepoints('greek');
  expect(codes[0]).toBe(0x0370);
  expect(codes[codes.length - 1]).toBe(0x03ff);
});

test('every subrange returns a contiguous, non-empty list', () => {
  for (const opt of subrangeOptions) {
    const codes = buildSubrangeCodepoints(opt.id);
    expect(codes.length).toBeGreaterThan(0);
    for (let i = 1; i < codes.length; i++) {
      expect(codes[i]).toBe(codes[i - 1] + 1);
    }
  }
});
