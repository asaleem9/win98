'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useWindows } from '@/contexts/WindowContext';
import { cn } from '@/lib/cn';

export interface MenuItem {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  separator?: boolean;
  checked?: boolean;
  /** Renders • instead of ✓ when checked (mutually-exclusive option groups) */
  radio?: boolean;
  submenu?: MenuItem[];
}

export interface MenuDefinition {
  label: string;
  items: MenuItem[];
}

interface MenuBarProps {
  menus: MenuDefinition[];
  className?: string;
  /**
   * When provided and the matching window is focused, the menubar responds to
   * keyboard navigation (Alt to arm, arrows/Enter/Esc, accelerators).
   */
  windowId?: string;
}

// Sits above windows and the taskbar (z-[9990]); the boot/shutdown overlays at
// z-[99999] intentionally stay on top.
const MENU_Z = 'z-[9995]';

// --- label / accelerator helpers -------------------------------------------

/** The accelerator letter for a label, e.g. '&File' → 'f'. Null when opt-out. */
function parseAccelerator(label: string): string | null {
  for (let i = 0; i < label.length; i++) {
    if (label[i] === '&') {
      if (label[i + 1] === '&') { i++; continue; }
      if (label[i + 1]) return label[i + 1].toLowerCase();
    }
  }
  return null;
}

/** Render a label, underlining the accelerator char and stripping the '&'. */
function renderMenuLabel(label: string): ReactNode {
  const parts: ReactNode[] = [];
  let buffer = '';
  let accelDone = false;
  let key = 0;
  const flush = () => {
    if (buffer) { parts.push(<span key={key++}>{buffer}</span>); buffer = ''; }
  };
  for (let i = 0; i < label.length; i++) {
    const ch = label[i];
    if (ch === '&') {
      if (label[i + 1] === '&') { buffer += '&'; i++; continue; }
      if (!accelDone && label[i + 1]) {
        flush();
        parts.push(<span key={key++} className="underline">{label[i + 1]}</span>);
        accelDone = true;
        i++;
        continue;
      }
      continue; // trailing or extra '&' — drop it
    }
    buffer += ch;
  }
  flush();
  return <>{parts}</>;
}

// --- selection helpers ------------------------------------------------------

function stepSelectable(items: MenuItem[], from: number, dir: 1 | -1): number {
  const n = items.length;
  if (!n) return -1;
  let i = from;
  for (let c = 0; c < n; c++) {
    i = (i + dir + n) % n;
    const it = items[i];
    if (it && !it.separator && !it.disabled) return i;
  }
  return -1;
}

const firstSelectable = (items: MenuItem[]) => stepSelectable(items, -1, 1);
const lastSelectable = (items: MenuItem[]) => stepSelectable(items, 0, -1);

/** The items array at each open level, indexed by depth. levels[0] is the top. */
function computeLevels(topItems: MenuItem[], path: number[]): MenuItem[][] {
  const levels: MenuItem[][] = [topItems];
  for (let k = 1; k < path.length; k++) {
    const parent = levels[k - 1][path[k - 1]];
    if (parent?.submenu) levels.push(parent.submenu);
    else break;
  }
  return levels;
}

/** The alnum letter a key event represents, resilient to Alt-modified keys. */
function eventLetter(e: KeyboardEvent): string | null {
  if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) return e.key.toLowerCase();
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(e.code)) return e.code.slice(5);
  return null;
}

// --- MenuBar ----------------------------------------------------------------

