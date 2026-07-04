'use client';

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { MOUSE_APP_ID, MOUSE_DEFAULTS } from '@/components/apps/control-panel/mouseSettings';

// Never draw more than this many ghosts, however long the trail slider is set.
const MAX_GHOSTS = 10;
const MIN_GHOSTS = 2;

interface Point {
  x: number;
  y: number;
}

/**
 * Fading cursor ghosts that follow the mouse desktop-wide, driven by the Mouse
 * applet's Motion tab ('Show pointer trails' + length). Positions are sampled at
 * most once per frame; the newest sample sits under the live OS cursor, so only
 * the older ones show as a trailing wake.
 */
export function PointerTrails() {
  const { getAppPref } = useSettings();
  const enabled = getAppPref(MOUSE_APP_ID, 'trails', MOUSE_DEFAULTS.trails);
  const rawLength = getAppPref(MOUSE_APP_ID, 'trailLength', MOUSE_DEFAULTS.trailLength);
  const count = Math.max(MIN_GHOSTS, Math.min(MAX_GHOSTS, Math.round(rawLength)));

  const [points, setPoints] = useState<Point[]>([]);
  const pointsRef = useRef<Point[]>([]);
  const pendingRef = useRef<Point | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Drop any stale trail; the component renders nothing while disabled, so
      // there's no need to touch React state here.
      pointsRef.current = [];
      return;
    }
    const onMove = (e: MouseEvent) => {
      pendingRef.current = { x: e.clientX, y: e.clientY };
      if (frameRef.current != null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        const p = pendingRef.current;
        if (!p) return;
        const next = [p, ...pointsRef.current].slice(0, count);
        pointsRef.current = next;
        setPoints(next);
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [enabled, count]);

  // Skip the leading sample (it overlaps the real cursor) and fade the rest.
  if (!enabled || points.length <= 1) return null;
  const ghosts = points.slice(1);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9000]" aria-hidden="true">
      {ghosts.map((g, i) => (
        <svg
          key={i}
          width="12"
          height="19"
          viewBox="0 0 12 19"
          className="absolute"
          style={{ left: g.x, top: g.y, opacity: ((ghosts.length - i) / (ghosts.length + 1)) * 0.6 }}
        >
          <path
            d="M1 1 L1 16 L5 12 L8 18 L10 17 L7 11 L12 11 Z"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="1"
          />
        </svg>
      ))}
    </div>
  );
}
