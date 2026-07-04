// Self-contained sound for the raycaster. Every cue is synthesized with a few
// oscillators and the odd noise burst — no asset files. Output is routed through
// the shared master gain from the system sound layer (read-only), so the OS
// volume slider and mute still govern it. Under jsdom there is no AudioContext,
// so getAudioContext() returns null and every call quietly no-ops.

import { getAudioContext, getMasterGain, getSoundsMuted } from '@/lib/sounds';

// A modest ceiling so a firefight never drowns out the desktop.
const MASTER = 0.5;

interface Wire {
  ac: AudioContext;
  dest: AudioNode;
  now: number;
}

function wire(): Wire | null {
  if (getSoundsMuted()) return null;
  const ac = getAudioContext();
  const master = getMasterGain();
  if (!ac || !master) return null;
  return { ac, dest: master, now: ac.currentTime };
}

// A single enveloped oscillator, optionally gliding from `freq` to `glideTo`.
function tone(
  w: Wire,
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; at?: number; glideTo?: number } = {},
): void {
  const { type = 'sine', gain = 0.15, at = 0, glideTo } = opts;
  const osc = w.ac.createOscillator();
  const g = w.ac.createGain();
  const start = w.now + at;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain * MASTER, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(g).connect(w.dest);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

// Filtered white-noise burst — used for door hiss, hurt and explosions.
function noise(w: Wire, dur: number, opts: { gain?: number; at?: number; freq?: number; q?: number; type?: BiquadFilterType } = {}): void {
  const { gain = 0.12, at = 0, freq = 1200, q = 0.7, type = 'bandpass' } = opts;
  const start = w.now + at;
  const len = Math.max(1, Math.floor(w.ac.sampleRate * dur));
  const buffer = w.ac.createBuffer(1, len, w.ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = w.ac.createBufferSource();
  src.buffer = buffer;
  const filter = w.ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = w.ac.createGain();
  g.gain.setValueAtTime(gain * MASTER, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  src.connect(filter).connect(g).connect(w.dest);
  src.start(start);
  src.stop(start + dur + 0.02);
}

// -- cues --------------------------------------------------------------------

/** The player's blaster: a bright downward energy zap. */
export function sfxBlaster(): void {
  const w = wire();
  if (!w) return;
  tone(w, 900, 0.16, { type: 'square', gain: 0.12, glideTo: 180 });
  tone(w, 1400, 0.1, { type: 'sawtooth', gain: 0.06, glideTo: 300 });
}

/** An enemy shot — grittier and lower than the player's. */
export function sfxEnemyShot(): void {
  const w = wire();
  if (!w) return;
  tone(w, 320, 0.14, { type: 'sawtooth', gain: 0.09, glideTo: 90 });
  noise(w, 0.08, { gain: 0.05, freq: 800 });
}

export function sfxNoAmmo(): void {
  const w = wire();
  if (!w) return;
  tone(w, 200, 0.06, { type: 'square', gain: 0.06 });
  tone(w, 150, 0.06, { type: 'square', gain: 0.06, at: 0.07 });
}

/** Pneumatic door — a rising hiss with a mechanical thunk. */
export function sfxDoor(): void {
  const w = wire();
  if (!w) return;
  noise(w, 0.4, { gain: 0.08, freq: 600, q: 1.2 });
  tone(w, 140, 0.3, { type: 'triangle', gain: 0.08, glideTo: 220 });
}

export function sfxDoorLocked(): void {
  const w = wire();
  if (!w) return;
  tone(w, 160, 0.12, { type: 'square', gain: 0.1 });
  noise(w, 0.06, { gain: 0.05, freq: 400, at: 0.02 });
}

export function sfxPickup(kind: 'health' | 'ammo' | 'key' | 'treasure'): void {
  const w = wire();
  if (!w) return;
  switch (kind) {
    case 'health':
      tone(w, 660, 0.1, { type: 'sine', gain: 0.14 });
      tone(w, 880, 0.14, { type: 'sine', gain: 0.14, at: 0.09 });
      break;
    case 'ammo':
      tone(w, 520, 0.08, { type: 'triangle', gain: 0.12 });
      tone(w, 780, 0.08, { type: 'triangle', gain: 0.1, at: 0.06 });
      break;
    case 'key':
      tone(w, 784, 0.1, { type: 'square', gain: 0.1 });
      tone(w, 1046, 0.16, { type: 'square', gain: 0.1, at: 0.09 });
      break;
    case 'treasure':
      [523, 659, 784, 1046].forEach((f, i) => tone(w, f, 0.14, { type: 'triangle', gain: 0.11, at: i * 0.07 }));
      break;
  }
}

export function sfxAlert(): void {
  const w = wire();
  if (!w) return;
  tone(w, 300, 0.1, { type: 'square', gain: 0.08, glideTo: 520 });
}

export function sfxHurt(): void {
  const w = wire();
  if (!w) return;
  tone(w, 220, 0.16, { type: 'square', gain: 0.12, glideTo: 120 });
  noise(w, 0.1, { gain: 0.06, freq: 500 });
}

/** Destroying a robot: a short crumpling explosion. */
export function sfxEnemyDown(): void {
  const w = wire();
  if (!w) return;
  noise(w, 0.35, { gain: 0.12, freq: 300, q: 0.5, type: 'lowpass' });
  tone(w, 160, 0.3, { type: 'sawtooth', gain: 0.08, glideTo: 60 });
}

export function sfxDeath(): void {
  const w = wire();
  if (!w) return;
  [440, 349, 262, 175].forEach((f, i) => tone(w, f, 0.4, { type: 'sawtooth', gain: 0.12, at: i * 0.18, glideTo: f * 0.6 }));
}

export function sfxSecret(): void {
  const w = wire();
  if (!w) return;
  [659, 880].forEach((f, i) => tone(w, f, 0.18, { type: 'sine', gain: 0.1, at: i * 0.1 }));
}

export function sfxLevelComplete(): void {
  const w = wire();
  if (!w) return;
  [523, 659, 784, 1046, 1318].forEach((f, i) => tone(w, f, 0.24, { type: 'triangle', gain: 0.12, at: i * 0.12 }));
}

export function sfxVictory(): void {
  const w = wire();
  if (!w) return;
  const seq = [523, 659, 784, 659, 784, 1046, 1318];
  seq.forEach((f, i) => tone(w, f, 0.3, { type: 'square', gain: 0.1, at: i * 0.16 }));
  seq.forEach((f, i) => tone(w, f * 0.5, 0.3, { type: 'triangle', gain: 0.06, at: i * 0.16 }));
}

export function sfxExit(): void {
  const w = wire();
  if (!w) return;
  tone(w, 400, 0.5, { type: 'sine', gain: 0.1, glideTo: 900 });
}
