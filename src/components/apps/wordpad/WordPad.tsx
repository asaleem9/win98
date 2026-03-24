'use client';

import { useState, useRef } from 'react';
import { AppComponentProps } from '@/types/app';

const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Comic Sans MS', 'Georgia', 'Tahoma'];
const sizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'];

function ToolbarBtn({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-[24px] h-[22px] flex items-center justify-center cursor-default select-none text-[12px]
        border border-solid
        ${active
          ? 'border-t-[var(--win98-button-dark-shadow)] border-l-[var(--win98-button-dark-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] bg-[var(--win98-button-shadow)]/20'
          : 'border-transparent hover:border-t-[var(--win98-button-highlight)] hover:border-l-[var(--win98-button-highlight)] hover:border-b-[var(--win98-button-dark-shadow)] hover:border-r-[var(--win98-button-dark-shadow)]'
        }
      `}
    >
      {children}
    </button>
  );
}

export default function WordPad({ windowId }: AppComponentProps) {
  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState('10');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Menu bar */}
      <div className="flex gap-4 px-2 py-[2px] border-b border-[var(--win98-button-shadow)]">
        <span className="cursor-default"><u>F</u>ile</span>
        <span className="cursor-default"><u>E</u>dit</span>
        <span className="cursor-default"><u>V</u>iew</span>
        <span className="cursor-default"><u>I</u>nsert</span>
        <span className="cursor-default">F<u>o</u>rmat</span>
        <span className="cursor-default"><u>H</u>elp</span>
      </div>

      {/* Toolbar row 1 */}
      <div className="flex items-center gap-1 px-1 py-[2px] border-b border-[var(--win98-button-shadow)]">
        <ToolbarBtn>📄</ToolbarBtn>
        <ToolbarBtn>📂</ToolbarBtn>
        <ToolbarBtn>💾</ToolbarBtn>
        <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
        <ToolbarBtn>✂️</ToolbarBtn>
        <ToolbarBtn>📋</ToolbarBtn>
        <ToolbarBtn>📄</ToolbarBtn>
        <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
        <ToolbarBtn>↩️</ToolbarBtn>
        <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
        <ToolbarBtn>🔍</ToolbarBtn>
        <ToolbarBtn>🖨️</ToolbarBtn>
      </div>

      {/* Toolbar row 2 - formatting */}
      <div className="flex items-center gap-1 px-1 py-[2px] border-b border-[var(--win98-button-shadow)]">
        <select
          value={font}
          onChange={e => { setFont(e.target.value); execCommand('fontName', e.target.value); }}
          className="h-[20px] text-[11px] border border-solid border-[var(--win98-button-shadow)] bg-white px-1 w-[130px] font-[family-name:var(--win98-font)]"
        >
          {fonts.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={fontSize}
          onChange={e => { setFontSize(e.target.value); execCommand('fontSize', e.target.value); }}
          className="h-[20px] text-[11px] border border-solid border-[var(--win98-button-shadow)] bg-white px-1 w-[45px] font-[family-name:var(--win98-font)]"
        >
          {sizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
        <ToolbarBtn onClick={() => { setBold(!bold); execCommand('bold'); }} active={bold}>
          <span className="font-bold">B</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => { setItalic(!italic); execCommand('italic'); }} active={italic}>
          <span className="italic">I</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => { setUnderline(!underline); execCommand('underline'); }} active={underline}>
          <span className="underline">U</span>
        </ToolbarBtn>
        <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
        <ToolbarBtn onClick={() => execCommand('justifyLeft')}>
          <span className="text-[9px]">≡</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCommand('justifyCenter')}>
          <span className="text-[9px]">☰</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => execCommand('justifyRight')}>
          <span className="text-[9px]">≡</span>
        </ToolbarBtn>
        <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-[2px]" />
        <ToolbarBtn onClick={() => execCommand('insertUnorderedList')}>•≡</ToolbarBtn>
      </div>

      {/* Ruler */}
      <div className="h-[20px] bg-white border-b border-[var(--win98-button-shadow)] flex items-end px-[60px] relative">
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} className="flex-1 border-l border-gray-400 h-[10px] relative">
            <span className="absolute -top-[2px] left-0 text-[8px] text-gray-500 -translate-x-1/2">
              {i > 0 ? i : ''}
            </span>
          </div>
        ))}
        {/* Indent markers */}
        <div className="absolute left-[56px] bottom-0 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-gray-600" />
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-auto bg-white p-1 min-h-0">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-full p-2 outline-none text-[11px] font-[family-name:var(--win98-font)]"
          style={{ fontFamily: font }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center px-2 py-[2px] border-t border-[var(--win98-button-highlight)]">
        <div className="flex-1 border border-solid border-[var(--win98-button-shadow)] px-1 text-[10px]">
          For Help, press F1
        </div>
      </div>
    </div>
  );
}
