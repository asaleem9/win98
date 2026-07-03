import type { MenuDefinition, MenuItem } from '@/components/window/MenuBar';

const SEP: MenuItem = { label: '', separator: true };

/**
 * Build the standard Win98 File menu. Each editing action appears only when a
 * handler is supplied; Print is always present (disabled without a handler) and
 * Exit is always present. Groups are separated only where both sides exist.
 */
export function standardFileMenu(opts: {
  onNew?: () => void;
  onOpen?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onPrint?: () => void;
  onExit: () => void;
}): MenuDefinition {
  const fileOps: MenuItem[] = [];
  if (opts.onNew) fileOps.push({ label: '&New', shortcut: 'Ctrl+N', onClick: opts.onNew });
  if (opts.onOpen) fileOps.push({ label: '&Open...', shortcut: 'Ctrl+O', onClick: opts.onOpen });
  if (opts.onSave) fileOps.push({ label: '&Save', shortcut: 'Ctrl+S', onClick: opts.onSave });
  if (opts.onSaveAs) fileOps.push({ label: 'Save &As...', onClick: opts.onSaveAs });

  const items: MenuItem[] = [...fileOps];
  if (fileOps.length) items.push(SEP);
  items.push({ label: '&Print...', shortcut: 'Ctrl+P', onClick: opts.onPrint, disabled: !opts.onPrint });
  items.push(SEP);
  items.push({ label: 'E&xit', onClick: opts.onExit });

  return { label: '&File', items };
}

/**
 * Build the standard Win98 Edit menu. Each action appears only when its handler
 * is supplied; Undo/Paste enablement follows the canUndo/canPaste flags.
 */
export function standardEditMenu(opts: {
  onUndo?: () => void;
  canUndo?: boolean;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  canPaste?: boolean;
  onSelectAll?: () => void;
  onFind?: () => void;
}): MenuDefinition {
  const undoGroup: MenuItem[] = [];
  if (opts.onUndo) {
    undoGroup.push({ label: '&Undo', shortcut: 'Ctrl+Z', onClick: opts.onUndo, disabled: opts.canUndo === false });
  }

  const clipboardGroup: MenuItem[] = [];
  if (opts.onCut) clipboardGroup.push({ label: 'Cu&t', shortcut: 'Ctrl+X', onClick: opts.onCut });
  if (opts.onCopy) clipboardGroup.push({ label: '&Copy', shortcut: 'Ctrl+C', onClick: opts.onCopy });
  if (opts.onPaste) {
    clipboardGroup.push({ label: '&Paste', shortcut: 'Ctrl+V', onClick: opts.onPaste, disabled: opts.canPaste === false });
  }

  const findGroup: MenuItem[] = [];
  if (opts.onSelectAll) findGroup.push({ label: 'Select &All', shortcut: 'Ctrl+A', onClick: opts.onSelectAll });
  if (opts.onFind) findGroup.push({ label: '&Find...', shortcut: 'Ctrl+F', onClick: opts.onFind });

  const groups = [undoGroup, clipboardGroup, findGroup].filter((g) => g.length > 0);
  const items: MenuItem[] = [];
  groups.forEach((group, i) => {
    if (i > 0) items.push(SEP);
    items.push(...group);
  });

  return { label: '&Edit', items };
}

/**
 * Build the standard Win98 Help menu. 'Help Topics' is disabled without a
 * handler; 'About <appName>...' fires the global 'win98-about-dialog' event.
 */
export function standardHelpMenu(appName: string, opts?: { onHelpTopics?: () => void }): MenuDefinition {
  return {
    label: '&Help',
    items: [
      { label: 'Help &Topics', onClick: opts?.onHelpTopics, disabled: !opts?.onHelpTopics },
      SEP,
      {
        label: `&About ${appName}...`,
        onClick: () => {
          window.dispatchEvent(new CustomEvent('win98-about-dialog', { detail: { appName } }));
        },
      },
    ],
  };
}
