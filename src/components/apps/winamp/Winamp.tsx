'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { MusicPlayer, EQ_PRESETS } from '@/lib/audio/player';
import { MusicTrack, musicTracks } from '@/lib/audio/tracks';
import {
  RepeatMode,
  autoNext,
  manualStep,
  formatTime,
  totalDuration,
  playlistForLaunch,
  trackFromFile,
} from '@/lib/audio/playlist';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { getSoundsMuted, getMasterVolume } from '@/lib/sounds';

const APP_ID = 'winamp';

// The classic spoken intro, played once each time Winamp is opened.
const INTRO_SRC = '/music/winamp-intro.mp3';

// Intrinsic skin width. The chrome was drawn to fill this exactly, so the
// window is fitted to it rather than the reverse — that's what keeps the
// classic fixed-size look with no grey dead space around it.
const BASE_WIDTH = 271;

const EQ_BANDS = ['60', '170', '310', '600', '1K', '3K', '6K', '12K', '14K', '16K'];

// Classic skins as CSS-variable themes. `hot`/`peak` drive the spectrum canvas
// (which can't read Tailwind classes), the rest paint the chrome.
type SkinKey = 'base' | 'winter' | 'bento';
interface Skin {
  chrome: string;
  display: string;
  accent: string;
  accentDim: string;
  muted: string;
  btn: string;
  btnBorder: string;
  list: string;
  hot: string;
  peak: string;
}
const SKINS: Record<SkinKey, Skin> = {
  base: {
    chrome: '#232323', display: '#000000', accent: '#00ff00', accentDim: '#00aa00',
    muted: '#888888', btn: '#3a3a3a', btnBorder: '#555555', list: '#1a1a2e', hot: '#ff0000', peak: '#cccccc',
  },
  winter: {
    chrome: '#2b3540', display: '#0a141c', accent: '#a8d8ff', accentDim: '#5f9dc7',
    muted: '#7d93a6', btn: '#3a4652', btnBorder: '#56646f', list: '#1a2430', hot: '#e6f4ff', peak: '#d0e6f5',
  },
  bento: {
    chrome: '#3a2c14', display: '#180f04', accent: '#ffb43c', accentDim: '#b87f22',
    muted: '#a08050', btn: '#4a3820', btnBorder: '#6a5330', list: '#241a0c', hot: '#ffe08a', peak: '#ffd27f',
  },
};
const SKIN_LABELS: Record<SkinKey, string> = { base: 'Base', winter: 'Winter', bento: 'Bento' };

