import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Input98 } from '@/components/ui/Input98';

describe('Input98', () => {
  it('renders as input element', () => {
    render(<Input98 aria-label="test" />);
    const input = screen.getByRole('textbox');
    expect(input.tagName).toBe('INPUT');
  });

  it('default variant has inset border styling', () => {
    render(<Input98 aria-label="test" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/border-t-\[var\(--win98-button-shadow\)\]/);
    expect(input.className).toMatch(/border-b-\[var\(--win98-button-highlight\)\]/);
  });

  it('flat variant styling', () => {
    render(<Input98 variant="flat" aria-label="test" />);
    const input = screen.getByRole('textbox');
    // flat variant doesn't add the border classes from the default variant
    expect(input.className).not.toMatch(/border-t-\[var\(--win98-button-shadow\)\]/);
  });

  it('disabled state', () => {
    render(<Input98 disabled aria-label="test" />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('value change fires onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input98 aria-label="test" onChange={onChange} />);
    await user.type(screen.getByRole('textbox'), 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input98 ref={ref} aria-label="test" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('accepts custom className', () => {
    render(<Input98 className="my-input" aria-label="test" />);
    expect(screen.getByRole('textbox')).toHaveClass('my-input');
  });
});
