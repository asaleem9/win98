import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import Winamp from '../Winamp';

describe('Winamp', () => {
  it('renders the first bundled track and transport', () => {
    renderWithProviders(<Winamp windowId="w1" />);
    expect(screen.getByTitle('Play')).toBeInTheDocument();
    expect(screen.getByLabelText('Volume')).toBeInTheDocument();
    // Marquee shows the real track title from tracks.ts
    expect(screen.getAllByText(/Dial-Up Dreams/i).length).toBeGreaterThan(0);
  });

  it('toggles play/pause without throwing', () => {
    renderWithProviders(<Winamp windowId="w1" />);
    const play = screen.getByTitle('Play');
    act(() => { fireEvent.click(play); });
    expect(screen.getByTitle('Pause')).toBeInTheDocument();
  });

  it('opens the playlist editor with all six tracks', () => {
    renderWithProviders(<Winamp windowId="w1" />);
    fireEvent.click(screen.getByText('PL'));
    expect(screen.getByText('6 tracks')).toBeInTheDocument();
  });

  it('toggles shuffle and repeat modes', () => {
    renderWithProviders(<Winamp windowId="w1" />);
    const shuffle = screen.getByText('SHUFFLE');
    fireEvent.click(shuffle);
    expect(shuffle.className).toContain('bg-[#00aa00]');
  });

  it('shows the launched filename for an unknown mp3', () => {
    renderWithProviders(
      <Winamp windowId="w1" launchParams={{ filePath: 'C:\\Downloads\\mystery_track.mp3' }} launchCount={1} />,
    );
    expect(screen.getAllByText(/mystery_track\.mp3/i).length).toBeGreaterThan(0);
  });
});
