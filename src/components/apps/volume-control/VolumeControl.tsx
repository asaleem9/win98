'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppComponentProps } from '@/types/app';
import { useSettings } from '@/contexts/SettingsContext';
import { Dialog98 } from '@/components/ui/Dialog98';
import {
  SOUND_CHANNELS,
  SoundChannel,
  getChannelState,
  setChannelVolume,
  setChannelMuted,
  setChannelBalance,
  getMasterBalance,
  setMasterBalance,
} from '@/lib/sounds';

// Which mixer strips exist. 'master' is the system volume (two-way synced with
// the tray slider); the rest map to named audio channels in the sound layer.
type ColumnKey = 'master' | SoundChannel;
const COLUMN_LABELS: Record<ColumnKey, string> = {
  master: 'Volume Control',
  wave: 'Wave',
  midi: 'MIDI',
  cd: 'CD Audio',
};
const ALL_COLUMNS: ColumnKey[] = ['master', 'wave', 'midi', 'cd'];
const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = { master: true, wave: true, midi: true, cd: true };

const MIXER_APP_ID = 'mixer';

interface Strip {
  volume: number; // 0..1
  muted: boolean;
  balance: number; // -1..1
}

function MixerColumn({
  label,
  strip,
  onVolume,
  onMute,
  onBalance,
  last,
}: {
  label: string;
  strip: Strip;
  onVolume: (v: number) => void;
  onMute: (m: boolean) => void;
  onBalance: (b: number) => void;
  last: boolean;
}) {
  return (
    <div className={`flex-1 flex flex-col items-center px-2 py-1 ${last ? '' : 'border-r border-[var(--win98-button-shadow)]'}`}>
      <span className="select-none text-center leading-tight mb-1 h-[24px] flex items-center">{label}</span>
      {/* Balance */}
      <div className="flex items-center gap-[2px] w-full mb-1">
        <span className="text-[9px] select-none">L</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.02}
          value={strip.balance}
          onChange={(e) => onBalance(Number(e.target.value))}
          className="flex-1 h-[12px] accent-[var(--win98-highlight)]"
          aria-label={`${label} balance`}
        />
        <span className="text-[9px] select-none">R</span>
      </div>
      {/* Volume */}
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(strip.volume * 100)}
        onChange={(e) => onVolume(Number(e.target.value) / 100)}
        className="h-[78px] accent-[var(--win98-highlight)]"
        style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
        aria-label={`${label} volume`}
      />
      <label className="flex items-center gap-1 select-none mt-1">
        <input type="checkbox" checked={strip.muted} onChange={(e) => onMute(e.target.checked)} />
        Mute
      </label>
    </div>
  );
}

