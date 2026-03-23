'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { TabControl98 } from '@/components/ui/TabControl98';
import { Button98 } from '@/components/ui/Button98';
import { Select98 } from '@/components/ui/Select98';
import { cn } from '@/lib/cn';

const WALLPAPERS = [
  { id: 'none', name: '(None)', color: '#008080' },
  { id: 'setup', name: 'Setup', color: '#008080' },
  { id: 'clouds', name: 'Clouds', color: '#87CEEB' },
  { id: 'forest', name: 'Forest', color: '#228B22' },
  { id: 'metal-links', name: 'Metal Links', color: '#808080' },
  { id: 'straw-mat', name: 'Straw Mat', color: '#DAA520' },
  { id: 'houndstooth', name: 'Houndstooth', color: '#2F2F2F' },
  { id: 'tiles', name: 'Tiles', color: '#4682B4' },
];

const SCREENSAVERS = [
  { id: 'none', name: '(None)' },
  { id: 'starfield', name: 'Starfield Simulation' },
  { id: 'pipes', name: '3D Pipes' },
  { id: 'flying-windows', name: 'Flying Windows' },
];

const COLOR_SCHEMES = [
  { id: 'windows-standard', name: 'Windows Standard' },
  { id: 'high-contrast-black', name: 'High Contrast Black' },
  { id: 'high-contrast-white', name: 'High Contrast White' },
  { id: 'desert', name: 'Desert' },
  { id: 'eggplant', name: 'Eggplant' },
  { id: 'lilac', name: 'Lilac' },
  { id: 'maple', name: 'Maple' },
  { id: 'rainy-day', name: 'Rainy Day' },
  { id: 'rose', name: 'Rose' },
  { id: 'slate', name: 'Slate' },
  { id: 'storm', name: 'Storm' },
  { id: 'teal', name: 'Teal' },
];

function PreviewMonitor({ wallpaperColor }: { wallpaperColor: string }) {
  return (
    <div className="flex flex-col items-center">
      {/* Monitor frame */}
      <div
        className={cn(
          'w-[180px] h-[130px] bg-[#C0C0C0] rounded-t-md p-[10px]',
          'border-2 border-solid',
          'border-t-[#DFDFDF] border-l-[#DFDFDF]',
          'border-b-[#808080] border-r-[#808080]',
        )}
      >
        {/* Screen */}
        <div
          className={cn(
            'w-full h-full',
            'border-2 border-solid',
            'border-t-[#808080] border-l-[#808080]',
            'border-b-[#DFDFDF] border-r-[#DFDFDF]',
          )}
          style={{ backgroundColor: wallpaperColor }}
        >
          {/* Mini window */}
          <div className="m-2 w-[60px]">
            <div className="h-[8px] bg-[#000080] flex items-center px-[2px]">
              <span className="text-white text-[5px] leading-none">Window</span>
            </div>
            <div className="h-[20px] bg-white border border-[#808080]" />
          </div>
          {/* Mini taskbar */}
          <div className="absolute bottom-[12px] left-[12px] right-[12px] h-[8px] bg-[#C0C0C0] border-t border-[#DFDFDF]" />
        </div>
      </div>
      {/* Monitor stand */}
      <div className="w-[60px] h-[8px] bg-[#C0C0C0] border-x-2 border-b-2 border-[#808080]" />
      <div className="w-[100px] h-[6px] bg-[#C0C0C0] rounded-b-sm border-2 border-t-0 border-[#808080]" />
    </div>
  );
}

