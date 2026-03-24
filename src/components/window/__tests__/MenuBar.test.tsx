import { render, screen, fireEvent } from '@testing-library/react';
import { MenuBar, MenuDefinition } from '../MenuBar';

const testMenus: MenuDefinition[] = [
  {
    label: 'File',
    items: [
      { label: 'New', shortcut: 'Ctrl+N', onClick: vi.fn() },
      { label: 'Open', shortcut: 'Ctrl+O', onClick: vi.fn() },
      { separator: true, label: '' },
      { label: 'Save', disabled: true },
      { label: 'Exit', onClick: vi.fn() },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', onClick: vi.fn() },
      { label: 'Copy', onClick: vi.fn() },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'About', onClick: vi.fn() },
    ],
  },
];

describe('MenuBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all menu labels', () => {
    render(<MenuBar menus={testMenus} />);
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('clicking a menu label opens its dropdown', () => {
    render(<MenuBar menus={testMenus} />);
    expect(screen.queryByText('New')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('File'));
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Exit')).toBeInTheDocument();
  });

  it('hovering another label while open switches to that menu', () => {
    render(<MenuBar menus={testMenus} />);
    fireEvent.mouseDown(screen.getByText('File'));
    expect(screen.getByText('New')).toBeInTheDocument();
    // Hover over Edit while File is open
    fireEvent.mouseEnter(screen.getByText('Edit'));
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.queryByText('New')).not.toBeInTheDocument();
  });

  it('clicking outside closes the dropdown', () => {
    render(<MenuBar menus={testMenus} />);
    fireEvent.mouseDown(screen.getByText('File'));
    expect(screen.getByText('New')).toBeInTheDocument();
    // Click outside (on document body)
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('New')).not.toBeInTheDocument();
  });

  it('disabled menu items have disabled attribute', () => {
    render(<MenuBar menus={testMenus} />);
    fireEvent.mouseDown(screen.getByText('File'));
    const saveButton = screen.getByText('Save').closest('button')!;
    expect(saveButton).toBeDisabled();
  });

  it('separator items render as dividers', () => {
    render(<MenuBar menus={testMenus} />);
    fireEvent.mouseDown(screen.getByText('File'));
    // The dropdown is a div containing items. Separators are divs with border-t class
    const dropdown = screen.getByText('New').closest('div[class*="min-w"]')!;
    const separators = dropdown.querySelectorAll('div[class*="border-t"]');
    expect(separators.length).toBeGreaterThanOrEqual(1);
  });
});
