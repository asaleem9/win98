import { render, screen, fireEvent, act } from '@testing-library/react';
import { Tooltip98 } from '@/components/ui/Tooltip98';

describe('Tooltip98', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hidden by default', () => {
    render(<Tooltip98 text="Helpful tip"><button>Hover me</button></Tooltip98>);
    expect(screen.queryByText('Helpful tip')).not.toBeInTheDocument();
  });

  it('shows on mouseEnter after delay', () => {
    render(<Tooltip98 text="Tip text" delay={300}><button>Hover me</button></Tooltip98>);
    const trigger = screen.getByText('Hover me').parentElement!;
    fireEvent.mouseEnter(trigger, { clientX: 100, clientY: 100 });
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByText('Tip text')).toBeInTheDocument();
  });

  it('hides on mouseLeave', () => {
    render(<Tooltip98 text="Tip" delay={100}><button>Hover me</button></Tooltip98>);
    const trigger = screen.getByText('Hover me').parentElement!;
    fireEvent.mouseEnter(trigger, { clientX: 100, clientY: 100 });
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.getByText('Tip')).toBeInTheDocument();
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByText('Tip')).not.toBeInTheDocument();
  });

  it('displays tooltip text content', () => {
    render(<Tooltip98 text="Save file" delay={0}><button>Save</button></Tooltip98>);
    const trigger = screen.getByText('Save').parentElement!;
    fireEvent.mouseEnter(trigger, { clientX: 50, clientY: 50 });
    act(() => { vi.advanceTimersByTime(0); });
    expect(screen.getByText('Save file')).toBeInTheDocument();
  });

  it('positioned near trigger element', () => {
    render(<Tooltip98 text="Position test" delay={0}><button>Target</button></Tooltip98>);
    const trigger = screen.getByText('Target').parentElement!;
    fireEvent.mouseEnter(trigger, { clientX: 200, clientY: 300 });
    act(() => { vi.advanceTimersByTime(0); });
    const tooltip = screen.getByText('Position test');
    expect(tooltip.style.left).toBe('212px');
    expect(tooltip.style.top).toBe('316px');
  });
});
