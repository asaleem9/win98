'use client';

import { ReactNode, useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/cn';

interface Tooltip98Props {
  text: string;
  children: ReactNode;
  delay?: number;
}

export function Tooltip98({ text, children, delay = 500 }: Tooltip98Props) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const triggerRef = useRef<HTMLDivElement>(null);

  const show = useCallback(
    (e: React.MouseEvent) => {
      setPosition({ x: e.clientX + 12, y: e.clientY + 16 });
      timerRef.current = setTimeout(() => setVisible(true), delay);
    },
    [delay],
  );

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div ref={triggerRef} className="inline-block" onMouseEnter={show} onMouseLeave={hide} onMouseMove={hide}>
      {children}
      {visible && (
        <div
          className={cn(
            'fixed z-[9999] px-1 py-[1px]',
            'bg-[#ffffe1] border border-black',
            'font-[family-name:var(--win98-font)] text-[11px] text-black',
            'whitespace-nowrap pointer-events-none select-none',
          )}
          style={{ left: position.x, top: position.y }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
