'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button98 } from './Button98';

export type DialogIcon = 'error' | 'warning' | 'info' | 'question';

interface DialogButton {
  label: string;
  onClick: () => void;
  default?: boolean;
}

interface Dialog98Props {
  title: string;
  icon?: DialogIcon;
  message: ReactNode;
  buttons: DialogButton[];
  className?: string;
}

const iconMap: Record<DialogIcon, { char: string; color: string }> = {
  error: { char: '✕', color: '#ff0000' },
  warning: { char: '!', color: '#ffcc00' },
  info: { char: 'i', color: '#0000ff' },
  question: { char: '?', color: '#0000ff' },
};

export function Dialog98({ title, icon, message, buttons, className }: Dialog98Props) {
  return (
    <div
      className={cn(
        'bg-[var(--win98-button-face)]',
        'border-2 border-solid',
        'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
        'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
        'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
        className,
      )}
    >
      {/* Title bar */}
      <div
        className={cn(
          'flex items-center h-[18px] px-[3px]',
          'bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)]',
          'text-white text-[11px] font-bold select-none',
        )}
      >
        <span className="truncate">{title}</span>
      </div>

      {/* Content */}
      <div className="flex items-start gap-3 p-4">
        {icon && (
          <div
            className={cn(
              'w-8 h-8 flex-shrink-0 flex items-center justify-center',
              'rounded-full border-2 border-solid text-lg font-bold',
            )}
            style={{
              borderColor: iconMap[icon].color,
              color: iconMap[icon].color,
              backgroundColor: icon === 'warning' ? '#ffcc00' : 'white',
            }}
          >
            {iconMap[icon].char}
          </div>
        )}
        <div className="flex-1 pt-1 select-none">{message}</div>
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-[6px] pb-3 px-4">
        {buttons.map((btn) => (
          <Button98
            key={btn.label}
            onClick={btn.onClick}
            className={cn('min-w-[75px]', btn.default && 'ring-1 ring-black ring-offset-0')}
          >
            {btn.label}
          </Button98>
        ))}
      </div>
    </div>
  );
}
