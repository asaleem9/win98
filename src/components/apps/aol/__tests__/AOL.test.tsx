import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import AOL from '../AOL';

const PREFS_KEY = 'win98-prefs-v1';

// Land straight in the lobby by pretending we finished dialing on a prior visit.
function seedSignedOn(extra: Record<string, unknown> = {}) {
  localStorage.setItem(PREFS_KEY, JSON.stringify({ aol: { signedOn: true, ...extra } }));
}

describe('AOL', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('replays the dial theater on a fresh, signed-off launch', () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<AOL windowId="w1" />);
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('lands directly on the channels view when already signed on', () => {
    seedSignedOn();
    renderWithProviders(<AOL windowId="w1" />);
    expect(screen.queryByText('Connecting...')).not.toBeInTheDocument();
    expect(screen.getByText('Welcome, SurfDude98!')).toBeInTheDocument();
  });

  it('exposes the File, Mail, Go To and Help menus', () => {
    seedSignedOn();
    renderWithProviders(<AOL windowId="w1" />);
    expect(screen.getByRole('menuitem', { name: 'File' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Mail' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Go To' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Help' })).toBeInTheDocument();
  });

  it('marks a message read, drops the unread count and persists across remounts', () => {
    seedSignedOn();
    const { unmount } = renderWithProviders(<AOL windowId="w1" />);

    // Enter the mailbox through the Mail menu.
    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Mail' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Read New Mail/ }));

    // All eight spam messages start unread.
    expect(screen.getByText('New Mail (8)')).toBeInTheDocument();

    // Selecting a message marks it read.
    fireEvent.click(screen.getByText('URGENT: I Need Your Help Moving $45,000,000 USD'));
    expect(screen.getByText('New Mail (7)')).toBeInTheDocument();

    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY)!);
    expect(prefs.aol.readMail).toContain(0);

    unmount();

    // The read state survives a remount.
    renderWithProviders(<AOL windowId="w1" />);
    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Mail' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Read New Mail/ }));
    expect(screen.getByText('New Mail (7)')).toBeInTheDocument();
  });

  it('offers a channel "Read more" link that opens without throwing', () => {
    seedSignedOn();
    renderWithProviders(<AOL windowId="w1" />);

    // Jump to the Shopping channel via the Go To menu.
    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Go To' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Shopping' }));

    const readMore = screen.getAllByText('Read more »')[0];
    expect(readMore).toBeInTheDocument();
    expect(() => fireEvent.click(readMore)).not.toThrow();
  });
});
