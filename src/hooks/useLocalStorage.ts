'use client';

import { useCallback, useState } from 'react';

/**
 * SSR-safe localStorage-backed state. Reads lazily on mount, writes on set.
 * Parse/quota failures fall back to the initial value silently.
 */
export function useLocalStorage<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // storage unavailable — keep in-memory state
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
