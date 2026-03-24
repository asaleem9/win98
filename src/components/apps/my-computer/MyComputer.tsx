'use client';

import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { cn } from '@/lib/cn';

const DRIVES = [
  { name: '3½ Floppy (A:)', icon: '/icons/my-computer-16.svg', type: '3½-Inch Floppy Disk' },
  { name: '(C:)', icon: '/icons/my-computer-16.svg', type: 'Local Disk', size: '2.1 GB', free: '845 MB' },
  { name: '(D:)', icon: '/icons/my-computer-16.svg', type: 'CD-ROM Disc' },
];

const SYSTEM_ITEMS = [
  { name: 'Control Panel', icon: '/icons/control-panel-16.svg', appId: 'control-panel' },
  { name: 'Printers', icon: '/icons/settings-16.svg' },
  { name: 'Dial-Up Networking', icon: '/icons/network-16.svg' },
];

export default function MyComputer({ windowId }: AppComponentProps) {
  const { openWindow } = useWindows();

  return (
    <div className="flex-1 flex flex-col bg-white font-[family-name:var(--win98-font)] text-[11px]">
      {/* Toolbar */}
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 bg-[var(--win98-button-face)]',
          'border-b border-[var(--win98-button-shadow)]',
        )}
      >
        <span className="text-[var(--win98-disabled-text)]">Address</span>
        <div
          className={cn(
            'flex-1 h-[20px] flex items-center gap-1 px-1 bg-white',
            'border border-solid',
            'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
            'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
          )}
        >
          <img src="/icons/my-computer-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
          <span>My Computer</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        <div className="flex flex-wrap gap-4">
          {DRIVES.map((drive) => (
            <div
              key={drive.name}
              className="flex flex-col items-center w-[75px] cursor-default select-none hover:bg-[var(--win98-highlight)] hover:bg-opacity-20 p-1 rounded"
              onDoubleClick={() => openWindow('explorer')}
            >
              <img src={drive.icon} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
              <span className="text-center text-[11px] mt-1">{drive.name}</span>
            </div>
          ))}
        </div>

        <div className="mx-0 my-3 border-t border-[var(--win98-button-shadow)]" />

        <div className="flex flex-wrap gap-4">
          {SYSTEM_ITEMS.map((item) => (
            <div
              key={item.name}
              className="flex flex-col items-center w-[75px] cursor-default select-none hover:bg-[var(--win98-highlight)] hover:bg-opacity-20 p-1 rounded"
              onDoubleClick={() => item.appId && openWindow(item.appId)}
            >
              <img src={item.icon} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
              <span className="text-center text-[11px] mt-1">{item.name}</span>
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
        <span>{DRIVES.length + SYSTEM_ITEMS.length} object(s)</span>
      </div>
    </div>
  );
}
