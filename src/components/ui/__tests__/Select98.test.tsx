import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Select98 } from '@/components/ui/Select98';

describe('Select98', () => {
  it('renders as select element', () => {
    render(
      <Select98 aria-label="test">
        <option value="a">A</option>
      </Select98>
    );
    expect(screen.getByRole('combobox').tagName).toBe('SELECT');
  });

  it('renders option children', () => {
    render(
      <Select98 aria-label="test">
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
      </Select98>
    );
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument();
  });

  it('disabled state', () => {
    render(
      <Select98 disabled aria-label="test">
        <option value="a">A</option>
      </Select98>
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <Select98 ref={ref} aria-label="test">
        <option value="a">A</option>
      </Select98>
    );
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it('onChange fires with selected value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select98 aria-label="test" onChange={onChange}>
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
      </Select98>
    );
    await user.selectOptions(screen.getByRole('combobox'), 'b');
    expect(onChange).toHaveBeenCalled();
  });
});
