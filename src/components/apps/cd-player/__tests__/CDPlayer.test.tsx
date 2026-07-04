import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import CDPlayer from '../CDPlayer';
import { CD_TRACKS, CD_TRACK_COUNT } from '../cdLogic';

describe('CD Player', () => {
  it('shows the loaded disc and its first track', () => {
    renderWithProviders(<CDPlayer windowId="w1" />);
    expect(screen.getByText("Now That's What I Call 1998")).toBeInTheDocument();
    expect(screen.getByText('Track 01')).toBeInTheDocument();
    expect(screen.getByText(`of ${CD_TRACK_COUNT}`)).toBeInTheDocument();
  });

  it('advances the track with the Next button', () => {
    renderWithProviders(<CDPlayer windowId="w1" />);
    fireEvent.click(screen.getByLabelText('Next Track'));
    expect(screen.getByText('Track 02')).toBeInTheDocument();
  });

  it('marks Play active after pressing it', () => {
    renderWithProviders(<CDPlayer windowId="w1" />);
    const play = screen.getByLabelText('Play');
    expect(play).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(play);
    expect(play).toHaveAttribute('aria-pressed', 'true');
  });

  it('ejects to an empty tray and back', () => {
    renderWithProviders(<CDPlayer windowId="w1" />);
    const eject = screen.getByLabelText('Eject');
    fireEvent.click(eject);
    expect(screen.getByText('No Disc')).toBeInTheDocument();
    fireEvent.click(eject);
    expect(screen.getByText('Track 01')).toBeInTheDocument();
  });

  it('jumps to a track chosen from the dropdown', () => {
    renderWithProviders(<CDPlayer windowId="w1" />);
    fireEvent.change(screen.getByLabelText('Track:'), { target: { value: '3' } });
    expect(screen.getByText(`Track 0${CD_TRACKS[3].number}`)).toBeInTheDocument();
  });
});
