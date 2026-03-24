import { render, screen, fireEvent } from '@testing-library/react';
import { Taskbar } from '../Taskbar';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock('@/contexts/WindowContext', () => ({
  useWindows: () => ({
    windows: [],
    openWindow: vi.fn(),
    closeWindow: vi.fn(),
    focusWindow: vi.fn(),
    minimizeWindow: vi.fn(),
    maximizeWindow: vi.fn(),
    restoreWindow: vi.fn(),
    moveWindow: vi.fn(),
    resizeWindow: vi.fn(),
    updateTitle: vi.fn(),
  }),
}));

describe('Taskbar', () => {
  it('renders Start button, Quick Launch, window list, and system tray areas', () => {
    render(<Taskbar />);
    // Start button
    expect(screen.getByText('Start')).toBeInTheDocument();
    // System tray shows time and volume icon
    expect(screen.getByAltText('Volume')).toBeInTheDocument();
  });

  it('Start button toggles the start menu open/closed', () => {
    render(<Taskbar />);
    const startBtn = screen.getByText('Start').closest('button')!;
    // Menu not shown initially
    expect(screen.queryByText('Programs')).not.toBeInTheDocument();
    // Click to open
    fireEvent.click(startBtn);
    expect(screen.getByText('Programs')).toBeInTheDocument();
    // Click to close
    fireEvent.click(startBtn);
    expect(screen.queryByText('Programs')).not.toBeInTheDocument();
  });

  it('taskbar is fixed to bottom of screen', () => {
    const { container } = render(<Taskbar />);
    const taskbar = container.firstElementChild!;
    expect(taskbar.className).toContain('fixed');
    expect(taskbar.className).toContain('bottom-0');
  });

  it('has correct height (28px)', () => {
    const { container } = render(<Taskbar />);
    const taskbar = container.firstElementChild!;
    expect(taskbar.className).toContain('h-[28px]');
  });

  it('has Win98 raised border styling', () => {
    const { container } = render(<Taskbar />);
    const taskbar = container.firstElementChild!;
    expect(taskbar.className).toContain('border-t-2');
    expect(taskbar.className).toContain('border-t-[var(--win98-button-highlight)]');
  });
});
