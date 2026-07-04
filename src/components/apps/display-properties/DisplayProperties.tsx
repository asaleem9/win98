'use client';

import { ReactNode, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { TabControl98 } from '@/components/ui/TabControl98';
import { Button98 } from '@/components/ui/Button98';
import { Select98 } from '@/components/ui/Select98';
import { Input98 } from '@/components/ui/Input98';
import { GroupBox98 } from '@/components/ui/GroupBox98';
import { cn } from '@/lib/cn';
import { useSettings, ColorScheme, ScreenSaverId } from '@/contexts/SettingsContext';
import { useWindows } from '@/contexts/WindowContext';
import { WALLPAPERS } from '@/lib/wallpapers';
import { ScreenSaverManager, ScreenSaverView } from '@/components/system/ScreenSaverManager';

const SCREENSAVERS: Array<{ id: ScreenSaverId; name: string }> = [
  { id: 'none', name: '(None)' },
  { id: 'flying-windows', name: 'Flying Windows' },
  { id: 'starfield', name: 'Starfield Simulation' },
  { id: 'mystify', name: 'Mystify Your Mind' },
  { id: 'pipes', name: '3D Pipes' },
  { id: 'marquee', name: 'Scrolling Marquee' },
  { id: 'maze', name: '3D Maze' },
];

const COLOR_SCHEMES: Array<{ id: ColorScheme; name: string }> = [
  { id: 'standard', name: 'Windows Standard' },
  { id: 'desert', name: 'Desert' },
  { id: 'eggplant', name: 'Eggplant' },
  { id: 'rainy-day', name: 'Rainy Day' },
  { id: 'high-contrast', name: 'High Contrast Black' },
];

function PreviewMonitor({
  screenStyle,
  children,
}: {
  screenStyle: React.CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'w-[180px] h-[130px] bg-[#C0C0C0] rounded-t-md p-[10px]',
          'border-2 border-solid',
          'border-t-[#DFDFDF] border-l-[#DFDFDF]',
          'border-b-[#808080] border-r-[#808080]',
        )}
      >
        <div
          className={cn(
            'w-full h-full relative overflow-hidden',
            'border-2 border-solid',
            'border-t-[#808080] border-l-[#808080]',
            'border-b-[#DFDFDF] border-r-[#DFDFDF]',
          )}
          style={screenStyle}
        >
          {children ?? (
            <>
              <div className="m-2 w-[60px]">
                <div className="h-[8px] bg-[#000080] flex items-center px-[2px]">
                  <span className="text-white text-[5px] leading-none">Window</span>
                </div>
                <div className="h-[20px] bg-white border border-[#808080]" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[8px] bg-[#C0C0C0] border-t border-[#DFDFDF]" />
            </>
          )}
        </div>
      </div>
      <div className="w-[60px] h-[8px] bg-[#C0C0C0] border-x-2 border-b-2 border-[#808080]" />
      <div className="w-[100px] h-[6px] bg-[#C0C0C0] rounded-b-sm border-2 border-t-0 border-[#808080]" />
    </div>
  );
}

