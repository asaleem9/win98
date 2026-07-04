import { fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import Bunker98 from '../Bunker98';

// The raycaster must survive jsdom, which has no 2d canvas context — the render
// loop null-checks getContext and the whole thing should mount, start a sector
// and tear down without throwing.
describe('Bunker 98 raycaster', () => {
  it('mounts the title screen', () => {
    const { getByText, unmount } = renderWithProviders(<Bunker98 windowId="test" />);
    expect(getByText('BUNKER 98')).toBeInTheDocument();
    unmount();
  });

  it('starts a sector and shows the combat HUD', () => {
    const { getByText, getAllByText, unmount } = renderWithProviders(<Bunker98 windowId="test" />);
    // "New Game" drops straight into sector one.
    fireEvent.click(getByText('New Game'));
    // The status bar renders its labelled panels.
    expect(getAllByText('Health').length).toBeGreaterThan(0);
    expect(getByText('Ammo')).toBeInTheDocument();
    unmount();
  });

  it('opens the Read This gag and returns', () => {
    const { getByText, unmount } = renderWithProviders(<Bunker98 windowId="test" />);
    fireEvent.click(getByText('Read This!'));
    expect(getByText('READ THIS!')).toBeInTheDocument();
    fireEvent.click(getByText('Back'));
    expect(getByText('BUNKER 98')).toBeInTheDocument();
    unmount();
  });
});
