'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

export type ContextMenuItem =
  | { label: string; onClick?: () => void; disabled?: boolean; bold?: boolean; separator?: false }
  | { separator: true; label?: never; onClick?: never; disabled?: never; bold?: never };

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = () => onClose();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position so menu doesn't go off-screen
  const style: React.CSSProperties = { left: position.x, top: position.y };

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-[9998] min-w-[160px]',
        'bg-[var(--win98-button-face)] py-[2px]',
        'border-2 border-solid',
        'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
        'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
        'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
      )}
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="mx-[2px] my-[2px] border-t border-[var(--win98-button-shadow)] border-b border-b-[var(--win98-button-highlight)]" />
        ) : (
          <button
            key={i}
            className={cn(
              'flex items-center w-full px-6 py-[2px] cursor-default select-none text-left',
              'hover:bg-[var(--win98-highlight)] hover:text-white',
              item.disabled && 'text-[var(--win98-disabled-text)] hover:bg-transparent hover:text-[var(--win98-disabled-text)]',
              item.bold && 'font-bold',
            )}
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick();
                onClose();
              }
            }}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
