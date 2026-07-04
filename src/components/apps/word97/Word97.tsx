'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useSettings } from '@/contexts/SettingsContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { Dialog98 } from '@/components/ui/Dialog98';
import { Button98 } from '@/components/ui/Button98';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { playSound } from '@/lib/sounds';
import { normalizePath } from '@/lib/fs/fsOperations';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { usePrint } from '@/components/dialogs/PrintDialog';
import { documentStats, DocStats } from './text';
import {
  detectClippyTrigger,
  CLIPPY_OFFERS,
  LETTER_TEMPLATE_HTML,
  ClippyOffer,
  ClippyButtonId,
  ClippyTriggerId,
} from './clippy';
import {
  findMisspellings,
  Misspelling,
  matchCase,
  replaceRangeInEditor,
  replaceAllInEditor,
  applySquiggles,
  stripSquiggles,
  cleanHtml,
} from './spellcheck';

const FONT_NAMES = ['Times New Roman', 'Arial', 'Courier New', 'Comic Sans MS', 'Verdana', 'Georgia', 'Impact'];
const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];

type Alignment = 'left' | 'center' | 'right' | 'justify';

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

function queryStateSafe(command: string): boolean {
  if (typeof document === 'undefined' || typeof document.queryCommandState !== 'function') return false;
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

function queryValueSafe(command: string): string {
  if (typeof document === 'undefined' || typeof document.queryCommandValue !== 'function') return '';
  try {
    return document.queryCommandValue(command) || '';
  } catch {
    return '';
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
  const { openPrint, printDialog } = usePrint(windowId, 'Microsoft Word');

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [alignment, setAlignment] = useState<Alignment>('left');
  const [selectedFont, setSelectedFont] = useState('Times New Roman');
  const [selectedSize, setSelectedSize] = useState('12');
  const [wordCount, setWordCount] = useState(0);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('Document1');
  const [dirty, setDirty] = useState(false);
  const [picker, setPicker] = useState<null | 'open' | 'save'>(null);
  const [showAbout, setShowAbout] = useState(false);

  // Office Assistant
  const [showClippy, setShowClippy] = useState(false);
  const [clippyOffer, setClippyOffer] = useState<ClippyOffer | null>(null);

  // Word Count dialog
  const [countStats, setCountStats] = useState<DocStats | null>(null);

  // Spelling dialog
  const [spellOpen, setSpellOpen] = useState(false);
  const [spellCurrent, setSpellCurrent] = useState<Misspelling | null>(null);
  const [spellComplete, setSpellComplete] = useState(false);
  const [spellChoice, setSpellChoice] = useState('');

  const editorRef = useRef<HTMLDivElement>(null);
  const clippyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedClippy = useRef<Set<ClippyTriggerId>>(new Set());
  const spellIgnored = useRef<Set<string>>(new Set());
  const spellCursor = useRef(0);

  useEffect(() => {
    updateTitle(windowId, `${dirty ? '*' : ''}${fileName} - Microsoft Word`);
  }, [fileName, dirty, windowId, updateTitle]);

  // --- the save gag (unchanged): the very first save ever crashes Word -------

  const hasCrashed = useCallback(() => getAppPref('word97', 'hasCrashed', false), [getAppPref]);

  const triggerBSOD = useCallback(() => {
    setAppPref('word97', 'hasCrashed', true);
    window.dispatchEvent(new CustomEvent('win98-bsod', {
      detail: { message: 'WORD caused a general protection fault in module WINWORD.EXE at 0001:00004A3F' },
    }));
  }, [setAppPref]);

  // --- editor plumbing -------------------------------------------------------

  const recomputeWordCount = useCallback(() => {
    setWordCount(documentStats(editorRef.current?.textContent ?? '').words);
  }, []);

  const scheduleClippy = useCallback(() => {
    if (clippyTimer.current) clearTimeout(clippyTimer.current);
    clippyTimer.current = setTimeout(() => {
      const text = editorRef.current?.textContent ?? '';
      const id = detectClippyTrigger(text, firedClippy.current);
      if (id) {
        firedClippy.current.add(id);
        setClippyOffer(CLIPPY_OFFERS[id]);
        setShowClippy(true);
      }
    }, 800);
  }, []);

  useEffect(() => () => { if (clippyTimer.current) clearTimeout(clippyTimer.current); }, []);

  const afterEdit = useCallback(() => {
    setDirty(true);
    recomputeWordCount();
    scheduleClippy();
  }, [recomputeWordCount, scheduleClippy]);

  const onEditorInput = useCallback(() => {
    afterEdit();
  }, [afterEdit]);

  const syncToolbar = useCallback(() => {
    setIsBold(queryStateSafe('bold'));
    setIsItalic(queryStateSafe('italic'));
    setIsUnderline(queryStateSafe('underline'));
    setAlignment(
      queryStateSafe('justifyCenter') ? 'center'
        : queryStateSafe('justifyRight') ? 'right'
          : queryStateSafe('justifyFull') ? 'justify'
            : 'left',
    );
    const fam = queryValueSafe('fontName').replace(/['"]/g, '');
    if (fam && FONT_NAMES.includes(fam)) setSelectedFont(fam);
  }, []);

  // Reflect the selection in the toolbar when the caret moves inside the editor.
  useEffect(() => {
    const handler = () => {
      const sel = typeof document !== 'undefined' ? document.getSelection() : null;
      if (sel?.anchorNode && editorRef.current?.contains(sel.anchorNode)) syncToolbar();
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [syncToolbar]);

  const focusEditor = useCallback(() => editorRef.current?.focus(), []);

  const runCommand = useCallback((command: string, value?: string) => {
    execCommandSafe(command, value);
    focusEditor();
    syncToolbar();
    afterEdit();
  }, [focusEditor, syncToolbar, afterEdit]);

  const applyFontName = useCallback((family: string) => {
    setSelectedFont(family);
    runCommand('fontName', family);
  }, [runCommand]);

  // execCommand('fontSize') is stuck on the 1-7 HTML scale, so tag the run with
  // size 7 and rewrite those <font> nodes to a real pixel size.
  const applyFontSize = useCallback((label: string) => {
    setSelectedSize(label);
    execCommandSafe('fontSize', '7');
    editorRef.current?.querySelectorAll('font[size="7"]').forEach((f) => {
      f.removeAttribute('size');
      (f as HTMLElement).style.fontSize = `${label}px`;
    });
    focusEditor();
    afterEdit();
  }, [focusEditor, afterEdit]);

  // --- file open / save ------------------------------------------------------

  const loadPath = useCallback((rawPath: string) => {
    const path = normalizePath(rawPath);
    const node = getNode(path);
    if (!node || node.type !== 'file') {
      showSystemError('Microsoft Word', `Cannot find the ${baseName(path)} file.`);
      return;
    }
    const content = node.content ?? '';
    const html = /<[a-z][\s\S]*>/i.test(content)
      ? content
      : content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    if (editorRef.current) editorRef.current.innerHTML = html;
    setFilePath(path);
    setFileName(baseName(path));
    setDirty(false);
    addRecentDoc(path);
    recomputeWordCount();
  }, [getNode, recomputeWordCount]);

  useEffect(() => {
    if (launchParams?.filePath) loadPath(launchParams.filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  const doSave = useCallback((path: string) => {
    const html = editorRef.current ? cleanHtml(editorRef.current) : '';
    const result = writeFile(path, html);
    if (!result.ok) {
      showSystemError('Microsoft Word', result.error);
      return;
    }
    setFilePath(path);
    setFileName(baseName(path));
    setDirty(false);
    addRecentDoc(path);
    playSound('ding');
  }, [writeFile]);

  const handleSave = useCallback(() => {
    if (!hasCrashed()) {
      triggerBSOD();
      return;
    }
    if (filePath) doSave(filePath);
    else setPicker('save');
  }, [filePath, doSave, triggerBSOD, hasCrashed]);

  const handleSaveAs = useCallback(() => {
    if (!hasCrashed()) {
      triggerBSOD();
      return;
    }
    setPicker('save');
  }, [triggerBSOD, hasCrashed]);

  const handleNew = useCallback(() => {
    if (editorRef.current) editorRef.current.innerHTML = '';
    setFilePath(null);
    setFileName('Document1');
    setDirty(false);
    firedClippy.current = new Set();
    recomputeWordCount();
  }, [recomputeWordCount]);

  const handlePrint = useCallback(() => {
    openPrint(() => ({ kind: 'html', html: editorRef.current ? cleanHtml(editorRef.current) : '' }), fileName);
  }, [openPrint, fileName]);

  // --- Office Assistant offers ----------------------------------------------

  const showAssistantMessage = useCallback((message: string) => {
    setClippyOffer({ id: 'clippy-ego', message, buttons: [{ id: 'dismiss', label: 'OK' }] });
    setShowClippy(true);
  }, []);

  const onClippyButton = useCallback((id: ClippyButtonId) => {
    if (id === 'insert-letter') {
      focusEditor();
      execCommandSafe('insertHTML', LETTER_TEMPLATE_HTML);
      afterEdit();
    }
    setShowClippy(false);
  }, [focusEditor, afterEdit]);

  // --- Word Count dialog -----------------------------------------------------

  const openWordCount = useCallback(() => {
    setCountStats(documentStats(editorRef.current?.textContent ?? ''));
  }, []);

  // --- Spelling dialog -------------------------------------------------------

  const advanceSpell = useCallback(() => {
    const text = editorRef.current?.textContent ?? '';
    const next = findMisspellings(text).find(
      (m) => m.index >= spellCursor.current && !spellIgnored.current.has(m.key),
    );
    if (!next) {
      setSpellCurrent(null);
      setSpellComplete(true);
    } else {
      setSpellCurrent(next);
      setSpellComplete(false);
      setSpellChoice(next.suggestions[0] ?? next.word);
    }
  }, []);

  const openSpelling = useCallback(() => {
    if (editorRef.current) stripSquiggles(editorRef.current);
    spellIgnored.current = new Set();
    spellCursor.current = 0;
    setSpellOpen(true);
    advanceSpell();
  }, [advanceSpell]);

  const closeSpelling = useCallback(() => {
    setSpellOpen(false);
    focusEditor();
  }, [focusEditor]);

  const spellChange = useCallback(() => {
    const root = editorRef.current;
    if (!root || !spellCurrent) return;
    const repl = matchCase(spellCurrent.word, spellChoice);
    replaceRangeInEditor(root, spellCurrent.index, spellCurrent.index + spellCurrent.word.length, repl);
    spellCursor.current = spellCurrent.index + repl.length;
    afterEdit();
    advanceSpell();
  }, [spellCurrent, spellChoice, afterEdit, advanceSpell]);

  const spellChangeAll = useCallback(() => {
    const root = editorRef.current;
    if (!root || !spellCurrent) return;
    replaceAllInEditor(root, spellCurrent.key, spellChoice);
    afterEdit();
    advanceSpell();
  }, [spellCurrent, spellChoice, afterEdit, advanceSpell]);

  const spellIgnoreAll = useCallback(() => {
    if (spellCurrent) spellIgnored.current.add(spellCurrent.key);
    advanceSpell();
  }, [spellCurrent, advanceSpell]);

  // --- squiggles: wrap on blur (caret parked), strip on focus ---------------
  // Live re-wrapping while typing would fight the contentEditable caret, so the
  // squiggles are refreshed only when the editor loses focus.

  const onEditorBlur = useCallback(() => {
    if (editorRef.current) applySquiggles(editorRef.current);
  }, []);

  const onEditorFocus = useCallback(() => {
    if (editorRef.current) stripSquiggles(editorRef.current);
  }, []);

  // --- keyboard shortcuts ----------------------------------------------------

  const onRootKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'F7') {
      e.preventDefault();
      openSpelling();
      return;
    }
    if (e.ctrlKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); handleSave(); }
      else if (k === 'o') { e.preventDefault(); setPicker('open'); }
      else if (k === 'n') { e.preventDefault(); handleNew(); }
      else if (k === 'p') { e.preventDefault(); handlePrint(); }
    }
  }, [openSpelling, handleSave, handleNew, handlePrint]);

  // --- menus -----------------------------------------------------------------

  const menus: MenuDefinition[] = [
    {
      label: '&File',
      items: [
        { label: '&New...', shortcut: 'Ctrl+N', onClick: handleNew },
        { label: '&Open...', shortcut: 'Ctrl+O', onClick: () => setPicker('open') },
        { label: '&Close', onClick: () => closeWindow(windowId) },
        { label: '', separator: true },
        { label: '&Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save &As...', onClick: handleSaveAs },
        { label: 'Save as &HTML...', disabled: true },
        { label: '', separator: true },
        { label: '&Print...', shortcut: 'Ctrl+P', onClick: handlePrint },
        { label: 'Print Pre&view', disabled: true },
        { label: 'Page Set&up...', disabled: true },
        { label: '', separator: true },
        { label: 'Propert&ies', disabled: true },
        { label: '', separator: true },
        { label: 'E&xit', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: '&Undo', shortcut: 'Ctrl+Z', onClick: () => runCommand('undo') },
        { label: '&Redo', shortcut: 'Ctrl+Y', onClick: () => runCommand('redo') },
        { label: '', separator: true },
        { label: 'Cu&t', shortcut: 'Ctrl+X', onClick: () => runCommand('cut') },
        { label: '&Copy', shortcut: 'Ctrl+C', onClick: () => runCommand('copy') },
        { label: '&Paste', shortcut: 'Ctrl+V', onClick: () => runCommand('paste') },
        { label: 'Paste &Special...', disabled: true },
        { label: 'Cle&ar', shortcut: 'Del', onClick: () => runCommand('delete') },
        { label: '', separator: true },
        { label: 'Select A&ll', shortcut: 'Ctrl+A', onClick: () => runCommand('selectAll') },
        { label: '', separator: true },
        { label: '&Find...', shortcut: 'Ctrl+F', disabled: true },
        { label: 'R&eplace...', shortcut: 'Ctrl+H', disabled: true },
        { label: '&Go To...', shortcut: 'Ctrl+G', disabled: true },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Normal', checked: true, radio: true, disabled: true },
        { label: 'Online &Layout', radio: true, disabled: true },
        { label: '&Page Layout', radio: true, disabled: true },
        { label: '&Outline', radio: true, disabled: true },
        { label: '', separator: true },
        { label: '&Toolbars', disabled: true },
        { label: '&Ruler', checked: true, disabled: true },
        { label: '', separator: true },
        { label: '&Header and Footer', disabled: true },
        { label: '&Zoom...', disabled: true },
      ],
    },
    {
      label: '&Insert',
      items: [
        { label: '&Break...', disabled: true },
        { label: 'Page N&umbers...', disabled: true },
        { label: 'Date and &Time...', onClick: () => runCommand('insertText', new Date().toLocaleString('en-US')) },
        { label: '', separator: true },
        { label: '&Symbol...', disabled: true },
        {
          label: '&Picture',
          submenu: [
            { label: '&Clip Art...', onClick: () => showSystemError('Microsoft Word', 'The Clip Gallery is not available. Please insert the Office 97 CD-ROM.') },
            { label: '&From File...', onClick: () => showSystemError('Microsoft Word', 'Please insert the Office 97 CD-ROM to install this feature.') },
          ],
        },
        { label: '&Object...', disabled: true },
        { label: 'Hyper&link...', shortcut: 'Ctrl+K', disabled: true },
      ],
    },
    {
      label: 'F&ormat',
      items: [
        { label: '&Font...', disabled: true },
        { label: '&Paragraph...', disabled: true },
        { label: '&Bullets and Numbering...', onClick: () => runCommand('insertUnorderedList') },
        { label: 'Borders and &Shading...', disabled: true },
        { label: '', separator: true },
        { label: 'Change Cas&e...', disabled: true },
        { label: '', separator: true },
        { label: '&Style...', disabled: true },
      ],
    },
    {
      label: '&Tools',
      items: [
        { label: '&Spelling and Grammar...', shortcut: 'F7', onClick: openSpelling },
        { label: '&Word Count...', onClick: openWordCount },
        { label: '', separator: true },
        { label: '&AutoCorrect...', disabled: true },
        { label: '&Macro', disabled: true },
        { label: '', separator: true },
        { label: '&Options...', disabled: true },
      ],
    },
    {
      label: 'T&able',
      items: [
        { label: '&Insert Table...', disabled: true },
        { label: '&Delete Cells...', disabled: true },
        { label: '&Merge Cells', disabled: true },
        { label: '&Split Cells...', disabled: true },
        { label: '', separator: true },
        { label: 'Select &Row', disabled: true },
        { label: 'Select &Column', disabled: true },
        { label: 'Select Ta&ble', disabled: true },
      ],
    },
    {
      label: '&Window',
      items: [
        { label: '&New Window', disabled: true },
        { label: '&Arrange All', disabled: true },
        { label: '&Split', disabled: true },
        { label: '', separator: true },
        { label: `&1 ${fileName}`, checked: true, radio: true, onClick: focusEditor },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: 'Microsoft Word &Help', shortcut: 'F1', onClick: () => showAssistantMessage("Hi! I'm the Office Assistant. It looks like you'd like some help. Type your question and I'll pretend to look it up.") },
        { label: '&Contents and Index', disabled: true },
        { label: '', separator: true },
        { label: '&About Microsoft Word', onClick: () => setShowAbout(true) },
      ],
    },
  ];

  const alignGlyph: Record<Alignment, string> = { left: '⯇', center: '≡', right: '⯈', justify: '☰' };

  return (
    <div
      className="relative flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none"
      data-window-id={windowId}
      onKeyDown={onRootKeyDown}
    >
      <MenuBar menus={menus} windowId={windowId} />

      {/* Toolbar Row 1 */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <ToolbarButton label="📄" title="New" onClick={handleNew} />
        <ToolbarButton label="📂" title="Open" onClick={() => setPicker('open')} />
        <ToolbarButton label="💾" title="Save" onClick={handleSave} />
        <ToolbarButton label="🖨" title="Print" onClick={handlePrint} />
        <ToolbarButton label="🔍" title="Spelling (F7)" onClick={openSpelling} />
        <ToolbarSeparator />
        <ToolbarButton label="✂" title="Cut" onClick={() => runCommand('cut')} />
        <ToolbarButton label="📋" title="Copy" onClick={() => runCommand('copy')} />
        <ToolbarButton label="📎" title="Paste" onClick={() => runCommand('paste')} />
        <ToolbarSeparator />
        <ToolbarButton label="↩" title="Undo" onClick={() => runCommand('undo')} />
        <ToolbarButton label="↪" title="Redo" onClick={() => runCommand('redo')} />
      </div>

      {/* Toolbar Row 2 - Formatting */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <select
          aria-label="Font"
          className="h-[20px] win98-sunken bg-white text-[11px] w-[140px] px-1"
          value={selectedFont}
          onChange={(e) => applyFontName(e.target.value)}
        >
          {FONT_NAMES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          aria-label="Font size"
          className="h-[20px] win98-sunken bg-white text-[11px] w-[44px] px-1 ml-1"
          value={selectedSize}
          onChange={(e) => applyFontSize(e.target.value)}
        >
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <ToolbarSeparator />

        <ToolbarButton label="B" bold active={isBold} title="Bold" onClick={() => runCommand('bold')} />
        <ToolbarButton label="I" active={isItalic} title="Italic" onClick={() => runCommand('italic')} />
        <ToolbarButton label="U" active={isUnderline} title="Underline" onClick={() => runCommand('underline')} />

        <ToolbarSeparator />

        <ToolbarButton label={alignGlyph.left} active={alignment === 'left'} title="Align Left" onClick={() => runCommand('justifyLeft')} />
        <ToolbarButton label={alignGlyph.center} active={alignment === 'center'} title="Center" onClick={() => runCommand('justifyCenter')} />
        <ToolbarButton label={alignGlyph.right} active={alignment === 'right'} title="Align Right" onClick={() => runCommand('justifyRight')} />
        <ToolbarButton label={alignGlyph.justify} active={alignment === 'justify'} title="Justify" onClick={() => runCommand('justifyFull')} />

        <ToolbarSeparator />

        <ToolbarButton label="•" title="Bullets" onClick={() => runCommand('insertUnorderedList')} />
        <ToolbarButton label="1." title="Numbering" onClick={() => runCommand('insertOrderedList')} />
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
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-auto bg-[#808080] p-4">
        <div className="bg-white mx-auto shadow-md" style={{ width: '100%', maxWidth: '600px', minHeight: '700px', padding: '72px' }}>
          <div
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            aria-label="Document"
            contentEditable
            suppressContentEditableWarning
            onInput={onEditorInput}
            onKeyUp={syncToolbar}
            onMouseUp={syncToolbar}
            onFocus={onEditorFocus}
            onBlur={onEditorBlur}
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

      {/* Office Assistant */}
      {showClippy && clippyOffer && (
        <div className="absolute bottom-[40px] right-[20px] z-50">
          <div className="relative">
            <div className="bg-[#FFFFCC] border border-black rounded-lg p-3 mb-2 max-w-[230px] text-[11px] shadow-md">
              <p>{clippyOffer.message}</p>
              <div className="flex flex-col gap-1 mt-2">
                {clippyOffer.buttons.map((b) => (
                  <button
                    key={b.id + b.label}
                    className="win98-raised bg-[var(--win98-button-face)] px-3 py-0.5 text-[11px] text-left"
                    onClick={() => onClippyButton(b.id)}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <div className="absolute -bottom-[8px] right-[20px] w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#FFFFCC]" />
            </div>
            <button className="text-[40px] text-center w-full cursor-pointer" onClick={() => setShowClippy(false)} aria-label="Office Assistant">📎</button>
          </div>
        </div>
      )}

      {/* File picker */}
      {picker && (
        <FilePickerDialog
          mode={picker}
          filters={[
            { label: 'Word Documents (*.doc)', extensions: ['doc'] },
            { label: 'Rich Text Format (*.rtf)', extensions: ['rtf'] },
            { label: 'All Files (*.*)', extensions: [] },
          ]}
          defaultExtension="doc"
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

      {/* Word Count dialog */}
      {countStats && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
          <Dialog98
            title="Word Count"
            message={
              <div className="w-[220px]">
                <table className="w-full">
                  <tbody>
                    <tr><td className="py-[1px]">Words</td><td className="text-right">{countStats.words}</td></tr>
                    <tr><td className="py-[1px]">Characters (with spaces)</td><td className="text-right">{countStats.characters}</td></tr>
                    <tr><td className="py-[1px]">Characters (no spaces)</td><td className="text-right">{countStats.charactersNoSpaces}</td></tr>
                    <tr><td className="py-[1px]">Paragraphs</td><td className="text-right">{countStats.paragraphs}</td></tr>
                  </tbody>
                </table>
              </div>
            }
            buttons={[{ label: 'Close', default: true, onClick: () => setCountStats(null) }]}
          />
        </div>
      )}

      {/* Spelling dialog */}
      {spellOpen && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
          <div className="w-[420px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]">
            <div className="flex items-center justify-between h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white font-bold select-none">
              <span>Spelling and Grammar: English (US)</span>
              <button className="w-[16px] h-[14px] flex items-center justify-center bg-[var(--win98-button-face)] text-black border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] text-[9px] leading-none" onClick={closeSpelling} aria-label="Close">✕</button>
            </div>

            {spellComplete || !spellCurrent ? (
              <div className="p-4 flex flex-col gap-4">
                <p>The spelling and grammar check is complete.</p>
                <div className="flex justify-center">
                  <Button98 className="min-w-[75px]" onClick={closeSpelling} autoFocus>OK</Button98>
                </div>
              </div>
            ) : (
              <div className="p-3 flex gap-2">
                <div className="flex-1 flex flex-col gap-2">
                  <div>
                    <div className="mb-1 font-bold">Not in Dictionary:</div>
                    <div className="win98-sunken bg-white p-1 h-[54px] overflow-auto leading-[15px]">
                      <SpellContext text={editorRef.current?.textContent ?? ''} target={spellCurrent} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1">Change To:</div>
                    <input
                      className="w-full win98-sunken bg-white h-[18px] px-1 outline-none"
                      value={spellChoice}
                      onChange={(e) => setSpellChoice(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col min-h-0">
                    <div className="mb-1">Suggestions:</div>
                    <div className="win98-sunken bg-white h-[64px] overflow-auto">
                      {spellCurrent.suggestions.map((s) => (
                        <div
                          key={s}
                          className={`px-1 h-[16px] cursor-default ${s === spellChoice ? 'bg-[var(--win98-highlight)] text-white' : ''}`}
                          onClick={() => setSpellChoice(s)}
                          onDoubleClick={spellChange}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 w-[92px] pt-[18px]">
                  <Button98 className="h-[20px]" onClick={spellIgnoreAll}>Ignore All</Button98>
                  <Button98 className="h-[20px]" onClick={spellChange}>Change</Button98>
                  <Button98 className="h-[20px]" onClick={spellChangeAll}>Change All</Button98>
                  <div className="flex-1" />
                  <Button98 className="h-[20px]" onClick={closeSpelling}>Cancel</Button98>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* About */}
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

      {printDialog}
    </div>
  );
}

/** Render the sentence around a misspelling with the bad word flagged red. */
function SpellContext({ text, target }: { text: string; target: Misspelling }) {
  const from = Math.max(0, target.index - 40);
  const to = Math.min(text.length, target.index + target.word.length + 40);
  const before = (from > 0 ? '…' : '') + text.slice(from, target.index);
  const after = text.slice(target.index + target.word.length, to) + (to < text.length ? '…' : '');
  return (
    <span>
      {before}
      <span className="text-red-600 font-bold underline">{target.word}</span>
      {after}
    </span>
  );
}
