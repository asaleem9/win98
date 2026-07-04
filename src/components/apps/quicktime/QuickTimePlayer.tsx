'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { Dialog98 } from '@/components/ui/Dialog98';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { standardHelpMenu } from '@/lib/menus';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { MusicPlayer } from '@/lib/audio/player';
import { musicTracks } from '@/lib/audio/tracks';
import { formatTime, trackFromFile } from '@/lib/audio/playlist';

const SAMPLE = musicTracks[4]; // Screensaver Groove — the free "sample movie"
const SAMPLE_LEN = 15; // seconds of the free reel before it loops back

// The movie canvas plays at 260×150; Half/Normal/Double scale off that.
const BASE_W = 260;
const BASE_H = 150;
type SizeKey = 'half' | 'normal' | 'double';
const SIZE_SCALE: Record<SizeKey, number> = { half: 0.5, normal: 1, double: 2 };

export default function QuickTimePlayer({ windowId }: AppComponentProps) {
  const playerRef = useRef<MusicPlayer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { closeWindow, resizeWindow } = useWindows();
  const { readFile } = useFileSystem();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [loop, setLoop] = useState(true);
  const [size, setSize] = useState<SizeKey>('normal');
  const [picker, setPicker] = useState(false);
  const playCountRef = useRef(0);
  const elapsedRef = useRef(0);
  const loopRef = useRef(loop);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);
  useEffect(() => { loopRef.current = loop; }, [loop]);

  const movieW = Math.round(BASE_W * SIZE_SCALE[size]);
  const movieH = Math.round(BASE_H * SIZE_SCALE[size]);

  useEffect(() => {
    const p = new MusicPlayer();
    playerRef.current = p;
    p.setVolume(0.6);
    p.onTimeUpdate = (cur) => {
      if (cur >= SAMPLE_LEN) {
        if (loopRef.current) { p.seek(0); setElapsed(0); }
        else { p.pause(); setPlaying(false); setElapsed(SAMPLE_LEN); }
      } else setElapsed(cur);
    };
    p.load(SAMPLE);
    return () => { p.destroy(); playerRef.current = null; };
  }, []);

  // Procedural "sample movie": bouncing QuickTime Q over a shifting gradient.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const render = () => {
      const w = canvas.width, h = canvas.height;
      const t = elapsedRef.current;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      const hue = (t * 24) % 360;
      grad.addColorStop(0, `hsl(${hue}, 60%, 25%)`);
      grad.addColorStop(1, `hsl(${(hue + 80) % 360}, 60%, 15%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      if (started) {
        // Bouncing logo with a little motion trail.
        const bx = (Math.sin(t * 1.5) * 0.5 + 0.5) * (w - 40) + 20;
        const by = Math.abs(Math.sin(t * 2.1)) * (h - 40) + 20;
        const r = 16 + Math.sin(t * 4) * 3;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(bx - Math.sin((t - i * 0.05) * 1.5) * 4, by, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#4488cc';
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Q', bx, by + 1);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Sample Movie — press Play', w / 2, h / 2);
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [started]);

  const play = useCallback(() => {
    playCountRef.current += 1;
    // Pro nag reappears on every other play attempt.
    if (playCountRef.current % 2 === 0) {
      setShowUpgrade(true);
      return;
    }
    playerRef.current?.play();
    setPlaying(true);
    setStarted(true);
  }, []);

  const pause = useCallback(() => { playerRef.current?.pause(); setPlaying(false); }, []);
  const stop = useCallback(() => { playerRef.current?.stop(); setPlaying(false); setStarted(false); setElapsed(0); }, []);

  const seek = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(SAMPLE_LEN, v));
    playerRef.current?.seek(clamped);
    setElapsed(clamped);
    if (!started) setStarted(true);
  }, [started]);

  // Open flow reuses the sample player: load the chosen file and start it
  // directly so the Pro nag stays wired to the transport button, not Open.
  const openFile = useCallback((path: string) => {
    setPicker(false);
    playerRef.current?.load(trackFromFile(path, readFile(path)));
    setElapsed(0);
    playerRef.current?.play();
    setPlaying(true);
    setStarted(true);
  }, [readFile]);

  const applySize = useCallback((s: SizeKey) => {
    setSize(s);
    const scale = SIZE_SCALE[s];
    // Grow the window frame so the resized movie fits (min-size clamps apply).
    resizeWindow(windowId, Math.round(BASE_W * scale) + 16, Math.round(BASE_H * scale) + 110);
  }, [windowId, resizeWindow]);

  const menus: MenuDefinition[] = useMemo(() => [
    {
      label: '&File',
      items: [
        { label: '&Open...', shortcut: 'Ctrl+O', onClick: () => setPicker(true) },
        { label: '', separator: true },
        { label: 'E&xit', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: '&Movie',
      items: [
        { label: '&Loop', checked: loop, onClick: () => setLoop((l) => !l) },
        { label: '', separator: true },
        { label: '&Half Size', radio: true, checked: size === 'half', onClick: () => applySize('half') },
        { label: '&Normal Size', radio: true, checked: size === 'normal', onClick: () => applySize('normal') },
        { label: '&Double Size', radio: true, checked: size === 'double', onClick: () => applySize('double') },
      ],
    },
    standardHelpMenu('QuickTime'),
  ], [windowId, closeWindow, loop, size, applySize]);

  return (
    <div className="relative flex flex-col h-full bg-[#d0d0d0] font-[family-name:var(--win98-font)] text-[11px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-[3px]" style={{ background: 'linear-gradient(to bottom, #b8c8e0, #8898b0)' }}>
        <div className="flex items-center gap-2">
          <div className="w-[14px] h-[14px] rounded-sm bg-gradient-to-b from-[#4488cc] to-[#2266aa] flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">Q</span>
          </div>
          <span className="text-[11px] font-bold text-[#333]">QuickTime Player</span>
        </div>
      </div>

      {/* Menu bar */}
      <MenuBar menus={menus} windowId={windowId} />

      {/* Movie area */}
      <div className="flex-1 bg-black flex items-center justify-center relative m-[2px] overflow-hidden">
        <canvas ref={canvasRef} width={movieW} height={movieH} style={{ width: movieW, height: movieH }} />
      </div>

      {/* Transport */}
      <div className="bg-[#d0d0d0] px-[2px] pb-[2px]">
        {/* Timeline */}
        <div className="mx-2 my-[3px] flex items-center gap-2">
          <input
            type="range" min={0} max={SAMPLE_LEN} step={0.1} value={elapsed}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 h-[8px]" style={{ accentColor: '#4488cc' }} aria-label="Timeline"
          />
          <span className="text-[9px] text-[#555] font-mono w-[64px] text-right">
            {formatTime(elapsed)} / {formatTime(SAMPLE_LEN)}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-[1px] pb-1">
          <QtButton onClick={() => seek(0)}>⏮</QtButton>
          <QtButton onClick={() => seek(elapsed - 5)}>◀</QtButton>
          <QtButton onClick={playing ? pause : play}>{playing ? '⏸' : '▶'}</QtButton>
          <QtButton onClick={stop}>⏹</QtButton>
          <QtButton onClick={() => seek(elapsed + 5)}>▶▶</QtButton>
          <div className="w-[1px] h-[14px] bg-[#999] mx-1" />
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[#666]">Vol</span>
            <input type="range" min={0} max={100} defaultValue={60} onChange={(e) => playerRef.current?.setVolume(Number(e.target.value) / 100)} className="w-[40px] h-[6px]" style={{ accentColor: '#4488cc' }} aria-label="Volume" />
          </div>
        </div>
      </div>

      {picker && (
        <FilePickerDialog
          mode="open"
          title="Open"
          filters={[
            { label: 'Movies (*.mov;*.avi;*.mpg)', extensions: ['mov', 'avi', 'mpg', 'mpeg', 'qt'] },
            { label: 'All Files (*.*)', extensions: [] },
          ]}
          onCancel={() => setPicker(false)}
          onConfirm={openFile}
        />
      )}

      {showUpgrade && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20">
          <Dialog98
            title="QuickTime Player"
            icon="info"
            message={
              <div>
                <p className="font-bold mb-1">QuickTime Pro Required</p>
                <p>This feature requires QuickTime Pro ($29.99).</p>
                <p className="mt-1 text-[10px] text-[#666]">Upgrade at www.apple.com/quicktime</p>
              </div>
            }
            buttons={[
              { label: 'Buy Now...', onClick: () => setShowUpgrade(false) },
              { label: 'Later', onClick: () => setShowUpgrade(false), default: true },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function QtButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-[24px] h-[18px] rounded-sm text-[10px] cursor-pointer flex items-center justify-center"
      style={{ background: 'linear-gradient(to bottom, #e8e8e8, #c8c8c8)', border: '1px solid #999', color: '#333' }}
    >
      {children}
    </button>
  );
}
