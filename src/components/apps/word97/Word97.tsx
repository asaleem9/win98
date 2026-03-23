'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';

const FONT_NAMES = ['Times New Roman', 'Arial', 'Courier New', 'Comic Sans MS', 'Verdana', 'Georgia', 'Impact'];
const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];

const MENU_ITEMS = ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Table', 'Window', 'Help'];

function ToolbarButton({ label, bold, active, onClick }: { label: string; bold?: boolean; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
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

export default function Word97({ windowId }: AppComponentProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [selectedFont, setSelectedFont] = useState('Times New Roman');
  const [selectedSize, setSelectedSize] = useState('12');
  const [showClippy, setShowClippy] = useState(false);
  const [clippyMessage, setClippyMessage] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const triggerBSOD = useCallback(() => {
    window.dispatchEvent(new CustomEvent('win98-bsod', {
      detail: { message: 'WORD caused a general protection fault in module WINWORD.EXE at 0001:00004A3F' }
    }));
  }, []);

  // Clippy appears after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setClippyMessage('It looks like you\'re writing a letter. Would you like help?');
      setShowClippy(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [activeMenu]);

  const handleMenuClick = (item: string) => {
    if (item === 'File' && activeMenu === 'File') {
      setActiveMenu(null);
    } else {
      setActiveMenu(item);
    }
  };

  const handleFileSave = () => {
    setActiveMenu(null);
    triggerBSOD();
  };

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none" data-window-id={windowId}>
      {/* Menu Bar */}
      <div className="flex items-center h-[20px] px-1 border-b border-[var(--win98-button-shadow)]" ref={menuRef}>
        {MENU_ITEMS.map((item) => (
          <div key={item} className="relative">
            <button
              className={`px-2 h-[18px] ${activeMenu === item ? 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]' : 'hover:bg-[var(--win98-highlight)] hover:text-[var(--win98-highlight-text)]'}`}
              onClick={() => handleMenuClick(item)}
              onMouseEnter={() => activeMenu && setActiveMenu(item)}
            >
              {item}
            </button>
            {activeMenu === item && item === 'File' && (
              <div className="absolute top-full left-0 z-50 win98-menu min-w-[180px]">
                <div className="win98-menu-item">New...</div>
                <div className="win98-menu-item">Open...</div>
                <div className="win98-menu-item">Close</div>
                <div className="win98-menu-separator" />
                <div className="win98-menu-item" onClick={handleFileSave}>Save</div>
                <div className="win98-menu-item">Save As...</div>
                <div className="win98-menu-separator" />
                <div className="win98-menu-item">Page Setup...</div>
                <div className="win98-menu-item">Print Preview</div>
                <div className="win98-menu-item">Print...</div>
                <div className="win98-menu-separator" />
                <div className="win98-menu-item">Exit</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Toolbar Row 1 */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <ToolbarButton label="📄" />
        <ToolbarButton label="📂" />
        <ToolbarButton label="💾" onClick={triggerBSOD} />
        <ToolbarSeparator />
        <ToolbarButton label="✂" />
        <ToolbarButton label="📋" />
        <ToolbarButton label="📎" />
        <ToolbarSeparator />
        <ToolbarButton label="↩" />
        <ToolbarButton label="↪" />
        <ToolbarSeparator />
        <ToolbarButton label="🔍" />
      </div>

      {/* Toolbar Row 2 - Formatting */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        {/* Font selector */}
        <select
          className="h-[20px] win98-sunken bg-white text-[11px] w-[140px] px-1"
          value={selectedFont}
          onChange={(e) => setSelectedFont(e.target.value)}
        >
          {FONT_NAMES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        {/* Size selector */}
        <select
          className="h-[20px] win98-sunken bg-white text-[11px] w-[40px] px-1 ml-1"
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
        >
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <ToolbarSeparator />

        <ToolbarButton label="B" bold active={isBold} onClick={() => setIsBold(!isBold)} />
        <ToolbarButton label="I" active={isItalic} onClick={() => setIsItalic(!isItalic)} />
        <ToolbarButton label="U" active={isUnderline} onClick={() => setIsUnderline(!isUnderline)} />

        <ToolbarSeparator />

        <ToolbarButton label="≡" active={alignment === 'left'} onClick={() => setAlignment('left')} />
        <ToolbarButton label="≡" active={alignment === 'center'} onClick={() => setAlignment('center')} />
        <ToolbarButton label="≡" active={alignment === 'right'} onClick={() => setAlignment('right')} />

        <ToolbarSeparator />

        <ToolbarButton label="•" />
        <ToolbarButton label="1." />
      </div>

      {/* Ruler */}
      <div className="h-[20px] bg-white flex items-end px-[72px] border-b border-[var(--win98-button-shadow)] relative">
        <div className="absolute left-0 top-0 bottom-0 w-[72px] bg-[var(--win98-button-face)]" />
        <div className="absolute right-0 top-0 bottom-0 w-[72px] bg-[var(--win98-button-face)]" />
        {/* Ruler ticks */}
        <div className="flex-1 relative h-full">
          {Array.from({ length: 17 }, (_, i) => (
            <div key={i} className="absolute bottom-0 text-[8px] text-[var(--win98-button-shadow)]" style={{ left: `${(i / 16) * 100}%` }}>
              <div className="h-[6px] w-px bg-[var(--win98-button-shadow)]" />
              {i % 2 === 0 && <span className="absolute -left-1 -top-[10px] text-[7px]">{i / 2}</span>}
            </div>
          ))}
        </div>
        {/* Margin markers */}
        <div className="absolute left-[68px] top-[2px] w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-[var(--win98-button-shadow)]" />
        <div className="absolute right-[68px] top-[2px] w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-[var(--win98-button-shadow)]" />
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-auto bg-[#808080] p-4">
        <div className="bg-white mx-auto shadow-md" style={{ width: '100%', maxWidth: '600px', minHeight: '700px', padding: '72px 72px 72px 72px' }}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="outline-none min-h-[200px] text-black"
            style={{
              fontFamily: selectedFont,
              fontSize: `${selectedSize}px`,
              fontWeight: isBold ? 'bold' : 'normal',
              fontStyle: isItalic ? 'italic' : 'normal',
              textDecoration: isUnderline ? 'underline' : 'none',
              textAlign: alignment,
              lineHeight: '1.5',
            }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center h-[20px] px-1 border-t border-[var(--win98-button-highlight)]">
        <div className="flex-1 flex gap-2">
          <span className="win98-sunken px-2 py-0 flex-1">Page 1 &nbsp; Sec 1 &nbsp; 1/1</span>
          <span className="win98-sunken px-2 py-0 w-[80px]">At 1&quot;</span>
          <span className="win98-sunken px-2 py-0 w-[60px]">Ln 1</span>
          <span className="win98-sunken px-2 py-0 w-[60px]">Col 1</span>
        </div>
      </div>

      {/* Clippy */}
      {showClippy && (
        <div className="absolute bottom-[40px] right-[20px] z-50">
          <div className="relative">
            {/* Speech bubble */}
            <div className="bg-[#FFFFCC] border border-black rounded-lg p-3 mb-2 max-w-[200px] text-[11px] shadow-md">
              <p>{clippyMessage}</p>
              <div className="flex gap-2 mt-2">
                <button
                  className="win98-raised bg-[var(--win98-button-face)] px-3 py-0.5 text-[11px]"
                  onClick={() => setShowClippy(false)}
                >
                  Don&apos;t show me this tip again
                </button>
              </div>
              {/* Tail */}
              <div className="absolute -bottom-[8px] right-[20px] w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#FFFFCC]" />
            </div>
            {/* Clippy character */}
            <div className="text-[40px] text-center">📎</div>
          </div>
        </div>
      )}
    </div>
  );
}
