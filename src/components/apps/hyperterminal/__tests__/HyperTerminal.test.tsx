import { fireEvent, screen, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { useFileSystem } from '@/contexts/FileSystemContext';
import HyperTerminal from '../HyperTerminal';

vi.mock('@/lib/sounds', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/sounds')>();
  return { ...actual, playSound: vi.fn() };
});

// Surfaces the Downloads folder contents so the test can prove a real file was
// written into the virtual filesystem.
function DownloadsProbe() {
  const { listDir } = useFileSystem();
  const names = (listDir('C:\\My Documents\\Downloads') ?? []).map((f) => f.name);
  return <div data-testid="downloads">{names.join('|')}</div>;
}

function term() {
  return screen.getByLabelText('BBS terminal');
}

describe('HyperTerminal BBS', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('dials a board, downloads a file, and writes it to disk via ZMODEM', async () => {
    renderWithProviders(
      <>
        <HyperTerminal windowId="w1" />
        <DownloadsProbe />
      </>,
    );

    // Nothing downloaded yet.
    expect(screen.getByTestId('downloads').textContent).toBe('');

    // Dial Midnight Tower from the phone book, then confirm the number.
    fireEvent.click(screen.getByText('Midnight Tower BBS'));
    fireEvent.click(screen.getByText('Dial'));

    // Modem handshake -> CONNECT -> online at the main menu.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2600);
    });

    // Navigate: (F)iles -> select #1 -> (D)ownload.
    fireEvent.keyDown(term(), { key: 'f' });
    fireEvent.keyDown(term(), { key: '1' });
    fireEvent.keyDown(term(), { key: 'd' });

    // Let the ZMODEM progress bar run to 100%.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.getByTestId('downloads').textContent).toContain('PHRACK-LITE-7.TXT');
  });

  it('gives a busy signal when dialing the long-distance CompuServe number', async () => {
    renderWithProviders(<HyperTerminal windowId="w1" />);

    fireEvent.click(screen.getByText('CompuServe (long distance!)'));
    fireEvent.click(screen.getByText('Dial'));

    // Dial out, then let the whole busy sequence stream in.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });

    expect(term().textContent).toContain('BUSY');
    expect(term().textContent).toContain('NO CARRIER');
  });
});
