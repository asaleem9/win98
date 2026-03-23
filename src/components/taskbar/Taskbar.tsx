'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { StartButton } from './StartButton';
import { StartMenu } from './StartMenu';
import { QuickLaunch } from './QuickLaunch';
import { TaskbarWindowList } from './TaskbarWindowList';
import { SystemTray } from './SystemTray';

export function Taskbar() {
  const [startMenuOpen, setStartMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 h-[28px] z-[9990]',
        'flex items-center gap-0 px-[2px]',
        'bg-[var(--win98-button-face)]',
        'border-t-2 border-t-[var(--win98-button-highlight)]',
      )}
    >
      <div className="relative">
        <StartButton
          active={startMenuOpen}
          onClick={() => setStartMenuOpen(!startMenuOpen)}
        />
        {startMenuOpen && <StartMenu onClose={() => setStartMenuOpen(false)} />}
      </div>

      <QuickLaunch />
      <TaskbarWindowList />
      <SystemTray />
    </div>
  );
}
