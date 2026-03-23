'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface GroupBox98Props {
  label?: string;
  children: ReactNode;
  className?: string;
}

export function GroupBox98({ label, children, className }: GroupBox98Props) {
  return (
    <fieldset
      className={cn(
        'border-2 border-solid px-3 pb-3 pt-1',
        'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
        'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
        className,
      )}
    >
      {label && (
        <legend className="px-1 bg-[var(--win98-button-face)] select-none">
          {label}
        </legend>
      )}
      {children}
    </fieldset>
  );
}
