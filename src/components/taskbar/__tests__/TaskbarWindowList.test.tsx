import { render, screen, fireEvent } from '@testing-library/react';
import { TaskbarWindowList } from '../TaskbarWindowList';
import { createMockWindowState } from '@/__tests__/helpers/windowTestUtils';
import { WindowState } from '@/types/window';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const mockWindows: WindowState[] = [];
const mockFocusWindow = vi.fn();
const mockMinimizeWindow = vi.fn();

vi.mock('@/contexts/WindowContext', () => ({
  useWindows: () => ({
    windows: mockWindows,
    openWindow: vi.fn(),
    closeWindow: vi.fn(),
    focusWindow: mockFocusWindow,
    minimizeWindow: mockMinimizeWindow,
    maximizeWindow: vi.fn(),
    restoreWindow: vi.fn(),
    moveWindow: vi.fn(),
    resizeWindow: vi.fn(),
    updateTitle: vi.fn(),
  }),
}));

vi.mock('@/lib/appRegistry', () => ({
  getApp: (appId: string) => ({
    id: appId,
    name: appId,
    icon: '/icons/test-32.svg',
    icon16: '/icons/test-16.svg',
  }),
}));

describe('TaskbarWindowList', () => {
  beforeEach(() => {
    mockWindows.length = 0;
    vi.clearAllMocks();
  });

  it('renders a button for each open window', () => {
    mockWindows.push(
      createMockWindowState({ id: 'w1', title: 'Window 1' }),
      createMockWindowState({ id: 'w2', title: 'Window 2', isFocused: false }),
    );
    render(<TaskbarWindowList />);
    expect(screen.getByText('Window 1')).toBeInTheDocument();
    expect(screen.getByText('Window 2')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('active/focused window button has pressed/active styling', () => {
    mockWindows.push(
      createMockWindowState({ id: 'w1', title: 'Active', isFocused: true, state: 'normal' }),
      createMockWindowState({ id: 'w2', title: 'Inactive', isFocused: false, state: 'normal' }),
    );
    render(<TaskbarWindowList />);
    const activeBtn = screen.getByText('Active').closest('button')!;
    const inactiveBtn = screen.getByText('Inactive').closest('button')!;
    // Active button has dark-shadow on top/left (pressed look) and font-bold
    expect(activeBtn.className).toContain('font-bold');
    expect(activeBtn.className).toContain('border-t-[var(--win98-button-dark-shadow)]');
    // Inactive has highlight on top/left (raised look)
    expect(inactiveBtn.className).toContain('border-t-[var(--win98-button-highlight)]');
  });

  it('clicking a focused non-minimized window button minimizes it', () => {
    mockWindows.push(
      createMockWindowState({ id: 'w1', title: 'Focused', isFocused: true, state: 'normal' }),
    );
    render(<TaskbarWindowList />);
    fireEvent.click(screen.getByText('Focused').closest('button')!);
    expect(mockMinimizeWindow).toHaveBeenCalledWith('w1');
  });

  it('clicking a minimized window button focuses/restores it', () => {
    mockWindows.push(
      createMockWindowState({ id: 'w1', title: 'Minimized', isFocused: false, state: 'minimized' }),
    );
    render(<TaskbarWindowList />);
    fireEvent.click(screen.getByText('Minimized').closest('button')!);
    expect(mockFocusWindow).toHaveBeenCalledWith('w1');
  });

  it('long titles are truncated', () => {
    mockWindows.push(
      createMockWindowState({ id: 'w1', title: 'A Very Long Window Title That Should Be Truncated' }),
    );
    render(<TaskbarWindowList />);
    const btn = screen.getByText('A Very Long Window Title That Should Be Truncated').closest('button')!;
    expect(btn.className).toContain('truncate');
  });

  it('shows app icon in button', () => {
    mockWindows.push(
      createMockWindowState({ id: 'w1', appId: 'notepad', title: 'Notepad' }),
    );
    const { container } = render(<TaskbarWindowList />);
    const icon = container.querySelector('img[src="/icons/test-16.svg"]');
    expect(icon).toBeInTheDocument();
  });
});
