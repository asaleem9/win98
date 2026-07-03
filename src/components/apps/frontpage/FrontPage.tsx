'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { playSound } from '@/lib/sounds';
import { normalizePath } from '@/lib/fs/fsOperations';
import { FilePickerDialog } from './FilePickerDialog';
import { wrapSelection, wrapBlock, BlockTag } from './frontpageHelpers';

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

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'Untitled.htm';
}

export default function FrontPage({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle, openWindow } = useWindows();
  const { readFile, writeFile, getNode } = useFileSystem();

  const [activeTab, setActiveTab] = useState<'normal' | 'html' | 'preview'>('normal');
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('Untitled.htm');
  const [picker, setPicker] = useState<null | 'open' | 'save' | 'save-then-preview'>(null);

  // The Normal tab and HTML tab each render their own textarea; whichever is
  // currently mounted registers itself here so the toolbar buttons always act
  // on the visible one.
  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const renderPreview = useCallback(() => {
    return { __html: htmlContent };
  }, [htmlContent]);

  useEffect(() => {
    updateTitle(windowId, `${fileName} - Microsoft FrontPage`);
  }, [fileName, windowId, updateTitle]);

  const loadPath = useCallback(
    (rawPath: string) => {
      const path = normalizePath(rawPath);
      const node = getNode(path);
      if (!node || node.type !== 'file') {
        showSystemError('FrontPage', `Cannot find the ${baseName(path)} file.`);
        return;
      }
      const content = readFile(path);
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
      const result = writeFile(path, htmlContent);
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
    [htmlContent, writeFile],
  );

  const handleNew = useCallback(() => {
    setHtmlContent('');
    setCurrentPath(null);
    setFileName('Untitled.htm');
  }, []);

  const handleOpen = useCallback(() => {
    setPicker('open');
  }, []);

  const handleSave = useCallback(() => {
    if (currentPath) {
      doSave(currentPath);
    } else {
      setPicker('save');
    }
  }, [currentPath, doSave]);

  const handleSaveAs = useCallback(() => {
    setPicker('save');
  }, []);

  const handlePreviewInBrowser = useCallback(() => {
    if (currentPath) {
      openWindow('ie5', { launchParams: { url: 'file://' + currentPath } });
    } else {
      setPicker('save-then-preview');
    }
  }, [currentPath, openWindow]);

  // Applies a text transform (wrapSelection/wrapBlock result) to the active
  // textarea and restores focus + selection so typing can continue naturally.
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

  const handleBold = useCallback(() => {
    withSelection((ta, start, end) => applyEdit(wrapSelection(ta.value, start, end, '<b>', '</b>')));
  }, [withSelection, applyEdit]);

  const handleItalic = useCallback(() => {
    withSelection((ta, start, end) => applyEdit(wrapSelection(ta.value, start, end, '<i>', '</i>')));
  }, [withSelection, applyEdit]);

  const handleUnderline = useCallback(() => {
    withSelection((ta, start, end) => applyEdit(wrapSelection(ta.value, start, end, '<u>', '</u>')));
  }, [withSelection, applyEdit]);

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
      withSelection((ta, start, end) => applyEdit(wrapBlock(ta.value, start, end, tag)));
    },
    [withSelection, applyEdit],
  );

  const menus: MenuDefinition[] = [
    {
      label: 'File',
      items: [
        { label: 'New', shortcut: 'Ctrl+N', onClick: handleNew },
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: handleOpen },
        { label: 'Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save As...', onClick: handleSaveAs },
        { label: '', separator: true },
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
    { label: 'View', items: [{ label: 'Normal', onClick: () => setActiveTab('normal') }, { label: 'HTML', onClick: () => setActiveTab('html') }, { label: 'Preview', onClick: () => setActiveTab('preview') }] },
    { label: 'Insert', items: [{ label: 'Break', disabled: true }] },
    { label: 'Format', items: [{ label: 'Font...', disabled: true }] },
    { label: 'Tools', items: [{ label: 'Spelling...', disabled: true }] },
    { label: 'Table', items: [{ label: 'Insert Table...', disabled: true }] },
    { label: 'Frames', items: [{ label: 'New Frames Page', disabled: true }] },
    { label: 'Window', items: [{ label: 'New Window', disabled: true }] },
    { label: 'Help', items: [{ label: 'About Microsoft FrontPage', disabled: true }] },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none" data-window-id={windowId}>
      <MenuBar menus={menus} />

      {/* Toolbar */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" onClick={handleNew} title="New">📄</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" onClick={handleOpen} title="Open">📂</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" onClick={handleSave} title="Save">💾</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">✂</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">📋</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px] font-bold" onClick={handleBold} title="Bold">B</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px] italic" onClick={handleItalic} title="Italic">I</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px] underline" onClick={handleUnderline} title="Underline">U</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">🔗</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">🖼</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" onClick={handlePreviewInBrowser} title="Preview in Browser">📊</button>
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <select
          className="h-[20px] win98-sunken bg-white text-[11px] w-[100px] px-1"
          onChange={(e) => handleFormatChange(e.target.value)}
          defaultValue="Normal"
        >
          <option>Normal</option>
          <option>Heading 1</option>
          <option>Heading 2</option>
          <option>Heading 3</option>
          <option>Address</option>
        </select>
        <select className="h-[20px] win98-sunken bg-white text-[11px] w-[120px] px-1 ml-1">
          <option>Times New Roman</option>
          <option>Arial</option>
          <option>Comic Sans MS</option>
          <option>Courier New</option>
          <option>Verdana</option>
        </select>
        <select className="h-[20px] win98-sunken bg-white text-[11px] w-[40px] px-1 ml-1">
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
          /* Split view: WYSIWYG top, HTML bottom */
          <div className="flex-1 flex flex-col">
            {/* WYSIWYG preview */}
            <div className="flex-1 overflow-auto bg-white p-2">
              <div dangerouslySetInnerHTML={renderPreview()} />
            </div>
            {/* Divider */}
            <div className="h-[4px] bg-[var(--win98-button-face)] border-y border-[var(--win98-button-shadow)] cursor-ns-resize" />
            {/* HTML source */}
            <div className="h-[40%] overflow-auto">
              <textarea
                ref={activeTextareaRef}
                className="w-full h-full bg-white text-[11px] font-[family-name:var(--win98-font-mono)] p-2 resize-none outline-none border-none"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
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
              spellCheck={false}
            />
          </div>
        ) : (
          /* Preview only */
          <div className="flex-1 overflow-auto bg-white p-2">
            <div dangerouslySetInnerHTML={renderPreview()} />
          </div>
        )}
      </div>

      {/* View tabs */}
      <div className="flex items-center border-t border-[var(--win98-button-highlight)]">
        <button
          className={`px-3 py-[2px] text-[11px] ${activeTab === 'normal' ? 'win98-tab win98-tab-active' : 'win98-tab'}`}
          onClick={() => setActiveTab('normal')}
        >
          Normal
        </button>
        <button
          className={`px-3 py-[2px] text-[11px] ${activeTab === 'html' ? 'win98-tab win98-tab-active' : 'win98-tab'}`}
          onClick={() => setActiveTab('html')}
        >
          HTML
        </button>
        <button
          className={`px-3 py-[2px] text-[11px] ${activeTab === 'preview' ? 'win98-tab win98-tab-active' : 'win98-tab'}`}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
      </div>

      {/* Status Bar */}
      <div className="flex items-center h-[20px] px-1 border-t border-[var(--win98-button-highlight)]">
        <span className="win98-sunken px-2 py-0 flex-1">Estimated download time: 2 seconds (28.8Kbps)</span>
      </div>

      {picker && (
        <FilePickerDialog
          mode={picker === 'open' ? 'open' : 'save'}
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
    </div>
  );
}
