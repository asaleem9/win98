// Shared clipboard store for the shell. Plain module state + subscribe (no
// React context) so Edit menus can read `canPaste` live and any app can copy
// without prop drilling. For text, we also mirror to the real system clipboard
// (best effort) so pasting outside the emulator works.

export type ClipboardData =
  | { kind: 'text'; text: string }
  | { kind: 'image'; dataUrl: string }
  | { kind: 'files'; paths: string[]; operation: 'copy' | 'cut' };

type Listener = (data: ClipboardData | null) => void;

let current: ClipboardData | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener(current);
}

export function setClipboard(data: ClipboardData): void {
  current = data;
  if (data.kind === 'text' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      void navigator.clipboard.writeText(data.text).catch(() => {});
    } catch {
      // clipboard access denied/unavailable — non-fatal
    }
  }
  notify();
}

export function getClipboard(): ClipboardData | null {
  return current;
}

export function clearClipboard(): void {
  current = null;
  notify();
}

/** Subscribe to clipboard changes; returns an unsubscribe function. */
export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Read text from the real system clipboard, bridging the browser API. Resolves
 * null when the API is missing or permission is denied.
 */
export async function readSystemText(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return null;
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

/** Test-only: clear stored data and all subscribers for isolation. */
export function __resetClipboard(): void {
  current = null;
  listeners.clear();
}
