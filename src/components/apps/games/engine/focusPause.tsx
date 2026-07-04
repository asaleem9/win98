'use client';

// Shared "pause when you look away" helper for the real-time games. loop.ts
// already skips ticks while the browser tab is hidden, but a game left running
// behind another Win98 window would keep simulating unseen. useWindowActive
// tracks whether this game's own window is the focused one (and the tab visible);
// games gate their loop on it and drop a PauseVeil over the field when it's not,
// so blurring the window quietly pauses play instead of losing the game for you.

import { useEffect, useState } from 'react';
import { useWindows } from '@/contexts/WindowContext';
import { cn } from '@/lib/cn';

/**
 * True when this window is focused and the tab is visible. Defaults to active
 * when the window id isn't registered yet (e.g. under test), so nothing pauses
 * spuriously.
 */
export function useWindowActive(windowId: string): boolean {
  const { windows } = useWindows();
  const focused = windows.find((w) => w.id === windowId)?.isFocused ?? true;

  const [visible, setVisible] = useState(() => (typeof document === 'undefined' ? true : !document.hidden));
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return focused && visible;
}

/**
 * The "PAUSED — click to resume" overlay. Rendered only when `show` is true;
 * clicking it refocuses the window, which flips useWindowActive back on and
 * resumes the loop. Absolutely positioned, so the parent must be `relative`.
 */
export function PauseVeil({
  windowId,
  show,
  className,
}: {
  windowId: string;
  show: boolean;
  className?: string;
}) {
  const { focusWindow } = useWindows();
  if (!show) return null;
  return (
    <div
      className={cn(
        'absolute inset-0 z-30 flex flex-col items-center justify-center gap-1 bg-black/60 cursor-pointer select-none',
        className,
      )}
      onClick={() => focusWindow(windowId)}
    >
      <div className="text-white text-[15px] font-bold tracking-[2px]">PAUSED</div>
      <div className="text-white/80 text-[11px]">Click to resume</div>
    </div>
  );
}
