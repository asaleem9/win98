'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { Button98 } from '@/components/ui/Button98';
import { Checkbox98 } from '@/components/ui/Checkbox98';

const CLIPPY_MESSAGES = [
  "It looks like you're writing a letter! Would you like help?",
  "Would you like help with that?",
  "Did you know you can press Ctrl+S to save?",
  "It looks like you're trying to format a hard drive!",
  "Need help finding something?",
  "Tip: You can right-click for more options!",
  "It looks like you're writing a report. Want me to help?",
  "Did you know Windows 98 supports up to 128MB of RAM?",
  "You seem lost. Would you like to enable the Office Assistant?",
];

interface ClippyProps {
  className?: string;
}

export function Clippy({ className }: ClippyProps) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(CLIPPY_MESSAGES[0]);
  const [dismissed, setDismissed] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const [wiggle, setWiggle] = useState(false);

  const showNewMessage = useCallback(() => {
    if (dismissed) return;
    const msg = CLIPPY_MESSAGES[Math.floor(Math.random() * CLIPPY_MESSAGES.length)];
    setMessage(msg);
    setVisible(true);
    setWiggle(true);
    setTimeout(() => setWiggle(false), 600);
  }, [dismissed]);

  useEffect(() => {
    const initialDelay = setTimeout(() => {
      showNewMessage();
    }, 8000);

    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        showNewMessage();
      }
    }, 30000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [showNewMessage]);

  const handleDismiss = () => {
    setVisible(false);
    if (dontShow) {
      setDismissed(true);
    }
  };

  if (dismissed) return null;

  return (
    <div
      className={cn(
        'fixed bottom-10 right-4 z-[8000] flex flex-col items-end gap-1',
        className,
      )}
    >
      {/* Speech bubble */}
      {visible && (
        <div
          className={cn(
            'bg-[#FFFFCC] border border-black rounded-sm p-3 max-w-[220px] relative mb-1',
            'font-[family-name:var(--win98-font)] text-[11px]',
            'shadow-[2px_2px_0_rgba(0,0,0,0.3)]',
          )}
        >
          <p className="mb-3">{message}</p>
          <div className="flex flex-col gap-2">
            <Checkbox98
              label="Don't show me this tip again"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
            />
            <div className="flex justify-end">
              <Button98 onClick={handleDismiss} className="!min-w-[60px]">OK</Button98>
            </div>
          </div>
          {/* Speech bubble tail */}
          <div
            className="absolute -bottom-[8px] right-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black"
          />
          <div
            className="absolute -bottom-[6px] right-[26px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#FFFFCC]"
          />
        </div>
      )}

      {/* Clippy character */}
      <div
        className={cn(
          'w-[62px] h-[80px] cursor-pointer select-none',
          'flex items-center justify-center',
          wiggle && 'animate-[clippy-wiggle_0.3s_ease-in-out_2]',
        )}
        onClick={showNewMessage}
        title="Click me for a tip!"
      >
        {/* Simple paperclip SVG */}
        <svg width="50" height="70" viewBox="0 0 50 70" fill="none">
          {/* Body - wire frame */}
          <path
            d="M25 65 C25 65, 10 60, 10 45 L10 20 C10 12, 18 8, 25 8 C32 8, 40 12, 40 20 L40 42 C40 48, 35 52, 30 52 L30 52 C25 52, 20 48, 20 42 L20 22"
            stroke="#7B7B7B"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M25 65 C25 65, 10 60, 10 45 L10 20 C10 12, 18 8, 25 8 C32 8, 40 12, 40 20 L40 42 C40 48, 35 52, 30 52 L30 52 C25 52, 20 48, 20 42 L20 22"
            stroke="#B0B0B0"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Eyes */}
          <circle cx="22" cy="26" r="4" fill="white" stroke="#333" strokeWidth="1.5" />
          <circle cx="34" cy="26" r="4" fill="white" stroke="#333" strokeWidth="1.5" />
          <circle cx="23" cy="25.5" r="2" fill="#333" />
          <circle cx="35" cy="25.5" r="2" fill="#333" />
          {/* Eyebrows */}
          <path d="M18 20 Q22 17 26 20" stroke="#333" strokeWidth="1.5" fill="none" />
          <path d="M30 20 Q34 17 38 20" stroke="#333" strokeWidth="1.5" fill="none" />
        </svg>
      </div>

      <style jsx>{`
        @keyframes clippy-wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
