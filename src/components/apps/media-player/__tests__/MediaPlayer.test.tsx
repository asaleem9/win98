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

  it('shows the playlist drawer by default and toggles it off', () => {
    renderWithProviders(<MediaPlayer windowId="w1" />);
    expect(screen.getByText('Y2K Panic')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Playlist'));
    expect(screen.queryByText('Y2K Panic')).not.toBeInTheDocument();
  });

  it('exposes real File/View/Play/Help menus', () => {
    renderWithProviders(<MediaPlayer windowId="w1" />);
    fireEvent.mouseDown(screen.getByText('View'));
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('Compact')).toBeInTheDocument();
    expect(screen.getByText('Statistics...')).toBeInTheDocument();
    expect(screen.getByText('Options...')).toBeInTheDocument();
  });

  it('switches to compact view, hiding the seek bar and playlist', () => {
    renderWithProviders(<MediaPlayer windowId="w1" />);
    expect(screen.getByLabelText('Seek')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('View'));
    fireEvent.click(screen.getByText('Compact').closest('button')!);
    expect(screen.queryByLabelText('Seek')).not.toBeInTheDocument();
    expect(screen.queryByText('Y2K Panic')).not.toBeInTheDocument();
    // Transport survives the strip-down.
    expect(screen.getByTitle('Play')).toBeInTheDocument();
  });

  it('cycles the visualization when the display is clicked', () => {
    renderWithProviders(<MediaPlayer windowId="w1" />);
    const display = screen.getByTitle('Click to change visualization');
    expect(screen.getByText('Bar Spectrum')).toBeInTheDocument();
    fireEvent.click(display);
    expect(screen.getByText('Oscilloscope')).toBeInTheDocument();
    fireEvent.click(display);
    expect(screen.getByText('Ambience')).toBeInTheDocument();
  });

  it('adds an opened file to the Recent File list', () => {
    renderWithProviders(<MediaPlayer windowId="w1" />);
    fireEvent.mouseDown(screen.getByText('File'));
    fireEvent.click(screen.getByText('Open...').closest('button')!);
    // Type a filename into the picker and confirm.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'song.mp3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    // Reopen File → Recent File and confirm the entry is listed in the submenu.
    fireEvent.mouseDown(screen.getByText('File'));
    fireEvent.click(screen.getByText('Recent File').closest('button')!);
    expect(screen.getByRole('menuitem', { name: 'song.mp3' })).toBeInTheDocument();
  });
});
