import { render, screen, fireEvent } from '@testing-library/react';
import { TitleBar } from '../TitleBar';

const defaultProps = {
  title: 'Test Title',
  icon16: '/icons/test-16.svg',
  isFocused: true,
  windowState: 'normal' as const,
  onMinimize: vi.fn(),
  onMaximize: vi.fn(),
  onRestore: vi.fn(),
  onClose: vi.fn(),
  onDoubleClick: vi.fn(),
  onPointerDown: vi.fn(),
};

describe('TitleBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays title text', () => {
    render(<TitleBar {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('active state has active gradient background classes', () => {
    render(<TitleBar {...defaultProps} isFocused={true} />);
    const titlebar = screen.getByText('Test Title').closest('div[class*="bg-gradient"]')!;
    expect(titlebar.className).toContain('titlebar-active');
    expect(titlebar.className).not.toContain('titlebar-inactive');
  });

  it('inactive state has inactive gradient classes', () => {
    render(<TitleBar {...defaultProps} isFocused={false} />);
    const titlebar = screen.getByText('Test Title').closest('div[class*="bg-gradient"]')!;
    expect(titlebar.className).toContain('titlebar-inactive');
    expect(titlebar.className).not.toContain('titlebar-active-start');
  });

  it('shows app icon', () => {
    const { container } = render(<TitleBar {...defaultProps} />);
    const icon = container.querySelector('img[src="/icons/test-16.svg"]');
    expect(icon).toBeInTheDocument();
  });

  it('has minimize, maximize, close buttons', () => {
    render(<TitleBar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('maximize button shows restore icon when window is maximized', () => {
    const { container: normalContainer } = render(
      <TitleBar {...defaultProps} windowState="normal" />,
    );
    // Normal state: single rectangle (one div with border border-t-2)
    const normalMaxBtn = normalContainer.querySelectorAll('button')[1];
    const normalIcon = normalMaxBtn.querySelector('.relative');
    expect(normalIcon).toBeNull();

    const { container: maxContainer } = render(
      <TitleBar {...defaultProps} windowState="maximized" />,
    );
    // Maximized: two overlapping rectangles in a relative wrapper
    const maxBtn = maxContainer.querySelectorAll('button')[1];
    const restoreIcon = maxBtn.querySelector('.relative');
    expect(restoreIcon).toBeInTheDocument();
  });

  it('onPointerDown handler attached for dragging', () => {
    render(<TitleBar {...defaultProps} />);
    const titlebar = screen.getByText('Test Title').closest('div[class*="bg-gradient"]')!;
    fireEvent.pointerDown(titlebar);
    expect(defaultProps.onPointerDown).toHaveBeenCalled();
  });

  it('onDoubleClick handler attached for maximize toggle', () => {
    render(<TitleBar {...defaultProps} />);
    const titlebar = screen.getByText('Test Title').closest('div[class*="bg-gradient"]')!;
    fireEvent.doubleClick(titlebar);
    expect(defaultProps.onDoubleClick).toHaveBeenCalled();
  });
});
