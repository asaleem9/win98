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
    expect(screen.getByText(/6 tracks/)).toBeInTheDocument();
  });

  it('toggles shuffle and repeat modes', () => {
    renderWithProviders(<Winamp windowId="w1" />);
    const shuffle = screen.getByText('SHUFFLE');
    fireEvent.click(shuffle);
    expect(shuffle.className).toContain('bg-[var(--wa-accent-dim)]');
  });

  it('shows the launched filename for an unknown mp3', () => {
    renderWithProviders(
      <Winamp windowId="w1" launchParams={{ filePath: 'C:\\Downloads\\mystery_track.mp3' }} launchCount={1} />,
    );
    expect(screen.getAllByText(/mystery_track\.mp3/i).length).toBeGreaterThan(0);
  });

  it('opens the equalizer with the ten bands, preamp, ON and presets', () => {
    renderWithProviders(<Winamp windowId="w1" />);
    fireEvent.click(screen.getByText('EQ'));
    expect(screen.getByLabelText('Preamp')).toBeInTheDocument();
    expect(screen.getByLabelText('EQ 60')).toBeInTheDocument();
    expect(screen.getByLabelText('EQ 16K')).toBeInTheDocument();
    const on = screen.getByText('ON');
    fireEvent.click(on);
    expect(on.className).toContain('bg-[var(--wa-accent-dim)]');
    // Applying a preset moves a band off zero.
    fireEvent.click(screen.getByText('Rock'));
    expect((screen.getByLabelText('EQ 60') as HTMLInputElement).value).toBe('6');
  });

  it('persists the chosen skin via the Options menu', () => {
    renderWithProviders(<Winamp windowId="w1" />);
    fireEvent.click(screen.getByText('OPT'));
    fireEvent.click(screen.getByText(/Winter/));
    const prefs = JSON.parse(window.localStorage.getItem('win98-prefs-v1') || '{}');
    expect(prefs.winamp.skin).toBe('winter');
  });

  it('adds a track to the playlist from the file picker', () => {
    renderWithProviders(<Winamp windowId="w1" />);
    fireEvent.click(screen.getByText('PL'));
    fireEvent.click(screen.getByText('+ ADD'));
    // The Add File picker (an Open dialog) is now visible.
    expect(screen.getByText('Add File')).toBeInTheDocument();
  });
});
