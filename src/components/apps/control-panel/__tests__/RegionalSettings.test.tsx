import { screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { SystemTray } from '@/components/taskbar/SystemTray';
import RegionalSettings from '../RegionalSettings';

describe('RegionalSettings', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 3, 13, 30, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('Time tab actually flips the taskbar clock to 24-hour', () => {
    renderWithProviders(
      <>
        <SystemTray />
        <RegionalSettings windowId="w1" />
      </>,
    );
    // 12-hour by default: the 24-hour rendering is nowhere on screen yet.
    expect(screen.queryByText('13:30')).toBeNull();

    fireEvent.click(screen.getByText('Time'));
    act(() => {
      fireEvent.click(screen.getByLabelText('24-hour (13:30)'));
    });

    // The tray span now reads the 24-hour time (the radio label is longer text).
    expect(screen.getByText('13:30')).toBeInTheDocument();
  });

  it('Number tab formats the sample using the chosen symbols', () => {
    renderWithProviders(<RegionalSettings windowId="w1" />);
    fireEvent.click(screen.getByText('Number'));
    expect(screen.getByLabelText('Number appearance').textContent).toBe('1,234,567.89');
  });

  it('editing the currency symbol persists and updates the preview', () => {
    renderWithProviders(<RegionalSettings windowId="w1" />);
    fireEvent.click(screen.getByText('Currency'));
    act(() => {
      fireEvent.change(screen.getByDisplayValue('$'), { target: { value: '£' } });
    });
    const prefs = JSON.parse(window.localStorage.getItem('win98-prefs-v1')!);
    expect(prefs.regional.currencySymbol).toBe('£');
    expect(screen.getByText('£1,234,567.89')).toBeInTheDocument();
  });
});
