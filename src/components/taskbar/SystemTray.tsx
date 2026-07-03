'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useSettings } from '@/contexts/SettingsContext';
import { useWindows } from '@/contexts/WindowContext';
import { playSound } from '@/lib/sounds';
import { emit, on } from '@/lib/eventBus';

interface TrayIcon {
  id: string;
  icon: string;
  tooltip?: string;
}

function VolumePopup({ onClose }: { onClose: () => void }) {
  const { settings, setSetting } = useSettings();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={cn(
        'absolute bottom-full right-0 mb-1 p-2 w-[70px]',
        'bg-[var(--win98-button-face)]',
        'border-2 border-solid',
        'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
        'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
        'flex flex-col items-center gap-2',
      )}
    >
      <span className="select-none">Volume</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(settings.volume * 100)}
        onChange={(e) => setSetting('volume', Number(e.target.value) / 100)}
        onMouseUp={() => playSound('ding')}
        className="h-[70px] accent-[var(--win98-highlight)]"
        style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
        aria-label="Volume"
      />
      <label className="flex items-center gap-1 select-none">
        <input
          type="checkbox"
          checked={!settings.soundsEnabled}
          onChange={(e) => setSetting('soundsEnabled', !e.target.checked)}
        />
        Mute
      </label>
    </div>
  );
}

function DateTimeDialog({ onClose }: { onClose: () => void }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9100] flex items-center justify-center" onClick={onClose}>
      <div
        className={cn(
          'bg-[var(--win98-button-face)] w-[300px]',
          'border-2 border-solid',
          'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
          'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
          'font-[family-name:var(--win98-font)] text-[11px]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white font-bold select-none">
          <span className="flex-1">Date/Time Properties</span>
          <button
            onClick={onClose}
            className="w-[16px] h-[14px] flex items-center justify-center bg-[var(--win98-button-face)] text-black text-[9px] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4 flex flex-col items-center gap-2">
          <div className="text-[24px] font-bold tabular-nums">
            {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div>{now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div className="text-[var(--win98-disabled-text)] select-none mt-2">
            Time Zone: (GMT-08:00) Pacific Time (US &amp; Canada)
          </div>
        </div>
      </div>
    </div>
  );
}

export function SystemTray() {
  const [time, setTime] = useState('');
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [dateTimeOpen, setDateTimeOpen] = useState(false);
  const [trayIcons, setTrayIcons] = useState<TrayIcon[]>([]);
  const [networkActive, setNetworkActive] = useState(false);
  const { openWindow } = useWindows();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Apps register/unregister their own tray icons over the event bus. Icons are
  // deduped by id (a re-register updates the existing icon in place).
  useEffect(() => {
    const offRegister = on('tray-register', ({ id, icon, tooltip }) => {
      setTrayIcons((prev) =>
        prev.some((t) => t.id === id)
          ? prev.map((t) => (t.id === id ? { id, icon, tooltip } : t))
          : [...prev, { id, icon, tooltip }],
      );
    });
    const offUnregister = on('tray-unregister', ({ id }) => {
      setTrayIcons((prev) => prev.filter((t) => t.id !== id));
    });
    return () => {
      offRegister();
      offUnregister();
    };
  }, []);

  // Default activation: clicking a dynamic tray icon opens the window whose id
  // matches. Apps wanting custom behavior can also listen for 'tray-activate'.
  useEffect(() => on('tray-activate', ({ id }) => openWindow(id)), [openWindow]);

  // Fake dial-up traffic: flash the little monitors at random intervals.
  useEffect(() => {
    let blinkTimer: ReturnType<typeof setTimeout>;
    let offTimer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      blinkTimer = setTimeout(() => {
        setNetworkActive(true);
        offTimer = setTimeout(() => setNetworkActive(false), 500);
        schedule();
      }, 8000 + Math.random() * 12000);
    };
    schedule();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(offTimer);
    };
  }, []);

  return (
    <div
      className={cn(
        'relative flex items-center gap-[4px] h-[22px] px-[6px] flex-shrink-0',
        'border border-solid',
        'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
        'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
      )}
    >
      <style>{`@keyframes win98-tray-blink{0%,100%{opacity:1}25%{opacity:.25}50%{opacity:1}75%{opacity:.25}}.win98-tray-blink{animation:win98-tray-blink .5s steps(1,end)}`}</style>

      {/* Dynamic app icons (AIM presence, Norton shield, ...) */}
      {trayIcons.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={t.id}
          src={t.icon}
          alt={t.tooltip || t.id}
          className="w-4 h-4 cursor-pointer"
          style={{ imageRendering: 'pixelated' }}
          onClick={() => emit('tray-activate', { id: t.id })}
          title={t.tooltip || t.id}
        />
      ))}

      {/* Static network (dial-up) icon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/network-16.svg"
        alt="Network"
        className={cn('w-4 h-4 cursor-pointer', networkActive && 'win98-tray-blink')}
        style={{ imageRendering: 'pixelated' }}
        onDoubleClick={() => openWindow('network-neighborhood')}
        title="Dial-Up Networking"
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/volume-16.svg"
        alt="Volume"
        className="w-4 h-4 cursor-pointer"
        style={{ imageRendering: 'pixelated' }}
        onClick={() => setVolumeOpen((open) => !open)}
        onDoubleClick={() => {
          setVolumeOpen(false);
          openWindow('volume-control');
        }}
        title="Volume"
      />
      <span
        className="select-none cursor-default"
        onDoubleClick={() => setDateTimeOpen(true)}
      >
        {time}
      </span>

      {volumeOpen && <VolumePopup onClose={() => setVolumeOpen(false)} />}
      {dateTimeOpen && <DateTimeDialog onClose={() => setDateTimeOpen(false)} />}
    </div>
  );
}
