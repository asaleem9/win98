'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ToolbarItem {
  id: string;
  icon?: ReactNode;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  separator?: boolean;
  active?: boolean;
}

interface Toolbar98Props {
  items: ToolbarItem[];
  className?: string;
}

export function Toolbar98({ items, className }: Toolbar98Props) {
  return (
    <div
      className={cn(
        'flex items-center gap-0 px-1 py-[2px]',
        'bg-[var(--win98-button-face)]',
        'border-b border-[var(--win98-button-shadow)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
        className,
      )}
    >
      {/* Grip handle */}
      <div className="w-[4px] h-[20px] mr-1 flex flex-col justify-center gap-[2px] flex-shrink-0">
        <div className="w-full h-[1px] bg-[var(--win98-button-highlight)] shadow-[0_1px_0_var(--win98-button-shadow)]" />
        <div className="w-full h-[1px] bg-[var(--win98-button-highlight)] shadow-[0_1px_0_var(--win98-button-shadow)]" />
      </div>
      {items.map((item) =>
        item.separator ? (
          <div
            key={item.id}
            className="w-[2px] h-[20px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]"
          />
        ) : (
          <button
            key={item.id}
            onClick={item.onClick}
            disabled={item.disabled}
            className={cn(
              'flex flex-col items-center justify-center min-w-[24px] h-[22px] px-[2px]',
              'border border-transparent cursor-default select-none',
              !item.disabled && [
                'hover:border-t-[var(--win98-button-highlight)] hover:border-l-[var(--win98-button-highlight)]',
                'hover:border-b-[var(--win98-button-shadow)] hover:border-r-[var(--win98-button-shadow)]',
                'active:border-t-[var(--win98-button-shadow)] active:border-l-[var(--win98-button-shadow)]',
                'active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
              ],
              item.active && [
                'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
                'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
                'bg-[var(--win98-button-face)]',
              ],
              item.disabled && 'opacity-50',
            )}
          >
            {item.icon && <div className="w-4 h-4 flex items-center justify-center">{item.icon}</div>}
            {item.label && <span className="text-[9px] leading-none mt-[1px]">{item.label}</span>}
          </button>
        ),
      )}
    </div>
  );
}
