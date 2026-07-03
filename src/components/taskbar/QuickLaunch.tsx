'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { useWindows } from '@/contexts/WindowContext';
import { getQuickLaunchApps } from '@/lib/appRegistry';

const buttonClass = cn(
  'w-[20px] h-[20px] flex items-center justify-center',
  'cursor-default select-none',
  'hover:border hover:border-solid',
  'hover:border-t-[var(--win98-button-highlight)] hover:border-l-[var(--win98-button-highlight)]',
  'hover:border-b-[var(--win98-button-shadow)] hover:border-r-[var(--win98-button-shadow)]',
  'active:border-t-[var(--win98-button-shadow)] active:border-l-[var(--win98-button-shadow)]',
  'active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
);

// The classic quick-launch Show Desktop art: a blue desk blotter with a pencil.
function ShowDesktopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ imageRendering: 'pixelated' }}>
      <rect x="2" y="2" width="12" height="12" fill="#6a9bd1" stroke="#1c3f6e" strokeWidth="1" />
      <rect x="3" y="3" width="10" height="2" fill="#9dc0e8" />
      <line x1="4.5" y1="11.5" x2="11.5" y2="4.5" stroke="#f2c14e" strokeWidth="2" />
      <path d="M11 4 L12.5 3 L12.5 5.5 Z" fill="#e8c1a0" />
      <rect x="4" y="11" width="1.5" height="1.5" fill="#5a4321" />
    </svg>
  );
}

export function QuickLaunch() {
  const { windows, openWindow, minimizeAll, restoreAll } = useWindows();
  const quickLaunchApps = getQuickLaunchApps();
  const [showingDesktop, setShowingDesktop] = useState(false);

  const toggleShowDesktop = () => {
    // If the user brought any window back up on their own since we hid them, the
    // desktop is no longer shown — hide everything again instead of restoring.
    const restoredManually =
      showingDesktop && windows.some((w) => !w.ownerId && w.state === 'normal');
    if (showingDesktop && !restoredManually) {
      restoreAll();
      setShowingDesktop(false);
    } else {
      minimizeAll();
      setShowingDesktop(true);
    }
  };

  return (
    <div className="flex items-center gap-[2px] px-[3px] border-l-2 border-l-[var(--win98-button-shadow)] border-r-2 border-r-[var(--win98-button-highlight)] mx-[2px]">
      {quickLaunchApps.map((app) => (
        <button key={app.id} onClick={() => openWindow(app.id)} title={app.name} className={buttonClass}>
          <img
            src={app.icon16 || app.icon}
            alt={app.name}
            className="w-4 h-4"
            style={{ imageRendering: 'pixelated' }}
          />
        </button>
      ))}

      <button
        onClick={toggleShowDesktop}
        title="Show Desktop"
        aria-pressed={showingDesktop}
        className={buttonClass}
      >
        <ShowDesktopIcon />
      </button>
    </div>
  );
}
