import { render, screen, fireEvent, act } from '@testing-library/react';
import { MenuBar, MenuDefinition } from '../MenuBar';

// The keyboard bridge reads window focus via useWindows(); mock it so tests can
// drive an id'd, focused menubar without standing up the whole window manager.
const { mockState } = vi.hoisted(() => ({
  mockState: { windows: [{ id: 'w1', isFocused: true }] as { id: string; isFocused: boolean }[] },
}));
vi.mock('@/contexts/WindowContext', () => ({
  useWindows: () => mockState,
}));

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
    items: [{ label: 'About', onClick: vi.fn() }],
  },
];

const HIGHLIGHT = 'bg-[var(--win98-highlight)]';

describe('MenuBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.windows = [{ id: 'w1', isFocused: true }];
  });

  it('renders all menu labels', () => {
    render(<MenuBar menus={testMenus} />);
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('clicking a menu label opens its dropdown (portaled to body)', () => {
    render(<MenuBar menus={testMenus} />);
    expect(screen.queryByText('New')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('File'));
    // Dropdown lives on document.body, so it's found via screen (not container).
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Exit')).toBeInTheDocument();
    expect(document.body.querySelector('[role="menu"]')).toBeInTheDocument();
  });

  it('hovering another label while open switches to that menu', () => {
    render(<MenuBar menus={testMenus} />);
    fireEvent.mouseDown(screen.getByText('File'));
    expect(screen.getByText('New')).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByText('Edit'));
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.queryByText('New')).not.toBeInTheDocument();
  });

  it('clicking outside closes the dropdown', () => {
    render(<MenuBar menus={testMenus} />);
    fireEvent.mouseDown(screen.getByText('File'));
    expect(screen.getByText('New')).toBeInTheDocument();
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
    const dropdown = screen.getByText('New').closest('[role="menu"]')!;
    expect(dropdown.querySelectorAll('[role="separator"]').length).toBeGreaterThanOrEqual(1);
  });

  it('clicking a leaf item fires its handler and closes the menu', () => {
    render(<MenuBar menus={testMenus} />);
    fireEvent.mouseDown(screen.getByText('File'));
    fireEvent.click(screen.getByText('Exit').closest('button')!);
    expect(testMenus[0].items[4].onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Exit')).not.toBeInTheDocument();
  });
});

describe('MenuBar accelerators', () => {
  it('underlines the & accelerator char and strips the ampersand', () => {
    render(<MenuBar menus={[{ label: '&File', items: [{ label: 'New', onClick: vi.fn() }] }]} />);
    const btn = screen.getByRole('menuitem', { name: 'File' });
    expect(btn.textContent).toBe('File');
    expect(btn.querySelector('.underline')?.textContent).toBe('F');
  });

  it('renders a doubled && as a literal ampersand', () => {
    render(<MenuBar menus={[{ label: 'Tom && Jerry', items: [{ label: 'x', onClick: vi.fn() }] }]} />);
    expect(screen.getByRole('menuitem', { name: 'Tom & Jerry' })).toBeInTheDocument();
  });
});

