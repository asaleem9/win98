'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useSettings } from '@/contexts/SettingsContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { Dialog98 } from '@/components/ui/Dialog98';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { addRecentDoc } from '@/lib/recentDocs';
import { MusicPlayer } from '@/lib/audio/player';
import { MusicTrack, musicTracks, getTrackByFileName } from '@/lib/audio/tracks';
import {
  RepeatMode,
  manualStep,
  autoNext,
  formatTime,
  basename,
  playlistForLaunch,
  resolveTrackFromContent,
} from '@/lib/audio/playlist';

type Status = 'Stopped' | 'Playing' | 'Paused' | 'Ready';
type ViewMode = 'standard' | 'compact';
type Viz = 'spectrum' | 'oscilloscope' | 'ambience';

const VIZ_ORDER: Viz[] = ['spectrum', 'oscilloscope', 'ambience'];
const VIZ_LABEL: Record<Viz, string> = {
  spectrum: 'Bar Spectrum',
  oscilloscope: 'Oscilloscope',
  ambience: 'Ambience',
};
const RECENT_LIMIT = 8;

/** Resolve an opened filesystem path to a playable track (track:/data:/by-name). */
function trackForOpen(path: string, content: string | null): MusicTrack {
  const name = basename(path);
  const viaRef = resolveTrackFromContent(content);
  if (viaRef) return viaRef;
  const byName = getTrackByFileName(name);
  if (byName) return byName;
  const base = musicTracks[0];
  const src = content && content.startsWith('data:') ? content : base.src;
  return { ...base, id: `open-${name}`, title: name, artist: 'Unknown Artist', fileName: name, src };
}

