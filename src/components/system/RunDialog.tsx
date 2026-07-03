'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Button98 } from '@/components/ui/Button98';
import { useWindows } from '@/contexts/WindowContext';
import { useFileOpener, showSystemError } from '@/hooks/useFileOpener';
import { exeAppMap } from '@/lib/fileAssociations';
import { getApp } from '@/lib/appRegistry';

interface RunDialogProps {
  onClose: () => void;
}

/**
 * The Start menu Run... dialog. Accepts app ids, well-known EXE names
 * (calc, winmine.exe), file paths, and `notepad C:\file.txt`-style commands.
 */
export function RunDialog({ onClose }: RunDialogProps) {
  const { openWindow } = useWindows();
  const { openFile } = useFileOpener();
  const [command, setCommand] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const run = () => {
    const trimmed = command.trim();
    if (!trimmed) return;

    // `program C:\path` form: open the path with the named program
    const spaceIdx = trimmed.indexOf(' ');
    const head = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();
    const rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();

    const appId = exeAppMap[head] ?? (getApp(head) ? head : null);
    if (appId) {
      if (rest) {
        const appName = getApp(appId)?.defaultWindow.title ?? appId;
        const fileName = rest.split('\\').pop() ?? rest;
        openWindow(appId, { title: `${fileName} - ${appName}`, launchParams: { filePath: rest } });
      } else {
        openWindow(appId);
      }
      onClose();
      return;
    }

    // Bare path (file or folder)
    if (/^[a-z]:/i.test(trimmed) || trimmed.includes('\\')) {
      if (openFile(trimmed)) onClose();
      return;
    }

    showSystemError(
      trimmed,
      `Cannot find the file '${trimmed}' (or one of its components). Make sure the path and filename are correct and that all required libraries are available.`,
    );
  };

  return (
    <div className="fixed inset-0 z-[9100] flex items-end justify-start p-8 pb-12 pointer-events-none">
      <div
        className={cn(
          'pointer-events-auto w-[340px]',
          'bg-[var(--win98-button-face)]',
          'border-2 border-solid',
          'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
          'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
          'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
          'font-[family-name:var(--win98-font)] text-[11px]',
        )}
      >
        <div className="flex items-center h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white font-bold select-none">
          <span className="flex-1">Run</span>
          <button
            onClick={onClose}
            className="w-[16px] h-[14px] flex items-center justify-center bg-[var(--win98-button-face)] text-black text-[9px] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-3">
          <div className="flex gap-3 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/run-16.svg" alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
            <p className="pt-1">
              Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.
            </p>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <label htmlFor="run-command" className="select-none">
              Open:
            </label>
            <input
              id="run-command"
              ref={inputRef}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') run();
                if (e.key === 'Escape') onClose();
              }}
              className="flex-1 h-[20px] px-1 bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] outline-none text-[11px]"
            />
          </div>

          <div className="flex justify-end gap-[6px]">
            <Button98 onClick={run} className="min-w-[70px]">
              OK
            </Button98>
            <Button98 onClick={onClose} className="min-w-[70px]">
              Cancel
            </Button98>
          </div>
        </div>
      </div>
    </div>
  );
}
