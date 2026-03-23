'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';

const MENU_ITEMS = ['File', 'Edit', 'View', 'Insert', 'Modify', 'Text', 'Control', 'Window', 'Help'];

const TOOLS = [
  { icon: '➔', label: 'Arrow' },
  { icon: '⬚', label: 'Subselect' },
  { icon: '━', label: 'Line' },
  { icon: '∅', label: 'Lasso' },
  { icon: '✎', label: 'Pen' },
  { icon: 'T', label: 'Text' },
  { icon: '○', label: 'Oval' },
  { icon: '▭', label: 'Rectangle' },
  { icon: '✏', label: 'Pencil' },
  { icon: '🖌', label: 'Brush' },
  { icon: '🪣', label: 'Paint Bucket' },
  { icon: '🔲', label: 'Eraser' },
  { icon: '💉', label: 'Dropper' },
  { icon: '✋', label: 'Hand' },
  { icon: '🔍', label: 'Zoom' },
];

const TOTAL_FRAMES = 60;

export default function MacromediaFlash({ windowId }: AppComponentProps) {
  const [selectedTool, setSelectedTool] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [selectedLayer, setSelectedLayer] = useState(0);

  const layers = [
    { name: 'Layer 1', visible: true, locked: false },
  ];

  return (
    <div className="flex flex-col h-full text-[11px] select-none" style={{ backgroundColor: '#d4d0c8', color: '#000', fontFamily: 'var(--win98-font)' }} data-window-id={windowId}>
      {/* Menu Bar */}
      <div className="flex items-center h-[20px] px-1 border-b border-[#808080]" style={{ backgroundColor: '#d4d0c8' }}>
        {MENU_ITEMS.map((item) => (
          <button key={item} className="px-2 h-[18px] hover:bg-[#000080] hover:text-white">
            {item}
          </button>
        ))}
      </div>

      {/* Toolbar row */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[#808080]">
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">📄</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">📂</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">💾</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[#808080] border-r border-r-white" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">▶</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">⏹</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[#808080] border-r border-r-white" />
        <span className="text-[10px] ml-1">100%</span>
      </div>

      {/* Timeline */}
      <div className="border-b border-[#808080]" style={{ backgroundColor: '#d4d0c8' }}>
        <div className="flex">
          {/* Layer list area */}
          <div className="w-[150px] border-r border-[#808080]">
            <div className="h-[18px] flex items-center px-2 text-[10px] font-bold border-b border-[#808080]" style={{ backgroundColor: '#c0c0c0' }}>
              Timeline
            </div>
            {layers.map((layer, i) => (
              <div
                key={i}
                className={`h-[20px] flex items-center px-1 gap-1 border-b border-[#c0c0c0] cursor-pointer text-[10px] ${
                  selectedLayer === i ? 'bg-[#000080] text-white' : ''
                }`}
                onClick={() => setSelectedLayer(i)}
              >
                <span className="text-[8px]">{layer.visible ? '👁' : '  '}</span>
                <span className="text-[8px]">{layer.locked ? '🔒' : '  '}</span>
                <span className="flex-1 truncate">{layer.name}</span>
              </div>
            ))}
            {/* Add layer button */}
            <div className="h-[20px] flex items-center px-1 gap-1 border-b border-[#c0c0c0]">
              <button className="text-[10px] hover:underline">+ Add Layer</button>
            </div>
          </div>

          {/* Frames area */}
          <div className="flex-1 overflow-x-auto">
            {/* Frame numbers */}
            <div className="h-[18px] flex items-end border-b border-[#808080]" style={{ backgroundColor: '#c0c0c0' }}>
              {Array.from({ length: TOTAL_FRAMES }, (_, i) => (
                <div
                  key={i}
                  className="w-[10px] flex-shrink-0 flex items-center justify-center"
                >
                  {(i + 1) % 5 === 0 && (
                    <span className="text-[7px]">{i + 1}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Layer frames */}
            {layers.map((_, li) => (
              <div key={li} className="h-[20px] flex border-b border-[#c0c0c0]">
                {Array.from({ length: TOTAL_FRAMES }, (_, fi) => (
                  <div
                    key={fi}
                    className={`w-[10px] h-full flex-shrink-0 border-r cursor-pointer ${
                      fi + 1 === currentFrame ? 'bg-[#ff6666]' : fi === 0 ? 'bg-[#c8c8c8]' : ''
                    } ${(fi + 1) % 5 === 0 ? 'border-r-[#808080]' : 'border-r-[#d0d0d0]'}`}
                    onClick={() => setCurrentFrame(fi + 1)}
                  >
                    {fi === 0 && (
                      <div className="w-[4px] h-[4px] bg-black rounded-full mx-auto mt-[7px]" />
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* Playhead indicator */}
            <div className="h-[4px] relative" style={{ backgroundColor: '#d4d0c8' }}>
              <div
                className="absolute top-0 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-red-500"
                style={{ left: `${(currentFrame - 1) * 10 + 3}px` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Tools panel */}
        <div className="w-[36px] flex-shrink-0 border-r border-[#808080] py-1" style={{ backgroundColor: '#d4d0c8' }}>
          <div className="grid grid-cols-2 gap-[1px] px-[2px]">
            {TOOLS.map((tool, i) => (
              <button
                key={i}
                className={`w-[15px] h-[15px] flex items-center justify-center text-[10px] ${
                  selectedTool === i
                    ? 'bg-[#a0a0a0] border border-[#808080] border-r-white border-b-white'
                    : 'border border-transparent hover:border-white hover:border-r-[#808080] hover:border-b-[#808080]'
                }`}
                onClick={() => setSelectedTool(i)}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* Colors */}
          <div className="mt-2 flex flex-col items-center gap-1">
            <div className="relative w-[24px] h-[24px]">
              <div className="absolute bottom-0 right-0 w-[14px] h-[14px] border border-[#808080] bg-white" />
              <div className="absolute top-0 left-0 w-[14px] h-[14px] border border-[#808080] bg-black" />
            </div>
          </div>
        </div>

        {/* Stage (canvas) */}
        <div className="flex-1 overflow-auto flex items-center justify-center" style={{ backgroundColor: '#808080' }}>
          <div className="bg-white border border-[#000]" style={{ width: '550px', height: '400px' }}>
            {/* Empty stage */}
          </div>
        </div>

        {/* Library panel */}
        <div className="w-[160px] flex-shrink-0 flex flex-col border-l border-[#808080]" style={{ backgroundColor: '#d4d0c8' }}>
          <div className="h-[18px] flex items-center px-2 text-[10px] font-bold border-b border-[#808080]" style={{ backgroundColor: '#000080', color: '#fff' }}>
            Library
          </div>
          <div className="flex-1 bg-white p-1 text-[10px]">
            <div className="text-[#808080] text-center mt-4">No items in library</div>
          </div>
          {/* Library preview */}
          <div className="h-[80px] border-t border-[#808080] flex items-center justify-center bg-white">
            <span className="text-[10px] text-[#808080]">Preview</span>
          </div>
        </div>
      </div>

      {/* Properties panel */}
      <div className="h-[60px] border-t border-[#808080] flex" style={{ backgroundColor: '#d4d0c8' }}>
        <div className="flex-1 p-1">
          <div className="text-[10px] font-bold mb-1">Properties</div>
          <div className="flex gap-4 text-[10px]">
            <div className="flex gap-1 items-center">
              <span>W:</span>
              <div className="win98-sunken bg-white h-[14px] w-[40px] px-1">550</div>
            </div>
            <div className="flex gap-1 items-center">
              <span>H:</span>
              <div className="win98-sunken bg-white h-[14px] w-[40px] px-1">400</div>
            </div>
            <div className="flex gap-1 items-center">
              <span>FPS:</span>
              <div className="win98-sunken bg-white h-[14px] w-[30px] px-1">12</div>
            </div>
            <div className="flex gap-1 items-center">
              <span>Frame:</span>
              <span>{currentFrame}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-[20px] flex items-center px-1 border-t border-white">
        <span className="win98-sunken px-2 py-0 flex-1">Frame {currentFrame} / {TOTAL_FRAMES}</span>
        <span className="win98-sunken px-2 py-0 w-[100px]">12.0 fps</span>
      </div>
    </div>
  );
}
