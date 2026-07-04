import { act, fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import NeroBurningROM from '../NeroBurningROM';

describe('NeroBurningROM', () => {
  it('renders the real menu bar with every top-level menu', () => {
    renderWithProviders(<NeroBurningROM windowId="n1" />);
    const bar = within(screen.getByRole('menubar'));
    for (const label of ['File', 'Edit', 'View', 'Recorder', 'Help']) {
      expect(bar.getByRole('menuitem', { name: label })).toBeTruthy();
    }
  });

  it('preserves the burn-to-BSOD gag by starting a burn', () => {
    renderWithProviders(<NeroBurningROM windowId="n2" />);
    fireEvent.click(screen.getByRole('button', { name: /Burn/ }));
    expect(screen.getByText(/Writing track 1 of 1/)).toBeInTheDocument();
  });

  it('erases a rewritable disc back to blank, clearing the compilation', () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<NeroBurningROM windowId="n3" />);

      // Add a real file to the compilation via the browser panel.
      fireEvent.doubleClick(screen.getByText('My Documents'));
      fireEvent.doubleClick(screen.getByText('readme.txt'));
      expect(screen.queryByText(/Add files from the browser/)).toBeNull();

      // Erase from the Recorder menu.
      fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Recorder' }));
      fireEvent.click(screen.getByRole('menuitem', { name: /Erase/ }));

      // Run the erase progress to completion.
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.getByText(/Add files from the browser/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
