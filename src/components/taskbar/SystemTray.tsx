'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';

export function SystemTray() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        'flex items-center gap-[4px] h-[22px] px-[6px] flex-shrink-0',
        'border border-solid',
        'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
        'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
      )}
    >
      <img src="/icons/volume-16.svg" alt="Volume" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
      <span className="select-none">{time}</span>
    </div>
  );
}
