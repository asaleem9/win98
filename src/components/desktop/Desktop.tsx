'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { useWindows } from '@/contexts/WindowContext';
import { getDesktopApps } from '@/lib/appRegistry';
import { DesktopIcon } from './DesktopIcon';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { DESKTOP_GRID } from '@/lib/constants';

export function Desktop() {
  const { openWindow } = useWindows();
  const desktopApps = getDesktopApps();
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ items: ContextMenuItem[]; position: { x: number; y: number } } | null>(null);

  const handleDesktopClick = useCallback(() => {
    setSelectedIcon(null);
  }, []);

  const handleDesktopContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({
        position: { x: e.clientX, y: e.clientY },
        items: [
          { label: 'Arrange Icons', disabled: true },
          { label: 'Line up Icons', disabled: true },
          { separator: true },
          { label: 'Paste', disabled: true },
          { label: 'Paste Shortcut', disabled: true },
          { separator: true },
          { label: 'New', disabled: true },
          { separator: true },
          { label: 'Properties', disabled: true },
        ],
      });
    },
    [],
  );

  const handleIconContextMenu = useCallback(
    (e: React.MouseEvent, appId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIcon(appId);
      setContextMenu({
        position: { x: e.clientX, y: e.clientY },
        items: [
          { label: 'Open', bold: true, onClick: () => openWindow(appId) },
          { separator: true },
          { label: 'Create Shortcut', disabled: true },
          { label: 'Delete', disabled: true },
          { label: 'Rename', disabled: true },
          { separator: true },
          { label: 'Properties', disabled: true },
        ],
      });
    },
    [openWindow],
  );

  return (
    <div
      className="absolute inset-0 bottom-[28px] overflow-hidden"
      onClick={handleDesktopClick}
      onContextMenu={handleDesktopContextMenu}
    >
      {/* Desktop icons grid - vertical columns left to right */}
      <div className="flex flex-col flex-wrap content-start h-full p-[10px] gap-0">
        {desktopApps.map((app) => (
          <div
            key={app.id}
            onContextMenu={(e) => handleIconContextMenu(e, app.id)}
          >
            <DesktopIcon
              appId={app.id}
              name={app.name}
              icon={app.icon}
              selected={selectedIcon === app.id}
              onSelect={() => setSelectedIcon(app.id)}
              onDoubleClick={() => openWindow(app.id)}
            />
          </div>
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          items={contextMenu.items}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