export default function DisplayProperties({ windowId }: AppComponentProps) {
  const { settings, setSetting } = useSettings();
  const { closeWindow } = useWindows();

  // Pending (unapplied) selections start from the live settings
  const [selectedWallpaper, setSelectedWallpaper] = useState(settings.wallpaper ?? 'none');
  const [selectedSaver, setSelectedSaver] = useState<ScreenSaverId>(settings.screenSaver.id);
  const [selectedScheme, setSelectedScheme] = useState<ColorScheme>(settings.colorScheme);
  const [waitTime, setWaitTime] = useState(String(settings.screenSaver.timeoutMinutes));
  const [marqueeText, setMarqueeText] = useState(settings.screenSaver.marqueeText ?? 'Your message here.');
  const [marqueeSpeed, setMarqueeSpeed] = useState(settings.screenSaver.marqueeSpeed ?? 3);
  const [previewingSaver, setPreviewingSaver] = useState(false);

  const wallpaper = WALLPAPERS.find((w) => w.id === selectedWallpaper) ?? WALLPAPERS[0];

  const apply = () => {
    setSetting('wallpaper', selectedWallpaper === 'none' ? null : selectedWallpaper);
    setSetting('colorScheme', selectedScheme);
    setSetting('screenSaver', {
      id: selectedSaver,
      timeoutMinutes: Number(waitTime) || 10,
      marqueeText,
      marqueeSpeed,
    });
  };

  const backgroundTab = (
    <div className="flex flex-col items-center gap-3">
      <PreviewMonitor screenStyle={{ backgroundColor: settings.desktopColor, ...wallpaper.style }} />
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
      </div>
    </div>
  );

  const screenSaverTab = (
    <div className="flex flex-col items-center gap-3">
      <PreviewMonitor screenStyle={{ backgroundColor: '#000000' }}>
        {selectedSaver !== 'none' && (
          <ScreenSaverView
            // Remount when the selection or marquee text/speed changes so the
            // little preview always reflects the current choice.
            key={`${selectedSaver}:${marqueeText}:${marqueeSpeed}`}
            id={selectedSaver}
            preview
            marqueeText={marqueeText}
            marqueeSpeed={marqueeSpeed}
          />
        )}
      </PreviewMonitor>
      <div className="w-full">
        <div className="flex items-center gap-2 mb-3">
          <span>Screen Saver:</span>
          <Select98
            value={selectedSaver}
            onChange={(e) => setSelectedSaver(e.target.value as ScreenSaverId)}
            className="flex-1"
          >
            {SCREENSAVERS.map((ss) => (
              <option key={ss.id} value={ss.id}>{ss.name}</option>
            ))}
          </Select98>
          <Button98 disabled={selectedSaver === 'none'} onClick={() => setPreviewingSaver(true)}>
            Preview
          </Button98>
        </div>

        {selectedSaver === 'marquee' && (
          <GroupBox98 label="Marquee Settings" className="mb-3">
            <div className="flex flex-col gap-2 pt-1">
              <label className="flex items-center gap-2">
                <span className="w-[42px]">Text:</span>
                <Input98
                  value={marqueeText}
                  onChange={(e) => setMarqueeText(e.target.value)}
                  className="flex-1"
                  aria-label="Marquee text"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-[42px]">Speed:</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={marqueeSpeed}
                  onChange={(e) => setMarqueeSpeed(Number(e.target.value))}
                  className="flex-1"
                  aria-label="Marquee speed"
                />
              </label>
            </div>
          </GroupBox98>
        )}

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
      <div
        className={cn(
          'w-full h-[130px] bg-[#008080] relative overflow-hidden',
          'border-2 border-solid',
          'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
          'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
        )}
      >
        <div className="absolute top-3 left-3 w-[140px]">
          <div className="h-[14px] bg-[#808080] flex items-center px-1">
            <span className="text-white text-[9px]">Inactive Window</span>
          </div>
          <div className="h-[40px] bg-[#C0C0C0] border border-[#808080]" />
        </div>
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
            onChange={(e) => setSelectedScheme(e.target.value as ColorScheme)}
            className="flex-1"
          >
            {COLOR_SCHEMES.map((cs) => (
              <option key={cs.id} value={cs.id}>{cs.name}</option>
            ))}
          </Select98>
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
        <Button98
          onClick={() => {
            apply();
            closeWindow(windowId);
          }}
        >
          OK
        </Button98>
        <Button98 onClick={() => closeWindow(windowId)}>Cancel</Button98>
        <Button98 onClick={apply}>Apply</Button98>
      </div>

      {/* Fullscreen screensaver preview; the saver dismisses itself on input */}
      {previewingSaver && selectedSaver !== 'none' && (
        <div onPointerDown={() => setPreviewingSaver(false)} onKeyDown={() => setPreviewingSaver(false)}>
          <ScreenSaverManager
            selectedSaver={selectedSaver}
            forceActive
            marqueeText={marqueeText}
            marqueeSpeed={marqueeSpeed}
          />
        </div>
      )}
    </div>
  );
}
