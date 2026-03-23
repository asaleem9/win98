'use client';

import { useState, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';

const MENU_ITEMS = ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Table', 'Frames', 'Window', 'Help'];

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

export default function FrontPage({ windowId }: AppComponentProps) {
  const [activeTab, setActiveTab] = useState<'normal' | 'html' | 'preview'>('normal');
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML);

  const renderPreview = useCallback(() => {
    return { __html: htmlContent };
  }, [htmlContent]);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none" data-window-id={windowId}>
      {/* Menu Bar */}
      <div className="flex items-center h-[20px] px-1 border-b border-[var(--win98-button-shadow)]">
        {MENU_ITEMS.map((item) => (
          <button key={item} className="px-2 h-[18px] hover:bg-[var(--win98-highlight)] hover:text-[var(--win98-highlight-text)]">
            {item}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">📄</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">📂</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">💾</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">✂</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">📋</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px] font-bold">B</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px] italic">I</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px] underline">U</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">🔗</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">🖼</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">📊</button>
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <select className="h-[20px] win98-sunken bg-white text-[11px] w-[100px] px-1">
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
    </div>
  );
}
