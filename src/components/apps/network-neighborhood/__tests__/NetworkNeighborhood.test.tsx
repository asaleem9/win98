import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import NetworkNeighborhood from '../NetworkNeighborhood';

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

/** Double-click, driving through the slow-network spinner if one is present. */
function open(label: string) {
  fireEvent.doubleClick(screen.getByText(label));
  act(() => { vi.advanceTimersByTime(600); });
}

describe('Network Neighborhood', () => {
  it('lists the workgroup machines', () => {
    renderWithProviders(<NetworkNeighborhood windowId="w1" />);
    expect(screen.getByText('Entire Network')).toBeInTheDocument();
    expect(screen.getByText('Dads-computer')).toBeInTheDocument();
    expect(screen.getByText('Family-pc')).toBeInTheDocument();
  });

  it('errors on Entire Network without browsing', () => {
    const events: string[] = [];
    const listener = (e: Event) => events.push((e as CustomEvent).detail.message);
    window.addEventListener('win98-system-dialog', listener);
    renderWithProviders(<NetworkNeighborhood windowId="w1" />);
    fireEvent.doubleClick(screen.getByText('Entire Network'));
    window.removeEventListener('win98-system-dialog', listener);
    expect(events[0]).toContain('The network is not present');
  });

  it('browses into a machine after the searching pass and lists its shares', () => {
    renderWithProviders(<NetworkNeighborhood windowId="w1" />);
    fireEvent.doubleClick(screen.getByText('Dads-computer'));
    // Slow-network spinner shows first.
    expect(screen.getByText('Searching for computers...')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByText('shared')).toBeInTheDocument();
    expect(screen.getByText('photos')).toBeInTheDocument();
    expect(screen.getByText('SECRET-SHARE')).toBeInTheDocument();
  });

  it('gates SECRET-SHARE behind a password and unlocks with hunter2', () => {
    const events: string[] = [];
    const listener = (e: Event) => events.push((e as CustomEvent).detail.message);
    window.addEventListener('win98-system-dialog', listener);

    renderWithProviders(<NetworkNeighborhood windowId="w1" />);
    open('Dads-computer');
    fireEvent.doubleClick(screen.getByText('SECRET-SHARE'));

    // Wrong password → not accessible, contents stay hidden.
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByText('OK'));
    expect(events.at(-1)).toContain('The password is incorrect');
    expect(screen.queryByText('im_proud_of_you.txt')).not.toBeInTheDocument();

    // Correct password → share opens.
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2' } });
    fireEvent.click(screen.getByText('OK'));
    expect(screen.getByText('im_proud_of_you.txt')).toBeInTheDocument();
    expect(screen.getByText('secret_song.mp3')).toBeInTheDocument();

    window.removeEventListener('win98-system-dialog', listener);
  });

  it('maps a share to a drive and persists the pref', () => {
    renderWithProviders(<NetworkNeighborhood windowId="w1" />);
    open('Dads-computer');
    fireEvent.contextMenu(screen.getByText('shared'));
    fireEvent.click(screen.getByText('Map Network Drive...'));
    fireEvent.click(screen.getByText('OK'));

    const prefs = JSON.parse(window.localStorage.getItem('win98-prefs-v1')!);
    expect(prefs['network-neighborhood'].mappedDrive).toMatchObject({
      letter: 'Z:',
      path: '\\\\DADS-COMPUTER\\shared',
      share: 'shared',
      hostDisplay: 'Dads-computer',
    });
  });

  it('copies a network file to My Documents', () => {
    renderWithProviders(<NetworkNeighborhood windowId="w1" />);
    open('Dads-computer');
    fireEvent.doubleClick(screen.getByText('shared'));
    fireEvent.contextMenu(screen.getByText('taxes_1997.xls'));
    fireEvent.click(screen.getByText('Copy to My Documents'));
    expect(screen.getByText(/copied to My Documents/i)).toBeInTheDocument();
  });
});
