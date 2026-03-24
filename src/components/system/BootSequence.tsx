'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { SYSTEM_SPECS } from '@/lib/constants';

interface BootSequenceProps {
  onComplete: () => void;
}

/** The classic 4-pane waving Windows flag logo */
function WindowsFlag({ size = 160 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 88 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Red pane (top-left) */}
      <path
        d="M2 18 C6 8, 18 4, 28 6 L38 10 C36 16, 32 28, 30 36 L8 30 C4 28, 2 24, 2 18Z"
        fill="#FF0000"
      />
      {/* Green pane (top-right) */}
      <path
        d="M42 11 C48 6, 60 2, 74 4 L86 8 C84 14, 78 28, 74 38 L34 38 C36 30, 40 18, 42 11Z"
        fill="#00A800"
      />
      {/* Blue pane (bottom-left) */}
      <path
        d="M6 34 L28 40 C26 48, 22 60, 20 68 L2 64 C2 58, 2 46, 6 34Z"
        fill="#0000FF"
      />
      {/* Yellow pane (bottom-right) */}
      <path
        d="M32 42 L72 42 C68 52, 62 66, 58 76 L22 72 C24 64, 28 52, 32 42Z"
        fill="#FFB800"
      />
    </svg>
  );
}

/** Animated progress bar with sliding blocks like the real Win98 boot */
function BootProgressBar({ progress }: { progress: number }) {
  const totalBlocks = 24;
  const filledBlocks = Math.floor((progress / 100) * totalBlocks);

  return (
    <div className="w-[210px] h-[18px] bg-black border-[2px] border-[#404040] flex items-center px-[2px] gap-[1px]">
      {Array.from({ length: filledBlocks }).map((_, i) => (
        <div
          key={i}
          className="w-[7px] h-[12px] bg-[#A0A0A0] flex-shrink-0"
        />
      ))}
    </div>
  );
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
          <pre className="mt-2 text-[10px] leading-[10px] text-[#00AA00]">{`
  ████████████████████████████
  █                          █
  █   ★  E N E R G Y        █
  █      S T A R  ®         █
  █                          █
  ████████████████████████████`}</pre>
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

  // Logo phase - authentic Windows 98 boot screen
  return (
    <div
      className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center cursor-pointer"
      onClick={handleClick}
    >
      {/* Windows flag logo */}
      <div className="mb-6">
        <WindowsFlag size={140} />
      </div>

      {/* Windows 98 text - plain white, like the real boot screen */}
      <div
        className="text-white text-[28px] tracking-[0.15em] mb-1"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 400 }}
      >
        Microsoft<span className="text-[18px] align-super">®</span> Windows 98
      </div>

      <div className="mt-10">
        <BootProgressBar progress={progress} />
      </div>

      <div className="text-[var(--win98-disabled-text)] text-[11px] mt-8 font-[family-name:var(--win98-font)]">
        Click anywhere to skip
      </div>
    </div>
  );
}
