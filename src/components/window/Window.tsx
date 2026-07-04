'use client';

import { useRef, useCallback, useEffect, useState, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { WindowState } from '@/types/window';
import { useWindows } from '@/contexts/WindowContext';
import { TitleBar } from './TitleBar';
import { WINDOW_DEFAULTS } from '@/lib/constants';
import { playSound } from '@/lib/sounds';
import { playZoomAnimation, rectFromElement, taskbarButtonRect, viewportRect } from '@/components/system/ZoomAnimation';

interface WindowProps {
  windowState: WindowState;
  icon16?: string;
  children: ReactNode;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

type SystemMenuItem =
  | { separator: true }
  | { label: string; disabled?: boolean; bold?: boolean; shortcut?: string; run?: () => void };

interface SystemMenuProps {
  windowState: 'normal' | 'minimized' | 'maximized';
  resizable: boolean;
  onClose: () => void;
  onRestore: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onCloseWindow: () => void;
}

// The dropdown opened from the title-bar icon (or Alt+Space). Styled to match
// the desktop context menu; Move/Size are cosmetic placeholders as in Win98.
function SystemMenu({
  windowState,
  resizable,
  onClose,
  onRestore,
  onMinimize,
  onMaximize,
  onCloseWindow,
}: SystemMenuProps) {
  useEffect(() => {
    const handleDown = () => onClose();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const items: SystemMenuItem[] = [
    { label: 'Restore', disabled: windowState === 'normal', run: onRestore },
    { label: 'Move', disabled: true },
    { label: 'Size', disabled: true },
    { label: 'Minimize', disabled: windowState === 'minimized', run: onMinimize },
    { label: 'Maximize', disabled: windowState === 'maximized' || !resizable, run: onMaximize },
    { separator: true },
    { label: 'Close', bold: true, shortcut: 'Alt+F4', run: onCloseWindow },
  ];

  return (
    <div
      className={cn(
        'absolute left-0 top-[18px] z-50 min-w-[150px]',
        'bg-[var(--win98-button-face)] py-[2px]',
        'border-2 border-solid',
        'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
        'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
        'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, i) =>
        'separator' in item ? (
          <div key={i} className="mx-[2px] my-[2px] border-t border-[var(--win98-button-shadow)] border-b border-b-[var(--win98-button-highlight)]" />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            className={cn(
              'flex items-center w-full pl-[24px] pr-[12px] py-[2px] cursor-default select-none text-left gap-6',
              'hover:bg-[var(--win98-highlight)] hover:text-white',
              item.disabled && 'text-[var(--win98-disabled-text)] hover:bg-transparent hover:text-[var(--win98-disabled-text)]',
              item.bold && 'font-bold',
            )}
            onClick={() => {
              if (!item.disabled && item.run) {
                item.run();
                onClose();
              }
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="ml-auto">{item.shortcut}</span>}
          </button>
        ),
      )}
    </div>
  );
}

export function Window({ windowState, icon16, children }: WindowProps) {
  const { windows, focusWindow, closeWindow, minimizeWindow, maximizeWindow, restoreWindow, moveWindow, resizeWindow } =
    useWindows();

  const windowRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<ResizeDirection>(null);
  const [sysMenuOpen, setSysMenuOpen] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, winX: 0, winY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0, winX: 0, winY: 0 });

  const { id, title, position, size, zIndex, state, isFocused, minSize } = windowState;
  const resizable = windowState.resizable !== false;
  // An open modal dialog spawned by this window blocks its content
  const modalChild = windows.find((w) => w.ownerId === id && w.modal && w.state !== 'minimized');

  // Drag handling
  const dragTargetRef = useRef<HTMLElement | null>(null);

  const handleTitlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Presses on the min/max/close buttons must not start a drag — capturing
      // the pointer here would swallow their click events
      if ((e.target as HTMLElement).closest('button')) return;
      // The title-bar icon opens the system menu; it must not begin a drag
      if ((e.target as HTMLElement).tagName === 'IMG') return;
      if (state === 'maximized') return;
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      dragTargetRef.current = target;
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, winX: position.x, winY: position.y };
      focusWindow(id);
    },
    [state, position, id, focusWindow],
  );

  useEffect(() => {
    const target = dragTargetRef.current;
    if (!dragging || !target) return;
    const handleMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      let newX = dragStart.current.winX + dx;
      let newY = dragStart.current.winY + dy;
      const minVisible = WINDOW_DEFAULTS.minVisibleTitlebar;
      // Keep part of the titlebar reachable on every edge: never above the
      // top, never fully past the sides or below the taskbar
      newX = Math.min(Math.max(newX, -size.width + minVisible), window.innerWidth - minVisible);
      newY = Math.min(Math.max(newY, 0), window.innerHeight - WINDOW_DEFAULTS.taskbarHeight - minVisible);
      moveWindow(id, newX, newY);
    };
    const handleUp = (e: PointerEvent) => {
      target.releasePointerCapture(e.pointerId);
      setDragging(false);
    };
    const handleLost = () => setDragging(false);
    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
    target.addEventListener('lostpointercapture', handleLost);
    return () => {
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
      target.removeEventListener('lostpointercapture', handleLost);
    };
  }, [dragging, id, moveWindow, size.width, size.height]);

  // Resize handling
  const resizeTargetRef = useRef<HTMLElement | null>(null);

  const handleResizePointerDown = useCallback(
    (direction: ResizeDirection) => (e: React.PointerEvent) => {
      if (state === 'maximized') return;
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      resizeTargetRef.current = target;
      setResizing(direction);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
        winX: position.x,
        winY: position.y,
      };
      focusWindow(id);
    },
    [state, size, position, id, focusWindow],
  );

  useEffect(() => {
    const target = resizeTargetRef.current;
    if (!resizing || !target) return;
    const handleMove = (e: PointerEvent) => {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      let newWidth = resizeStart.current.width;
      let newHeight = resizeStart.current.height;
      let newX = resizeStart.current.winX;
      let newY = resizeStart.current.winY;

      if (resizing.includes('e')) newWidth = resizeStart.current.width + dx;
      if (resizing.includes('w')) {
        newWidth = resizeStart.current.width - dx;
        newX = resizeStart.current.winX + dx;
      }
      if (resizing.includes('s')) newHeight = resizeStart.current.height + dy;
      if (resizing.includes('n')) {
        newHeight = resizeStart.current.height - dy;
        newY = resizeStart.current.winY + dy;
      }

      newWidth = Math.max(minSize.width, newWidth);
      newHeight = Math.max(minSize.height, newHeight);

      // If we hit min, don't move the position
      if (resizing.includes('w') && newWidth === minSize.width) {
        newX = resizeStart.current.winX + resizeStart.current.width - minSize.width;
      }
      if (resizing.includes('n') && newHeight === minSize.height) {
        newY = resizeStart.current.winY + resizeStart.current.height - minSize.height;
      }

      resizeWindow(id, newWidth, newHeight);
      if (resizing.includes('w') || resizing.includes('n')) {
        moveWindow(id, newX, newY);
      }
    };
    const handleUp = (e: PointerEvent) => {
      target.releasePointerCapture(e.pointerId);
      setResizing(null);
    };
    const handleLost = () => setResizing(null);
    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
    target.addEventListener('lostpointercapture', handleLost);
    return () => {
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
      target.removeEventListener('lostpointercapture', handleLost);
    };
  }, [resizing, id, minSize, moveWindow, resizeWindow]);

  // Alt+Space opens the system menu of the focused window
  useEffect(() => {
    if (!isFocused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === ' ' || e.code === 'Space')) {
        e.preventDefault();
        setSysMenuOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFocused]);

  // Window state transitions dispatch synchronously first, then fire the zoom
  // overlay from the window's live rect toward its destination. The overlay is
  // throwaway, so nothing here waits on it.
  const restoredRect = () => {
    const p = windowState.restoredPosition ?? position;
    const s = windowState.restoredSize ?? size;
    return { x: p.x, y: p.y, width: s.width, height: s.height };
  };

  const doMinimize = () => {
    playSound('minimize');
    const from = rectFromElement(windowRef.current);
    const to = taskbarButtonRect(id);
    minimizeWindow(id);
    playZoomAnimation({ from, to });
  };

  const doMaximize = () => {
    playSound('maximize');
    const from = rectFromElement(windowRef.current);
    maximizeWindow(id);
    playZoomAnimation({ from, to: viewportRect() });
  };

  const doRestore = () => {
    playSound('restoreDown');
    const from = rectFromElement(windowRef.current);
    restoreWindow(id);
    playZoomAnimation({ from, to: restoredRect() });
  };

  if (state === 'minimized') return null;

  const isMaximized = state === 'maximized';
  const windowStyle = isMaximized
    ? { left: 0, top: 0, right: 0, bottom: WINDOW_DEFAULTS.taskbarHeight, zIndex }
    : { left: position.x, top: position.y, width: size.width, height: size.height, zIndex };

  const resizeEdgeClass = 'absolute z-10';
  const edgeSize = 4;

  return (
    <div
      ref={windowRef}
      className={cn(
        'flex flex-col',
        'bg-[var(--win98-button-face)]',
        'border-2 border-solid',
        'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
        'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
        'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
        isMaximized ? 'fixed' : 'absolute',
      )}
      style={windowStyle}
      onPointerDown={() => { if (!isFocused) focusWindow(id); }}
    >
      <TitleBar
        title={title}
        icon16={icon16}
        isFocused={isFocused}
        windowState={state}
        showMaximize={resizable}
        onMinimize={doMinimize}
        onMaximize={doMaximize}
        onRestore={doRestore}
        onClose={() => closeWindow(id)}
        onDoubleClick={() => {
          if (state === 'maximized') doRestore();
          else if (resizable) doMaximize();
        }}
        onPointerDown={handleTitlePointerDown}
        onIconClick={() => setSysMenuOpen((open) => !open)}
        onIconDoubleClick={() => closeWindow(id)}
      />

      {sysMenuOpen && (
        <SystemMenu
          windowState={state}
          resizable={resizable}
          onClose={() => setSysMenuOpen(false)}
          onRestore={doRestore}
          onMinimize={doMinimize}
          onMaximize={doMaximize}
          onCloseWindow={() => closeWindow(id)}
        />
      )}

      {/* Window content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Modal guard: blocks the content while an owned modal dialog is open */}
      {modalChild && (
        <div
          className="absolute left-0 right-0 top-[18px] bottom-0 z-40"
          onPointerDown={(e) => {
            e.stopPropagation();
            playSound('ding');
            window.dispatchEvent(new CustomEvent('win98-flash-window', { detail: { id: modalChild.id } }));
            focusWindow(modalChild.id);
          }}
        />
      )}

      {/* Resize handles (only when not maximized and window is resizable) */}
      {!isMaximized && resizable && (
        <>
          <div className={cn(resizeEdgeClass, 'cursor-n-resize')} style={{ top: 0, left: edgeSize, right: edgeSize, height: edgeSize }} onPointerDown={handleResizePointerDown('n')} />
          <div className={cn(resizeEdgeClass, 'cursor-s-resize')} style={{ bottom: 0, left: edgeSize, right: edgeSize, height: edgeSize }} onPointerDown={handleResizePointerDown('s')} />
          <div className={cn(resizeEdgeClass, 'cursor-e-resize')} style={{ top: edgeSize, right: 0, bottom: edgeSize, width: edgeSize }} onPointerDown={handleResizePointerDown('e')} />
          <div className={cn(resizeEdgeClass, 'cursor-w-resize')} style={{ top: edgeSize, left: 0, bottom: edgeSize, width: edgeSize }} onPointerDown={handleResizePointerDown('w')} />
          <div className={cn(resizeEdgeClass, 'cursor-nw-resize')} style={{ top: 0, left: 0, width: edgeSize, height: edgeSize }} onPointerDown={handleResizePointerDown('nw')} />
          <div className={cn(resizeEdgeClass, 'cursor-ne-resize')} style={{ top: 0, right: 0, width: edgeSize, height: edgeSize }} onPointerDown={handleResizePointerDown('ne')} />
          <div className={cn(resizeEdgeClass, 'cursor-sw-resize')} style={{ bottom: 0, left: 0, width: edgeSize, height: edgeSize }} onPointerDown={handleResizePointerDown('sw')} />
          <div className={cn(resizeEdgeClass, 'cursor-se-resize')} style={{ bottom: 0, right: 0, width: edgeSize, height: edgeSize }} onPointerDown={handleResizePointerDown('se')} />
        </>
      )}
    </div>
  );
}
