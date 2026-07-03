// Recent-documents list for the Start menu. Plain localStorage (no React
// context) so the Start menu can read it without extra providers; apps call
// addRecentDoc when they open or save a file.

const KEY = 'win98-recent-docs-v1';
const MAX = 10;

export function getRecentDocs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

export function addRecentDoc(path: string): void {
  if (typeof window === 'undefined') return;
  try {
    const docs = getRecentDocs().filter((p) => p.toLowerCase() !== path.toLowerCase());
    docs.unshift(path);
    window.localStorage.setItem(KEY, JSON.stringify(docs.slice(0, MAX)));
  } catch {
    // storage unavailable — non-fatal
  }
}

export function clearRecentDocs(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Requests the shell open a file path in its associated app. */
export function requestOpenFile(path: string): void {
  window.dispatchEvent(new CustomEvent('win98-open-file', { detail: { path } }));
}
