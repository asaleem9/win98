import { render, screen, fireEvent } from '@testing-library/react';
import { QuickLaunch } from '../QuickLaunch';
import { WindowState } from '@/types/window';
import { createMockWindowState } from '@/__tests__/helpers/windowTestUtils';

const mockWindows: WindowState[] = [];
const mockMinimizeAll = vi.fn();
const mockRestoreAll = vi.fn();
const mockOpenWindow = vi.fn();

vi.mock('@/contexts/WindowContext', () => ({
  useWindows: () => ({
    // Fresh array each read so the reset effect re-runs when windows change.
    windows: [...mockWindows],
    openWindow: mockOpenWindow,
    minimizeAll: mockMinimizeAll,
    restoreAll: mockRestoreAll,
  }),
}));

vi.mock('@/lib/appRegistry', () => ({
  getQuickLaunchApps: () => [
    { id: 'aim', name: 'AIM', icon: '/icons/aim-32.svg', icon16: '/icons/aim-16.svg' },
  ],
}));

describe('QuickLaunch Show Desktop', () => {
  beforeEach(() => {
    mockWindows.length = 0;
    vi.clearAllMocks();
  });

  it('renders the Show Desktop button after the quick-launch apps', () => {
    render(<QuickLaunch />);
    expect(screen.getByTitle('Show Desktop')).toBeInTheDocument();
    expect(screen.getByTitle('AIM')).toBeInTheDocument();
  });

  it('first click minimizes every window', () => {
    render(<QuickLaunch />);
    fireEvent.click(screen.getByTitle('Show Desktop'));
    expect(mockMinimizeAll).toHaveBeenCalledTimes(1);
    expect(mockRestoreAll).not.toHaveBeenCalled();
  });

  it('a second click restores every window', () => {
    render(<QuickLaunch />);
    const btn = screen.getByTitle('Show Desktop');
    fireEvent.click(btn); // minimize
    fireEvent.click(btn); // restore
    expect(mockMinimizeAll).toHaveBeenCalledTimes(1);
    expect(mockRestoreAll).toHaveBeenCalledTimes(1);
  });

  it('resets the toggle when a window is manually restored, so the next click minimizes again', () => {
    const { rerender } = render(<QuickLaunch />);
    const btn = screen.getByTitle('Show Desktop');
    fireEvent.click(btn);
    expect(mockMinimizeAll).toHaveBeenCalledTimes(1);

    // User brings a window back up on their own.
    mockWindows.push(createMockWindowState({ id: 'w1', state: 'normal' }));
    rerender(<QuickLaunch />);

    // Toggle was cleared: next click minimizes again rather than restoring.
    fireEvent.click(btn);
    expect(mockMinimizeAll).toHaveBeenCalledTimes(2);
    expect(mockRestoreAll).not.toHaveBeenCalled();
  });

  it('ignores owner-owned dialogs when deciding if the desktop is still shown', () => {
    const { rerender } = render(<QuickLaunch />);
    const btn = screen.getByTitle('Show Desktop');
    fireEvent.click(btn);

    // An owned dialog staying "normal" should not reset the toggle.
    mockWindows.push(createMockWindowState({ id: 'd1', state: 'normal', ownerId: 'w1' }));
    rerender(<QuickLaunch />);

    fireEvent.click(btn);
    expect(mockRestoreAll).toHaveBeenCalledTimes(1);
    expect(mockMinimizeAll).toHaveBeenCalledTimes(1);
  });
});
