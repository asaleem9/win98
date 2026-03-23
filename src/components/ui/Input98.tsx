'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface Input98Props extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'flat';
}

export const Input98 = forwardRef<HTMLInputElement, Input98Props>(
  function Input98({ className, variant = 'default', ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'font-[family-name:var(--win98-font)] text-[11px]',
          'bg-[var(--win98-input-bg)] text-[var(--win98-input-text)]',
          'px-[2px] py-[1px] outline-none',
          variant === 'default' && [
            'border-2 border-solid',
            'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
            'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
            'shadow-[inset_-1px_-1px_0_var(--win98-button-light),inset_1px_1px_0_var(--win98-button-dark-shadow)]',
          ],
          'disabled:bg-[var(--win98-button-face)] disabled:text-[var(--win98-disabled-text)]',
          className,
        )}
        {...props}
      />
    );
  },
);
