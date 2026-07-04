'use client';

import { useReducer, useEffect, useRef, useState, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { Dialog98 } from '@/components/ui/Dialog98';
import { cn } from '@/lib/cn';
import { CdAudio } from './CdAudio';
import {
  CD_TRACKS,
  CD_TRACK_COUNT,
  CD_DISC_TITLE,
  CD_DISC_ARTIST,
  INITIAL_CD_STATE,
  INTRO_SECONDS,
  cdReducer,
  cdTotalDurationSec,
  formatCdTime,
  CdState,
  CdAction,
} from './cdLogic';

type TimeMode = 'elapsed' | 'trackRemaining' | 'discRemaining';
type DialogKind = 'playlist' | 'about' | 'prefs';

// Sum of the nominal durations of every track after the current one.
function discRemaining(trackIndex: number, elapsed: number): number {
  const currentDur = CD_TRACKS[trackIndex]?.durationSec ?? 0;
  const rest = CD_TRACKS.slice(trackIndex + 1).reduce((s, t) => s + t.durationSec, 0);
  return Math.max(0, rest + Math.max(0, currentDur - elapsed));
}

export default function CDPlayer({ windowId }: AppComponentProps) {
  const { openWindow, closeWindow } = useWindows();
  const audioRef = useRef<CdAudio | null>(null);

  const [state, dispatch] = useReducer(
    (s: CdState, a: CdAction) => cdReducer(s, a, CD_TRACK_COUNT),
    INITIAL_CD_STATE,
  );
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeMode, setTimeMode] = useState<TimeMode>('elapsed');
  const [showToolbar, setShowToolbar] = useState(true);
  const [showStatus, setShowStatus] = useState(true);
  const [dialog, setDialog] = useState<DialogKind | null>(null);

  // Freshest state for the mount-once audio callbacks (Intro cutoff, auto-next).
  const stateRef = useRef(state);
  stateRef.current = state;

  const disc = state.status !== 'empty';
  const cur = CD_TRACKS[state.track];

  // Build the engine once. Intro Play trims each track to INTRO_SECONDS by
  // forcing an early advance; a real track end fires ENDED the same way.
  useEffect(() => {
    const eng = new CdAudio();
    audioRef.current = eng;
    eng.onTimeUpdate = (current, dur) => {
      const st = stateRef.current;
      if (st.mode.intro && st.status === 'playing' && current >= INTRO_SECONDS) {
        dispatch({ type: 'ENDED' });
        return;
      }
      setElapsed(current);
      if (dur && Number.isFinite(dur)) setDuration(dur);
    };
    eng.onEnded = () => dispatch({ type: 'ENDED' });
    return () => {
      eng.destroy();
      audioRef.current = null;
    };
  }, []);

  // Load whenever the selected track changes, keeping playback going if it was.
  useEffect(() => {
    const eng = audioRef.current;
    if (!eng || !disc) return;
    eng.load(CD_TRACKS[state.track].track.src);
    setElapsed(0);
    setDuration(0);
    if (stateRef.current.status === 'playing') eng.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.track]);

  // Drive the engine from the transport status.
  useEffect(() => {
    const eng = audioRef.current;
    if (!eng) return;
    if (state.status === 'playing') eng.play();
    else if (state.status === 'paused') eng.pause();
    else eng.stop();
    if (state.status === 'stopped' || state.status === 'empty') setElapsed(0);
  }, [state.status]);

  const trackDur = duration || cur?.durationSec || 0;
  let shownTime = elapsed;
  if (timeMode === 'trackRemaining') shownTime = Math.max(0, trackDur - elapsed);
  else if (timeMode === 'discRemaining') shownTime = discRemaining(state.track, elapsed);

  const seek = useCallback((v: number) => {
    setElapsed(v);
    audioRef.current?.seek(v);
  }, []);

  const menus: MenuDefinition[] = [
    {
      label: '&Disc',
      items: [
        { label: '&Edit Play List...', onClick: () => setDialog('playlist') },
        { label: '', separator: true },
        { label: 'E&xit', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Toolbar', checked: showToolbar, onClick: () => setShowToolbar((s) => !s) },
        { label: 'Status &Bar', checked: showStatus, onClick: () => setShowStatus((s) => !s) },
        { label: '', separator: true },
        { label: 'Track Time &Elapsed', radio: true, checked: timeMode === 'elapsed', onClick: () => setTimeMode('elapsed') },
        { label: 'Track Time &Remaining', radio: true, checked: timeMode === 'trackRemaining', onClick: () => setTimeMode('trackRemaining') },
        { label: '&Disc Time Remaining', radio: true, checked: timeMode === 'discRemaining', onClick: () => setTimeMode('discRemaining') },
        { label: '', separator: true },
        { label: '&Volume Control', onClick: () => openWindow('volume-control') },
      ],
    },
    {
      label: '&Options',
      items: [
        { label: '&Random Order', checked: state.mode.random, onClick: () => dispatch({ type: 'TOGGLE_RANDOM' }) },
        { label: '&Continuous Play', checked: state.mode.continuous, onClick: () => dispatch({ type: 'TOGGLE_CONTINUOUS' }) },
        { label: '&Intro Play', checked: state.mode.intro, onClick: () => dispatch({ type: 'TOGGLE_INTRO' }) },
        { label: '', separator: true },
        { label: '&Preferences...', onClick: () => setDialog('prefs') },
      ],
    },
    {
      label: '&Help',
      items: [{ label: '&About CD Player', onClick: () => setDialog('about') }],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none">
      <MenuBar menus={menus} windowId={windowId} />

      {/* LED display */}
      <div className="mx-2 mt-2 mb-1 p-2 bg-black border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
        <div className="flex items-end justify-between">
          <div className="relative font-mono leading-none">
            {/* Unlit ghost segments behind the live readout */}
            <span className="text-[34px] tracking-[0.12em] text-[#0a3d1a]">88:88</span>
            <span
              className="absolute inset-0 text-[34px] tracking-[0.12em] text-[#28ff6a]"
              style={{ textShadow: '0 0 6px rgba(40,255,106,0.7)' }}
            >
              {disc ? formatCdTime(shownTime) : '--:--'}
            </span>
          </div>
          <div className="text-right text-[#28ff6a] font-mono" style={{ textShadow: '0 0 5px rgba(40,255,106,0.6)' }}>
            <div className="text-[16px] leading-none">
              {disc ? `Track ${String(cur.number).padStart(2, '0')}` : 'No Disc'}
            </div>
            <div className="text-[9px] leading-tight text-[#1ea653] mt-1">
              {disc ? `of ${CD_TRACK_COUNT}` : 'Data or no disc'}
            </div>
            <div className="flex gap-2 justify-end mt-1 text-[8px]">
              <span className={state.mode.random ? 'text-[#28ff6a]' : 'text-[#0f5c2c]'}>RANDOM</span>
              <span className={state.mode.continuous ? 'text-[#28ff6a]' : 'text-[#0f5c2c]'}>CONT</span>
              <span className={state.mode.intro ? 'text-[#28ff6a]' : 'text-[#0f5c2c]'}>INTRO</span>
            </div>
          </div>
        </div>

        {/* Seek bar inside the display */}
        <input
          type="range"
          min={0}
          max={trackDur || 1}
          step={0.1}
          value={Math.min(elapsed, trackDur || 1)}
          onChange={(e) => seek(Number(e.target.value))}
          disabled={!disc}
          className="w-full h-[8px] mt-2 cursor-pointer"
          style={{ accentColor: '#28ff6a' }}
          aria-label="Seek"
        />
      </div>

      {/* Transport toolbar */}
      {showToolbar && (
        <div className="flex items-center gap-[2px] px-2 py-1">
          <TransportButton title="Previous Track" onClick={() => dispatch({ type: 'PREV' })} disabled={!disc}>⏮</TransportButton>
          <TransportButton title="Play" onClick={() => dispatch({ type: 'PLAY' })} disabled={!disc} active={state.status === 'playing'}>▶</TransportButton>
          <TransportButton title="Pause" onClick={() => dispatch({ type: 'PAUSE' })} disabled={!disc} active={state.status === 'paused'}>⏸</TransportButton>
          <TransportButton title="Stop" onClick={() => dispatch({ type: 'STOP' })} disabled={!disc}>⏹</TransportButton>
          <TransportButton title="Next Track" onClick={() => dispatch({ type: 'NEXT' })} disabled={!disc}>⏭</TransportButton>
          <TransportButton title="Eject" onClick={() => dispatch({ type: 'EJECT' })}>⏏</TransportButton>

          <div className="w-px h-5 bg-[var(--win98-button-shadow)] mx-1" />

          <TransportButton title="Random Order" onClick={() => dispatch({ type: 'TOGGLE_RANDOM' })} active={state.mode.random}>🔀</TransportButton>
          <TransportButton title="Continuous Play" onClick={() => dispatch({ type: 'TOGGLE_CONTINUOUS' })} active={state.mode.continuous}>🔁</TransportButton>
          <TransportButton title="Intro Play" onClick={() => dispatch({ type: 'TOGGLE_INTRO' })} active={state.mode.intro}>⏱</TransportButton>
        </div>
      )}

      {/* Track selector + artist / title */}
      <div className="px-2 pb-1 space-y-[3px]">
        <div className="flex items-center gap-2">
          <label className="w-[42px] text-right text-[var(--win98-disabled-text)]" htmlFor={`cd-track-${windowId}`}>Track:</label>
          <select
            id={`cd-track-${windowId}`}
            value={disc ? state.track : ''}
            disabled={!disc}
            onChange={(e) => dispatch({ type: 'SELECT', index: Number(e.target.value) })}
            className="flex-1 h-[19px] bg-white border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] text-[11px]"
          >
            {disc ? (
              CD_TRACKS.map((t, i) => (
                <option key={t.number} value={i}>
                  [{String(t.number).padStart(2, '0')}] {t.title} ({formatCdTime(t.durationSec)})
                </option>
              ))
            ) : (
              <option value="">(no audio disc)</option>
            )}
          </select>
        </div>
        <InfoRow label="Artist:" value={disc ? cur.artist : '<< No Disc >>'} />
        <InfoRow label="Title:" value={disc ? cur.title : ''} />
      </div>

      {/* Status bar */}
      {showStatus && (
        <div className="mt-auto flex items-center justify-between h-[20px] px-2 bg-[var(--win98-button-face)] border-t border-[var(--win98-button-highlight)] text-[var(--win98-disabled-text)]">
          <span>{CD_DISC_TITLE}</span>
          <span>
            {disc
              ? `${CD_TRACK_COUNT} tracks · ${formatCdTime(cdTotalDurationSec())}`
              : 'Please insert an audio compact disc.'}
          </span>
        </div>
      )}

      {dialog && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/10">
          {dialog === 'playlist' && (
            <Dialog98
              title={`Disc Settings: ${CD_DISC_TITLE}`}
              message={
                <div className="w-[320px]">
                  <div className="flex py-[2px]"><span className="w-[60px] text-[var(--win98-disabled-text)]">Artist:</span><span>{CD_DISC_ARTIST}</span></div>
                  <div className="flex py-[2px]"><span className="w-[60px] text-[var(--win98-disabled-text)]">Title:</span><span>{CD_DISC_TITLE}</span></div>
                  <div className="my-2 border-t border-[var(--win98-button-shadow)]" />
                  <div className="max-h-[120px] overflow-auto bg-white border border-solid border-[var(--win98-button-shadow)] p-1">
                    {CD_TRACKS.map((t) => (
                      <div key={t.number} className="flex justify-between px-1 py-[1px]">
                        <span className="truncate">[{String(t.number).padStart(2, '0')}] {t.title}</span>
                        <span className="text-[var(--win98-disabled-text)] ml-2">{formatCdTime(t.durationSec)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-[var(--win98-disabled-text)]">
                    Track names could not be downloaded. Connect to the Internet and try again, or type them in yourself. (It is 1998. Maybe just type them in.)
                  </p>
                </div>
              }
              buttons={[{ label: 'OK', default: true, onClick: () => setDialog(null) }, { label: 'Cancel', onClick: () => setDialog(null) }]}
              className="shadow-lg"
            />
          )}
          {dialog === 'prefs' && (
            <Dialog98
              title="Preferences"
              icon="info"
              message={
                <div className="w-[280px] space-y-1">
                  <div className="flex justify-between"><span>CD-ROM drive:</span><span>[D:] ATAPI CD-ROM 52X</span></div>
                  <div className="flex justify-between"><span>Intro play length:</span><span>{INTRO_SECONDS} seconds</span></div>
                  <div className="flex justify-between"><span>Track names from:</span><span>Local (no CDDB)</span></div>
                </div>
              }
              buttons={[{ label: 'OK', default: true, onClick: () => setDialog(null) }]}
              className="shadow-lg"
            />
          )}
          {dialog === 'about' && (
            <Dialog98
              title="About CD Player"
              icon="info"
              message={
                <div className="space-y-1">
                  <p className="font-bold">CD Player</p>
                  <p>Microsoft (R) CD Player</p>
                  <p>Version 4.10.1998</p>
                  <p>Copyright (C) 1998 Microsoft Corp.</p>
                </div>
              }
              buttons={[{ label: 'OK', default: true, onClick: () => setDialog(null) }]}
              className="shadow-lg"
            />
          )}
        </div>
      )}
    </div>
  );
}

function TransportButton({
  onClick,
  title,
  disabled,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        'w-[28px] h-[24px] flex items-center justify-center text-[12px] cursor-default',
        'bg-[var(--win98-button-face)] border-2 border-solid',
        active
          ? 'border-t-[var(--win98-button-dark-shadow)] border-l-[var(--win98-button-dark-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]'
          : 'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
        'active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
        'disabled:text-[var(--win98-disabled-text)]',
      )}
    >
      {children}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[42px] text-right text-[var(--win98-disabled-text)]">{label}</span>
      <span className="flex-1 h-[19px] px-1 flex items-center bg-white border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] truncate">
        {value}
      </span>
    </div>
  );
}
