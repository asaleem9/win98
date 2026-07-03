import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import SoundRecorder from '../SoundRecorder';

describe('SoundRecorder', () => {
  it('renders transport and position readout', () => {
    renderWithProviders(<SoundRecorder windowId="w1" />);
    expect(screen.getByTitle('Record')).toBeInTheDocument();
    expect(screen.getByText(/Position:/)).toBeInTheDocument();
  });

  it('falls back to demo mode with a dialog when no device is available', async () => {
    // jsdom has no navigator.mediaDevices / MediaRecorder
    renderWithProviders(<SoundRecorder windowId="w1" />);
    await act(async () => { fireEvent.click(screen.getByTitle('Record')); });
    expect(screen.getByText(/No recording device detected/)).toBeInTheDocument();
  });

  it('opens the File menu and saves to the filesystem', () => {
    renderWithProviders(<SoundRecorder windowId="w1" />);
    // The menu label renders as <u>F</u>ile, so match on the span's full text.
    const fileMenu = screen.getByText((_, el) => el?.tagName === 'SPAN' && el.textContent === 'File');
    fireEvent.click(fileMenu);
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText(/Saved to/)).toBeInTheDocument();
  });

  it('shows a launched .wav filename', () => {
    renderWithProviders(
      <SoundRecorder windowId="w1" launchParams={{ filePath: 'C:\\My Documents\\memo.wav' }} launchCount={1} />,
    );
    expect(screen.getByText('memo.wav')).toBeInTheDocument();
  });
});
