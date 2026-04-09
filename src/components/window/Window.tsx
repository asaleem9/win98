'use client';

import { useRef, useCallback, useEffect, useState, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { WindowState } from '@/types/window';
import { useWindows } from '@/contexts/WindowContext';
import { TitleBar } from './TitleBar';
import { WINDOW_DEFAULTS } from '@/lib/constants';

interface WindowProps {
  windowState: WindowState;
  icon16?: string;
  children: ReactNode;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

export function Window({ windowState, icon16, children }: WindowProps) {
  const { focusWindow, closeWindow, minimizeWindow, maximizeWindow, restoreWindow, moveWindow, resizeWindow } =
    useWindows();

  const windowRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<ResizeDirection>(null);
  const dragStart = useRef({ x: 0, y: 0, winX: 0, winY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0, winX: 0, winY: 0 });

  const { id, title, position, size, zIndex, state, isFocused, minSize } = windowState;

  // Drag handling
  const dragTargetRef = useRef<HTMLElement | null>(null);

  const handleTitlePointerDown = useCallback(
    (e: React.PointerEvent) => {
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
      const newX = dragStart.current.winX + dx;
      let newY = dragStart.current.winY + dy;
      // Keep at least 50px of titlebar visible
      newY = Math.max(-size.height + WINDOW_DEFAULTS.minVisibleTitlebar, newY);
      moveWindow(id, newX, newY);
    };
    const handleUp = (e: PointerEvent) => {
      target.releasePointerCapture(e.pointerId);
      setDragging(false);
    };
    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
    target.addEventListener('lostpointercapture', () => setDragging(false));
    return () => {
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
      target.removeEventListener('lostpointercapture', () => setDragging(false));
    };
  }, [dragging, id, moveWindow, size.height]);

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
    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
    target.addEventListener('lostpointercapture', () => setResizing(null));
    return () => {
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
      target.removeEventListener('lostpointercapture', () => setResizing(null));
    };
  }, [resizing, id, minSize, moveWindow, resizeWindow]);

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
        onMinimize={() => minimizeWindow(id)}
        onMaximize={() => maximizeWindow(id)}
        onRestore={() => restoreWindow(id)}
        onClose={() => closeWindow(id)}
        onDoubleClick={() => {
          if (state === 'maximized') restoreWindow(id);
          else maximizeWindow(id);
        }}
        onPointerDown={handleTitlePointerDown}
      />

      {/* Window content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Resize handles (only when not maximized) */}
      {!isMaximized && (
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
