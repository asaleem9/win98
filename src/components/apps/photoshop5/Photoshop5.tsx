'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';

const MENU_ITEMS = ['File', 'Edit', 'Image', 'Layer', 'Select', 'Filter', 'View', 'Window', 'Help'];

const TOOLS = [
  { icon: '⬚', label: 'Marquee' },
  { icon: '➔', label: 'Move' },
  { icon: '◇', label: 'Lasso' },
  { icon: '✦', label: 'Magic Wand' },
  { icon: '⬒', label: 'Crop' },
  { icon: 'T', label: 'Type' },
  { icon: '◐', label: 'Gradient' },
  { icon: '🖌', label: 'Brush' },
  { icon: '✎', label: 'Pencil' },
  { icon: '🔲', label: 'Eraser' },
  { icon: '🪣', label: 'Paint Bucket' },
  { icon: '💧', label: 'Blur' },
  { icon: '👆', label: 'Smudge' },
  { icon: '🔍', label: 'Zoom' },
  { icon: '✋', label: 'Hand' },
  { icon: '💉', label: 'Eyedropper' },
];

const FILTERS = ['Blur', 'Gaussian Blur', 'Sharpen', 'Noise', 'Pixelate', 'Distort', 'Render', 'Stylize'];

const LAYERS = [
  { name: 'Background', visible: true, locked: true },
];

