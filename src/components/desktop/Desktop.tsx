'use client';

import { useState, useCallback, useEffect, useMemo, useRef, CSSProperties } from 'react';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getDesktopApps } from '@/lib/appRegistry';
import { DesktopIcon } from './DesktopIcon';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { DESKTOP_GRID, WINDOW_DEFAULTS } from '@/lib/constants';
import { getWallpaper, isImageWallpaper, imageWallpaperStyle } from '@/lib/wallpapers';
import { imageWallpaper } from '@/lib/wallpaperActions';
import { requestOpenFile } from '@/lib/recentDocs';
import { playSound } from '@/lib/sounds';
import { InstallerHost } from '@/components/apps/add-remove-programs/InstallerHost';
import { PointerTrails } from '@/components/system/PointerTrails';

const DESKTOP_FS_PATH = 'C:\\Windows\\Desktop';

interface IconEntry {
  id: string; // app id, or `fs:<name>` for filesystem icons
  name: string;
  icon: string;
  appId?: string;
  fsPath?: string;
  isDirectory?: boolean;
}

interface Point {
  x: number;
  y: number;
}

function snapToGrid(p: Point): Point {
  const col = Math.max(0, Math.round((p.x - DESKTOP_GRID.paddingX) / DESKTOP_GRID.cellWidth));
  const row = Math.max(0, Math.round((p.y - DESKTOP_GRID.paddingY) / DESKTOP_GRID.cellHeight));
  return {
    x: DESKTOP_GRID.paddingX + col * DESKTOP_GRID.cellWidth,
    y: DESKTOP_GRID.paddingY + row * DESKTOP_GRID.cellHeight,
  };
}

function defaultPosition(index: number, rowsPerColumn: number): Point {
  const col = Math.floor(index / rowsPerColumn);
  const row = index % rowsPerColumn;
  return {
    x: DESKTOP_GRID.paddingX + col * DESKTOP_GRID.cellWidth,
    y: DESKTOP_GRID.paddingY + row * DESKTOP_GRID.cellHeight,
  };
}

