'use client';

import { AppComponentProps } from '@/types/app';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';

function Slider({
  label,
  value,
  muted,
  onChange,
  onMute,
}: {
  label: string;
  value: number;
  muted: boolean;
  onChange: (v: number) => void;
  onMute: (m: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-2 border-r border-[var(--win98-button-shadow)] last:border-r-0">
      <span className="select-none">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="h-[80px] accent-[var(--win98-highlight)]"
        style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
        aria-label={`${label} volume`}
      />
      <label className="flex items-center gap-1 select-none">
        <input type="checkbox" checked={muted} onChange={(e) => onMute(e.target.checked)} />
        Mute
      </label>
    </div>
  );
}

export default function VolumeControl({}: AppComponentProps) {
  const { settings, setSetting } = useSettings();

  const setVolume = (v: number) => {
    setSetting('volume', v);
  };
  const setMuted = (m: boolean) => {
    setSetting('soundsEnabled', !m);
    if (!m) playSound('ding');
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <div className="flex-1 flex items-stretch justify-center p-2">
        <Slider
          label="Volume Control"
          value={settings.volume}
          muted={!settings.soundsEnabled}
          onChange={setVolume}
          onMute={setMuted}
        />
        <Slider
          label="Wave"
          value={settings.volume}
          muted={!settings.soundsEnabled}
          onChange={setVolume}
          onMute={setMuted}
        />
        <Slider
          label="MIDI"
          value={settings.volume}
          muted={!settings.soundsEnabled}
          onChange={setVolume}
          onMute={setMuted}
        />
      </div>
      <div className="px-2 pb-1 text-[var(--win98-disabled-text)] select-none">SB16 Mixer [220]</div>
    </div>
  );
}
