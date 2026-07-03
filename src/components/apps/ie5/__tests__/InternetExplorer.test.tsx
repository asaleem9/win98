import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import InternetExplorer from '../InternetExplorer';

/** Drive an address-bar navigation to `url` and let the fake load complete. */
function navigateTo(url: string) {
  const address = screen.getByDisplayValue(/./) as HTMLInputElement;
  act(() => {
    fireEvent.change(address, { target: { value: url } });
    fireEvent.submit(address.closest('form')!);
  });
}

describe('InternetExplorer routing', () => {
  it('renders the homepage site through the registry on mount', () => {
    renderWithProviders(<InternetExplorer windowId="w1" />);
    expect(screen.getByText('Yahoo! Mail')).toBeInTheDocument();
  });
});

describe('InternetExplorer loading + errors', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a dial-up loading sequence, then commits the new page', () => {
    renderWithProviders(<InternetExplorer windowId="w1" />);
    navigateTo('http://www.altavista.com');

    // Mid-load: status shows the "finding site" phase and the old page is still committed.
    expect(screen.getByText(/Finding site www\.altavista\.com/)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(3000));

    // AltaVista committed; status back to Done.
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your search terms')).toBeInTheDocument();
  });

  it('shows the DNS-error page for an unknown domain', () => {
    renderWithProviders(<InternetExplorer windowId="w1" />);
    navigateTo('http://www.nonexistent-zzz-9999.example');
    act(() => vi.advanceTimersByTime(3000));

    expect(screen.getByText('The page cannot be displayed')).toBeInTheDocument();
    expect(screen.getByText(/Cannot find server or DNS Error/)).toBeInTheDocument();
  });

  it('shows an HTTP 404 page for a known host with an unknown path', () => {
    renderWithProviders(<InternetExplorer windowId="w1" />);
    navigateTo('http://www.yahoo.com/no/such/page');
    act(() => vi.advanceTimersByTime(3000));

    expect(screen.getByText('The page cannot be found')).toBeInTheDocument();
    expect(screen.getByText(/HTTP 404 - File not found/)).toBeInTheDocument();
  });

  it('Stop cancels the load and stays on the previous page', () => {
    renderWithProviders(<InternetExplorer windowId="w1" />);
    // Begin loading a new page but stop before it finishes.
    navigateTo('http://www.altavista.com');
    const stopBtn = screen.getByText('Stop').closest('button')!;
    act(() => {
      fireEvent.click(stopBtn);
    });

    expect(screen.getByText('Stopped')).toBeInTheDocument();
    // The previous (home) page is still shown; AltaVista never committed.
    expect(screen.getByText('Yahoo! Mail')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter your search terms')).not.toBeInTheDocument();
  });
});

describe('InternetExplorer work offline', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the offline page when the workOffline pref is set', () => {
    window.localStorage.setItem(
      'win98-prefs-v1',
      JSON.stringify({ system: { workOffline: true } }),
    );
    renderWithProviders(<InternetExplorer windowId="w1" />);

    expect(screen.getByText(/you must connect to the Internet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument();
    // The status bar reflects the offline state.
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
});