describe('MenuBar submenus', () => {
  const subMenus: MenuDefinition[] = [
    {
      label: 'Game',
      items: [
        { label: 'New', onClick: vi.fn() },
        {
          label: 'AI Difficulty',
          submenu: [
            { label: 'Easy', radio: true, checked: true, onClick: vi.fn() },
            { label: 'Hard', radio: true, onClick: vi.fn() },
          ],
        },
      ],
    },
  ];

  it('opens a submenu on click and reveals nested items', () => {
    render(<MenuBar menus={subMenus} />);
    fireEvent.mouseDown(screen.getByText('Game'));
    expect(screen.queryByText('Easy')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('AI Difficulty').closest('button')!);
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
  });

  it('opens a submenu on hover after a delay', () => {
    vi.useFakeTimers();
    try {
      render(<MenuBar menus={subMenus} />);
      fireEvent.mouseDown(screen.getByText('Game'));
      fireEvent.mouseEnter(screen.getByText('AI Difficulty').closest('button')!);
      expect(screen.queryByText('Easy')).not.toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(300); });
      expect(screen.getByText('Easy')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the ▶ glyph on items that have a submenu', () => {
    render(<MenuBar menus={subMenus} />);
    fireEvent.mouseDown(screen.getByText('Game'));
    expect(screen.getByText('AI Difficulty').closest('button')!.textContent).toContain('▶');
  });

  it('renders a radio bullet for a checked radio item and nothing for an unchecked one', () => {
    render(<MenuBar menus={subMenus} />);
    fireEvent.mouseDown(screen.getByText('Game'));
    fireEvent.click(screen.getByText('AI Difficulty').closest('button')!);
    const easy = screen.getByText('Easy').closest('button')!;
    const hard = screen.getByText('Hard').closest('button')!;
    expect(easy.textContent).toContain('•');
    expect(easy).toHaveAttribute('role', 'menuitemradio');
    expect(easy).toHaveAttribute('aria-checked', 'true');
    expect(hard.textContent).not.toContain('•');
    expect(hard).toHaveAttribute('aria-checked', 'false');
  });

  it('renders a ✓ for a checked (non-radio) item', () => {
    render(
      <MenuBar
        menus={[{ label: 'View', items: [{ label: 'Word Wrap', checked: true, onClick: vi.fn() }] }]}
      />,
    );
    fireEvent.mouseDown(screen.getByText('View'));
    const item = screen.getByText('Word Wrap').closest('button')!;
    expect(item.textContent).toContain('✓');
    expect(item).toHaveAttribute('role', 'menuitemcheckbox');
  });
});

describe('MenuBar keyboard navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.windows = [{ id: 'w1', isFocused: true }];
  });

  const kbMenus: MenuDefinition[] = [
    {
      label: 'File',
      items: [
        { label: 'New', onClick: vi.fn() },
        { label: 'Open', onClick: vi.fn() },
      ],
    },
    { label: 'Edit', items: [{ label: 'Undo', onClick: vi.fn() }] },
  ];

  it('does nothing when the window is not focused', () => {
    mockState.windows = [{ id: 'w1', isFocused: false }];
    render(<MenuBar menus={kbMenus} windowId="w1" />);
    fireEvent.keyDown(document, { key: 'Alt' });
    const file = screen.getByRole('menuitem', { name: 'File' });
    expect(file.className).not.toContain(HIGHLIGHT);
  });

  it('Alt arms the menubar (highlights the first menu)', () => {
    render(<MenuBar menus={kbMenus} windowId="w1" />);
    fireEvent.keyDown(document, { key: 'Alt' });
    expect(screen.getByRole('menuitem', { name: 'File' }).className).toContain(HIGHLIGHT);
  });

  it('arrows cycle the armed top-level menu', () => {
    render(<MenuBar menus={kbMenus} windowId="w1" />);
    fireEvent.keyDown(document, { key: 'Alt' });
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByRole('menuitem', { name: 'Edit' }).className).toContain(HIGHLIGHT);
    expect(screen.getByRole('menuitem', { name: 'File' }).className).not.toContain(HIGHLIGHT);
  });

  it('ArrowDown opens the armed menu and Enter activates the highlighted item', () => {
    render(<MenuBar menus={kbMenus} windowId="w1" />);
    fireEvent.keyDown(document, { key: 'Alt' });
    fireEvent.keyDown(document, { key: 'ArrowDown' }); // open File, highlight New
    expect(screen.getByText('New')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'ArrowDown' }); // move to Open
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(kbMenus[0].items[1].onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('New')).not.toBeInTheDocument();
  });

  it('Esc closes an open dropdown, then disarms', () => {
    render(<MenuBar menus={kbMenus} windowId="w1" />);
    fireEvent.keyDown(document, { key: 'Alt' });
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(screen.getByText('New')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('New')).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'File' }).className).toContain(HIGHLIGHT);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('menuitem', { name: 'File' }).className).not.toContain(HIGHLIGHT);
  });

  it('Alt+letter opens the menu whose accelerator matches', () => {
    const accelMenus: MenuDefinition[] = [
      { label: '&File', items: [{ label: 'New', onClick: vi.fn() }] },
      { label: '&Edit', items: [{ label: 'Undo', onClick: vi.fn() }] },
    ];
    render(<MenuBar menus={accelMenus} windowId="w1" />);
    fireEvent.keyDown(document, { key: 'e', altKey: true, code: 'KeyE' });
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.queryByText('New')).not.toBeInTheDocument();
  });
});
