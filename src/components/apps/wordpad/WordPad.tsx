'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { Dialog98 } from '@/components/ui/Dialog98';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { playSound } from '@/lib/sounds';
import { normalizePath } from '@/lib/fs/fsOperations';
import { FilePickerDialog } from '../notepad/FilePickerDialog';
import { usePrint } from '@/components/dialogs/PrintDialog';

const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Comic Sans MS', 'Georgia', 'Tahoma'];
const sizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'Document';
}

function execCommandSafe(command: string, value?: string): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;
  try {
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
}

function queryStateSafe(command: string): boolean {
  if (typeof document === 'undefined' || typeof document.queryCommandState !== 'function') return false;
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

function ToolbarBtn({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-[24px] h-[22px] flex items-center justify-center cursor-default select-none text-[12px] border border-solid border-transparent hover:border-t-[var(--win98-button-highlight)] hover:border-l-[var(--win98-button-highlight)] hover:border-b-[var(--win98-button-dark-shadow)] hover:border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]"
    >
      {children}
    </button>
  );
}

function FormatBtn({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-[24px] h-[22px] flex items-center justify-center cursor-default select-none text-[12px] border border-solid ${
        active
          ? 'border-t-[var(--win98-button-dark-shadow)] border-l-[var(--win98-button-dark-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] bg-[var(--win98-button-shadow)]/20'
          : 'border-transparent hover:border-t-[var(--win98-button-highlight)] hover:border-l-[var(--win98-button-highlight)] hover:border-b-[var(--win98-button-dark-shadow)] hover:border-r-[var(--win98-button-dark-shadow)]'
      }`}
    >
      {children}
    </button>
  );
}

export default function WordPad({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle, closeWindow } = useWindows();
  const { getNode, writeFile } = useFileSystem();
  const { openPrint, printDialog } = usePrint(windowId, 'WordPad');

  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState('10');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('Document');
  const [picker, setPicker] = useState<null | 'open' | 'save'>(null);
  const [showAbout, setShowAbout] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    updateTitle(windowId, `${fileName} - WordPad`);
  }, [fileName, windowId, updateTitle]);

  const focusEditor = useCallback(() => editorRef.current?.focus(), []);

  const runCommand = useCallback((command: string, value?: string) => {
    execCommandSafe(command, value);
    focusEditor();
  }, [focusEditor]);

  const syncFormatState = useCallback(() => {
    setBold(queryStateSafe('bold'));
    setItalic(queryStateSafe('italic'));
    setUnderline(queryStateSafe('underline'));
  }, []);

  const loadPath = useCallback((rawPath: string) => {
    const path = normalizePath(rawPath);
    const node = getNode(path);
    if (!node || node.type !== 'file') {
      showSystemError('WordPad', `Cannot find the ${baseName(path)} file.`);
      return;
    }
    if (editorRef.current) editorRef.current.innerHTML = node.content ?? '';
    setFilePath(path);
    setFileName(baseName(path));
    addRecentDoc(path);
  }, [getNode]);

  useEffect(() => {
    if (launchParams?.filePath) loadPath(launchParams.filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  const doSave = useCallback((path: string) => {
    const html = editorRef.current?.innerHTML ?? '';
    const result = writeFile(path, html);
    if (!result.ok) {
      showSystemError('WordPad', result.error);
      return;
    }
    setFilePath(path);
    setFileName(baseName(path));
    addRecentDoc(path);
    playSound('ding');
  }, [writeFile]);

  const handleSave = useCallback(() => {
    if (filePath) doSave(filePath);
    else setPicker('save');
  }, [filePath, doSave]);

  const handleNew = useCallback(() => {
    if (editorRef.current) editorRef.current.innerHTML = '';
    setFilePath(null);
    setFileName('Document');
  }, []);

  const handlePrint = useCallback(() => {
    openPrint(() => ({ kind: 'html', html: editorRef.current?.innerHTML ?? '' }), fileName);
  }, [openPrint, fileName]);

  const menus: MenuDefinition[] = [
    {
      label: 'File',
      items: [
        { label: 'New', shortcut: 'Ctrl+N', onClick: handleNew },
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: () => setPicker('open') },
        { label: 'Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save As...', onClick: () => setPicker('save') },
        { label: '', separator: true },
        { label: 'Print...', shortcut: 'Ctrl+P', onClick: handlePrint },
        { label: 'Print Preview', disabled: true },
        { label: 'Page Setup...', disabled: true },
        { label: '', separator: true },
        { label: 'Exit', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', onClick: () => runCommand('undo') },
        { label: 'Redo', shortcut: 'Ctrl+Y', onClick: () => runCommand('redo') },
        { label: '', separator: true },
        { label: 'Cut', shortcut: 'Ctrl+X', onClick: () => runCommand('cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', onClick: () => runCommand('copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', onClick: () => runCommand('paste') },
        { label: '', separator: true },
        { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => runCommand('selectAll') },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Toolbar', checked: true, disabled: true },
        { label: 'Format Bar', checked: true, disabled: true },
        { label: 'Ruler', checked: true, disabled: true },
        { label: 'Status Bar', checked: true, disabled: true },
      ],
    },
    {
      label: 'Insert',
      items: [
        { label: 'Date and Time...', onClick: () => runCommand('insertText', new Date().toLocaleString('en-US')) },
        { label: 'Object...', disabled: true },
      ],
    },
    {
      label: 'Format',
      items: [
        { label: 'Bold', onClick: () => { runCommand('bold'); syncFormatState(); } },
        { label: 'Italic', onClick: () => { runCommand('italic'); syncFormatState(); } },
        { label: 'Underline', onClick: () => { runCommand('underline'); syncFormatState(); } },
        { label: '', separator: true },
        { label: 'Bullet Style', onClick: () => runCommand('insertUnorderedList') },
        { label: 'Font...', disabled: true },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About WordPad', onClick: () => setShowAbout(true) }],
    },
  ];

  return (
    <div className="relative flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <MenuBar menus={menus} />

      {/* Toolbar row 1 */}
      <div className="flex items-center gap-1 px-1 py-[2px] border-b border-[var(--win98-button-shadow)]">
        <ToolbarBtn title="New" onClick={handleNew}>📄</ToolbarBtn>
        <ToolbarBtn title="Open" onClick={() => setPicker('open')}>📂</ToolbarBtn>
        <ToolbarBtn title="Save" onClick={handleSave}>💾</ToolbarBtn>
        <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
        <ToolbarBtn title="Cut" onClick={() => runCommand('cut')}>✂️</ToolbarBtn>
        <ToolbarBtn title="Copy" onClick={() => runCommand('copy')}>📋</ToolbarBtn>
        <ToolbarBtn title="Paste" onClick={() => runCommand('paste')}>📄</ToolbarBtn>
        <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
        <ToolbarBtn title="Undo" onClick={() => runCommand('undo')}>↩️</ToolbarBtn>
        <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
        <ToolbarBtn title="Find" onClick={() => runCommand('selectAll')}>🔍</ToolbarBtn>
        <ToolbarBtn title="Print" onClick={handlePrint}>🖨️</ToolbarBtn>
      </div>

      {/* Toolbar row 2 - formatting */}
      <div className="flex items-center gap-1 px-1 py-[2px] border-b border-[var(--win98-button-shadow)]">
        <select
          value={font}
          onChange={(e) => { setFont(e.target.value); runCommand('fontName', e.target.value); }}
          className="h-[20px] text-[11px] border border-solid border-[var(--win98-button-shadow)] bg-white px-1 w-[130px] font-[family-name:var(--win98-font)]"
        >
          {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={fontSize}
          onChange={(e) => { setFontSize(e.target.value); runCommand('fontSize', e.target.value); }}
          className="h-[20px] text-[11px] border border-solid border-[var(--win98-button-shadow)] bg-white px-1 w-[45px] font-[family-name:var(--win98-font)]"
        >
          {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
        <FormatBtn onClick={() => { runCommand('bold'); syncFormatState(); }} active={bold}><span className="font-bold">B</span></FormatBtn>
        <FormatBtn onClick={() => { runCommand('italic'); syncFormatState(); }} active={italic}><span className="italic">I</span></FormatBtn>
        <FormatBtn onClick={() => { runCommand('underline'); syncFormatState(); }} active={underline}><span className="underline">U</span></FormatBtn>
        <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
        <FormatBtn onClick={() => runCommand('justifyLeft')}><span className="text-[9px]">≡</span></FormatBtn>
        <FormatBtn onClick={() => runCommand('justifyCenter')}><span className="text-[9px]">☰</span></FormatBtn>
        <FormatBtn onClick={() => runCommand('justifyRight')}><span className="text-[9px]">≡</span></FormatBtn>
        <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
        <FormatBtn onClick={() => runCommand('insertUnorderedList')}>•≡</FormatBtn>
      </div>

      {/* Ruler */}
      <div className="h-[20px] bg-white border-b border-[var(--win98-button-shadow)] flex items-end px-[60px] relative">
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} className="flex-1 border-l border-gray-400 h-[10px] relative">
            <span className="absolute -top-[2px] left-0 text-[8px] text-gray-500 -translate-x-1/2">{i > 0 ? i : ''}</span>
          </div>
        ))}
        <div className="absolute left-[56px] bottom-0 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-gray-600" />
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-auto bg-white p-1 min-h-0">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onMouseUp={syncFormatState}
          onKeyUp={syncFormatState}
          className="min-h-full p-2 outline-none text-[11px] font-[family-name:var(--win98-font)]"
          style={{ fontFamily: font }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center px-2 py-[2px] border-t border-[var(--win98-button-highlight)]">
        <div className="flex-1 border border-solid border-[var(--win98-button-shadow)] px-1 text-[10px]">For Help, press F1</div>
      </div>

      {picker && (
        <FilePickerDialog
          mode={picker}
          extensions={['rtf', 'doc']}
          defaultName={picker === 'save' ? (fileName.includes('.') ? fileName : `${fileName}.rtf`) : ''}
          onCancel={() => setPicker(null)}
          onConfirm={(path) => {
            const target = picker;
            setPicker(null);
            if (target === 'open') loadPath(path);
            else doSave(path);
          }}
        />
      )}

      {showAbout && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
          <Dialog98
            title="About WordPad"
            icon="info"
            message={
              <div className="space-y-1">
                <p className="font-bold">Microsoft WordPad</p>
                <p>Version 4.10.1998</p>
                <p>Copyright (C) 1981-1998 Microsoft Corp.</p>
              </div>
            }
            buttons={[{ label: 'OK', default: true, onClick: () => setShowAbout(false) }]}
          />
        </div>
      )}

      {printDialog}
    </div>
  );
}
