'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { MusicPlayer } from '@/lib/audio/player';
import { MusicTrack, musicTracks } from '@/lib/audio/tracks';
import { manualStep, formatTime, playlistForLaunch } from '@/lib/audio/playlist';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { showSystemError } from '@/hooks/useFileOpener';

type Status = 'Stopped' | 'Playing' | 'Paused' | 'Ready';

export default function MediaPlayer({ launchParams, launchCount }: AppComponentProps) {
  const playerRef = useRef<MusicPlayer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { readFile } = useFileSystem();

  // Resolve a launched clip's FS content so a 'track:<id>' reference is honored.
  const readContent = useCallback((fp?: string) => (fp ? readFile(fp) : null), [readFile]);

  const initial = useRef(playlistForLaunch(launchParams?.filePath, readContent(launchParams?.filePath)));
  const [playlist, setPlaylist] = useState<MusicTrack[]>(initial.current.list);
  const [index, setIndex] = useState(initial.current.index);
  const [status, setStatus] = useState<Status>('Ready');
  const [volume, setVolume] = useState(75);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);

  const track = playlist[index] ?? musicTracks[0];
  const nav = useRef({ index, length: playlist.length, playing: false });
  nav.current = { index, length: playlist.length, playing: status === 'Playing' };

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
      const { index: i, length } = nav.current;
      if (i + 1 < length) setIndex(i + 1);
      else { setStatus('Stopped'); setElapsed(0); }
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

  // Album-art-style animated bars visualization.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bins = new Uint8Array(128);
    let raf = 0;
    const render = () => {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = '#000010';
      ctx.fillRect(0, 0, w, h);
      const p = playerRef.current;
      const have = p?.getFrequencyData(bins) ?? false;
      const bars = 32;
      const bw = w / bars;
      for (let i = 0; i < bars; i++) {
        let mag: number;
        if (have) mag = bins[Math.floor((i / bars) * bins.length)] / 255;
        else mag = nav.current.playing ? Math.abs(Math.sin(i * 0.5 + Date.now() * 0.004)) * 0.7 : 0.02;
        const bh = mag * h;
        ctx.fillStyle = `hsl(${200 + i * 3}, 90%, ${40 + mag * 30}%)`;
        ctx.fillRect(i * bw, h - bh, bw - 1, bh);
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
    setIndex((i) => manualStep(i, nav.current.length, dir, false));
  }, []);
  const applyVolume = useCallback((v: number) => { setVolume(v); playerRef.current?.setVolume(v / 100); }, []);

  const menuDialog = () =>
    showSystemError('Windows Media Player', 'This command is not available in this version of Windows Media Player.');

  const seekMax = duration || 1;

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Menu bar */}
      <div className="flex gap-4 px-2 py-[2px] border-b border-[var(--win98-button-shadow)]">
        {['File', 'View', 'Play', 'Go', 'Favorites', 'Help'].map((m) => (
          <span key={m} className="cursor-default hover:bg-[var(--win98-titlebar-active-start)] hover:text-white px-1" onClick={menuDialog}>{m}</span>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-[var(--win98-button-shadow)]">
        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          className="px-2 h-[20px] text-[10px] cursor-default bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
        >
          Playlist
        </button>
        <span className="text-[10px] text-[var(--win98-button-shadow)] truncate flex-1">{track.artist ? `${track.artist} - ` : ''}{track.title}</span>
      </div>

      <div className="flex flex-1 min-h-[100px]">
        {/* Visualization area */}
        <div className="flex-1 bg-black flex items-center justify-center relative">
          <canvas ref={canvasRef} width={260} height={120} className="w-full h-full" />
          <div className="absolute top-1 left-2 text-[9px] text-white/60">{status === 'Ready' ? 'Windows Media Player 6.4' : track.title}</div>
          <div className="absolute bottom-1 right-2 text-[9px] text-white/30">Windows Media Player</div>
        </div>

        {/* Playlist */}
        {showPlaylist && (
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

      {/* Status */}
      <div className="bg-[#1a1a2e] text-[#00FF00] px-2 py-[2px] text-[10px] font-mono border-t border-[var(--win98-button-shadow)] flex justify-between">
        <span>{status}: {track.title}</span>
        <span>{formatTime(elapsed)} / {formatTime(duration)}</span>
      </div>

      {/* Seek */}
      <div className="px-2 py-1 bg-[var(--win98-button-face)]">
        <input
          type="range" min={0} max={seekMax} step={0.1} value={Math.min(elapsed, seekMax)}
          onChange={(e) => { const v = Number(e.target.value); setElapsed(v); playerRef.current?.seek(v); }}
          className="w-full h-[14px]" aria-label="Seek"
        />
      </div>

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
