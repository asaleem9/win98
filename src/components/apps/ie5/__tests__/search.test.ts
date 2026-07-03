import { searchSites, fakeHitCount } from '../websites/search';

describe('searchSites', () => {
  it('returns nothing for an empty or whitespace query', () => {
    expect(searchSites('')).toEqual([]);
    expect(searchSites('   ')).toEqual([]);
  });

  it('ranks a title hit above a keyword-only hit', () => {
    // "search" is in AltaVista's title ("AltaVista - The Search Engine") but only
    // in Yahoo's keywords, so AltaVista must rank higher.
    const results = searchSites('search');
    const alta = results.findIndex((r) => r.site.key === 'altavista');
    const yahoo = results.findIndex((r) => r.site.key === 'yahoo');
    expect(alta).toBeGreaterThanOrEqual(0);
    expect(yahoo).toBeGreaterThanOrEqual(0);
    expect(alta).toBeLessThan(yahoo);
  });

  it('puts an exact title match at the very top', () => {
    const results = searchSites('Yahoo!');
    expect(results[0]?.site.key).toBe('yahoo');
  });

  it('scores results high-to-low and carries a navigable url', () => {
    const results = searchSites('ram memory');
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
    const ram = results.find((r) => r.site.key === 'downloadram');
    expect(ram?.url).toBe('http://www.downloadmoreram.com');
  });

  it('produces a stable, absurd hit count per query', () => {
    const a = fakeHitCount('dancing hamsters');
    expect(a).toBe(fakeHitCount('dancing hamsters'));
    expect(a).toBeGreaterThanOrEqual(1_000_000);
    expect(fakeHitCount('other query')).not.toBe(a);
  });
});
