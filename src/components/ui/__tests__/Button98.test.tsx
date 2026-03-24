import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Button98 } from '@/components/ui/Button98';

describe('Button98', () => {
  it('renders with children text', () => {
    render(<Button98>Click Me</Button98>);
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });

  it('default variant has raised border classes', () => {
    render(<Button98>OK</Button98>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/border-t-\[var\(--win98-button-highlight\)\]/);
    expect(btn.className).toMatch(/border-b-\[var\(--win98-button-dark-shadow\)\]/);
  });

  it('flat variant has transparent border', () => {
    render(<Button98 variant="flat">Flat</Button98>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/border-transparent/);
  });

  it('start variant has bold font', () => {
    render(<Button98 variant="start">Start</Button98>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/font-bold/);
  });

  it('active state applies pressed styling classes', () => {
    render(<Button98 active>Active</Button98>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/border-t-\[var\(--win98-button-dark-shadow\)\]/);
    expect(btn.className).toMatch(/pl-\[2px\]/);
  });

  it('disabled state adds disabled text class and pointer-events-none', () => {
    render(<Button98 disabled>Disabled</Button98>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.className).toMatch(/pointer-events-none/);
    expect(btn.className).toMatch(/text-\[var\(--win98-disabled-text\)\]/);
  });

  it('click handler fires', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button98 onClick={onClick}>Click</Button98>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('forwards ref to button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button98 ref={ref}>Ref</Button98>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('accepts custom className', () => {
    render(<Button98 className="my-custom">Custom</Button98>);
    expect(screen.getByRole('button')).toHaveClass('my-custom');
  });

  it('renders as HTML button element', () => {
    render(<Button98>Btn</Button98>);
    expect(screen.getByRole('button').tagName).toBe('BUTTON');
  });
});
