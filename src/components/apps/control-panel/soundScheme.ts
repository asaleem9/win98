import { SoundId } from '@/lib/sounds';

// Bucket the SettingsContext hydrates back into the sound layer on load. Values
// must stay plain URL strings (or null) so that hydration re-applies them; the
// literal mirrors SettingsContext's own SOUND_OVERRIDE_APP_ID.
export const SOUND_OVERRIDE_APP_ID = 'system-sounds';

// The applet keeps its own display metadata (chosen scheme + custom names) here,
// separate from the string-only override bucket above.
export const SOUNDS_APPLET_APP_ID = 'sounds-scheme';

// A fully-silent 8-bit WAV. Assigning it to a cue makes that event play nothing
// while still flowing through the normal override → playSound path, so "(None)"
// and the "No Sounds" scheme persist across reloads like any other assignment.
export const SILENT_SOUND =
  'data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';

export interface SoundEvent {
  /** Stable key used in the labels bucket and in tests. */
  id: string;
  /** Shown in the Events list. */
  label: string;
  /** The cue this event drives; overrides target this SoundId. */
  sound: SoundId;
  /** Friendly name shown when the event has no override (its scheme default). */
  defaultName: string;
}

// System events mapped onto distinct SoundIds so previews stay meaningful. Each
// event owns a unique cue — assignments never collide.
export const SOUND_EVENTS: SoundEvent[] = [
  { id: 'start-windows', label: 'Start Windows', sound: 'startup', defaultName: 'The Microsoft Sound' },
  { id: 'exit-windows', label: 'Exit Windows', sound: 'shutdown', defaultName: 'Windows Shutdown' },
  { id: 'default', label: 'Default sound', sound: 'ding', defaultName: 'Ding' },
  { id: 'asterisk', label: 'Asterisk', sound: 'chord', defaultName: 'Chord' },
  { id: 'critical-stop', label: 'Critical Stop', sound: 'error', defaultName: 'Critical Stop' },
  { id: 'question', label: 'Question', sound: 'notify', defaultName: 'Question' },
  { id: 'exclamation', label: 'Exclamation', sound: 'exclamation', defaultName: 'Exclamation' },
  { id: 'menu-command', label: 'Menu command', sound: 'menuClick', defaultName: 'Menu Command' },
  { id: 'menu-popup', label: 'Menu popup', sound: 'menuOpen', defaultName: 'Menu Popup' },
  { id: 'maximize', label: 'Maximize', sound: 'maximize', defaultName: 'Maximize' },
  { id: 'minimize', label: 'Minimize', sound: 'minimize', defaultName: 'Minimize' },
  { id: 'restore-down', label: 'Restore Down', sound: 'restoreDown', defaultName: 'Restore Down' },
  { id: 'empty-recycle', label: 'Empty Recycle Bin', sound: 'emptyBin', defaultName: 'Empty Recycle Bin' },
  { id: 'new-mail', label: 'New Mail Notification', sound: 'youveGotMail', defaultName: 'New Mail' },
  { id: 'instant-message', label: 'Incoming Instant Message', sound: 'aimMessage', defaultName: 'Instant Message' },
];

export const EVENT_BY_ID: Record<string, SoundEvent> = Object.fromEntries(
  SOUND_EVENTS.map((e) => [e.id, e]),
);

export type SchemeId = 'windows-default' | 'utopia' | 'no-sounds';

export interface Scheme {
  id: SchemeId;
  name: string;
}

export const SOUND_SCHEMES: Scheme[] = [
  { id: 'windows-default', name: 'Windows Default' },
  { id: 'utopia', name: 'Utopia Sound Scheme' },
  { id: 'no-sounds', name: 'No Sounds' },
];

// Utopia re-points a handful of events at *different* bundled cues than their
// default, so the scheme sounds distinct from Windows Default. Events left out
// fall back to their default cue.
export const UTOPIA_SCHEME: Record<string, string> = {
  'start-windows': '/sounds/chord.mp3',
  'exit-windows': '/sounds/notify.mp3',
  'default': '/sounds/notify.mp3',
  'asterisk': '/sounds/ding.mp3',
  'critical-stop': '/sounds/error.mp3',
  'question': '/sounds/chord.mp3',
  'exclamation': '/sounds/exclamation.mp3',
  'menu-command': '/sounds/menu-open.mp3',
  'empty-recycle': '/sounds/empty-bin.mp3',
  'new-mail': '/sounds/youve-got-mail.mp3',
};

/**
 * The override URL a scheme assigns to an event: `null` clears it (Windows
 * Default), the silent clip silences it (No Sounds), or a bundled path remaps it
 * (Utopia). Unmapped Utopia events clear back to their default.
 */
export function overrideForScheme(scheme: SchemeId, eventId: string): string | null {
  switch (scheme) {
    case 'no-sounds':
      return SILENT_SOUND;
    case 'utopia':
      return UTOPIA_SCHEME[eventId] ?? null;
    case 'windows-default':
    default:
      return null;
  }
}

export function isSilent(url: string | null): boolean {
  return url === SILENT_SOUND;
}

/** File name shown for a custom assignment, e.g. `/sounds/chord.mp3` → `chord.mp3`. */
export function baseName(path: string): string {
  const clean = path.split(/[?#]/)[0];
  const parts = clean.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

/** How the current override should read in the Events list for a given event. */
export function displayName(
  url: string | null,
  event: SoundEvent,
  labels: Record<string, string>,
): string {
  if (url === null || url === undefined) return event.defaultName;
  if (isSilent(url)) return '(None)';
  return labels[event.id] ?? '(Custom)';
}
