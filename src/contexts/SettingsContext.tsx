'use client';

import { createContext, useCallback, useContext, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { setSoundsMuted, setMasterVolume, setSoundOverride, SoundId } from '@/lib/sounds';
import { WallpaperSetting } from '@/lib/wallpapers';
import { useEffect, useMemo } from 'react';

// Per-app prefs bucket that stores sound-scheme overrides ({ [SoundId]: url }).
const SOUND_OVERRIDE_APP_ID = 'system-sounds';

export type ColorScheme = 'standard' | 'desert' | 'eggplant' | 'rainy-day' | 'high-contrast';
export type ScreenSaverId =
  | 'none'
  | 'flying-windows'
  | 'starfield'
  | 'mystify'
  | 'pipes'
  | 'marquee'
  | 'maze';

export interface ScreenSaverSettings {
  id: ScreenSaverId;
  timeoutMinutes: number;
  // Optional so saves written before the Marquee saver existed still load.
  marqueeText?: string;
  marqueeSpeed?: number;
}

export interface TaskbarSettings {
  autoHide: boolean;
  smallIcons: boolean;
  showClock: boolean;
}

export interface EffectsSettings {
  windowAnimation: boolean;
}

export interface Settings {
  wallpaper: WallpaperSetting;
  desktopColor: string;
  colorScheme: ColorScheme;
  soundsEnabled: boolean;
  volume: number; // 0..1
  screenSaver: ScreenSaverSettings;
  taskbar: TaskbarSettings;
  effects: EffectsSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  wallpaper: null,
  desktopColor: '#008080',
  colorScheme: 'standard',
  soundsEnabled: true,
  volume: 0.7,
  screenSaver: {
    id: 'flying-windows',
    timeoutMinutes: 10,
    marqueeText: 'Your message here.',
    marqueeSpeed: 3,
  },
  taskbar: { autoHide: false, smallIcons: false, showClock: true },
  effects: { windowAnimation: true },
};

interface SettingsContextType {
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  getAppPref: <T>(appId: string, key: string, fallback: T) => T;
  setAppPref: <T>(appId: string, key: string, value: T) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [storedSettings, setSettings] = useLocalStorage<Settings>('win98-settings-v1', DEFAULT_SETTINGS);
  const [prefs, setPrefs] = useLocalStorage<Record<string, Record<string, unknown>>>('win98-prefs-v1', {});

  // Backfill keys added after a user's settings were first persisted, so blobs
  // written by earlier versions keep their nested objects (taskbar/effects)
  // fully populated instead of surfacing as undefined.
  const settings = useMemo<Settings>(
    () => ({
      ...DEFAULT_SETTINGS,
      ...storedSettings,
      screenSaver: { ...DEFAULT_SETTINGS.screenSaver, ...storedSettings.screenSaver },
      taskbar: { ...DEFAULT_SETTINGS.taskbar, ...storedSettings.taskbar },
      effects: { ...DEFAULT_SETTINGS.effects, ...storedSettings.effects },
    }),
    [storedSettings],
  );

  // Keep the audio layer in sync with persisted settings
  useEffect(() => {
    setSoundsMuted(!settings.soundsEnabled);
    setMasterVolume(settings.volume);
  }, [settings.soundsEnabled, settings.volume]);

  // Push persisted per-cue sound overrides into the sound layer on hydration.
  useEffect(() => {
    const overrides = prefs[SOUND_OVERRIDE_APP_ID] ?? {};
    for (const [id, url] of Object.entries(overrides)) {
      setSoundOverride(id as SoundId, typeof url === 'string' ? url : null);
    }
  }, [prefs]);

  const setSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [setSettings],
  );

  const getAppPref = useCallback(
    <T,>(appId: string, key: string, fallback: T): T => {
      const appPrefs = prefs[appId];
      if (!appPrefs || !(key in appPrefs)) return fallback;
      return appPrefs[key] as T;
    },
    [prefs],
  );

  const setAppPref = useCallback(
    <T,>(appId: string, key: string, value: T) => {
      setPrefs((prev) => ({ ...prev, [appId]: { ...prev[appId], [key]: value } }));
    },
    [setPrefs],
  );

  return (
    <SettingsContext.Provider value={{ settings, setSetting, getAppPref, setAppPref }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
