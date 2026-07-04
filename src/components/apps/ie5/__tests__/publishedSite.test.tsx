import { render } from '@testing-library/react';
import {
  findSiteByUrl,
  geocitiesUserFromUrl,
  setPublishedSiteReader,
  type PublishedSite,
} from '../websites/registry';

const published: PublishedSite = {
  html: '<h1>Welcome to Daves Page</h1><p>hi</p><script>alert(1)</script><img src=x onerror="alert(2)">',
  publishedAt: 0,
  userName: 'Dave',
  slug: 'dave',
};

// Render a SiteDef's page and hand back the container for DOM assertions.
function renderSite(url: string) {
  const site = findSiteByUrl(url);
  if (!site) throw new Error(`no site for ${url}`);
  const { container } = render(<>{site.render({ onNavigate: () => {} })}</>);
  return { site, container };
}

afterEach(() => setPublishedSiteReader(null));

describe('geocitiesUserFromUrl', () => {
  it('extracts the ~name from member URLs, with or without scheme/www', () => {
    expect(geocitiesUserFromUrl('http://www.geocities.com/~dave')).toBe('dave');
    expect(geocitiesUserFromUrl('geocities.com/~dave/')).toBe('dave');
    expect(geocitiesUserFromUrl('WWW.GEOCITIES.COM/~Dave')).toBe('dave');
  });
  it('returns null for non-member URLs', () => {
    expect(geocitiesUserFromUrl('http://www.geocities.com')).toBeNull();
    expect(geocitiesUserFromUrl('http://www.yahoo.com')).toBeNull();
  });
});

describe('published GeoCities page (FrontPage → IE5)', () => {
  it('serves the published HTML with scripts and inline handlers stripped', () => {
    setPublishedSiteReader(() => published);
    const { site, container } = renderSite('www.geocities.com/~dave');

    expect(site.title).toContain('Dave');
    expect(container.querySelector('h1')?.textContent).toBe('Welcome to Daves Page');
    // The dangerous bits never make it into the DOM.
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
    expect(container.innerHTML).not.toContain('alert(1)');
  });

  it('only matches the slug that was actually published', () => {
    setPublishedSiteReader(() => published);
    const { container } = renderSite('www.geocities.com/~someoneelse');
    expect(container.textContent).toContain('does not exist yet');
  });

  it('shows the "does not exist yet" page when nothing is published', () => {
    setPublishedSiteReader(() => null);
    const { container } = renderSite('www.geocities.com/~dave');
    expect(container.textContent).toContain('does not exist yet');
    expect(container.textContent).toContain('/~dave');
  });

  it('reads the published site from the settings blob by default', () => {
    // No injected reader — exercise the real localStorage path.
    setPublishedSiteReader(null);
    window.localStorage.setItem(
      'win98-prefs-v1',
      JSON.stringify({ frontpage: { publishedSite: published } }),
    );
    const { container } = renderSite('http://www.geocities.com/~dave');
    expect(container.querySelector('h1')?.textContent).toBe('Welcome to Daves Page');
    window.localStorage.removeItem('win98-prefs-v1');
  });
});
