'use client';

import { useState, useRef, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { StatusBar98 } from '@/components/ui/StatusBar98';

export default function Notepad({ windowId }: AppComponentProps) {
  const { updateTitle } = useWindows();
  const [content, setContent] = useState('');
  const [wordWrap, setWordWrap] = useState(true);
  const [fileName, setFileName] = useState('Untitled');
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lineCount = content.split('\n').length;
  const charCount = content.length;

  const handleNew = useCallback(() => {
    setContent('');
    setFileName('Untitled');
    updateTitle(windowId, 'Untitled - Notepad');
  }, [windowId, updateTitle]);

  const handleFind = useCallback(() => {
    if (!findText || !textareaRef.current) return;
    const ta = textareaRef.current;
    const start = ta.value.indexOf(findText, (ta.selectionEnd || 0));
    if (start !== -1) {
      ta.focus();
      ta.setSelectionRange(start, start + findText.length);
    }
  }, [findText]);

  const handleReplace = useCallback(() => {
    if (!findText || !textareaRef.current) return;
    const ta = textareaRef.current;
    const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd);
    if (selected === findText) {
      const before = ta.value.substring(0, ta.selectionStart);
      const after = ta.value.substring(ta.selectionEnd);
      setContent(before + replaceText + after);
    }
    handleFind();
  }, [findText, replaceText, handleFind]);

  const handleReplaceAll = useCallback(() => {
    if (!findText) return;
    setContent((prev) => prev.split(findText).join(replaceText));
  }, [findText, replaceText]);

  const handleSelectAll = useCallback(() => {
    textareaRef.current?.select();
  }, []);

  const handleDateTime = useCallback(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US');
    const stamp = `${timeStr} ${dateStr}`;
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const before = content.substring(0, ta.selectionStart);
    const after = content.substring(ta.selectionEnd);
    setContent(before + stamp + after);
  }, [content]);

  const menus: MenuDefinition[] = [
    {
      label: 'File',
      items: [
        { label: 'New', shortcut: 'Ctrl+N', onClick: handleNew },
        { label: 'Open...', shortcut: 'Ctrl+O', disabled: true },
        { label: 'Save', shortcut: 'Ctrl+S', disabled: true },
        { label: 'Save As...', disabled: true },
        { label: '', separator: true },
        { label: 'Page Setup...', disabled: true },
        { label: 'Print...', shortcut: 'Ctrl+P', disabled: true },
        { label: '', separator: true },
        { label: 'Exit', onClick: () => { /* handled by window close */ } },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', disabled: true },
        { label: '', separator: true },
        { label: 'Cut', shortcut: 'Ctrl+X', onClick: () => document.execCommand('cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', onClick: () => document.execCommand('copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', onClick: () => document.execCommand('paste') },
        { label: 'Delete', shortcut: 'Del', onClick: () => document.execCommand('delete') },
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
      label: 'Help',
      items: [
        { label: 'About Notepad', onClick: () => {} },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)]">
      <MenuBar menus={menus} />

      {/* Format toggle via View-like approach in menu */}
      <div className="flex items-center h-[20px] bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] font-[family-name:var(--win98-font)] text-[11px]">
        <button
          className="px-[6px] py-[2px] cursor-default select-none"
          onClick={() => setWordWrap(!wordWrap)}
        >
          <span className="text-[11px]">{wordWrap ? '✓ ' : '  '}Word Wrap</span>
        </button>
      </div>

      {/* Find/Replace bar */}
      {showFind && (
        <div className="flex items-center gap-1 px-2 py-1 bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] font-[family-name:var(--win98-font)] text-[11px]">
          <label className="select-none">Find:</label>
          <input
            className="w-[120px] h-[18px] px-1 text-[11px] border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
          />
          <label className="select-none ml-1">Replace:</label>
          <input
            className="w-[120px] h-[18px] px-1 text-[11px] border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
          />
          <button
            className="px-2 h-[18px] text-[11px] bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)] cursor-default"
            onClick={handleFind}
          >
            Find
          </button>
          <button
            className="px-2 h-[18px] text-[11px] bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)] cursor-default"
            onClick={handleReplace}
          >
            Replace
          </button>
          <button
            className="px-2 h-[18px] text-[11px] bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)] cursor-default"
            onClick={handleReplaceAll}
          >
            All
          </button>
          <button
            className="px-2 h-[18px] text-[11px] bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)] cursor-default"
            onClick={() => setShowFind(false)}
          >
            Close
          </button>
        </div>
      )}

      {/* Text area */}
      <div className="flex-1 min-h-0">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (fileName === 'Untitled') {
              updateTitle(windowId, 'Untitled - Notepad');
            }
          }}
          className="w-full h-full resize-none p-1 bg-white text-black font-[family-name:var(--win98-font-mono)] text-[13px] leading-[16px] border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] shadow-[inset_-1px_-1px_0_var(--win98-button-light),inset_1px_1px_0_var(--win98-button-dark-shadow)] outline-none focus:outline-none"
          style={{ whiteSpace: wordWrap ? 'pre-wrap' : 'pre', overflowWrap: wordWrap ? 'break-word' : 'normal' }}
          spellCheck={false}
        />
      </div>

      <StatusBar98
        panels={[
          { content: `Ln ${lineCount}, Col 1` },
          { content: `${charCount} characters`, width: 120 },
        ]}
      />
    </div>
  );
}