export default function Photoshop5({ windowId }: AppComponentProps) {
  const [selectedTool, setSelectedTool] = useState(1);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [activePanel, setActivePanel] = useState<'layers' | 'history' | 'color'>('layers');

  const handleFilterClick = () => {
    setActiveMenu(null);
    setShowError(true);
  };

  return (
    <div className="flex flex-col h-full text-[11px] select-none" style={{ backgroundColor: '#535353', color: '#c0c0c0', fontFamily: 'var(--win98-font)' }} data-window-id={windowId}>
      {/* Menu Bar */}
      <div className="flex items-center h-[20px] px-1" style={{ backgroundColor: '#c0c0c0', color: '#000', borderBottom: '1px solid #808080' }}>
        {MENU_ITEMS.map((item) => (
          <div key={item} className="relative">
            <button
              className={`px-2 h-[18px] ${activeMenu === item ? 'bg-[#000080] text-white' : 'hover:bg-[#000080] hover:text-white'}`}
              onClick={() => setActiveMenu(activeMenu === item ? null : item)}
              onMouseEnter={() => activeMenu && setActiveMenu(item)}
            >
              {item}
            </button>
            {activeMenu === item && item === 'Filter' && (
              <div className="absolute top-full left-0 z-50 win98-menu min-w-[180px]" style={{ backgroundColor: '#c0c0c0', color: '#000' }}>
                {FILTERS.map((f) => (
                  <div key={f} className="win98-menu-item" onClick={handleFilterClick}>{f}...</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Options bar */}
      <div className="h-[24px] flex items-center px-2 gap-2" style={{ backgroundColor: '#c0c0c0', borderBottom: '1px solid #808080', color: '#000' }}>
        <span className="text-[10px]">Brush:</span>
        <div className="w-[40px] h-[14px] win98-sunken bg-white flex items-center px-1 text-[10px]">13</div>
        <span className="text-[10px]">Mode:</span>
        <select className="h-[16px] win98-sunken bg-white text-[10px] px-1">
          <option>Normal</option>
          <option>Dissolve</option>
          <option>Multiply</option>
          <option>Screen</option>
        </select>
        <span className="text-[10px]">Opacity:</span>
        <div className="w-[40px] h-[14px] win98-sunken bg-white flex items-center px-1 text-[10px]">100%</div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Tool palette */}
        <div className="w-[52px] flex flex-col items-center py-1 gap-0 flex-shrink-0" style={{ backgroundColor: '#c0c0c0', borderRight: '1px solid #808080' }}>
          <div className="grid grid-cols-2 gap-[1px] p-[2px]">
            {TOOLS.map((tool, i) => (
              <button
                key={i}
                className={`w-[22px] h-[22px] flex items-center justify-center text-[12px] ${
                  selectedTool === i
                    ? 'bg-[#a0a0a0] border border-[#808080] border-r-[#ffffff] border-b-[#ffffff]'
                    : 'border border-transparent hover:border-[#ffffff] hover:border-r-[#808080] hover:border-b-[#808080]'
                }`}
                style={{ color: '#000' }}
                onClick={() => setSelectedTool(i)}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* Color swatches */}
          <div className="relative mt-2 w-[36px] h-[36px]">
            <div
              className="absolute bottom-0 right-0 w-[22px] h-[22px] border border-[#808080]"
              style={{ backgroundColor: bgColor }}
              onClick={() => setBgColor(bgColor)}
            />
            <div
              className="absolute top-0 left-0 w-[22px] h-[22px] border border-[#808080]"
              style={{ backgroundColor: fgColor }}
              onClick={() => setFgColor(fgColor)}
            />
            {/* Swap icon */}
            <button
              className="absolute top-[-2px] right-[-2px] text-[8px]"
              style={{ color: '#000' }}
              onClick={() => { setFgColor(bgColor); setBgColor(fgColor); }}
            >
              ⇄
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto flex items-center justify-center" style={{ backgroundColor: '#535353' }}>
          <div className="relative">
            {/* Canvas title bar */}
            <div className="h-[18px] flex items-center px-2 text-[10px] font-bold" style={{ backgroundColor: '#000080', color: '#fff' }}>
              Untitled-1 @ 100% (RGB)
            </div>
            {/* White canvas */}
            <div
              className="bg-white border border-[#000]"
              style={{ width: '400px', height: '300px', cursor: 'crosshair' }}
            />
          </div>
        </div>

        {/* Right panels */}
        <div className="w-[180px] flex flex-col flex-shrink-0" style={{ backgroundColor: '#c0c0c0', borderLeft: '1px solid #808080' }}>
          {/* Navigator / Info */}
          <div className="border-b border-[#808080]">
            <div className="h-[18px] flex items-center px-2 text-[10px] font-bold" style={{ backgroundColor: '#000080', color: '#fff' }}>
              Navigator
            </div>
            <div className="h-[80px] flex items-center justify-center" style={{ backgroundColor: '#535353' }}>
              <div className="w-[60px] h-[45px] bg-white border border-red-500" />
            </div>
          </div>

          {/* Color / Swatches / Brushes panel tabs */}
          <div className="border-b border-[#808080]">
            <div className="flex" style={{ borderBottom: '1px solid #808080' }}>
              <button
                className={`px-2 py-[1px] text-[10px] ${activePanel === 'color' ? 'font-bold bg-[#c0c0c0]' : 'bg-[#a0a0a0]'}`}
                onClick={() => setActivePanel('color')}
                style={{ color: '#000' }}
              >
                Color
              </button>
              <button className="px-2 py-[1px] text-[10px] bg-[#a0a0a0]" style={{ color: '#000' }}>Swatches</button>
              <button className="px-2 py-[1px] text-[10px] bg-[#a0a0a0]" style={{ color: '#000' }}>Brushes</button>
            </div>
            {activePanel === 'color' && (
              <div className="p-2 space-y-1">
                {['R', 'G', 'B'].map((ch, i) => (
                  <div key={ch} className="flex items-center gap-1 text-[10px]" style={{ color: '#000' }}>
                    <span className="w-[10px]">{ch}:</span>
                    <div className="flex-1 h-[8px] bg-gradient-to-r from-black" style={{ backgroundImage: `linear-gradient(to right, black, ${ch === 'R' ? 'red' : ch === 'G' ? 'lime' : 'blue'})` }} />
                    <span className="w-[20px] text-right">{i === 0 ? '0' : '0'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Layers / Channels / Paths */}
          <div className="flex-1 flex flex-col">
            <div className="flex" style={{ borderBottom: '1px solid #808080' }}>
              <button
                className={`px-2 py-[1px] text-[10px] ${activePanel === 'layers' ? 'font-bold bg-[#c0c0c0]' : 'bg-[#a0a0a0]'}`}
                onClick={() => setActivePanel('layers')}
                style={{ color: '#000' }}
              >
                Layers
              </button>
              <button className="px-2 py-[1px] text-[10px] bg-[#a0a0a0]" style={{ color: '#000' }}>Channels</button>
              <button className="px-2 py-[1px] text-[10px] bg-[#a0a0a0]" style={{ color: '#000' }}>Paths</button>
            </div>
            <div className="flex items-center gap-1 px-1 py-[2px]" style={{ borderBottom: '1px solid #808080', color: '#000' }}>
              <span className="text-[10px]">Opacity:</span>
              <div className="win98-sunken bg-white h-[14px] flex-1 flex items-center px-1 text-[10px]">100%</div>
            </div>
            <div className="flex-1 bg-white overflow-auto" style={{ color: '#000' }}>
              {LAYERS.map((layer, i) => (
                <div key={i} className="flex items-center gap-1 px-1 py-[2px] bg-[#000080] text-white text-[10px]">
                  <span>{layer.visible ? '👁' : '  '}</span>
                  <div className="w-[24px] h-[18px] bg-white border border-[#808080]" />
                  <span className="flex-1">{layer.name}</span>
                  {layer.locked && <span>🔒</span>}
                </div>
              ))}
            </div>
            {/* Layer buttons */}
            <div className="flex items-center gap-[1px] p-[2px]" style={{ borderTop: '1px solid #808080', color: '#000' }}>
              <button className="w-[20px] h-[18px] win98-raised text-[10px] flex items-center justify-center">📄</button>
              <button className="w-[20px] h-[18px] win98-raised text-[10px] flex items-center justify-center">📁</button>
              <button className="w-[20px] h-[18px] win98-raised text-[10px] flex items-center justify-center">🗑</button>
            </div>
          </div>

          {/* History */}
          <div className="h-[80px] border-t border-[#808080]">
            <div className="flex" style={{ borderBottom: '1px solid #808080' }}>
              <button
                className={`px-2 py-[1px] text-[10px] ${activePanel === 'history' ? 'font-bold bg-[#c0c0c0]' : 'bg-[#a0a0a0]'}`}
                onClick={() => setActivePanel('history')}
                style={{ color: '#000' }}
              >
                History
              </button>
              <button className="px-2 py-[1px] text-[10px] bg-[#a0a0a0]" style={{ color: '#000' }}>Actions</button>
            </div>
            <div className="bg-white flex-1 p-1 text-[10px]" style={{ color: '#000' }}>
              <div className="bg-[#000080] text-white px-1">New</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-[20px] flex items-center px-1" style={{ backgroundColor: '#c0c0c0', borderTop: '1px solid #fff', color: '#000' }}>
        <span className="win98-sunken px-2 py-0 flex-1">Doc: 351K/351K</span>
      </div>

      {/* Error Dialog */}
      {showError && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
          <div className="win98-window p-0 w-[350px]" style={{ backgroundColor: '#c0c0c0' }}>
            <div className="win98-titlebar px-2">
              <span className="flex-1 text-[11px] font-bold text-white">Adobe Photoshop</span>
            </div>
            <div className="p-4 flex gap-3 items-start" style={{ color: '#000' }}>
              <span className="text-[24px]">⚠️</span>
              <p className="text-[11px] leading-relaxed">Could not complete the Filter command because of a program error.</p>
            </div>
            <div className="flex justify-center pb-3">
              <button className="win98-raised px-6 py-1 text-[11px]" style={{ color: '#000' }} onClick={() => setShowError(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
