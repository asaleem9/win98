'use client';

import { useCallback, useEffect, useId, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { useWindows } from '@/contexts/WindowContext';
import { WINDOW_DEFAULTS } from '@/lib/constants';

interface ManagedDialogProps {
  ownerId: string;
  title: string;
  width: number;
  height: number;
  modal?: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A window-manager-aware dialog. It registers a real window (so it earns a
 * z-index, focus, and modal treatment against its owner) but renders its own
 * fixed-size chrome through a portal — it has no taskbar button and cannot be
 * resized. Unmounting closes the underlying window.
 */
export function ManagedDialog({ ownerId, title, width, height, modal, onClose, children }: ManagedDialogProps) {
  const { windows, openWindow, closeWindow, focusWindow, moveWindow } = useWindows();

  // A stable window id for this dialog instance
  const rawId = useId();
  const idRef = useRef(`dialog-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`);
  const id = idRef.current;

  const [mounted, setMounted] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  // Register on mount, tear down on unmount
  useEffect(() => {
    const x = typeof window !== 'undefined' ? Math.max(0, Math.round((window.innerWidth - width) / 2)) : 120;
    const y = typeof window !== 'undefined' ? Math.max(0, Math.round((window.innerHeight - height) / 3)) : 90;
    openWindow('__dialog__', { id, title, ownerId, modal, position: { x, y } });
    setMounted(true);
    return () => closeWindow(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const win = windows.find((w) => w.id === id);

  // Owner-side clicks ask us to flash: blink the title bar a few times
  useEffect(() => {
    const onFlash = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== id) return;
      focusWindow(id);
      let ticks = 0;
      setFlashOn(true);
      const timer = setInterval(() => {
        ticks += 1;
        setFlashOn((on) => !on);
        if (ticks >= 6) {
          clearInterval(timer);
          setFlashOn(false);
        }
      }, 120);
    };
    window.addEventListener('win98-flash-window', onFlash);
    return () => window.removeEventListener('win98-flash-window', onFlash);
  }, [id, focusWindow]);

  // Drag by the title bar, clamped to the desktop like a normal window
  const dragTargetRef = useRef<HTMLElement | null>(null);
  const dragStart = useRef({ x: 0, y: 0, winX: 0, winY: 0 });
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      dragTargetRef.current = target;
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, winX: win?.position.x ?? 0, winY: win?.position.y ?? 0 };
      focusWindow(id);
    },
    [win, id, focusWindow],
  );

  useEffect(() => {
    const target = dragTargetRef.current;
    if (!dragging || !target) return;
    const handleMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const minVisible = WINDOW_DEFAULTS.minVisibleTitlebar;
      let newX = dragStart.current.winX + dx;
      let newY = dragStart.current.winY + dy;
      newX = Math.min(Math.max(newX, -width + minVisible), window.innerWidth - minVisible);
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
  }, [dragging, id, moveWindow, width]);

  if (!mounted || !win || typeof document === 'undefined') return null;

  const isActive = flashOn ? false : win.isFocused;

  const chrome = (
    <div
      className={cn(
        'fixed flex flex-col',
        'bg-[var(--win98-button-face)]',
        'border-2 border-solid',
        'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
        'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
        'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
      )}
      style={{ left: win.position.x, top: win.position.y, width, height, zIndex: win.zIndex }}
      onPointerDown={() => { if (!win.isFocused) focusWindow(id); }}
    >
      <div
        className={cn(
          'flex items-center h-[18px] px-[2px] gap-[2px] select-none shrink-0',
          isActive
            ? 'bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)]'
            : 'bg-gradient-to-r from-[var(--win98-titlebar-inactive-start)] to-[var(--win98-titlebar-inactive-end)]',
        )}
        onPointerDown={handlePointerDown}
      >
        <span
          className={cn(
            'flex-1 truncate text-[11px] font-bold leading-none px-[2px]',
            'font-[family-name:var(--win98-font)]',
            isActive ? 'text-white' : 'text-[var(--win98-disabled-text)]',
          )}
        >
          {title}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className={cn(
            'w-[16px] h-[14px] flex items-center justify-center',
            'bg-[var(--win98-button-face)]',
            'border border-solid',
            'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
            'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
            'active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]',
            'active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
          )}
        >
          <span className="text-[10px] font-bold leading-none mt-[-1px]">✕</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );

  return createPortal(chrome, document.body);
}
