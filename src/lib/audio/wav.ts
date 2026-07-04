// 16-bit PCM WAV encoder. Turns decoded audio (an AudioBuffer, or anything
// exposing the same channel-data shape) into a canonical RIFF/WAVE byte stream
// and, from there, into a base64 `data:` URL that the virtual filesystem can
// store so Sound Recorder clips survive a reopen.

/**
 * Minimal read view over decoded audio. AudioBuffer satisfies this directly,
 * and tests can hand-roll one without a Web Audio context.
 */
export interface PcmSource {
  sampleRate: number;
  numberOfChannels: number;
  length: number;
  getChannelData(channel: number): Float32Array;
}

const HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;

function writeString(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

/** Encode PCM audio into a 16-bit WAV byte buffer (RIFF little-endian). */
export function wavEncode(source: PcmSource): ArrayBuffer {
  const channels = Math.max(1, source.numberOfChannels);
  const { sampleRate, length } = source;
  const blockAlign = channels * BYTES_PER_SAMPLE;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(HEADER_BYTES + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // chunk size = 36 + Subchunk2Size
  writeString(view, 8, 'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size for PCM
  view.setUint16(20, 1, true); // AudioFormat = PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample

  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels and convert float [-1, 1] to signed 16-bit.
  const chData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) chData.push(source.getChannelData(c));
  let offset = HEADER_BYTES;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, chData[c][i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += BYTES_PER_SAMPLE;
    }
  }

  return buffer;
}

/** Base64-encode raw bytes without blowing the call stack on large buffers. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Encode PCM audio to a `data:audio/wav;base64,...` URL. */
export function wavToDataUrl(source: PcmSource): string {
  const bytes = new Uint8Array(wavEncode(source));
  return `data:audio/wav;base64,${bytesToBase64(bytes)}`;
}
