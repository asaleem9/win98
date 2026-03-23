'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

export const Select98 = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select98({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'font-[family-name:var(--win98-font)] text-[11px]',
          'bg-[var(--win98-input-bg)] text-[var(--win98-input-text)]',
          'border-2 border-solid',
          'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
          'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
          'shadow-[inset_-1px_-1px_0_var(--win98-button-light),inset_1px_1px_0_var(--win98-button-dark-shadow)]',
          'px-[2px] py-[1px] outline-none',
          'disabled:bg-[var(--win98-button-face)] disabled:text-[var(--win98-disabled-text)]',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
