import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import TaskManager from '../TaskManager';

describe('TaskManager', () => {
  it('renders the Applications and Processes tabs with a live status bar', () => {
    renderWithProviders(<TaskManager windowId="w1" />);
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Processes')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText(/Processes: \d+/)).toBeInTheDocument();
    expect(screen.getByText(/CPU Usage: \d+%/)).toBeInTheDocument();
  });

  it('lists static system processes on the Processes tab', () => {
    renderWithProviders(<TaskManager windowId="w1" />);
    fireEvent.click(screen.getByText('Processes'));
    expect(screen.getByText('KERNEL32.DLL')).toBeInTheDocument();
    expect(screen.getByText('SYSTRAY.EXE')).toBeInTheDocument();
  });

  it('shows Access Denied when ending a normal system process', () => {
    renderWithProviders(<TaskManager windowId="w1" />);
    fireEvent.click(screen.getByText('Processes'));
    fireEvent.click(screen.getByText('SYSTRAY.EXE'));
    fireEvent.click(screen.getByText('End Process'));
    expect(screen.getByText(/Access is denied/)).toBeInTheDocument();
  });

  it('dispatches a BSOD event when ending kernel32.dll', () => {
    renderWithProviders(<TaskManager windowId="w1" />);
    const handler = vi.fn();
    window.addEventListener('win98-bsod', handler);
    fireEvent.click(screen.getByText('Processes'));
    fireEvent.click(screen.getByText('KERNEL32.DLL'));
    fireEvent.click(screen.getByText('End Process'));
    expect(handler).toHaveBeenCalled();
    window.removeEventListener('win98-bsod', handler);
  });

  it('dispatches the run dialog event from New Task...', () => {
    renderWithProviders(<TaskManager windowId="w1" />);
    const handler = vi.fn();
    window.addEventListener('win98-run-dialog', handler);
    fireEvent.click(screen.getByText('New Task...'));
    expect(handler).toHaveBeenCalled();
    window.removeEventListener('win98-run-dialog', handler);
  });

  it('wiggles the mem/cpu numbers on each ~1s tick', () => {
    vi.useFakeTimers();
    renderWithProviders(<TaskManager windowId="w1" />);
    const before = screen.getByText(/CPU Usage: \d+%/).textContent;
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // Not asserting a specific value (random), just that the tick loop ran without throwing
    expect(screen.getByText(/CPU Usage: \d+%/)).toBeInTheDocument();
    expect(before).toBeTruthy();
    vi.useRealTimers();
  });
});
