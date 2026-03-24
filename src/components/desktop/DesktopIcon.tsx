'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

interface DesktopIconProps {
  appId: string;
  name: string;
  icon: string;
  selected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}

export function DesktopIcon({ appId, name, icon, selected, onSelect, onDoubleClick }: DesktopIconProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center w-[75px] py-[6px] cursor-default select-none',
        'text-white text-[11px] font-[family-name:var(--win98-font)]',
      )}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onDoubleClick={onDoubleClick}
    >
      <div className={cn('p-[2px]', selected && 'bg-[var(--win98-highlight)] bg-opacity-50')}>
        <img
          src={icon}
          alt={name}
          className="w-8 h-8"
          style={{ imageRendering: 'pixelated' }}
          draggable={false}
        />
      </div>
      <span
        className={cn(
          'text-center text-[11px] leading-tight mt-[2px] max-w-[75px] px-[2px]',
          'line-clamp-2 overflow-hidden',
          selected
            ? 'bg-[var(--win98-highlight)] text-white'
            : 'text-white [text-shadow:1px_1px_1px_black]',
        )}
      >
        {name}
      </span>
    </div>
  );
}
