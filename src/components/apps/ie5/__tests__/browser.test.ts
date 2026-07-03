import {
  classifyPage,
  loadDurationFor,
  generateSourceHtml,
  sourceFileName,
  hostOf,
  bareHost,
} from '../websites/browser';

describe('hostOf / bareHost', () => {
  it('strips protocol, path, and www', () => {
    expect(hostOf('http://www.Yahoo.com/news/index.html')).toBe('www.yahoo.com');
    expect(hostOf('altavista.com')).toBe('altavista.com');
    expect(bareHost('www.yahoo.com')).toBe('yahoo.com');
  });
});

describe('classifyPage', () => {
  it('resolves a registered site', () => {
    expect(classifyPage('http://www.yahoo.com', { workOffline: false })).toBe('site');
  });

  it('returns http404 for a known host with an unknown path', () => {
    expect(classifyPage('http://www.yahoo.com/does/not/exist', { workOffline: false })).toBe('http404');
  });

  it('returns dns for an unknown host', () => {
    expect(classifyPage('http://www.nonexistent-zzz-9999.example', { workOffline: false })).toBe('dns');
  });

  it('returns offline whenever working offline, regardless of url', () => {
    expect(classifyPage('http://www.yahoo.com', { workOffline: true })).toBe('offline');
    expect(classifyPage('http://www.nonexistent-zzz-9999.example', { workOffline: true })).toBe('offline');
  });
});

describe('loadDurationFor', () => {
  it('is deterministic per url', () => {
    expect(loadDurationFor('http://www.yahoo.com', false)).toBe(loadDurationFor('http://www.yahoo.com', false));
  });

  it('stays within the dial-up range when cold and snaps in when cached', () => {
    const cold = loadDurationFor('http://www.geocities.com', false);
    const warm = loadDurationFor('http://www.geocities.com', true);
    expect(cold).toBeGreaterThanOrEqual(800);
    expect(cold).toBeLessThanOrEqual(2500);
    expect(warm).toBeLessThanOrEqual(340);
    expect(warm).toBeLessThan(cold);
  });
});

describe('generateSourceHtml', () => {
  it('embeds the site title and retro FrontPage markup', () => {
    const html = generateSourceHtml('http://www.yahoo.com');
    expect(html).toContain('Yahoo!');
    expect(html).toContain('<TITLE>');
    expect(html).toContain('<FONT');
    expect(html).toContain('FrontPage');
    expect(html).toContain('under construction');
    // Doctype-less, as 1998 intended.
    expect(html.toLowerCase()).not.toContain('<!doctype');
  });

  it('falls back gracefully for an unknown url', () => {
    const html = generateSourceHtml('http://www.nowhere-zzz.example');
    expect(html).toContain('http://www.nowhere-zzz.example');
  });
});

describe('sourceFileName', () => {
  it('names the temp file after the site key', () => {
    expect(sourceFileName('http://www.yahoo.com')).toBe('yahoo.htm');
  });

  it('derives a safe name from an unknown host', () => {
    expect(sourceFileName('http://www.nowhere-zzz.example/x')).toBe('nowhere_zzz_example.htm');
  });
});
