import { render } from '@testing-library/react';
import { ProgressBar98 } from '@/components/ui/ProgressBar98';

describe('ProgressBar98', () => {
  it('renders with correct percentage width on inner bar', () => {
    const { container } = render(<ProgressBar98 value={50} />);
    const inner = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(inner.style.width).toBe('50%');
  });

  it('0% renders empty', () => {
    const { container } = render(<ProgressBar98 value={0} />);
    const inner = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(inner.style.width).toBe('0%');
  });

  it('100% renders full', () => {
    const { container } = render(<ProgressBar98 value={100} />);
    const inner = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(inner.style.width).toBe('100%');
  });

  it('clamped below 0 (treated as 0)', () => {
    const { container } = render(<ProgressBar98 value={-20} />);
    const inner = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(inner.style.width).toBe('0%');
  });

  it('clamped above 100 (treated as 100)', () => {
    const { container } = render(<ProgressBar98 value={150} />);
    const inner = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(inner.style.width).toBe('100%');
  });

  it('segmented variant renders block pattern', () => {
    const { container } = render(<ProgressBar98 value={50} segmented />);
    const inner = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(inner.className).toMatch(/repeating-linear-gradient/);
  });
});
