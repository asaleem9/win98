import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import LimeWire from '../LimeWire';

describe('LimeWire', () => {
  it('renders the File, Actions and Help menus', () => {
    renderWithProviders(<LimeWire windowId="w1" />);
    expect(screen.getByRole('menuitem', { name: 'File' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Help' })).toBeInTheDocument();
  });

  it('still springs the virus trap when a malware result finishes downloading', () => {
    vi.useFakeTimers();
    // High random forces every search match into the (large) result slice.
    const rand = vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const dialogSpy = vi.fn();
    window.addEventListener('win98-system-dialog', dialogSpy);
    try {
      renderWithProviders(<LimeWire windowId="w1" />);

      const input = screen.getByPlaceholderText('Search for files...');
      fireEvent.change(input, { target: { value: 'totally_not_a_virus' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // The malware result is still listed.
      const virus = screen.getByText('totally_not_a_virus.exe');
      expect(virus).toBeInTheDocument();

      // Downloading it to completion still trips the gag.
      fireEvent.doubleClick(virus);
      act(() => { vi.advanceTimersByTime(700 * 12); });

      expect(screen.getByText('INFECTED!')).toBeInTheDocument();
      expect(dialogSpy).toHaveBeenCalled();
    } finally {
      window.removeEventListener('win98-system-dialog', dialogSpy);
      rand.mockRestore();
      vi.useRealTimers();
    }
  });

  it('cancels a transfer from its row context menu', () => {
    vi.useFakeTimers();
    const rand = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      renderWithProviders(<LimeWire windowId="w1" />);

      const input = screen.getByPlaceholderText('Search for files...');
      fireEvent.change(input, { target: { value: 'dial' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Start a plain (non-virus) music download.
      fireEvent.doubleClick(screen.getByText('the_modem_tones-dial_up_dreams.mp3'));

      const row = screen.getByText('the_modem_tones-dial_up_dreams.mp3');
      fireEvent.contextMenu(row);
      fireEvent.click(screen.getByText('Cancel'));

      expect(screen.getByText('No active downloads')).toBeInTheDocument();
    } finally {
      rand.mockRestore();
      vi.useRealTimers();
    }
  });
});
