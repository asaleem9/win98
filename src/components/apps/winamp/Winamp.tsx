'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppComponentProps } from '@/types/app';

interface Song {
  title: string;
  artist: string;
  duration: number; // seconds
}

const PLAYLIST: Song[] = [
  { title: 'Smells Like Teen Spirit', artist: 'Nirvana', duration: 301 },
  { title: 'Wannabe', artist: 'Spice Girls', duration: 173 },
  { title: 'MMMBop', artist: 'Hanson', duration: 256 },
  { title: 'No Diggity', artist: 'Blackstreet', duration: 239 },
  { title: 'Tubthumping', artist: 'Chumbawamba', duration: 223 },
  { title: 'Semi-Charmed Life', artist: 'Third Eye Blind', duration: 268 },
  { title: 'Iris', artist: 'Goo Goo Dolls', duration: 283 },
  { title: 'Bitter Sweet Symphony', artist: 'The Verve', duration: 357 },
  { title: 'Barbie Girl', artist: 'Aqua', duration: 193 },
  { title: 'Blue (Da Ba Dee)', artist: 'Eiffel 65', duration: 218 },
];

export default function Winamp({ windowId }: AppComponentProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [volume, setVolume] = useState(80);
  const [balance, setBalance] = useState(50);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  const song = PLAYLIST[currentTrack];
  const titleText = `${currentTrack + 1}. ${song.artist} - ${song.title}  ***  `;

  // Elapsed time ticker
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= song.duration) {
          setCurrentTrack((t) => (t + 1) % PLAYLIST.length);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [playing, song.duration]);

  // Title scroll
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setScrollOffset((prev) => (prev + 1) % (titleText.length * 7));
    }, 100);
    return () => clearInterval(interval);
  }, [playing, titleText]);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);
  const stop = useCallback(() => { setPlaying(false); setElapsed(0); }, []);
  const prevTrack = useCallback(() => {
    setCurrentTrack((t) => (t - 1 + PLAYLIST.length) % PLAYLIST.length);
    setElapsed(0);
  }, []);
  const nextTrack = useCallback(() => {
    setCurrentTrack((t) => (t + 1) % PLAYLIST.length);
    setElapsed(0);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="flex flex-col select-none" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Main display - dark skin */}
      <div className="bg-[#232323] text-[#00ff00] p-[3px]">
        {/* Top display area */}
        <div className="bg-[#000000] border border-[#444] p-[4px] mb-[3px]">
          {/* Title scroller */}
          <div className="overflow-hidden h-[12px] text-[10px] font-bold tracking-wider mb-[4px]">
            <div
              className="whitespace-nowrap"
              style={{ transform: `translateX(-${scrollOffset}px)` }}
            >
              {titleText}{titleText}
            </div>
          </div>

          {/* Time + visualizer row */}
          <div className="flex items-center gap-[6px]">
            {/* Time display */}
            <div className="text-[18px] font-bold font-mono min-w-[60px] text-[#00ff00]">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>

            {/* Visualizer bars */}
            <div className="flex-1 flex items-end gap-[1px] h-[20px]">
              {Array.from({ length: 20 }).map((_, i) => (
                <VisualizerBar key={i} playing={playing} index={i} />
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="text-[8px] text-[#00aa00] mt-[2px] flex justify-between">
            <span>{playing ? 'Playing' : 'Stopped'}</span>
            <span>128kbps 44kHz stereo</span>
          </div>
        </div>

        {/* Seek bar */}
        <div className="mb-[3px] px-1">
          <input
            type="range"
            min={0}
            max={song.duration}
            value={elapsed}
            onChange={(e) => setElapsed(Number(e.target.value))}
            className="w-full h-[6px] cursor-pointer accent-[#00ff00]"
            style={{ accentColor: '#00ff00' }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-[2px]">
          {/* Transport buttons */}
          <div className="flex gap-[1px]">
            <WinampButton onClick={prevTrack} title="Previous">⏮</WinampButton>
            <WinampButton onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
              {playing ? '⏸' : '▶'}
            </WinampButton>
            <WinampButton onClick={stop} title="Stop">⏹</WinampButton>
            <WinampButton onClick={nextTrack} title="Next">⏭</WinampButton>
          </div>

          {/* Volume + Balance */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-[2px]">
              <span className="text-[7px] text-[#888]">VOL</span>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-[50px] h-[4px] accent-[#00ff00]"
                style={{ accentColor: '#00ff00' }}
              />
            </div>
            <div className="flex items-center gap-[2px]">
              <span className="text-[7px] text-[#888]">BAL</span>
              <input
                type="range"
                min={0}
                max={100}
                value={balance}
                onChange={(e) => setBalance(Number(e.target.value))}
                className="w-[30px] h-[4px] accent-[#00ff00]"
                style={{ accentColor: '#00ff00' }}
              />
            </div>
          </div>
        </div>

        {/* Playlist toggle */}
        <div className="flex justify-end mt-[2px]">
          <button
            onClick={() => setShowPlaylist((s) => !s)}
            className={`text-[8px] px-1 border border-[#555] cursor-pointer ${
              showPlaylist ? 'bg-[#00aa00] text-black' : 'bg-[#333] text-[#00ff00]'
            }`}
          >
            PL
          </button>
        </div>
      </div>

      {/* Playlist window */}
      {showPlaylist && (
        <div className="bg-[#1a1a2e] border-t border-[#444] max-h-[150px] overflow-auto">
          {PLAYLIST.map((s, i) => (
            <div
              key={i}
              className={`flex items-center px-2 py-[1px] text-[10px] cursor-pointer ${
                i === currentTrack
                  ? 'bg-[#000080] text-white'
                  : 'text-[#00ff00] hover:bg-[#2a2a3e]'
              }`}
              onDoubleClick={() => {
                setCurrentTrack(i);
                setElapsed(0);
                setPlaying(true);
              }}
            >
              <span className="w-[16px] text-right mr-1 text-[#888]">{i + 1}.</span>
              <span className="flex-1 truncate">{s.artist} - {s.title}</span>
              <span className="text-[#888] ml-1">
                {Math.floor(s.duration / 60)}:{String(s.duration % 60).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WinampButton({ onClick, title, children }: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
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

function VisualizerBar({ playing, index }: { playing: boolean; index: number }) {
  const [height, setHeight] = useState(2);

  useEffect(() => {
    if (!playing) {
      setHeight(2);
      return;
    }
    const interval = setInterval(() => {
      setHeight(Math.random() * 18 + 2);
    }, 80 + Math.random() * 40);
    return () => clearInterval(interval);
  }, [playing, index]);

  return (
    <div
      className="w-[3px] transition-[height] duration-75"
      style={{
        height: `${height}px`,
        background: height > 15 ? '#ff0000' : height > 10 ? '#ffff00' : '#00ff00',
      }}
    />
  );
}
