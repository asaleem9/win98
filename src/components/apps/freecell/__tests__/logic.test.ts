import {
  msDeal,
  dealGame,
  maxMovable,
  canMoveToFoundation,
  canPlaceOnTableau,
  isOrderedSequence,
  checkWin,
  isSafeToAutoMove,
  sequenceStart,
  rankLabel,
  autoMoveToFoundations,
  type Card,
  type FCState,
} from '../logic';

function cardStr(c: Card): string {
  const ranks = 'A23456789TJQK';
  const suitChar = { clubs: 'C', diamonds: 'D', hearts: 'H', spades: 'S' }[c.suit];
  return ranks[c.rank - 1] + suitChar;
}

describe('msDeal', () => {
  it('is deterministic for a given seed', () => {
    const a = msDeal(42);
    const b = msDeal(42);
    expect(a).toEqual(b);
  });

  it('produces different deals for different seeds', () => {
    const a = msDeal(1);
    const b = msDeal(2);
    expect(a).not.toEqual(b);
  });

  it('always deals exactly 52 unique cards', () => {
    const deck = msDeal(777);
    expect(deck).toHaveLength(52);
    const seen = new Set(deck.map(cardStr));
    expect(seen.size).toBe(52);
  });

  it('matches the well-documented Game #1 layout', () => {
    const deck = msDeal(1);
    const tableau: Card[][] = [[], [], [], [], [], [], [], []];
    for (let i = 0; i < 52; i++) tableau[i % 8].push(deck[i]);

    const columns = tableau.map((col) => col.map(cardStr).join(' '));
    expect(columns).toEqual([
      'JD KD 2S 4C 3S 6D 6S',
      '2D KC KS 5C TD 8S 9C',
      '9H 9S 9D TS 4S 8D 2H',
      'JC 5S QD QH TH QS 6H',
      '5D AD JS 4H 8H 6C',
      '7H QC AS AC 2C 3D',
      '7C KH AH 4D JH 8C',
      '5H 3H 3C 7S 7D TC',
    ]);
  });
});

describe('dealGame', () => {
  it('builds 8 tableau columns, 4 empty free cells, and 4 empty foundations', () => {
    const state = dealGame(1);
    expect(state.tableau).toHaveLength(8);
    expect(state.tableau.reduce((sum, col) => sum + col.length, 0)).toBe(52);
    expect(state.freeCells).toEqual([null, null, null, null]);
    expect(state.foundations).toEqual([[], [], [], []]);
    expect(state.won).toBe(false);
    expect(state.moves).toBe(0);
    expect(state.gameNum).toBe(1);
  });
});

describe('maxMovable (supermove limit)', () => {
  it('is (freeCells + 1) * 2^emptyCols to a non-empty column', () => {
    expect(maxMovable(0, 0, false)).toBe(1);
    expect(maxMovable(4, 0, false)).toBe(5);
    expect(maxMovable(0, 3, false)).toBe(8);
    expect(maxMovable(2, 2, false)).toBe(12);
  });

  it('discounts one empty column when the destination itself is empty', () => {
    expect(maxMovable(0, 1, true)).toBe(1);
    expect(maxMovable(4, 1, true)).toBe(5);
    expect(maxMovable(0, 3, true)).toBe(4);
    expect(maxMovable(2, 3, true)).toBe(12);
  });

  it('never goes negative when the only empty column is the destination', () => {
    expect(maxMovable(1, 1, true)).toBe(2);
  });
});

describe('canMoveToFoundation', () => {
  it('allows an ace onto an empty foundation', () => {
    const idx = canMoveToFoundation({ suit: 'hearts', rank: 1 }, [[], [], [], []]);
    expect(idx).toBe(0);
  });

  it('requires matching suit and next rank', () => {
    const foundations: Card[][] = [[{ suit: 'hearts', rank: 1 }], [], [], []];
    expect(canMoveToFoundation({ suit: 'hearts', rank: 2 }, foundations)).toBe(0);
    expect(canMoveToFoundation({ suit: 'spades', rank: 2 }, foundations)).toBe(-1);
  });
});

describe('canPlaceOnTableau', () => {
  it('accepts any card on an empty pile', () => {
    expect(canPlaceOnTableau({ suit: 'clubs', rank: 5 }, [])).toBe(true);
  });

  it('requires alternating color and descending rank', () => {
    const pile: Card[] = [{ suit: 'hearts', rank: 8 }];
    expect(canPlaceOnTableau({ suit: 'clubs', rank: 7 }, pile)).toBe(true);
    expect(canPlaceOnTableau({ suit: 'diamonds', rank: 7 }, pile)).toBe(false);
    expect(canPlaceOnTableau({ suit: 'clubs', rank: 6 }, pile)).toBe(false);
  });
});

