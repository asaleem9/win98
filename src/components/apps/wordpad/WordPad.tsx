'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { usePrint } from '@/components/dialogs/PrintDialog';
import {
  clampMarker,
  computeIndents,
  nextTabStop,
  toggleTabStop,
  DEFAULT_TAB_PX,
  FALLBACK_RULER_WIDTH,
} from './ruler';

const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Comic Sans MS', 'Georgia', 'Tahoma'];
const sizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'Document';
}

function fileExt(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function looksLikeHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
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

function FormatBtn({ children, onClick, active, title }: { children: React.ReactNode; onClick?: () => void; active?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
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

type DragTarget = 'left' | 'first' | 'right' | null;

export default function WordPad({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle, closeWindow } = useWindows();
  const { getNode, writeFile } = useFileSystem();
  const { getAppPref, setAppPref } = useSettings();
  const { openPrint, printDialog } = usePrint(windowId, 'WordPad');

  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState('10');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('Document');
  const [dirty, setDirty] = useState(false);
  const [picker, setPicker] = useState<null | 'open' | 'save'>(null);
  const [showAbout, setShowAbout] = useState(false);

  // View toggles, persisted per app.
  const [showToolbar, setShowToolbar] = useState(() => getAppPref('wordpad', 'showToolbar', true));
  const [showFormatBar, setShowFormatBar] = useState(() => getAppPref('wordpad', 'showFormatBar', true));
  const [showRuler, setShowRuler] = useState(() => getAppPref('wordpad', 'showRuler', true));
  const [showStatusBar, setShowStatusBar] = useState(() => getAppPref('wordpad', 'showStatusBar', true));

  // Ruler geometry (px). Left / first-line measured from the left edge; the
  // right margin is stored as distance from the right edge so it survives resize.
  const [rulerWidth, setRulerWidth] = useState(FALLBACK_RULER_WIDTH);
  const [leftPx, setLeftPx] = useState(0);
  const [firstLinePx, setFirstLinePx] = useState(0);
  const [rightFromEdge, setRightFromEdge] = useState(0);
  const [tabStops, setTabStops] = useState<number[]>([]);

  const editorRef = useRef<HTMLDivElement>(null);
  const rulerTrackRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragTarget>(null);

  const rightMarkerX = rulerWidth - rightFromEdge;
  const indents = computeIndents({ rulerWidth, leftPx, rightPx: rightMarkerX, firstLinePx });

  useEffect(() => {
    updateTitle(windowId, `${dirty ? '*' : ''}${fileName} - WordPad`);
  }, [fileName, dirty, windowId, updateTitle]);

  // Measure the ruler track so markers map to real pixels.
  useEffect(() => {
    if (!showRuler) return;
    const measure = () => {
      const w = rulerTrackRef.current?.getBoundingClientRect().width ?? 0;
      setRulerWidth(w > 0 ? w : FALLBACK_RULER_WIDTH);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [showRuler]);

  const focusEditor = useCallback(() => editorRef.current?.focus(), []);

  const markDirty = useCallback(() => setDirty(true), []);

  const syncFormatState = useCallback(() => {
    setBold(queryStateSafe('bold'));
    setItalic(queryStateSafe('italic'));
    setUnderline(queryStateSafe('underline'));
    const fam = queryValueSafe('fontName').replace(/['"]/g, '');
    if (fam && fonts.includes(fam)) setFont(fam);
  }, []);

  useEffect(() => {
    const handler = () => {
      const sel = typeof document !== 'undefined' ? document.getSelection() : null;
      if (sel?.anchorNode && editorRef.current?.contains(sel.anchorNode)) syncFormatState();
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [syncFormatState]);

  const runCommand = useCallback((command: string, value?: string) => {
    execCommandSafe(command, value);
    focusEditor();
    setDirty(true);
  }, [focusEditor]);

  const applyFontName = useCallback((family: string) => {
    setFont(family);
    runCommand('fontName', family);
  }, [runCommand]);

  // execCommand('fontSize') only speaks the 1-7 scale; tag with 7 then rewrite
  // to a real pixel size.
  const applyFontSize = useCallback((label: string) => {
    setFontSize(label);
    execCommandSafe('fontSize', '7');
    editorRef.current?.querySelectorAll('font[size="7"]').forEach((f) => {
      f.removeAttribute('size');
      (f as HTMLElement).style.fontSize = `${label}px`;
    });
    focusEditor();
    setDirty(true);
  }, [focusEditor]);

  // --- file open / save ------------------------------------------------------

  const loadPath = useCallback((rawPath: string) => {
    const path = normalizePath(rawPath);
    const node = getNode(path);
    if (!node || node.type !== 'file') {
      showSystemError('WordPad', `Cannot find the ${baseName(path)} file.`);
      return;
    }
    const content = node.content ?? '';
    const asText = fileExt(path) === 'txt' || !looksLikeHtml(content);
    const html = asText ? escapeHtml(content).replace(/\n/g, '<br>') : content;
    if (editorRef.current) editorRef.current.innerHTML = html;
    setFilePath(path);
    setFileName(baseName(path));
    setDirty(false);
    addRecentDoc(path);
  }, [getNode]);

  useEffect(() => {
    if (launchParams?.filePath) loadPath(launchParams.filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  const doSave = useCallback((path: string) => {
    // .txt drops formatting; .rtf / .doc keep the HTML body.
    const content = fileExt(path) === 'txt'
      ? (editorRef.current?.textContent ?? '')
      : (editorRef.current?.innerHTML ?? '');
    const result = writeFile(path, content);
    if (!result.ok) {
      showSystemError('WordPad', result.error);
      return;
    }
    setFilePath(path);
    setFileName(baseName(path));
    setDirty(false);
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
    setDirty(false);
  }, []);

  const handlePrint = useCallback(() => {
    openPrint(() => ({ kind: 'html', html: editorRef.current?.innerHTML ?? '' }), fileName);
  }, [openPrint, fileName]);

  // --- insert helpers --------------------------------------------------------

  const insertDateTime = useCallback(() => {
    const stamp = new Date().toLocaleString('en-US', {
      month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    runCommand('insertText', stamp);
  }, [runCommand]);

  const onPickImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      focusEditor();
      execCommandSafe('insertImage', String(reader.result));
      setDirty(true);
    };
    reader.readAsDataURL(file);
  }, [focusEditor]);

  // --- ruler interaction -----------------------------------------------------

  const moveMarker = useCallback((clientX: number) => {
    const track = rulerTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : rulerWidth;
    const x = clampMarker(clientX - rect.left, 0, width);
    if (dragRef.current === 'left') {
      setLeftPx(clampMarker(x, 0, rightMarkerX));
    } else if (dragRef.current === 'first') {
      setFirstLinePx(clampMarker(x, 0, rightMarkerX));
    } else if (dragRef.current === 'right') {
      setRightFromEdge(clampMarker(width - x, 0, width - leftPx));
    }
  }, [rulerWidth, rightMarkerX, leftPx]);

  const startDrag = useCallback((e: React.PointerEvent, target: DragTarget) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = target;
  }, []);

  const onMarkerMove = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) moveMarker(e.clientX);
  }, [moveMarker]);

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  const onTrackClick = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) return;
    const track = rulerTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : rulerWidth;
    const x = clampMarker(e.clientX - rect.left, 0, width);
    setTabStops((prev) => toggleTabStop(prev, x));
  }, [rulerWidth]);

  const insertTab = useCallback(() => {
    let width = DEFAULT_TAB_PX;
    try {
      const sel = typeof window !== 'undefined' ? window.getSelection() : null;
      const content = editorRef.current;
      if (sel && sel.rangeCount > 0 && content) {
        const caretRect = sel.getRangeAt(0).cloneRange().getBoundingClientRect();
        const base = content.getBoundingClientRect();
        const caretX = caretRect.left - base.left - indents.paddingLeft;
        if (Number.isFinite(caretX) && caretX >= 0) {
          width = Math.max(8, nextTabStop(caretX, tabStops) - caretX);
        }
      }
    } catch {
      // measurement unavailable — fall back to the default interval
    }
    execCommandSafe('insertHTML', `<span style="display:inline-block; width:${Math.round(width)}px"></span>`);
    setDirty(true);
  }, [tabStops, indents.paddingLeft]);

  // --- view toggles ----------------------------------------------------------

  const toggleView = useCallback((
    key: string,
    setter: (updater: (v: boolean) => boolean) => void,
  ) => {
    setter((v) => {
      const next = !v;
      setAppPref('wordpad', key, next);
      return next;
    });
  }, [setAppPref]);

  // --- keyboard --------------------------------------------------------------

  const onRootKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); handleSave(); }
      else if (k === 'o') { e.preventDefault(); setPicker('open'); }
      else if (k === 'n') { e.preventDefault(); handleNew(); }
      else if (k === 'p') { e.preventDefault(); handlePrint(); }
    }
  }, [handleSave, handleNew, handlePrint]);

  const onEditorKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      insertTab();
    }
  }, [insertTab]);

  // --- menus -----------------------------------------------------------------

  const menus: MenuDefinition[] = [
    {
      label: '&File',
      items: [
        { label: '&New', shortcut: 'Ctrl+N', onClick: handleNew },
        { label: '&Open...', shortcut: 'Ctrl+O', onClick: () => setPicker('open') },
        { label: '&Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save &As...', onClick: () => setPicker('save') },
        { label: '', separator: true },
        { label: '&Print...', shortcut: 'Ctrl+P', onClick: handlePrint },
        { label: 'Print Pre&view', disabled: true },
        { label: 'Page Set&up...', disabled: true },
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
        { label: '', separator: true },
        { label: 'Select A&ll', shortcut: 'Ctrl+A', onClick: () => runCommand('selectAll') },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Toolbar', checked: showToolbar, onClick: () => toggleView('showToolbar', setShowToolbar) },
        { label: '&Format Bar', checked: showFormatBar, onClick: () => toggleView('showFormatBar', setShowFormatBar) },
        { label: '&Ruler', checked: showRuler, onClick: () => toggleView('showRuler', setShowRuler) },
        { label: '&Status Bar', checked: showStatusBar, onClick: () => toggleView('showStatusBar', setShowStatusBar) },
        { label: '', separator: true },
        { label: '&Options...', disabled: true },
      ],
    },
    {
      label: '&Insert',
      items: [
        { label: 'Date and &Time...', onClick: insertDateTime },
        { label: '&Picture...', onClick: () => imageInputRef.current?.click() },
        { label: '&Object...', disabled: true },
      ],
    },
    {
      label: 'F&ormat',
      items: [
        { label: '&Font...', disabled: true },
        { label: '&Bullet Style', onClick: () => runCommand('insertUnorderedList') },
        { label: '&Paragraph...', disabled: true },
        { label: '&Tabs...', disabled: true },
      ],
    },
    {
      label: '&Help',
      items: [{ label: '&About WordPad', onClick: () => setShowAbout(true) }],
    },
  ];

  return (
    <div
      className="relative flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]"
      data-window-id={windowId}
      onKeyDown={onRootKeyDown}
    >
      <MenuBar menus={menus} windowId={windowId} />

      {/* Toolbar row 1 */}
      {showToolbar && (
        <div className="flex items-center gap-1 px-1 py-[2px] border-b border-[var(--win98-button-shadow)]" data-testid="wordpad-toolbar">
          <ToolbarBtn title="New" onClick={handleNew}>📄</ToolbarBtn>
          <ToolbarBtn title="Open" onClick={() => setPicker('open')}>📂</ToolbarBtn>
          <ToolbarBtn title="Save" onClick={handleSave}>💾</ToolbarBtn>
          <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
          <ToolbarBtn title="Print" onClick={handlePrint}>🖨️</ToolbarBtn>
          <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
          <ToolbarBtn title="Cut" onClick={() => runCommand('cut')}>✂️</ToolbarBtn>
          <ToolbarBtn title="Copy" onClick={() => runCommand('copy')}>📋</ToolbarBtn>
          <ToolbarBtn title="Paste" onClick={() => runCommand('paste')}>📄</ToolbarBtn>
          <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
          <ToolbarBtn title="Undo" onClick={() => runCommand('undo')}>↩️</ToolbarBtn>
          <ToolbarBtn title="Date/Time" onClick={insertDateTime}>🕓</ToolbarBtn>
        </div>
      )}

      {/* Toolbar row 2 - formatting */}
      {showFormatBar && (
        <div className="flex items-center gap-1 px-1 py-[2px] border-b border-[var(--win98-button-shadow)]" data-testid="wordpad-format-bar">
          <select
            aria-label="Font"
            value={font}
            onChange={(e) => applyFontName(e.target.value)}
            className="h-[20px] text-[11px] border border-solid border-[var(--win98-button-shadow)] bg-white px-1 w-[130px] font-[family-name:var(--win98-font)]"
          >
            {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select
            aria-label="Font size"
            value={fontSize}
            onChange={(e) => applyFontSize(e.target.value)}
            className="h-[20px] text-[11px] border border-solid border-[var(--win98-button-shadow)] bg-white px-1 w-[45px] font-[family-name:var(--win98-font)]"
          >
            {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
          <FormatBtn onClick={() => runCommand('bold')} active={bold} title="Bold"><span className="font-bold">B</span></FormatBtn>
          <FormatBtn onClick={() => runCommand('italic')} active={italic} title="Italic"><span className="italic">I</span></FormatBtn>
          <FormatBtn onClick={() => runCommand('underline')} active={underline} title="Underline"><span className="underline">U</span></FormatBtn>
          <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
          <FormatBtn onClick={() => runCommand('justifyLeft')} title="Align Left"><span className="text-[9px]">⯇</span></FormatBtn>
          <FormatBtn onClick={() => runCommand('justifyCenter')} title="Center"><span className="text-[9px]">≡</span></FormatBtn>
          <FormatBtn onClick={() => runCommand('justifyRight')} title="Align Right"><span className="text-[9px]">⯈</span></FormatBtn>
          <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
          <FormatBtn onClick={() => runCommand('insertUnorderedList')} title="Bullets">•≡</FormatBtn>
        </div>
      )}

      {/* Ruler */}
      {showRuler && (
        <div className="h-[22px] bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] flex items-end px-[24px]" data-testid="wordpad-ruler">
          <div
            ref={rulerTrackRef}
            className="relative flex-1 h-[18px] bg-white win98-sunken cursor-default"
            onClick={onTrackClick}
            title="Click to set a tab stop"
          >
            {/* inch ticks */}
            {Array.from({ length: 13 }, (_, i) => (
              <div key={i} className="absolute top-1/2 -translate-y-1/2 w-px h-[6px] bg-[var(--win98-button-shadow)]" style={{ left: `${(i / 12) * 100}%` }} />
            ))}
            {/* tab stops */}
            {tabStops.map((t) => (
              <div
                key={t}
                className="absolute bottom-0 text-[9px] leading-none text-black cursor-pointer"
                style={{ left: t - 3 }}
                onClick={(e) => { e.stopPropagation(); setTabStops((prev) => prev.filter((s) => s !== t)); }}
                title="Click to remove this tab stop"
              >
                L
              </div>
            ))}
            {/* first-line indent (top, pointing down) */}
            <div
              role="slider"
              aria-label="First line indent"
              aria-valuemin={0}
              aria-valuemax={Math.round(rulerWidth)}
              aria-valuenow={Math.round(firstLinePx)}
              className="absolute top-0 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-[var(--win98-button-shadow)] cursor-ew-resize"
              style={{ left: firstLinePx - 5 }}
              onPointerDown={(e) => startDrag(e, 'first')}
              onPointerMove={onMarkerMove}
              onPointerUp={endDrag}
              onClick={(e) => e.stopPropagation()}
            />
            {/* left margin (bottom, pointing up) */}
            <div
              role="slider"
              aria-label="Left indent"
              aria-valuemin={0}
              aria-valuemax={Math.round(rulerWidth)}
              aria-valuenow={Math.round(leftPx)}
              className="absolute bottom-0 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-[var(--win98-button-shadow)] cursor-ew-resize"
              style={{ left: leftPx - 5 }}
              onPointerDown={(e) => startDrag(e, 'left')}
              onPointerMove={onMarkerMove}
              onPointerUp={endDrag}
              onClick={(e) => e.stopPropagation()}
            />
            {/* right margin (bottom, pointing up) */}
            <div
              role="slider"
              aria-label="Right indent"
              aria-valuemin={0}
              aria-valuemax={Math.round(rulerWidth)}
              aria-valuenow={Math.round(rightMarkerX)}
              className="absolute bottom-0 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-[var(--win98-button-shadow)] cursor-ew-resize"
              style={{ left: rightMarkerX - 5 }}
              onPointerDown={(e) => startDrag(e, 'right')}
              onPointerMove={onMarkerMove}
              onPointerUp={endDrag}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 overflow-auto bg-[#808080] p-2 min-h-0">
        <div className="bg-white mx-auto min-h-full" style={{ maxWidth: '850px' }}>
          <div
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            aria-label="Document"
            contentEditable
            suppressContentEditableWarning
            onInput={markDirty}
            onMouseUp={syncFormatState}
            onKeyUp={syncFormatState}
            onKeyDown={onEditorKeyDown}
            className="min-h-full py-3 outline-none text-[13px] text-black font-[family-name:var(--win98-font)]"
            style={{
              fontFamily: font,
              paddingLeft: indents.paddingLeft + 24,
              paddingRight: indents.paddingRight + 24,
              textIndent: indents.textIndent,
            }}
          />
        </div>
      </div>

      {/* Status bar */}
      {showStatusBar && (
        <div className="flex items-center px-2 py-[2px] border-t border-[var(--win98-button-highlight)]" data-testid="wordpad-status-bar">
          <div className="flex-1 border border-solid border-[var(--win98-button-shadow)] px-1 text-[10px]">For Help, press F1</div>
        </div>
      )}

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />

      {picker && (
        <FilePickerDialog
          mode={picker}
          filters={[
            { label: 'Rich Text Format (*.rtf)', extensions: ['rtf'] },
            { label: 'Text Document (*.txt)', extensions: ['txt'] },
            { label: 'Word for Windows (*.doc)', extensions: ['doc'] },
            { label: 'All Documents (*.*)', extensions: [] },
          ]}
          defaultExtension="rtf"
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
