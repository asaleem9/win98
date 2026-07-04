import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import FrontPage from '../FrontPage';
import { findSiteByUrl, setPublishedSiteReader } from '@/components/apps/ie5/websites/registry';

vi.mock('@/lib/sounds', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/sounds')>();
  return { ...actual, playSound: vi.fn() };
});

describe('FrontPage Publish Web', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    setPublishedSiteReader(null);
  });
  afterEach(() => {
    vi.useRealTimers();
    setPublishedSiteReader(null);
    window.localStorage.clear();
  });

  it('publishes to the pref, announces the URL, and IE5 then serves the page', async () => {
    const urls: (string | undefined)[] = [];
    const handler = (e: Event) => urls.push((e as CustomEvent<{ url?: string }>).detail?.url);
    window.addEventListener('frontpage-published', handler);

    renderWithProviders(<FrontPage windowId="w1" />);

    // Kick off the wizard from the toolbar and confirm the upload.
    act(() => { fireEvent.click(screen.getByTitle('Publish Web')); });
    act(() => { fireEvent.click(screen.getByText('Publish')); });

    // Crawl the 28.8k progress bar to completion. Each tick schedules the next
    // via a passive effect, so an act boundary per step flushes that effect
    // before the next timer is due.
    for (let i = 0; i < 30 && urls.length === 0; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(120); });
    }

    window.removeEventListener('frontpage-published', handler);

    // Default user has no configured name → slug "user".
    expect(urls).toContain('www.geocities.com/~user');
    expect(screen.getByText(/published successfully/i)).toBeTruthy();

    // The page is now in the pref, so the IE5 registry resolves it end-to-end.
    const site = findSiteByUrl('www.geocities.com/~user');
    expect(site).toBeTruthy();
  });
});
