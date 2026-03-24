import { render, screen, fireEvent } from '@testing-library/react';
import { Window } from '../Window';
import { createMockWindowState } from '@/__tests__/helpers/windowTestUtils';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const mockFocusWindow = vi.fn();
const mockCloseWindow = vi.fn();
const mockMinimizeWindow = vi.fn();
const mockMaximizeWindow = vi.fn();
const mockRestoreWindow = vi.fn();
const mockMoveWindow = vi.fn();
const mockResizeWindow = vi.fn();

vi.mock('@/contexts/WindowContext', () => ({
  useWindows: () => ({
    windows: [],
    openWindow: vi.fn(),
    focusWindow: mockFocusWindow,
    closeWindow: mockCloseWindow,
    minimizeWindow: mockMinimizeWindow,
    maximizeWindow: mockMaximizeWindow,
    restoreWindow: mockRestoreWindow,
    moveWindow: mockMoveWindow,
    resizeWindow: mockResizeWindow,
    updateTitle: vi.fn(),
  }),
}));

describe('Window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders window with title in titlebar', () => {
    const win = createMockWindowState({ title: 'My Test Window' });
    render(<Window windowState={win}>Content</Window>);
    expect(screen.getByText('My Test Window')).toBeInTheDocument();
  });

  it('minimized window returns null (not rendered)', () => {
    const win = createMockWindowState({ state: 'minimized' });
    const { container } = render(<Window windowState={win}>Content</Window>);
    expect(container.innerHTML).toBe('');
  });

  it('maximized window has fixed position class', () => {
    const win = createMockWindowState({ state: 'maximized' });
    const { container } = render(<Window windowState={win}>Content</Window>);
    const windowDiv = container.firstElementChild!;
    expect(windowDiv.className).toContain('fixed');
    expect(windowDiv.className).not.toContain('absolute');
  });

  it('close button click calls closeWindow', () => {
    const win = createMockWindowState({ id: 'win-1' });
    render(<Window windowState={win}>Content</Window>);
    const buttons = screen.getAllByRole('button');
    // Close button is the last one in titlebar
    const closeBtn = buttons[buttons.length - 1];
    fireEvent.click(closeBtn);
    expect(mockCloseWindow).toHaveBeenCalledWith('win-1');
  });

  it('minimize button click calls minimizeWindow', () => {
    const win = createMockWindowState({ id: 'win-1' });
    render(<Window windowState={win}>Content</Window>);
    const buttons = screen.getAllByRole('button');
    // Minimize is first button
    fireEvent.click(buttons[0]);
    expect(mockMinimizeWindow).toHaveBeenCalledWith('win-1');
  });

  it('maximize button click calls maximizeWindow', () => {
    const win = createMockWindowState({ id: 'win-1', state: 'normal' });
    render(<Window windowState={win}>Content</Window>);
    const buttons = screen.getAllByRole('button');
    // Maximize is second button
    fireEvent.click(buttons[1]);
    expect(mockMaximizeWindow).toHaveBeenCalledWith('win-1');
  });

  it('focus on window click (pointerdown) calls focusWindow', () => {
    const win = createMockWindowState({ id: 'win-1', isFocused: false });
    const { container } = render(<Window windowState={win}>Content</Window>);
    const windowDiv = container.firstElementChild!;
    fireEvent.pointerDown(windowDiv);
    expect(mockFocusWindow).toHaveBeenCalledWith('win-1');
  });

  it('double-click titlebar toggles maximize/restore', () => {
    const win = createMockWindowState({ id: 'win-1', state: 'normal' });
    render(<Window windowState={win}>Content</Window>);
    // The titlebar div contains the title text
    const titlebar = screen.getByText('Test Window').closest('div[class*="bg-gradient"]')!;
    fireEvent.doubleClick(titlebar);
    expect(mockMaximizeWindow).toHaveBeenCalledWith('win-1');
  });

  it('has 8 resize handles (n, s, e, w, ne, nw, se, sw)', () => {
    const win = createMockWindowState({ state: 'normal' });
    const { container } = render(<Window windowState={win}>Content</Window>);
    const cursors = ['cursor-n-resize', 'cursor-s-resize', 'cursor-e-resize', 'cursor-w-resize',
                     'cursor-nw-resize', 'cursor-ne-resize', 'cursor-sw-resize', 'cursor-se-resize'];
    for (const cursor of cursors) {
      const handle = container.querySelector(`.${cursor}`);
      expect(handle).toBeInTheDocument();
    }
  });

  it('z-index is applied from window state', () => {
    const win = createMockWindowState({ zIndex: 42 });
    const { container } = render(<Window windowState={win}>Content</Window>);
    const windowDiv = container.firstElementChild as HTMLElement;
    expect(windowDiv.style.zIndex).toBe('42');
  });

  it('active (focused) window has active titlebar gradient', () => {
    const win = createMockWindowState({ isFocused: true });
    render(<Window windowState={win}>Content</Window>);
    const titlebar = screen.getByText('Test Window').closest('div[class*="bg-gradient"]')!;
    expect(titlebar.className).toContain('titlebar-active');
  });

  it('inactive (unfocused) window has inactive titlebar gradient', () => {
    const win = createMockWindowState({ isFocused: false });
    render(<Window windowState={win}>Content</Window>);
    const titlebar = screen.getByText('Test Window').closest('div[class*="bg-gradient"]')!;
    expect(titlebar.className).toContain('titlebar-inactive');
  });
});
