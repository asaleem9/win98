import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import ICQ from '../ICQ';
import { playUhOh } from '../uhoh';
import {
  MY_UIN,
  INITIAL_CONTACTS,
  SMOOTHTALKER_OPENER,
  SMOOTHTALKER_LINES,
  RANDOM_CHAT_CONNECT_MSG,
} from '../contacts';

// The two-note synth is exercised in its own suite; here we only care that the
// component reaches for it when a message lands.
vi.mock('../uhoh', () => ({ playUhOh: vi.fn() }));

describe('ICQ', () => {
  beforeEach(() => {
    vi.mocked(playUhOh).mockClear();
  });

  it('shows your UIN and your contacts', () => {
    renderWithProviders(<ICQ windowId="w1" />);
    expect(screen.getByText(MY_UIN)).toBeInTheDocument();
    expect(screen.getByText('CyberKitten98')).toBeInTheDocument();
    expect(screen.getByText('l33t_hax0r')).toBeInTheDocument();
    expect(screen.getByText(/Find Random Chat Partner/)).toBeInTheDocument();
  });

  it('changes your presence through the flower menu', () => {
    renderWithProviders(<ICQ windowId="w1" />);
    const statusButton = screen.getByTitle('Change your status');
    expect(statusButton).toHaveTextContent('Available');

    fireEvent.click(statusButton);
    // Menu items are titled with their blurb; pick "Away".
    fireEvent.click(screen.getByTitle('Stepped away for a moment'));

    expect(screen.getByTitle('Change your status')).toHaveTextContent('Away');
  });

  it('opens a message window, cycles canned replies, and sounds the uh-oh', () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<ICQ windowId="w1" />);
      fireEvent.doubleClick(screen.getByText('CyberKitten98'));

      const box = screen.getByLabelText('Message to CyberKitten98');
      const cyber = INITIAL_CONTACTS.find((c) => c.nick === 'CyberKitten98')!;

      // First message -> first canned line.
      fireEvent.change(box, { target: { value: 'hi there' } });
      fireEvent.keyDown(box, { key: 'Enter' });
      expect(screen.getByText('hi there')).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(900); });
      expect(screen.getByText(cyber.replies[0])).toBeInTheDocument();
      expect(vi.mocked(playUhOh)).toHaveBeenCalled();

      // Second message -> the next canned line in rotation.
      fireEvent.change(box, { target: { value: 'you there?' } });
      fireEvent.keyDown(box, { key: 'Enter' });
      act(() => { vi.advanceTimersByTime(900); });
      expect(screen.getByText(cyber.replies[1])).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('runs the Find Random Chat Partner roulette straight to SmoothTalker_2000', () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<ICQ windowId="w1" />);
      fireEvent.click(screen.getByRole('button', { name: /Find Random Chat Partner/ }));

      expect(screen.getByText(RANDOM_CHAT_CONNECT_MSG)).toBeInTheDocument();
      expect(screen.getByText(SMOOTHTALKER_OPENER)).toBeInTheDocument();
      expect(vi.mocked(playUhOh)).toHaveBeenCalled();

      const box = screen.getByLabelText('Message to SmoothTalker_2000');
      fireEvent.change(box, { target: { value: 'uh, hi?' } });
      fireEvent.keyDown(box, { key: 'Enter' });
      act(() => { vi.advanceTimersByTime(900); });

      // His opener was line 0; the first reply is the next scripted line.
      expect(screen.getByText(SMOOTHTALKER_LINES[0])).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
