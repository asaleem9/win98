import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import InternetExplorer from '../InternetExplorer';

describe('InternetExplorer routing', () => {
  it('renders the homepage site through the registry', () => {
    renderWithProviders(<InternetExplorer windowId="w1" />);
    // Yahoo! renders its "Yahoo! Mail" link
    expect(screen.getByText('Yahoo! Mail')).toBeInTheDocument();
  });

  it('shows the 404 page for an unregistered URL', () => {
    renderWithProviders(<InternetExplorer windowId="w1" />);
    const address = screen.getByDisplayValue('http://www.yahoo.com');
    act(() => {
      fireEvent.change(address, { target: { value: 'http://www.google.com' } });
      fireEvent.submit(address.closest('form')!);
    });
    expect(screen.getByText('The page cannot be displayed')).toBeInTheDocument();
  });

  it('routes a second registered site', () => {
    renderWithProviders(<InternetExplorer windowId="w1" />);
    const address = screen.getByDisplayValue('http://www.yahoo.com');
    act(() => {
      fireEvent.change(address, { target: { value: 'http://www.downloadmoreram.com' } });
      fireEvent.submit(address.closest('form')!);
    });
    // The DownloadMoreRAM site is now active (Yahoo content is gone)
    expect(screen.queryByText('Yahoo! Mail')).not.toBeInTheDocument();
  });
});
