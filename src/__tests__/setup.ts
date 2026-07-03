import '@testing-library/jest-dom/vitest';

// jsdom's localStorage can be shadowed by Node's built-in stub (which lacks
// clear/getItem when --localstorage-file is unset), so install a real
// in-memory implementation for tests.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

Object.defineProperty(window, 'localStorage', {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
});

// Stub HTMLMediaElement.play/pause — jsdom doesn't implement media playback
// and logs "Not implemented" errors otherwise.
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  value: () => Promise.resolve(),
  writable: true,
  configurable: true,
});
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  value: () => {},
  writable: true,
  configurable: true,
});

beforeEach(() => {
  window.localStorage.clear();
});
