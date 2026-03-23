'use client';

import { createContext, useContext, ReactNode } from 'react';
import { WindowState } from '@/types/window';
import { useWindowManager } from '@/hooks/useWindowManager';

interface WindowContextType {
  windows: WindowState[];
  openWindow: (appId: string, options?: { title?: string; position?: { x: number; y: number } }) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number) => void;
  updateTitle: (id: string, title: string) => void;
}

const WindowContext = createContext<WindowContextType | null>(null);

export function WindowProvider({ children }: { children: ReactNode }) {
  const manager = useWindowManager();

  return (
    <WindowContext.Provider value={manager}>
      {children}
    </WindowContext.Provider>
  );
}

export function useWindows() {
  const ctx = useContext(WindowContext);
  if (!ctx) throw new Error('useWindows must be used within WindowProvider');
  return ctx;
}
