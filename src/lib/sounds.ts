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

// Per-sound overrides (typically data: URLs pulled from the virtual filesystem).
// When set, they take priority over the bundled file for that cue.
const soundOverrides: Partial<Record<SoundId, string>> = {};

let muted = false;
let masterVolume = 0.7;
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let masterPanner: StereoPannerNode | null = null;
let masterBalance = 0; // -1 (left) .. 1 (right)

// Named mixer channels sit between the sources and the master gain, so the
// Volume Control mixer can trim/mute/pan each family of sounds independently:
//   'wave' — MusicPlayer instances (Winamp / Media Player) + mp3/data: cue playback
//   'midi' — the synth-recipe fallbacks in this module
//   'cd'   — reserved for a future CD Player
// Graph:  source → channelGain → channelPanner → masterGain → masterPanner → out
//
// Persistence: the Volume Control app mirrors channel + master-balance state into
// the shared prefs store under the 'mixer' appPref, shaped:
//   mixer: {
//     channels: { wave|midi|cd: { volume: 0..1, muted: bool, balance: -1..1 } },
//     masterBalance: -1..1,
//     columns: { master|wave|midi|cd: bool },   // which mixer columns are shown
//   }
// This module reads that bucket once (lazily) so audio honors saved levels even
// before the mixer window is opened; the mixer keeps it authoritative afterward.
export type SoundChannel = 'wave' | 'midi' | 'cd';
export const SOUND_CHANNELS: SoundChannel[] = ['wave', 'midi', 'cd'];

interface ChannelState {
  volume: number; // 0..1
  muted: boolean;
  balance: number; // -1..1
}

const channelStates: Record<SoundChannel, ChannelState> = {
  wave: { volume: 1, muted: false, balance: 0 },
  midi: { volume: 1, muted: false, balance: 0 },
  cd: { volume: 1, muted: false, balance: 0 },
};

const channelGains: Partial<Record<SoundChannel, GainNode>> = {};
const channelPanners: Partial<Record<SoundChannel, StereoPannerNode>> = {};
let channelsHydrated = false;

// Pull persisted channel/master-balance levels out of the prefs store exactly
// once, so playback matches the mixer even before that window is opened.
function hydrateChannels(): void {
  if (channelsHydrated) return;
  channelsHydrated = true;
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem('win98-prefs-v1');
    if (!raw) return;
    const mixer = JSON.parse(raw)?.mixer;
    if (!mixer) return;
    if (typeof mixer.masterBalance === 'number') masterBalance = clampPan(mixer.masterBalance);
    const channels = mixer.channels ?? {};
    for (const ch of SOUND_CHANNELS) {
      const c = channels[ch];
      if (!c) continue;
      if (typeof c.volume === 'number') channelStates[ch].volume = Math.min(1, Math.max(0, c.volume));
      if (typeof c.muted === 'boolean') channelStates[ch].muted = c.muted;
      if (typeof c.balance === 'number') channelStates[ch].balance = clampPan(c.balance);
    }
  } catch {
    // no prefs / malformed — defaults stand
  }
}

function clampPan(p: number): number {
  return Math.min(1, Math.max(-1, p));
}

/** Point a cue at a custom sound (data: URL or path); pass null to clear it. */
export function setSoundOverride(id: SoundId, url: string | null): void {
  if (url) soundOverrides[id] = url;
  else delete soundOverrides[id];
}

export function getSoundOverride(id: SoundId): string | null {
  return soundOverrides[id] ?? null;
}

function applyMasterGain(): void {
  if (masterGain) masterGain.gain.value = muted ? 0 : masterVolume;
}

export function setSoundsMuted(m: boolean): void {
  muted = m;
  applyMasterGain();
}

export function getSoundsMuted(): boolean {
  return muted;
}

