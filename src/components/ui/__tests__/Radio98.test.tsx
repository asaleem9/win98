import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Radio98 } from '@/components/ui/Radio98';

describe('Radio98', () => {
  it('renders radio input and label', () => {
    render(<Radio98 label="Option A" name="group" />);
    expect(screen.getByRole('radio')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
  });

  it('label association via htmlFor/id', () => {
    render(<Radio98 label="Option A" id="opt-a" name="group" />);
    const radio = screen.getByRole('radio');
    expect(radio).toHaveAttribute('id', 'opt-a');
    expect(radio.closest('label')).toHaveAttribute('for', 'opt-a');
  });

  it('group selection (only one selected at a time in same name group)', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Radio98 label="A" name="g" value="a" />
        <Radio98 label="B" name="g" value="b" />
      </div>
    );
    const [radioA, radioB] = screen.getAllByRole('radio');
    await user.click(radioA);
    expect(radioA).toBeChecked();
    expect(radioB).not.toBeChecked();
    await user.click(radioB);
    expect(radioA).not.toBeChecked();
    expect(radioB).toBeChecked();
  });

  it('disabled state', () => {
    render(<Radio98 label="Disabled" disabled name="group" />);
    expect(screen.getByRole('radio')).toBeDisabled();
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Radio98 ref={ref} label="Ref" name="group" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('radio');
  });

  it('onChange fires', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Radio98 label="Fire" name="group" onChange={onChange} />);
    await user.click(screen.getByRole('radio'));
    expect(onChange).toHaveBeenCalled();
  });
});
