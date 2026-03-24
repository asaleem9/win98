'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';

function TransportButton({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-[30px] h-[24px] flex items-center justify-center cursor-default select-none text-[14px]
        bg-[var(--win98-button-face)]
        border-2 border-solid
        border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]
        border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]
        active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]
        active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]
      "
    >
      {children}
    </button>
  );
}

export default function SoundRecorder({ windowId }: AppComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [position, setPosition] = useState(0);
  const [length] = useState(0);
  const animRef = useRef<number>(0);

  const drawWaveform = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, active: boolean) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const midY = height / 2;

    if (active) {
      for (let x = 0; x < width; x++) {
        const y = midY + Math.sin(x * 0.05 + Date.now() * 0.005) * (height * 0.3) * Math.sin(x * 0.02);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else {
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
    }

    ctx.stroke();

    // Grid lines
    ctx.strokeStyle = '#003300';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < height; y += height / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      drawWaveform(ctx, canvas.width, canvas.height, playing || recording);
      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, recording, drawWaveform]);

  useEffect(() => {
    if (!playing && !recording) return;
    const interval = setInterval(() => {
      setPosition(prev => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, [playing, recording]);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Menu bar */}
      <div className="flex gap-4 px-2 py-[2px] border-b border-[var(--win98-button-shadow)]">
        <span className="cursor-default"><u>F</u>ile</span>
        <span className="cursor-default"><u>E</u>dit</span>
        <span className="cursor-default">E<u>f</u>fects</span>
        <span className="cursor-default"><u>H</u>elp</span>
      </div>

      {/* Waveform display */}
      <div className="mx-2 mt-2 border-2 border-solid border-[var(--win98-button-shadow)]">
        <canvas
          ref={canvasRef}
          width={300}
          height={60}
          className="w-full block"
        />
      </div>

      {/* Position display */}
      <div className="mx-2 mt-2 text-center text-[11px]">
        Position: {position.toFixed(2)} sec &nbsp;&nbsp; Length: {length.toFixed(2)} sec
      </div>

      {/* Seek slider */}
      <div className="mx-2 mt-1 mb-1">
        <input
          type="range"
          min="0"
          max={Math.max(length, position)}
          step="0.01"
          value={position}
          onChange={e => setPosition(parseFloat(e.target.value))}
          className="w-full h-[16px]"
        />
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-center gap-1 px-2 py-2 border-t border-[var(--win98-button-highlight)]">
        <TransportButton onClick={() => setPosition(0)} title="Rewind">⏮</TransportButton>
        <TransportButton onClick={() => setPosition(prev => Math.max(0, prev - 1))} title="Fast Rewind">⏪</TransportButton>
        <TransportButton
          onClick={() => { setPlaying(!playing); setRecording(false); }}
          title="Play"
        >
          ▶️
        </TransportButton>
        <TransportButton
          onClick={() => { setPlaying(false); setRecording(false); }}
          title="Stop"
        >
          ⏹️
        </TransportButton>
        <TransportButton onClick={() => setPosition(prev => prev + 1)} title="Fast Forward">⏩</TransportButton>
        <TransportButton
          onClick={() => { setRecording(!recording); setPlaying(false); }}
          title="Record"
        >
          🔴
        </TransportButton>
      </div>
    </div>
  );
}
