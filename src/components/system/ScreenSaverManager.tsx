'use client';

import { useState, useEffect, useCallback, lazy, Suspense, ComponentType } from 'react';
import { useSettings, ScreenSaverId } from '@/contexts/SettingsContext';
import { ScreenSaverProps } from './screensavers/common';

const Starfield = lazy(() => import('./screensavers/Starfield'));
const Pipes3D = lazy(() => import('./screensavers/Pipes3D'));
const FlyingWindows = lazy(() => import('./screensavers/FlyingWindows'));
const Mystify = lazy(() => import('./screensavers/Mystify'));
const Marquee = lazy(() => import('./screensavers/Marquee'));
const Maze3D = lazy(() => import('./screensavers/Maze3D'));

// Single source of truth for id -> component. Anything not listed (an unknown
// id from an older/newer save) resolves to nothing and renders safely blank.
const SAVERS: Record<Exclude<ScreenSaverId, 'none'>, ComponentType<ScreenSaverProps>> = {
  starfield: Starfield,
  pipes: Pipes3D,
  'flying-windows': FlyingWindows,
  mystify: Mystify,
  marquee: Marquee,
  maze: Maze3D,
};

interface ScreenSaverViewProps extends ScreenSaverProps {
  id: ScreenSaverId;
}

/**
 * Renders a single saver by id. Shared by the idle manager (fullscreen) and the
 * Display Properties monitor (preview). Unknown ids render nothing.
 */
export function ScreenSaverView({ id, preview, ...rest }: ScreenSaverViewProps) {
  const Saver = id === 'none' ? undefined : SAVERS[id];
  if (!Saver) return null;
  return (
    <Suspense fallback={preview ? null : <div className="fixed inset-0 z-[9998] bg-black" />}>
      <Saver preview={preview} {...rest} />
    </Suspense>
  );
}

interface ScreenSaverManagerProps {
  selectedSaver?: ScreenSaverId;
  timeoutMs?: number;
  forceActive?: boolean;
  // Explicit marquee overrides (used by the live preview to reflect unsaved
  // edits); when omitted the persisted settings supply them.
  marqueeText?: string;
  marqueeSpeed?: number;
}

export function ScreenSaverManager({
  selectedSaver = 'starfield',
  timeoutMs = 300000, // 5 minutes default
  forceActive = false,
  marqueeText,
  marqueeSpeed,
}: ScreenSaverManagerProps) {
  const { settings } = useSettings();
  const [active, setActive] = useState(forceActive);

  const dismiss = useCallback(() => {
    setActive(false);
  }, []);

  useEffect(() => {
    if (forceActive || selectedSaver === 'none') return;

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
    <ScreenSaverView
      id={selectedSaver}
      onDismiss={dismiss}
      marqueeText={marqueeText ?? settings.screenSaver.marqueeText}
      marqueeSpeed={marqueeSpeed ?? settings.screenSaver.marqueeSpeed}
    />
  );
}
