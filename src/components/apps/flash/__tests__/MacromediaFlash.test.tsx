import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MacromediaFlash from '../MacromediaFlash';

describe('MacromediaFlash', () => {
  it('mounts without throwing', () => {
    expect(() => renderWithProviders(<MacromediaFlash windowId="w1" />)).not.toThrow();
  });

  it('renders the real menu bar with every top-level menu', () => {
    renderWithProviders(<MacromediaFlash windowId="w1" />);
    const bar = within(screen.getByRole('menubar'));
    for (const label of ['File', 'Edit', 'View', 'Insert', 'Modify', 'Control', 'Help']) {
      expect(bar.getByRole('menuitem', { name: label })).toBeTruthy();
    }
  });

  it('applies a new stage size from Modify > Document', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MacromediaFlash windowId="w1" />);
    await user.click(within(screen.getByRole('menubar')).getByRole('menuitem', { name: 'Modify' }));
    await user.click(await screen.findByRole('menuitem', { name: /Document/ }));
    const width = screen.getAllByRole('spinbutton')[0] as HTMLInputElement;
    fireEvent.change(width, { target: { value: '800' } });
    await user.click(screen.getByText('OK'));
    expect(screen.getByText('800')).toBeInTheDocument();
  }, 15000);

  it('shows the initial frame count', () => {
    renderWithProviders(<MacromediaFlash windowId="w1" />);
    expect(screen.getByText('Frame 1 / 60')).toBeInTheDocument();
  });

  it('selects a frame from the timeline without crashing', () => {
    renderWithProviders(<MacromediaFlash windowId="w1" />);
    // First cursor-pointer element is the layer row; frame cells follow in order.
    const cells = document.querySelectorAll('.cursor-pointer');
    expect(cells.length).toBeGreaterThan(0);
    fireEvent.click(cells[5]);
    expect(screen.getByText('Frame 5 / 60')).toBeInTheDocument();
  });

  it('toggles play and stop without hanging', () => {
    renderWithProviders(<MacromediaFlash windowId="w1" />);
    fireEvent.click(screen.getByTitle('Play'));
    fireEvent.click(screen.getByTitle('Stop'));
  });

  it('adds a layer', () => {
    renderWithProviders(<MacromediaFlash windowId="w1" />);
    fireEvent.click(screen.getByText('+ Add Layer'));
    expect(screen.getByText('Layer 2')).toBeInTheDocument();
  });

  it('draws on the stage with the pencil tool without crashing (ctx is null in jsdom)', () => {
    renderWithProviders(<MacromediaFlash windowId="w1" />);
    fireEvent.click(screen.getByTitle('Pencil'));
    const overlay = document.querySelector('.absolute.inset-0[style*="cursor"]');
    expect(overlay).toBeTruthy();
    if (overlay) {
      fireEvent.pointerDown(overlay, { clientX: 10, clientY: 10 });
      fireEvent.pointerMove(overlay, { clientX: 20, clientY: 20 });
      fireEvent.pointerUp(overlay);
    }
  });
});
