import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import MediaPlayer from '../MediaPlayer';

describe('MediaPlayer', () => {
  it('renders transport controls and status', () => {
    renderWithProviders(<MediaPlayer windowId="w1" />);
    expect(screen.getByTitle('Play')).toBeInTheDocument();
    expect(screen.getByTitle('Next')).toBeInTheDocument();
    expect(screen.getByLabelText('Volume')).toBeInTheDocument();
  });

  it('reflects Playing status after pressing play', () => {
    renderWithProviders(<MediaPlayer windowId="w1" />);
    act(() => { fireEvent.click(screen.getByTitle('Play')); });
    expect(screen.getByText(/^Playing:/)).toBeInTheDocument();
  });

  it('shows the launched clip name for a non-mp3 file', () => {
    renderWithProviders(
      <MediaPlayer windowId="w1" launchParams={{ filePath: 'C:\\Media\\home_movie.avi' }} launchCount={1} />,
    );
    expect(screen.getAllByText(/home_movie\.avi/i).length).toBeGreaterThan(0);
  });

  it('opens the playlist panel', () => {
    renderWithProviders(<MediaPlayer windowId="w1" />);
    fireEvent.click(screen.getByText('Playlist'));
    expect(screen.getByText('Y2K Panic')).toBeInTheDocument();
  });
});
