import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import ScanDisk from '../ScanDisk';

beforeEach(() => {
  window.localStorage.clear();
});

describe('ScanDisk', () => {
  it('renders the drive and test-type options', () => {
    renderWithProviders(<ScanDisk windowId="w1" />);
    expect(screen.getByText(/Standard \(checks files/)).toBeInTheDocument();
    expect(screen.getByText(/Thorough/)).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('runs a standard scan and reports real filesystem stats', () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<ScanDisk windowId="w1" />);
      fireEvent.click(screen.getByText('Start'));
      act(() => { vi.advanceTimersByTime(13000); });
      // A freshly seeded drive has no dangling Recycle Bin entries.
      expect(screen.getByText(/ScanDisk did not find any errors on this drive\./)).toBeInTheDocument();
      // The summary is built from the real walked file count.
      expect(screen.getByText(/user files/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
