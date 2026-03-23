'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';

const MENU_ITEMS = ['File', 'Edit', 'View', 'Project', 'Format', 'Debug', 'Run', 'Tools', 'Add-Ins', 'Window', 'Help'];

const TOOLBOX_ITEMS = [
  { icon: '➔', label: 'Pointer' },
  { icon: 'A', label: 'Label' },
  { icon: '⬚', label: 'Frame' },
  { icon: '☑', label: 'CheckBox' },
  { icon: '◉', label: 'ComboBox' },
  { icon: '⏱', label: 'Timer' },
  { icon: '▤', label: 'DirListBox' },
  { icon: '═', label: 'HScrollBar' },
  { icon: '📋', label: 'OLE' },
  { icon: 'ab|', label: 'TextBox' },
  { icon: '▭', label: 'CommandButton' },
  { icon: '○', label: 'OptionButton' },
  { icon: '☰', label: 'ListBox' },
  { icon: '║', label: 'VScrollBar' },
  { icon: '🎯', label: 'DriveListBox' },
  { icon: '▥', label: 'FileListBox' },
  { icon: '━', label: 'Line' },
  { icon: '▮', label: 'Shape' },
  { icon: '🖼', label: 'Image' },
  { icon: '📊', label: 'Data' },
];

const PROPERTIES = [
  { name: '(Name)', value: 'Form1' },
  { name: 'BackColor', value: '&H8000000F&' },
  { name: 'BorderStyle', value: '2 - Sizable' },
  { name: 'Caption', value: 'Form1' },
  { name: 'Enabled', value: 'True' },
  { name: 'Font', value: 'MS Sans Serif' },
  { name: 'Height', value: '3600' },
  { name: 'Left', value: '0' },
  { name: 'ScaleMode', value: '1 - Twip' },
  { name: 'StartUpPosition', value: '3 - Windows Default' },
  { name: 'Top', value: '0' },
  { name: 'Visible', value: 'True' },
  { name: 'Width', value: '4800' },
];

