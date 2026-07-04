'use client';

import { useState, useCallback, MouseEvent } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { showSystemError } from '@/hooks/useFileOpener';
import { cn } from '@/lib/cn';

type AppletAction =
  | { kind: 'open'; appId: string }
  | { kind: 'network' };

interface Applet {
  name: string;
  icon: string;
  desc: string;
  action: AppletAction;
}

const APPLETS: Applet[] = [
  { name: 'Add/Remove Programs', icon: '/icons/addremove-16.svg', desc: 'Installs and removes programs and Windows components.', action: { kind: 'open', appId: 'add-remove-programs' } },
  { name: 'Display', icon: '/icons/display-16.svg', desc: 'Changes settings for your display and screen saver.', action: { kind: 'open', appId: 'display-properties' } },
  { name: 'Mouse', icon: '/icons/mouse-16.svg', desc: 'Customizes your mouse buttons, pointers, and motion.', action: { kind: 'open', appId: 'mouse-properties' } },
  { name: 'Network', icon: '/icons/network-16.svg', desc: 'Configures network hardware and software.', action: { kind: 'network' } },
  { name: 'System', icon: '/icons/sysinfo-16.svg', desc: 'Provides system information and changes advanced settings.', action: { kind: 'open', appId: 'sysinfo' } },
  { name: 'Device Manager', icon: '/icons/devmgr-16.svg', desc: 'Views and changes the hardware installed on your computer.', action: { kind: 'open', appId: 'device-manager' } },
  { name: 'Sounds', icon: '/icons/volume-16.svg', desc: 'Assigns sounds to system and program events.', action: { kind: 'open', appId: 'sounds-properties' } },
  { name: 'Regional Settings', icon: '/icons/settings-16.svg', desc: 'Changes how numbers, dates, times, and currency are displayed.', action: { kind: 'open', appId: 'regional-settings' } },
  { name: 'Internet', icon: '/icons/ie-16.svg', desc: 'Configures your Internet display and connection settings.', action: { kind: 'open', appId: 'ie5' } },
];

export default function ControlPanel({}: AppComponentProps) {
  const { openWindow } = useWindows();
  const [selected, setSelected] = useState<string | null>(null);

  const runApplet = useCallback((applet: Applet) => {
    switch (applet.action.kind) {
      case 'open':
        openWindow(applet.action.appId);
        break;
      case 'network':
        showSystemError('Network', 'The Network Control Panel cannot be displayed.\n\nThe network is not present or not started. Please contact your system administrator.');
        break;
    }
  }, [openWindow]);

  const selectedApplet = APPLETS.find((a) => a.name === selected) ?? null;

  return (
    <div className="flex-1 flex flex-col bg-white font-[family-name:var(--win98-font)] text-[11px]">
      <div className="flex-1 flex min-h-0">
        {/* Applet grid */}
        <div className="flex-1 overflow-auto p-3" onClick={() => setSelected(null)}>
          <div className="flex flex-wrap gap-4">
            {APPLETS.map((applet) => (
              <div
                key={applet.name}
                className="flex flex-col items-center w-[80px] cursor-default select-none p-1"
                onClick={(e: MouseEvent) => { e.stopPropagation(); setSelected(applet.name); }}
                onDoubleClick={() => runApplet(applet)}
              >
                <div className={cn('p-[2px]', selected === applet.name && 'bg-[var(--win98-highlight)]')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={applet.icon} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
                </div>
                <span className={cn('text-center text-[11px] mt-1 px-[2px]', selected === applet.name && 'bg-[var(--win98-highlight)] text-white')}>{applet.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Description sidebar */}
        <div className="w-[150px] shrink-0 border-l border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)] p-2">
          {selectedApplet ? (
            <>
              <p className="font-bold mb-1">{selectedApplet.name}</p>
              <p>{selectedApplet.desc}</p>
            </>
          ) : (
            <p className="text-[var(--win98-disabled-text)]">Select an item to view its description.</p>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className={cn('flex items-center h-[20px] px-2 bg-[var(--win98-button-face)]', 'border-t border-[var(--win98-button-highlight)]', 'text-[11px]')}>
        <span>{selectedApplet ? selectedApplet.desc : `${APPLETS.length} object(s)`}</span>
      </div>
    </div>
  );
}
