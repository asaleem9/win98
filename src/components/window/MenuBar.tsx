'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface MenuItem {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  separator?: boolean;
  checked?: boolean;
  submenu?: MenuItem[];
}

export interface MenuDefinition {
  label: string;
  items: MenuItem[];
}

interface MenuBarProps {
  menus: MenuDefinition[];
  className?: string;
}

export function MenuBar({ menus, className }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setHovering(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [openMenu]);

  return (
    <div
      ref={barRef}
      className={cn(
        'flex items-center h-[20px] bg-[var(--win98-button-face)] shrink-0',
        'border-b border-[var(--win98-button-shadow)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
        className,
      )}
    >
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            className={cn(
              'px-[6px] py-[2px] cursor-default select-none',
              openMenu === menu.label && 'bg-[var(--win98-highlight)] text-white',
            )}
            onMouseDown={() => {
              if (openMenu === menu.label) {
                setOpenMenu(null);
                setHovering(false);
              } else {
                setOpenMenu(menu.label);
                setHovering(true);
              }
            }}
            onMouseEnter={() => {
              if (hovering && openMenu) setOpenMenu(menu.label);
            }}
          >
            {menu.label}
          </button>
          {openMenu === menu.label && (
            <DropdownMenu
              items={menu.items}
              onClose={() => {
                setOpenMenu(null);
                setHovering(false);
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function DropdownMenu({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  return (
    <div
      className={cn(
        'absolute left-0 top-full z-[9999] min-w-[160px]',
        'bg-[var(--win98-button-face)] py-[2px]',
        'border-2 border-solid',
        'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
        'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
        'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
      )}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="mx-[2px] my-[2px] h-0 border-t border-[var(--win98-button-shadow)] border-b border-b-[var(--win98-button-highlight)]" />
        ) : (
          <button
            key={i}
            className={cn(
              'flex items-center w-full px-[20px] py-[2px] cursor-default select-none text-left',
              'hover:bg-[var(--win98-highlight)] hover:text-white',
              item.disabled && 'text-[var(--win98-disabled-text)] hover:bg-transparent hover:text-[var(--win98-disabled-text)]',
            )}
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick();
                onClose();
              }
            }}
          >
            <span className="w-[16px] mr-[2px] text-center">
              {item.checked && '✓'}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="ml-4 text-[var(--win98-disabled-text)]">{item.shortcut}</span>
            )}
          </button>
        ),
      )}
    </div>
  );
}
