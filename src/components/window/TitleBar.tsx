'use client';

import { cn } from '@/lib/cn';

interface TitleBarProps {
  title: string;
  icon16?: string;
  isFocused: boolean;
  windowState: 'normal' | 'minimized' | 'maximized';
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onClose: () => void;
  onDoubleClick: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
}

export function TitleBar({
  title,
  icon16,
  isFocused,
  windowState,
  onMinimize,
  onMaximize,
  onRestore,
  onClose,
  onDoubleClick,
  onPointerDown,
}: TitleBarProps) {
  const isActive = isFocused;

  return (
    <div
      className={cn(
        'flex items-center h-[18px] px-[2px] gap-[2px] select-none shrink-0',
        isActive
          ? 'bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)]'
          : 'bg-gradient-to-r from-[var(--win98-titlebar-inactive-start)] to-[var(--win98-titlebar-inactive-end)]',
      )}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
    >
      {icon16 && (
        <img
          src={icon16}
          alt=""
          className="w-[14px] h-[14px] flex-shrink-0"
          style={{ imageRendering: 'pixelated' }}
          draggable={false}
        />
      )}
      <span
        className={cn(
          'flex-1 truncate text-[11px] font-bold leading-none',
          'font-[family-name:var(--win98-font)]',
          isActive ? 'text-white' : 'text-[var(--win98-disabled-text)]',
        )}
      >
        {title}
      </span>
      <div className="flex gap-[1px]">
        {/* Minimize */}
        <button
          onClick={(e) => { e.stopPropagation(); onMinimize(); }}
          className={cn(
            'w-[16px] h-[14px] flex items-end justify-center pb-[1px]',
            'bg-[var(--win98-button-face)]',
            'border border-solid',
            'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
            'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
            'active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]',
            'active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
          )}
        >
          <div className="w-[6px] h-[2px] bg-black" />
        </button>
        {/* Maximize / Restore */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            windowState === 'maximized' ? onRestore() : onMaximize();
          }}
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
          {windowState === 'maximized' ? (
            // Restore icon: two overlapping rectangles
            <div className="relative w-[8px] h-[8px]">
              <div className="absolute top-0 right-0 w-[6px] h-[6px] border border-black border-t-2" />
              <div className="absolute bottom-0 left-0 w-[6px] h-[6px] border border-black border-t-2 bg-[var(--win98-button-face)]" />
            </div>
          ) : (
            // Maximize icon: single rectangle
            <div className="w-[8px] h-[7px] border border-black border-t-2" />
          )}
        </button>
        {/* Close */}
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
    </div>
  );
}
