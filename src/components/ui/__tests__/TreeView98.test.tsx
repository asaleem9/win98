import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TreeView98, TreeNode } from '@/components/ui/TreeView98';

const nodes: TreeNode[] = [
  {
    id: 'root1',
    label: 'Desktop',
    icon: '/icon.png',
    children: [
      { id: 'child1', label: 'My Computer', children: [{ id: 'grandchild1', label: 'C: Drive' }] },
      { id: 'child2', label: 'Recycle Bin' },
    ],
  },
  { id: 'root2', label: 'Network', icon: '/network.png' },
];

describe('TreeView98', () => {
  it('renders root nodes', () => {
    render(<TreeView98 nodes={nodes} />);
    expect(screen.getByText('Desktop')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
  });

  it('expand icon (+) shown for nodes with children', () => {
    const { container } = render(
      <TreeView98 nodes={[{
        id: 'p', label: 'Parent', children: [
          { id: 'c', label: 'Child', children: [{ id: 'gc', label: 'Grandchild' }] }
        ]
      }]} />
    );
    // Root is expanded (depth=0), so we see 'Child' at depth=1 (collapsed by default)
    expect(screen.getByText('Child')).toBeInTheDocument();
    // The expand button for 'Child' should show '+'
    const buttons = container.querySelectorAll('button');
    const childExpandBtn = Array.from(buttons).find(b => b.textContent === '+');
    expect(childExpandBtn).toBeTruthy();
  });

  it('clicking + expands to show children and icon changes to −', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TreeView98 nodes={[{
        id: 'p', label: 'Parent', children: [
          { id: 'c', label: 'Child', children: [{ id: 'gc', label: 'Grandchild' }] }
        ]
      }]} />
    );
    // 'Grandchild' not visible initially (Child node at depth=1 is collapsed)
    expect(screen.queryByText('Grandchild')).not.toBeInTheDocument();
    const plusBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === '+')!;
    await user.click(plusBtn);
    expect(screen.getByText('Grandchild')).toBeInTheDocument();
    // The button should now show '−'
    expect(plusBtn.textContent).toBe('−');
  });

  it('collapse hides children', async () => {
    const user = userEvent.setup();
    render(<TreeView98 nodes={nodes} />);
    // Root 'Desktop' is expanded at depth=0, children visible
    expect(screen.getByText('My Computer')).toBeInTheDocument();
    // Find the '−' button for 'Desktop'
    const minusBtn = screen.getAllByRole('button').find(b => b.textContent === '−')!;
    await user.click(minusBtn);
    expect(screen.queryByText('My Computer')).not.toBeInTheDocument();
  });

  it('onSelect callback fires with node data', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TreeView98 nodes={nodes} onSelect={onSelect} />);
    await user.click(screen.getByText('Desktop'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'root1', label: 'Desktop' }));
  });

  it('nested children render at deeper indentation', () => {
    const { container } = render(<TreeView98 nodes={nodes} />);
    // 'My Computer' is at depth=1, should have paddingLeft of 16
    const myComputer = screen.getByText('My Computer').closest('[style]') as HTMLElement;
    expect(myComputer?.style.paddingLeft).toBe('16px');
  });

  it('leaf nodes (no children) have no expand icon', () => {
    render(<TreeView98 nodes={[{ id: 'leaf', label: 'Leaf Node' }]} />);
    expect(screen.getByText('Leaf Node')).toBeInTheDocument();
    // No buttons should be rendered for a leaf
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('custom icons render', () => {
    const { container } = render(<TreeView98 nodes={nodes} />);
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBeGreaterThan(0);
    expect(imgs[0]).toHaveAttribute('src', '/icon.png');
  });
});
