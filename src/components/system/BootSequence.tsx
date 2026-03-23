'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { SYSTEM_SPECS } from '@/lib/constants';

interface BootSequenceProps {
  onComplete: () => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [phase, setPhase] = useState<'post' | 'logo' | 'done'>('post');
  const [memoryCount, setMemoryCount] = useState(0);
  const [progress, setProgress] = useState(0);

  // POST screen - memory count
  useEffect(() => {
    if (phase !== 'post') return;
    const target = SYSTEM_SPECS.ramBytes;
    const interval = setInterval(() => {
      setMemoryCount((prev) => {
        const next = prev + 8192;
        if (next >= target) {
          clearInterval(interval);
          setTimeout(() => setPhase('logo'), 500);
          return target;
        }
        return next;
      });
    }, 10);
    return () => clearInterval(interval);
  }, [phase]);

  // Logo screen - progress bar
  useEffect(() => {
    if (phase !== 'logo') return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setPhase('done');
            onComplete();
          }, 300);
          return 100;
        }
        return prev + 2;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [phase, onComplete]);

  // Skip on click
  const handleClick = () => {
    setPhase('done');
    onComplete();
  };

  if (phase === 'done') return null;

  if (phase === 'post') {
    return (
      <div
        className="fixed inset-0 z-[99999] bg-black text-white font-[family-name:var(--win98-font-fixedsys)] text-[14px] p-4 cursor-pointer"
        onClick={handleClick}
      >
        <div className="mb-4">
          <div>{SYSTEM_SPECS.bios}</div>
          <div className="mt-2">Energy Star Logo</div>
        </div>
        <div className="mb-4">
          <div>{SYSTEM_SPECS.processor}</div>
          <div className="mt-2">Memory Test: {memoryCount}K OK</div>
        </div>
        <div className="mt-8 text-[var(--win98-disabled-text)]">
          Press any key to skip...
        </div>
      </div>
    );
  }

  // Logo phase
  return (
    <div
      className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center cursor-pointer"
      onClick={handleClick}
    >
      {/* Windows 98 text logo */}
      <div className="text-center mb-8">
        <div className="text-[48px] font-bold text-white tracking-wider" style={{ fontFamily: 'Arial, sans-serif' }}>
          <span className="text-[#FF0000]">W</span>
          <span className="text-[#00FF00]">i</span>
          <span className="text-[#0000FF]">n</span>
          <span className="text-[#FFFF00]">d</span>
          <span className="text-[#FF0000]">o</span>
          <span className="text-[#00FF00]">w</span>
          <span className="text-[#0000FF]">s</span>
          <span className="text-white ml-3">98</span>
        </div>
        <div className="text-white text-[14px] mt-2">Microsoft® Windows 98</div>
      </div>

      {/* Progress bar */}
      <div className="w-[200px] h-[16px] bg-[#000080] border border-[#808080]">
        <div
          className="h-full bg-[#0000FF] transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="text-[var(--win98-disabled-text)] text-[11px] mt-8 font-[family-name:var(--win98-font)]">
        Click anywhere to skip
      </div>
    </div>
  );
}
