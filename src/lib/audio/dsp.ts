// Sample-level DSP for Sound Recorder's Effects menu. These are pure functions
// over decoded PCM so they render deterministically and can be unit-tested
// without a Web Audio context; the component wraps the results back into an
// AudioBuffer for playback and WAV export.

import { PcmSource } from './wav';

/** Deinterleaved float PCM: one Float32Array per channel, all the same length. */
export interface PcmData {
  sampleRate: number;
  channels: Float32Array[];
}

// Effect amounts, shared by the component menu and the tests.
export const EFFECT = {
  volumeUp: 1.25,
  volumeDown: 0.8,
  speedUp: 2,
  speedDown: 0.5,
  echoTime: 0.2, // seconds of delay
  echoFeedback: 0.45,
};

function mapChannels(pcm: PcmData, fn: (src: Float32Array) => Float32Array): PcmData {
  return { sampleRate: pcm.sampleRate, channels: pcm.channels.map(fn) };
}

/** Scale amplitude by a constant factor. */
export function changeVolume(pcm: PcmData, factor: number): PcmData {
  return mapChannels(pcm, (src) => {
    const out = new Float32Array(src.length);
    for (let i = 0; i < src.length; i++) out[i] = src[i] * factor;
    return out;
  });
}

/**
 * Resample by `rate` (pitch shifts with tempo, like a tape speed change).
 * rate > 1 shortens the clip; rate < 1 lengthens it. Linear interpolation.
 */
export function changeSpeed(pcm: PcmData, rate: number): PcmData {
  const origLen = pcm.channels[0]?.length ?? 0;
  const newLen = Math.max(1, Math.round(origLen / rate));
  return mapChannels(pcm, (src) => {
    const out = new Float32Array(newLen);
    for (let i = 0; i < newLen; i++) {
      const pos = i * rate;
      const i0 = Math.floor(pos);
      const frac = pos - i0;
      const a = src[i0] ?? 0;
      const b = src[i0 + 1] ?? a;
      out[i] = a + (b - a) * frac;
    }
    return out;
  });
}

/** Feedback echo (comb filter): a decaying series of delayed repeats. */
export function addEcho(
  pcm: PcmData,
  time = EFFECT.echoTime,
  feedback = EFFECT.echoFeedback,
): PcmData {
  const delay = Math.max(1, Math.round(time * pcm.sampleRate));
  const origLen = pcm.channels[0]?.length ?? 0;
  const outLen = origLen + delay * 4;
  return mapChannels(pcm, (src) => {
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      let s = i < origLen ? src[i] : 0;
      if (i >= delay) s += out[i - delay] * feedback;
      out[i] = s;
    }
    return out;
  });
}

/** Reverse every channel in place-safe fashion (returns a new buffer). */
export function reverse(pcm: PcmData): PcmData {
  return mapChannels(pcm, (src) => {
    const out = new Float32Array(src.length);
    const last = src.length - 1;
    for (let i = 0; i < src.length; i++) out[i] = src[last - i];
    return out;
  });
}

/** Adapt a channel-per-array PcmData into the read shape wavEncode expects. */
export function pcmToWavSource(pcm: PcmData): PcmSource {
  return {
    sampleRate: pcm.sampleRate,
    numberOfChannels: pcm.channels.length,
    length: pcm.channels[0]?.length ?? 0,
    getChannelData: (c) => pcm.channels[c],
  };
}

/** Copy an AudioBuffer's samples into a plain PcmData. */
export function audioBufferToPcm(buffer: AudioBuffer): PcmData {
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    // Slice so the PcmData owns its memory independent of the source buffer.
    channels.push(buffer.getChannelData(c).slice());
  }
  return { sampleRate: buffer.sampleRate, channels };
}
