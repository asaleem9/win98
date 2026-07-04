// A small browser-style history stack for the encyclopedia's Back/Forward
// buttons. Each entry is a "location" the reader can be looking at. Pure helpers
// operating on an immutable {stack, index} value, so navigation is easy to test.

export type Location =
  | { kind: 'home' }
  | { kind: 'category'; categoryId: string }
  | { kind: 'article'; articleId: string }
  | { kind: 'search'; query: string }
  | { kind: 'trivia' };

export interface History {
  stack: Location[];
  index: number;
}

export function createHistory(initial: Location = { kind: 'home' }): History {
  return { stack: [initial], index: 0 };
}

export function current(h: History): Location {
  return h.stack[h.index];
}

export function canGoBack(h: History): boolean {
  return h.index > 0;
}

export function canGoForward(h: History): boolean {
  return h.index < h.stack.length - 1;
}

function sameLocation(a: Location, b: Location): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'article' && b.kind === 'article') return a.articleId === b.articleId;
  if (a.kind === 'category' && b.kind === 'category') return a.categoryId === b.categoryId;
  if (a.kind === 'search' && b.kind === 'search') return a.query === b.query;
  return true; // home / trivia carry no payload
}

/**
 * Navigate to a new location. Truncates any forward history (like a web browser
 * after you follow a new link), and collapses a no-op push onto the same place.
 */
export function push(h: History, location: Location): History {
  if (sameLocation(current(h), location)) return h;
  const stack = h.stack.slice(0, h.index + 1);
  stack.push(location);
  return { stack, index: stack.length - 1 };
}

export function back(h: History): History {
  return canGoBack(h) ? { stack: h.stack, index: h.index - 1 } : h;
}

export function forward(h: History): History {
  return canGoForward(h) ? { stack: h.stack, index: h.index + 1 } : h;
}
