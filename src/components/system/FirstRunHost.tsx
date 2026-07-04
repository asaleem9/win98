'use client';

import { useEffect } from 'react';
import { useWindows } from '@/contexts/WindowContext';
import { useSettings } from '@/contexts/SettingsContext';
import { scheduleFirstRunAim } from '@/components/apps/aim/firstRun';
import { scheduleFirstRunMail } from '@/components/apps/outlook/firstRun';

/**
 * First-desktop-session "welcome theater". Runs exactly once, ever:
 *   - ~45s after the first login AIM signs itself on and a buddy IMs about the
 *     games that came with the PC (see aim/firstRun).
 *   - ~60s in the "You've Got Mail" chime announces the vendor's welcome message
 *     already waiting in Outlook Express (see outlook/firstRun).
 *
 * A persisted `system.firstSessionDone` pref keeps every later login quiet.
 *
 * Renders nothing — it only schedules timers — but must be mounted inside
 * WindowProvider (so it can open AIM) and SettingsProvider (for the guard).
 * Mount once in the running shell, e.g. alongside <ShellEventHost />.
 */
export function FirstRunHost() {
  const { openWindow } = useWindows();
  const { getAppPref, setAppPref } = useSettings();

  useEffect(() => {
    if (getAppPref('system', 'firstSessionDone', false)) return;
    setAppPref('system', 'firstSessionDone', true);
    const cancelAim = scheduleFirstRunAim(openWindow);
    const cancelMail = scheduleFirstRunMail();
    return () => {
      cancelAim();
      cancelMail();
    };
    // Run once on first mount of the running shell. Deliberately no deps: the
    // setAppPref above changes prefs, and re-running would cancel the pending
    // timers we just scheduled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
