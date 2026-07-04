'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useSettings } from '@/contexts/SettingsContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { playSound } from '@/lib/sounds';
import { normalizePath } from '@/lib/fs/fsOperations';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { Button98 } from '@/components/ui/Button98';
import { wrapSelection, wrapBlock, BlockTag, geocitiesSlug } from './frontpageHelpers';

const DEFAULT_DIR = 'C:\\My Documents';

const DEFAULT_HTML = `<html>
<head>
  <title>My Cool Website</title>
</head>
<body bgcolor="#FFFFFF">
  <center>
    <h1><font color="#0000FF" face="Comic Sans MS">My Cool Website</font></h1>
    <hr>
    <marquee>Welcome to my homepage! You are visitor number 001337!</marquee>
    <br>
    <p><font face="Arial" size="3">This page is under construction!</font></p>
    <img src="construction.gif" alt="Under Construction">
    <br><br>
    <table border="1" cellpadding="5">
      <tr>
        <td bgcolor="#FFFF00"><b>Links</b></td>
        <td bgcolor="#FFFF00"><b>Cool Stuff</b></td>
      </tr>
      <tr>
        <td><a href="http://www.yahoo.com">Yahoo!</a></td>
        <td><a href="http://www.geocities.com">GeoCities</a></td>
      </tr>
    </table>
    <br>
    <p><font size="2">Best viewed in Internet Explorer 5.0 at 800x600</font></p>
    <p><font size="1">Last updated: 03/15/1999</font></p>
  </center>
</body>
</html>`;

type Tab = 'normal' | 'html' | 'preview';

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'Untitled.htm';
}

interface PublishState {
  step: 'confirm' | 'progress' | 'done';
  progress: number;
}