export function MenuBar({ menus, className, windowId }: MenuBarProps) {
  // openIndex: which top menu's dropdown is showing.
  // armedIndex: highlighted top menu in keyboard mode with no dropdown open.
  // path: highlight path within the open dropdown; path[k] is the highlighted
  //   item at level k, and a submenu is open when the path descends past it.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [armedIndex, setArmedIndex] = useState<number | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const trackingRef = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => {
    setOpenIndex(null);
    setArmedIndex(null);
    setPath([]);
    trackingRef.current = false;
  }, []);

  const openTop = useCallback((i: number) => {
    setOpenIndex(i);
    setArmedIndex(null);
    setPath([]);
    trackingRef.current = true;
  }, []);

  // Close when clicking outside the bar and every portaled dropdown (all tagged
  // with data-win98-menu, so a single closest() check covers all of them).
  useEffect(() => {
    if (openIndex === null && armedIndex === null) return;
    const handleDown = (e: MouseEvent) => {
      if (!(e.target as Element)?.closest?.('[data-win98-menu]')) closeAll();
    };
    window.addEventListener('mousedown', handleDown);
    return () => window.removeEventListener('mousedown', handleDown);
  }, [openIndex, armedIndex, closeAll]);

  const n = menus.length;
  const topAccel = useCallback(
    (letter: string) => menus.findIndex((m) => parseAccelerator(m.label) === letter),
    [menus],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const armed = armedIndex !== null;
      const open = openIndex !== null;

      // Alt toggles the armed/open state on or off.
      if (e.key === 'Alt') {
        e.preventDefault();
        if (armed || open) closeAll();
        else setArmedIndex(0);
        return;
      }

      // Alt+letter opens the matching top menu from any state.
      if (e.altKey) {
        const letter = eventLetter(e);
        if (letter) {
          const idx = topAccel(letter);
          if (idx !== -1) {
            e.preventDefault();
            const f = firstSelectable(menus[idx].items);
            setOpenIndex(idx);
            setArmedIndex(null);
            setPath(f >= 0 ? [f] : []);
            trackingRef.current = true;
          }
        }
        return;
      }

      if (!armed && !open) return; // idle: let keystrokes reach the app

      // Armed with no dropdown yet.
      if (!open) {
        const ai = armedIndex!;
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault(); setArmedIndex((ai - 1 + n) % n); return;
          case 'ArrowRight':
            e.preventDefault(); setArmedIndex((ai + 1) % n); return;
          case 'ArrowDown':
          case 'Enter':
          case ' ': {
            e.preventDefault();
            const f = firstSelectable(menus[ai].items);
            setOpenIndex(ai);
            setArmedIndex(null);
            setPath(f >= 0 ? [f] : []);
            trackingRef.current = true;
            return;
          }
          case 'Escape':
            e.preventDefault(); setArmedIndex(null); return;
          default: {
            const letter = eventLetter(e);
            if (letter) {
              const idx = topAccel(letter);
              if (idx !== -1) { e.preventDefault(); setArmedIndex(idx); }
            }
            return;
          }
        }
      }

      // Dropdown open.
      const oi = openIndex!;
      const levels = computeLevels(menus[oi].items, path);
      const depth = path.length;
      const curItems = depth > 0 ? levels[depth - 1] : levels[0];
      const curIdx = depth > 0 ? path[depth - 1] : -1;
      const curItem = curIdx >= 0 ? curItems[curIdx] : undefined;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = stepSelectable(curItems, curIdx, 1);
          if (next >= 0) setPath(depth > 0 ? [...path.slice(0, -1), next] : [next]);
          return;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = depth > 0 ? stepSelectable(curItems, curIdx, -1) : lastSelectable(curItems);
          if (prev >= 0) setPath(depth > 0 ? [...path.slice(0, -1), prev] : [prev]);
          return;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (curItem?.submenu) {
            const f = firstSelectable(curItem.submenu);
            setPath([...path, f >= 0 ? f : 0]);
          } else {
            openTop((oi + 1) % n);
          }
          return;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (depth > 1) setPath(path.slice(0, -1));
          else openTop((oi - 1 + n) % n);
          return;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (!curItem) return;
          if (curItem.submenu) {
            const f = firstSelectable(curItem.submenu);
            setPath([...path, f >= 0 ? f : 0]);
          } else if (!curItem.disabled) {
            curItem.onClick?.();
            closeAll();
          }
          return;
        }
        case 'Escape': {
          e.preventDefault();
          if (depth > 1) {
            setPath(path.slice(0, -1));
          } else {
            setArmedIndex(oi);
            setOpenIndex(null);
            setPath([]);
            trackingRef.current = false;
          }
          return;
        }
        case 'Home': {
          e.preventDefault();
          const f = firstSelectable(curItems);
          if (f >= 0) setPath(depth > 0 ? [...path.slice(0, -1), f] : [f]);
          return;
        }
        case 'End': {
          e.preventDefault();
          const l = lastSelectable(curItems);
          if (l >= 0) setPath(depth > 0 ? [...path.slice(0, -1), l] : [l]);
          return;
        }
        default: {
          const letter = eventLetter(e);
          if (letter && !e.ctrlKey && !e.metaKey) {
            const target = curItems.findIndex(
              (it) => !it.separator && parseAccelerator(it.label) === letter,
            );
            if (target !== -1) {
              e.preventDefault();
              setPath(depth > 0 ? [...path.slice(0, -1), target] : [target]);
            }
          }
        }
      }
    },
    [menus, openIndex, armedIndex, path, n, topAccel, closeAll, openTop],
  );

  // Keep a fresh handler for the (separately mounted) keyboard bridge to call.
  const handlerRef = useRef(handleKeyDown);
  useEffect(() => { handlerRef.current = handleKeyDown; }, [handleKeyDown]);

  return (
    <div
      ref={barRef}
      role="menubar"
      aria-orientation="horizontal"
      data-win98-menu
      className={cn(
        'flex items-center h-[20px] bg-[var(--win98-button-face)] shrink-0',
        'border-b border-[var(--win98-button-shadow)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
        className,
      )}
    >
      {menus.map((menu, i) => {
        const active = openIndex === i || armedIndex === i;
        const rovingActive = (armedIndex ?? openIndex ?? 0) === i;
        return (
          <div key={`${menu.label}-${i}`} className="relative">
            <button
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={openIndex === i}
              tabIndex={rovingActive ? 0 : -1}
              className={cn(
                'px-[6px] py-[2px] cursor-default select-none',
                active && 'bg-[var(--win98-highlight)] text-white',
              )}
              onMouseDown={() => {
                if (openIndex === i) closeAll();
                else openTop(i);
              }}
              onMouseEnter={() => {
                if (trackingRef.current && openIndex !== null && openIndex !== i) {
                  setOpenIndex(i);
                  setPath([]);
                }
              }}
            >
              {renderMenuLabel(menu.label)}
            </button>
            {openIndex === i && (
              <DropdownMenu
                items={menu.items}
                level={0}
                path={path}
                setPath={setPath}
                closeAll={closeAll}
                orientation="below"
                anchorGetter={() => barRef.current
                  ?.querySelectorAll('button')[i]
                  ?.getBoundingClientRect() ?? null}
              />
            )}
          </div>
        );
      })}

      {windowId && (
        <MenuKeyboardBridge windowId={windowId} handlerRef={handlerRef} onDefocus={closeAll} />
      )}
    </div>
  );
}

