import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar98 } from '@/components/ui/Toolbar98';

const items = [
  { id: 'new', icon: <span>N</span>, label: 'New', onClick: vi.fn() },
  { id: 'sep1', separator: true },
  { id: 'save', icon: <span>S</span>, label: 'Save', onClick: vi.fn(), disabled: true },
  { id: 'bold', icon: <span>B</span>, label: 'Bold', onClick: vi.fn(), active: true },
];

describe('Toolbar98', () => {
  it('renders toolbar items', () => {
    render(<Toolbar98 items={items} />);
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Bold')).toBeInTheDocument();
  });

  it('separator renders as divider element', () => {
    const { container } = render(<Toolbar98 items={items} />);
    // Separator has specific width and border styling
    const separators = container.querySelectorAll('.w-\\[2px\\]');
    expect(separators.length).toBe(1);
  });

  it('disabled item has disabled styling', () => {
    render(<Toolbar98 items={items} />);
    const saveBtn = screen.getByText('Save').closest('button') as HTMLButtonElement;
    expect(saveBtn).toBeDisabled();
    expect(saveBtn.className).toMatch(/opacity-50/);
  });

  it('active item has pressed styling', () => {
    render(<Toolbar98 items={items} />);
    const boldBtn = screen.getByText('Bold').closest('button') as HTMLElement;
    expect(boldBtn.className).toMatch(/border-t-\[var\(--win98-button-shadow\)\]/);
  });

  it('click handler fires on item click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Toolbar98 items={[{ id: 'test', label: 'Test', onClick }]} />);
    await user.click(screen.getByText('Test'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('grip/handle renders at start', () => {
    const { container } = render(<Toolbar98 items={items} />);
    // Grip handle is the first child, has w-[4px]
    const grip = container.querySelector('.w-\\[4px\\]');
    expect(grip).toBeInTheDocument();
    // Verify it's the first child of the toolbar
    const toolbar = container.firstElementChild!;
    expect(toolbar.firstElementChild).toBe(grip);
  });
});
