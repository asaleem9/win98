#!/usr/bin/env node
// Generates all bundled audio assets: system sounds in public/sounds and
// music tracks in public/music. Everything is synthesized from scratch —
// 16-bit PCM WAV, era-appropriate lo-fi. Run: node scripts/generate-audio.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SFX_RATE = 22050;
const MUSIC_RATE = 22050;

function writeWav(path, samples, rate) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  console.log(`wrote ${path} (${(buf.length / 1024).toFixed(0)} KB)`);
}

function osc(type, phase) {
  const t = phase % 1;
  switch (type) {
    case 'sine': return Math.sin(2 * Math.PI * t);
    case 'square': return t < 0.5 ? 1 : -1;
    case 'sawtooth': return 2 * t - 1;
    case 'triangle': return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
    case 'noise': return Math.random() * 2 - 1;
    default: return 0;
  }
}

// Renders notes: {freq, at, dur, type, gain, attack?, glideTo?}
function render(notes, lengthSec, rate) {
  const out = new Float64Array(Math.ceil(lengthSec * rate));
  for (const note of notes) {
    const start = Math.floor(note.at * rate);
    const len = Math.floor(note.dur * rate);
    const attack = Math.max(1, Math.floor((note.attack ?? 0.008) * rate));
    let phase = 0;
    for (let i = 0; i < len && start + i < out.length; i++) {
      const frac = i / len;
      const freq = note.glideTo ? note.freq + (note.glideTo - note.freq) * frac : note.freq;
      phase += freq / rate;
      let env;
      if (i < attack) env = i / attack;
      else env = Math.exp(-3.5 * ((i - attack) / (len - attack || 1)));
      out[start + i] += osc(note.type ?? 'sine', phase) * (note.gain ?? 0.2) * env;
    }
  }
  // soft clip
  return Array.from(out, (s) => Math.tanh(s));
}

