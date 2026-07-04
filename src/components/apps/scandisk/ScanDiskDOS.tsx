'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ScanDiskDOSProps {
  /** Called once the check finishes or the user presses a key to skip. */
  onComplete: () => void;
}

// Roughly how long the fake surface check runs before continuing to login.
const SCAN_DURATION_MS = 6000;
const PROGRESS_BLOCKS = 50;

/**
 * The full-screen blue ScanDisk that Windows 98 ran at boot after an improper
 * shutdown ("Windows was not properly shut down..."). Purely cosmetic — it
 * animates a block progress bar over a few seconds, then hands control back so
 * the boot can continue to the logon screen. Any key skips ahead.
 */
export function ScanDiskDOS({ onComplete }: ScanDiskDOSProps) {
  const [percent, setPercent] = useState(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const p = Math.min(100, Math.round(((Date.now() - started) / SCAN_DURATION_MS) * 100));
      setPercent(p);
      if (p >= 100) {
        clearInterval(timer);
        finish();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [finish]);

  // Any key press skips the check, just like the real thing.
  useEffect(() => {
    const onKey = () => finish();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  const filled = Math.round((percent / 100) * PROGRESS_BLOCKS);

  return (
    <div
      className="fixed inset-0 z-[99999] bg-[#0000AA] text-white font-[family-name:var(--win98-font-fixedsys)] text-[14px] flex flex-col cursor-default select-none"
      role="dialog"
      aria-label="Microsoft ScanDisk"
    >
      {/* Title bar */}
      <div className="text-center py-1 text-[#FFFF00] font-bold border-b border-[#5555FF]">
        Microsoft ScanDisk
      </div>

      <div className="flex-1 px-6 py-6 max-w-[720px]">
        <p className="mb-4">
          Windows was not properly shut down. One or more of your disk drives may
          have errors on it.
        </p>
        <p className="mb-6">
          To avoid seeing this message again, always shut down your computer by
          selecting Shut Down from the Start menu.
        </p>
        <p className="mb-4">
          ScanDisk is now checking your drive for errors.
        </p>

        {/* Block progress bar inside a beveled frame */}
        <div className="inline-block border border-[#AAAAAA] p-[2px] bg-[#000088] my-2">
          <div className="flex gap-[1px]">
            {Array.from({ length: PROGRESS_BLOCKS }, (_, i) => (
              <div
                key={i}
                className="w-[8px] h-[14px]"
                style={{ backgroundColor: i < filled ? '#AAAAAA' : '#000088' }}
              />
            ))}
          </div>
        </div>

        <p className="mt-2">{percent}% complete</p>
      </div>

      <div className="px-6 py-2 text-[#AAAAAA] border-t border-[#5555FF]">
        Press any key to skip checking.
      </div>
    </div>
  );
}
