'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { Dialog98 } from '@/components/ui/Dialog98';
import { formatTime, basename } from '@/lib/audio/playlist';

// Recorded clips only live for the session — the virtual FS stores a marker
// string, and the real blob URL is kept here in memory keyed by save path.
const recordedBlobs = new Map<string, string>();

type Mode = 'idle' | 'recording' | 'recorded' | 'playing' | 'fake';

function TransportButton({ children, onClick, title, disabled }: { children: React.ReactNode; onClick?: () => void; title?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="w-[30px] h-[24px] flex items-center justify-center cursor-default select-none text-[14px]
        bg-[var(--win98-button-face)] border-2 border-solid
        border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]
        border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]
        active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]
        active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]
        disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export default function SoundRecorder({ launchParams }: AppComponentProps) {
  const { writeFile } = useFileSystem();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  const [mode, setMode] = useState<Mode>('idle');
  const [position, setPosition] = useState(0);
  const [length, setLength] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileMenu, setFileMenu] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);
  const modeRef = useRef<Mode>('idle');
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // A launched .wav: show its name (derived from props) and allow a fake play.
  const launchedName = launchParams?.filePath ? basename(launchParams.filePath) : null;

  // Waveform rendering — live analyser data while recording, else a flat line.
  const drawWaveform = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    const midY = height / 2;
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const analyser = analyserRef.current;
    if (modeRef.current === 'recording' && analyser) {
      const buf = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buf);
      for (let x = 0; x < width; x++) {
        const v = buf[Math.floor((x / width) * buf.length)] / 128 - 1;
        const y = midY + v * (height * 0.45);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else if (modeRef.current === 'recording' || modeRef.current === 'playing' || modeRef.current === 'fake') {
      // Fake animated trace (no analyser available).
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
      drawWaveform(ctx, canvas.width, canvas.height);
      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [drawWaveform]);

  // Position ticker while recording / fake-playing.
  useEffect(() => {
    if (mode !== 'recording' && mode !== 'fake') return;
    const id = setInterval(() => {
      setPosition(() => {
        const t = (Date.now() - startTimeRef.current) / 1000;
        if (mode === 'fake' && t >= length) { setMode('idle'); return length; }
        if (mode === 'recording') setLength(t);
        return t;
      });
    }, 100);
    return () => clearInterval(id);
  }, [mode, length]);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    if (audioCtxRef.current) { void audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
  }, []);

  const startRecording = useCallback(async () => {
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!md?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setDialog({ title: 'Sound Recorder', message: 'No recording device detected.\n\nRunning in demonstration mode.' });
      startTimeRef.current = Date.now();
      setPosition(0);
      setLength(0);
      setMode('fake');
      return;
    }
    try {
      const stream = await md.getUserMedia({ audio: true });
      streamRef.current = stream;
      // Live analyser for the waveform.
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) {
          const ac = new AC();
          audioCtxRef.current = ac;
          const src = ac.createMediaStreamSource(stream);
          const analyser = ac.createAnalyser();
          analyser.fftSize = 1024;
          src.connect(analyser);
          analyserRef.current = analyser;
        }
      } catch {
        // waveform falls back to the fake trace
      }
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setMode('recorded');
        cleanupStream();
      };
      rec.start();
      startTimeRef.current = Date.now();
      setPosition(0);
      setLength(0);
      setMode('recording');
    } catch {
      setDialog({ title: 'Sound Recorder', message: 'No recording device detected.\n\nMicrophone access was denied.' });
      cleanupStream();
    }
  }, [cleanupStream]);

  const stopRecording = useCallback(() => {
    if (mode === 'recording' && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    } else if (mode === 'playing') {
      audioElRef.current?.pause();
      setMode(blobUrl ? 'recorded' : 'idle');
    } else if (mode === 'fake') {
      setMode('idle');
    }
  }, [mode, blobUrl]);

  const playRecording = useCallback(() => {
    if (blobUrl) {
      if (!audioElRef.current) audioElRef.current = new Audio();
      const el = audioElRef.current;
      el.src = blobUrl;
      el.onended = () => setMode('recorded');
      void el.play().catch(() => {});
      setMode('playing');
    } else if (launchedName) {
      // Launched .wav — fake playback of a nominal 3s clip.
      startTimeRef.current = Date.now();
      setPosition(0);
      setLength(3);
      setMode('fake');
    }
  }, [blobUrl, launchedName]);

  const newRecording = useCallback(() => {
    setBlobUrl(null);
    setLength(0);
    setPosition(0);
    setMode('idle');
    setFileMenu(false);
  }, []);

  const save = useCallback(() => {
    setFileMenu(false);
    const path = 'C:\\My Documents\\recording.wav';
    const secs = Math.max(1, Math.round(length));
    const res = writeFile(path, `[WAV Audio - ${secs}s]`);
    if (res.ok) {
      if (blobUrl) recordedBlobs.set(path, blobUrl);
      setDialog({ title: 'Sound Recorder', message: `Saved to ${path}\n\nNote: audio persists only for this session.` });
    } else {
      setDialog({ title: 'Sound Recorder', message: `Could not save file.\n\n${res.error}` });
    }
  }, [length, blobUrl, writeFile]);

  useEffect(() => () => { cleanupStream(); audioElRef.current?.pause(); }, [cleanupStream]);

  const displayLength = launchedName && !blobUrl && length === 0 ? 3 : length;

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Menu bar */}
      <div className="flex gap-4 px-2 py-[2px] border-b border-[var(--win98-button-shadow)] relative">
        <span className="cursor-default hover:bg-[var(--win98-titlebar-active-start)] hover:text-white px-1" onClick={() => setFileMenu((f) => !f)}><u>F</u>ile</span>
        <span className="cursor-default"><u>E</u>dit</span>
        <span className="cursor-default">E<u>f</u>fects</span>
        <span className="cursor-default"><u>H</u>elp</span>
        {fileMenu && (
          <div className="absolute left-1 top-[18px] z-30 bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-md min-w-[120px]">
            {[
              { label: 'New', onClick: newRecording },
              { label: 'Save', onClick: save },
              { label: 'Exit', onClick: () => setFileMenu(false) },
            ].map((it) => (
              <div key={it.label} onClick={it.onClick} className="px-4 py-[2px] hover:bg-[var(--win98-titlebar-active-start)] hover:text-white cursor-default">{it.label}</div>
            ))}
          </div>
        )}
      </div>

      {/* Waveform */}
      <div className="mx-2 mt-2 border-2 border-solid border-[var(--win98-button-shadow)]">
        <canvas ref={canvasRef} width={300} height={60} className="w-full block" />
      </div>

      {/* Info */}
      <div className="mx-2 mt-2 text-center text-[11px]">
        {launchedName && !blobUrl ? <div className="truncate mb-1 text-[var(--win98-button-shadow)]">{launchedName}</div> : null}
        Position: {formatTime(position)} &nbsp;&nbsp; Length: {formatTime(displayLength)}
        {mode === 'recording' && <span className="ml-2 text-[#cc0000] font-bold">● REC</span>}
      </div>

      {/* Seek */}
      <div className="mx-2 mt-1 mb-1">
        <input
          type="range" min={0} max={Math.max(displayLength, position, 0.01)} step={0.01} value={position}
          onChange={(e) => setPosition(parseFloat(e.target.value))}
          className="w-full h-[16px]" aria-label="Position"
        />
      </div>

      {/* Transport */}
      <div className="flex items-center justify-center gap-1 px-2 py-2 border-t border-[var(--win98-button-highlight)]">
        <TransportButton onClick={() => setPosition(0)} title="Rewind" disabled={mode === 'recording'}>⏮</TransportButton>
        <TransportButton onClick={() => setPosition((p) => Math.max(0, p - 1))} title="Fast Rewind" disabled={mode === 'recording'}>⏪</TransportButton>
        <TransportButton onClick={playRecording} title="Play" disabled={mode === 'recording' || (!blobUrl && !launchedName)}>▶️</TransportButton>
        <TransportButton onClick={stopRecording} title="Stop">⏹️</TransportButton>
        <TransportButton onClick={() => setPosition((p) => p + 1)} title="Fast Forward" disabled={mode === 'recording'}>⏩</TransportButton>
        <TransportButton onClick={mode === 'recording' ? stopRecording : startRecording} title="Record">🔴</TransportButton>
      </div>

      {dialog && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/20">
          <Dialog98
            title={dialog.title}
            icon="info"
            message={<div className="whitespace-pre-line max-w-[220px]">{dialog.message}</div>}
            buttons={[{ label: 'OK', onClick: () => setDialog(null), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
