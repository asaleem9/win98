'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { StartButton } from './StartButton';
import { StartMenu } from './StartMenu';
import { QuickLaunch } from './QuickLaunch';
import { TaskbarWindowList } from './TaskbarWindowList';
import { SystemTray } from './SystemTray';
import { TaskbarProperties } from './TaskbarProperties';
import { ContextMenu, ContextMenuItem } from '@/components/desktop/ContextMenu';
import { useWindows } from '@/contexts/WindowContext';
import { useSettings } from '@/contexts/SettingsContext';
import { WINDOW_DEFAULTS } from '@/lib/constants';

export function Taskbar() {
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ items: ContextMenuItem[]; position: { x: number; y: number } } | null>(null);
  const [atBottom, setAtBottom] = useState(false);
  const [hovering, setHovering] = useState(false);

  const { windows, minimizeAll, moveWindow, resizeWindow, restoreWindow } = useWindows();
  const { settings } = useSettings();
  const autoHide = settings?.taskbar?.autoHide ?? false;

  // Ctrl+Esc toggles the Start menu from anywhere in the shell
  useEffect(() => {
    const onToggle = () => setStartMenuOpen((open) => !open);
    window.addEventListener('win98-toggle-start', onToggle);
    return () => window.removeEventListener('win98-toggle-start', onToggle);
  }, []);

  // Auto-hide reveal: the bar drops to a sliver until the pointer reaches the
  // very bottom edge of the screen (or hovers the revealed bar). With auto-hide
  // off, `revealed` is always true, so a stale atBottom value is harmless.
  useEffect(() => {
    if (!autoHide) return;
    const onMove = (e: MouseEvent) => setAtBottom(e.clientY >= window.innerHeight - 2);
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [autoHide]);

  // Keep the bar up while it's needed: pointer at the edge or on the bar, the
  // Start menu or Properties dialog open, or when no window is holding focus.
  const hasActiveWindow = windows.some((w) => !w.ownerId && w.isFocused && w.state !== 'minimized');
  const revealed = !autoHide || atBottom || hovering || startMenuOpen || propertiesOpen || !hasActiveWindow;

  const openTaskbarMenu = (e: React.MouseEvent) => {
    // Window-list buttons carry their own menu; let those handle themselves.
    if ((e.target as HTMLElement).closest('[data-taskbar-button-for]')) return;
    e.preventDefault();

    const tileable = windows.filter((w) => !w.ownerId && w.state !== 'minimized');

    const cascade = () => {
      tileable.forEach((w, i) => {
        if (w.state === 'maximized') restoreWindow(w.id);
        moveWindow(
          w.id,
          WINDOW_DEFAULTS.cascadeStartX + i * WINDOW_DEFAULTS.cascadeOffsetX,
          WINDOW_DEFAULTS.cascadeStartY + i * WINDOW_DEFAULTS.cascadeOffsetY,
        );
      });
    };

    const tileHorizontally = () => {
      const n = tileable.length;
      if (n === 0) return;
      const availWidth = window.innerWidth;
      const bandHeight = Math.floor((window.innerHeight - WINDOW_DEFAULTS.taskbarHeight) / n);
      tileable.forEach((w, i) => {
        if (w.state === 'maximized') restoreWindow(w.id);
        moveWindow(w.id, 0, i * bandHeight);
        resizeWindow(w.id, availWidth, bandHeight);
      });
    };

    const noWindows = tileable.length === 0;
    setContextMenu({
      position: { x: e.clientX, y: e.clientY },
      items: [
        { label: 'Toolbars', disabled: true },
        { separator: true },
        { label: 'Cascade Windows', disabled: noWindows, onClick: cascade },
        { label: 'Tile Windows Horizontally', disabled: noWindows, onClick: tileHorizontally },
        { label: 'Minimize All Windows', disabled: noWindows, onClick: minimizeAll },
        { separator: true },
        { label: 'Properties', onClick: () => setPropertiesOpen(true) },
      ],
    });
  };

  return (
    <>
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 h-[28px] z-[9990]',
          'flex items-center gap-0 px-[2px]',
          'bg-[var(--win98-button-face)]',
          'border-t-2 border-t-[var(--win98-button-highlight)]',
          'transition-transform duration-150 ease-out',
          autoHide && !revealed && 'translate-y-[26px]',
        )}
        onContextMenu={openTaskbarMenu}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="relative">
          <StartButton
            active={startMenuOpen}
            onClick={() => setStartMenuOpen(!startMenuOpen)}
          />
          {startMenuOpen && <StartMenu onClose={() => setStartMenuOpen(false)} />}
        </div>

        <QuickLaunch />
        <TaskbarWindowList />
        <SystemTray />
      </div>

      {contextMenu && (
        <ContextMenu items={contextMenu.items} position={contextMenu.position} onClose={() => setContextMenu(null)} />
      )}

      {propertiesOpen && <TaskbarProperties onClose={() => setPropertiesOpen(false)} />}
    </>
  );
}
