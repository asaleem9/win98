import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import QuickTimePlayer from '../QuickTimePlayer';

describe('QuickTimePlayer', () => {
  it('renders the player with a timeline', () => {
    renderWithProviders(<QuickTimePlayer />);
    expect(screen.getByLabelText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('QuickTime Player')).toBeInTheDocument();
  });

  it('shows the Pro upsell when clicking a menu', () => {
    renderWithProviders(<QuickTimePlayer />);
    fireEvent.click(screen.getByText('Movie'));
    expect(screen.getByText('QuickTime Pro Required')).toBeInTheDocument();
  });

  it('plays the free sample on first play, nags on the second', () => {
    renderWithProviders(<QuickTimePlayer />);
    const play = screen.getByText('▶');
    act(() => { fireEvent.click(play); });
    // Now playing -> pause icon present, no nag yet
    expect(screen.queryByText('QuickTime Pro Required')).not.toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByText('⏸')); }); // pause
    act(() => { fireEvent.click(screen.getByText('▶')); }); // second play -> nag
    expect(screen.getByText('QuickTime Pro Required')).toBeInTheDocument();
  });
});
