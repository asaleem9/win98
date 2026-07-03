'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MusicPlayer } from '@/lib/audio/player';
import { musicTracks } from '@/lib/audio/tracks';
import { formatTime } from '@/lib/audio/playlist';
import { showSystemError } from '@/hooks/useFileOpener';

type Phase = 'buffering' | 'playing' | 'rebuffering';

// The RealPlayer experience: buffer forever, connect eventually, then get
// interrupted by "rebuffering" at the worst moments.
const CLIP = musicTracks[2]; // Midnight MIDI — sounds suitably lo-fi
const CONNECT_AFTER_CYCLES = 3;

export default function RealPlayer() {
  const playerRef = useRef<MusicPlayer | null>(null);
  const [phase, setPhase] = useState<Phase>('buffering');
  const [bufferPercent, setBufferPercent] = useState(0);
  const [status, setStatus] = useState('Connecting to media.real.com...');
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(70);

  const cyclesRef = useRef(0);
  const phaseRef = useRef<Phase>('buffering');
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Create engine.
  useEffect(() => {
    const p = new MusicPlayer();
    playerRef.current = p;
    p.setVolume(0.7);
    p.onTimeUpdate = (cur, dur) => { setElapsed(cur); if (dur && Number.isFinite(dur)) setDuration(dur); };
    p.onEnded = () => { setPlaying(false); setElapsed(0); };
    p.load(CLIP);
    return () => { p.destroy(); playerRef.current = null; };
  }, []);

  // Initial buffering marquee — connects after a few cycles.
  useEffect(() => {
    if (phase !== 'buffering') return;
    const id = setInterval(() => {
      setBufferPercent((prev) => {
        if (prev >= 87) {
          cyclesRef.current += 1;
          if (cyclesRef.current >= CONNECT_AFTER_CYCLES) {
            // Finally connect and play.
            playerRef.current?.play();
            setPlaying(true);
            setPhase('playing');
            setStatus('Playing');
            return 100;
          }
          setStatus('Buffering...');
          return 3;
        }
        const next = Math.min(prev + (Math.random() * 3 + 0.5), 87);
        setStatus(`Buffering... ${Math.floor(next)}%`);
        return next;
      });
    }, 700);
    return () => clearInterval(id);
  }, [phase]);

  // Mid-playback rebuffering interruptions.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      if (phaseRef.current !== 'playing' || !playerRef.current?.playing) return;
      if (Math.random() < 0.35) {
        setPhase('rebuffering');
        setStatus('Rebuffering...');
        playerRef.current?.pause();
        setBufferPercent(0);
        const grow = setInterval(() => setBufferPercent((p) => Math.min(p + 20, 100)), 400);
        setTimeout(() => {
          clearInterval(grow);
          if (playerRef.current) {
            playerRef.current.play();
            setPhase('playing');
            setStatus('Playing');
            setPlaying(true);
          }
        }, 2000);
      }
    }, 6000);
    return () => clearInterval(id);
  }, [phase]);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p || phaseRef.current === 'rebuffering') return;
    if (p.playing) { p.pause(); setPlaying(false); }
    else { p.play(); setPlaying(true); if (phaseRef.current === 'buffering') { setPhase('playing'); setStatus('Playing'); } }
  }, []);

  const stop = useCallback(() => { playerRef.current?.stop(); setPlaying(false); setElapsed(0); }, []);
  const seekBy = useCallback((sec: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.seek(Math.max(0, Math.min((p.duration || 0), p.currentTime + sec)));
  }, []);
  const applyVolume = useCallback((v: number) => { setVolume(v); playerRef.current?.setVolume(v / 100); }, []);
  const menuDialog = () => showSystemError('RealPlayer', 'This feature is only available in RealPlayer Plus. Upgrade today at www.real.com!');

  const connected = phase !== 'buffering';
  const progress = duration ? (elapsed / duration) * 100 : bufferPercent;

  return (
    <div className="flex flex-col h-full bg-[#3a3a3a] text-white font-[family-name:var(--win98-font)] text-[11px] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a4a] to-[#2a2a6a] px-3 py-1 flex items-center gap-2">
        <span className="font-bold text-[12px]">RealPlayer</span>
        <span className="text-[#aaaacc] text-[10px]">G2</span>
      </div>

      {/* Menu bar */}
      <div className="flex gap-4 px-3 py-[2px] bg-[#4a4a4a] border-b border-[#333] text-[11px] text-[#ccc]">
        {['File', 'View', 'Play', 'Favorites', 'Help'].map((m) => (
          <span key={m} className="cursor-default hover:text-white" onClick={menuDialog}>{m}</span>
        ))}
      </div>

      {/* Video area */}
      <div className="flex-1 bg-black flex items-center justify-center relative mx-1 my-1">
        <div className="text-center">
          <div className="text-[20px] font-bold mb-2">
            <span className="text-[#5a5aff]">Real</span><span className="text-[#888]">Player</span>
          </div>
          <div className={`text-[14px] ${phase === 'rebuffering' ? 'text-[#ff6633]' : connected ? 'text-[#66cc66]' : 'text-[#888]'}`}>
            {status}
          </div>
          {!connected || phase === 'rebuffering' ? (
            <div className="w-[200px] h-[8px] bg-[#1a1a1a] border border-[#333] mt-3 mx-auto overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${bufferPercent}%`,
                  background: phase === 'rebuffering'
                    ? 'linear-gradient(to right, #cc3300, #ff6633)'
                    : 'linear-gradient(to right, #336699, #6699cc)',
                }}
              />
            </div>
          ) : (
            <div className="text-[10px] text-[#66cc66] mt-3">● LIVE · {CLIP.title}</div>
          )}
          <div className="text-[10px] text-[#555] mt-2">RealAudio 28.8 · mono</div>
        </div>
      </div>

      {/* Now playing */}
      <div className="px-3 py-1 bg-[#333] text-[10px] text-[#aaa] truncate">
        clip: {CLIP.fileName} | Server: rtsp://media.real.com/welcome
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1 px-2 py-1 bg-[#4a4a4a]">
        <div className="flex-1 h-[6px] bg-[#222] border border-[#555] mx-1">
          <div className="h-full bg-[#336699] transition-all duration-300" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      </div>

      {/* Transport */}
      <div className="flex items-center justify-center gap-[2px] px-2 py-1 bg-[#4a4a4a] border-t border-[#555]">
        <RpButton onClick={() => seekBy(-9999)} title="Rewind">⏮</RpButton>
        <RpButton onClick={() => seekBy(-10)} title="Back">⏪</RpButton>
        <RpButton onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>{playing ? '⏸' : '▶'}</RpButton>
        <RpButton onClick={stop} title="Stop">⏹</RpButton>
        <RpButton onClick={() => seekBy(10)} title="Forward">⏩</RpButton>
        <RpButton onClick={() => seekBy(9999)} title="End">⏭</RpButton>
        <div className="ml-2 flex items-center gap-1">
          <span className="text-[10px] text-[#888]">Vol:</span>
          <input type="range" min={0} max={100} value={volume} onChange={(e) => applyVolume(Number(e.target.value))} className="w-[60px] h-[6px]" style={{ accentColor: '#669933' }} aria-label="Volume" />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center px-2 py-[2px] bg-[#3a3a3a] border-t border-[#555] text-[10px] text-[#888]">
        <span>{formatTime(elapsed)} / {connected && duration ? formatTime(duration) : '??:??'}</span>
        <span className="ml-auto">28.8 Kbps</span>
      </div>
    </div>
  );
}

function RpButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-[26px] h-[22px] bg-[#555] border border-[#666] text-[12px] text-[#ccc] cursor-pointer hover:bg-[#666] active:bg-[#444] flex items-center justify-center"
    >
      {children}
    </button>
  );
}
