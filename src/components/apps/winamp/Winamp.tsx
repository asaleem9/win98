'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { MusicPlayer } from '@/lib/audio/player';
import { MusicTrack, musicTracks, getTrackByFileName } from '@/lib/audio/tracks';
import { RepeatMode, autoNext, manualStep, formatTime, totalDuration, basename } from '@/lib/audio/playlist';

const APP_ID = 'winamp';

const EQ_BANDS = ['60', '170', '310', '600', '1K', '3K', '6K', '12K', '14K', '16K'];
const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [6, 4, -2, -4, -1, 2, 5, 7, 7, 8],
  Techno: [8, 5, 0, -3, -2, 1, 6, 8, 8, 7],
  Classical: [0, 0, 0, 0, 0, 0, -4, -4, -4, -6],
};

/** Build the working playlist; if a launched file isn't one of ours, keep its
 *  display name but play a bundled track so something actually sounds. */
function playlistForLaunch(filePath?: string): { list: MusicTrack[]; index: number } {
  if (!filePath) return { list: [...musicTracks], index: 0 };
  const name = basename(filePath);
  const match = getTrackByFileName(name);
  if (match) {
    return { list: [...musicTracks], index: musicTracks.findIndex((t) => t.id === match.id) };
  }
  // Unknown mp3: front the requested name, sound a real track underneath.
  const stand = musicTracks[0];
  const faux: MusicTrack = { ...stand, id: `launch-${name}`, title: name, artist: 'Unknown Artist', fileName: name };
  return { list: [faux, ...musicTracks], index: 0 };
}