// --- keyboard bridge --------------------------------------------------------
// Isolated so useWindows() is only called when a windowId is supplied; the
// existing provider-less consumers (and tests) never mount this.
function MenuKeyboardBridge({
  windowId,
  handlerRef,
  onDefocus,
}: {
  windowId: string;
  handlerRef: React.RefObject<(e: KeyboardEvent) => void>;
  onDefocus: () => void;
}) {
  const { windows } = useWindows();
  const isFocused = windows.find((w) => w.id === windowId)?.isFocused ?? false;

  useEffect(() => {
    if (!isFocused) {
      onDefocus();
      return;
    }
    const handler = (e: KeyboardEvent) => handlerRef.current(e);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFocused, handlerRef, onDefocus]);

  return null;
}

// --- Dropdown (recursive, self-portaling) -----------------------------------

interface DropdownMenuProps {
  items: MenuItem[];
  level: number;
  path: number[];
  setPath: (path: number[]) => void;
  closeAll: () => void;
  orientation: 'below' | 'right';
  anchorGetter: () => DOMRect | null;
}

function DropdownMenu({ items, level, path, setPath, closeAll, orientation, anchorGetter }: DropdownMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const highlighted = path[level];
  const childHi = highlighted != null && highlighted >= 0 ? items[highlighted] : undefined;
  const childOpen = !!childHi?.submenu && path.length > level + 1;

  const base = path.slice(0, level);

  const clearHover = () => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  };

  const onItemEnter = (index: number, item: MenuItem) => {
    clearHover();
    if (item.submenu) {
      // Already open on this item — leave it be to avoid a close/reopen flicker
      // when the pointer travels across it toward the flyout.
      if (highlighted === index && childOpen) return;
      setPath([...base, index]);
      hoverTimer.current = setTimeout(() => {
        const f = firstSelectable(item.submenu!);
        setPath([...base, index, f >= 0 ? f : 0]);
      }, 300);
    } else {
      setPath([...base, index]);
    }
  };

  const onItemClick = (index: number, item: MenuItem) => {
    if (item.disabled) return;
    if (item.submenu) {
      const f = firstSelectable(item.submenu);
      setPath([...base, index, f >= 0 ? f : 0]);
    } else {
      item.onClick?.();
      closeAll();
    }
  };

  useEffect(() => clearHover, []);

  // Anchor is stable per instance (the dropdown remounts via key when the open
  // item changes), so measure once on mount and again on resize.
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const menu = el.getBoundingClientRect();
      const a = anchorGetter();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left: number;
      let top: number;
      if (orientation === 'below') {
        left = a ? a.left : 0;
        top = a ? a.bottom : 0;
        if (left + menu.width > vw) left = Math.max(0, vw - menu.width);
        if (top + menu.height > vh) top = a ? Math.max(0, a.top - menu.height) : 0;
      } else {
        left = a ? a.right - 3 : 0;
        top = a ? a.top - 3 : 0;
        if (left + menu.width > vw) left = a ? Math.max(0, a.left - menu.width + 3) : 0;
        if (top + menu.height > vh) top = Math.max(0, vh - menu.height);
      }
      // Bail when unchanged so the new-object identity can't spin the effect.
      setPos((prev) => (prev && prev.left === left && prev.top === top ? prev : { left, top }));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [orientation, anchorGetter]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      data-win98-menu
      style={{ position: 'fixed', left: pos ? pos.left : -99999, top: pos ? pos.top : -99999 }}
      className={cn(
        MENU_Z, 'min-w-[160px]',
        'bg-[var(--win98-button-face)] py-[2px]',
        'border-2 border-solid',
        'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
        'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
        'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
      )}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return (
            <div
              key={i}
              role="separator"
              className="mx-[2px] my-[2px] h-0 border-t border-[var(--win98-button-shadow)] border-b border-b-[var(--win98-button-highlight)]"
            />
          );
        }
        const isHighlighted = highlighted === i && !item.disabled;
        const glyph = item.radio ? (item.checked ? '•' : '') : (item.checked ? '✓' : '');
        const role = item.submenu
          ? 'menuitem'
          : item.radio
            ? 'menuitemradio'
            : item.checked !== undefined
              ? 'menuitemcheckbox'
              : 'menuitem';
        return (
          <button
            key={i}
            ref={(el) => { itemRefs.current[i] = el; }}
            role={role}
            aria-haspopup={item.submenu ? 'true' : undefined}
            aria-expanded={item.submenu ? (highlighted === i && childOpen) : undefined}
            aria-checked={
              item.radio || item.checked !== undefined ? !!item.checked : undefined
            }
            aria-disabled={item.disabled || undefined}
            tabIndex={isHighlighted ? 0 : -1}
            disabled={item.disabled}
            className={cn(
              'flex items-center w-full px-[20px] py-[2px] cursor-default select-none text-left',
              isHighlighted && 'bg-[var(--win98-highlight)] text-white',
              item.disabled && 'text-[var(--win98-disabled-text)]',
            )}
            onMouseEnter={() => onItemEnter(i, item)}
            onMouseLeave={clearHover}
            onClick={() => onItemClick(i, item)}
          >
            <span className="w-[16px] mr-[2px] text-center">{glyph}</span>
            <span className="flex-1">{renderMenuLabel(item.label)}</span>
            {item.submenu ? (
              <span className="ml-4">▶</span>
            ) : item.shortcut ? (
              <span className={cn('ml-4', !isHighlighted && 'text-[var(--win98-disabled-text)]')}>
                {item.shortcut}
              </span>
            ) : null}
          </button>
        );
      })}

      {childOpen && highlighted != null && (
        <DropdownMenu
          key={`sub-${highlighted}`}
          items={childHi!.submenu!}
          level={level + 1}
          path={path}
          setPath={setPath}
          closeAll={closeAll}
          orientation="right"
          anchorGetter={() => itemRefs.current[highlighted]?.getBoundingClientRect() ?? null}
        />
      )}
    </div>,
    document.body,
  );
}
