import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { fireEvent, screen } from '@testing-library/react';
import MacromediaFlash from '../MacromediaFlash';

describe('MacromediaFlash', () => {
  it('mounts without throwing', () => {
    expect(() => renderWithProviders(<MacromediaFlash windowId="w1" />)).not.toThrow();
  });

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
