import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import RealPlayer from '../RealPlayer';

describe('RealPlayer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts in the buffering state', () => {
    renderWithProviders(<RealPlayer windowId="w1" />);
    expect(screen.getByText(/Connecting|Buffering/)).toBeInTheDocument();
  });

  it('connects and plays after several buffering cycles', () => {
    renderWithProviders(<RealPlayer windowId="w1" />);
    // Drive enough interval ticks to cross three buffer cycles.
    act(() => { vi.advanceTimersByTime(700 * 200); });
    expect(screen.getByText('Playing')).toBeInTheDocument();
  });

  it('renders six transport buttons', () => {
    renderWithProviders(<RealPlayer windowId="w1" />);
    ['Rewind', 'Back', 'Play', 'Stop', 'Forward', 'End'].forEach((t) => {
      expect(screen.getByTitle(t)).toBeInTheDocument();
    });
  });

  it('does not throw when clicking transport during buffering', () => {
    renderWithProviders(<RealPlayer windowId="w1" />);
    act(() => { fireEvent.click(screen.getByTitle('Stop')); });
    expect(screen.getByTitle('Stop')).toBeInTheDocument();
  });

  it('exposes File, Favorites and Help menus', () => {
    renderWithProviders(<RealPlayer windowId="w1" />);
    expect(screen.getByRole('menuitem', { name: 'File' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Favorites' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Help' })).toBeInTheDocument();
  });

  it('shows an empty Favorites list before anything is added', () => {
    localStorage.clear();
    renderWithProviders(<RealPlayer windowId="w1" />);
    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Favorites' }));
    expect(screen.getByRole('menuitem', { name: '(Empty)' })).toBeInTheDocument();
  });

  it('adds the current clip to Favorites and persists it across remounts', () => {
    localStorage.clear();
    const { unmount } = renderWithProviders(<RealPlayer windowId="w1" />);
    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Favorites' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Add Current to Favorites/ }));

    // The loaded clip (Midnight MIDI) now shows up as a favorite entry.
    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Favorites' }));
    expect(screen.getByRole('menuitem', { name: 'Midnight MIDI' })).toBeInTheDocument();

    unmount();

    // A fresh instance reads the favorite back out of localStorage.
    renderWithProviders(<RealPlayer windowId="w1" />);
    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Favorites' }));
    expect(screen.getByRole('menuitem', { name: 'Midnight MIDI' })).toBeInTheDocument();
  });

  it('routes an opened file back through the buffering theater', () => {
    renderWithProviders(<RealPlayer windowId="w1" />);
    // Get past the initial buffering so we can prove Open resets it.
    act(() => { vi.advanceTimersByTime(700 * 200); });
    expect(screen.getByText('Playing')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'File' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Open/ }));

    // Confirm a filename in the picker.
    const nameInput = screen.getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'welcome.ram' } });
    act(() => { fireEvent.keyDown(nameInput, { key: 'Enter' }); });

    expect(screen.getByText(/Connecting|Buffering/)).toBeInTheDocument();
    expect(screen.queryByText('Playing')).not.toBeInTheDocument();
  });
});
