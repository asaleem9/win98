'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';

const Starfield = lazy(() => import('./screensavers/Starfield'));
const Pipes3D = lazy(() => import('./screensavers/Pipes3D'));
const FlyingWindows = lazy(() => import('./screensavers/FlyingWindows'));

export type ScreenSaverType = 'starfield' | 'pipes' | 'flying-windows' | 'none';

interface ScreenSaverManagerProps {
  selectedSaver?: ScreenSaverType;
  timeoutMs?: number;
  forceActive?: boolean;
}

export function ScreenSaverManager({
  selectedSaver = 'starfield',
  timeoutMs = 300000, // 5 minutes default
  forceActive = false,
}: ScreenSaverManagerProps) {
  const [active, setActive] = useState(false);

  const dismiss = useCallback(() => {
    setActive(false);
  }, []);

  useEffect(() => {
    if (forceActive) {
      setActive(true);
      return;
    }

    if (selectedSaver === 'none') return;

    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setActive(true), timeoutMs);
    };

    resetTimer();

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    for (const evt of events) {
      window.addEventListener(evt, resetTimer);
    }

    return () => {
      clearTimeout(timer);
      for (const evt of events) {
        window.removeEventListener(evt, resetTimer);
      }
    };
  }, [selectedSaver, timeoutMs, forceActive]);

  if (!active || selectedSaver === 'none') return null;

  return (
    <Suspense fallback={<div className="fixed inset-0 z-[9998] bg-black" />}>
      {selectedSaver === 'starfield' && <Starfield onDismiss={dismiss} />}
      {selectedSaver === 'pipes' && <Pipes3D onDismiss={dismiss} />}
      {selectedSaver === 'flying-windows' && <FlyingWindows onDismiss={dismiss} />}
    </Suspense>
  );
}
