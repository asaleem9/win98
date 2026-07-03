import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import RealPlayer from '../RealPlayer';

describe('RealPlayer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts in the buffering state', () => {
    renderWithProviders(<RealPlayer />);
    expect(screen.getByText(/Connecting|Buffering/)).toBeInTheDocument();
  });

  it('connects and plays after several buffering cycles', () => {
    renderWithProviders(<RealPlayer />);
    // Drive enough interval ticks to cross three buffer cycles.
    act(() => { vi.advanceTimersByTime(700 * 200); });
    expect(screen.getByText('Playing')).toBeInTheDocument();
  });

  it('renders six transport buttons', () => {
    renderWithProviders(<RealPlayer />);
    ['Rewind', 'Back', 'Play', 'Stop', 'Forward', 'End'].forEach((t) => {
      expect(screen.getByTitle(t)).toBeInTheDocument();
    });
  });

  it('does not throw when clicking transport during buffering', () => {
    renderWithProviders(<RealPlayer />);
    act(() => { fireEvent.click(screen.getByTitle('Stop')); });
    expect(screen.getByTitle('Stop')).toBeInTheDocument();
  });
});