export default function VisualBasic6({ windowId }: AppComponentProps) {
  const [selectedTool, setSelectedTool] = useState(0);
  const [activeView, setActiveView] = useState<'design' | 'code'>('design');
  const [showError, setShowError] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(0);

  const handleRun = () => {
    setShowError(true);
  };

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
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">📁</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">💾</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">✂</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">📋</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[14px]" onClick={handleRun} title="Run (F5)">▶</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Break">⏸</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Stop">⏹</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button
          className={`w-[23px] h-[22px] flex items-center justify-center text-[11px] ${activeView === 'design' ? 'win98-flat-sunken' : 'border border-transparent hover:win98-flat-raised'}`}
          onClick={() => setActiveView('design')}
          title="Object"
        >
          🖼
        </button>
        <button
          className={`w-[23px] h-[22px] flex items-center justify-center text-[11px] ${activeView === 'code' ? 'win98-flat-sunken' : 'border border-transparent hover:win98-flat-raised'}`}
          onClick={() => setActiveView('code')}
          title="View Code"
        >
          📝
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toolbox */}
        <div className="w-[50px] flex-shrink-0 border-r border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)]">
          <div className="h-[16px] flex items-center justify-center text-[9px] font-bold border-b border-[var(--win98-button-shadow)]">
            General
          </div>
          <div className="grid grid-cols-2 gap-[1px] p-[2px]">
            {TOOLBOX_ITEMS.map((tool, i) => (
              <button
                key={i}
                className={`w-[22px] h-[22px] flex items-center justify-center text-[11px] ${
                  selectedTool === i
                    ? 'win98-pressed bg-[var(--win98-button-face)]'
                    : 'win98-raised bg-[var(--win98-button-face)]'
                }`}
                onClick={() => setSelectedTool(i)}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Form designer or code editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeView === 'design' ? (
            /* Form Designer */
            <div className="flex-1 overflow-auto" style={{ backgroundColor: '#808080' }}>
              <div className="p-4">
                {/* Form window */}
                <div className="win98-window inline-block">
                  <div className="win98-titlebar px-2">
                    <span className="text-[11px] font-bold text-white flex-1">Form1</span>
                    <div className="flex gap-[2px]">
                      <button className="win98-title-button text-[8px]">_</button>
                      <button className="win98-title-button text-[8px]">□</button>
                      <button className="win98-title-button text-[8px]">×</button>
                    </div>
                  </div>

                  {/* Form canvas with grid dots */}
                  <div
                    className="relative"
                    style={{
                      width: '320px',
                      height: '240px',
                      backgroundColor: '#c0c0c0',
                      backgroundImage: 'radial-gradient(circle, #000 0.5px, transparent 0.5px)',
                      backgroundSize: '8px 8px',
                    }}
                  >
                    {/* Command button on the form */}
                    <div
                      className="absolute win98-raised bg-[var(--win98-button-face)] flex items-center justify-center cursor-move"
                      style={{
                        left: '100px',
                        top: '100px',
                        width: '120px',
                        height: '32px',
                      }}
                    >
                      <span>Command1</span>
                      {/* Selection handles */}
                      <div className="absolute -top-[3px] -left-[3px] w-[6px] h-[6px] bg-black" />
                      <div className="absolute -top-[3px] -right-[3px] w-[6px] h-[6px] bg-black" />
                      <div className="absolute -bottom-[3px] -left-[3px] w-[6px] h-[6px] bg-black" />
                      <div className="absolute -bottom-[3px] -right-[3px] w-[6px] h-[6px] bg-black" />
                      <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-[6px] h-[6px] bg-black" />
                      <div className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-[6px] h-[6px] bg-black" />
                      <div className="absolute top-1/2 -left-[3px] -translate-y-1/2 w-[6px] h-[6px] bg-black" />
                      <div className="absolute top-1/2 -right-[3px] -translate-y-1/2 w-[6px] h-[6px] bg-black" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Code Editor */
            <div className="flex-1 flex flex-col">
              {/* Object/Proc dropdowns */}
              <div className="flex items-center h-[22px] px-1 gap-1 bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)]">
                <select className="h-[18px] win98-sunken bg-white text-[11px] flex-1 px-1">
                  <option>Command1</option>
                  <option>(General)</option>
                  <option>Form</option>
                </select>
                <select className="h-[18px] win98-sunken bg-white text-[11px] flex-1 px-1">
                  <option>Click</option>
                  <option>DblClick</option>
                  <option>MouseDown</option>
                  <option>MouseUp</option>
                </select>
              </div>

              {/* Code area */}
              <div className="flex-1 overflow-auto bg-white">
                <pre className="p-2 text-[11px] font-[family-name:var(--win98-font-mono)] text-black whitespace-pre-wrap leading-relaxed">
                  <span className="text-[#0000ff]">Option</span> <span className="text-[#0000ff]">Explicit</span>{'\n'}
                  {'\n'}
                  <span className="text-[#0000ff]">Private Sub</span> Command1_Click(){'\n'}
                  {'    '}<span className="text-[#000000]">MsgBox</span> <span className="text-[#ff0000]">&quot;Hello, World!&quot;</span>, vbInformation, <span className="text-[#ff0000]">&quot;My Application&quot;</span>{'\n'}
                  <span className="text-[#0000ff]">End Sub</span>{'\n'}
                  {'\n'}
                  <span className="text-[#0000ff]">Private Sub</span> Form_Load(){'\n'}
                  {'    '}<span className="text-[#0000ff]">Me</span>.Caption = <span className="text-[#ff0000]">&quot;My First VB App&quot;</span>{'\n'}
                  {'    '}Command1.Caption = <span className="text-[#ff0000]">&quot;Click Me!&quot;</span>{'\n'}
                  <span className="text-[#0000ff]">End Sub</span>
                </pre>
              </div>
            </div>
          )}

          {/* Immediate Window */}
          <div className="h-[60px] border-t border-[var(--win98-button-shadow)]">
            <div className="h-[16px] bg-[var(--win98-titlebar-active-start)] text-white px-2 flex items-center text-[10px] font-bold">
              Immediate
            </div>
            <div className="bg-white h-[calc(100%-16px)] p-1 text-[11px] font-[family-name:var(--win98-font-mono)]" contentEditable suppressContentEditableWarning />
          </div>
        </div>

        {/* Right panels */}
        <div className="w-[180px] flex-shrink-0 flex flex-col border-l border-[var(--win98-button-shadow)]">
          {/* Project Explorer */}
          <div className="h-[120px] border-b border-[var(--win98-button-shadow)]">
            <div className="h-[16px] bg-[var(--win98-titlebar-active-start)] text-white px-2 flex items-center text-[10px] font-bold">
              Project - Project1
            </div>
            <div className="bg-white flex-1 p-1 text-[10px] h-[calc(100%-16px)] overflow-auto">
              <div className="flex items-center gap-1">
                <span>📁</span>
                <span className="font-bold">Project1 (Project1)</span>
              </div>
              <div className="flex items-center gap-1 pl-3">
                <span>📁</span>
                <span>Forms</span>
              </div>
              <div className="flex items-center gap-1 pl-6 bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]">
                <span>📄</span>
                <span>Form1 (Form1)</span>
              </div>
            </div>
          </div>

          {/* Properties Window */}
          <div className="flex-1 flex flex-col">
            <div className="h-[16px] bg-[var(--win98-titlebar-active-start)] text-white px-2 flex items-center text-[10px] font-bold">
              Properties - Form1
            </div>
            <div className="bg-[var(--win98-button-face)] px-1 py-[2px]">
              <select className="w-full h-[18px] win98-sunken bg-white text-[10px] px-1">
                <option>Form1 Form</option>
                <option>Command1 CommandButton</option>
              </select>
            </div>
            {/* Tab bar */}
            <div className="flex border-b border-[var(--win98-button-shadow)]">
              <button className="px-2 py-[1px] text-[10px] font-bold bg-[var(--win98-button-face)] border-t border-x border-[var(--win98-button-shadow)] relative -bottom-px">Alphabetic</button>
              <button className="px-2 py-[1px] text-[10px] bg-[#a0a0a0] border-t border-x border-[var(--win98-button-shadow)]">Categorized</button>
            </div>
            {/* Property grid */}
            <div className="flex-1 bg-white overflow-auto">
              {PROPERTIES.map((prop, i) => (
                <div
                  key={i}
                  className={`flex text-[10px] border-b border-[#c0c0c0] cursor-default ${
                    selectedProperty === i ? 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]' : ''
                  }`}
                  onClick={() => setSelectedProperty(i)}
                >
                  <div className="w-[80px] px-1 py-[1px] border-r border-[#c0c0c0] truncate">{prop.name}</div>
                  <div className="flex-1 px-1 py-[1px] truncate">{prop.value}</div>
                </div>
              ))}
            </div>
            {/* Property description */}
            <div className="h-[36px] border-t border-[var(--win98-button-shadow)] p-1 text-[10px]">
              <div className="font-bold">{PROPERTIES[selectedProperty]?.name}</div>
              <div className="text-[9px] text-[var(--win98-disabled-text)]">Returns/sets the text displayed in the title bar.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center h-[20px] px-1 border-t border-[var(--win98-button-highlight)]">
        <span className="win98-sunken px-2 py-0 flex-[2]">{activeView === 'design' ? 'Form1 - Form (Design)' : 'Form1 - Form (Code)'}</span>
        <span className="win98-sunken px-2 py-0 w-[80px]">3600 x 2400</span>
      </div>

      {/* Compile Error Dialog */}
      {showError && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
          <div className="win98-window p-0 w-[380px]">
            <div className="win98-titlebar px-2">
              <span className="flex-1 text-[11px] font-bold text-white">Microsoft Visual Basic</span>
            </div>
            <div className="p-4 flex gap-3 items-start bg-[var(--win98-button-face)]">
              <span className="text-[24px]">⛔</span>
              <div>
                <p className="text-[11px] font-bold mb-1">Compile error:</p>
                <p className="text-[11px]">Expected: end of statement</p>
              </div>
            </div>
            <div className="flex justify-center gap-2 pb-3 bg-[var(--win98-button-face)]">
              <button className="win98-raised px-6 py-1 text-[11px]" onClick={() => setShowError(false)}>OK</button>
              <button className="win98-raised px-4 py-1 text-[11px]" onClick={() => setShowError(false)}>Help</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
