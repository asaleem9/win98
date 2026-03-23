'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface Button98Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'flat' | 'start';
  active?: boolean;
}

export const Button98 = forwardRef<HTMLButtonElement, Button98Props>(
  function Button98({ className, variant = 'default', active, disabled, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'font-[family-name:var(--win98-font)] text-[11px] bg-[var(--win98-button-face)] text-[var(--win98-button-text)]',
          'px-[6px] py-[1px] min-w-[75px] min-h-[23px]',
          'flex items-center justify-center gap-1',
          'outline-none select-none',
          'focus-visible:outline-1 focus-visible:outline-dotted focus-visible:outline-black focus-visible:-outline-offset-4',
          variant === 'default' && !active && [
            'border-2 border-solid',
            'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
            'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
            'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
            'active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]',
            'active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
            'active:shadow-[inset_1px_1px_0_var(--win98-button-shadow)]',
            'active:pt-[2px] active:pl-[2px]',
          ],
          (variant === 'default' && active) && [
            'border-2 border-solid',
            'border-t-[var(--win98-button-dark-shadow)] border-l-[var(--win98-button-dark-shadow)]',
            'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
            'shadow-[inset_1px_1px_0_var(--win98-button-shadow)]',
            'pt-[2px] pl-[2px]',
          ],
          variant === 'flat' && [
            'border border-transparent min-w-0',
            'hover:border-t-[var(--win98-button-highlight)] hover:border-l-[var(--win98-button-highlight)]',
            'hover:border-b-[var(--win98-button-shadow)] hover:border-r-[var(--win98-button-shadow)]',
            'active:border-t-[var(--win98-button-shadow)] active:border-l-[var(--win98-button-shadow)]',
            'active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
          ],
          variant === 'start' && [
            'border-2 border-solid font-bold min-w-0',
            'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
            'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
            'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
          ],
          disabled && 'text-[var(--win98-disabled-text)] [text-shadow:1px_1px_0_var(--win98-button-highlight)] pointer-events-none',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