export function setMasterVolume(v: number): void {
  masterVolume = Math.min(1, Math.max(0, v));
  applyMasterGain();
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

// Shared master gain node — the last stage before the speakers for every
// channel, so system volume/mute govern all of them. A master StereoPanner sits
// between it and the destination for the mixer's master Balance control.
export function getMasterGain(): GainNode | null {
  const audioCtx = getAudioContext();
  if (!audioCtx) return null;
  if (!masterGain) {
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : masterVolume;
    if (typeof audioCtx.createStereoPanner === 'function') {
      masterPanner = audioCtx.createStereoPanner();
      masterPanner.pan.value = masterBalance;
      masterGain.connect(masterPanner);
      masterPanner.connect(audioCtx.destination);
    } else {
      masterGain.connect(audioCtx.destination);
    }
  }
  return masterGain;
}

/**
 * Input node for a mixer channel, building its `gain → panner → master` stage
 * on first use. Sources (MusicPlayer, cue playback, synth) connect here so the
 * channel's volume/mute/balance apply before the master stage. Null in jsdom.
 */
export function getChannelGain(ch: SoundChannel): GainNode | null {
  const audioCtx = getAudioContext();
  if (!audioCtx) return null;
  const master = getMasterGain();
  if (!master) return null;
  hydrateChannels();
  let gain = channelGains[ch];
  if (!gain) {
    gain = audioCtx.createGain();
    const state = channelStates[ch];
    gain.gain.value = state.muted ? 0 : state.volume;
    if (typeof audioCtx.createStereoPanner === 'function') {
      const panner = audioCtx.createStereoPanner();
      panner.pan.value = state.balance;
      gain.connect(panner);
      panner.connect(master);
      channelPanners[ch] = panner;
    } else {
      gain.connect(master);
    }
    channelGains[ch] = gain;
  }
  return gain;
}

function applyChannelGain(ch: SoundChannel): void {
  const gain = channelGains[ch];
  if (gain) {
    const state = channelStates[ch];
    gain.gain.value = state.muted ? 0 : state.volume;
  }
}

export function setChannelVolume(ch: SoundChannel, v: number): void {
  hydrateChannels();
  channelStates[ch].volume = Math.min(1, Math.max(0, v));
  applyChannelGain(ch);
}

export function setChannelMuted(ch: SoundChannel, m: boolean): void {
  hydrateChannels();
  channelStates[ch].muted = m;
  applyChannelGain(ch);
}

export function setChannelBalance(ch: SoundChannel, pan: number): void {
  hydrateChannels();
  const clamped = clampPan(pan);
  channelStates[ch].balance = clamped;
  const panner = channelPanners[ch];
  if (panner) panner.pan.value = clamped;
}

/** Snapshot of every channel's volume/mute/balance (safe to read/mutate). */
export function getChannelState(): Record<SoundChannel, ChannelState> {
  hydrateChannels();
  return {
    wave: { ...channelStates.wave },
    midi: { ...channelStates.midi },
    cd: { ...channelStates.cd },
  };
}

export function setMasterBalance(pan: number): void {
  masterBalance = clampPan(pan);
  if (masterPanner) masterPanner.pan.value = masterBalance;
}

export function getMasterBalance(): number {
  return masterBalance;
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
  // Synth recipes are the 'midi' family; the channel + master gains apply
  // volume, so per-note gains stay at their raw levels.
  const dest: AudioNode = getChannelGain('midi') ?? getMasterGain() ?? audioCtx.destination;
  const notes = synthRecipes[id];
  const now = audioCtx.currentTime;
  for (const note of notes) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = note.type ?? 'sine';
    osc.frequency.value = note.freq;
    const peak = note.gain ?? 0.15;
    const start = now + note.at;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + note.dur);
    osc.connect(gain).connect(dest);
    osc.start(start);
    osc.stop(start + note.dur + 0.05);
  }
}

// Play a file/data: cue through the 'wave' channel. When Web Audio is available
// the element is wired into the channel graph (so channel + master volume/mute/
// balance all apply); otherwise it falls back to the element's own volume.
function playWaveFile(url: string, onFail: () => void): boolean {
  try {
    const audio = new Audio(url);
    let routed = false;
    const audioCtx = getAudioContext();
    const waveGain = getChannelGain('wave');
    if (audioCtx && waveGain) {
      try {
        const srcNode = audioCtx.createMediaElementSource(audio);
        srcNode.connect(waveGain);
        audio.addEventListener('ended', () => {
          try {
            srcNode.disconnect();
          } catch {
            // already torn down
          }
        });
        routed = true;
      } catch {
        routed = false;
      }
    }
    // When routed, the channel + master gains carry the level; otherwise the
    // element's own volume stands in for the master gain.
    audio.volume = routed ? 1 : masterVolume;
    audio.play().catch(onFail);
    audio.onerror = onFail;
    return true;
  } catch {
    return false;
  }
}

export function playSound(id: SoundId): void {
  if (muted || typeof window === 'undefined') return;

  const file = soundOverrides[id] ?? soundFiles[id];
  if (file && !missingFiles.has(file)) {
    const started = playWaveFile(file, () => {
      missingFiles.add(file);
      playSynth(id);
    });
    if (started) return;
    missingFiles.add(file);
  }
  playSynth(id);
}
