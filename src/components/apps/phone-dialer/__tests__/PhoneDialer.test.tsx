import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import PhoneDialer, { DIAL_DELAY_MS } from '../PhoneDialer';

const PREFS_KEY = 'win98-prefs-v1';

function seedSpeedDial(slots: { name: string; number: string }[]) {
  localStorage.setItem(PREFS_KEY, JSON.stringify({ 'phone-dialer': { speedDial: slots } }));
}

describe('Phone Dialer', () => {
  beforeEach(() => localStorage.clear());

  it('builds up a number with the keypad', () => {
    renderWithProviders(<PhoneDialer windowId="w1" />);
    fireEvent.click(screen.getByLabelText('Key 5'));
    fireEvent.click(screen.getByLabelText('Key 0'));
    fireEvent.click(screen.getByLabelText('Key 9'));
    expect(screen.getByLabelText('Number to dial')).toHaveValue('509');
  });

  it('backspaces the last digit', () => {
    renderWithProviders(<PhoneDialer windowId="w1" />);
    const field = screen.getByLabelText('Number to dial');
    fireEvent.change(field, { target: { value: '5551234' } });
    fireEvent.click(screen.getByText('⌫'));
    expect(field).toHaveValue('555123');
  });

  it('dials an ordinary number and lands on a busy signal', () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<PhoneDialer windowId="w1" />);
      fireEvent.change(screen.getByLabelText('Number to dial'), { target: { value: '5551234' } });
      fireEvent.click(screen.getByText('Dial'));

      expect(screen.getByText('Dialing 5551234...')).toBeInTheDocument();

      act(() => { vi.advanceTimersByTime(DIAL_DELAY_MS); });
      // "The line is busy." also shows in the LCD, so match the dialog's own copy.
      expect(screen.getByText(/hang up and try your call again later/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('never connects to Jenny', () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<PhoneDialer windowId="w1" />);
      fireEvent.change(screen.getByLabelText('Number to dial'), { target: { value: '8675309' } });
      fireEvent.click(screen.getByText('Dial'));
      act(() => { vi.advanceTimersByTime(DIAL_DELAY_MS); });
      expect(screen.getByText(/Jenny is not available/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reaches directory assistance on 411', () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<PhoneDialer windowId="w1" />);
      fireEvent.change(screen.getByLabelText('Number to dial'), { target: { value: '411' } });
      fireEvent.click(screen.getByText('Dial'));
      act(() => { vi.advanceTimersByTime(DIAL_DELAY_MS); });
      expect(screen.getByText(/1-800-COLLECT/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('loads a persisted speed dial and dials it on click', () => {
    vi.useFakeTimers();
    try {
      seedSpeedDial([{ name: 'Pizza Palace', number: '5556677' }]);
      renderWithProviders(<PhoneDialer windowId="w1" />);

      const slot = screen.getByText(/Pizza Palace/);
      fireEvent.click(slot);
      act(() => { vi.advanceTimersByTime(DIAL_DELAY_MS); });
      // An unlisted number falls through to the busy signal.
      expect(screen.getByText(/hang up and try your call again later/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('saves an edited speed dial and keeps it across remounts', () => {
    const { unmount } = renderWithProviders(<PhoneDialer windowId="w1" />);

    // An empty slot opens the editor.
    fireEvent.click(screen.getByText('1: <empty>'));
    fireEvent.change(screen.getByLabelText('Speed dial 1 name'), { target: { value: 'Mom' } });
    fireEvent.change(screen.getByLabelText('Speed dial 1 number'), { target: { value: '5550100' } });
    fireEvent.click(screen.getByText('Save'));

    // The slot label updates and the pref is persisted.
    expect(screen.getByText('1: Mom')).toBeInTheDocument();
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY)!);
    expect(prefs['phone-dialer'].speedDial[0]).toEqual({ name: 'Mom', number: '5550100' });

    // A fresh mount reads the saved slot back.
    unmount();
    renderWithProviders(<PhoneDialer windowId="w1" />);
    expect(screen.getByText('1: Mom')).toBeInTheDocument();
  });

  it('opens the Connect Using modem gag from the Tools menu', () => {
    renderWithProviders(<PhoneDialer windowId="w1" />);
    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Tools' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Connect Using/ }));
    expect(screen.getByText(/plugged into nothing/)).toBeInTheDocument();
  });
});
