'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Button98 } from '@/components/ui/Button98';

type ShutdownOption = 'shutdown' | 'restart' | 'cancel';

interface ShutdownScreenProps {
  onShutdown: () => void;
  onRestart: () => void;
  onCancel: () => void;
}

export function ShutdownDialog({ onShutdown, onRestart, onCancel }: ShutdownScreenProps) {
  const [selected, setSelected] = useState<'shutdown' | 'restart'>('shutdown');

  return (
    <div className="fixed inset-0 z-[99998] bg-black/50 flex items-center justify-center">
      <div
        className={cn(
          'bg-[var(--win98-button-face)] w-[340px]',
          'border-2 border-solid',
          'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
          'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
          'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
          'font-[family-name:var(--win98-font)] text-[11px]',
        )}
      >
        {/* Title bar */}
        <div className="flex items-center h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white text-[11px] font-bold select-none">
          Shut Down Windows
        </div>

        <div className="p-4">
          <div className="flex gap-3 mb-4">
            <img src="/icons/shutdown-16.svg" alt="" className="w-8 h-8 mt-1" />
            <div>
              <p className="mb-3">What do you want the computer to do?</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-default">
                  <input
                    type="radio"
                    name="shutdown"
                    checked={selected === 'shutdown'}
                    onChange={() => setSelected('shutdown')}
                    className="accent-[var(--win98-highlight)]"
                  />
                  <span>Shut down</span>
                </label>
                <label className="flex items-center gap-2 cursor-default">
                  <input
                    type="radio"
                    name="shutdown"
                    checked={selected === 'restart'}
                    onChange={() => setSelected('restart')}
                    className="accent-[var(--win98-highlight)]"
                  />
                  <span>Restart</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-[6px]">
            <Button98
              onClick={() => (selected === 'shutdown' ? onShutdown() : onRestart())}
              className="min-w-[75px]"
            >
              OK
            </Button98>
            <Button98 onClick={onCancel} className="min-w-[75px]">
              Cancel
            </Button98>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShutdownScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[99999] bg-black flex items-center justify-center cursor-pointer"
      onClick={onRestart}
    >
      <div className="text-center">
        <div className="text-[#FF8C00] text-[20px] font-[family-name:var(--win98-font)]">
          It&apos;s now safe to turn off your computer.
        </div>
        <div className="text-[var(--win98-disabled-text)] text-[11px] mt-4 font-[family-name:var(--win98-font)]">
          Click anywhere to restart
        </div>
      </div>
    </div>
  );
}
