import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import Napster from '../Napster';

describe('Napster', () => {
  it('renders the File, Actions and Help menus', () => {
    renderWithProviders(<Napster windowId="w1" />);
    expect(screen.getByRole('menuitem', { name: 'File' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Help' })).toBeInTheDocument();
  });

  it('cancels a transfer stalled at 99% via the Actions menu', () => {
    vi.useFakeTimers();
    // Forcing random low keeps the 99% stall gag on and makes progress deterministic.
    const rand = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      renderWithProviders(<Napster windowId="w1" />);

      const input = screen.getByPlaceholderText('Search for songs...');
      fireEvent.change(input, { target: { value: 'nirvana' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.click(screen.getAllByText('Get')[0]);

      // Drive the download until it gets stuck at 99%.
      act(() => { vi.advanceTimersByTime(300 * 120); });
      expect(screen.getByText('Stalled!')).toBeInTheDocument();

      // Actions > Cancel Transfer dismisses the stalled transfer.
      fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Actions' }));
      const cancel = screen.getByRole('menuitem', { name: 'Cancel Transfer' });
      expect(cancel).not.toBeDisabled();
      fireEvent.click(cancel);

      expect(screen.queryByText('Stalled!')).not.toBeInTheDocument();
      expect(screen.getByText(/No downloads yet/)).toBeInTheDocument();
    } finally {
      rand.mockRestore();
      vi.useRealTimers();
    }
  });

  it('cancels a transfer from its row context menu', () => {
    vi.useFakeTimers();
    // Mid-range random avoids the stall so the transfer is a plain in-progress one.
    const rand = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      renderWithProviders(<Napster windowId="w1" />);

      const input = screen.getByPlaceholderText('Search for songs...');
      fireEvent.change(input, { target: { value: 'nirvana' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.click(screen.getAllByText('Get')[0]);

      act(() => { vi.advanceTimersByTime(300 * 3); });

      const row = screen.getByText(/Nirvana - Smells Like Teen Spirit/);
      fireEvent.contextMenu(row);
      fireEvent.click(screen.getByText('Cancel'));

      expect(screen.getByText(/No downloads yet/)).toBeInTheDocument();
    } finally {
      rand.mockRestore();
      vi.useRealTimers();
    }
  });
});
