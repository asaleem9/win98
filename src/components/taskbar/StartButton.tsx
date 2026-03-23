'use client';

import { cn } from '@/lib/cn';

interface StartButtonProps {
  active: boolean;
  onClick: () => void;
}

export function StartButton({ active, onClick }: StartButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-[3px] h-[22px] px-[4px] flex-shrink-0',
        'bg-[var(--win98-button-face)] cursor-default select-none',
        'font-[family-name:var(--win98-font)] text-[11px] font-bold',
        'border border-solid',
        active
          ? [
              'border-t-[var(--win98-button-dark-shadow)] border-l-[var(--win98-button-dark-shadow)]',
              'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
            ]
          : [
              'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
              'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
              'active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]',
              'active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
            ],
      )}
    >
      <img src="/icons/windows-logo-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
      <span>Start</span>
    </button>
  );
}
