import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import DiskDefragmenter from '../DiskDefragmenter';

beforeEach(() => {
  window.localStorage.clear();
});

describe('DiskDefragmenter', () => {
  it('shows the toolbar actions and a fragmentation readout', () => {
    renderWithProviders(<DiskDefragmenter windowId="w1" />);
    expect(screen.getByText('Analyze')).toBeInTheDocument();
    expect(screen.getByText('Defragment')).toBeInTheDocument();
    expect(screen.getByText(/files fragmented/)).toBeInTheDocument();
  });

  it('recommends against defragmenting a low-fragmentation drive', () => {
    renderWithProviders(<DiskDefragmenter windowId="w1" />);
    fireEvent.click(screen.getByText('Analyze'));
    expect(screen.getByText(/You do not need to defragment this drive now/)).toBeInTheDocument();
  });

  it('defragments the drive and reports before/after fragmentation', () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<DiskDefragmenter windowId="w1" />);
      fireEvent.click(screen.getByText('Defragment'));
      act(() => { vi.advanceTimersByTime(8000); });
      // The before/after lines appear only in the completion dialog.
      expect(screen.getByText(/Fragmentation before: 0%/)).toBeInTheDocument();
      expect(screen.getByText(/Fragmentation after: 0%/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
