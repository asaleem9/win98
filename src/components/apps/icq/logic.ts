// Pure, deterministic helpers behind the ICQ cameo: how a contact's presence
// drifts over time, which canned line they say next, and the scripted patter of
// the "random chat partner". No Date.now / Math.random in here, so every piece
// is trivially unit-testable — pass a seeded rng or an explicit turn counter.

import {
  GENERIC_REPLIES,
  SMOOTHTALKER_LINES,
  SMOOTHTALKER_OPENER,
  type Contact,
  type ICQStatus,
} from './contacts';

/**
 * The presence states a contact drifts between as the buddy list "breathes".
 * Offline and invisible are excluded — contacts you can see stay reachable, they
 * just change their mind about how available they are.
 */
export const PRESENCE_CYCLE: ICQStatus[] = ['online', 'ffc', 'away', 'na', 'occupied', 'dnd'];

/**
 * Pick a fresh presence for a contact, always different from the current one so
 * the change is visible. Driven by an injected rng for deterministic tests.
 */
export function cycleStatus(current: ICQStatus, rng: () => number): ICQStatus {
  const pool = PRESENCE_CYCLE.filter((s) => s !== current);
  if (pool.length === 0) return current;
  const i = Math.floor(rng() * pool.length) % pool.length;
  return pool[i];
}

/**
 * The next canned line for a contact, cycling through its personality table.
 * Falls back to the generic filler if a contact somehow has no lines of its own.
 */
export function replyForTurn(contact: Contact, turn: number): string {
  const lines = contact.replies.length ? contact.replies : GENERIC_REPLIES;
  const i = ((turn % lines.length) + lines.length) % lines.length;
  return lines[i];
}

/**
 * SmoothTalker_2000's scripted line for a given turn. Turn 0 is his opener,
 * delivered the moment you connect; every turn after cycles his pickup lines.
 */
export function smoothTalkerLine(turn: number): string {
  if (turn <= 0) return SMOOTHTALKER_OPENER;
  const i = (turn - 1) % SMOOTHTALKER_LINES.length;
  return SMOOTHTALKER_LINES[i];
}

/** True for the presence states ICQ files under its "Online" group. */
export function isOnlineGroup(status: ICQStatus): boolean {
  return status === 'online' || status === 'ffc';
}
