import {
  animationsEnabled,
  playZoomAnimation,
  rectFromElement,
  taskbarButtonRect,
  viewportRect,
} from '../ZoomAnimation';
import { WINDOW_DEFAULTS } from '@/lib/constants';

const SETTINGS_KEY = 'win98-settings-v1';

// Give an element a concrete layout box (jsdom otherwise reports an all-zero rect).
function boxed(el: Element, box: { left: number; top: number; width: number; height: number }) {
  el.getBoundingClientRect = () =>
    ({
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      right: box.left + box.width,
      bottom: box.top + box.height,
      x: box.left,
      y: box.top,
      toJSON: () => ({}),
    }) as DOMRect;
}

afterEach(() => {
  window.localStorage.clear();
  document.body.innerHTML = '';
  // Remove any WAAPI stub a test installed.
  delete (Element.prototype as unknown as { animate?: unknown }).animate;
});

describe('rectFromElement', () => {
  it('returns null for a missing element', () => {
    expect(rectFromElement(null)).toBeNull();
    expect(rectFromElement(undefined)).toBeNull();
  });

  it('returns null for a zero-size box', () => {
    const el = document.createElement('div');
    expect(rectFromElement(el)).toBeNull();
  });

  it('maps a laid-out element to a viewport-space rect', () => {
    const el = document.createElement('div');
    boxed(el, { left: 10, top: 20, width: 100, height: 50 });
    expect(rectFromElement(el)).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });
});

describe('taskbarButtonRect', () => {
  it('reads the rect of the matching taskbar button', () => {
    const btn = document.createElement('button');
    btn.setAttribute('data-taskbar-button-for', 'win-7');
    boxed(btn, { left: 200, top: 580, width: 120, height: 22 });
    document.body.appendChild(btn);
    expect(taskbarButtonRect('win-7')).toEqual({ x: 200, y: 580, width: 120, height: 22 });
  });

  it('returns null when no button matches the id', () => {
    expect(taskbarButtonRect('nope')).toBeNull();
  });
});

describe('viewportRect', () => {
  it('is the desktop minus the taskbar strip', () => {
    const rect = viewportRect();
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(window.innerWidth);
    expect(rect.height).toBe(window.innerHeight - WINDOW_DEFAULTS.taskbarHeight);
  });
});

describe('animationsEnabled', () => {
  it('defaults to on when nothing is persisted', () => {
    expect(animationsEnabled()).toBe(true);
  });

  it('respects a persisted effects.windowAnimation flag', () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ effects: { windowAnimation: false } }));
    expect(animationsEnabled()).toBe(false);
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ effects: { windowAnimation: true } }));
    expect(animationsEnabled()).toBe(true);
  });
});

describe('playZoomAnimation', () => {
  const from = { x: 100, y: 100, width: 400, height: 300 };
  const to = { x: 200, y: 580, width: 120, height: 22 };

  it('is a no-op when either endpoint is missing', () => {
    expect(playZoomAnimation({ from: null, to })).toBe(false);
    expect(playZoomAnimation({ from, to: null })).toBe(false);
    expect(document.querySelector('[data-zoom-animation]')).toBeNull();
  });

  it('is a no-op when the animation effect is disabled', () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ effects: { windowAnimation: false } }));
    expect(playZoomAnimation({ from, to })).toBe(false);
    expect(document.querySelector('[data-zoom-animation]')).toBeNull();
  });

  it('cleans up without animating when WAAPI is unavailable', () => {
    // jsdom has no Element.animate; the overlay must not linger.
    expect(playZoomAnimation({ from, to })).toBe(false);
    expect(document.querySelector('[data-zoom-animation]')).toBeNull();
  });

  it('mounts a wireframe overlay, animates, and removes it on finish', () => {
    let lastAnim: { onfinish: (() => void) | null; oncancel: (() => void) | null } | undefined;
    const animate = vi.fn(() => {
      lastAnim = { onfinish: null, oncancel: null };
      return lastAnim as unknown as Animation;
    });
    (Element.prototype as unknown as { animate: unknown }).animate = animate;

    const started = playZoomAnimation({ from, to, frames: 4 });
    expect(started).toBe(true);
    expect(animate).toHaveBeenCalledTimes(1);

    const overlay = document.querySelector('[data-zoom-animation]');
    expect(overlay).not.toBeNull();
    // Four nested wireframe rectangles.
    expect(overlay!.children).toHaveLength(4);

    // Finishing the animation tears the overlay down.
    lastAnim!.onfinish?.();
    expect(document.querySelector('[data-zoom-animation]')).toBeNull();
  });
});