export default function Winamp({ windowId, launchParams, launchCount }: AppComponentProps) {
  const playerRef = useRef<MusicPlayer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { readFile } = useFileSystem();
  const { resizeWindow } = useWindows();

  // Reads a launched file's FS content so playlistForLaunch can honor a
  // 'track:<id>' reference; missing files fall back to filename matching.
  const readContent = useCallback((fp?: string) => (fp ? readFile(fp) : null), [readFile]);

  const initial = useRef(playlistForLaunch(launchParams?.filePath, readContent(launchParams?.filePath)));
  const [playlist, setPlaylist] = useState<MusicTrack[]>(initial.current.list);
  const [index, setIndex] = useState(initial.current.index);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [volume, setVolume] = useState(80); // 0..100
  const [balance, setBalance] = useState(50); // 0..100, maps to pan -1..1
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showEq, setShowEq] = useState(false);
  const [eq, setEq] = useState<number[]>(EQ_PRESETS.Flat);
  const [preamp, setPreamp] = useState(0);
  const [eqOn, setEqOn] = useState(false);
  const [eqAuto, setEqAuto] = useState(false);
  const [skin, setSkin] = useState<SkinKey>('base');
  const [doubleSize, setDoubleSize] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Play the spoken intro once when Winamp opens. Launching is always driven by
  // a click (desktop icon, Start menu, Run), so the browser lets it autoplay;
  // a singleton relaunch just refocuses the window without remounting, so it
  // won't nag on every click. Honors the global mute + volume.
  useEffect(() => {
    if (getSoundsMuted()) return;
    const intro = new Audio(INTRO_SRC);
    intro.volume = getMasterVolume();
    intro.play().catch(() => {});
    return () => {
      intro.pause();
      intro.src = '';
    };
  }, []);

  const track = playlist[index] ?? musicTracks[0];
  const titleText = `${index + 1}. ${track.artist} - ${track.title}  ***  `;

  const skinColors = SKINS[skin];
  // The canvas render loop is set up once, so it reads the live skin via a ref.
  const skinRef = useRef(skinColors);
  skinRef.current = skinColors;

  // Mirror volatile state into a ref so player callbacks read fresh values.
  const nav = useRef({ index, shuffle, repeat, length: playlist.length, playing });
  nav.current = { index, shuffle, repeat, length: playlist.length, playing };

  // Load a track into the engine, optionally starting playback.
  const loadTrack = useCallback((i: number, autoplay: boolean) => {
    const p = playerRef.current;
    const t = playlist[i];
    if (!p || !t) return;
    p.load(t);
    setElapsed(0);
    if (autoplay) {
      p.play();
      setPlaying(true);
    }
  }, [playlist]);

  // Create the engine once, restoring persisted prefs into it.
  useEffect(() => {
    const p = new MusicPlayer();
    playerRef.current = p;

    let storedVol = 80;
    let storedBal = 50;
    let storedShuffle = false;
    let storedRepeat: RepeatMode = 'off';
    let storedEq = EQ_PRESETS.Flat;
    let storedPreamp = 0;
    let storedEqOn = false;
    let storedEqAuto = false;
    let storedSkin: SkinKey = 'base';
    let storedDouble = false;
    try {
      const raw = window.localStorage.getItem('win98-prefs-v1');
      if (raw) {
        const prefs = JSON.parse(raw)?.[APP_ID];
        if (prefs) {
          if (typeof prefs.volume === 'number') storedVol = Math.round(prefs.volume * 100);
          if (typeof prefs.balance === 'number') storedBal = prefs.balance;
          if (typeof prefs.shuffle === 'boolean') storedShuffle = prefs.shuffle;
          if (prefs.repeat === 'off' || prefs.repeat === 'all' || prefs.repeat === 'one') storedRepeat = prefs.repeat;
          if (Array.isArray(prefs.eq) && prefs.eq.length === EQ_BANDS.length) storedEq = prefs.eq;
          if (typeof prefs.preamp === 'number') storedPreamp = prefs.preamp;
          if (typeof prefs.eqOn === 'boolean') storedEqOn = prefs.eqOn;
          if (typeof prefs.eqAuto === 'boolean') storedEqAuto = prefs.eqAuto;
          if (prefs.skin === 'base' || prefs.skin === 'winter' || prefs.skin === 'bento') storedSkin = prefs.skin;
          if (typeof prefs.doubleSize === 'boolean') storedDouble = prefs.doubleSize;
        }
      }
    } catch {
      // no prefs — fine
    }
    setVolume(storedVol);
    setBalance(storedBal);
    setShuffle(storedShuffle);
    setRepeat(storedRepeat);
    setEq(storedEq);
    setPreamp(storedPreamp);
    setEqOn(storedEqOn);
    setEqAuto(storedEqAuto);
    setSkin(storedSkin);
    setDoubleSize(storedDouble);

    p.setVolume(storedVol / 100);
    p.setBalance((storedBal - 50) / 50);
    p.setEqGains(storedEq);
    p.setPreamp(storedPreamp);
    p.setEqEnabled(storedEqOn);

    p.onTimeUpdate = (current, dur) => {
      setElapsed(current);
      if (dur && Number.isFinite(dur)) {
        setDuration(dur);
        const cur = playlist[nav.current.index];
        if (cur) setDurations((prev) => (prev[cur.id] === dur ? prev : { ...prev, [cur.id]: dur }));
      }
    };
    p.onEnded = () => {
      const { index: i, length, repeat: r, shuffle: s } = nav.current;
      const next = autoNext(i, length, r, s);
      if (next === null) {
        setPlaying(false);
        setElapsed(0);
      } else {
        setIndex(next);
      }
    };

    p.load(playlist[initial.current.index]);

    return () => {
      p.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Honor re-launches (Open on an already-running singleton bumps launchCount).
  useEffect(() => {
    if (launchCount === undefined) return;
    const { list, index: i } = playlistForLaunch(launchParams?.filePath, readContent(launchParams?.filePath));
    setPlaylist(list);
    setIndex(i);
    // load happens via the index effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  // When the selected track changes, load it (and keep playing if we were).
  const prevIndexRef = useRef(index);
  useEffect(() => {
    if (prevIndexRef.current === index) return;
    prevIndexRef.current = index;
    loadTrack(index, nav.current.playing);
  }, [index, loadTrack]);

  // Persist prefs (mirrors SettingsContext's storage shape).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('win98-prefs-v1');
      const all = raw ? JSON.parse(raw) : {};
      all[APP_ID] = {
        ...all[APP_ID],
        volume: volume / 100,
        balance,
        shuffle,
        repeat,
        eq,
        preamp,
        eqOn,
        eqAuto,
        skin,
        doubleSize,
      };
      window.localStorage.setItem('win98-prefs-v1', JSON.stringify(all));
    } catch {
      // storage unavailable — non-fatal
    }
  }, [volume, balance, shuffle, repeat, eq, preamp, eqOn, eqAuto, skin, doubleSize]);

  // Ctrl+D toggles double size while the player holds focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey && (e.key === 'd' || e.key === 'D'))) return;
      if (!rootRef.current?.contains(document.activeElement)) return;
      e.preventDefault();
      setDoubleSize((d) => !d);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Shrink the host window to the exact skin size. The skin is a fixed-width
  // column of variable height (the EQ and playlist panes come and go), and
  // double-size scales the whole thing 2x — so the window has to follow the
  // content or it leaves a grey band below (or clips the doubled skin).
  const fitWindow = useCallback(() => {
    const el = rootRef.current;
    const content = el?.parentElement; // window content area (flex-1, overflow-hidden)
    const win = content?.parentElement; // window frame (title bar + borders + content)
    if (!el || !content || !win) return;
    const scale = doubleSize ? 2 : 1;
    // Chrome = title bar + borders; it's the gap between the frame and its content.
    const chromeX = win.offsetWidth - content.offsetWidth;
    const chromeY = win.offsetHeight - content.offsetHeight;
    const width = Math.round(BASE_WIDTH * scale + chromeX);
    const height = Math.round(el.offsetHeight * scale + chromeY);
    resizeWindow(windowId, width, height);
  }, [doubleSize, windowId, resizeWindow]);

  // Keep fitWindow current for the observer without re-subscribing it.
  const fitRef = useRef(fitWindow);
  fitRef.current = fitWindow;

  // Refit whenever the skin's natural height changes (EQ/playlist toggles,
  // playlist edits) and once on mount.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      fitRef.current();
      return;
    }
    const ro = new ResizeObserver(() => fitRef.current());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Double-size is a transform, so it doesn't move the observed box — refit here.
  useLayoutEffect(() => {
    fitRef.current();
  }, [doubleSize]);

  // Title marquee.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setScrollOffset((p) => (p + 2) % (titleText.length * 7)), 120);
    return () => clearInterval(id);
  }, [playing, titleText]);

  // Spectrum analyzer with peak caps.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bins = new Uint8Array(128);
    const barCount = 20;
    const peaks = new Array(barCount).fill(0);
    let raf = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const sk = skinRef.current;
      ctx.fillStyle = sk.display;
      ctx.fillRect(0, 0, w, h);
      const p = playerRef.current;
      const haveData = p?.getFrequencyData(bins) ?? false;
      const bw = w / barCount;
      for (let i = 0; i < barCount; i++) {
        let mag: number;
        if (haveData) {
          mag = bins[Math.floor((i / barCount) * bins.length)] / 255;
        } else {
          mag = nav.current.playing ? Math.random() * 0.6 + 0.1 : 0;
        }
        const bh = mag * h;
        // Accent -> hot gradient by height.
        const grad = ctx.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, sk.accent);
        grad.addColorStop(1, sk.hot);
        ctx.fillStyle = grad;
        ctx.fillRect(i * bw, h - bh, bw - 1, bh);
        // Peak cap
        peaks[i] = Math.max(peaks[i] - 1.5, bh);
        ctx.fillStyle = sk.peak;
        ctx.fillRect(i * bw, Math.max(0, h - peaks[i] - 2), bw - 1, 2);
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  const applyVolume = useCallback((v: number) => {
    setVolume(v);
    playerRef.current?.setVolume(v / 100);
  }, []);

  const applyBalance = useCallback((v: number) => {
    setBalance(v);
    playerRef.current?.setBalance((v - 50) / 50);
  }, []);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (nav.current.playing) {
      p.pause();
      setPlaying(false);
    } else {
      p.play();
      setPlaying(true);
    }
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stop();
    setPlaying(false);
    setElapsed(0);
  }, []);

  const step = useCallback((dir: 1 | -1) => {
    const { index: i, length, shuffle: s } = nav.current;
    setIndex(manualStep(i, length, dir, s));
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, []);

  const removeTrack = useCallback((i: number) => {
    setPlaylist((list) => {
      if (list.length <= 1) return list;
      const next = list.filter((_, idx) => idx !== i);
      setIndex((cur) => (cur > i ? cur - 1 : Math.min(cur, next.length - 1)));
      return next;
    });
  }, []);

  const moveTrack = useCallback((i: number, dir: 1 | -1) => {
    setPlaylist((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      setIndex((cur) => (cur === i ? j : cur === j ? i : cur));
      return next;
    });
  }, []);

  // EQ controls, wired live into the player's filter chain.
  const applyPreamp = useCallback((v: number) => {
    setPreamp(v);
    playerRef.current?.setPreamp(v);
  }, []);

  const applyBand = useCallback((i: number, v: number) => {
    setEq((prev) => prev.map((x, idx) => (idx === i ? v : x)));
    playerRef.current?.setEqBand(i, v);
  }, []);

  const applyPreset = useCallback((name: string) => {
    const gains = EQ_PRESETS[name];
    setEq(gains);
    playerRef.current?.setEqGains(gains);
  }, []);

  const toggleEqOn = useCallback(() => {
    setEqOn((on) => {
      const next = !on;
      playerRef.current?.setEqEnabled(next);
      return next;
    });
  }, []);

  const addFromFile = useCallback((path: string) => {
    setPicker(false);
    const entry = trackFromFile(path, readFile(path));
    setPlaylist((list) => [...list, entry]);
  }, [readFile]);

  const remaining = Math.max(0, (duration || durations[track.id] || 0) - elapsed);
  const seekMax = duration || durations[track.id] || 1;
  const listTotal = totalDuration(playlist.map((t) => durations[t.id]));

  const skinVars = {
    '--wa-chrome': skinColors.chrome,
    '--wa-display': skinColors.display,
    '--wa-accent': skinColors.accent,
    '--wa-accent-dim': skinColors.accentDim,
    '--wa-muted': skinColors.muted,
    '--wa-btn': skinColors.btn,
    '--wa-btn-border': skinColors.btnBorder,
    '--wa-list': skinColors.list,
  } as React.CSSProperties;

  return (
    <>
    <div
      ref={rootRef}
      className="flex flex-col select-none text-[11px]"
      style={{
        fontFamily: 'Arial, sans-serif',
        width: BASE_WIDTH,
        transformOrigin: 'top left',
        transform: doubleSize ? 'scale(2)' : undefined,
        ...skinVars,
      }}
    >
      <div className="bg-[var(--wa-chrome)] text-[color:var(--wa-accent)] p-[3px] relative">
        {/* Display */}
        <div className="bg-[var(--wa-display)] border border-[color:var(--wa-btn-border)] p-[4px] mb-[3px]">
          <div className="overflow-hidden h-[12px] text-[10px] font-bold tracking-wider mb-[4px]">
            <div className="whitespace-nowrap" style={{ transform: `translateX(-${scrollOffset}px)` }}>
              {titleText}{titleText}
            </div>
          </div>

          <div className="flex items-center gap-[6px]">
            <div className="text-[18px] font-bold font-mono min-w-[52px] text-[color:var(--wa-accent)]">
              {formatTime(elapsed)}
            </div>
            <canvas ref={canvasRef} width={152} height={24} className="flex-1 h-[24px] w-full" />
          </div>

          <div className="text-[8px] text-[color:var(--wa-accent-dim)] mt-[2px] flex justify-between">
            <span>{playing ? 'Playing' : 'Stopped'} · -{formatTime(remaining)}</span>
            <span>{track.kbps}kbps {track.khz}kHz stereo</span>
          </div>
        </div>

        {/* Seek */}
        <div className="mb-[3px] px-1">
          <input
            type="range"
            min={0}
            max={seekMax}
            step={0.1}
            value={Math.min(elapsed, seekMax)}
            onChange={(e) => {
              const v = Number(e.target.value);
              setElapsed(v);
              playerRef.current?.seek(v);
            }}
            className="w-full h-[6px] cursor-pointer"
            style={{ accentColor: skinColors.accent }}
            aria-label="Seek"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-[2px]">
          <div className="flex gap-[1px]">
            <WinampButton onClick={() => step(-1)} title="Previous">⏮</WinampButton>
            <WinampButton onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>{playing ? '⏸' : '▶'}</WinampButton>
            <WinampButton onClick={stop} title="Stop">⏹</WinampButton>
            <WinampButton onClick={() => step(1)} title="Next">⏭</WinampButton>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-[2px]">
              <span className="text-[7px] text-[color:var(--wa-muted)]">VOL</span>
              <input
                type="range" min={0} max={100} value={volume}
                onChange={(e) => applyVolume(Number(e.target.value))}
                className="w-[46px] h-[4px]" style={{ accentColor: skinColors.accent }} aria-label="Volume"
              />
            </div>
            <div className="flex items-center gap-[2px]">
              <span className="text-[7px] text-[color:var(--wa-muted)]">BAL</span>
              <input
                type="range" min={0} max={100} value={balance}
                onChange={(e) => applyBalance(Number(e.target.value))}
                className="w-[28px] h-[4px]" style={{ accentColor: skinColors.accent }} aria-label="Balance"
              />
            </div>
          </div>
        </div>

        {/* Mode toggles */}
        <div className="flex justify-between items-center mt-[3px]">
          <div className="flex gap-[2px]">
            <ModeButton active={shuffle} onClick={() => setShuffle((s) => !s)}>SHUFFLE</ModeButton>
            <ModeButton active={repeat !== 'off'} onClick={cycleRepeat}>
              REPEAT{repeat === 'one' ? ' 1' : ''}
            </ModeButton>
          </div>
          <div className="flex gap-[2px]">
            <ModeButton active={optionsOpen} onClick={() => setOptionsOpen((o) => !o)}>OPT</ModeButton>
            <ModeButton active={showEq} onClick={() => setShowEq((s) => !s)}>EQ</ModeButton>
            <ModeButton active={showPlaylist} onClick={() => setShowPlaylist((s) => !s)}>PL</ModeButton>
          </div>
        </div>

        {/* Options dropdown: skins + double size */}
        {optionsOpen && (
          <div className="absolute right-[3px] top-[100%] z-30 mt-[1px] bg-[var(--wa-chrome)] border border-[color:var(--wa-btn-border)] text-[color:var(--wa-accent)] text-[9px] min-w-[110px] p-1">
            <div className="text-[color:var(--wa-muted)] px-1 pb-[2px]">Skin</div>
            {(Object.keys(SKINS) as SkinKey[]).map((k) => (
              <div
                key={k}
                onClick={() => { setSkin(k); setOptionsOpen(false); }}
                className={`px-2 py-[1px] cursor-pointer hover:brightness-125 ${k === skin ? 'bg-[var(--wa-accent-dim)] text-black' : ''}`}
              >
                {k === skin ? '● ' : '○ '}{SKIN_LABELS[k]}
              </div>
            ))}
            <div className="my-1 border-t border-[color:var(--wa-btn-border)]" />
            <div
              onClick={() => { setDoubleSize((d) => !d); setOptionsOpen(false); }}
              className="px-2 py-[1px] cursor-pointer hover:brightness-125"
            >
              {doubleSize ? '☑' : '☐'} Double Size (Ctrl+D)
            </div>
            <div className="my-1 border-t border-[color:var(--wa-btn-border)]" />
            <div
              onClick={() => { setAboutOpen(true); setOptionsOpen(false); }}
              className="px-2 py-[1px] cursor-pointer hover:brightness-125"
            >
              About Winamp…
            </div>
          </div>
        )}
      </div>

      {/* Equalizer */}
      {showEq && (
        <div className="bg-[var(--wa-chrome)] border-t border-[color:var(--wa-btn-border)] p-2 text-[color:var(--wa-accent)]">
          <div className="flex gap-[2px] mb-2">
            <ModeButton active={eqOn} onClick={toggleEqOn}>ON</ModeButton>
            <ModeButton active={eqAuto} onClick={() => setEqAuto((a) => !a)}>AUTO</ModeButton>
          </div>
          <div className="flex items-end gap-[6px]">
            <div className="flex flex-col items-center">
              <input
                type="range" min={-12} max={12} value={preamp}
                onChange={(e) => applyPreamp(Number(e.target.value))}
                className="h-[48px] w-[10px]"
                style={{ writingMode: 'vertical-lr', direction: 'rtl', accentColor: skinColors.accent }}
                aria-label="Preamp"
              />
              <span className="text-[7px] mt-1 text-[color:var(--wa-muted)]">PRE</span>
            </div>
            <div className="w-px h-[52px] bg-[color:var(--wa-btn-border)]" />
            {EQ_BANDS.map((band, i) => (
              <div key={band} className="flex flex-col items-center">
                <input
                  type="range" min={-12} max={12} value={eq[i]}
                  onChange={(e) => applyBand(i, Number(e.target.value))}
                  className="h-[48px] w-[10px]"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl', accentColor: skinColors.accent }}
                  aria-label={`EQ ${band}`}
                />
                <span className="text-[7px] mt-1 text-[color:var(--wa-muted)]">{band}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-[2px] mt-2">
            {Object.keys(EQ_PRESETS).map((name) => (
              <ModeButton key={name} active={false} onClick={() => applyPreset(name)}>{name}</ModeButton>
            ))}
          </div>
        </div>
      )}

      {/* Playlist editor */}
      {showPlaylist && (
        <div className="bg-[var(--wa-list)] border-t border-[color:var(--wa-btn-border)]">
          <div className="max-h-[150px] overflow-auto">
            {playlist.map((s, i) => (
              <div
                key={`${s.id}-${i}`}
                className={`flex items-center px-2 py-[1px] text-[10px] cursor-pointer ${
                  i === index ? 'bg-[#000080] text-white' : 'text-[color:var(--wa-accent)] hover:brightness-125'
                }`}
                onDoubleClick={() => { setIndex(i); loadTrack(i, true); }}
              >
                <span className="w-[16px] text-right mr-1 text-[color:var(--wa-muted)]">{i + 1}.</span>
                <span className="flex-1 truncate">{s.artist} - {s.title}</span>
                <span className="text-[color:var(--wa-muted)] ml-1">{durations[s.id] ? formatTime(durations[s.id]) : '--:--'}</span>
                <span className="flex ml-1 gap-[1px]">
                  <MiniBtn onClick={(e) => { e.stopPropagation(); moveTrack(i, -1); }} title="Move up">▲</MiniBtn>
                  <MiniBtn onClick={(e) => { e.stopPropagation(); moveTrack(i, 1); }} title="Move down">▼</MiniBtn>
                  <MiniBtn onClick={(e) => { e.stopPropagation(); removeTrack(i); }} title="Remove">✕</MiniBtn>
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center px-2 py-[2px] text-[9px] text-[color:var(--wa-muted)] border-t border-[color:var(--wa-btn-border)]">
            <button
              onClick={() => setPicker(true)}
              className="px-2 py-[1px] bg-[var(--wa-btn)] border border-[color:var(--wa-btn-border)] text-[color:var(--wa-accent)] hover:brightness-125"
            >
              + ADD
            </button>
            <span>{playlist.length} tracks · {formatTime(listTotal)}</span>
          </div>
        </div>
      )}
    </div>

    {/* Kept outside the scaled skin so these overlays sit over the whole window
        at 1:1 instead of inheriting double-size's transform. */}
    {picker && (
      <FilePickerDialog
        mode="open"
        title="Add File"
        filters={[{ label: 'MP3 Files (*.mp3)', extensions: ['mp3'] }, { label: 'All Files (*.*)', extensions: [] }]}
        onConfirm={addFromFile}
        onCancel={() => setPicker(false)}
      />
    )}

    {aboutOpen && (
      <div
        className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/40 text-[11px]"
        style={{ fontFamily: 'Arial, sans-serif' }}
        onClick={() => setAboutOpen(false)}
      >
        <div
          className="m-1 max-h-full overflow-auto bg-[var(--win98-button-face)] text-black border-2 border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between bg-[#000080] text-white px-1 py-[1px] font-bold text-[10px]">
            <span>About Winamp</span>
            <button onClick={() => setAboutOpen(false)} className="px-1 leading-none" aria-label="Close">✕</button>
          </div>
          <div className="p-2 leading-snug space-y-[3px]">
            <div className="font-bold">Winamp</div>
            <div>It really whips the llama&rsquo;s ass.</div>
            <div className="pt-1 font-bold">Music credits</div>
            <div>Pixelland &middot; 8bit Dungeon Level &middot; Space Fighter Loop &middot; Cyborg Ninja</div>
            <div>Kevin MacLeod (incompetech.com)</div>
            <div>Licensed under Creative Commons: By Attribution 4.0</div>
            <div>creativecommons.org/licenses/by/4.0/</div>
            <div className="text-[10px] text-gray-700">All other tracks are original synthesized pieces.</div>
            <div className="pt-1 text-right">
              <button
                onClick={() => setAboutOpen(false)}
                className="px-3 py-[1px] bg-[var(--win98-button-face)] border-2 border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function WinampButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-[24px] h-[18px] bg-[var(--wa-btn)] border border-[color:var(--wa-btn-border)] text-[10px] text-[color:var(--wa-accent)] flex items-center justify-center cursor-pointer hover:brightness-125 active:brightness-90"
    >
      {children}
    </button>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-[8px] px-1 py-[1px] border border-[color:var(--wa-btn-border)] cursor-pointer ${
        active ? 'bg-[var(--wa-accent-dim)] text-black' : 'bg-[var(--wa-btn)] text-[color:var(--wa-accent)]'
      }`}
    >
      {children}
    </button>
  );
}

function MiniBtn({ onClick, title, children }: { onClick: (e: React.MouseEvent) => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-[12px] h-[12px] leading-none text-[7px] bg-[var(--wa-btn)] border border-[color:var(--wa-btn-border)] text-[color:var(--wa-accent)] hover:brightness-125"
    >
      {children}
    </button>
  );
}
