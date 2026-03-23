'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface Checkbox98Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox98 = forwardRef<HTMLInputElement, Checkbox98Props>(
  function Checkbox98({ className, label, id, ...props }, ref) {
    const inputId = id || `checkbox-${label?.replace(/\s/g, '-')}`;
    return (
      <label
        htmlFor={inputId}
        className={cn(
          'flex items-center gap-[6px] cursor-default select-none',
          'font-[family-name:var(--win98-font)] text-[11px]',
          props.disabled && 'text-[var(--win98-disabled-text)] [text-shadow:1px_1px_0_var(--win98-button-highlight)]',
          className,
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={cn(
            'appearance-none w-[13px] h-[13px] flex-shrink-0',
            'bg-[var(--win98-input-bg)]',
            'border-2 border-solid',
            'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
            'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
            'shadow-[inset_-1px_-1px_0_var(--win98-button-light),inset_1px_1px_0_var(--win98-button-dark-shadow)]',
            'checked:bg-[var(--win98-input-bg)]',
            "checked:after:content-['✓'] checked:after:text-[11px] checked:after:font-bold checked:after:leading-none checked:after:flex checked:after:items-center checked:after:justify-center",
          )}
          {...props}
        />
        {label && <span>{label}</span>}
      </label>
    );
  },
);