const N = (name) => {
  // note name to freq: C4 = 261.63
  const m = /^([A-G])(#?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, (semis - 9) / 12 + (Number(m[3]) - 4));
};

// ---------- System sounds ----------
const sfx = {
  'startup': [
    { freq: N('D4'), at: 0, dur: 3.2, type: 'sine', gain: 0.3, attack: 0.4 },
    { freq: N('A4'), at: 0.15, dur: 3.05, type: 'sine', gain: 0.24, attack: 0.4 },
    { freq: N('D5'), at: 0.35, dur: 2.85, type: 'sine', gain: 0.2, attack: 0.35 },
    { freq: N('F#5'), at: 0.6, dur: 2.6, type: 'sine', gain: 0.14, attack: 0.3 },
    { freq: N('A5'), at: 0.9, dur: 2.3, type: 'sine', gain: 0.1, attack: 0.3 },
    { freq: N('D3'), at: 0, dur: 3.2, type: 'triangle', gain: 0.12, attack: 0.5 },
  ],
  'shutdown': [
    { freq: N('A5'), at: 0, dur: 0.9, type: 'sine', gain: 0.22, attack: 0.05 },
    { freq: N('E5'), at: 0.45, dur: 0.9, type: 'sine', gain: 0.22, attack: 0.05 },
    { freq: N('C5'), at: 0.9, dur: 1.0, type: 'sine', gain: 0.22, attack: 0.05 },
    { freq: N('G4'), at: 1.35, dur: 1.6, type: 'sine', gain: 0.24, attack: 0.08 },
    { freq: N('G3'), at: 1.35, dur: 1.6, type: 'triangle', gain: 0.1, attack: 0.1 },
  ],
  'error': [
    { freq: 622, at: 0, dur: 0.14, type: 'square', gain: 0.09 },
    { freq: 415, at: 0.15, dur: 0.26, type: 'square', gain: 0.09 },
  ],
  'chord': [
    { freq: N('A4'), at: 0, dur: 0.5, type: 'triangle', gain: 0.18 },
    { freq: N('C#5'), at: 0, dur: 0.5, type: 'triangle', gain: 0.14 },
    { freq: N('E5'), at: 0, dur: 0.5, type: 'triangle', gain: 0.14 },
  ],
  'ding': [{ freq: 830, at: 0, dur: 0.4, type: 'sine', gain: 0.25 }],
  'exclamation': [
    { freq: 700, at: 0, dur: 0.16, type: 'sine', gain: 0.22 },
    { freq: 932, at: 0.17, dur: 0.3, type: 'sine', gain: 0.22 },
  ],
  'menu-open': [{ freq: 1250, at: 0, dur: 0.05, type: 'sine', gain: 0.08 }],
  'menu-click': [{ freq: 950, at: 0, dur: 0.045, type: 'sine', gain: 0.08 }],
  'minimize': [{ freq: 720, at: 0, dur: 0.16, type: 'sine', gain: 0.12, glideTo: 400 }],
  'maximize': [{ freq: 420, at: 0, dur: 0.16, type: 'sine', gain: 0.12, glideTo: 740 }],
  'restore': [{ freq: 620, at: 0, dur: 0.14, type: 'sine', gain: 0.12, glideTo: 500 }],
  'recycle': [
    { freq: 320, at: 0, dur: 0.1, type: 'triangle', gain: 0.18 },
    { freq: 210, at: 0.1, dur: 0.18, type: 'triangle', gain: 0.18 },
  ],
  'empty-bin': [
    { freq: 500, at: 0, dur: 0.35, type: 'noise', gain: 0.12 },
    { freq: 240, at: 0.05, dur: 0.12, type: 'sawtooth', gain: 0.07 },
    { freq: 150, at: 0.2, dur: 0.2, type: 'sawtooth', gain: 0.07 },
  ],
  'notify': [
    { freq: 880, at: 0, dur: 0.13, type: 'sine', gain: 0.18 },
    { freq: 1109, at: 0.15, dur: 0.24, type: 'sine', gain: 0.18 },
  ],
  'aim-door-open': [
    { freq: 130, at: 0, dur: 0.35, type: 'sawtooth', gain: 0.1, glideTo: 260 },
    { freq: 800, at: 0.3, dur: 0.06, type: 'noise', gain: 0.08 },
  ],
  'aim-door-close': [
    { freq: 260, at: 0, dur: 0.3, type: 'sawtooth', gain: 0.1, glideTo: 110 },
    { freq: 400, at: 0.28, dur: 0.1, type: 'noise', gain: 0.14 },
  ],
  'aim-message': [
    { freq: N('C6'), at: 0, dur: 0.1, type: 'sine', gain: 0.18 },
    { freq: N('E6'), at: 0.11, dur: 0.18, type: 'sine', gain: 0.18 },
  ],
  'youve-got-mail': [
    { freq: N('C5'), at: 0, dur: 0.16, type: 'triangle', gain: 0.2 },
    { freq: N('E5'), at: 0.17, dur: 0.16, type: 'triangle', gain: 0.2 },
    { freq: N('G5'), at: 0.34, dur: 0.35, type: 'triangle', gain: 0.2 },
  ],
  'modem-dial': (() => {
    const notes = [
      { freq: 350, at: 0, dur: 0.7, type: 'sine', gain: 0.1 },
      { freq: 440, at: 0, dur: 0.7, type: 'sine', gain: 0.1 },
    ];
    // DTMF digits
    const dtmf = [[697,1209],[770,1336],[852,1477],[697,1336],[770,1209],[941,1336],[852,1209]];
    dtmf.forEach((pair, i) => {
      const at = 0.85 + i * 0.16;
      notes.push({ freq: pair[0], at, dur: 0.09, type: 'sine', gain: 0.12 });
      notes.push({ freq: pair[1], at, dur: 0.09, type: 'sine', gain: 0.12 });
    });
    // handshake screech
    notes.push({ freq: 2100, at: 2.2, dur: 0.7, type: 'sine', gain: 0.09 });
    notes.push({ freq: 1300, at: 2.9, dur: 0.5, type: 'square', gain: 0.035 });
    notes.push({ freq: 2250, at: 3.0, dur: 0.9, type: 'sawtooth', gain: 0.03 });
    notes.push({ freq: 1000, at: 3.4, dur: 1.2, type: 'noise', gain: 0.05 });
    return notes;
  })(),
  'mine-explosion': [
    { freq: 160, at: 0, dur: 0.35, type: 'sawtooth', gain: 0.22, glideTo: 60 },
    { freq: 900, at: 0, dur: 0.4, type: 'noise', gain: 0.18 },
  ],
  'mine-win': [
    { freq: N('C5'), at: 0, dur: 0.13, type: 'square', gain: 0.09 },
    { freq: N('E5'), at: 0.14, dur: 0.13, type: 'square', gain: 0.09 },
    { freq: N('G5'), at: 0.28, dur: 0.13, type: 'square', gain: 0.09 },
    { freq: N('C6'), at: 0.42, dur: 0.35, type: 'square', gain: 0.09 },
  ],
  'card-flip': [{ freq: 2200, at: 0, dur: 0.035, type: 'triangle', gain: 0.1 }],
  'card-win': [
    { freq: N('G4'), at: 0, dur: 0.16, type: 'triangle', gain: 0.18 },
    { freq: N('C5'), at: 0.17, dur: 0.16, type: 'triangle', gain: 0.18 },
    { freq: N('E5'), at: 0.34, dur: 0.16, type: 'triangle', gain: 0.18 },
    { freq: N('G5'), at: 0.51, dur: 0.45, type: 'triangle', gain: 0.18 },
  ],
};

for (const [name, notes] of Object.entries(sfx)) {
  const length = Math.max(...notes.map((n) => n.at + n.dur)) + 0.1;
  writeWav(join(ROOT, 'public', 'sounds', `${name}.wav`), render(notes, length, SFX_RATE), SFX_RATE);
}

// ---------- Music tracks ----------
// Each track: scale, tempo, waveforms, and seeded pseudo-random melody so the
// output is deterministic. ~64 bars of 4 beats, with bass + lead + arp.

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTrack({ seed, bpm, rootNote, mode, bars, leadWave, bassWave, arpWave, swing = 0 }) {
  const rand = mulberry32(seed);
  const beat = 60 / bpm;
  const scales = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    major: [0, 2, 4, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    pentMinor: [0, 3, 5, 7, 10],
  };
  const scale = scales[mode];
  const root = N(rootNote);
  const deg = (d, oct = 0) => root * Math.pow(2, (scale[((d % scale.length) + scale.length) % scale.length] + 12 * (oct + Math.floor(d / scale.length))) / 12);

  const progression = [0, 5, 3, 4]; // i - VI - iv - v flavored
  const notes = [];

  for (let bar = 0; bar < bars; bar++) {
    const chordDeg = progression[bar % progression.length];
    const barAt = bar * 4 * beat;

    // bass: root eighth notes
    for (let e = 0; e < 8; e++) {
      const at = barAt + e * beat * 0.5 + (e % 2 ? swing * beat : 0);
      notes.push({ freq: deg(chordDeg, -2), at, dur: beat * 0.45, type: bassWave, gain: 0.13 });
    }
    // arp: chord tones sixteenths on alternating bars
    if (bar % 2 === 0) {
      for (let s = 0; s < 16; s++) {
        const tone = [0, 2, 4, 2][s % 4];
        notes.push({ freq: deg(chordDeg + tone, 0), at: barAt + s * beat * 0.25, dur: beat * 0.2, type: arpWave, gain: 0.055 });
      }
    }
    // lead: wandering melody, quarter/eighth mix
    let melodyDeg = chordDeg + 7;
    let t = 0;
    while (t < 4) {
      const dur = rand() < 0.4 ? 1 : 0.5;
      if (rand() < 0.82) {
        notes.push({ freq: deg(melodyDeg, 0), at: barAt + t * beat, dur: beat * dur * 0.9, type: leadWave, gain: 0.11 });
      }
      melodyDeg += Math.floor(rand() * 5) - 2;
      melodyDeg = Math.max(chordDeg + 4, Math.min(chordDeg + 11, melodyDeg));
      t += dur;
    }
    // percussion: noise hats + kick-ish thump
    for (let e = 0; e < 4; e++) {
      notes.push({ freq: 5000, at: barAt + e * beat + beat * 0.5, dur: 0.03, type: 'noise', gain: 0.05 });
      if (e === 0 || e === 2) notes.push({ freq: 120, at: barAt + e * beat, dur: 0.09, type: 'sine', gain: 0.2, glideTo: 45 });
    }
  }
  const length = bars * 4 * beat + 0.5;
  return render(notes, length, MUSIC_RATE);
}

const tracks = [
  { file: 'dial-up-dreams', seed: 1998, bpm: 112, rootNote: 'A2', mode: 'minor', bars: 40, leadWave: 'square', bassWave: 'triangle', arpWave: 'square' },
  { file: 'y2k-panic', seed: 2000, bpm: 140, rootNote: 'E2', mode: 'pentMinor', bars: 48, leadWave: 'sawtooth', bassWave: 'square', arpWave: 'triangle' },
  { file: 'midnight-midi', seed: 42, bpm: 96, rootNote: 'D2', mode: 'dorian', bars: 36, leadWave: 'triangle', bassWave: 'triangle', arpWave: 'sine', swing: 0.08 },
  { file: 'compuserve-sunset', seed: 777, bpm: 84, rootNote: 'C3', mode: 'major', bars: 32, leadWave: 'sine', bassWave: 'triangle', arpWave: 'triangle', swing: 0.05 },
  { file: 'screensaver-groove', seed: 305, bpm: 120, rootNote: 'G2', mode: 'minor', bars: 44, leadWave: 'square', bassWave: 'sawtooth', arpWave: 'square' },
  { file: 'pentium-power', seed: 586, bpm: 132, rootNote: 'B2', mode: 'pentMinor', bars: 44, leadWave: 'sawtooth', bassWave: 'triangle', arpWave: 'square' },
];

for (const t of tracks) {
  writeWav(join(ROOT, 'public', 'music', `${t.file}.wav`), makeTrack(t), MUSIC_RATE);
}

console.log('done');
