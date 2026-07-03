// System sound layer. Each SoundId prefers a bundled file from /public/sounds;
// if the file is missing or fails to play, a small Web Audio recipe fills in,
// so no cue is ever silent. Volume/mute are driven by SettingsContext.

export type SoundId =
  | 'startup'
  | 'shutdown'
  | 'error'
  | 'chord'
  | 'ding'
  | 'exclamation'
  | 'menuOpen'
  | 'menuClick'
  | 'minimize'
  | 'maximize'
  | 'restoreDown'
  | 'recycle'
  | 'emptyBin'
  | 'notify'
  | 'aimDoorOpen'
  | 'aimDoorClose'
  | 'aimMessage'
  | 'youveGotMail'
  | 'modemDial'
  | 'mineClick'
  | 'mineExplosion'
  | 'mineWin'
  | 'cardFlip'
  | 'cardWin';

const soundFiles: Partial<Record<SoundId, string>> = {
  startup: '/sounds/startup.mp3',
  shutdown: '/sounds/shutdown.mp3',
  error: '/sounds/error.mp3',
  chord: '/sounds/chord.mp3',
  ding: '/sounds/ding.mp3',
  exclamation: '/sounds/exclamation.mp3',
  menuOpen: '/sounds/menu-open.mp3',
  menuClick: '/sounds/menu-click.mp3',
  minimize: '/sounds/minimize.mp3',
  maximize: '/sounds/maximize.mp3',
  restoreDown: '/sounds/restore.mp3',
  recycle: '/sounds/recycle.mp3',
  emptyBin: '/sounds/empty-bin.mp3',
  notify: '/sounds/notify.mp3',
  aimDoorOpen: '/sounds/aim-door-open.mp3',
  aimDoorClose: '/sounds/aim-door-close.mp3',
  aimMessage: '/sounds/aim-message.mp3',
  youveGotMail: '/sounds/youve-got-mail.mp3',
  modemDial: '/sounds/modem-dial.mp3',
  mineExplosion: '/sounds/mine-explosion.mp3',
  mineWin: '/sounds/mine-win.mp3',
  cardFlip: '/sounds/card-flip.mp3',
  cardWin: '/sounds/card-win.mp3',
};

// Known-missing files fall through to synth without a network attempt
const missingFiles = new Set<string>();

let muted = false;
let masterVolume = 0.7;
let ctx: AudioContext | null = null;

export function setSoundsMuted(m: boolean): void {
  muted = m;
}

export function getSoundsMuted(): boolean {
  return muted;
}

export function setMasterVolume(v: number): void {
  masterVolume = Math.min(1, Math.max(0, v));
}

