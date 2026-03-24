import { render, screen, fireEvent } from '@testing-library/react';
import { Desktop } from '../Desktop';
import { getDesktopApps } from '@/lib/appRegistry';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const mockOpenWindow = vi.fn();

vi.mock('@/contexts/WindowContext', () => ({
  useWindows: () => ({
    windows: [],
    openWindow: mockOpenWindow,
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

const desktopApps = getDesktopApps();

describe('Desktop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the correct number of desktop icons', () => {
    render(<Desktop />);
    // Each desktop app renders its name as text
    for (const app of desktopApps) {
      expect(screen.getByText(app.name)).toBeInTheDocument();
    }
    // Verify count matches
    const icons = screen.getAllByRole('img');
    expect(icons.length).toBe(desktopApps.length);
  });

  it('double-clicking an icon calls openWindow with the correct appId', () => {
    render(<Desktop />);
    const firstApp = desktopApps[0];
    const icon = screen.getByText(firstApp.name);
    fireEvent.doubleClick(icon.closest('div[class*="flex flex-col items-center"]')!);
    expect(mockOpenWindow).toHaveBeenCalledWith(firstApp.id);
  });

  it('single-clicking an icon selects it (highlighted state)', () => {
    render(<Desktop />);
    const firstApp = desktopApps[0];
    const iconContainer = screen.getByText(firstApp.name).closest('div[class*="flex flex-col items-center"]')!;
    fireEvent.click(iconContainer);
    // Selected icon text has highlight bg class
    const nameSpan = screen.getByText(firstApp.name);
    expect(nameSpan.className).toContain('bg-[var(--win98-highlight)]');
  });

  it('clicking empty desktop area deselects all icons', () => {
    const { container } = render(<Desktop />);
    const firstApp = desktopApps[0];
    // Select an icon first
    const iconContainer = screen.getByText(firstApp.name).closest('div[class*="flex flex-col items-center"]')!;
    fireEvent.click(iconContainer);
    // Now click the desktop (parent div)
    const desktopDiv = container.firstElementChild!;
    fireEvent.click(desktopDiv);
    // After deselect, the text should have text-shadow style (unselected state)
    const nameSpan = screen.getByText(firstApp.name);
    expect(nameSpan.className).toContain('text-shadow');
  });

  it('desktop has bottom-[28px] class for taskbar space', () => {
    const { container } = render(<Desktop />);
    const desktopDiv = container.firstElementChild!;
    expect(desktopDiv.className).toContain('bottom-[28px]');
  });

  it('icons display name and icon image', () => {
    render(<Desktop />);
    const firstApp = desktopApps[0];
    expect(screen.getByText(firstApp.name)).toBeInTheDocument();
    const img = screen.getByAltText(firstApp.name);
    expect(img).toHaveAttribute('src', firstApp.icon);
  });

  it('right-click on desktop opens context menu', () => {
    const { container } = render(<Desktop />);
    const desktopDiv = container.firstElementChild!;
    fireEvent.contextMenu(desktopDiv);
    expect(screen.getByText('Arrange Icons')).toBeInTheDocument();
    expect(screen.getByText('Properties')).toBeInTheDocument();
  });

  it('right-click on icon opens icon-specific context menu', () => {
    render(<Desktop />);
    const firstApp = desktopApps[0];
    const iconWrapper = screen.getByText(firstApp.name).closest('div[class*="flex flex-col items-center"]')!;
    // The wrapping div with onContextMenu is the parent
    const contextTarget = iconWrapper.parentElement!;
    fireEvent.contextMenu(contextTarget);
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Create Shortcut')).toBeInTheDocument();
  });
});