export default function DisplayProperties({ windowId }: AppComponentProps) {
  const [selectedWallpaper, setSelectedWallpaper] = useState('setup');
  const [selectedSaver, setSelectedSaver] = useState('starfield');
  const [selectedScheme, setSelectedScheme] = useState('windows-standard');
  const [waitTime, setWaitTime] = useState('5');

  const wallpaper = WALLPAPERS.find((w) => w.id === selectedWallpaper) || WALLPAPERS[0];

  const backgroundTab = (
    <div className="flex flex-col items-center gap-3">
      <PreviewMonitor wallpaperColor={wallpaper.color} />
      <div className="w-full flex gap-2 items-end">
        <div className="flex-1">
          <div className="mb-1">Wallpaper:</div>
          <div
            className={cn(
              'h-[100px] bg-white overflow-auto',
              'border-2 border-solid',
              'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
              'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
            )}
          >
            {WALLPAPERS.map((wp) => (
              <div
                key={wp.id}
                className={cn(
                  'px-2 py-[1px] cursor-default select-none',
                  selectedWallpaper === wp.id && 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]',
                )}
                onClick={() => setSelectedWallpaper(wp.id)}
              >
                {wp.name}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Button98>Browse...</Button98>
        </div>
      </div>
    </div>
  );

  const screenSaverTab = (
    <div className="flex flex-col items-center gap-3">
      <PreviewMonitor wallpaperColor="#000000" />
      <div className="w-full">
        <div className="flex items-center gap-2 mb-3">
          <span>Screen Saver:</span>
          <Select98
            value={selectedSaver}
            onChange={(e) => setSelectedSaver(e.target.value)}
            className="flex-1"
          >
            {SCREENSAVERS.map((ss) => (
              <option key={ss.id} value={ss.id}>{ss.name}</option>
            ))}
          </Select98>
          <Button98>Settings...</Button98>
          <Button98>Preview</Button98>
        </div>
        <div className="flex items-center gap-2">
          <span>Wait:</span>
          <Select98
            value={waitTime}
            onChange={(e) => setWaitTime(e.target.value)}
            className="w-[60px]"
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="30">30</option>
          </Select98>
          <span>minutes</span>
        </div>
      </div>
    </div>
  );

  const appearanceTab = (
    <div className="flex flex-col items-center gap-3">
      {/* Preview area */}
      <div
        className={cn(
          'w-full h-[130px] bg-[#008080] relative overflow-hidden',
          'border-2 border-solid',
          'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
          'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
        )}
      >
        {/* Inactive window */}
        <div className="absolute top-3 left-3 w-[140px]">
          <div className="h-[14px] bg-[#808080] flex items-center px-1">
            <span className="text-white text-[9px]">Inactive Window</span>
          </div>
          <div className="h-[40px] bg-[#C0C0C0] border border-[#808080]" />
        </div>
        {/* Active window */}
        <div className="absolute top-6 left-10 w-[160px]">
          <div className="h-[14px] bg-[#000080] flex items-center px-1">
            <span className="text-white text-[9px]">Active Window</span>
          </div>
          <div className="h-[50px] bg-[#C0C0C0] border border-[#808080] p-1">
            <span className="text-[9px]">Window Text</span>
            <div className="mt-1 bg-white border border-[#808080] h-[16px] flex items-center px-1">
              <span className="text-[8px]">Message Box Text</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="flex items-center gap-2">
          <span>Scheme:</span>
          <Select98
            value={selectedScheme}
            onChange={(e) => setSelectedScheme(e.target.value)}
            className="flex-1"
          >
            {COLOR_SCHEMES.map((cs) => (
              <option key={cs.id} value={cs.id}>{cs.name}</option>
            ))}
          </Select98>
          <Button98>Save As...</Button98>
          <Button98>Delete</Button98>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <div className="flex-1 p-2">
        <TabControl98
          tabs={[
            { id: 'background', label: 'Background', content: backgroundTab },
            { id: 'screensaver', label: 'Screen Saver', content: screenSaverTab },
            { id: 'appearance', label: 'Appearance', content: appearanceTab },
          ]}
        />
      </div>
      <div className="flex justify-end gap-2 p-2 border-t border-[var(--win98-button-highlight)]">
        <Button98>OK</Button98>
        <Button98>Cancel</Button98>
        <Button98>Apply</Button98>
      </div>
    </div>
  );
}
