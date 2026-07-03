import { findSiteByUrl, getAllSites, SITES } from '../websites/registry';

describe('IE5 site registry', () => {
  it('exposes every registered site with the required fields', () => {
    expect(getAllSites()).toBe(SITES);
    expect(SITES.length).toBeGreaterThanOrEqual(8);
    for (const site of SITES) {
      expect(site.key).toBeTruthy();
      expect(site.urls.length).toBeGreaterThan(0);
      expect(site.title).toBeTruthy();
      expect(Array.isArray(site.keywords)).toBe(true);
      expect(typeof site.render).toBe('function');
    }
  });

  it('resolves a known URL to its site', () => {
    expect(findSiteByUrl('http://www.yahoo.com')?.key).toBe('yahoo');
    expect(findSiteByUrl('http://www.downloadmoreram.com')?.title).toBe('DownloadMoreRAM.com');
    expect(findSiteByUrl('about:blank')?.key).toBe('blank');
  });

  it('normalizes case, whitespace, and trailing slashes', () => {
    expect(findSiteByUrl('  WWW.YAHOO.COM/  ')?.key).toBe('yahoo');
    expect(findSiteByUrl('ASK.COM')?.key).toBe('askjeeves');
  });

  it('matches all of a site\'s aliases', () => {
    const askAliases = ['http://www.askjeeves.com', 'askjeeves.com', 'ask.com', 'www.ask.com'];
    for (const url of askAliases) expect(findSiteByUrl(url)?.key).toBe('askjeeves');
  });

  it('returns null for an unknown URL (→ 404 page)', () => {
    expect(findSiteByUrl('http://www.google.com')).toBeNull();
    expect(findSiteByUrl('not-a-real-site.example')).toBeNull();
    expect(findSiteByUrl('')).toBeNull();
  });

  it('keeps site keys unique', () => {
    const keys = SITES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
