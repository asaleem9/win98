import { FACTS, JOKES, nextCycleIndex, buildWindowComment } from '../bonziLogic';

describe('content pools', () => {
  it('has a large enough fact pool', () => {
    expect(FACTS.length).toBeGreaterThanOrEqual(25);
  });

  it('has several jokes, each with a setup and punchline', () => {
    expect(JOKES.length).toBeGreaterThanOrEqual(3);
    JOKES.forEach((joke) => {
      expect(joke.setup.length).toBeGreaterThan(0);
      expect(joke.punchline.length).toBeGreaterThan(0);
    });
  });
});

describe('nextCycleIndex', () => {
  it('advances by one', () => {
    expect(nextCycleIndex(0, 5)).toBe(1);
    expect(nextCycleIndex(3, 5)).toBe(4);
  });

  it('wraps back to zero at the end of the pool', () => {
    expect(nextCycleIndex(4, 5)).toBe(0);
  });

  it('returns 0 for an empty or zero-length pool', () => {
    expect(nextCycleIndex(0, 0)).toBe(0);
    expect(nextCycleIndex(5, 0)).toBe(0);
  });
});

describe('buildWindowComment', () => {
  it('returns null when no other windows are open', () => {
    expect(buildWindowComment([])).toBeNull();
    expect(buildWindowComment(['BonziBUDDY'])).toBeNull();
  });

  it('comments on the given window title, skipping its own window', () => {
    const comment = buildWindowComment(['BonziBUDDY', 'Notepad'], 0);
    expect(comment).toBe('Ooh, I see you have Notepad open!');
  });

  it('picks among multiple other windows by index, wrapping safely', () => {
    const titles = ['BonziBUDDY', 'Notepad', 'Paint', 'Solitaire'];
    expect(buildWindowComment(titles, 0)).toContain('Notepad');
    expect(buildWindowComment(titles, 1)).toContain('Paint');
    expect(buildWindowComment(titles, 2)).toContain('Solitaire');
    expect(buildWindowComment(titles, 3)).toContain('Notepad'); // wraps
  });

  it('ignores empty/falsy titles', () => {
    expect(buildWindowComment(['', 'Notepad'], 0)).toContain('Notepad');
  });

  it('respects a custom self title', () => {
    expect(buildWindowComment(['My Window'], 0, 'My Window')).toBeNull();
  });
});