export default function VolumeControl({}: AppComponentProps) {
  const { settings, setSetting, getAppPref, setAppPref } = useSettings();

  // Channel strips come from the sound layer (already hydrated from prefs);
  // master mirrors the global settings so it two-way syncs with the tray.
  const [channels, setChannels] = useState<Record<SoundChannel, Strip>>(() => getChannelState());
  const [masterBal, setMasterBal] = useState<number>(() => getMasterBalance());
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>(() =>
    getAppPref(MIXER_APP_ID, 'columns', DEFAULT_COLUMNS),
  );

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [propsDraft, setPropsDraft] = useState<Record<ColumnKey, boolean> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the Options dropdown on an outside click.
  useEffect(() => {
    if (!optionsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOptionsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [optionsOpen]);

  const persistChannels = useCallback(
    (next: Record<SoundChannel, Strip>) => setAppPref(MIXER_APP_ID, 'channels', next),
    [setAppPref],
  );

  const updateChannel = useCallback(
    (ch: SoundChannel, patch: Partial<Strip>) => {
      setChannels((prev) => {
        const next = { ...prev, [ch]: { ...prev[ch], ...patch } };
        persistChannels(next);
        return next;
      });
    },
    [persistChannels],
  );

  const channelVolume = useCallback(
    (ch: SoundChannel, v: number) => {
      setChannelVolume(ch, v);
      updateChannel(ch, { volume: v });
    },
    [updateChannel],
  );
  const channelMute = useCallback(
    (ch: SoundChannel, m: boolean) => {
      setChannelMuted(ch, m);
      updateChannel(ch, { muted: m });
    },
    [updateChannel],
  );
  const channelBalance = useCallback(
    (ch: SoundChannel, b: number) => {
      setChannelBalance(ch, b);
      updateChannel(ch, { balance: b });
    },
    [updateChannel],
  );

  const masterBalance = useCallback(
    (b: number) => {
      setMasterBalance(b);
      setMasterBal(b);
      setAppPref(MIXER_APP_ID, 'masterBalance', b);
    },
    [setAppPref],
  );

  const master: Strip = { volume: settings.volume, muted: !settings.soundsEnabled, balance: masterBal };

  const shownColumns = ALL_COLUMNS.filter((c) => visible[c]);

  const openProperties = useCallback(() => {
    setOptionsOpen(false);
    setPropsDraft({ ...visible });
  }, [visible]);

  const applyProperties = useCallback(() => {
    if (!propsDraft) return;
    // Never let every column vanish — keep master as a floor.
    const next = ALL_COLUMNS.some((c) => propsDraft[c]) ? propsDraft : { ...propsDraft, master: true };
    setVisible(next);
    setAppPref(MIXER_APP_ID, 'columns', next);
    setPropsDraft(null);
  }, [propsDraft, setAppPref]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Menu bar */}
      <div className="flex gap-4 px-2 py-[2px] border-b border-[var(--win98-button-shadow)] relative" ref={menuRef}>
        <span
          className="cursor-default hover:bg-[var(--win98-titlebar-active-start)] hover:text-white px-1"
          onClick={() => setOptionsOpen((o) => !o)}
        >
          <u>O</u>ptions
        </span>
        <span className="cursor-default"><u>H</u>elp</span>
        {optionsOpen && (
          <div className="absolute left-1 top-[18px] z-30 bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-md min-w-[130px]">
            <div onClick={openProperties} className="px-4 py-[2px] hover:bg-[var(--win98-titlebar-active-start)] hover:text-white cursor-default">
              Properties...
            </div>
            <div className="mx-1 my-[2px] border-t border-[var(--win98-button-shadow)]" />
            <div onClick={() => setOptionsOpen(false)} className="px-4 py-[2px] hover:bg-[var(--win98-titlebar-active-start)] hover:text-white cursor-default">
              Exit
            </div>
          </div>
        )}
      </div>

      {/* Mixer strips */}
      <div className="flex-1 flex items-stretch justify-center p-1 overflow-hidden">
        {shownColumns.map((col, i) =>
          col === 'master' ? (
            <MixerColumn
              key="master"
              label={COLUMN_LABELS.master}
              strip={master}
              onVolume={(v) => setSetting('volume', v)}
              onMute={(m) => setSetting('soundsEnabled', !m)}
              onBalance={masterBalance}
              last={i === shownColumns.length - 1}
            />
          ) : (
            <MixerColumn
              key={col}
              label={COLUMN_LABELS[col]}
              strip={channels[col]}
              onVolume={(v) => channelVolume(col, v)}
              onMute={(m) => channelMute(col, m)}
              onBalance={(b) => channelBalance(col, b)}
              last={i === shownColumns.length - 1}
            />
          ),
        )}
      </div>
      <div className="px-2 pb-1 text-[var(--win98-disabled-text)] select-none">SB16 Mixer [220]</div>

      {/* Properties: pick which columns are shown */}
      {propsDraft && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/20">
          <Dialog98
            title="Properties"
            message={
              <div className="flex flex-col gap-1 min-w-[180px]">
                <span className="mb-1">Show the following volume controls:</span>
                {ALL_COLUMNS.map((c) => (
                  <label key={c} className="flex items-center gap-2 select-none">
                    <input
                      type="checkbox"
                      checked={propsDraft[c]}
                      onChange={(e) => setPropsDraft((d) => (d ? { ...d, [c]: e.target.checked } : d))}
                    />
                    {COLUMN_LABELS[c]}
                  </label>
                ))}
              </div>
            }
            buttons={[
              { label: 'OK', onClick: applyProperties, default: true },
              { label: 'Cancel', onClick: () => setPropsDraft(null) },
            ]}
          />
        </div>
      )}
    </div>
  );
}
