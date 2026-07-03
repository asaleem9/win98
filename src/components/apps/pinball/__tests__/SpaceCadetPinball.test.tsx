import { screen, fireEvent, cleanup } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import SpaceCadetPinball from '../SpaceCadetPinball';

// jsdom's canvas 2D context is null, so this mostly exercises the
// getContext-guard and the game-loop setup/teardown around it.
describe('SpaceCadetPinball', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders without crashing even though canvas has no 2D context in jsdom', () => {
    renderWithProviders(<SpaceCadetPinball windowId="w1" />);
    expect(screen.getAllByText('Press F2 to start').length).toBeGreaterThan(0);
    expect(screen.getByText('BALLS')).toBeInTheDocument();
  });

  it('starts a new game on F2 and shows the mission message', () => {
    renderWithProviders(<SpaceCadetPinball windowId="w1" />);
    fireEvent.keyDown(window, { code: 'F2' });
    expect(screen.getByText(/MISSION 1/)).toBeInTheDocument();
  });

  it('unmounts cleanly, cancelling the animation frame loop', () => {
    const { unmount } = renderWithProviders(<SpaceCadetPinball windowId="w1" />);
    expect(() => unmount()).not.toThrow();
  });
});
