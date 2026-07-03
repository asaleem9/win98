// Small pure RNG helpers shared across games. Living in a plain .ts module
// (not a component) means calling Math.random here is fine — the "impure during
// render" rule only applies inside React render bodies.

/** Deterministic mulberry32 generator — handy for tests that need repeatable rolls. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rand = () => number;

/** Integer in [min, max] inclusive. */
export function randInt(rand: Rand, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

/** Pick a random element. */
export function pick<T>(rand: Rand, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

/** Roll a probability in [0,1). */
export function chance(rand: Rand, p: number): boolean {
  return rand() < p;
}

/** Weighted pick. weights need not sum to 1. */
export function weightedPick<T>(rand: Rand, entries: readonly [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [item, w] of entries) {
    r -= w;
    if (r < 0) return item;
  }
  return entries[entries.length - 1][0];
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
