'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';

const discFiles = [
  { name: 'My Documents', size: '12.4 MB', type: 'Folder' },
  { name: 'vacation_photos', size: '145.2 MB', type: 'Folder' },
  { name: 'backup_march99.zip', size: '89.7 MB', type: 'ZIP Archive' },
  { name: 'music_collection', size: '234.1 MB', type: 'Folder' },
  { name: 'system_drivers.cab', size: '45.8 MB', type: 'CAB Archive' },
];

const browserFiles = [
  { name: 'C:\\', type: 'Drive', size: '' },
  { name: 'My Documents', type: 'Folder', size: '12.4 MB' },
  { name: 'Program Files', type: 'Folder', size: '' },
  { name: 'Windows', type: 'Folder', size: '' },
  { name: 'TEMP', type: 'Folder', size: '' },
];

export default function NeroBurningROM({ windowId }: AppComponentProps) {
  const [burning, setBurning] = useState(false);
  const [burnProgress, setBurnProgress] = useState(0);
  const [selectedDisc, setSelectedDisc] = useState<number | null>(null);

  const totalUsed = 527.2;
  const discCapacity = 650;
  const usagePercent = (totalUsed / discCapacity) * 100;

  const handleBurn = useCallback(() => {
    setBurning(true);
    setBurnProgress(0);
  }, []);

  useEffect(() => {
    if (!burning) return;
    const interval = setInterval(() => {
      setBurnProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          window.dispatchEvent(new CustomEvent('win98-bsod', {
            detail: { message: 'NERO_BURN_ENGINE_FAILURE' }
          }));
          return 100;
        }
        return prev + 2;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [burning]);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Menu bar */}
      <div className="flex gap-4 px-2 py-[2px] border-b border-[var(--win98-button-shadow)]">
        <span className="cursor-default"><u>F</u>ile</span>
        <span className="cursor-default"><u>E</u>dit</span>
        <span className="cursor-default"><u>V</u>iew</span>
        <span className="cursor-default"><u>R</u>ecorder</span>
        <span className="cursor-default"><u>H</u>elp</span>
      </div>

      {/* Toolbar */}
      <div className="flex gap-1 px-2 py-1 border-b border-[var(--win98-button-shadow)]">
        <button className="px-2 h-[22px] text-[11px] cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]">
          New Compilation
        </button>
        <button className="px-2 h-[22px] text-[11px] cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]">
          Open
        </button>
        <button className="px-2 h-[22px] text-[11px] cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]">
          Save
        </button>
        <div className="w-px bg-[var(--win98-button-shadow)] mx-1" />
        <button
          onClick={handleBurn}
          disabled={burning}
          className="px-3 h-[22px] text-[11px] cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] font-bold disabled:text-[var(--win98-button-shadow)]"
        >
          🔥 Burn
        </button>
      </div>

      {/* Main content - split panels */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel - disc layout */}
        <div className="w-1/2 flex flex-col border-r border-[var(--win98-button-shadow)]">
          <div className="px-2 py-1 bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] font-bold text-[10px]">
            💿 ISO1 - Disc Layout
          </div>
          <div className="flex-1 overflow-auto bg-white">
            {discFiles.map((file, i) => (
              <div
                key={file.name}
                className={`flex items-center px-2 py-[2px] cursor-default ${selectedDisc === i ? 'bg-[var(--win98-hilight)] text-[var(--win98-hilight-text)]' : ''}`}
                onClick={() => setSelectedDisc(i)}
              >
                <span className="mr-1">{file.type === 'Folder' ? '📁' : '📄'}</span>
                <span className="flex-1">{file.name}</span>
                <span className="text-[10px] text-right">{file.size}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel - file browser */}
        <div className="w-1/2 flex flex-col">
          <div className="px-2 py-1 bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] font-bold text-[10px]">
            📁 File Browser
          </div>
          <div className="flex-1 overflow-auto bg-white">
            {browserFiles.map(file => (
              <div key={file.name} className="flex items-center px-2 py-[2px] cursor-default hover:bg-[var(--win98-hilight)] hover:text-[var(--win98-hilight-text)]">
                <span className="mr-1">{file.type === 'Drive' ? '💾' : '📁'}</span>
                <span className="flex-1">{file.name}</span>
                <span className="text-[10px]">{file.size}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Burn progress (when active) */}
      {burning && (
        <div className="px-2 py-2 border-t border-[var(--win98-button-shadow)]">
          <div className="text-[11px] mb-1">
            Writing track 1 of 1... {burnProgress}%
          </div>
          <div className="h-4 border border-solid border-[var(--win98-button-shadow)] bg-white">
            <div
              className="h-full bg-[var(--win98-hilight)] transition-all"
              style={{ width: `${burnProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Capacity bar */}
      <div className="px-2 py-1 border-t border-[var(--win98-button-highlight)]">
        <div className="flex items-center gap-2 text-[10px]">
          <span>Used: {totalUsed} MB</span>
          <div className="flex-1 h-3 border border-solid border-[var(--win98-button-shadow)] bg-white relative">
            <div
              className={`h-full ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 75 ? 'bg-yellow-500' : 'bg-[var(--win98-hilight)]'}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <span>{discCapacity} MB</span>
        </div>
      </div>
    </div>
  );
}
