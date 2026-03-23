'use client';

import { cn } from '@/lib/cn';
import { useWindows } from '@/contexts/WindowContext';
import { getQuickLaunchApps } from '@/lib/appRegistry';

export function QuickLaunch() {
  const { openWindow } = useWindows();
  const quickLaunchApps = getQuickLaunchApps();

  if (quickLaunchApps.length === 0) return null;

  return (
    <div className="flex items-center gap-[2px] px-[3px] border-l-2 border-l-[var(--win98-button-shadow)] border-r-2 border-r-[var(--win98-button-highlight)] mx-[2px]">
      {quickLaunchApps.map((app) => (
        <button
          key={app.id}
          onClick={() => openWindow(app.id)}
          title={app.name}
          className={cn(
            'w-[20px] h-[20px] flex items-center justify-center',
            'cursor-default select-none',
            'hover:border hover:border-solid',
            'hover:border-t-[var(--win98-button-highlight)] hover:border-l-[var(--win98-button-highlight)]',
            'hover:border-b-[var(--win98-button-shadow)] hover:border-r-[var(--win98-button-shadow)]',
            'active:border-t-[var(--win98-button-shadow)] active:border-l-[var(--win98-button-shadow)]',
            'active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
          )}
        >
          <img
            src={app.icon16 || app.icon}
            alt={app.name}
            className="w-4 h-4"
            style={{ imageRendering: 'pixelated' }}
          />
        </button>
      ))}
    </div>
  );
}
