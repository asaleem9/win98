'use client';

import { cn } from '@/lib/cn';
import { useWindows } from '@/contexts/WindowContext';
import { getApp } from '@/lib/appRegistry';

export function TaskbarWindowList() {
  const { windows, focusWindow, minimizeWindow } = useWindows();

  return (
    <div className="flex-1 flex items-center gap-[2px] overflow-hidden px-[2px]">
      {windows.map((win) => {
        const app = getApp(win.appId);
        const isActive = win.isFocused && win.state !== 'minimized';

        return (
          <button
            key={win.id}
            onClick={() => {
              if (win.isFocused && win.state !== 'minimized') {
                minimizeWindow(win.id);
              } else {
                focusWindow(win.id);
              }
            }}
            className={cn(
              'flex items-center gap-[3px] h-[22px] px-[4px] min-w-[60px] max-w-[160px]',
              'bg-[var(--win98-button-face)] cursor-default select-none truncate',
              'font-[family-name:var(--win98-font)] text-[11px]',
              'border border-solid',
              isActive
                ? [
                    'border-t-[var(--win98-button-dark-shadow)] border-l-[var(--win98-button-dark-shadow)]',
                    'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
                    'font-bold',
                  ]
                : [
                    'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
                    'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
                  ],
            )}
          >
            {app?.icon16 && (
              <img
                src={app.icon16}
                alt=""
                className="w-4 h-4 flex-shrink-0"
                style={{ imageRendering: 'pixelated' }}
              />
            )}
            <span className="truncate">{win.title}</span>
          </button>
        );
      })}
    </div>
  );
}
