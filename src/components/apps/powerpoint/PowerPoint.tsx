'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';

const MENU_ITEMS = ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Slide Show', 'Window', 'Help'];

const SLIDES = [
  {
    title: 'Welcome to Windows 98',
    bullets: [
      'Faster and more reliable than ever',
      'True plug-and-play support',
      'Internet Explorer 5 included',
      'Windows Media Player built-in',
      'FAT32 support for large drives',
    ],
  },
];

export default function PowerPoint({ windowId }: AppComponentProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeView, setActiveView] = useState<'normal' | 'outline' | 'sorter'>('normal');
  const slide = SLIDES[currentSlide];

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
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px] font-bold">A</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">▭</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">○</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">△</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">⬡</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">▶</button>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Slide thumbnail sidebar */}
        <div className="w-[120px] bg-[var(--win98-button-face)] border-r-2 border-r-[var(--win98-button-shadow)] overflow-y-auto p-2 flex flex-col gap-2">
          {/* View mode tabs */}
          <div className="flex gap-0 mb-1">
            <button
              className={`px-1 text-[9px] ${activeView === 'normal' ? 'win98-flat-sunken' : 'border border-transparent hover:win98-flat-raised'}`}
              onClick={() => setActiveView('normal')}
            >
              📄
            </button>
            <button
              className={`px-1 text-[9px] ${activeView === 'outline' ? 'win98-flat-sunken' : 'border border-transparent hover:win98-flat-raised'}`}
              onClick={() => setActiveView('outline')}
            >
              📝
            </button>
            <button
              className={`px-1 text-[9px] ${activeView === 'sorter' ? 'win98-flat-sunken' : 'border border-transparent hover:win98-flat-raised'}`}
              onClick={() => setActiveView('sorter')}
            >
              📊
            </button>
          </div>

          {SLIDES.map((s, i) => (
            <div
              key={i}
              className={`border-2 cursor-pointer ${
                i === currentSlide ? 'border-[#000080]' : 'border-[var(--win98-button-shadow)]'
              }`}
              onClick={() => setCurrentSlide(i)}
            >
              {/* Mini slide preview */}
              <div className="bg-white aspect-[4/3] p-1 flex flex-col">
                <div className="text-[6px] font-bold text-[#000080] text-center mb-[2px]">{s.title}</div>
                {s.bullets.slice(0, 3).map((b, j) => (
                  <div key={j} className="text-[4px] text-black pl-1">• {b}</div>
                ))}
              </div>
              <div className="text-center text-[9px] py-[1px] bg-[var(--win98-button-face)]">{i + 1}</div>
            </div>
          ))}
        </div>

        {/* Slide editing area */}
        <div className="flex-1 bg-[#808080] flex items-center justify-center overflow-auto p-4">
          <div className="bg-white shadow-lg border border-[var(--win98-button-shadow)]" style={{ width: '480px', height: '360px', position: 'relative' }}>
            {/* Slide content */}
            <div className="absolute inset-0 flex flex-col p-6">
              {/* Title */}
              <div
                className="text-[24px] font-bold text-[#000080] text-center mb-4 border border-dashed border-transparent hover:border-[#808080] px-2 py-1"
                contentEditable
                suppressContentEditableWarning
              >
                {slide.title}
              </div>

              {/* Horizontal rule */}
              <div className="h-[2px] bg-[#000080] mb-4 mx-4" />

              {/* Bullet points */}
              <div className="flex-1 px-4">
                {slide.bullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-2 mb-2">
                    <span className="text-[#000080] text-[14px] mt-[2px]">•</span>
                    <span
                      className="text-[14px] text-black border border-dashed border-transparent hover:border-[#808080] flex-1 px-1"
                      contentEditable
                      suppressContentEditableWarning
                    >
                      {bullet}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer placeholder */}
              <div className="text-[10px] text-[#808080] text-center mt-2">
                Click to add notes
              </div>
            </div>

            {/* Resize handles */}
            <div className="absolute top-0 left-0 w-2 h-2 bg-white border border-black cursor-nw-resize" />
            <div className="absolute top-0 right-0 w-2 h-2 bg-white border border-black cursor-ne-resize" />
            <div className="absolute bottom-0 left-0 w-2 h-2 bg-white border border-black cursor-sw-resize" />
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-white border border-black cursor-se-resize" />
          </div>
        </div>
      </div>

      {/* Notes pane */}
      <div className="h-[60px] border-t-2 border-[var(--win98-button-highlight)] flex flex-col">
        <div className="text-[10px] px-2 py-[1px] bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)]">Notes:</div>
        <div className="flex-1 bg-white px-2 py-1 text-[11px]" contentEditable suppressContentEditableWarning />
      </div>

      {/* Status Bar */}
      <div className="flex items-center h-[20px] px-1 border-t border-[var(--win98-button-highlight)]">
        <span className="win98-sunken px-2 py-0 flex-1">Slide {currentSlide + 1} of {SLIDES.length}</span>
        <span className="win98-sunken px-2 py-0 w-[120px]">Default Design</span>
      </div>
    </div>
  );
}