describe('isOrderedSequence', () => {
  it('accepts a properly alternating descending run', () => {
    const run: Card[] = [
      { suit: 'hearts', rank: 8 },
      { suit: 'clubs', rank: 7 },
      { suit: 'diamonds', rank: 6 },
    ];
    expect(isOrderedSequence(run)).toBe(true);
  });

  it('rejects a run with a color or rank break', () => {
    const run: Card[] = [
      { suit: 'hearts', rank: 8 },
      { suit: 'diamonds', rank: 7 },
    ];
    expect(isOrderedSequence(run)).toBe(false);
  });

  it('treats single-card and empty sequences as trivially ordered', () => {
    expect(isOrderedSequence([{ suit: 'hearts', rank: 8 }])).toBe(true);
    expect(isOrderedSequence([])).toBe(true);
  });
});

describe('sequenceStart', () => {
  it('finds the top of a run when the whole pile alternates', () => {
    const pile: Card[] = [
      { suit: 'spades', rank: 13 },
      { suit: 'hearts', rank: 8 },
      { suit: 'clubs', rank: 7 },
      { suit: 'diamonds', rank: 6 },
    ];
    expect(sequenceStart(pile)).toBe(1);
  });

  it('returns the last index when nothing sequences', () => {
    const pile: Card[] = [
      { suit: 'spades', rank: 13 },
      { suit: 'hearts', rank: 2 },
    ];
    expect(sequenceStart(pile)).toBe(1);
  });
});

describe('checkWin', () => {
  it('is true only when every foundation has all 13 ranks', () => {
    const full = Array.from({ length: 13 }, (_, i) => ({ suit: 'hearts' as const, rank: i + 1 }));
    expect(checkWin([full, full, full, full])).toBe(true);
    expect(checkWin([full, full, full, []])).toBe(false);
  });
});

describe('isSafeToAutoMove', () => {
  it('is safe when opposite-color foundations are caught up', () => {
    const foundations: Card[][] = [
      [{ suit: 'clubs', rank: 3 }],
      [],
      [{ suit: 'hearts', rank: 3 }],
      [],
    ];
    expect(isSafeToAutoMove({ suit: 'hearts', rank: 4 }, foundations)).toBe(true);
  });

  it('is unsafe when an opposite-color foundation lags behind', () => {
    const foundations: Card[][] = [
      [{ suit: 'clubs', rank: 1 }],
      [],
      [{ suit: 'hearts', rank: 3 }],
      [],
    ];
    expect(isSafeToAutoMove({ suit: 'hearts', rank: 4 }, foundations)).toBe(false);
  });
});

describe('autoMoveToFoundations', () => {
  function emptyState(): FCState {
    return {
      tableau: [[], [], [], [], [], [], [], []],
      freeCells: [null, null, null, null],
      foundations: [[], [], [], []],
      gameNum: 1,
      moves: 0,
      won: false,
    };
  }

  it('automatically sends aces and twos home', () => {
    const state = emptyState();
    state.tableau[0] = [{ suit: 'hearts', rank: 1 }];
    state.freeCells[0] = { suit: 'clubs', rank: 1 };
    const result = autoMoveToFoundations(state);
    expect(result.tableau[0]).toEqual([]);
    expect(result.freeCells[0]).toBeNull();
    expect(result.foundations.some((f) => f.length === 1 && f[0].rank === 1)).toBe(true);
  });

  it('does not move a card that could still be needed as a tableau landing spot', () => {
    const state = emptyState();
    // Clubs foundation has an ace; a red 2 is not yet safe because the
    // opposite-color (red) foundations are both still empty.
    state.foundations[0] = [{ suit: 'clubs', rank: 1 }];
    state.tableau[0] = [{ suit: 'hearts', rank: 3 }];
    const result = autoMoveToFoundations(state);
    expect(result.tableau[0]).toEqual([{ suit: 'hearts', rank: 3 }]);
  });

  it('detects a win once all four foundations are complete', () => {
    const state = emptyState();
    const suits: Card['suit'][] = ['clubs', 'diamonds', 'hearts', 'spades'];
    suits.forEach((suit, i) => {
      state.foundations[i] = Array.from({ length: 12 }, (_, r) => ({ suit, rank: r + 1 }));
      state.tableau[i] = [{ suit, rank: 13 }];
    });
    const result = autoMoveToFoundations(state);
    expect(result.won).toBe(true);
  });
});

describe('rankLabel', () => {
  it('labels face cards and aces', () => {
    expect(rankLabel(1)).toBe('A');
    expect(rankLabel(11)).toBe('J');
    expect(rankLabel(12)).toBe('Q');
    expect(rankLabel(13)).toBe('K');
  });

  it('labels number cards as their number', () => {
    expect(rankLabel(7)).toBe('7');
  });
});
