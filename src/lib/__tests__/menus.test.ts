import { standardFileMenu, standardEditMenu, standardHelpMenu } from '../menus';
import type { MenuItem } from '@/components/window/MenuBar';

const labels = (items: MenuItem[]) => items.map((i) => i.label);
const find = (items: MenuItem[], text: string) =>
  items.find((i) => i.label.includes(text));

describe('standardFileMenu', () => {
  it('includes only the file ops whose handlers are supplied', () => {
    const menu = standardFileMenu({ onNew: vi.fn(), onExit: vi.fn() });
    expect(menu.label).toBe('&File');
    expect(find(menu.items, 'New')).toBeDefined();
    expect(find(menu.items, 'Open')).toBeUndefined();
    expect(find(menu.items, 'Save')).toBeUndefined();
  });

  it('always includes Print (disabled without a handler) and Exit', () => {
    const menu = standardFileMenu({ onExit: vi.fn() });
    const print = find(menu.items, 'Print')!;
    const exit = find(menu.items, 'xit')!;
    expect(print).toBeDefined();
    expect(print.disabled).toBe(true);
    expect(exit).toBeDefined();
    // No leading separator when there are no file ops above Print.
    expect(menu.items[0].label).toContain('Print');
  });

  it('enables Print when a handler is given and wires standard shortcuts', () => {
    const menu = standardFileMenu({
      onNew: vi.fn(), onOpen: vi.fn(), onSave: vi.fn(), onPrint: vi.fn(), onExit: vi.fn(),
    });
    expect(find(menu.items, 'Print')!.disabled).toBe(false);
    expect(find(menu.items, 'New')!.shortcut).toBe('Ctrl+N');
    expect(find(menu.items, 'Open')!.shortcut).toBe('Ctrl+O');
    expect(find(menu.items, 'Save')!.shortcut).toBe('Ctrl+S');
    expect(find(menu.items, 'Print')!.shortcut).toBe('Ctrl+P');
  });

  it('separates the file-op group from Print', () => {
    const menu = standardFileMenu({ onNew: vi.fn(), onExit: vi.fn() });
    const sepCount = menu.items.filter((i) => i.separator).length;
    // one between New and Print, one between Print and Exit
    expect(sepCount).toBe(2);
  });
});

describe('standardEditMenu', () => {
  it('includes only the actions whose handlers are supplied', () => {
    const menu = standardEditMenu({ onCopy: vi.fn() });
    expect(menu.label).toBe('&Edit');
    expect(labels(menu.items.filter((i) => !i.separator))).toEqual(['&Copy']);
  });

  it('derives Undo/Paste enablement from the can* flags', () => {
    const menu = standardEditMenu({
      onUndo: vi.fn(), canUndo: false,
      onPaste: vi.fn(), canPaste: false,
    });
    expect(find(menu.items, 'Undo')!.disabled).toBe(true);
    expect(find(menu.items, 'Paste')!.disabled).toBe(true);
  });

  it('enables Undo/Paste when the flags are true', () => {
    const menu = standardEditMenu({
      onUndo: vi.fn(), canUndo: true,
      onPaste: vi.fn(), canPaste: true,
    });
    expect(find(menu.items, 'Undo')!.disabled).toBe(false);
    expect(find(menu.items, 'Paste')!.disabled).toBe(false);
  });

  it('separates the undo, clipboard, and find groups', () => {
    const menu = standardEditMenu({
      onUndo: vi.fn(), onCut: vi.fn(), onCopy: vi.fn(), onPaste: vi.fn(), onSelectAll: vi.fn(),
    });
    expect(menu.items.filter((i) => i.separator).length).toBe(2);
  });
});

describe('standardHelpMenu', () => {
  it('disables Help Topics when no handler is given', () => {
    const menu = standardHelpMenu('Notepad');
    expect(menu.label).toBe('&Help');
    expect(find(menu.items, 'Topics')!.disabled).toBe(true);
    expect(find(menu.items, 'About')!.label).toContain('Notepad');
  });

  it('enables Help Topics when a handler is given', () => {
    const menu = standardHelpMenu('Notepad', { onHelpTopics: vi.fn() });
    expect(find(menu.items, 'Topics')!.disabled).toBe(false);
  });

  it('About dispatches the win98-about-dialog event with the app name', () => {
    const menu = standardHelpMenu('Paint');
    const handler = vi.fn();
    window.addEventListener('win98-about-dialog', handler);
    try {
      find(menu.items, 'About')!.onClick!();
      expect(handler).toHaveBeenCalledTimes(1);
      const evt = handler.mock.calls[0][0] as CustomEvent;
      expect(evt.detail).toEqual({ appName: 'Paint' });
    } finally {
      window.removeEventListener('win98-about-dialog', handler);
    }
  });
});
