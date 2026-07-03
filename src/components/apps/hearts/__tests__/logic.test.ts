import {
  createDeck,
  dealHands,
  findTwoOfClubs,
  getTrickWinner,
  trickPoints,
  isLegalPlay,
  legalPlays,
  scoreRound,
  computeVoids,
  aiChooseCard,
  aiChoosePassCards,
  sortHand,
  cardValue,
  type Card,
  type Trick,
} from '../logic';

function c(suit: Card['suit'], rank: number): Card {
  return { suit, rank };
}

describe('createDeck / dealHands', () => {
  it('creates a 52 unique-card deck', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const keys = new Set(deck.map((card) => `${card.suit}-${card.rank}`));
    expect(keys.size).toBe(52);
  });

  it('deals 4 hands of 13 with no overlap', () => {
    const hands = dealHands();
    expect(hands).toHaveLength(4);
    hands.forEach((h) => expect(h).toHaveLength(13));
    const all = hands.flat();
    const keys = new Set(all.map((card) => `${card.suit}-${card.rank}`));
    expect(keys.size).toBe(52);
  });
});

describe('findTwoOfClubs', () => {
  it('finds the player holding the 2 of clubs', () => {
    const players = [
      { hand: [c('hearts', 5)] },
      { hand: [c('clubs', 2), c('spades', 9)] },
      { hand: [c('diamonds', 3)] },
      { hand: [c('clubs', 10)] },
    ];
    expect(findTwoOfClubs(players)).toBe(1);
  });
});

describe('sortHand / cardValue', () => {
  it('treats ace as high (14)', () => {
    expect(cardValue(c('hearts', 1))).toBe(14);
    expect(cardValue(c('hearts', 10))).toBe(10);
  });

  it('sorts by suit then rank', () => {
    const hand = [c('hearts', 5), c('clubs', 10), c('clubs', 2)];
    const sorted = sortHand(hand);
    expect(sorted[0]).toEqual(c('clubs', 2));
    expect(sorted[1]).toEqual(c('clubs', 10));
    expect(sorted[2]).toEqual(c('hearts', 5));
  });
});

describe('isLegalPlay / legalPlays', () => {
  it('forces the 2 of clubs lead on the first trick', () => {
    const hand = [c('clubs', 2), c('clubs', 10), c('hearts', 5)];
    const trick: Trick = [null, null, null, null];
    expect(isLegalPlay(c('clubs', 2), hand, trick, 0, false, 0)).toBe(true);
    expect(isLegalPlay(c('clubs', 10), hand, trick, 0, false, 0)).toBe(false);
    expect(isLegalPlay(c('hearts', 5), hand, trick, 0, false, 0)).toBe(false);
  });

  it('disallows points on the first trick when a non-point card is available', () => {
    const hand = [c('spades', 12), c('diamonds', 4)];
    const trick: Trick = [c('clubs', 2), null, null, null];
    // Void of clubs, holds a safe diamond, so queen of spades is not allowed
    expect(isLegalPlay(c('spades', 12), hand, trick, 0, false, 0)).toBe(false);
    expect(isLegalPlay(c('diamonds', 4), hand, trick, 0, false, 0)).toBe(true);
  });

  it('allows points on the first trick only if hand has nothing else', () => {
    const hand = [c('spades', 12), c('hearts', 3)];
    const trick: Trick = [c('clubs', 2), null, null, null];
    expect(isLegalPlay(c('spades', 12), hand, trick, 0, false, 0)).toBe(true);
    expect(isLegalPlay(c('hearts', 3), hand, trick, 0, false, 0)).toBe(true);
  });

  it('requires following suit when possible', () => {
    const hand = [c('diamonds', 5), c('clubs', 9)];
    const trick: Trick = [c('diamonds', 10), null, null, null];
    expect(isLegalPlay(c('diamonds', 5), hand, trick, 0, false, 3)).toBe(true);
    expect(isLegalPlay(c('clubs', 9), hand, trick, 0, false, 3)).toBe(false);
  });

  it('disallows leading hearts before broken unless hand is all hearts', () => {
    const hand = [c('hearts', 5), c('clubs', 9)];
    const trick: Trick = [null, null, null, null];
    expect(isLegalPlay(c('hearts', 5), hand, trick, 0, false, 3)).toBe(false);
    expect(isLegalPlay(c('clubs', 9), hand, trick, 0, false, 3)).toBe(true);
  });

  it('allows leading hearts once broken', () => {
    const hand = [c('hearts', 5), c('clubs', 9)];
    const trick: Trick = [null, null, null, null];
    expect(isLegalPlay(c('hearts', 5), hand, trick, 0, true, 3)).toBe(true);
  });

  it('allows leading hearts if hand is all hearts even if not broken', () => {
    const hand = [c('hearts', 5), c('hearts', 9)];
    const trick: Trick = [null, null, null, null];
    expect(isLegalPlay(c('hearts', 5), hand, trick, 0, false, 3)).toBe(true);
  });

  it('legalPlays filters down to only legal cards', () => {
    const hand = [c('clubs', 2), c('clubs', 10), c('hearts', 5)];
    const trick: Trick = [null, null, null, null];
    expect(legalPlays(hand, trick, 0, false, 0)).toEqual([c('clubs', 2)]);
  });
});

