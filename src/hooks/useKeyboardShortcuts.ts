'use client';

import { useEffect, useRef, useState } from 'react';
import { useWindows } from '@/contexts/WindowContext';
import { WindowState } from '@/types/window';

export interface AltTabState {
  windows: WindowState[];
  selectedIndex: number;
}

/**
 * Global shell keyboard shortcuts:
 * - Alt+Tab / Alt+Shift+Tab: cycle windows (switcher commits on Alt release)
 * - Alt+F4: close focused window (or shutdown dialog when none)
 * - Ctrl+Esc: toggle Start menu (via `win98-toggle-start` CustomEvent)
 */
export function useKeyboardShortcuts(): AltTabState | null {
  const { windows, closeWindow, focusWindow } = useWindows();
  const [altTab, setAltTab] = useState<AltTabState | null>(null);

  // Refs so the single document-level listener always sees fresh state
  const windowsRef = useRef(windows);
  const altTabRef = useRef(altTab);
  useEffect(() => {
    windowsRef.current = windows;
  }, [windows]);
  useEffect(() => {
    altTabRef.current = altTab;
  }, [altTab]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        const current = altTabRef.current;
        if (!current) {
          // Owned dialogs travel with their opener and never appear in the switcher
          const candidates = windowsRef.current
            .filter((w) => !w.ownerId)
            .sort((a, b) => b.zIndex - a.zIndex);
          if (candidates.length === 0) return;
          setAltTab({ windows: candidates, selectedIndex: candidates.length > 1 ? 1 : 0 });
        } else {
          const dir = e.shiftKey ? -1 : 1;
          const next = (current.selectedIndex + dir + current.windows.length) % current.windows.length;
          setAltTab({ ...current, selectedIndex: next });
        }
        return;
      }

      if (e.altKey && e.key === 'F4') {
        e.preventDefault();
        const focused = windowsRef.current.find((w) => w.isFocused);
        if (focused) closeWindow(focused.id);
        else window.dispatchEvent(new CustomEvent('win98-shutdown-dialog'));
        return;
      }

      if (e.ctrlKey && e.key === 'Escape') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('win98-toggle-start'));
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && altTabRef.current) {
        e.preventDefault();
        const { windows: tabWindows, selectedIndex } = altTabRef.current;
        const target = tabWindows[selectedIndex];
        if (target) focusWindow(target.id);
        setAltTab(null);
      }
    };

    // If the browser window loses focus mid-Alt+Tab (e.g. the OS-level
    // switcher won), drop the overlay instead of leaving it stuck.
    const onBlur = () => setAltTab(null);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [closeWindow, focusWindow]);

  return altTab;
}
