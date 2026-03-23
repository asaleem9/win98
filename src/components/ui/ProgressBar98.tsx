'use client';

import { cn } from '@/lib/cn';

interface ProgressBar98Props {
  value: number;
  max?: number;
  segmented?: boolean;
  className?: string;
}

export function ProgressBar98({ value, max = 100, segmented = true, className }: ProgressBar98Props) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={cn(
        'h-[16px] bg-white',
        'border-2 border-solid',
        'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
        'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
        'shadow-[inset_-1px_-1px_0_var(--win98-button-light),inset_1px_1px_0_var(--win98-button-dark-shadow)]',
        className,
      )}
    >
      <div
        className={cn(
          'h-full transition-[width] duration-300',
          segmented
            ? 'bg-[repeating-linear-gradient(to_right,var(--win98-highlight)_0px,var(--win98-highlight)_8px,transparent_8px,transparent_10px)]'
            : 'bg-[var(--win98-highlight)]',
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
