import {
  createDeck,
  shuffle,
  initGame,
  canPlaceOnTableau,
  canPlaceOnFoundation,
  checkWin,
  isValidSequence,
  scoreForMove,
  timeBonus,
  vegasStartingScore,
  suitColor,
  rankLabel,
  type Card,
} from '../logic';

function card(suit: Card['suit'], rank: number, faceUp = true): Card {
  return { suit, rank, faceUp };
}

describe('createDeck', () => {
  it('creates 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const keys = new Set(deck.map((c) => `${c.suit}-${c.rank}`));
    expect(keys.size).toBe(52);
  });

  it('all cards start face down', () => {
    expect(createDeck().every((c) => !c.faceUp)).toBe(true);
  });
});

describe('shuffle', () => {
  it('preserves all elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(arr, () => 0.999);
    expect([...shuffled].sort()).toEqual([...arr].sort());
  });

  it('is deterministic given a fixed rng', () => {
    const rng = () => 0;
    const a = shuffle([1, 2, 3, 4], rng);
    const b = shuffle([1, 2, 3, 4], rng);
    expect(a).toEqual(b);
  });
});

describe('initGame', () => {
  it('deals 28 cards to the tableau in triangular piles', () => {
    const game = initGame(1, () => 0.42);
    const total = game.tableau.reduce((sum, pile) => sum + pile.length, 0);
    expect(total).toBe(28);
    game.tableau.forEach((pile, i) => expect(pile).toHaveLength(i + 1));
  });

  it('only the last card of each tableau pile is face up', () => {
    const game = initGame(1, () => 0.13);
    game.tableau.forEach((pile) => {
      pile.forEach((c, i) => expect(c.faceUp).toBe(i === pile.length - 1));
    });
  });

  it('remaining 24 cards go to the stock, face down', () => {
    const game = initGame(1, () => 0.77);
    expect(game.stock).toHaveLength(24);
    expect(game.stock.every((c) => !c.faceUp)).toBe(true);
  });

  it('starts with empty foundations, waste, zero score/moves, not won', () => {
    const game = initGame(3);
    expect(game.foundations).toEqual([[], [], [], []]);
    expect(game.waste).toEqual([]);
    expect(game.moves).toBe(0);
    expect(game.score).toBe(0);
    expect(game.won).toBe(false);
    expect(game.drawCount).toBe(3);
  });
});

describe('suitColor / rankLabel', () => {
  it('reds are hearts and diamonds', () => {
    expect(suitColor('hearts')).toBe('red');
    expect(suitColor('diamonds')).toBe('red');
  });
  it('blacks are clubs and spades', () => {
    expect(suitColor('clubs')).toBe('black');
    expect(suitColor('spades')).toBe('black');
  });
  it('labels face cards and ace correctly', () => {
    expect(rankLabel(1)).toBe('A');
    expect(rankLabel(11)).toBe('J');
    expect(rankLabel(12)).toBe('Q');
    expect(rankLabel(13)).toBe('K');
    expect(rankLabel(7)).toBe('7');
  });
});

describe('canPlaceOnTableau', () => {
  it('allows a King on an empty pile only', () => {
    expect(canPlaceOnTableau(card('spades', 13), [])).toBe(true);
    expect(canPlaceOnTableau(card('hearts', 12), [])).toBe(false);
  });

  it('requires alternating color and descending rank', () => {
    const target = [card('hearts', 8)];
    expect(canPlaceOnTableau(card('spades', 7), target)).toBe(true);
    expect(canPlaceOnTableau(card('diamonds', 7), target)).toBe(false); // same color
    expect(canPlaceOnTableau(card('spades', 6), target)).toBe(false); // wrong rank
  });

  it('rejects placement on a face-down top card', () => {
    const target = [card('hearts', 8, false)];
    expect(canPlaceOnTableau(card('spades', 7), target)).toBe(false);
  });
});

describe('canPlaceOnFoundation', () => {
  it('only accepts an Ace on an empty foundation', () => {
    expect(canPlaceOnFoundation(card('hearts', 1), [])).toBe(true);
    expect(canPlaceOnFoundation(card('hearts', 2), [])).toBe(false);
  });

  it('requires the same suit ascending by one', () => {
    const foundation = [card('clubs', 1), card('clubs', 2)];
    expect(canPlaceOnFoundation(card('clubs', 3), foundation)).toBe(true);
    expect(canPlaceOnFoundation(card('spades', 3), foundation)).toBe(false);
    expect(canPlaceOnFoundation(card('clubs', 4), foundation)).toBe(false);
  });
});

describe('checkWin', () => {
  it('is true only when every foundation has 13 cards', () => {
    const full = Array(13).fill(card('hearts', 1));
    expect(checkWin([full, full, full, full])).toBe(true);
    expect(checkWin([full, full, full, []])).toBe(false);
  });
});

describe('isValidSequence', () => {
  it('accepts a single face-up card', () => {
    expect(isValidSequence([card('hearts', 5)])).toBe(true);
  });

  it('rejects an empty sequence', () => {
    expect(isValidSequence([])).toBe(false);
  });

  it('accepts a descending alternating-color run', () => {
    const seq = [card('spades', 8), card('hearts', 7), card('clubs', 6)];
    expect(isValidSequence(seq)).toBe(true);
  });

  it('rejects a run with same-color neighbors', () => {
    const seq = [card('spades', 8), card('clubs', 7)];
    expect(isValidSequence(seq)).toBe(false);
  });

  it('rejects a run that is not descending by one', () => {
    const seq = [card('spades', 8), card('hearts', 6)];
    expect(isValidSequence(seq)).toBe(false);
  });

  it('rejects a sequence containing a face-down card', () => {
    const seq = [card('spades', 8), card('hearts', 7, false)];
    expect(isValidSequence(seq)).toBe(false);
  });
});

describe('scoreForMove', () => {
  it('returns zero for scoring mode "none"', () => {
    expect(scoreForMove('wasteToFoundation', 'none')).toBe(0);
  });

  it('gives standard point values', () => {
    expect(scoreForMove('wasteToTableau', 'standard')).toBe(5);
    expect(scoreForMove('wasteToFoundation', 'standard')).toBe(10);
    expect(scoreForMove('tableauToFoundation', 'standard')).toBe(10);
    expect(scoreForMove('foundationToTableau', 'standard')).toBe(-15);
    expect(scoreForMove('turnOverTableauCard', 'standard')).toBe(5);
  });

  it('penalizes stock recycling only in Vegas mode', () => {
    expect(scoreForMove('stockRecycle', 'vegas')).toBeLessThan(0);
    expect(scoreForMove('stockRecycle', 'standard')).toBe(0);
  });
});

describe('timeBonus', () => {
  it('is zero for non-positive durations', () => {
    expect(timeBonus(0)).toBe(0);
    expect(timeBonus(-5)).toBe(0);
  });

  it('decreases as elapsed time increases', () => {
    expect(timeBonus(30)).toBeGreaterThan(timeBonus(300));
  });

  it('is capped and never negative', () => {
    expect(timeBonus(1)).toBeLessThanOrEqual(20000);
    expect(timeBonus(1_000_000)).toBeGreaterThanOrEqual(0);
  });
});

describe('vegasStartingScore', () => {
  it('is -52 (cost of the deck)', () => {
    expect(vegasStartingScore()).toBe(-52);
  });
});
