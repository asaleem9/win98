'use client';

import { createContext, useCallback, useContext, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { setSoundsMuted, setMasterVolume } from '@/lib/sounds';
import { useEffect } from 'react';

export type ColorScheme = 'standard' | 'desert' | 'eggplant' | 'rainy-day' | 'high-contrast';
export type ScreenSaverId = 'flying-windows' | 'starfield' | 'pipes' | 'none';

export interface Settings {
  wallpaper: string | null;
  desktopColor: string;
  colorScheme: ColorScheme;
  soundsEnabled: boolean;
  volume: number; // 0..1
  screenSaver: { id: ScreenSaverId; timeoutMinutes: number };
}

export const DEFAULT_SETTINGS: Settings = {
  wallpaper: null,
  desktopColor: '#008080',
  colorScheme: 'standard',
  soundsEnabled: true,
  volume: 0.7,
  screenSaver: { id: 'flying-windows', timeoutMinutes: 10 },
};

interface SettingsContextType {
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  getAppPref: <T>(appId: string, key: string, fallback: T) => T;
  setAppPref: <T>(appId: string, key: string, value: T) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useLocalStorage<Settings>('win98-settings-v1', DEFAULT_SETTINGS);
  const [prefs, setPrefs] = useLocalStorage<Record<string, Record<string, unknown>>>('win98-prefs-v1', {});

  // Keep the audio layer in sync with persisted settings
  useEffect(() => {
    setSoundsMuted(!settings.soundsEnabled);
    setMasterVolume(settings.volume);
  }, [settings.soundsEnabled, settings.volume]);

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
