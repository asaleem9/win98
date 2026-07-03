'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Dialog98 } from '@/components/ui/Dialog98';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { playSound } from '@/lib/sounds';
import { normalizePath } from '@/lib/fs/fsOperations';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'Untitled';
}

export default function Notepad({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle, closeWindow } = useWindows();
  const { readFile, writeFile, getNode } = useFileSystem();

  const [content, setContent] = useState('');
  const [wordWrap, setWordWrap] = useState(true);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('Untitled');
  const [dirty, setDirty] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caret, setCaret] = useState({ line: 1, col: 1 });
  const [picker, setPicker] = useState<null | 'open' | 'save'>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState<null | 'new' | 'open' | 'exit'>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  const lineCount = content.split('\n').length;
  const charCount = content.length;

  // Reflect file name + dirty state in the window title.
  useEffect(() => {
    updateTitle(windowId, `${dirty ? '*' : ''}${fileName} - Notepad`);
  }, [fileName, dirty, windowId, updateTitle]);

  const loadPath = useCallback(
    (rawPath: string) => {
      const path = normalizePath(rawPath);
      const node = getNode(path);
      if (!node || node.type !== 'file') {
        showSystemError('Notepad', `Cannot find the ${baseName(path)} file.\n\nDo you want to create a new file?`);
        return;
      }
      undoStack.current = [];
      redoStack.current = [];
      setContent(node.content ?? readFile(path) ?? '');
      setFilePath(path);
      setFileName(baseName(path));
      setDirty(false);
      addRecentDoc(path);
    },
    [getNode, readFile],
  );

  // Honor launch params on mount and whenever the app is re-launched with a file.
  useEffect(() => {
    if (launchParams?.filePath) loadPath(launchParams.filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  const pushUndo = useCallback((prev: string) => {
    undoStack.current.push(prev);
    if (undoStack.current.length > 100) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const applyContentChange = useCallback(
    (next: string) => {
      setContent((prev) => {
        if (prev !== next) pushUndo(prev);
        return next;
      });
      setDirty(true);
    },
    [pushUndo],
  );

  const updateCaret = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = ta.value.slice(0, pos);
    const line = before.split('\n').length;
    const col = pos - before.lastIndexOf('\n');
    setCaret({ line, col });
  }, []);

  const doSave = useCallback(
    (path: string): boolean => {
      const result = writeFile(path, content);
      if (!result.ok) {
        showSystemError('Notepad', result.error);
        return false;
      }
      setFilePath(path);
      setFileName(baseName(path));
      setDirty(false);
      addRecentDoc(path);
      playSound('ding');
      return true;
    },
    [content, writeFile],
  );

  const handleSave = useCallback(() => {
    if (filePath) doSave(filePath);
    else setPicker('save');
  }, [filePath, doSave]);

  const resetToNew = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    setContent('');
    setFilePath(null);
    setFileName('Untitled');
    setDirty(false);
  }, []);

  const handleNew = useCallback(() => {
    if (dirty) { setConfirmDiscard('new'); return; }
    resetToNew();
  }, [dirty, resetToNew]);

  const handleOpen = useCallback(() => {
    if (dirty) { setConfirmDiscard('open'); return; }
    setPicker('open');
  }, [dirty]);

  const handleExit = useCallback(() => {
    if (dirty) { setConfirmDiscard('exit'); return; }
    closeWindow(windowId);
  }, [dirty, closeWindow, windowId]);

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    setContent((current) => {
      redoStack.current.push(current);
      return prev;
    });
    setDirty(true);
  }, []);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    setContent((current) => {
      undoStack.current.push(current);
      return next;
    });
    setDirty(true);
  }, []);

  const withSelection = useCallback((fn: (ta: HTMLTextAreaElement, start: number, end: number) => void) => {
    const ta = textareaRef.current;
    if (!ta) return;
    fn(ta, ta.selectionStart, ta.selectionEnd);
  }, []);

  const handleCut = useCallback(() => {
    withSelection((ta, start, end) => {
      if (start === end) return;
      const selected = ta.value.slice(start, end);
      if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(selected).catch(() => {});
      applyContentChange(ta.value.slice(0, start) + ta.value.slice(end));
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start, start); });
    });
  }, [withSelection, applyContentChange]);

  const handleCopy = useCallback(() => {
    withSelection((ta, start, end) => {
      if (start === end) return;
      const selected = ta.value.slice(start, end);
      if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(selected).catch(() => {});
    });
  }, [withSelection]);

  const handlePaste = useCallback(async () => {
    if (!navigator.clipboard?.readText) {
      showSystemError('Notepad', 'Clipboard access is not available.');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      withSelection((ta, start, end) => {
        applyContentChange(ta.value.slice(0, start) + text + ta.value.slice(end));
        const caretPos = start + text.length;
        requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(caretPos, caretPos); });
      });
    } catch {
      showSystemError('Notepad', 'Clipboard access is not available.');
    }
  }, [withSelection, applyContentChange]);

  const handleDelete = useCallback(() => {
    withSelection((ta, start, end) => {
      if (start === end) return;
      applyContentChange(ta.value.slice(0, start) + ta.value.slice(end));
    });
  }, [withSelection, applyContentChange]);

  const handleSelectAll = useCallback(() => {
    textareaRef.current?.select();
  }, []);

  const handleFind = useCallback(() => {
    if (!findText || !textareaRef.current) return;
    const ta = textareaRef.current;
    const from = ta.selectionEnd || 0;
    let start = ta.value.indexOf(findText, from);
    if (start === -1) start = ta.value.indexOf(findText, 0);
    if (start !== -1) {
      ta.focus();
      ta.setSelectionRange(start, start + findText.length);
      updateCaret();
    }
  }, [findText, updateCaret]);

  const handleReplace = useCallback(() => {
    if (!findText || !textareaRef.current) return;
    const ta = textareaRef.current;
    const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd);
    if (selected === findText) {
      const before = ta.value.substring(0, ta.selectionStart);
      const after = ta.value.substring(ta.selectionEnd);
      applyContentChange(before + replaceText + after);
    }
    handleFind();
  }, [findText, replaceText, handleFind, applyContentChange]);

  const handleReplaceAll = useCallback(() => {
    if (!findText) return;
    setContent((prev) => {
      const next = prev.split(findText).join(replaceText);
      if (next !== prev) pushUndo(prev);
      return next;
    });
    setDirty(true);
  }, [findText, replaceText, pushUndo]);

  const handleDateTime = useCallback(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US');
    const stamp = `${timeStr} ${dateStr}`;
    withSelection((ta, start, end) => {
      applyContentChange(ta.value.slice(0, start) + stamp + ta.value.slice(end));
    });
  }, [withSelection, applyContentChange]);

  const confirmDiscardProceed = useCallback(() => {
    const action = confirmDiscard;
    setConfirmDiscard(null);
    if (action === 'new') resetToNew();
    else if (action === 'open') setPicker('open');
    else if (action === 'exit') closeWindow(windowId);
  }, [confirmDiscard, resetToNew, closeWindow, windowId]);

  const menus: MenuDefinition[] = [
    {
      label: 'File',
      items: [
        { label: 'New', shortcut: 'Ctrl+N', onClick: handleNew },
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: handleOpen },
        { label: 'Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save As...', onClick: () => setPicker('save') },
        { label: '', separator: true },
        { label: 'Page Setup...', disabled: true },
        { label: 'Print...', shortcut: 'Ctrl+P', onClick: () => showSystemError('Notepad', 'There is no printer installed. To install a printer, point to Settings on the Start menu, and then click Printers.') },
        { label: '', separator: true },
        { label: 'Exit', onClick: handleExit },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', onClick: handleUndo, disabled: undoStack.current.length === 0 },
        { label: 'Redo', shortcut: 'Ctrl+Y', onClick: handleRedo, disabled: redoStack.current.length === 0 },
        { label: '', separator: true },
        { label: 'Cut', shortcut: 'Ctrl+X', onClick: handleCut },
        { label: 'Copy', shortcut: 'Ctrl+C', onClick: handleCopy },
        { label: 'Paste', shortcut: 'Ctrl+V', onClick: () => void handlePaste() },
        { label: 'Delete', shortcut: 'Del', onClick: handleDelete },
        { label: '', separator: true },
        { label: 'Select All', shortcut: 'Ctrl+A', onClick: handleSelectAll },
        { label: 'Time/Date', shortcut: 'F5', onClick: handleDateTime },
      ],
    },
    {
      label: 'Search',
      items: [
        { label: 'Find...', shortcut: 'Ctrl+F', onClick: () => setShowFind(true) },
        { label: 'Find Next', shortcut: 'F3', onClick: handleFind },
        { label: 'Replace...', shortcut: 'Ctrl+H', onClick: () => setShowFind(true) },
      ],
    },
    {
      label: 'Format',
      items: [
        { label: 'Word Wrap', checked: wordWrap, onClick: () => setWordWrap((w) => !w) },
        { label: 'Font...', disabled: true },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About Notepad', onClick: () => setShowAbout(true) }],
    },
  ];

  const inputBorder =
    'border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]';
  const findBtn =
    'px-2 h-[18px] text-[11px] bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)] cursor-default';

  return (
    <div className="relative flex flex-col h-full bg-[var(--win98-button-face)]">
      <MenuBar menus={menus} />

      {showFind && (
        <div className="flex items-center gap-1 px-2 py-1 bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] font-[family-name:var(--win98-font)] text-[11px]">
          <label className="select-none">Find:</label>
          <input className={`w-[120px] h-[18px] px-1 text-[11px] ${inputBorder}`} value={findText} onChange={(e) => setFindText(e.target.value)} />
          <label className="select-none ml-1">Replace:</label>
          <input className={`w-[120px] h-[18px] px-1 text-[11px] ${inputBorder}`} value={replaceText} onChange={(e) => setReplaceText(e.target.value)} />
          <button className={findBtn} onClick={handleFind}>Find</button>
          <button className={findBtn} onClick={handleReplace}>Replace</button>
          <button className={findBtn} onClick={handleReplaceAll}>All</button>
          <button className={findBtn} onClick={() => setShowFind(false)}>Close</button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => applyContentChange(e.target.value)}
          onSelect={updateCaret}
          onClick={updateCaret}
          onKeyUp={updateCaret}
          className="w-full h-full resize-none p-1 bg-white text-black font-[family-name:var(--win98-font-mono)] text-[13px] leading-[16px] border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] shadow-[inset_-1px_-1px_0_var(--win98-button-light),inset_1px_1px_0_var(--win98-button-dark-shadow)] outline-none focus:outline-none"
          style={{ whiteSpace: wordWrap ? 'pre-wrap' : 'pre', overflowWrap: wordWrap ? 'break-word' : 'normal' }}
          spellCheck={false}
        />
      </div>

      <StatusBar98
        panels={[
          { content: '' },
          { content: `Ln ${caret.line}, Col ${caret.col}`, width: 110 },
          { content: `${charCount} chars, ${lineCount} lines`, width: 140 },
        ]}
      />

      {picker && (
        <FilePickerDialog
          mode={picker}
          extensions={['txt', 'log', 'ini', 'bat', 'sys']}
          defaultName={picker === 'save' ? fileName : ''}
          onCancel={() => setPicker(null)}
          onConfirm={(path) => {
            const target = picker;
            setPicker(null);
            if (target === 'open') loadPath(path);
            else doSave(path);
          }}
        />
      )}

      {confirmDiscard && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
          <Dialog98
            title="Notepad"
            icon="warning"
            message={<span>The text in the {fileName} file has changed.<br />Do you want to save the changes?</span>}
            buttons={[
              {
                label: 'Yes',
                default: true,
                onClick: () => {
                  const action = confirmDiscard;
                  setConfirmDiscard(null);
                  if (filePath) {
                    if (doSave(filePath)) {
                      if (action === 'new') resetToNew();
                      else if (action === 'open') setPicker('open');
                      else if (action === 'exit') closeWindow(windowId);
                    }
                  } else {
                    setPicker('save');
                  }
                },
              },
              { label: 'No', onClick: confirmDiscardProceed },
              { label: 'Cancel', onClick: () => setConfirmDiscard(null) },
            ]}
          />
        </div>
      )}

      {showAbout && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
          <Dialog98
            title="About Notepad"
            icon="info"
            message={
              <div className="space-y-1">
                <p className="font-bold">Notepad</p>
                <p>Microsoft (R) Windows 98</p>
                <p>Version 4.10.1998</p>
                <p>Copyright (C) 1981-1998 Microsoft Corp.</p>
              </div>
            }
            buttons={[{ label: 'OK', default: true, onClick: () => setShowAbout(false) }]}
          />
        </div>
      )}
    </div>
  );
}
