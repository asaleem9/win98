'use client';

// The classic Win98 "zoom" the shell plays when a window minimizes, restores,
// or maximizes: a few nested wireframe rectangles sweep from the window's box to
// its destination (taskbar button, restored bounds, or the full desktop) and
// vanish. It's a throwaway DOM overlay — state has already changed by the time
// this runs, so the animation never blocks anything.

import { WINDOW_DEFAULTS } from '@/lib/constants';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SETTINGS_KEY = 'win98-settings-v1';
const FRAME_COUNT = 4;
const DEFAULT_DURATION = 180;
const FRAME_INSET = 3; // px each nested rectangle shrinks in on every side

/** Whether the "Show window animation" effect is enabled (defaults on). */
export function animationsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as { effects?: { windowAnimation?: boolean } };
    return parsed?.effects?.windowAnimation ?? true;
  } catch {
    return true;
  }
}

/** A viewport-space rect for a DOM element, or null if it has no layout box. */
export function rectFromElement(el: Element | null | undefined): Rect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // jsdom (and detached/hidden nodes) report an all-zero box; treat as absent so
  // callers cleanly skip the animation rather than zooming from nowhere.
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

/** The taskbar button rect for a window, via its data-taskbar-button-for hook. */
export function taskbarButtonRect(windowId: string): Rect | null {
  if (typeof document === 'undefined') return null;
  return rectFromElement(document.querySelector(`[data-taskbar-button-for="${windowId}"]`));
}

/** The rect a maximized window fills: the desktop minus the taskbar strip. */
export function viewportRect(): Rect {
  return {
    x: 0,
    y: 0,
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: (typeof window === 'undefined' ? 0 : window.innerHeight) - WINDOW_DEFAULTS.taskbarHeight,
  };
}

interface ZoomOptions {
  from: Rect | null;
  to: Rect | null;
  duration?: number;
  frames?: number;
}

/**
 * Play the wireframe zoom between two rects. Returns true if an animation was
 * actually started. No-ops (returning false) when the effect is disabled, when
 * either endpoint is missing, or when the Web Animations API is unavailable
 * (e.g. jsdom under test) — so it is always safe to fire-and-forget.
 */
export function playZoomAnimation({ from, to, duration = DEFAULT_DURATION, frames = FRAME_COUNT }: ZoomOptions): boolean {
  if (typeof document === 'undefined') return false;
  if (!from || !to) return false;
  if (!animationsEnabled()) return false;

  const container = document.createElement('div');
  container.setAttribute('data-zoom-animation', '');
  container.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'margin:0',
    'padding:0',
    'z-index:9995',
    'pointer-events:none',
  ].join(';');

  for (let i = 0; i < frames; i++) {
    const frame = document.createElement('div');
    const inset = i * FRAME_INSET;
    frame.style.cssText = [
      'position:absolute',
      `left:${inset}px`,
      `top:${inset}px`,
      `right:${inset}px`,
      `bottom:${inset}px`,
      'border:1px dotted #fff',
      'mix-blend-mode:difference',
    ].join(';');
    container.appendChild(frame);
  }

  document.body.appendChild(container);

  // No WAAPI (jsdom) — nothing to animate, so just clean up and report no-op.
  if (typeof container.animate !== 'function') {
    container.remove();
    return false;
  }

  const keyframes: Keyframe[] = [
    { transform: `translate(${from.x}px, ${from.y}px)`, width: `${from.width}px`, height: `${from.height}px` },
    { transform: `translate(${to.x}px, ${to.y}px)`, width: `${to.width}px`, height: `${to.height}px` },
  ];
  const anim = container.animate(keyframes, { duration, easing: 'ease-out', fill: 'forwards' });
  const cleanup = () => container.remove();
  anim.onfinish = cleanup;
  anim.oncancel = cleanup;
  return true;
}
