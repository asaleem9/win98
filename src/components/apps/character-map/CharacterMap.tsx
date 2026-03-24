'use client';

import { useState, useMemo } from 'react';
import { AppComponentProps } from '@/types/app';

const charNames: Record<number, string> = {
  32: 'Space', 33: 'Exclamation Mark', 34: 'Quotation Mark', 35: 'Number Sign',
  36: 'Dollar Sign', 37: 'Percent Sign', 38: 'Ampersand', 39: 'Apostrophe',
  40: 'Left Parenthesis', 41: 'Right Parenthesis', 42: 'Asterisk', 43: 'Plus Sign',
  44: 'Comma', 45: 'Hyphen-Minus', 46: 'Full Stop', 47: 'Solidus',
  48: 'Digit Zero', 49: 'Digit One', 50: 'Digit Two', 51: 'Digit Three',
  52: 'Digit Four', 53: 'Digit Five', 54: 'Digit Six', 55: 'Digit Seven',
  56: 'Digit Eight', 57: 'Digit Nine', 58: 'Colon', 59: 'Semicolon',
  60: 'Less-Than Sign', 61: 'Equals Sign', 62: 'Greater-Than Sign', 63: 'Question Mark',
  64: 'Commercial At', 65: 'Latin Capital Letter A', 91: 'Left Square Bracket',
  92: 'Reverse Solidus', 93: 'Right Square Bracket', 94: 'Circumflex Accent',
  95: 'Low Line', 96: 'Grave Accent', 97: 'Latin Small Letter A',
  123: 'Left Curly Bracket', 124: 'Vertical Line', 125: 'Right Curly Bracket',
  126: 'Tilde', 169: 'Copyright Sign', 174: 'Registered Sign', 176: 'Degree Sign',
  177: 'Plus-Minus Sign', 181: 'Micro Sign', 188: 'Vulgar Fraction One Quarter',
  189: 'Vulgar Fraction One Half', 190: 'Vulgar Fraction Three Quarters',
  191: 'Inverted Question Mark', 215: 'Multiplication Sign', 247: 'Division Sign',
  8364: 'Euro Sign', 8482: 'Trade Mark Sign',
};

const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Symbol', 'Wingdings', 'Verdana', 'Georgia'];

function getCharName(code: number): string {
  if (charNames[code]) return charNames[code];
  if (code >= 65 && code <= 90) return `Latin Capital Letter ${String.fromCharCode(code)}`;
  if (code >= 97 && code <= 122) return `Latin Small Letter ${String.fromCharCode(code).toUpperCase()}`;
  if (code >= 48 && code <= 57) return `Digit ${String.fromCharCode(code)}`;
  return `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
}

export default function CharacterMap({ windowId }: AppComponentProps) {
  const [selectedChar, setSelectedChar] = useState<number | null>(null);
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [copiedText, setCopiedText] = useState('');

  const characters = useMemo(() => {
    const chars: number[] = [];
    for (let i = 32; i <= 127; i++) chars.push(i);
    for (let i = 160; i <= 255; i++) chars.push(i);
    chars.push(8364, 8482, 8226, 8230, 8211, 8212, 8216, 8217, 8220, 8221);
    return chars;
  }, []);

  const handleCopy = () => {
    if (selectedChar !== null) {
      const text = copiedText + String.fromCharCode(selectedChar);
      setCopiedText(text);
      navigator.clipboard?.writeText(text);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] p-2 gap-2">
      {/* Font selector */}
      <div className="flex items-center gap-2">
        <label>Font:</label>
        <select
          value={selectedFont}
          onChange={e => setSelectedFont(e.target.value)}
          className="flex-1 h-[20px] text-[11px] border border-solid border-[var(--win98-button-shadow)] bg-white px-1 font-[family-name:var(--win98-font)]"
        >
          {fonts.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Character grid */}
      <div className="flex-1 overflow-auto bg-white border-2 border-solid border-[var(--win98-button-shadow)] min-h-0">
        <div className="grid grid-cols-[repeat(16,1fr)]" style={{ fontFamily: selectedFont }}>
          {characters.map(code => (
            <button
              key={code}
              onClick={() => setSelectedChar(code)}
              onDoubleClick={() => { setSelectedChar(code); handleCopy(); }}
              className={`aspect-square flex items-center justify-center text-[14px] border border-solid cursor-default
                ${selectedChar === code
                  ? 'bg-[var(--win98-hilight)] text-[var(--win98-hilight-text)] border-[var(--win98-hilight)] text-[20px] z-10 relative shadow-md'
                  : 'border-gray-200 hover:border-gray-400'
                }
              `}
            >
              {String.fromCharCode(code)}
            </button>
          ))}
        </div>
      </div>

      {/* Enlarged preview & copy area */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <label>Characters to copy:</label>
          <input
            type="text"
            value={copiedText}
            onChange={e => setCopiedText(e.target.value)}
            className="flex-1 h-[20px] text-[11px] border border-solid border-[var(--win98-button-shadow)] bg-white px-1"
          />
        </div>
        <button
          onClick={() => { if (selectedChar !== null) setCopiedText(prev => prev + String.fromCharCode(selectedChar)); }}
          className="px-3 h-[22px] text-[11px] cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
        >
          Select
        </button>
        <button
          onClick={() => { navigator.clipboard?.writeText(copiedText); }}
          className="px-3 h-[22px] text-[11px] cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
        >
          Copy
        </button>
      </div>

      {/* Status bar */}
      <div className="border border-solid border-[var(--win98-button-shadow)] px-1 text-[10px] py-[1px]">
        {selectedChar !== null
          ? `${getCharName(selectedChar)} (U+${selectedChar.toString(16).toUpperCase().padStart(4, '0')})`
          : 'Select a character'
        }
      </div>
    </div>
  );
}
