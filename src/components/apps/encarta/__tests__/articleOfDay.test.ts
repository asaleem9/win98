import { ARTICLES } from '../articles';
import { articleOfDay, dayNumber } from '../articleOfDay';

describe('articleOfDay', () => {
  it('is stable for a whole calendar day', () => {
    const morning = new Date(1998, 5, 15, 8, 30);
    const night = new Date(1998, 5, 15, 23, 59);
    expect(articleOfDay(ARTICLES, morning).id).toBe(articleOfDay(ARTICLES, night).id);
  });

  it('is identical for every reader on the same date', () => {
    const a = articleOfDay(ARTICLES, new Date(2000, 0, 1));
    const b = articleOfDay(ARTICLES, new Date(2000, 0, 1));
    expect(a.id).toBe(b.id);
  });

  it('always returns an article from the corpus', () => {
    const ids = new Set(ARTICLES.map((a) => a.id));
    for (let d = 0; d < 40; d++) {
      const date = new Date(1998, 0, 1 + d);
      expect(ids.has(articleOfDay(ARTICLES, date).id)).toBe(true);
    }
  });

  it('moves the feature to a different article the next day', () => {
    const today = new Date(1998, 2, 10);
    const tomorrow = new Date(1998, 2, 11);
    expect(articleOfDay(ARTICLES, today).id).not.toBe(articleOfDay(ARTICLES, tomorrow).id);
  });

  it('counts local calendar days from the epoch', () => {
    const a = dayNumber(new Date(1970, 0, 1, 12));
    const b = dayNumber(new Date(1970, 0, 2, 12));
    expect(b - a).toBe(1);
  });

  it('throws on an empty corpus', () => {
    expect(() => articleOfDay([], new Date())).toThrow();
  });
});
