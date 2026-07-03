'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

interface DesktopIconProps {
  appId: string;
  name: string;
  icon: string;
  selected: boolean;
  renaming?: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onRename?: (newName: string) => void;
}

export function DesktopIcon({ name, icon, selected, renaming, onSelect, onDoubleClick, onRename }: DesktopIconProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={icon}
          alt={name}
          className="w-8 h-8"
          style={{ imageRendering: 'pixelated' }}
          draggable={false}
        />
      </div>
      {renaming && onRename ? (
        <input
          ref={inputRef}
          defaultValue={name}
          className="text-black text-[11px] w-[72px] px-[1px] mt-[2px] border border-black outline-none bg-white text-center"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRename((e.target as HTMLInputElement).value.trim());
            if (e.key === 'Escape') onRename(name);
          }}
          onBlur={(e) => onRename(e.target.value.trim())}
        />
      ) : (
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
      )}
    </div>
  );
}
