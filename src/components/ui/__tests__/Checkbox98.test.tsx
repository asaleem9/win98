import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Checkbox98 } from '@/components/ui/Checkbox98';

describe('Checkbox98', () => {
  it('renders checkbox input and label text', () => {
    render(<Checkbox98 label="Accept terms" />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('Accept terms')).toBeInTheDocument();
  });

  it('label and input have matching htmlFor/id', () => {
    render(<Checkbox98 label="My Option" id="custom-id" />);
    const input = screen.getByRole('checkbox');
    expect(input).toHaveAttribute('id', 'custom-id');
    expect(input.closest('label')).toHaveAttribute('for', 'custom-id');
  });

  it('toggling changes checked state', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox98 label="Toggle" onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    expect(onChange).toHaveBeenCalled();
  });

  it('disabled state prevents interaction', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox98 label="Disabled" disabled onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    await user.click(checkbox);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('forwards ref to input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox98 ref={ref} label="Ref" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('checkbox');
  });

  it('custom className on wrapper', () => {
    const { container } = render(<Checkbox98 label="Test" className="my-class" />);
    expect(container.querySelector('label')).toHaveClass('my-class');
  });

  it('unchecked by default', () => {
    render(<Checkbox98 label="Default" />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