describe('getTrickWinner', () => {
  it('picks the highest card of the lead suit', () => {
    const trick: Trick = [c('clubs', 5), c('clubs', 10), c('hearts', 13), c('clubs', 2)];
    expect(getTrickWinner(trick, 0)).toBe(1);
  });

  it('ignores off-suit cards even if higher rank', () => {
    const trick: Trick = [c('diamonds', 3), c('spades', 14 === 14 ? 1 : 1), c('diamonds', 9), c('clubs', 13)];
    expect(getTrickWinner(trick, 0)).toBe(2);
  });
});

describe('trickPoints', () => {
  it('counts hearts as 1 and queen of spades as 13', () => {
    const trick: Trick = [c('hearts', 5), c('spades', 12), c('clubs', 9), c('hearts', 2)];
    expect(trickPoints(trick)).toBe(15);
  });

  it('is zero for a trick with no point cards', () => {
    const trick: Trick = [c('clubs', 5), c('diamonds', 9), c('spades', 4), c('clubs', 13)];
    expect(trickPoints(trick)).toBe(0);
  });
});

describe('scoreRound / shoot the moon', () => {
  it('leaves scores unchanged when no one takes all 26', () => {
    const result = scoreRound([10, 6, 5, 5]);
    expect(result.moonShooter).toBeNull();
    expect(result.scores).toEqual([10, 6, 5, 5]);
  });

  it('detects shoot-the-moon: shooter scores 0, everyone else +26', () => {
    const result = scoreRound([26, 0, 0, 0]);
    expect(result.moonShooter).toBe(0);
    expect(result.scores).toEqual([0, 26, 26, 26]);
  });

  it('detects shoot-the-moon for any seat', () => {
    const result = scoreRound([0, 0, 26, 0]);
    expect(result.moonShooter).toBe(2);
    expect(result.scores).toEqual([26, 26, 0, 26]);
  });
});

describe('computeVoids', () => {
  it('infers a suit void when a player fails to follow suit', () => {
    const trick: Trick = [c('clubs', 2), c('hearts', 5), c('clubs', 9), c('clubs', 4)];
    const voids = computeVoids([{ trick, leadPlayer: 0, winner: 2 }]);
    expect(voids[1].has('clubs')).toBe(true);
    expect(voids[0].has('clubs')).toBe(false);
  });
});

describe('aiChooseCard', () => {
  it('always returns a legal card regardless of difficulty', () => {
    const hand = [c('clubs', 2), c('clubs', 10), c('hearts', 5)];
    const trick: Trick = [null, null, null, null];
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const card = aiChooseCard({
        playerIdx: 1,
        hand,
        trick,
        leadPlayer: 1,
        heartsBroken: false,
        trickNumber: 0,
        difficulty,
      });
      expect(card).toEqual(c('clubs', 2));
    }
  });

  it('medium/hard follow suit with the lowest safe card when possible', () => {
    const hand = [c('diamonds', 3), c('diamonds', 9), c('clubs', 5)];
    const trick: Trick = [c('diamonds', 7), null, null, null];
    const card = aiChooseCard({
      playerIdx: 1,
      hand,
      trick,
      leadPlayer: 0,
      heartsBroken: false,
      trickNumber: 3,
      difficulty: 'medium',
    });
    expect(card.suit).toBe('diamonds');
  });

  it('dumps the queen of spades when void of the lead suit', () => {
    const hand = [c('spades', 12), c('hearts', 2)];
    const trick: Trick = [c('diamonds', 7), null, null, null];
    const card = aiChooseCard({
      playerIdx: 1,
      hand,
      trick,
      leadPlayer: 0,
      heartsBroken: true,
      trickNumber: 3,
      difficulty: 'medium',
    });
    expect(card).toEqual(c('spades', 12));
  });

  it('never leads hearts before broken unless forced', () => {
    const hand = [c('hearts', 5), c('clubs', 9)];
    const trick: Trick = [null, null, null, null];
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const card = aiChooseCard({
        playerIdx: 0,
        hand,
        trick,
        leadPlayer: 0,
        heartsBroken: false,
        trickNumber: 3,
        difficulty,
      });
      expect(card.suit).not.toBe('hearts');
    }
  });
});

describe('aiChoosePassCards', () => {
  it('returns exactly 3 cards from the hand', () => {
    const hand = [
      c('clubs', 2), c('clubs', 10), c('hearts', 5), c('spades', 12),
      c('diamonds', 9), c('hearts', 13), c('spades', 4),
    ];
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const passed = aiChoosePassCards(hand, difficulty);
      expect(passed).toHaveLength(3);
      passed.forEach((card) => expect(hand).toContainEqual(card));
    }
  });

  it('medium/hard prioritize passing the queen of spades', () => {
    const hand = [c('clubs', 2), c('diamonds', 4), c('spades', 12), c('hearts', 3)];
    const passed = aiChoosePassCards(hand, 'medium');
    expect(passed).toContainEqual(c('spades', 12));
  });
});
