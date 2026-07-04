import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { setClipboard, getClipboard, __resetClipboard } from '@/lib/clipboard';
import { useSettings } from '@/contexts/SettingsContext';
import { isImageWallpaper } from '@/lib/wallpapers';
import Paint from '../Paint';

function WallpaperProbe() {
  const { settings } = useSettings();
  return <div data-testid="wallpaper">{JSON.stringify(settings.wallpaper)}</div>;
}

// jsdom doesn't implement ResizeObserver; Paint uses it to size the canvas
// to its container, so stub it out for the purposes of this test.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

beforeAll(() => {
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
  }
  // jsdom has no real canvas backend; give toDataURL a value so Copy works.
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,STUB';
});

afterAll(() => {
  HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
});

beforeEach(() => {
  localStorage.clear();
  __resetClipboard();
});

describe('Paint', () => {
  it('mounts without throwing even though jsdom canvas has no 2d context', () => {
    expect(() => renderWithProviders(<Paint windowId="w1" />)).not.toThrow();
  });

  it('renders the menu bar and tool sidebar', () => {
    const { getByText, getByTitle } = renderWithProviders(<Paint windowId="w1" />);
    expect(getByText('File')).toBeTruthy();
    expect(getByText('Edit')).toBeTruthy();
    expect(getByText('Image')).toBeTruthy();
    expect(getByTitle('pencil')).toBeTruthy();
  });

  it('copies the picture to the shared clipboard as an image', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Paint windowId="w1" />);

    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    await user.click(screen.getByRole('menuitem', { name: /Copy/ }));

    const clip = getClipboard();
    expect(clip?.kind).toBe('image');
    expect((clip as { dataUrl: string }).dataUrl).toContain('data:image/png');
  });

  it('disables Paste when the clipboard holds no image', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Paint windowId="w1" />);

    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(screen.getByRole('menuitem', { name: /Paste/ })).toBeDisabled();
  });

  it('consumes an image clipboard entry on Paste without throwing', async () => {
    const user = userEvent.setup();
    setClipboard({ kind: 'image', dataUrl: 'data:image/png;base64,STUB' });
    renderWithProviders(<Paint windowId="w1" />);

    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    const paste = screen.getByRole('menuitem', { name: /Paste/ });
    expect(paste).not.toBeDisabled();
    await user.click(paste); // must not throw despite the null 2d context
    expect(getClipboard()?.kind).toBe('image');
  });

  it('scales the canvas display when a zoom level is chosen', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<Paint windowId="w1" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.getAttribute('data-zoom')).toBe('1');

    await user.click(screen.getByRole('menuitem', { name: 'View' }));
    await user.click(screen.getByRole('menuitem', { name: /Zoom/ }));
    await user.click(screen.getByRole('menuitemradio', { name: /2x/ }));

    expect(canvas.getAttribute('data-zoom')).toBe('2');
  });

  it('pushes the picture to the desktop as a tiled bitmap wallpaper', async () => {
    const user = userEvent.setup();
    // Probe shares Paint's SettingsProvider so it sees the wallpaper it writes.
    renderWithProviders(
      <>
        <Paint windowId="w1" />
        <WallpaperProbe />
      </>,
    );

    await user.click(screen.getByRole('menuitem', { name: 'File' }));
    await user.click(screen.getByRole('menuitem', { name: 'Set As Wallpaper (Tiled)' }));

    const wallpaper = JSON.parse(screen.getByTestId('wallpaper').textContent || 'null');
    expect(isImageWallpaper(wallpaper)).toBe(true);
    expect(wallpaper.mode).toBe('tile');
    expect(wallpaper.source).toContain('data:image/png');
  });
});