export default function FrontPage({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle, openWindow } = useWindows();
  const { readFile, writeFile, getNode } = useFileSystem();
  const { getAppPref, setAppPref } = useSettings();

  const [activeTab, setActiveTab] = useState<Tab>('normal');
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('Untitled.htm');
  const [picker, setPicker] = useState<null | 'open' | 'save' | 'save-then-preview'>(null);
  const [publish, setPublish] = useState<PublishState | null>(null);

  const userName = getAppPref<string>('system', 'userName', 'User');
  const slug = geocitiesSlug(userName);
  const destUrl = `www.geocities.com/~${slug}`;

  // The Normal tab renders a live WYSIWYG editor (contentEditable) over a source
  // textarea. `activeTextareaRef` points at whichever source textarea is mounted
  // (Normal or HTML tab); `wysiwygRef` is the rich editor; `activeEditorRef`
  // records which of the two the user last touched so the toolbar and the
  // source⇄WYSIWYG sync always act on the right one.
  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const wysiwygRef = useRef<HTMLDivElement | null>(null);
  const activeEditorRef = useRef<'wysiwyg' | 'source'>('source');
  const idleSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    updateTitle(windowId, `${fileName} - Microsoft FrontPage`);
  }, [fileName, windowId, updateTitle]);

  // Copy the live WYSIWYG DOM back into the HTML source model.
  const flushWysiwygToSource = useCallback(() => {
    const el = wysiwygRef.current;
    if (!el) return;
    const html = el.innerHTML;
    setHtmlContent((prev) => (prev === html ? prev : html));
  }, []);

  // Push the source into the WYSIWYG whenever the source changed elsewhere (the
  // source textarea, a load, a switch back to Normal) — but never while the user
  // is actively typing in the WYSIWYG, which would blow away their caret.
  useEffect(() => {
    if (activeTab !== 'normal') return;
    const el = wysiwygRef.current;
    if (!el) return;
    if (activeEditorRef.current === 'wysiwyg') return;
    if (el.innerHTML !== htmlContent) el.innerHTML = htmlContent;
  }, [htmlContent, activeTab]);

  useEffect(() => () => { if (idleSyncTimer.current) clearTimeout(idleSyncTimer.current); }, []);

  const handleWysiwygInput = useCallback(() => {
    // Debounced idle sync so the source pane keeps up without thrashing on every
    // keystroke; a blur flushes immediately as well.
    if (idleSyncTimer.current) clearTimeout(idleSyncTimer.current);
    idleSyncTimer.current = setTimeout(flushWysiwygToSource, 500);
  }, [flushWysiwygToSource]);

  // The bytes to persist/publish: the live WYSIWYG DOM when it's the focused
  // editor, otherwise the source model.
  const collectHtml = useCallback((): string => {
    if (activeTab === 'normal' && activeEditorRef.current === 'wysiwyg' && wysiwygRef.current) {
      return wysiwygRef.current.innerHTML;
    }
    return htmlContent;
  }, [activeTab, htmlContent]);

  const switchTab = useCallback((tab: Tab) => {
    if (activeTab === 'normal') flushWysiwygToSource();
    // The source is authoritative on every (re)entry to a view.
    activeEditorRef.current = 'source';
    setActiveTab(tab);
  }, [activeTab, flushWysiwygToSource]);

  const loadPath = useCallback(
    (rawPath: string) => {
      const path = normalizePath(rawPath);
      const node = getNode(path);
      if (!node || node.type !== 'file') {
        showSystemError('FrontPage', `Cannot find the ${baseName(path)} file.`);
        return;
      }
      const content = readFile(path);
      activeEditorRef.current = 'source';
      setHtmlContent(content ?? '');
      setCurrentPath(path);
      setFileName(baseName(path));
      addRecentDoc(path);
    },
    [getNode, readFile],
  );

  useEffect(() => {
    if (launchParams?.filePath) loadPath(launchParams.filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  const doSave = useCallback(
    (path: string): boolean => {
      const result = writeFile(path, collectHtml());
      if (!result.ok) {
        showSystemError('FrontPage', result.error);
        return false;
      }
      setCurrentPath(path);
      setFileName(baseName(path));
      addRecentDoc(path);
      playSound('ding');
      return true;
    },
    [collectHtml, writeFile],
  );

  const handleNew = useCallback(() => {
    activeEditorRef.current = 'source';
    setHtmlContent('');
    setCurrentPath(null);
    setFileName('Untitled.htm');
  }, []);

  const handleOpen = useCallback(() => setPicker('open'), []);

  const handleSave = useCallback(() => {
    if (currentPath) doSave(currentPath);
    else setPicker('save');
  }, [currentPath, doSave]);

  const handleSaveAs = useCallback(() => setPicker('save'), []);

  const handlePreviewInBrowser = useCallback(() => {
    if (currentPath) {
      doSave(currentPath);
      openWindow('ie5', { launchParams: { url: 'file://' + currentPath } });
    } else {
      setPicker('save-then-preview');
    }
  }, [currentPath, doSave, openWindow]);

  // --- Toolbar formatting (branches on the active editor) --------------------

  const applyEdit = useCallback((result: { text: string; selStart: number; selEnd: number }) => {
    setHtmlContent(result.text);
    const ta = activeTextareaRef.current;
    if (!ta) return;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(result.selStart, result.selEnd);
    });
  }, []);

  const withSelection = useCallback((fn: (ta: HTMLTextAreaElement, start: number, end: number) => void) => {
    const ta = activeTextareaRef.current;
    if (!ta) return;
    fn(ta, ta.selectionStart, ta.selectionEnd);
  }, []);

  const applyWysiwygCommand = useCallback((command: string, value?: string) => {
    const el = wysiwygRef.current;
    if (!el) return;
    el.focus();
    activeEditorRef.current = 'wysiwyg';
    try {
      document.execCommand(command, false, value);
    } catch {
      // execCommand is unavailable under jsdom; the source-side path stays tested.
    }
    flushWysiwygToSource();
  }, [flushWysiwygToSource]);

  const inWysiwyg = useCallback(
    () => activeTab === 'normal' && activeEditorRef.current === 'wysiwyg' && !!wysiwygRef.current,
    [activeTab],
  );

  const handleBold = useCallback(() => {
    if (inWysiwyg()) applyWysiwygCommand('bold');
    else withSelection((ta, s, e) => applyEdit(wrapSelection(ta.value, s, e, '<b>', '</b>')));
  }, [inWysiwyg, applyWysiwygCommand, withSelection, applyEdit]);

  const handleItalic = useCallback(() => {
    if (inWysiwyg()) applyWysiwygCommand('italic');
    else withSelection((ta, s, e) => applyEdit(wrapSelection(ta.value, s, e, '<i>', '</i>')));
  }, [inWysiwyg, applyWysiwygCommand, withSelection, applyEdit]);

  const handleUnderline = useCallback(() => {
    if (inWysiwyg()) applyWysiwygCommand('underline');
    else withSelection((ta, s, e) => applyEdit(wrapSelection(ta.value, s, e, '<u>', '</u>')));
  }, [inWysiwyg, applyWysiwygCommand, withSelection, applyEdit]);

  const handleFormatChange = useCallback(
    (value: string) => {
      const map: Record<string, BlockTag> = {
        Normal: 'p',
        'Heading 1': 'h1',
        'Heading 2': 'h2',
        'Heading 3': 'h3',
      };
      const tag = map[value];
      if (!tag) return;
      if (inWysiwyg()) applyWysiwygCommand('formatBlock', tag.toUpperCase());
      else withSelection((ta, s, e) => applyEdit(wrapBlock(ta.value, s, e, tag)));
    },
    [inWysiwyg, applyWysiwygCommand, withSelection, applyEdit],
  );

  // --- Publish to GeoCities --------------------------------------------------

  const startPublish = useCallback(() => {
    if (activeTab === 'normal') flushWysiwygToSource();
    setPublish({ step: 'confirm', progress: 0 });
  }, [activeTab, flushWysiwygToSource]);

  // Crawl the progress bar at a believable 28.8k pace.
  useEffect(() => {
    if (publish?.step !== 'progress' || publish.progress >= 100) return;
    const t = setTimeout(() => {
      setPublish((p) => (p && p.step === 'progress' ? { ...p, progress: Math.min(100, p.progress + 4) } : p));
    }, 90);
    return () => clearTimeout(t);
  }, [publish?.step, publish?.progress]);

  // Commit exactly once when the upload finishes: mirror the page into the pref
  // IE5 reads, and let AIM know so a buddy can admire it.
  useEffect(() => {
    if (publish?.step !== 'progress' || publish.progress < 100) return;
    const site = { html: collectHtml(), publishedAt: Date.now(), userName, slug };
    setAppPref('frontpage', 'publishedSite', site);
    playSound('ding');
    window.dispatchEvent(new CustomEvent('frontpage-published', { detail: { url: destUrl } }));
    setPublish({ step: 'done', progress: 100 });
  }, [publish, collectHtml, setAppPref, userName, slug, destUrl]);

  const menus: MenuDefinition[] = [
    {
      label: 'File',
      items: [
        { label: 'New', shortcut: 'Ctrl+N', onClick: handleNew },
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: handleOpen },
        { label: 'Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save As...', onClick: handleSaveAs },
        { label: '', separator: true },
        { label: 'Publish Web...', onClick: startPublish },
        { label: 'Preview in Browser', onClick: handlePreviewInBrowser },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Cut', shortcut: 'Ctrl+X', disabled: true },
        { label: 'Copy', shortcut: 'Ctrl+C', disabled: true },
        { label: 'Paste', shortcut: 'Ctrl+V', disabled: true },
        { label: '', separator: true },
        { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => activeTextareaRef.current?.select() },
      ],
    },
    { label: 'View', items: [{ label: 'Normal', onClick: () => switchTab('normal') }, { label: 'HTML', onClick: () => switchTab('html') }, { label: 'Preview', onClick: () => switchTab('preview') }] },
    { label: 'Insert', items: [{ label: 'Break', disabled: true }] },
    { label: 'Format', items: [{ label: 'Font...', disabled: true }] },
    { label: 'Tools', items: [{ label: 'Spelling...', disabled: true }] },
    { label: 'Table', items: [{ label: 'Insert Table...', disabled: true }] },
    { label: 'Frames', items: [{ label: 'New Frames Page', disabled: true }] },
    { label: 'Window', items: [{ label: 'New Window', disabled: true }] },
    { label: 'Help', items: [{ label: 'About Microsoft FrontPage', disabled: true }] },
  ];

  const toolBtn = 'w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]';

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none" data-window-id={windowId}>
      <MenuBar menus={menus} windowId={windowId} />

      {/* Toolbar */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <button className={toolBtn} onClick={handleNew} title="New">📄</button>
        <button className={toolBtn} onClick={handleOpen} title="Open">📂</button>
        <button className={toolBtn} onClick={handleSave} title="Save">💾</button>
        <button className={toolBtn} onClick={startPublish} title="Publish Web">🌐</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className={toolBtn}>✂</button>
        <button className={toolBtn}>📋</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className={`${toolBtn} font-bold`} onClick={handleBold} title="Bold">B</button>
        <button className={`${toolBtn} italic`} onClick={handleItalic} title="Italic">I</button>
        <button className={`${toolBtn} underline`} onClick={handleUnderline} title="Underline">U</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className={toolBtn}>🔗</button>
        <button className={toolBtn}>🖼</button>
        <button className={toolBtn} onClick={handlePreviewInBrowser} title="Preview in Browser">📊</button>
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <select
          className="h-[20px] win98-sunken bg-white text-[11px] w-[100px] px-1"
          onChange={(e) => handleFormatChange(e.target.value)}
          value="Normal"
        >
          <option>Normal</option>
          <option>Heading 1</option>
          <option>Heading 2</option>
          <option>Heading 3</option>
          <option>Address</option>
        </select>
        <select className="h-[20px] win98-sunken bg-white text-[11px] w-[120px] px-1 ml-1" defaultValue="Times New Roman">
          <option>Times New Roman</option>
          <option>Arial</option>
          <option>Comic Sans MS</option>
          <option>Courier New</option>
          <option>Verdana</option>
        </select>
        <select className="h-[20px] win98-sunken bg-white text-[11px] w-[40px] px-1 ml-1" defaultValue="3">
          <option>3</option>
          <option>1</option>
          <option>2</option>
          <option>4</option>
          <option>5</option>
        </select>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'normal' ? (
          /* Split view: live WYSIWYG top, HTML source bottom */
          <div className="flex-1 flex flex-col">
            <div
              ref={wysiwygRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Page content"
              className="flex-1 overflow-auto bg-white p-2 outline-none"
              onFocus={() => { activeEditorRef.current = 'wysiwyg'; }}
              onInput={handleWysiwygInput}
              onBlur={flushWysiwygToSource}
            />
            <div className="h-[4px] bg-[var(--win98-button-face)] border-y border-[var(--win98-button-shadow)] cursor-ns-resize" />
            <div className="h-[40%] overflow-auto">
              <textarea
                ref={activeTextareaRef}
                className="w-full h-full bg-white text-[11px] font-[family-name:var(--win98-font-mono)] p-2 resize-none outline-none border-none"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                onFocus={() => { activeEditorRef.current = 'source'; }}
                spellCheck={false}
              />
            </div>
          </div>
        ) : activeTab === 'html' ? (
          /* HTML only view */
          <div className="flex-1 overflow-auto">
            <textarea
              ref={activeTextareaRef}
              className="w-full h-full bg-white text-[11px] font-[family-name:var(--win98-font-mono)] p-2 resize-none outline-none border-none"
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              onFocus={() => { activeEditorRef.current = 'source'; }}
              spellCheck={false}
            />
          </div>
        ) : (
          /* Preview only */
          <div className="flex-1 overflow-auto bg-white p-2">
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        )}
      </div>

      {/* View tabs */}
      <div className="flex items-center border-t border-[var(--win98-button-highlight)]">
        {(['normal', 'html', 'preview'] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={`px-3 py-[2px] text-[11px] capitalize ${activeTab === tab ? 'win98-tab win98-tab-active' : 'win98-tab'}`}
            onClick={() => switchTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Status Bar */}
      <div className="flex items-center h-[20px] px-1 border-t border-[var(--win98-button-highlight)]">
        <span className="win98-sunken px-2 py-0 flex-1">Estimated download time: 2 seconds (28.8Kbps)</span>
      </div>

      {picker && (
        <FilePickerDialog
          mode={picker === 'open' ? 'open' : 'save'}
          extensions={['htm', 'html']}
          defaultExtension="htm"
          startDir={DEFAULT_DIR}
          defaultName={picker !== 'open' ? fileName : ''}
          onCancel={() => setPicker(null)}
          onConfirm={(path) => {
            const target = picker;
            setPicker(null);
            if (target === 'open') {
              loadPath(path);
              return;
            }
            const saved = doSave(path);
            if (saved && target === 'save-then-preview') {
              openWindow('ie5', { launchParams: { url: 'file://' + path } });
            }
          }}
        />
      )}

      {publish && (
        <PublishWizard
          state={publish}
          destUrl={destUrl}
          onPublish={() => setPublish({ step: 'progress', progress: 0 })}
          onClose={() => setPublish(null)}
          onVisit={() => { setPublish(null); openWindow('ie5', { launchParams: { url: destUrl } }); }}
        />
      )}
    </div>
  );
}

function PublishWizard({
  state,
  destUrl,
  onPublish,
  onClose,
  onVisit,
}: {
  state: PublishState;
  destUrl: string;
  onPublish: () => void;
  onClose: () => void;
  onVisit: () => void;
}) {
  return (
    <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
      <div className="w-[360px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]">
        <div className="flex items-center justify-between h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white font-bold select-none">
          <span>Publish Web</span>
          {state.step !== 'progress' && (
            <button className="px-1 leading-none" onClick={onClose} aria-label="Close">×</button>
          )}
        </div>
        <div className="p-4">
          {state.step === 'confirm' && (
            <>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-[24px]">🌐</span>
                <div>
                  <div className="mb-2">Publish this web to the World Wide Web?</div>
                  <div className="text-[10px] text-[#666]">Destination:</div>
                  <div className="win98-sunken bg-white px-1 py-[2px] break-all">http://{destUrl}</div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button98 className="min-w-[70px]" onClick={onPublish}>Publish</Button98>
                <Button98 className="min-w-[70px]" onClick={onClose}>Cancel</Button98>
              </div>
            </>
          )}

          {state.step === 'progress' && (
            <>
              <div className="mb-2">Publishing files to http://{destUrl} ...</div>
              <div className="h-[16px] bg-white win98-sunken overflow-hidden mb-1">
                <div className="h-full bg-[var(--win98-highlight)]" style={{ width: `${state.progress}%` }} />
              </div>
              <div className="text-[10px] text-[#666]">{state.progress}% complete — transferring at 28.8 Kbps</div>
            </>
          )}

          {state.step === 'done' && (
            <>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-[24px]">✅</span>
                <div>
                  <div className="font-bold mb-1">Web site published successfully!</div>
                  <div className="text-[10px] text-[#666] mb-1">Your page is now on the Web at:</div>
                  <div className="win98-sunken bg-white px-1 py-[2px] break-all text-[#0000cc] underline cursor-pointer" onClick={onVisit}>
                    http://{destUrl}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button98 className="min-w-[70px]" onClick={onVisit}>Visit Site</Button98>
                <Button98 className="min-w-[70px]" onClick={onClose}>Close</Button98>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
