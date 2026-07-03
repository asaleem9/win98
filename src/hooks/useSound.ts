'use client';

import { useCallback } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound, SoundId } from '@/lib/sounds';

export function useSound() {
  const { settings, setSetting } = useSettings();

  const play = useCallback((id: SoundId) => {
    playSound(id);
  }, []);

  const setMuted = useCallback(
    (m: boolean) => setSetting('soundsEnabled', !m),
    [setSetting],
  );

  return {
    play,
    muted: !settings.soundsEnabled,
    setMuted,
    volume: settings.volume,
    setVolume: useCallback((v: number) => setSetting('volume', v), [setSetting]),
  };
}
