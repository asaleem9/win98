import { isValidElement } from 'react';
import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { findSiteByUrl, getAllSites, SITES } from '../websites/registry';
import CnetDownloads from '../websites/CnetDownloads';
import WebRing from '../websites/WebRing';

const WINZIP_PATH = 'C:\\My Documents\\Downloads\\winzip70.exe';

// Renders the downloaded file's content so the test can read it straight from
// the DOM, without reaching into the filesystem context from outside render.
function DownloadProbe() {
  const { readFile } = useFileSystem();
  return <span data-testid="winzip">{readFile(WINZIP_PATH) ?? 'none'}</span>;
}

// Keep audio side effects out of the tests; leave everything else real so
// SettingsContext and the Web Audio helpers still resolve.
vi.mock('@/lib/sounds', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/sounds')>();
  return { ...actual, playSound: vi.fn() };
});

const NEW_KEYS = [
  'downloads',
  'ebay',
  'amazon',
  'dancingbaby',
  'midishrine',
  'y2k',
  'hotmail',
  'shadypopups',
  'spacejam',
] as const;

describe('IE5 wave-1 sites', () => {
  it('registers every new site with valid, unique, resolvable definitions', () => {
    for (const key of NEW_KEYS) {
      const site = SITES.find((s) => s.key === key);
      expect(site, `site "${key}" is registered`).toBeTruthy();
      expect(site!.urls.length).toBeGreaterThan(0);
      expect(site!.title).toBeTruthy();
      expect(Array.isArray(site!.keywords)).toBe(true);
      expect(site!.keywords.length).toBeGreaterThan(0);
      // Every alias resolves back to this exact site.
      for (const url of site!.urls) {
        expect(findSiteByUrl(url)?.key).toBe(key);
      }
    }
  });

  it('keeps all site keys unique across the registry', () => {
    const keys = getAllSites().map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('render() returns React nodes for each new site', () => {
    const onNavigate = vi.fn();
    for (const key of NEW_KEYS) {
      const site = SITES.find((s) => s.key === key)!;
      expect(isValidElement(site.render({ onNavigate }))).toBe(true);
    }
  });

  it('the retro ring Random button navigates to a registered site url', () => {
    const onNavigate = vi.fn();
    renderWithProviders(<WebRing onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('[ Random ]'));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    const target = onNavigate.mock.calls[0][0] as string;
    expect(findSiteByUrl(target)).not.toBeNull();
  });

  it('CNET Download.com writes a real installer file to the Downloads folder', () => {
    vi.useFakeTimers();
    renderWithProviders(
      <>
        <DownloadProbe />
        <CnetDownloads />
      </>,
    );

    expect(screen.getByTestId('winzip')).toHaveTextContent('none');

    // WinZip is the first "Download Now" button.
    act(() => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Download Now' })[0]);
    });
    // Advance well past the fake dial-up progress bar.
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByTestId('winzip')).toHaveTextContent('installer:winzip');
    vi.useRealTimers();
  });
});