function rectsIntersect(a: { left: number; top: number; right: number; bottom: number }, b: { left: number; top: number; right: number; bottom: number }) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function Desktop() {
  const { openWindow } = useWindows();
  const { listDir, createFolder, createFile, deleteToRecycleBin, rename, readFile } = useFileSystem();
  const { settings, setSetting, getAppPref, setAppPref } = useSettings();

  const [selectedIcons, setSelectedIcons] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ items: ContextMenuItem[]; position: Point } | null>(null);
  const [marquee, setMarquee] = useState<{ start: Point; end: Point } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [rowsPerColumn, setRowsPerColumn] = useState(8);

  const positions = getAppPref<Record<string, Point>>('desktop', 'iconPositions', {});
  const desktopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const compute = () =>
      setRowsPerColumn(
        Math.max(
          1,
          Math.floor(
            (window.innerHeight - WINDOW_DEFAULTS.taskbarHeight - DESKTOP_GRID.paddingY * 2) / DESKTOP_GRID.cellHeight,
          ),
        ),
      );
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Apps removed via Add/Remove Programs drop off the desktop.
  const uninstalledApps = getAppPref<Record<string, boolean>>('system', 'uninstalledApps', {});

  const desktopFiles = listDir(DESKTOP_FS_PATH) ?? [];
  const icons = useMemo<IconEntry[]>(() => {
    const appIcons: IconEntry[] = getDesktopApps()
      .filter((app) => !uninstalledApps[app.id])
      .map((app) => ({
        id: app.id,
        name: app.name,
        icon: app.icon,
        appId: app.id,
      }));
    const fsIcons: IconEntry[] = desktopFiles.map((node) => ({
      id: `fs:${node.name}`,
      name: node.name,
      icon: node.icon ?? (node.type === 'directory' ? '/icons/folder-16.svg' : '/icons/txt-16.svg'),
      fsPath: `${DESKTOP_FS_PATH}\\${node.name}`,
      isDirectory: node.type === 'directory',
    }));
    return [...appIcons, ...fsIcons];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(desktopFiles.map((n) => [n.name, n.type, n.icon])), JSON.stringify(uninstalledApps)]);

  const iconPosition = useCallback(
    (entry: IconEntry, index: number): Point => positions[entry.id] ?? defaultPosition(index, rowsPerColumn),
    [positions, rowsPerColumn],
  );

  const openEntry = useCallback(
    (entry: IconEntry) => {
      if (entry.appId) {
        openWindow(entry.appId);
      } else if (entry.fsPath) {
        requestOpenFile(entry.fsPath);
      }
    },
    [openWindow],
  );

  // ----- Icon dragging -----
  const dragState = useRef<{ id: string; startPointer: Point; startPos: Point; moved: boolean } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; pos: Point } | null>(null);

  const handleIconPointerDown = useCallback(
    (e: React.PointerEvent, entry: IconEntry, index: number) => {
      if (e.button !== 0 || renamingId === entry.id) return;
      e.stopPropagation();
      if (!selectedIcons.has(entry.id)) setSelectedIcons(new Set([entry.id]));
      dragState.current = {
        id: entry.id,
        startPointer: { x: e.clientX, y: e.clientY },
        startPos: iconPosition(entry, index),
        moved: false,
      };
      // Don't capture the pointer yet — capturing on pointerdown retargets the
      // resulting click/dblclick away from the icon, breaking open-on-double-click.
      // Capture starts in the move handler once an actual drag begins.
    },
    [iconPosition, renamingId, selectedIcons],
  );

  const handleIconPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragState.current;
    if (!drag) return;
    const dx = e.clientX - drag.startPointer.x;
    const dy = e.clientY - drag.startPointer.y;
    if (!drag.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
    if (!drag.moved) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.moved = true;
    setDragPreview({ id: drag.id, pos: { x: drag.startPos.x + dx, y: drag.startPos.y + dy } });
  }, []);

  const handleIconPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragState.current;
      dragState.current = null;
      if (!drag || !drag.moved) {
        setDragPreview(null);
        return;
      }
      const dx = e.clientX - drag.startPointer.x;
      const dy = e.clientY - drag.startPointer.y;
      const snapped = snapToGrid({ x: drag.startPos.x + dx, y: drag.startPos.y + dy });
      setAppPref('desktop', 'iconPositions', { ...positions, [drag.id]: snapped });
      setDragPreview(null);
    },
    [positions, setAppPref],
  );

  // ----- Marquee selection -----
  const handleDesktopPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || e.target !== e.currentTarget) return;
      const start = { x: e.clientX, y: e.clientY };
      setMarquee({ start, end: start });
      setSelectedIcons(new Set());
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handleDesktopPointerMove = useCallback(
    (e: React.PointerEvent) => {
      setMarquee((prev) => {
        if (!prev) return prev;
        const next = { ...prev, end: { x: e.clientX, y: e.clientY } };
        const rect = {
          left: Math.min(next.start.x, next.end.x),
          top: Math.min(next.start.y, next.end.y),
          right: Math.max(next.start.x, next.end.x),
          bottom: Math.max(next.start.y, next.end.y),
        };
        const hit = new Set<string>();
        icons.forEach((entry, i) => {
          const pos = iconPosition(entry, i);
          const box = { left: pos.x, top: pos.y, right: pos.x + DESKTOP_GRID.cellWidth, bottom: pos.y + DESKTOP_GRID.cellHeight };
          if (rectsIntersect(rect, box)) hit.add(entry.id);
        });
        setSelectedIcons(hit);
        return next;
      });
    },
    [icons, iconPosition],
  );

  const handleDesktopPointerUp = useCallback(() => setMarquee(null), []);

  const handleDesktopClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setSelectedIcons(new Set());
  }, []);

  // ----- Context menus -----
  const handleDesktopContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (e.target !== e.currentTarget) return;
      setContextMenu({
        position: { x: e.clientX, y: e.clientY },
        items: [
          {
            label: 'Arrange Icons',
            onClick: () => setAppPref('desktop', 'iconPositions', {}),
          },
          {
            label: 'Line up Icons',
            onClick: () => {
              const lined: Record<string, Point> = {};
              icons.forEach((entry, i) => {
                lined[entry.id] = snapToGrid(iconPosition(entry, i));
              });
              setAppPref('desktop', 'iconPositions', lined);
            },
          },
          { separator: true },
          { label: 'Refresh', onClick: () => setSelectedIcons(new Set()) },
          { separator: true },
          {
            label: 'New Folder',
            onClick: () => {
              playSound('menuClick');
              createFolder(DESKTOP_FS_PATH, 'New Folder');
            },
          },
          {
            label: 'New Text Document',
            onClick: () => {
              playSound('menuClick');
              createFile(DESKTOP_FS_PATH, 'New Text Document.txt', '');
            },
          },
          { separator: true },
          { label: 'Properties', onClick: () => openWindow('display-properties') },
        ],
      });
    },
    [icons, iconPosition, createFolder, createFile, openWindow, setAppPref],
  );

  const handleIconContextMenu = useCallback(
    (e: React.MouseEvent, entry: IconEntry) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIcons(new Set([entry.id]));
      const isFs = !!entry.fsPath;
      const isImage = isFs && /\.(bmp|png)$/i.test(entry.name);
      setContextMenu({
        position: { x: e.clientX, y: e.clientY },
        items: [
          { label: 'Open', bold: true, onClick: () => openEntry(entry) },
          ...(isImage
            ? ([
                {
                  label: 'Set as Wallpaper',
                  onClick: () => {
                    const content = readFile(entry.fsPath!);
                    const source = content && content.startsWith('data:') ? content : entry.fsPath!;
                    setSetting('wallpaper', imageWallpaper(source, 'center'));
                  },
                },
              ] as ContextMenuItem[])
            : []),
          { separator: true },
          {
            label: 'Delete',
            disabled: !isFs,
            onClick: isFs
              ? () => {
                  playSound('recycle');
                  deleteToRecycleBin(entry.fsPath!);
                }
              : undefined,
          },
          {
            label: 'Rename',
            disabled: !isFs,
            onClick: isFs ? () => setRenamingId(entry.id) : undefined,
          },
          { separator: true },
          {
            label: 'Properties',
            onClick: () =>
              window.dispatchEvent(
                new CustomEvent('win98-system-dialog', {
                  detail: {
                    title: `${entry.name} Properties`,
                    message: isFs
                      ? `${entry.name}\n\nType: ${entry.isDirectory ? 'File Folder' : 'File'}\nLocation: ${DESKTOP_FS_PATH}`
                      : `${entry.name}\n\nType: Application\nLocation: C:\\Program Files`,
                  },
                }),
              ),
          },
        ],
      });
    },
    [openEntry, deleteToRecycleBin, readFile, setSetting],
  );

  const handleRename = useCallback(
    (entry: IconEntry, newName: string) => {
      setRenamingId(null);
      if (!newName || newName === entry.name || !entry.fsPath) return;
      const result = rename(entry.fsPath, newName);
      if (!result.ok) {
        window.dispatchEvent(
          new CustomEvent('win98-system-dialog', { detail: { title: 'Error Renaming File', message: result.error } }),
        );
      } else {
        // carry the saved position over to the renamed icon id
        const pos = positions[entry.id];
        if (pos) {
          const next = { ...positions, [`fs:${newName}`]: pos };
          delete next[entry.id];
          setAppPref('desktop', 'iconPositions', next);
        }
      }
    },
    [rename, positions, setAppPref],
  );

  // Resolve the active wallpaper to a background style. Image wallpapers pull
  // their bitmap from a data: URL directly, or from the filesystem when the
  // source is an fs path; a missing/invalid source falls back to the flat color.
  const wallpaperStyle = useMemo<CSSProperties>(() => {
    const w = settings.wallpaper;
    if (isImageWallpaper(w)) {
      const src = w.source.startsWith('data:') ? w.source : readFile(w.source);
      if (src && src.startsWith('data:')) return imageWallpaperStyle(src, w.mode);
      return {};
    }
    return getWallpaper(w)?.style ?? {};
  }, [settings.wallpaper, readFile]);

  const marqueeRect = marquee
    ? {
        left: Math.min(marquee.start.x, marquee.end.x),
        top: Math.min(marquee.start.y, marquee.end.y),
        width: Math.abs(marquee.end.x - marquee.start.x),
        height: Math.abs(marquee.end.y - marquee.start.y),
      }
    : null;

  return (
    <div
      ref={desktopRef}
      className="absolute inset-0 bottom-[28px] overflow-hidden"
      style={{ backgroundColor: settings.desktopColor, ...wallpaperStyle }}
      onClick={handleDesktopClick}
      onContextMenu={handleDesktopContextMenu}
      onPointerDown={handleDesktopPointerDown}
      onPointerMove={handleDesktopPointerMove}
      onPointerUp={handleDesktopPointerUp}
    >
      {icons.map((entry, index) => {
        const pos = dragPreview?.id === entry.id ? dragPreview.pos : iconPosition(entry, index);
        return (
          <div
            key={entry.id}
            className="absolute"
            style={{ left: pos.x, top: pos.y, width: DESKTOP_GRID.cellWidth }}
            onContextMenu={(e) => handleIconContextMenu(e, entry)}
            onPointerDown={(e) => handleIconPointerDown(e, entry, index)}
            onPointerMove={handleIconPointerMove}
            onPointerUp={handleIconPointerUp}
          >
            <DesktopIcon
              appId={entry.id}
              name={entry.name}
              icon={entry.icon}
              selected={selectedIcons.has(entry.id)}
              renaming={renamingId === entry.id}
              onSelect={() => setSelectedIcons(new Set([entry.id]))}
              onDoubleClick={() => openEntry(entry)}
              onRename={(newName) => handleRename(entry, newName)}
            />
          </div>
        );
      })}

      {/* Marquee selection rectangle */}
      {marqueeRect && marqueeRect.width + marqueeRect.height > 4 && (
        <div
          className="absolute border border-dotted border-white/80 bg-[var(--win98-highlight)]/20 pointer-events-none"
          style={marqueeRect}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu items={contextMenu.items} position={contextMenu.position} onClose={() => setContextMenu(null)} />
      )}

      {/* InstallShield wizard for running downloaded setup files */}
      <InstallerHost />

      {/* Fading cursor ghosts, driven by the Mouse applet's Motion tab */}
      <PointerTrails />
    </div>
  );
}
