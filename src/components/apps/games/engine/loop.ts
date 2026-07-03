'use client';

import { useEffect, useRef } from 'react';

/**
 * requestAnimationFrame loop that pauses while the tab is hidden and cancels on
 * unmount. The callback receives the delta time in seconds (clamped so a long
 * pause doesn't produce a giant jump on resume).
 */
export function useGameLoop(callback: (dt: number) => void, running: boolean = true) {
  const cbRef = useRef(callback);
  useEffect(() => {
    cbRef.current = callback;
  });

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const hidden = typeof document !== 'undefined' && document.hidden;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!hidden) cbRef.current(dt);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

/**
 * Fixed-interval logic tick (independent of frame rate) that also pauses when
 * the document is hidden. Good for turn-ish sims (SimCity, RTS spawn timers).
 */
export function useInterval(callback: () => void, ms: number, running: boolean = true) {
  const cbRef = useRef(callback);
  useEffect(() => {
    cbRef.current = callback;
  });

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      cbRef.current();
    }, ms);
    return () => clearInterval(id);
  }, [ms, running]);
}
