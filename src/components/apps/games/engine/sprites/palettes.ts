// Shared color ramps games spread into their sprite palettes. Colors lean
// slightly desaturated and VGA-ish to match the era. Each fragment owns a small
// set of mnemonic single-char keys; the keys were chosen so every fragment here
// can be spread into one palette without colliding (see README for the map).

/** Near-black outline used on almost every sprite. */
export const OUTLINE = { k: '#161310' } as const;

/** Off-white / bright highlight. */
export const WHITE = { w: '#f4f4ec' } as const;

/** Human skin: light / mid / shadow. */
export const SKIN = {
  S: '#f0c49a', // skin light
  s: '#d9a066', // skin mid
  t: '#a76a43', // skin shadow
} as const;

/** Leaves and grass: light / mid / dark. */
export const FOLIAGE = {
  G: '#7fbf4a', // green light
  g: '#4f8f33', // green mid
  f: '#2f5f26', // green dark
} as const;

/** Bark, planks, crates: light / mid / dark. */
export const WOOD = {
  B: '#a3743f', // wood light
  b: '#7a5230', // wood mid
  d: '#4a3018', // wood dark
} as const;

/** Steel, armor, machinery: light / mid / dark. */
export const METAL = {
  M: '#c2c7cf', // metal light
  m: '#8a8f99', // metal mid
  n: '#565a63', // metal dark
} as const;

/** Rivers, sea, potions: light / mid / dark. */
export const WATER = {
  V: '#5b9bd5', // water light
  v: '#3a6ea5', // water mid
  c: '#264f78', // water deep
} as const;

// Faction ramps share the chars r / R / q (mid / light / dark) on purpose: art
// authored with those chars can be recolored per player just by spreading a
// different faction fragment, or via compileSprite's `recolor` swap.
export const FACTION_RED = { R: '#e06a6a', r: '#b83a3a', q: '#7a1f1f' } as const;
export const FACTION_BLUE = { R: '#6a8ae0', r: '#3a5ab8', q: '#1f2f7a' } as const;
export const FACTION_GREEN = { R: '#6ad07a', r: '#3a9a4a', q: '#1f5f2a' } as const;
export const FACTION_PURPLE = { R: '#b46ae0', r: '#8a3ab8', q: '#521f7a' } as const;

/** Faction fragments keyed by name for data-driven player colors. */
export const FACTIONS = {
  red: FACTION_RED,
  blue: FACTION_BLUE,
  green: FACTION_GREEN,
  purple: FACTION_PURPLE,
} as const;

export type FactionName = keyof typeof FACTIONS;
