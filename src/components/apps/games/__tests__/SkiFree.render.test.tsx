import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import SkiFree from '../SkiFree';

// jsdom has no 2d context, so the canvas render loop no-ops; this only proves
// the shell mounts, the mode cards start a run, and none of the JSX throws.
describe('SkiFree shell', () => {
  it('offers the three modes on the title screen', () => {
    renderWithProviders(<SkiFree windowId="w" />);
    expect(screen.getByText('Free Style')).toBeTruthy();
    expect(screen.getByText('Slalom')).toBeTruthy();
    expect(screen.getByText('Tree Slalom')).toBeTruthy();
  });

  it('drops into a freestyle run with a canvas and distance meter', () => {
    const { container } = renderWithProviders(<SkiFree windowId="w" />);
    fireEvent.click(screen.getByText('Free Style'));
    expect(container.querySelector('canvas')).toBeTruthy();
    expect(screen.getByText('0 m')).toBeTruthy();
  });

  it('drops into a timed slalom run', () => {
    const { container } = renderWithProviders(<SkiFree windowId="w" />);
    fireEvent.click(screen.getByText('Slalom'));
    expect(container.querySelector('canvas')).toBeTruthy();
    // the timed HUD shows the mode label rather than a style counter
    expect(screen.getByText('Slalom')).toBeTruthy();
  });
});
