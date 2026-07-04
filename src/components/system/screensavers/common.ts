'use client';

import { useEffect } from 'react';

/**
 * Shared prop shape for every screensaver. All fields are optional so a saver
 * can be dropped into the fullscreen manager, the Display Properties preview,
 * or a bare test with equal ease.
 */
export interface ScreenSaverProps {
  /** Called on any user input while running fullscreen. Absent in preview mode. */
  onDismiss?: () => void;
  /** Render scaled to fill the parent instead of the whole viewport. */
  preview?: boolean;
  /** Scrolling Marquee: the message to scroll. */
  marqueeText?: string;
  /** Scrolling Marquee: scroll speed (pixels/frame-ish, 1..10). */
  marqueeSpeed?: number;
  /** Starfield: warp speed. */
  speed?: number;
}

const PREVIEW_FALLBACK = { width: 160, height: 120 };

/**
 * Pixel size a saver should render at. Fullscreen uses the viewport; preview
 * measures the mounting element, falling back to a sane size when the layout
 * hasn't settled (or under jsdom, where clientWidth reads 0).
 */
export function measureSaver(el: HTMLElement | null, preview: boolean) {
  if (preview) {
    return {
      width: el?.clientWidth || PREVIEW_FALLBACK.width,
      height: el?.clientHeight || PREVIEW_FALLBACK.height,
    };
  }
  return {
    width: typeof window !== 'undefined' ? window.innerWidth : PREVIEW_FALLBACK.width,
    height: typeof window !== 'undefined' ? window.innerHeight : PREVIEW_FALLBACK.height,
  };
}

/** Outer wrapper class: full-viewport overlay when running, fill-parent when previewing. */
export function saverContainerClass(preview: boolean) {
  return preview
    ? 'absolute inset-0 overflow-hidden'
    : 'fixed inset-0 z-[9998] cursor-none';
}

/** Dismiss the saver on the first pointer/key input. No-op in preview mode. */
export function useDismissOnInput(onDismiss: (() => void) | undefined, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !onDismiss) return;
    const dismiss = () => onDismiss();
    window.addEventListener('mousemove', dismiss);
    window.addEventListener('mousedown', dismiss);
    window.addEventListener('keydown', dismiss);
    return () => {
      window.removeEventListener('mousemove', dismiss);
      window.removeEventListener('mousedown', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
  }, [onDismiss, enabled]);
}

/** Parse a #rrggbb string into [r,g,b]. Falls back to white on bad input. */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return [255, 255, 255];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** Scale a hex color's brightness by `factor` (1 = unchanged). Returns rgb(). */
export function shade(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `rgb(${clamp(r * factor)},${clamp(g * factor)},${clamp(b * factor)})`;
}
