'use client';

import { cn } from '@/lib/cn';

interface StatusBarPanel {
  content: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

interface StatusBar98Props {
  panels: StatusBarPanel[];
  className?: string;
}

export function StatusBar98({ panels, className }: StatusBar98Props) {
  return (
    <div
      className={cn(
        'flex items-center h-[20px] px-[2px] gap-[2px]',
        'bg-[var(--win98-button-face)]',
        'border-t border-[var(--win98-button-highlight)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
        className,
      )}
    >
      {panels.map((panel, i) => (
        <div
          key={i}
          className={cn(
            'h-[16px] flex items-center px-[4px] truncate',
            'border border-solid',
            'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
            'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
            i === 0 && !panel.width ? 'flex-1' : '',
            panel.align === 'right' && 'justify-end',
            panel.align === 'center' && 'justify-center',
          )}
          style={panel.width ? { width: panel.width } : undefined}
        >
          {panel.content}
        </div>
      ))}
    </div>
  );
}
