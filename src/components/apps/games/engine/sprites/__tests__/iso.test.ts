import { isoToScreen, screenToIso, isoDepth } from '../iso';

const origin = { x: 200, y: 40 };
const tileW = 32;
const tileH = 16;

describe('isoToScreen', () => {
  it('maps the origin tile to its top point', () => {
    expect(isoToScreen(0, 0, tileW, tileH, origin)).toEqual({ x: 200, y: 40 });
  });

  it('moves +tx down-right and +ty down-left', () => {
    expect(isoToScreen(1, 0, tileW, tileH, origin)).toEqual({ x: 216, y: 48 });
    expect(isoToScreen(0, 1, tileW, tileH, origin)).toEqual({ x: 184, y: 48 });
  });
});

describe('screenToIso round-trip', () => {
  it('inverts isoToScreen for integer tiles', () => {
    for (const [tx, ty] of [
      [0, 0],
      [3, 0],
      [0, 5],
      [4, 7],
      [12, 9],
    ] as const) {
      const s = isoToScreen(tx, ty, tileW, tileH, origin);
      const back = screenToIso(s.x, s.y, tileW, tileH, origin);
      expect(back.tx).toBeCloseTo(tx, 6);
      expect(back.ty).toBeCloseTo(ty, 6);
    }
  });

  it('returns fractional coords inside a tile', () => {
    const s = isoToScreen(2, 3, tileW, tileH, origin);
    const back = screenToIso(s.x, s.y + tileH / 2, tileW, tileH, origin);
    // Dropping half a tile height down adds 0.5 to both axes.
    expect(back.tx).toBeCloseTo(2.5, 6);
    expect(back.ty).toBeCloseTo(3.5, 6);
  });
});

describe('isoDepth', () => {
  it('orders by tx+ty then ty', () => {
    const tiles = [
      { tx: 2, ty: 2 }, // sum 4
      { tx: 0, ty: 0 }, // sum 0
      { tx: 1, ty: 0 }, // sum 1
      { tx: 0, ty: 1 }, // sum 1, higher ty -> after (1,0)
      { tx: 3, ty: 1 }, // sum 4, but lower ty than (2,2) -> before it
    ];
    const sorted = [...tiles].sort((a, b) => isoDepth(a.tx, a.ty) - isoDepth(b.tx, b.ty));
    expect(sorted).toEqual([
      { tx: 0, ty: 0 },
      { tx: 1, ty: 0 },
      { tx: 0, ty: 1 },
      { tx: 3, ty: 1 },
      { tx: 2, ty: 2 },
    ]);
  });
});