export function getMasterVolume(): number {
  return masterVolume;
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

type Note = { freq: number; at: number; dur: number; type?: OscillatorType; gain?: number };

// Synth recipes: sequences of oscillator notes with quick envelopes.
// These are period-flavored approximations, not recordings.
const synthRecipes: Record<SoundId, Note[]> = {
  startup: [
    { freq: 293.66, at: 0, dur: 2.6, type: 'sine', gain: 0.22 },
    { freq: 440, at: 0.1, dur: 2.5, type: 'sine', gain: 0.18 },
    { freq: 587.33, at: 0.25, dur: 2.35, type: 'sine', gain: 0.16 },
    { freq: 880, at: 0.5, dur: 2.1, type: 'sine', gain: 0.1 },
  ],
  shutdown: [
    { freq: 659.25, at: 0, dur: 0.8, type: 'sine', gain: 0.2 },
    { freq: 523.25, at: 0.5, dur: 0.8, type: 'sine', gain: 0.2 },
    { freq: 392, at: 1.0, dur: 1.2, type: 'sine', gain: 0.2 },
  ],
  error: [
    { freq: 620, at: 0, dur: 0.12, type: 'square', gain: 0.12 },
    { freq: 415, at: 0.13, dur: 0.22, type: 'square', gain: 0.12 },
  ],
  chord: [
    { freq: 440, at: 0, dur: 0.4, type: 'triangle', gain: 0.15 },
    { freq: 554.37, at: 0, dur: 0.4, type: 'triangle', gain: 0.12 },
    { freq: 659.25, at: 0, dur: 0.4, type: 'triangle', gain: 0.12 },
  ],
  ding: [{ freq: 800, at: 0, dur: 0.35, type: 'sine', gain: 0.2 }],
  exclamation: [
    { freq: 700, at: 0, dur: 0.15, type: 'sine', gain: 0.2 },
    { freq: 900, at: 0.16, dur: 0.25, type: 'sine', gain: 0.2 },
  ],
  menuOpen: [{ freq: 1200, at: 0, dur: 0.05, type: 'sine', gain: 0.06 }],
  menuClick: [{ freq: 900, at: 0, dur: 0.04, type: 'sine', gain: 0.06 }],
  minimize: [
    { freq: 700, at: 0, dur: 0.08, type: 'sine', gain: 0.1 },
    { freq: 450, at: 0.08, dur: 0.1, type: 'sine', gain: 0.1 },
  ],
  maximize: [
    { freq: 450, at: 0, dur: 0.08, type: 'sine', gain: 0.1 },
    { freq: 700, at: 0.08, dur: 0.1, type: 'sine', gain: 0.1 },
  ],
  restoreDown: [
    { freq: 600, at: 0, dur: 0.08, type: 'sine', gain: 0.1 },
    { freq: 500, at: 0.08, dur: 0.1, type: 'sine', gain: 0.1 },
  ],
  recycle: [
    { freq: 300, at: 0, dur: 0.1, type: 'triangle', gain: 0.15 },
    { freq: 200, at: 0.1, dur: 0.15, type: 'triangle', gain: 0.15 },
  ],
  emptyBin: [
    { freq: 250, at: 0, dur: 0.1, type: 'sawtooth', gain: 0.08 },
    { freq: 180, at: 0.1, dur: 0.1, type: 'sawtooth', gain: 0.08 },
    { freq: 120, at: 0.2, dur: 0.2, type: 'sawtooth', gain: 0.08 },
  ],
  notify: [
    { freq: 880, at: 0, dur: 0.12, type: 'sine', gain: 0.15 },
    { freq: 1108.73, at: 0.14, dur: 0.2, type: 'sine', gain: 0.15 },
  ],
  aimDoorOpen: [
    { freq: 220, at: 0, dur: 0.25, type: 'sawtooth', gain: 0.08 },
    { freq: 330, at: 0.12, dur: 0.25, type: 'sawtooth', gain: 0.06 },
  ],
  aimDoorClose: [
    { freq: 330, at: 0, dur: 0.15, type: 'sawtooth', gain: 0.06 },
    { freq: 180, at: 0.12, dur: 0.3, type: 'sawtooth', gain: 0.1 },
  ],
  aimMessage: [
    { freq: 1046.5, at: 0, dur: 0.1, type: 'sine', gain: 0.15 },
    { freq: 1318.5, at: 0.11, dur: 0.15, type: 'sine', gain: 0.15 },
  ],
  youveGotMail: [
    { freq: 523.25, at: 0, dur: 0.15, type: 'triangle', gain: 0.18 },
    { freq: 659.25, at: 0.16, dur: 0.15, type: 'triangle', gain: 0.18 },
    { freq: 783.99, at: 0.32, dur: 0.3, type: 'triangle', gain: 0.18 },
  ],
  modemDial: [
    { freq: 350, at: 0, dur: 0.5, type: 'sine', gain: 0.1 },
    { freq: 440, at: 0, dur: 0.5, type: 'sine', gain: 0.1 },
    { freq: 1209, at: 0.6, dur: 0.12, type: 'sine', gain: 0.12 },
    { freq: 852, at: 0.75, dur: 0.12, type: 'sine', gain: 0.12 },
    { freq: 1336, at: 0.9, dur: 0.12, type: 'sine', gain: 0.12 },
    { freq: 941, at: 1.05, dur: 0.12, type: 'sine', gain: 0.12 },
    { freq: 1477, at: 1.2, dur: 0.12, type: 'sine', gain: 0.12 },
    { freq: 2100, at: 1.5, dur: 0.8, type: 'square', gain: 0.05 },
    { freq: 1800, at: 2.0, dur: 0.6, type: 'sawtooth', gain: 0.04 },
  ],
  mineClick: [{ freq: 1500, at: 0, dur: 0.03, type: 'square', gain: 0.05 }],
  mineExplosion: [
    { freq: 150, at: 0, dur: 0.3, type: 'sawtooth', gain: 0.2 },
    { freq: 80, at: 0.05, dur: 0.4, type: 'sawtooth', gain: 0.2 },
  ],
  mineWin: [
    { freq: 523.25, at: 0, dur: 0.12, type: 'square', gain: 0.1 },
    { freq: 659.25, at: 0.13, dur: 0.12, type: 'square', gain: 0.1 },
    { freq: 783.99, at: 0.26, dur: 0.12, type: 'square', gain: 0.1 },
    { freq: 1046.5, at: 0.39, dur: 0.3, type: 'square', gain: 0.1 },
  ],
  cardFlip: [{ freq: 2000, at: 0, dur: 0.03, type: 'triangle', gain: 0.06 }],
  cardWin: [
    { freq: 392, at: 0, dur: 0.15, type: 'triangle', gain: 0.15 },
    { freq: 523.25, at: 0.16, dur: 0.15, type: 'triangle', gain: 0.15 },
    { freq: 659.25, at: 0.32, dur: 0.15, type: 'triangle', gain: 0.15 },
    { freq: 783.99, at: 0.48, dur: 0.4, type: 'triangle', gain: 0.15 },
  ],
};

function playSynth(id: SoundId): void {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;
  const notes = synthRecipes[id];
  const now = audioCtx.currentTime;
  for (const note of notes) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = note.type ?? 'sine';
    osc.frequency.value = note.freq;
    const peak = (note.gain ?? 0.15) * masterVolume;
    const start = now + note.at;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + note.dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + note.dur + 0.05);
  }
}

export function playSound(id: SoundId): void {
  if (muted || typeof window === 'undefined') return;

  const file = soundFiles[id];
  if (file && !missingFiles.has(file)) {
    try {
      const audio = new Audio(file);
      audio.volume = masterVolume;
      audio.play().catch(() => {
        missingFiles.add(file);
        playSynth(id);
      });
      audio.onerror = () => {
        missingFiles.add(file);
        playSynth(id);
      };
      return;
    } catch {
      missingFiles.add(file);
    }
  }
  playSynth(id);
}
