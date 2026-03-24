import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScrollBar98 } from '@/components/ui/ScrollBar98';

describe('ScrollBar98', () => {
  const defaultProps = { value: 50, max: 100, viewportSize: 50, onChange: vi.fn() };

  it('renders vertical orientation by default', () => {
    const { container } = render(<ScrollBar98 {...defaultProps} />);
    const scrollbar = container.firstElementChild as HTMLElement;
    expect(scrollbar.className).toMatch(/flex-col/);
    expect(scrollbar.className).toMatch(/w-\[16px\]/);
  });

  it('horizontal orientation when specified', () => {
    const { container } = render(<ScrollBar98 {...defaultProps} orientation="horizontal" />);
    const scrollbar = container.firstElementChild as HTMLElement;
    expect(scrollbar.className).toMatch(/flex-row/);
    expect(scrollbar.className).toMatch(/h-\[16px\]/);
  });

  it('up/down arrow buttons render for vertical', () => {
    render(<ScrollBar98 {...defaultProps} />);
    expect(screen.getByText('▲')).toBeInTheDocument();
    expect(screen.getByText('▼')).toBeInTheDocument();
  });

  it('left/right arrow buttons render for horizontal', () => {
    render(<ScrollBar98 {...defaultProps} orientation="horizontal" />);
    expect(screen.getByText('◀')).toBeInTheDocument();
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('thumb element is present', () => {
    const { container } = render(<ScrollBar98 {...defaultProps} />);
    // The thumb is an absolutely positioned div inside the track
    const thumb = container.querySelector('.absolute');
    expect(thumb).toBeInTheDocument();
  });

  it('value clamped to min/max range', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // value is 0 (at minimum), clicking up arrow should clamp to 0
    render(<ScrollBar98 value={0} max={100} viewportSize={50} onChange={onChange} />);
    await user.click(screen.getByText('▲'));
    expect(onChange).toHaveBeenCalled();
    const calledValue = onChange.mock.calls[0][0];
    expect(calledValue).toBeGreaterThanOrEqual(0);
  });

  it('arrow click calls onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ScrollBar98 value={50} max={100} viewportSize={50} onChange={onChange} />);
    await user.click(screen.getByText('▼'));
    expect(onChange).toHaveBeenCalledOnce();
  });
});