export default function Winamp({ launchParams, launchCount }: AppComponentProps) {
  const playerRef = useRef<MusicPlayer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initial = useRef(playlistForLaunch(launchParams?.filePath));
  const [playlist, setPlaylist] = useState<MusicTrack[]>(initial.current.list);
  const [index, setIndex] = useState(initial.current.index);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [volume, setVolume] = useState(80); // 0..100
  const [balance, setBalance] = useState(50); // cosmetic, see note
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showEq, setShowEq] = useState(false);
  const [eq, setEq] = useState<number[]>(EQ_PRESETS.Flat);
  const [preamp, setPreamp] = useState(0);

  // Persisted prefs are read lazily from localStorage to avoid a context
  // dependency here; they were written by SettingsContext under the same keys.
  const track = playlist[index] ?? musicTracks[0];
  const titleText = `${index + 1}. ${track.artist} - ${track.title}  ***  `;

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

  // Create the engine once.
  useEffect(() => {
    const p = new MusicPlayer();
    playerRef.current = p;

    let storedVol = 80;
    let storedShuffle = false;
    let storedRepeat: RepeatMode = 'off';
    try {
      const raw = window.localStorage.getItem('win98-prefs-v1');
      if (raw) {
        const prefs = JSON.parse(raw)?.[APP_ID];
        if (prefs) {
          if (typeof prefs.volume === 'number') storedVol = Math.round(prefs.volume * 100);
          if (typeof prefs.shuffle === 'boolean') storedShuffle = prefs.shuffle;
          if (prefs.repeat === 'off' || prefs.repeat === 'all' || prefs.repeat === 'one') storedRepeat = prefs.repeat;
        }
      }
    } catch {
      // no prefs — fine
    }
    setVolume(storedVol);
    setShuffle(storedShuffle);
    setRepeat(storedRepeat);
    p.setVolume(storedVol / 100);

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
    const { list, index: i } = playlistForLaunch(launchParams?.filePath);
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
      all[APP_ID] = { ...all[APP_ID], volume: volume / 100, shuffle, repeat };
      window.localStorage.setItem('win98-prefs-v1', JSON.stringify(all));
    } catch {
      // storage unavailable — non-fatal
    }
  }, [volume, shuffle, repeat]);

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
      ctx.fillStyle = '#000000';
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
        // Green -> yellow -> red classic gradient by height.
        const grad = ctx.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, '#00ff00');
        grad.addColorStop(0.6, '#ffff00');
        grad.addColorStop(1, '#ff0000');
        ctx.fillStyle = grad;
        ctx.fillRect(i * bw, h - bh, bw - 1, bh);
        // Peak cap
        peaks[i] = Math.max(peaks[i] - 1.5, bh);
        ctx.fillStyle = '#cccccc';
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

  const remaining = Math.max(0, (duration || durations[track.id] || 0) - elapsed);
  const seekMax = duration || durations[track.id] || 1;
  const listTotal = totalDuration(playlist.map((t) => durations[t.id]));

  return (
    <div className="flex flex-col select-none text-[11px]" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="bg-[#232323] text-[#00ff00] p-[3px]">
        {/* Display */}
        <div className="bg-black border border-[#444] p-[4px] mb-[3px]">
          <div className="overflow-hidden h-[12px] text-[10px] font-bold tracking-wider mb-[4px]">
            <div className="whitespace-nowrap" style={{ transform: `translateX(-${scrollOffset}px)` }}>
              {titleText}{titleText}
            </div>
          </div>

          <div className="flex items-center gap-[6px]">
            <div className="text-[18px] font-bold font-mono min-w-[52px] text-[#00ff00]">
              {formatTime(elapsed)}
            </div>
            <canvas ref={canvasRef} width={152} height={24} className="flex-1 h-[24px] w-full" />
          </div>

          <div className="text-[8px] text-[#00aa00] mt-[2px] flex justify-between">
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
            style={{ accentColor: '#00ff00' }}
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
              <span className="text-[7px] text-[#888]">VOL</span>
              <input
                type="range" min={0} max={100} value={volume}
                onChange={(e) => applyVolume(Number(e.target.value))}
                className="w-[46px] h-[4px]" style={{ accentColor: '#00ff00' }} aria-label="Volume"
              />
            </div>
            <div className="flex items-center gap-[2px]">
              <span className="text-[7px] text-[#888]">BAL</span>
              <input
                type="range" min={0} max={100} value={balance}
                onChange={(e) => setBalance(Number(e.target.value))}
                className="w-[28px] h-[4px]" style={{ accentColor: '#00ff00' }} aria-label="Balance"
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
            <ModeButton active={showEq} onClick={() => setShowEq((s) => !s)}>EQ</ModeButton>
            <ModeButton active={showPlaylist} onClick={() => setShowPlaylist((s) => !s)}>PL</ModeButton>
          </div>
        </div>
      </div>

      {/* Equalizer */}
      {showEq && (
        <div className="bg-[#232323] border-t border-[#444] p-2 text-[#00ff00]">
          <div className="flex items-end gap-[6px]">
            <div className="flex flex-col items-center">
              <input
                type="range" min={-12} max={12} value={preamp}
                onChange={(e) => setPreamp(Number(e.target.value))}
                className="h-[48px] w-[10px]"
                style={{ writingMode: 'vertical-lr', direction: 'rtl', accentColor: '#00ff00' }}
                aria-label="Preamp"
              />
              <span className="text-[7px] mt-1 text-[#888]">PRE</span>
            </div>
            <div className="w-px h-[52px] bg-[#444]" />
            {EQ_BANDS.map((band, i) => (
              <div key={band} className="flex flex-col items-center">
                <input
                  type="range" min={-12} max={12} value={eq[i]}
                  onChange={(e) => setEq((prev) => prev.map((v, idx) => (idx === i ? Number(e.target.value) : v)))}
                  className="h-[48px] w-[10px]"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl', accentColor: '#00ff00' }}
                  aria-label={`EQ ${band}`}
                />
                <span className="text-[7px] mt-1 text-[#888]">{band}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-[2px] mt-2">
            {Object.keys(EQ_PRESETS).map((name) => (
              <ModeButton key={name} active={false} onClick={() => setEq(EQ_PRESETS[name])}>{name}</ModeButton>
            ))}
          </div>
        </div>
      )}

      {/* Playlist editor */}
      {showPlaylist && (
        <div className="bg-[#1a1a2e] border-t border-[#444]">
          <div className="max-h-[150px] overflow-auto">
            {playlist.map((s, i) => (
              <div
                key={`${s.id}-${i}`}
                className={`flex items-center px-2 py-[1px] text-[10px] cursor-pointer ${
                  i === index ? 'bg-[#000080] text-white' : 'text-[#00ff00] hover:bg-[#2a2a3e]'
                }`}
                onDoubleClick={() => { setIndex(i); loadTrack(i, true); }}
              >
                <span className="w-[16px] text-right mr-1 text-[#888]">{i + 1}.</span>
                <span className="flex-1 truncate">{s.artist} - {s.title}</span>
                <span className="text-[#888] ml-1">{durations[s.id] ? formatTime(durations[s.id]) : '--:--'}</span>
                <span className="flex ml-1 gap-[1px]">
                  <MiniBtn onClick={(e) => { e.stopPropagation(); moveTrack(i, -1); }} title="Move up">▲</MiniBtn>
                  <MiniBtn onClick={(e) => { e.stopPropagation(); moveTrack(i, 1); }} title="Move down">▼</MiniBtn>
                  <MiniBtn onClick={(e) => { e.stopPropagation(); removeTrack(i); }} title="Remove">✕</MiniBtn>
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between px-2 py-[2px] text-[9px] text-[#888] border-t border-[#333]">
            <span>{playlist.length} tracks</span>
            <span>{formatTime(listTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WinampButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-[24px] h-[18px] bg-[#3a3a3a] border border-[#555] text-[10px] text-[#00ff00] flex items-center justify-center cursor-pointer hover:bg-[#4a4a4a] active:bg-[#2a2a2a] active:border-[#333]"
    >
      {children}
    </button>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-[8px] px-1 py-[1px] border border-[#555] cursor-pointer ${
        active ? 'bg-[#00aa00] text-black' : 'bg-[#333] text-[#00ff00]'
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
      className="w-[12px] h-[12px] leading-none text-[7px] bg-[#333] border border-[#555] text-[#00ff00] hover:bg-[#444]"
    >
      {children}
    </button>
  );
}
