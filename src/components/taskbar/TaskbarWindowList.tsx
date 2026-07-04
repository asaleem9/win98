'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { useWindows } from '@/contexts/WindowContext';
import { getApp } from '@/lib/appRegistry';
import { ContextMenu, ContextMenuItem } from '@/components/desktop/ContextMenu';
import { playZoomAnimation, rectFromElement, viewportRect, Rect } from '@/components/system/ZoomAnimation';
import { WindowState } from '@/types/window';

// The on-screen rect a window occupies given its state — a maximized window
// fills the desktop, otherwise it sits at its stored position/size. Used as the
// zoom endpoint for taskbar-driven minimize/restore, where there's no live DOM
// node to measure.
function windowRectFromState(win: WindowState): Rect {
  if (win.state === 'maximized') return viewportRect();
  return { x: win.position.x, y: win.position.y, width: win.size.width, height: win.size.height };
}

export function TaskbarWindowList() {
  const { windows, focusWindow, minimizeWindow, maximizeWindow, restoreWindow, closeWindow } = useWindows();
  const [contextMenu, setContextMenu] = useState<{ items: ContextMenuItem[]; position: { x: number; y: number } } | null>(null);

  return (
    <div className="flex-1 flex items-center gap-[2px] overflow-hidden px-[2px]">
      {windows.filter((win) => !win.ownerId).map((win) => {
        const app = getApp(win.appId);
        const isActive = win.isFocused && win.state !== 'minimized';

        return (
          <button
            key={win.id}
            data-taskbar-button-for={win.id}
            onClick={(e) => {
              const buttonRect = rectFromElement(e.currentTarget);
              if (win.isFocused && win.state !== 'minimized') {
                minimizeWindow(win.id);
                playZoomAnimation({ from: windowRectFromState(win), to: buttonRect });
              } else {
                focusWindow(win.id);
                // Focusing a minimized window brings it back up; zoom out of the button.
                if (win.state === 'minimized') {
                  playZoomAnimation({ from: buttonRect, to: windowRectFromState(win) });
                }
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({
                position: { x: e.clientX, y: e.clientY },
                items: [
                  { label: 'Restore', disabled: win.state === 'normal', onClick: () => restoreWindow(win.id) },
                  { label: 'Minimize', disabled: win.state === 'minimized', onClick: () => minimizeWindow(win.id) },
                  { label: 'Maximize', disabled: win.state === 'maximized', onClick: () => maximizeWindow(win.id) },
                  { separator: true },
                  { label: 'Close', bold: true, onClick: () => closeWindow(win.id) },
                ],
              });
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

      {contextMenu && (
        <ContextMenu items={contextMenu.items} position={contextMenu.position} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}
