'use client';

import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { cn } from '@/lib/cn';

const APPLETS = [
  { name: 'Add/Remove Programs', icon: '/icons/addremove-16.svg', appId: 'add-remove-programs' },
  { name: 'Display', icon: '/icons/display-16.svg', appId: 'display-properties' },
  { name: 'Network', icon: '/icons/network-16.svg' },
  { name: 'System', icon: '/icons/sysinfo-16.svg', appId: 'sysinfo' },
  { name: 'Device Manager', icon: '/icons/devmgr-16.svg', appId: 'device-manager' },
  { name: 'Sounds', icon: '/icons/volume-16.svg' },
  { name: 'Regional Settings', icon: '/icons/settings-16.svg' },
  { name: 'Internet', icon: '/icons/ie-16.svg', appId: 'ie5' },
];

export default function ControlPanel({ windowId }: AppComponentProps) {
  const { openWindow } = useWindows();

  return (
    <div className="flex-1 flex flex-col bg-white font-[family-name:var(--win98-font)] text-[11px]">
      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        <div className="flex flex-wrap gap-4">
          {APPLETS.map((applet) => (
            <div
              key={applet.name}
              className="flex flex-col items-center w-[75px] cursor-default select-none hover:bg-[var(--win98-highlight)] hover:bg-opacity-20 p-1 rounded"
              onDoubleClick={() => applet.appId && openWindow(applet.appId)}
            >
              <img src={applet.icon} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
              <span className="text-center text-[11px] mt-1">{applet.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div
        className={cn(
          'flex items-center h-[20px] px-2 bg-[var(--win98-button-face)]',
          'border-t border-[var(--win98-button-highlight)]',
          'text-[11px]',
        )}
      >
        <span>{APPLETS.length} object(s)</span>
      </div>
    </div>
  );
}
