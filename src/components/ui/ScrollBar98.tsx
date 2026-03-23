'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/cn';

interface ScrollBar98Props {
  orientation?: 'vertical' | 'horizontal';
  value: number;
  max: number;
  viewportSize: number;
  onChange: (value: number) => void;
  className?: string;
}

export function ScrollBar98({
  orientation = 'vertical',
  value,
  max,
  viewportSize,
  onChange,
  className,
}: ScrollBar98Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ pos: 0, value: 0 });

  const isVertical = orientation === 'vertical';
  const totalRange = max + viewportSize;
  const thumbRatio = totalRange > 0 ? viewportSize / totalRange : 1;
  const thumbSize = Math.max(20, thumbRatio * 100);
  const thumbPosition = max > 0 ? (value / max) * (100 - thumbSize) : 0;

  const step = Math.max(1, Math.floor(viewportSize / 10));

  const clamp = (v: number) => Math.max(0, Math.min(max, v));

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || e.target !== trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickPos = isVertical
      ? (e.clientY - rect.top) / rect.height
      : (e.clientX - rect.left) / rect.width;
    const thumbCenter = (thumbPosition + thumbSize / 2) / 100;
    onChange(clamp(clickPos < thumbCenter ? value - viewportSize : value + viewportSize));
  };

  const handleThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      dragStart.current = {
        pos: isVertical ? e.clientY : e.clientX,
        value,
      };
    },
    [isVertical, value],
  );

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const trackSize = isVertical ? rect.height : rect.width;
      const delta = (isVertical ? e.clientY : e.clientX) - dragStart.current.pos;
      const valueDelta = (delta / trackSize) * max;
      onChange(clamp(dragStart.current.value + valueDelta));
    };
    const handleMouseUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, isVertical, max, onChange]);

  const arrowBtnClass = cn(
    'flex items-center justify-center flex-shrink-0 select-none',
    'bg-[var(--win98-button-face)]',
    'border border-solid',
    'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
    'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
    'active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]',
    'active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
    isVertical ? 'w-full h-[16px]' : 'h-full w-[16px]',
  );

  return (
    <div
      className={cn(
        'flex bg-[var(--win98-scrollbar-track)]',
        isVertical ? 'flex-col w-[16px]' : 'flex-row h-[16px]',
        className,
      )}
    >
      <button className={arrowBtnClass} onClick={() => onChange(clamp(value - step))}>
        <span className="text-[8px] leading-none">{isVertical ? '▲' : '◀'}</span>
      </button>
      <div
        ref={trackRef}
        className="relative flex-1"
        onClick={handleTrackClick}
      >
        <div
          className={cn(
            'absolute bg-[var(--win98-button-face)]',
            'border border-solid',
            'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
            'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
            isVertical ? 'left-0 right-0' : 'top-0 bottom-0',
            dragging && 'border-t-[var(--win98-button-dark-shadow)] border-l-[var(--win98-button-dark-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
          )}
          style={
            isVertical
              ? { top: `${thumbPosition}%`, height: `${thumbSize}%` }
              : { left: `${thumbPosition}%`, width: `${thumbSize}%` }
          }
          onMouseDown={handleThumbMouseDown}
        />
      </div>
      <button className={arrowBtnClass} onClick={() => onChange(clamp(value + step))}>
        <span className="text-[8px] leading-none">{isVertical ? '▼' : '▶'}</span>
      </button>
    </div>
  );
}
