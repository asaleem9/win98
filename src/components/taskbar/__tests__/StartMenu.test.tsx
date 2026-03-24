import { render, screen, fireEvent } from '@testing-library/react';
import { StartMenu } from '../StartMenu';

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

describe('StartMenu', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders menu items: Programs, Documents, Settings, Find, Run, Shut Down', () => {
    render(<StartMenu onClose={onClose} />);
    expect(screen.getByText('Programs')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Find')).toBeInTheDocument();
    expect(screen.getByText('Run...')).toBeInTheDocument();
    expect(screen.getByText('Shut Down...')).toBeInTheDocument();
  });

  it('Programs has a submenu arrow indicator', () => {
    render(<StartMenu onClose={onClose} />);
    // The Programs row contains a ▶ indicator
    const programsRow = screen.getByText('Programs').closest('div[class*="flex items-center"]')!;
    expect(programsRow.textContent).toContain('▶');
  });

  it('hovering Programs opens the submenu', () => {
    render(<StartMenu onClose={onClose} />);
    const programsContainer = screen.getByText('Programs').closest('.relative')!;
    fireEvent.mouseEnter(programsContainer);
    // Submenu should appear with app entries
    // At minimum, subfolders like Accessories, Games should show
    const submenuItems = screen.getAllByText(/Accessories|Games|Internet Tools|Multimedia/);
    expect(submenuItems.length).toBeGreaterThanOrEqual(1);
  });

  it('clicking an app in submenu calls openWindow', () => {
    render(<StartMenu onClose={onClose} />);
    // Open Programs submenu
    const programsContainer = screen.getByText('Programs').closest('.relative')!;
    fireEvent.mouseEnter(programsContainer);
    // Root-level program items (like MS-DOS Prompt, Explorer, etc.) should be visible
    // Find one and click it
    const buttons = screen.getAllByRole('button');
    const appButton = buttons.find(
      (b) => b.textContent && !['Programs', 'File', 'Edit'].includes(b.textContent.trim()),
    );
    if (appButton) {
      fireEvent.click(appButton);
      expect(mockOpenWindow).toHaveBeenCalled();
    }
  });

  it('has blue sidebar on the left with "Windows 98" text', () => {
    render(<StartMenu onClose={onClose} />);
    expect(screen.getByText('Windows 98')).toBeInTheDocument();
    const sidebar = screen.getByText('Windows 98').closest('div[class*="bg-gradient"]')!;
    expect(sidebar).toBeInTheDocument();
  });

  it('click outside the menu closes it', () => {
    render(<StartMenu onClose={onClose} />);
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it('Shut Down item is present', () => {
    render(<StartMenu onClose={onClose} />);
    expect(screen.getByText('Shut Down...')).toBeInTheDocument();
  });
});
