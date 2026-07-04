// Web Audio for the Phone Dialer, built on the public sounds.ts context/master
// exports. Every function degrades to a no-op when Web Audio is unavailable
// (jsdom), so the component stays testable and never throws.

import { getAudioContext, getMasterGain } from '@/lib/sounds';
import { dtmfFrequencies, BUSY_TONES } from './dialerLogic';

/** Sound a single key's dual-sine DTMF tone. No-op off a keypad key. */
export function playDtmf(key: string, durationMs = 160): void {
  const pair = dtmfFrequencies(key);
  const ctx = getAudioContext();
  if (!pair || !ctx) return;
  const dest: AudioNode = getMasterGain() ?? ctx.destination;
  const now = ctx.currentTime;
  const dur = durationMs / 1000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.008);
  gain.gain.setValueAtTime(0.16, now + Math.max(0.02, dur - 0.03));
  gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
  gain.connect(dest);

  for (const freq of pair) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }
}

/** Continuous dial tone (350 + 440 Hz). Returns a stopper. */
export function playDialTone(): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};
  const dest: AudioNode = getMasterGain() ?? ctx.destination;
  const gain = ctx.createGain();
  gain.gain.value = 0.09;
  gain.connect(dest);
  const oscs = [350, 440].map((f) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    osc.connect(gain);
    osc.start();
    return osc;
  });
  return () => stopChain(ctx, gain, oscs);
}

/** Looping busy signal (480 + 620 Hz, 0.5s on / 0.5s off). Returns a stopper. */
export function startBusySignal(cycles = 30): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => {};
  const dest: AudioNode = getMasterGain() ?? ctx.destination;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);
  const oscs = BUSY_TONES.map((f) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    osc.connect(gain);
    osc.start();
    return osc;
  });
  const t0 = ctx.currentTime;
  for (let i = 0; i < cycles; i++) {
    gain.gain.setValueAtTime(i % 2 === 0 ? 0.11 : 0, t0 + i * 0.5);
  }
  return () => stopChain(ctx, gain, oscs);
}

function stopChain(ctx: AudioContext, gain: GainNode, oscs: OscillatorNode[]): void {
  try {
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    for (const osc of oscs) osc.stop();
    gain.disconnect();
  } catch {
    // already stopped
  }
}
