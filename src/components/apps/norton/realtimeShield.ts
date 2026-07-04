'use client';

// Norton AntiVirus 2000's "Auto-Protect" real-time shield. Once the user has
// opened Norton this session, it watches files landing on the virtual disk and
// quarantines known threats on sight — popping the classic detection alert and
// moving the file into Norton's persisted quarantine. When Norton has never been
// opened, the shield stays dormant and the era's gags (BonziBUDDY) play out as
// before.

import { useEffect } from 'react';
import { onFileWrite } from '@/lib/fs/writeEvents';
import { useSettings } from '@/contexts/SettingsContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { getParentPath } from '@/lib/filesystem';
import { normalizePath } from '@/lib/fs/fsOperations';
import { Threat, quarantineThreats, markThreatsCleared } from './nortonLogic';

/** The gag signature Norton slaps on everything the shield catches. */
export const SHIELD_THREAT_TYPE = 'W98.RAMDoubler.Gag';

/** The alert Norton throws when the shield quarantines a file. */
export const SHIELD_ALERT_MESSAGE = `Threat detected: ${SHIELD_THREAT_TYPE} — quarantined`;

// Session flag, flipped on the first time Norton's window opens (see the tray
// registration in NortonAntiVirus). Module-scoped so it lives for the page
// session and is shared by every consumer.
let nortonOpened = false;

/** Records that Norton was opened this session (idempotent). */
export function markNortonOpened(): void {
  nortonOpened = true;
}

/** Whether Norton has been opened this session. */
export function isNortonOpened(): boolean {
  return nortonOpened;
}

/** Test hook: forget that Norton was opened. */
export function resetNortonSession(): void {
  nortonOpened = false;
}

function basename(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || path;
}

/**
 * Returns a Threat when a written file matches a known signature, else null.
 * Signatures: the `ram_doubler.exe` dropper by name, or any file carrying the
 * `installer:ram-doubler` marker as its content.
 */
export function matchThreat(path: string, content: string): Threat | null {
  const name = basename(path);
  const byName = /^ram_doubler\.exe$/i.test(name);
  const byContent = /installer:ram-doubler/i.test(content ?? '');
  if (!byName && !byContent) return null;
  return {
    name,
    location: `${getParentPath(normalizePath(path))}\\`,
    risk: 'High',
    type: SHIELD_THREAT_TYPE,
  };
}

/** Builds a threat record for a flagged download that never touched disk. */
export function threatForDownload(filename: string, dir: string): Threat {
  return {
    name: filename,
    location: dir.endsWith('\\') ? dir : `${dir}\\`,
    risk: 'High',
    type: SHIELD_THREAT_TYPE,
  };
}

export interface QuarantinePrefs {
  getAppPref: <T>(appId: string, key: string, fallback: T) => T;
  setAppPref: <T>(appId: string, key: string, value: T) => void;
}

/** Adds a threat to Norton's persisted quarantine and cleared lists. */
export function quarantineThreat(prefs: QuarantinePrefs, threat: Threat): void {
  const quarantine = prefs.getAppPref<Threat[]>('norton', 'quarantine', []);
  const cleared = prefs.getAppPref<string[]>('norton', 'clearedNames', []);
  prefs.setAppPref('norton', 'quarantine', quarantineThreats(quarantine, [threat]));
  prefs.setAppPref('norton', 'clearedNames', markThreatsCleared(cleared, [threat]));
}

/** Fires the classic Norton detection alert as a shell dialog. */
export function showNortonAlert(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('win98-system-dialog', {
      detail: { title: 'Norton AntiVirus', icon: 'warning', message: SHIELD_ALERT_MESSAGE },
    }),
  );
}

/**
 * Mount-once hook that subscribes the shield to filesystem writes. Only acts
 * when Norton has been opened this session; otherwise it leaves writes alone so
 * the untouched-Norton experience (and its gags) is preserved.
 */
export function useNortonRealtimeShield(): void {
  const { getAppPref, setAppPref } = useSettings();
  const { deleteToRecycleBin } = useFileSystem();

  useEffect(() => {
    return onFileWrite((path, content) => {
      if (!isNortonOpened()) return;
      const threat = matchThreat(path, content);
      if (!threat) return;
      // Defer so the write has committed to the tree before we move the file out.
      setTimeout(() => {
        deleteToRecycleBin(path);
        quarantineThreat({ getAppPref, setAppPref }, threat);
        showNortonAlert();
      }, 0);
    });
  }, [getAppPref, setAppPref, deleteToRecycleBin]);
}
