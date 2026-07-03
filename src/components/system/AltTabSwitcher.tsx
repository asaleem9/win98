'use client';

import { WindowState } from '@/types/window';
import { getApp } from '@/lib/appRegistry';
import { cn } from '@/lib/cn';

interface AltTabSwitcherProps {
  windows: WindowState[];
  selectedIndex: number;
}

export function AltTabSwitcher({ windows, selectedIndex }: AltTabSwitcherProps) {
  if (windows.length === 0) return null;
  const selected = windows[selectedIndex];

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          'bg-[var(--win98-button-face)] p-3',
          'border-2 border-solid',
          'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
          'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
          'font-[family-name:var(--win98-font)] text-[11px]',
        )}
      >
        <div className="flex gap-2 flex-wrap max-w-[420px] justify-center">
          {windows.map((win, i) => {
            const app = getApp(win.appId);
            return (
              <div
                key={win.id}
                className={cn(
                  'w-12 h-12 flex items-center justify-center',
                  i === selectedIndex && 'border border-dotted border-black bg-[var(--win98-titlebar-active-start)]',
                )}
              >
                {app?.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.icon} alt={win.title} className="w-8 h-8" />
                ) : (
                  <span className="text-lg">□</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 px-1 py-[2px] border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] text-center truncate max-w-[420px]">
          {selected?.title}
        </div>
      </div>
    </div>
  );
}
