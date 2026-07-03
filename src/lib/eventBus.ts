// Typed wrapper over the shell's window CustomEvent conventions. Event names
// stay `win98-*` on window, so raw dispatch/addEventListener sites keep working
// alongside this bus. Prefer emit/on for new code; the types below are the
// single source of truth for each event's detail shape.

export interface ShellEvents {
  // Toggle the Start menu open/closed (Taskbar listens).
  'toggle-start': undefined;
  // Show the Run... dialog (ShellEventHost listens).
  'run-dialog': undefined;
  // Open a file path in its associated app (ShellEventHost listens).
  'open-file': { path: string };
  // Surface a system dialog; message is required, title/icon have defaults
  // (SystemDialogs listens).
  'system-dialog': {
    title?: string;
    message: string;
    icon?: 'error' | 'warning' | 'info' | 'question';
  };
  // Shut down immediately (page.tsx listens).
  'shutdown': undefined;
  // Show the Shut Down Windows dialog (page.tsx listens).
  'shutdown-dialog': undefined;
  // Trigger the Blue Screen of Death (page.tsx listens).
  'bsod': { message?: string };
  // Show an About <app> dialog.
  'about-dialog': { appName: string; icon?: string; version?: string };
  // Show a file/folder Properties dialog.
  'properties-dialog': { path: string };
  // Report an app-level error for the shell to present.
  'app-error': { appName: string; errorType?: string };
  // Flash a window's taskbar button to request attention.
  'flash-window': { id: string };
  // Register a system-tray icon.
  'tray-register': { id: string; icon: string; tooltip?: string };
  // Remove a previously registered system-tray icon.
  'tray-unregister': { id: string };
  // A dynamic tray icon was activated (clicked). By convention the id matches
  // the app id to open, so the tray's default handler focuses/opens that window.
  'tray-activate': { id: string };
}

type EventName = keyof ShellEvents;

// Events whose detail is undefined take no argument; the rest require one.
type EmitArgs<K extends EventName> = ShellEvents[K] extends undefined ? [] : [ShellEvents[K]];

/**
 * Dispatch a shell event as a window CustomEvent (`win98-${type}`). No-op
 * during SSR. Detail-less events are called with no second argument.
 */
export function emit<K extends EventName>(type: K, ...detail: EmitArgs<K>): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(`win98-${type}`, { detail: detail[0] }));
}

/**
 * Subscribe to a shell event; returns an unsubscribe function. No-op (returns a
 * noop unsubscribe) during SSR.
 */
export function on<K extends EventName>(
  type: K,
  handler: (detail: ShellEvents[K]) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<ShellEvents[K]>).detail);
  window.addEventListener(`win98-${type}`, listener);
  return () => window.removeEventListener(`win98-${type}`, listener);
}
