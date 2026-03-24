import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListView98, ListItem } from '@/components/ui/ListView98';

const items: ListItem[] = [
  { id: '1', name: 'Document.txt', icon: '/doc32.png', icon16: '/doc16.png', type: 'Text', size: '1 KB', modified: '01/01/1998' },
  { id: '2', name: 'Image.bmp', icon: '/img32.png', icon16: '/img16.png', type: 'Bitmap', size: '512 KB', modified: '03/15/1998' },
];

const columns = [
  { key: 'name', label: 'Name', width: 200 },
  { key: 'size', label: 'Size', width: 80 },
  { key: 'type', label: 'Type', width: 100 },
  { key: 'modified', label: 'Modified', width: 120 },
];

describe('ListView98', () => {
  it('renders items in default (large icon) view', () => {
    render(<ListView98 items={items} />);
    expect(screen.getByText('Document.txt')).toBeInTheDocument();
    expect(screen.getByText('Image.bmp')).toBeInTheDocument();
  });

  it('"list" view mode renders differently', () => {
    const { container } = render(<ListView98 items={items} mode="list" />);
    const wrapper = container.querySelector('.flex.flex-col');
    expect(wrapper).toBeInTheDocument();
  });

  it('"details" view shows columns/headers', () => {
    render(<ListView98 items={items} mode="details" columns={columns} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Modified')).toBeInTheDocument();
  });

  it('"small-icon" view mode', () => {
    const { container } = render(<ListView98 items={items} mode="small-icons" />);
    // small-icons items have w-[200px] class
    const itemEls = container.querySelectorAll('.w-\\[200px\\]');
    expect(itemEls.length).toBe(2);
  });

  it('selection highlights item', () => {
    const { container } = render(<ListView98 items={items} selectedId="1" />);
    const selectedItem = screen.getByText('Document.txt').closest('[class*="cursor-default"]') as HTMLElement;
    expect(selectedItem?.className).toMatch(/win98-highlight/);
  });

  it('onDoubleClick fires on item double-click', async () => {
    const user = userEvent.setup();
    const onDoubleClick = vi.fn();
    render(<ListView98 items={items} onDoubleClick={onDoubleClick} />);
    await user.dblClick(screen.getByText('Document.txt'));
    expect(onDoubleClick).toHaveBeenCalledWith(expect.objectContaining({ id: '1', name: 'Document.txt' }));
  });

  it('onSelect fires on item click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ListView98 items={items} onSelect={onSelect} />);
    await user.click(screen.getByText('Image.bmp'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '2', name: 'Image.bmp' }));
  });

  it('items display label and icon', () => {
    const { container } = render(<ListView98 items={items} />);
    expect(screen.getByText('Document.txt')).toBeInTheDocument();
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBeGreaterThan(0);
  });
});
