'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface Radio98Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Radio98 = forwardRef<HTMLInputElement, Radio98Props>(
  function Radio98({ className, label, id, ...props }, ref) {
    const inputId = id || `radio-${label?.replace(/\s/g, '-')}`;
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
          type="radio"
          id={inputId}
          className={cn(
            'appearance-none w-[12px] h-[12px] flex-shrink-0 rounded-full',
            'bg-[var(--win98-input-bg)]',
            'border-2 border-solid',
            'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
            'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
            'checked:after:content-[""] checked:after:block checked:after:w-[4px] checked:after:h-[4px]',
            'checked:after:bg-black checked:after:rounded-full checked:after:m-auto checked:after:mt-[2px]',
          )}
          {...props}
        />
        {label && <span>{label}</span>}
      </label>
    );
  },
);