export default function MediaPlayer({ windowId, launchParams, launchCount }: AppComponentProps) {
  const playerRef = useRef<MusicPlayer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { closeWindow } = useWindows();
  const { readFile } = useFileSystem();
  const { getAppPref, setAppPref } = useSettings();

  const readContent = useCallback((fp?: string) => (fp ? readFile(fp) : null), [readFile]);

  const initial = useRef(playlistForLaunch(launchParams?.filePath, readContent(launchParams?.filePath)));
  const [playlist, setPlaylist] = useState<MusicTrack[]>(initial.current.list);
  const [index, setIndex] = useState(initial.current.index);
  const [status, setStatus] = useState<Status>('Ready');
  const [volume, setVolume] = useState(75);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [view, setView] = useState<ViewMode>('standard');
  const [viz, setViz] = useState<Viz>('spectrum');
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [shuffle, setShuffle] = useState(false);
  const [picker, setPicker] = useState(false);
  const [dialog, setDialog] = useState<null | 'stats' | 'options' | 'about'>(null);

  const recentFiles = getAppPref<string[]>('media-player', 'recentFiles', []);

  const track = playlist[index] ?? musicTracks[0];

  // Latest values the mount-once callbacks (onEnded, RAF loop) read from.
  const nav = useRef({ index, length: playlist.length, playing: false, repeat, shuffle });
  nav.current = { index, length: playlist.length, playing: status === 'Playing', repeat, shuffle };
  const vizRef = useRef(viz);
  vizRef.current = viz;

  const loadTrack = useCallback((i: number, autoplay: boolean) => {
    const p = playerRef.current;
    const t = playlist[i];
    if (!p || !t) return;
    p.load(t);
    setElapsed(0);
    if (autoplay) {
      p.play();
      setStatus('Playing');
    }
  }, [playlist]);

  useEffect(() => {
    const p = new MusicPlayer();
    playerRef.current = p;
    p.setVolume(0.75);
    p.onTimeUpdate = (cur, dur) => {
      setElapsed(cur);
      if (dur && Number.isFinite(dur)) setDuration(dur);
    };
    p.onEnded = () => {
      const { index: i, length, repeat: r, shuffle: s } = nav.current;
      const next = autoNext(i, length, r, s);
      if (next === null) { setStatus('Stopped'); setElapsed(0); }
      else if (next === i) { loadTrack(i, true); }
      else setIndex(next);
    };
    p.load(playlist[initial.current.index]);
    return () => { p.destroy(); playerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (launchCount === undefined) return;
    const r = playlistForLaunch(launchParams?.filePath, readContent(launchParams?.filePath));
    setPlaylist(r.list);
    setIndex(r.index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  const prevIndexRef = useRef(index);
  useEffect(() => {
    if (prevIndexRef.current === index) return;
    prevIndexRef.current = index;
    loadTrack(index, nav.current.playing);
  }, [index, loadTrack]);

  // Single render loop; the drawing mode is read from vizRef so switching
  // visualizations never tears down the animation.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const freqBins = new Uint8Array(128);
    const timeBins = new Uint8Array(256);
    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.004, vy: (Math.random() - 0.5) * 0.004,
    }));
    let raf = 0;

    const render = () => {
      const w = canvas.width, h = canvas.height;
      const p = playerRef.current;
      const playing = nav.current.playing;
      const haveFreq = p?.getFrequencyData(freqBins) ?? false;
      const energy = haveFreq
        ? freqBins.reduce((a, b) => a + b, 0) / (freqBins.length * 255)
        : (playing ? 0.4 : 0.02);

      ctx.fillStyle = '#000010';
      ctx.fillRect(0, 0, w, h);

      if (vizRef.current === 'spectrum') {
        const bars = 32;
        const bw = w / bars;
        for (let i = 0; i < bars; i++) {
          const mag = haveFreq
            ? freqBins[Math.floor((i / bars) * freqBins.length)] / 255
            : (playing ? Math.abs(Math.sin(i * 0.5 + Date.now() * 0.004)) * 0.7 : 0.02);
          const bh = mag * h;
          ctx.fillStyle = `hsl(${200 + i * 3}, 90%, ${40 + mag * 30}%)`;
          ctx.fillRect(i * bw, h - bh, bw - 1, bh);
        }
      } else if (vizRef.current === 'oscilloscope') {
        const analyser = p?.analyser;
        if (analyser) analyser.getByteTimeDomainData(timeBins);
        ctx.strokeStyle = '#33ff66';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const n = timeBins.length;
        for (let i = 0; i < n; i++) {
          const v = analyser ? timeBins[i] / 128 - 1 : (playing ? Math.sin(i * 0.12 + Date.now() * 0.006) * 0.6 : 0);
          const x = (i / (n - 1)) * w;
          const y = h / 2 + v * (h / 2 - 4);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // Ambience: drifting particles that brighten and quicken with the audio.
        for (const pt of particles) {
          pt.x += pt.vx * (1 + energy * 6);
          pt.y += pt.vy * (1 + energy * 6);
          if (pt.x < 0 || pt.x > 1) pt.vx *= -1;
          if (pt.y < 0 || pt.y > 1) pt.vy *= -1;
          const r = 1 + energy * 4;
          const hue = 180 + energy * 160;
          ctx.fillStyle = `hsla(${hue}, 90%, ${40 + energy * 45}%, 0.85)`;
          ctx.beginPath();
          ctx.arc(pt.x * w, pt.y * h, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  const play = useCallback(() => { playerRef.current?.play(); setStatus('Playing'); }, []);
  const pause = useCallback(() => {
    setStatus((s) => {
      if (s === 'Playing') { playerRef.current?.pause(); return 'Paused'; }
      return s;
    });
  }, []);
  const stop = useCallback(() => { playerRef.current?.stop(); setStatus('Stopped'); setElapsed(0); }, []);
  const step = useCallback((dir: 1 | -1) => {
    setIndex((i) => manualStep(i, nav.current.length, dir, nav.current.shuffle));
  }, []);
  const applyVolume = useCallback((v: number) => { setVolume(v); playerRef.current?.setVolume(v / 100); }, []);
  const cycleViz = useCallback(() => {
    setViz((v) => VIZ_ORDER[(VIZ_ORDER.indexOf(v) + 1) % VIZ_ORDER.length]);
  }, []);

  const addRecent = useCallback((path: string) => {
    const next = [path, ...recentFiles.filter((p) => p.toLowerCase() !== path.toLowerCase())].slice(0, RECENT_LIMIT);
    setAppPref('media-player', 'recentFiles', next);
    addRecentDoc(path);
  }, [recentFiles, setAppPref]);

  const openPath = useCallback((path: string) => {
    const t = trackForOpen(path, readFile(path));
    setPlaylist([t, ...musicTracks]);
    setIndex(0);
    prevIndexRef.current = -1; // force the index effect to (re)load track 0
    setStatus('Playing');
    addRecent(path);
  }, [readFile, addRecent]);

  const menus: MenuDefinition[] = [
    {
      label: 'File',
      items: [
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: () => setPicker(true) },
        {
          label: 'Recent File',
          disabled: recentFiles.length === 0,
          submenu: recentFiles.length
            ? recentFiles.map((p) => ({ label: basename(p), onClick: () => openPath(p) }))
            : [{ label: '(none)', disabled: true }],
        },
        { label: '', separator: true },
        { label: 'Close', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Standard', radio: true, checked: view === 'standard', onClick: () => setView('standard') },
        { label: 'Compact', radio: true, checked: view === 'compact', onClick: () => setView('compact') },
        { label: '', separator: true },
        {
          label: 'Visualization',
          submenu: VIZ_ORDER.map((v) => ({
            label: VIZ_LABEL[v],
            radio: true,
            checked: viz === v,
            onClick: () => setViz(v),
          })),
        },
        { label: '', separator: true },
        { label: 'Statistics...', onClick: () => setDialog('stats') },
        { label: 'Options...', onClick: () => setDialog('options') },
      ],
    },
    {
      label: 'Play',
      items: [
        { label: 'Play', onClick: play },
        { label: 'Pause', onClick: pause },
        { label: 'Stop', onClick: stop },
        { label: '', separator: true },
        { label: 'Previous', onClick: () => step(-1) },
        { label: 'Next', onClick: () => step(1) },
        { label: '', separator: true },
        { label: 'Repeat', checked: repeat === 'all', onClick: () => setRepeat((r) => (r === 'all' ? 'off' : 'all')) },
        { label: 'Shuffle', checked: shuffle, onClick: () => setShuffle((s) => !s) },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About Windows Media Player', onClick: () => setDialog('about') }],
    },
  ];

  const seekMax = duration || 1;
  const compact = view === 'compact';

  return (
    <div className="relative flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <MenuBar menus={menus} windowId={windowId} />

      {!compact && (
        <div className="flex items-center gap-2 px-2 py-1 border-b border-[var(--win98-button-shadow)]">
          <button
            onClick={() => setShowPlaylist((s) => !s)}
            className="px-2 h-[20px] text-[10px] cursor-default bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
          >
            Playlist
          </button>
          <span className="text-[10px] text-[var(--win98-button-shadow)] truncate flex-1">{track.artist ? `${track.artist} - ` : ''}{track.title}</span>
        </div>
      )}

      <div className="flex flex-1 min-h-[100px]">
        {/* Visualization area — click to cycle */}
        <div className="flex-1 bg-black flex items-center justify-center relative cursor-pointer" onClick={cycleViz} title="Click to change visualization">
          <canvas ref={canvasRef} width={260} height={120} className="w-full h-full" />
          <div className="absolute top-1 left-2 text-[9px] text-white/60">{status === 'Ready' ? 'Windows Media Player 6.4' : track.title}</div>
          <div className="absolute bottom-1 right-2 text-[9px] text-white/30">{VIZ_LABEL[viz]}</div>
        </div>

        {/* Playlist drawer (standard mode only) */}
        {!compact && showPlaylist && (
          <div className="w-[120px] bg-white border-l border-[var(--win98-button-shadow)] overflow-auto">
            {playlist.map((t, i) => (
              <div
                key={`${t.id}-${i}`}
                onDoubleClick={() => { setIndex(i); loadTrack(i, true); }}
                className={`px-1 py-[1px] text-[10px] cursor-default truncate ${i === index ? 'bg-[var(--win98-titlebar-active-start)] text-white' : ''}`}
              >
                {t.title}
              </div>
            ))}
          </div>
        )}
      </div>

      {!compact && (
        <>
          <div className="bg-[#1a1a2e] text-[#00FF00] px-2 py-[2px] text-[10px] font-mono border-t border-[var(--win98-button-shadow)] flex justify-between">
            <span>{status}: {track.title}</span>
            <span>{formatTime(elapsed)} / {formatTime(duration)}</span>
          </div>

          <div className="px-2 py-1 bg-[var(--win98-button-face)]">
            <input
              type="range" min={0} max={seekMax} step={0.1} value={Math.min(elapsed, seekMax)}
              onChange={(e) => { const v = Number(e.target.value); setElapsed(v); playerRef.current?.seek(v); }}
              className="w-full h-[14px]" aria-label="Seek"
            />
          </div>
        </>
      )}

      {/* Transport */}
      <div className="flex items-center justify-between px-2 py-1 border-t border-[var(--win98-button-highlight)]">
        <div className="flex items-center gap-[2px]">
          <MpButton onClick={play} title="Play">▶</MpButton>
          <MpButton onClick={pause} title="Pause">⏸</MpButton>
          <MpButton onClick={stop} title="Stop">⏹</MpButton>
          <div className="w-px h-4 bg-[var(--win98-button-shadow)] mx-1" />
          <MpButton onClick={() => step(-1)} title="Previous">⏮</MpButton>
          <MpButton onClick={() => step(1)} title="Next">⏭</MpButton>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px]">🔊</span>
          <input type="range" min={0} max={100} value={volume} onChange={(e) => applyVolume(Number(e.target.value))} className="w-[60px] h-[14px]" aria-label="Volume" />
        </div>
      </div>

      {picker && (
        <FilePickerDialog
          mode="open"
          title="Open"
          filters={[
            { label: 'Media files (*.mp3;*.wav;*.wma;*.mid;*.avi;*.asf)', extensions: ['mp3', 'wav', 'wma', 'mid', 'avi', 'asf'] },
            { label: 'All Files (*.*)', extensions: [] },
          ]}
          startDir="C:\\My Documents\\My Music"
          onCancel={() => setPicker(false)}
          onConfirm={(path) => { setPicker(false); openPath(path); }}
        />
      )}

      {dialog === 'stats' && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
          <Dialog98
            title="Statistics"
            icon="info"
            message={
              <div className="space-y-1 text-[11px] w-[240px]">
                <p className="font-bold">{track.title}</p>
                <div className="flex justify-between"><span>Audio codec:</span><span>Fraunhofer MPEG Layer-3</span></div>
                <div className="flex justify-between"><span>Bit rate:</span><span>{track.kbps} kbps</span></div>
                <div className="flex justify-between"><span>Sample rate:</span><span>{track.khz}.050 kHz</span></div>
                <div className="flex justify-between"><span>Channels:</span><span>2 (stereo)</span></div>
                <div className="flex justify-between"><span>Duration:</span><span>{formatTime(duration)}</span></div>
                <div className="flex justify-between"><span>Frames dropped:</span><span>0</span></div>
                <div className="flex justify-between"><span>Reconnects:</span><span>0</span></div>
              </div>
            }
            buttons={[{ label: 'OK', default: true, onClick: () => setDialog(null) }]}
          />
        </div>
      )}

      {dialog === 'options' && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
          <Dialog98
            title="Options"
            icon="info"
            message={
              <div className="space-y-2 text-[11px] w-[240px]">
                <p>Playback</p>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={repeat === 'all'} onChange={() => setRepeat((r) => (r === 'all' ? 'off' : 'all'))} />
                  Repeat playlist
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={shuffle} onChange={() => setShuffle((s) => !s)} />
                  Shuffle
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={view === 'compact'} onChange={() => setView((v) => (v === 'compact' ? 'standard' : 'compact'))} />
                  Compact view
                </label>
              </div>
            }
            buttons={[{ label: 'OK', default: true, onClick: () => setDialog(null) }]}
          />
        </div>
      )}

      {dialog === 'about' && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
          <Dialog98
            title="About Windows Media Player"
            icon="info"
            message={
              <div className="space-y-1">
                <p className="font-bold">Windows Media Player</p>
                <p>Microsoft (R) Windows Media Player 6.4</p>
                <p>Version 6.4.09.1109</p>
                <p>Copyright (C) 1998-1999 Microsoft Corp.</p>
              </div>
            }
            buttons={[{ label: 'OK', default: true, onClick: () => setDialog(null) }]}
          />
        </div>
      )}
    </div>
  );
}

function MpButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-[26px] h-[22px] flex items-center justify-center cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] text-[11px] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]"
    >
      {children}
    </button>
  );
}
