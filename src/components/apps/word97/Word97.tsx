'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useSettings } from '@/contexts/SettingsContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { Dialog98 } from '@/components/ui/Dialog98';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { playSound } from '@/lib/sounds';
import { normalizePath } from '@/lib/fs/fsOperations';
import { FilePickerDialog } from '../notepad/FilePickerDialog';

const FONT_NAMES = ['Times New Roman', 'Arial', 'Courier New', 'Comic Sans MS', 'Verdana', 'Georgia', 'Impact'];
const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];

const CLIPPY_TIPS = [
  "It looks like you're writing a letter. Would you like help?",
  "Would you like me to help you format this document?",
  "It looks like you're trying to write something. Need a hand?",
  "Did you know? You can save your work with Ctrl+S. (Results may vary.)",
  "That's a lot of typing! Would you like me to summarize it? (I can't, but I'll offer.)",
  "It looks like you're writing a resume. Good luck out there!",
  "Psst... the printer still isn't installed. Just so you know.",
];

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'Document1';
}

function execCommandSafe(command: string, value?: string): void {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return;
  try {
    document.execCommand(command, false, value);
  } catch {
    // jsdom / unsupported — ignore
  }
}

function ToolbarButton({ label, bold, active, onClick, title }: { label: string; bold?: boolean; active?: boolean; onClick?: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-[23px] h-[22px] flex items-center justify-center text-[11px] ${bold ? 'font-bold' : ''} ${
        active ? 'win98-flat-sunken bg-[var(--win98-button-face)]' : 'border border-transparent hover:win98-flat-raised'
      }`}
    >
      {label}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />;
}

export default function Word97({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle, closeWindow } = useWindows();
  const { getNode, writeFile } = useFileSystem();
  const { getAppPref, setAppPref } = useSettings();

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [selectedFont, setSelectedFont] = useState('Times New Roman');
  const [selectedSize, setSelectedSize] = useState('12');
  const [showClippy, setShowClippy] = useState(false);
  const [clippyMessage, setClippyMessage] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('Document1');
  const [picker, setPicker] = useState<null | 'open' | 'save'>(null);
  const [showAbout, setShowAbout] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const clippyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clippyIndex = useRef(0);

  useEffect(() => {
    updateTitle(windowId, `${fileName} - Microsoft Word`);
  }, [fileName, windowId, updateTitle]);

  const hasCrashed = useCallback(() => getAppPref('word97', 'hasCrashed', false), [getAppPref]);

  const triggerBSOD = useCallback(() => {
    setAppPref('word97', 'hasCrashed', true);
    window.dispatchEvent(new CustomEvent('win98-bsod', {
      detail: { message: 'WORD caused a general protection fault in module WINWORD.EXE at 0001:00004A3F' },
    }));
  }, [setAppPref]);

  const showClippyTip = useCallback((message?: string) => {
    if (message) {
      setClippyMessage(message);
    } else {
      setClippyMessage(CLIPPY_TIPS[clippyIndex.current % CLIPPY_TIPS.length]);
      clippyIndex.current += 1;
    }
    setShowClippy(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => showClippyTip(CLIPPY_TIPS[0]), 10000);
    return () => clearTimeout(t);
  }, [showClippyTip]);

  const recomputeWordCount = useCallback(() => {
    const text = editorRef.current?.textContent ?? '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
  }, []);

  const onEditorInput = useCallback(() => {
    recomputeWordCount();
    if (clippyTimer.current) clearTimeout(clippyTimer.current);
    clippyTimer.current = setTimeout(() => {
      if ((editorRef.current?.textContent ?? '').trim().length > 0) showClippyTip();
    }, 4000);
  }, [recomputeWordCount, showClippyTip]);

  useEffect(() => () => { if (clippyTimer.current) clearTimeout(clippyTimer.current); }, []);

  const dismissClippy = useCallback(() => {
    setShowClippy(false);
    if (clippyTimer.current) clearTimeout(clippyTimer.current);
    clippyTimer.current = setTimeout(() => showClippyTip(), 20000);
  }, [showClippyTip]);

  const runCommand = useCallback((command: string, value?: string) => {
    execCommandSafe(command, value);
    editorRef.current?.focus();
  }, []);

  const loadPath = useCallback((rawPath: string) => {
    const path = normalizePath(rawPath);
    const node = getNode(path);
    if (!node || node.type !== 'file') {
      showSystemError('Microsoft Word', `Cannot find the ${baseName(path)} file.`);
      return;
    }
    if (editorRef.current) editorRef.current.innerHTML = node.content ?? '';
    setFilePath(path);
    setFileName(baseName(path));
    addRecentDoc(path);
    recomputeWordCount();
  }, [getNode, recomputeWordCount]);

  useEffect(() => {
    if (launchParams?.filePath) loadPath(launchParams.filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  const doSave = useCallback((path: string) => {
    const html = editorRef.current?.innerHTML ?? '';
    const result = writeFile(path, html);
    if (!result.ok) {
      showSystemError('Microsoft Word', result.error);
      return;
    }
    setFilePath(path);
    setFileName(baseName(path));
    addRecentDoc(path);
    playSound('ding');
  }, [writeFile]);

  const handleSave = useCallback(() => {
    // The gag: the very first save ever crashes Word. After the "reboot",
    // saving works normally to the file system.
    if (!hasCrashed()) {
      triggerBSOD();
      return;
    }
    if (filePath) doSave(filePath);
    else setPicker('save');
  }, [filePath, doSave, triggerBSOD, hasCrashed]);

  const menus: MenuDefinition[] = [
    {
      label: 'File',
      items: [
        { label: 'New...', shortcut: 'Ctrl+N', onClick: () => { if (editorRef.current) editorRef.current.innerHTML = ''; setFilePath(null); setFileName('Document1'); recomputeWordCount(); } },
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: () => setPicker('open') },
        { label: 'Close', onClick: () => closeWindow(windowId) },
        { label: '', separator: true },
        { label: 'Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save As...', onClick: () => { if (!hasCrashed()) { triggerBSOD(); return; } setPicker('save'); } },
        { label: '', separator: true },
        { label: 'Print...', shortcut: 'Ctrl+P', onClick: () => showSystemError('Microsoft Word', 'There are no printers installed. To install a printer, use the Add Printer wizard in the Printers folder.') },
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
        { label: 'Normal', checked: true, disabled: true },
        { label: 'Page Layout', disabled: true },
        { label: 'Outline', disabled: true },
        { label: '', separator: true },
        { label: 'Toolbars', checked: true, disabled: true },
        { label: 'Ruler', checked: true, disabled: true },
      ],
    },
    {
      label: 'Insert',
      items: [
        { label: 'Date and Time...', onClick: () => runCommand('insertText', new Date().toLocaleString('en-US')) },
        { label: 'Page Break', onClick: () => runCommand('insertHorizontalRule') },
        { label: 'Symbol...', disabled: true },
        { label: 'Picture', onClick: () => showSystemError('Microsoft Word', 'The Clip Gallery is not available. Please insert the Office 97 CD-ROM.') },
      ],
    },
    {
      label: 'Format',
      items: [
        { label: 'Bold', onClick: () => { runCommand('bold'); setIsBold((b) => !b); } },
        { label: 'Italic', onClick: () => { runCommand('italic'); setIsItalic((i) => !i); } },
        { label: 'Underline', onClick: () => { runCommand('underline'); setIsUnderline((u) => !u); } },
        { label: '', separator: true },
        { label: 'Bullets and Numbering', onClick: () => runCommand('insertUnorderedList') },
        { label: 'Font...', disabled: true },
        { label: 'Paragraph...', disabled: true },
      ],
    },
    {
      label: 'Tools',
      items: [
        { label: 'Spelling and Grammar...', onClick: () => showSystemError('Spelling and Grammar', 'The spelling check is complete. Actually, it never started. This feature is unavailable.') },
        { label: 'Word Count...', onClick: () => { recomputeWordCount(); showSystemError('Word Count', `Words: ${wordCount}\nCharacters: ${editorRef.current?.textContent?.length ?? 0}`); } },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Microsoft Word Help', onClick: () => showClippyTip('Hi! I am the Office Assistant. It looks like you need help!') },
        { label: 'About Microsoft Word', onClick: () => setShowAbout(true) },
      ],
    },
  ];

  return (
    <div className="relative flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none" data-window-id={windowId}>
      <MenuBar menus={menus} />

      {/* Toolbar Row 1 */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <ToolbarButton label="📄" title="New" onClick={() => { if (editorRef.current) editorRef.current.innerHTML = ''; setFilePath(null); setFileName('Document1'); recomputeWordCount(); }} />
        <ToolbarButton label="📂" title="Open" onClick={() => setPicker('open')} />
        <ToolbarButton label="💾" title="Save" onClick={handleSave} />
        <ToolbarSeparator />
        <ToolbarButton label="✂" title="Cut" onClick={() => runCommand('cut')} />
        <ToolbarButton label="📋" title="Copy" onClick={() => runCommand('copy')} />
        <ToolbarButton label="📎" title="Paste" onClick={() => runCommand('paste')} />
        <ToolbarSeparator />
        <ToolbarButton label="↩" title="Undo" onClick={() => runCommand('undo')} />
        <ToolbarButton label="↪" title="Redo" onClick={() => runCommand('redo')} />
        <ToolbarSeparator />
        <ToolbarButton label="🔍" title="Print (unavailable)" onClick={() => showSystemError('Microsoft Word', 'There are no printers installed.')} />
      </div>

      {/* Toolbar Row 2 - Formatting */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <select
          className="h-[20px] win98-sunken bg-white text-[11px] w-[140px] px-1"
          value={selectedFont}
          onChange={(e) => { setSelectedFont(e.target.value); runCommand('fontName', e.target.value); }}
        >
          {FONT_NAMES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          className="h-[20px] win98-sunken bg-white text-[11px] w-[40px] px-1 ml-1"
          value={selectedSize}
          onChange={(e) => { setSelectedSize(e.target.value); runCommand('fontSize', e.target.value); }}
        >
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <ToolbarSeparator />

        <ToolbarButton label="B" bold active={isBold} onClick={() => { setIsBold(!isBold); runCommand('bold'); }} />
        <ToolbarButton label="I" active={isItalic} onClick={() => { setIsItalic(!isItalic); runCommand('italic'); }} />
        <ToolbarButton label="U" active={isUnderline} onClick={() => { setIsUnderline(!isUnderline); runCommand('underline'); }} />

        <ToolbarSeparator />

        <ToolbarButton label="≡" active={alignment === 'left'} onClick={() => { setAlignment('left'); runCommand('justifyLeft'); }} />
        <ToolbarButton label="≡" active={alignment === 'center'} onClick={() => { setAlignment('center'); runCommand('justifyCenter'); }} />
        <ToolbarButton label="≡" active={alignment === 'right'} onClick={() => { setAlignment('right'); runCommand('justifyRight'); }} />

        <ToolbarSeparator />

        <ToolbarButton label="•" onClick={() => runCommand('insertUnorderedList')} />
        <ToolbarButton label="1." onClick={() => runCommand('insertOrderedList')} />
      </div>

      {/* Ruler */}
      <div className="h-[20px] bg-white flex items-end px-[72px] border-b border-[var(--win98-button-shadow)] relative">
        <div className="absolute left-0 top-0 bottom-0 w-[72px] bg-[var(--win98-button-face)]" />
        <div className="absolute right-0 top-0 bottom-0 w-[72px] bg-[var(--win98-button-face)]" />
        <div className="flex-1 relative h-full">
          {Array.from({ length: 17 }, (_, i) => (
            <div key={i} className="absolute bottom-0 text-[8px] text-[var(--win98-button-shadow)]" style={{ left: `${(i / 16) * 100}%` }}>
              <div className="h-[6px] w-px bg-[var(--win98-button-shadow)]" />
              {i % 2 === 0 && <span className="absolute -left-1 -top-[10px] text-[7px]">{i / 2}</span>}
            </div>
          ))}
        </div>
        <div className="absolute left-[68px] top-[2px] w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-[var(--win98-button-shadow)]" />
        <div className="absolute right-[68px] top-[2px] w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-[var(--win98-button-shadow)]" />
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-auto bg-[#808080] p-4">
        <div className="bg-white mx-auto shadow-md" style={{ width: '100%', maxWidth: '600px', minHeight: '700px', padding: '72px' }}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={onEditorInput}
            className="outline-none min-h-[200px] text-black"
            style={{ fontFamily: selectedFont, fontSize: `${selectedSize}px`, lineHeight: '1.5' }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center h-[20px] px-1 border-t border-[var(--win98-button-highlight)]">
        <div className="flex-1 flex gap-2">
          <span className="win98-sunken px-2 py-0 flex-1">Page 1 &nbsp; Sec 1 &nbsp; 1/1</span>
          <span className="win98-sunken px-2 py-0 w-[110px]">Words: {wordCount}</span>
          <span className="win98-sunken px-2 py-0 w-[60px]">Ln 1</span>
          <span className="win98-sunken px-2 py-0 w-[60px]">Col 1</span>
        </div>
      </div>

      {/* Clippy */}
      {showClippy && (
        <div className="absolute bottom-[40px] right-[20px] z-50">
          <div className="relative">
            <div className="bg-[#FFFFCC] border border-black rounded-lg p-3 mb-2 max-w-[220px] text-[11px] shadow-md">
              <p>{clippyMessage}</p>
              <div className="flex flex-col gap-1 mt-2">
                <button className="win98-raised bg-[var(--win98-button-face)] px-3 py-0.5 text-[11px]" onClick={() => showClippyTip()}>
                  Give me another tip
                </button>
                <button className="win98-raised bg-[var(--win98-button-face)] px-3 py-0.5 text-[11px]" onClick={dismissClippy}>
                  Don&apos;t show me this tip again
                </button>
              </div>
              <div className="absolute -bottom-[8px] right-[20px] w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#FFFFCC]" />
            </div>
            <button className="text-[40px] text-center w-full cursor-pointer" onClick={() => showClippyTip()} aria-label="Office Assistant">📎</button>
          </div>
        </div>
      )}

      {picker && (
        <FilePickerDialog
          mode={picker}
          extensions={['doc', 'rtf']}
          defaultName={picker === 'save' ? (fileName.includes('.') ? fileName : `${fileName}.doc`) : ''}
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
            title="About Microsoft Word"
            icon="info"
            message={
              <div className="space-y-1">
                <p className="font-bold">Microsoft Word 97</p>
                <p>Copyright (C) 1983-1997 Microsoft Corp.</p>
              </div>
            }
            buttons={[{ label: 'OK', default: true, onClick: () => setShowAbout(false) }]}
          />
        </div>
      )}
    </div>
  );
}
