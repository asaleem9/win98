import { render, screen, fireEvent } from '@testing-library/react';
import { Taskbar } from '../Taskbar';
import { createMockWindowState } from '@/__tests__/helpers/windowTestUtils';
import { WindowState } from '@/types/window';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const mockWindows: WindowState[] = [];
const mockMinimizeAll = vi.fn();
const mockMoveWindow = vi.fn();
const mockResizeWindow = vi.fn();
const mockRestoreWindow = vi.fn();
const mockMinimizeWindow = vi.fn();
const mockFocusWindow = vi.fn();

vi.mock('@/contexts/WindowContext', () => ({
  useWindows: () => ({
    windows: mockWindows,
    openWindow: vi.fn(),
    closeWindow: vi.fn(),
    focusWindow: mockFocusWindow,
    minimizeWindow: mockMinimizeWindow,
    maximizeWindow: vi.fn(),
    restoreWindow: mockRestoreWindow,
    moveWindow: mockMoveWindow,
    resizeWindow: mockResizeWindow,
    updateTitle: vi.fn(),
    minimizeAll: mockMinimizeAll,
    restoreAll: vi.fn(),
  }),
}));

let mockTaskbarSettings: { autoHide: boolean; smallIcons: boolean; showClock: boolean };

vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { taskbar: mockTaskbarSettings },
    setSetting: vi.fn(),
    getAppPref: (_appId: string, _key: string, fallback: unknown) => fallback,
  }),
}));

const taskbarEl = () => screen.getByText('Start').closest('div.fixed')!;

beforeEach(() => {
  mockWindows.length = 0;
  mockTaskbarSettings = { autoHide: false, smallIcons: false, showClock: true };
  vi.clearAllMocks();
});

describe('Taskbar', () => {
  it('renders Start button, Quick Launch, window list, and system tray areas', () => {
    render(<Taskbar />);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByAltText('Volume')).toBeInTheDocument();
  });

  it('Start button toggles the start menu open/closed', () => {
    render(<Taskbar />);
    const startBtn = screen.getByText('Start').closest('button')!;
    expect(screen.queryByText('Programs')).not.toBeInTheDocument();
    fireEvent.click(startBtn);
    expect(screen.getByText('Programs')).toBeInTheDocument();
    fireEvent.click(startBtn);
    expect(screen.queryByText('Programs')).not.toBeInTheDocument();
  });

  it('taskbar is fixed to bottom of screen', () => {
    render(<Taskbar />);
    const taskbar = taskbarEl();
    expect(taskbar.className).toContain('fixed');
    expect(taskbar.className).toContain('bottom-0');
  });

  it('has correct height (28px)', () => {
    render(<Taskbar />);
    expect(taskbarEl().className).toContain('h-[28px]');
  });

  it('has Win98 raised border styling', () => {
    render(<Taskbar />);
    const taskbar = taskbarEl();
    expect(taskbar.className).toContain('border-t-2');
    expect(taskbar.className).toContain('border-t-[var(--win98-button-highlight)]');
  });
});

describe('Taskbar context menu', () => {
  it('opens on right-click of the empty taskbar area', () => {
    render(<Taskbar />);
    fireEvent.contextMenu(taskbarEl(), { clientX: 300, clientY: 590 });
    expect(screen.getByText('Cascade Windows')).toBeInTheDocument();
    expect(screen.getByText('Tile Windows Horizontally')).toBeInTheDocument();
    expect(screen.getByText('Minimize All Windows')).toBeInTheDocument();
    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText('Toolbars')).toBeInTheDocument();
  });

  it('does not open when right-clicking a window-list button (its own menu wins)', () => {
    mockWindows.push(createMockWindowState({ id: 'w1', title: 'Notepad', state: 'normal' }));
    render(<Taskbar />);
    const winButton = screen.getByText('Notepad').closest('button')!;
    fireEvent.contextMenu(winButton);
    // Window-list menu, not the taskbar menu.
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.queryByText('Properties')).not.toBeInTheDocument();
    expect(screen.queryByText('Cascade Windows')).not.toBeInTheDocument();
  });

  it('Cascade Windows repositions each normal window with a cascade offset', () => {
    mockWindows.push(
      createMockWindowState({ id: 'w1', title: 'One', state: 'normal' }),
      createMockWindowState({ id: 'w2', title: 'Two', state: 'normal', isFocused: false }),
    );
    render(<Taskbar />);
    fireEvent.contextMenu(taskbarEl(), { clientX: 300, clientY: 590 });
    fireEvent.click(screen.getByText('Cascade Windows'));
    expect(mockMoveWindow).toHaveBeenCalledWith('w1', 50, 50);
    expect(mockMoveWindow).toHaveBeenCalledWith('w2', 80, 80);
  });

  it('Minimize All Windows calls minimizeAll', () => {
    mockWindows.push(createMockWindowState({ id: 'w1', title: 'One', state: 'normal' }));
    render(<Taskbar />);
    fireEvent.contextMenu(taskbarEl(), { clientX: 300, clientY: 590 });
    fireEvent.click(screen.getByText('Minimize All Windows'));
    expect(mockMinimizeAll).toHaveBeenCalled();
  });

  it('window-management items are disabled when there are no open windows', () => {
    render(<Taskbar />);
    fireEvent.contextMenu(taskbarEl(), { clientX: 300, clientY: 590 });
    expect(screen.getByText('Cascade Windows').closest('button')).toBeDisabled();
    expect(screen.getByText('Minimize All Windows').closest('button')).toBeDisabled();
  });

  it('Properties opens the Taskbar Properties dialog', () => {
    render(<Taskbar />);
    fireEvent.contextMenu(taskbarEl(), { clientX: 300, clientY: 590 });
    fireEvent.click(screen.getByText('Properties'));
    expect(screen.getByRole('dialog', { name: 'Taskbar Properties' })).toBeInTheDocument();
  });
});

describe('Taskbar auto-hide', () => {
  it('drops to a sliver when auto-hide is on and a window holds focus', () => {
    mockTaskbarSettings = { autoHide: true, smallIcons: false, showClock: true };
    mockWindows.push(createMockWindowState({ id: 'w1', title: 'One', state: 'normal', isFocused: true }));
    render(<Taskbar />);
    expect(taskbarEl().className).toContain('translate-y-[26px]');
  });

  it('stays revealed when no window holds focus', () => {
    mockTaskbarSettings = { autoHide: true, smallIcons: false, showClock: true };
    render(<Taskbar />);
    expect(taskbarEl().className).not.toContain('translate-y-[26px]');
  });

  it('reveals when the pointer reaches the bottom edge', () => {
    mockTaskbarSettings = { autoHide: true, smallIcons: false, showClock: true };
    mockWindows.push(createMockWindowState({ id: 'w1', title: 'One', state: 'normal', isFocused: true }));
    render(<Taskbar />);
    expect(taskbarEl().className).toContain('translate-y-[26px]');
    // mousemove bubbles from the body up to the window-level auto-hide listener.
    fireEvent.mouseMove(document.body, { clientY: window.innerHeight });
    expect(taskbarEl().className).not.toContain('translate-y-[26px]');
  });
});
