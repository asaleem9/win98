'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { Dialog98 } from '@/components/ui/Dialog98';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { formatTime, basename } from '@/lib/audio/playlist';
import { getAudioContext } from '@/lib/sounds';
import { wavEncode, wavToDataUrl } from '@/lib/audio/wav';
import {
  PcmData,
  EFFECT,
  changeVolume,
  changeSpeed,
  addEcho,
  reverse,
  pcmToWavSource,
  audioBufferToPcm,
} from '@/lib/audio/dsp';

type Mode = 'idle' | 'recording' | 'playing' | 'fake';
type EffectKind = 'volUp' | 'volDown' | 'spdUp' | 'spdDown' | 'echo' | 'reverse';
type MenuKey = 'file' | 'edit' | 'effects';

const PEAK_COLUMNS = 300;

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

function MenuItem({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`px-4 py-[2px] cursor-default whitespace-nowrap ${
        disabled ? 'text-[var(--win98-disabled-text)]' : 'hover:bg-[var(--win98-titlebar-active-start)] hover:text-white'
      }`}
    >
      {label}
    </div>
  );
}

// Build the OfflineAudioContext-rendered result for an effect, falling back to
// the pure DSP helpers when Web Audio is unavailable (jsdom / older engines).
// The pure helpers are the deterministic, unit-tested path.
async function renderEffect(pcm: PcmData, kind: EffectKind): Promise<PcmData> {
  if (kind === 'reverse') return reverse(pcm);

  const OAC =
    typeof window !== 'undefined'
      ? window.OfflineAudioContext ??
        (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
      : undefined;

  if (!OAC) {
    switch (kind) {
      case 'volUp': return changeVolume(pcm, EFFECT.volumeUp);
      case 'volDown': return changeVolume(pcm, EFFECT.volumeDown);
      case 'spdUp': return changeSpeed(pcm, EFFECT.speedUp);
      case 'spdDown': return changeSpeed(pcm, EFFECT.speedDown);
      case 'echo': return addEcho(pcm);
    }
  }

  const numCh = pcm.channels.length;
  const sr = pcm.sampleRate;
  const len = pcm.channels[0]?.length ?? 0;
  let outLen = len;
  if (kind === 'spdUp') outLen = Math.max(1, Math.round(len / EFFECT.speedUp));
  else if (kind === 'spdDown') outLen = Math.max(1, Math.round(len / EFFECT.speedDown));
  else if (kind === 'echo') outLen = len + Math.round(EFFECT.echoTime * sr) * 4;

  const off = new OAC(numCh, outLen, sr);
  const srcBuf = off.createBuffer(numCh, len, sr);
  for (let c = 0; c < numCh; c++) srcBuf.getChannelData(c).set(pcm.channels[c]);
  const node = off.createBufferSource();
  node.buffer = srcBuf;

  if (kind === 'volUp' || kind === 'volDown') {
    const g = off.createGain();
    g.gain.value = kind === 'volUp' ? EFFECT.volumeUp : EFFECT.volumeDown;
    node.connect(g).connect(off.destination);
  } else if (kind === 'spdUp' || kind === 'spdDown') {
    node.playbackRate.value = kind === 'spdUp' ? EFFECT.speedUp : EFFECT.speedDown;
    node.connect(off.destination);
  } else {
    const delay = off.createDelay(1);
    delay.delayTime.value = EFFECT.echoTime;
    const fb = off.createGain();
    fb.gain.value = EFFECT.echoFeedback;
    node.connect(off.destination);
    node.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(off.destination);
  }

  node.start();
  const rendered = await off.startRendering();
  return audioBufferToPcm(rendered);
}

function pcmToObjectUrl(pcm: PcmData): string {
  const bytes = wavEncode(pcmToWavSource(pcm));
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}

function silentPcm(seconds: number): PcmData {
  const sampleRate = 22050;
  const len = Math.max(1, Math.round(seconds * sampleRate));
  return { sampleRate, channels: [new Float32Array(len)] };
}

export default function SoundRecorder({ launchParams }: AppComponentProps) {
  const { readFile, writeFile } = useFileSystem();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  // Static waveform envelope (min/max per column) for the current clip.
  const peaksRef = useRef<{ min: Float32Array; max: Float32Array } | null>(null);

  const [mode, setMode] = useState<Mode>('idle');
  const [position, setPosition] = useState(0);
  const [length, setLength] = useState(0);
  const [pcm, setPcm] = useState<PcmData | null>(null);
  const [wavUrl, setWavUrl] = useState<string | null>(null);
  const [undo, setUndo] = useState<PcmData | null>(null);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [picker, setPicker] = useState<'open' | 'save' | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const modeRef = useRef<Mode>('idle');
  useEffect(() => { modeRef.current = mode; }, [mode]);
  const pcmRef = useRef<PcmData | null>(null);
  useEffect(() => { pcmRef.current = pcm; }, [pcm]);

  // A launched .wav that we couldn't decode still shows its name + a fake play.
  const launchedName = launchParams?.filePath ? basename(launchParams.filePath) : null;

  const computePeaks = useCallback((data: PcmData) => {
    const ch = data.channels[0];
    if (!ch || ch.length === 0) { peaksRef.current = null; return; }
    const min = new Float32Array(PEAK_COLUMNS);
    const max = new Float32Array(PEAK_COLUMNS);
    const span = ch.length / PEAK_COLUMNS;
    for (let x = 0; x < PEAK_COLUMNS; x++) {
      const start = Math.floor(x * span);
      const end = Math.min(ch.length, Math.floor((x + 1) * span) + 1);
      let lo = 0;
      let hi = 0;
      for (let i = start; i < end; i++) {
        if (ch[i] < lo) lo = ch[i];
        if (ch[i] > hi) hi = ch[i];
      }
      min[x] = lo;
      max[x] = hi;
    }
    peaksRef.current = { min, max };
  }, []);

  // Adopt a new clip: keep the PCM, rebuild a playable URL + waveform.
  const setAudio = useCallback((data: PcmData) => {
    setPcm(data);
    computePeaks(data);
    setLength((data.channels[0]?.length ?? 0) / data.sampleRate);
    setPosition(0);
    setWavUrl((old) => {
      if (old && old.startsWith('blob:')) URL.revokeObjectURL(old);
      try {
        return pcmToObjectUrl(data);
      } catch {
        return null;
      }
    });
  }, [computePeaks]);

  const decodeToPcm = useCallback(async (src: string | ArrayBuffer): Promise<PcmData | null> => {
    const ctx = getAudioContext();
    if (!ctx) return null;
    try {
      const arr = typeof src === 'string' ? await (await fetch(src)).arrayBuffer() : src;
      const buf = await ctx.decodeAudioData(arr);
      return audioBufferToPcm(buf);
    } catch {
      return null;
    }
  }, []);

  // Load a filesystem clip (data: URL content) for playback + editing.
  const loadFromContent = useCallback(
    async (content: string | null) => {
      if (!content || !content.startsWith('data:')) return;
      setWavUrl(content);
      const decoded = await decodeToPcm(content);
      if (decoded) setAudio(decoded);
    },
    [decodeToPcm, setAudio],
  );

  // Waveform rendering — live analyser while recording, static envelope for a
  // loaded clip, else a flat line.
  const drawWaveform = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, pos: number, len: number) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    const midY = height / 2;
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 1;

    const analyser = analyserRef.current;
    if (modeRef.current === 'recording' && analyser) {
      ctx.beginPath();
      const buf = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buf);
      for (let x = 0; x < width; x++) {
        const v = buf[Math.floor((x / width) * buf.length)] / 128 - 1;
        const y = midY + v * (height * 0.45);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (peaksRef.current) {
      const { min, max } = peaksRef.current;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const col = Math.floor((x / width) * PEAK_COLUMNS);
        const yTop = midY + max[col] * (height * 0.45);
        const yBot = midY + min[col] * (height * 0.45);
        ctx.moveTo(x, yTop);
        ctx.lineTo(x, yBot);
      }
      ctx.stroke();
    } else if (modeRef.current === 'fake' || modeRef.current === 'playing') {
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const y = midY + Math.sin(x * 0.05 + Date.now() * 0.005) * (height * 0.3) * Math.sin(x * 0.02);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();
    }

    // Playback cursor.
    if (len > 0 && (modeRef.current === 'playing' || modeRef.current === 'fake')) {
      const cx = Math.min(width, (pos / len) * width);
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
      ctx.stroke();
    }

    ctx.strokeStyle = '#003300';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < height; y += height / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, []);

  // Keep the latest position/length available to the canvas loop.
  const drawStateRef = useRef({ position: 0, length: 0 });
  drawStateRef.current = { position, length };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const animate = () => {
      const { position: p, length: l } = drawStateRef.current;
      drawWaveform(ctx, canvas.width, canvas.height, p, l);
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
    if (recCtxRef.current) { void recCtxRef.current.close().catch(() => {}); recCtxRef.current = null; }
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
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) {
          const ac = new AC();
          recCtxRef.current = ac;
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
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        cleanupStream();
        const decoded = await decodeToPcm(await blob.arrayBuffer());
        if (decoded) {
          setUndo(null);
          setAudio(decoded);
        } else {
          // Couldn't decode — keep the raw blob playable, no editable PCM.
          setWavUrl(URL.createObjectURL(blob));
        }
        setMode('idle');
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
  }, [cleanupStream, decodeToPcm, setAudio]);

  const stopTransport = useCallback(() => {
    if (mode === 'recording' && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    } else if (mode === 'playing') {
      audioElRef.current?.pause();
      setMode('idle');
    } else if (mode === 'fake') {
      setMode('idle');
    }
  }, [mode]);

  const play = useCallback(() => {
    if (wavUrl) {
      if (!audioElRef.current) audioElRef.current = new Audio();
      const el = audioElRef.current;
      el.src = wavUrl;
      el.onended = () => setMode('idle');
      el.ontimeupdate = () => setPosition(el.currentTime);
      el.onloadedmetadata = () => { if (Number.isFinite(el.duration)) setLength(el.duration); };
      void el.play().catch(() => {});
      setMode('playing');
    } else if (launchedName) {
      startTimeRef.current = Date.now();
      setPosition(0);
      setLength(3);
      setMode('fake');
    }
  }, [wavUrl, launchedName]);

  const newRecording = useCallback(() => {
    setWavUrl((old) => { if (old && old.startsWith('blob:')) URL.revokeObjectURL(old); return null; });
    setPcm(null);
    setUndo(null);
    peaksRef.current = null;
    setLength(0);
    setPosition(0);
    setMode('idle');
    setOpenMenu(null);
  }, []);

  const applyEffect = useCallback(async (kind: EffectKind) => {
    setOpenMenu(null);
    const current = pcmRef.current;
    if (!current) {
      setDialog({ title: 'Sound Recorder', message: 'Record or open a sound before applying effects.' });
      return;
    }
    setBusy(true);
    try {
      const next = await renderEffect(current, kind);
      setUndo(current);
      setAudio(next);
    } catch {
      setDialog({ title: 'Sound Recorder', message: 'The effect could not be applied.' });
    } finally {
      setBusy(false);
    }
  }, [setAudio]);

  const doUndo = useCallback(() => {
    setOpenMenu(null);
    if (!undo) return;
    setAudio(undo);
    setUndo(null);
  }, [undo, setAudio]);

  const saveAs = useCallback(
    (path: string) => {
      setPicker(null);
      const source = pcmRef.current ? pcmToWavSource(pcmRef.current) : pcmToWavSource(silentPcm(Math.max(1, length)));
      const dataUrl = wavToDataUrl(source);
      const res = writeFile(path, dataUrl);
      setDialog(
        res.ok
          ? { title: 'Sound Recorder', message: `Saved to ${path}` }
          : { title: 'Sound Recorder', message: `Could not save file.\n\n${res.error}` },
      );
    },
    [length, writeFile],
  );

  const openFile = useCallback(
    (path: string) => {
      setPicker(null);
      void loadFromContent(readFile(path));
    },
    [loadFromContent, readFile],
  );

  // On launch with a .wav argument, try to load its real audio.
  useEffect(() => {
    if (launchParams?.filePath) void loadFromContent(readFile(launchParams.filePath));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { cleanupStream(); audioElRef.current?.pause(); }, [cleanupStream]);

  const displayLength = launchedName && !pcm && length === 0 ? 3 : length;
  const hasAudio = !!wavUrl || !!launchedName;

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Menu bar */}
      <div className="flex gap-4 px-2 py-[2px] border-b border-[var(--win98-button-shadow)] relative">
        <span className="cursor-default hover:bg-[var(--win98-titlebar-active-start)] hover:text-white px-1" onClick={() => setOpenMenu((m) => (m === 'file' ? null : 'file'))}><u>F</u>ile</span>
        <span className="cursor-default hover:bg-[var(--win98-titlebar-active-start)] hover:text-white px-1" onClick={() => setOpenMenu((m) => (m === 'edit' ? null : 'edit'))}><u>E</u>dit</span>
        <span className="cursor-default hover:bg-[var(--win98-titlebar-active-start)] hover:text-white px-1" onClick={() => setOpenMenu((m) => (m === 'effects' ? null : 'effects'))}>E<u>f</u>fects</span>
        <span className="cursor-default"><u>H</u>elp</span>

        {openMenu === 'file' && (
          <div className="absolute left-1 top-[18px] z-30 bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-md min-w-[130px]">
            <MenuItem label="New" onClick={newRecording} />
            <MenuItem label="Open..." onClick={() => { setOpenMenu(null); setPicker('open'); }} />
            <MenuItem label="Save As..." onClick={() => { setOpenMenu(null); setPicker('save'); }} />
            <div className="mx-1 my-[2px] border-t border-[var(--win98-button-shadow)]" />
            <MenuItem label="Exit" onClick={() => setOpenMenu(null)} />
          </div>
        )}
        {openMenu === 'edit' && (
          <div className="absolute left-[36px] top-[18px] z-30 bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-md min-w-[130px]">
            <MenuItem label="Undo" onClick={doUndo} disabled={!undo} />
          </div>
        )}
        {openMenu === 'effects' && (
          <div className="absolute left-[76px] top-[18px] z-30 bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-md min-w-[150px]">
            <MenuItem label="Increase Volume (by 25%)" onClick={() => applyEffect('volUp')} disabled={!pcm} />
            <MenuItem label="Decrease Volume" onClick={() => applyEffect('volDown')} disabled={!pcm} />
            <MenuItem label="Increase Speed (100%)" onClick={() => applyEffect('spdUp')} disabled={!pcm} />
            <MenuItem label="Decrease Speed" onClick={() => applyEffect('spdDown')} disabled={!pcm} />
            <MenuItem label="Add Echo" onClick={() => applyEffect('echo')} disabled={!pcm} />
            <MenuItem label="Reverse" onClick={() => applyEffect('reverse')} disabled={!pcm} />
          </div>
        )}
      </div>

      {/* Waveform */}
      <div className="mx-2 mt-2 border-2 border-solid border-[var(--win98-button-shadow)]">
        <canvas ref={canvasRef} width={300} height={60} className="w-full block" />
      </div>

      {/* Info */}
      <div className="mx-2 mt-2 text-center text-[11px]">
        {launchedName && !pcm ? <div className="truncate mb-1 text-[var(--win98-button-shadow)]">{launchedName}</div> : null}
        Position: {formatTime(position)} &nbsp;&nbsp; Length: {formatTime(displayLength)}
        {mode === 'recording' && <span className="ml-2 text-[#cc0000] font-bold">● REC</span>}
        {busy && <span className="ml-2 text-[var(--win98-button-shadow)]">Processing…</span>}
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
        <TransportButton onClick={play} title="Play" disabled={mode === 'recording' || !hasAudio}>▶️</TransportButton>
        <TransportButton onClick={stopTransport} title="Stop">⏹️</TransportButton>
        <TransportButton onClick={() => setPosition((p) => p + 1)} title="Fast Forward" disabled={mode === 'recording'}>⏩</TransportButton>
        <TransportButton onClick={mode === 'recording' ? stopTransport : startRecording} title="Record">🔴</TransportButton>
      </div>

      {picker && (
        <FilePickerDialog
          mode={picker}
          filters={[{ label: 'Sounds (*.wav)', extensions: ['wav'] }, { label: 'All Files (*.*)', extensions: [] }]}
          defaultExtension="wav"
          defaultName={picker === 'save' ? 'recording.wav' : ''}
          onConfirm={picker === 'save' ? saveAs : openFile}
          onCancel={() => setPicker(null)}
        />
      )}

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
