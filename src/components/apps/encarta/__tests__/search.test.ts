import { ARTICLES } from '../articles';
import { searchArticles } from '../search';

describe('searchArticles', () => {
  it('returns nothing for an empty or whitespace query', () => {
    expect(searchArticles(ARTICLES, '')).toEqual([]);
    expect(searchArticles(ARTICLES, '   ')).toEqual([]);
  });

  it('returns nothing when no article matches', () => {
    expect(searchArticles(ARTICLES, 'xyzzyblurgle')).toEqual([]);
  });

  it('ranks a title hit above articles that only mention the word', () => {
    const results = searchArticles(ARTICLES, 'internet');
    expect(results.length).toBeGreaterThan(1);
    expect(results[0].article.id).toBe('the-internet');
    expect(results[0].matchedIn).toBe('title');
  });

  it('orders results by descending score', () => {
    const results = searchArticles(ARTICLES, 'space');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('breaks score ties alphabetically by title for stable output', () => {
    const a = searchArticles(ARTICLES, 'the');
    const b = searchArticles(ARTICLES, 'the');
    expect(a.map((r) => r.article.id)).toEqual(b.map((r) => r.article.id));
  });

  it('requires every word of a multi-word query to match somewhere', () => {
    const results = searchArticles(ARTICLES, 'roman empire');
    expect(results.some((r) => r.article.id === 'roman-empire')).toBe(true);
    // A word that appears nowhere alongside "roman" filters everything out.
    expect(searchArticles(ARTICLES, 'roman zzzzz')).toEqual([]);
  });

  it('matches on keyword tags that are not in the visible text', () => {
    // "pharaoh" is only in ancient-egypt's keyword list.
    const results = searchArticles(ARTICLES, 'pharaoh');
    expect(results[0].article.id).toBe('ancient-egypt');
  });
});
