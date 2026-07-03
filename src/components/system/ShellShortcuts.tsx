'use client';

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { AltTabSwitcher } from './AltTabSwitcher';

/** Mounts global keyboard shortcuts; must render inside WindowProvider. */
export function ShellShortcuts() {
  const altTab = useKeyboardShortcuts();
  if (!altTab) return null;
  return <AltTabSwitcher windows={altTab.windows} selectedIndex={altTab.selectedIndex} />;
}
