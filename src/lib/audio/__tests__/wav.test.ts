import { wavEncode, wavToDataUrl, bytesToBase64, PcmSource } from '@/lib/audio/wav';

function readAscii(view: DataView, offset: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

function mono(sampleRate: number, samples: number[]): PcmSource {
  const data = Float32Array.from(samples);
  return { sampleRate, numberOfChannels: 1, length: samples.length, getChannelData: () => data };
}

describe('wavEncode', () => {
  it('writes a correct 44-byte RIFF/WAVE/fmt/data header', () => {
    const buf = wavEncode(mono(8000, [0, 0.5, -0.5, 1]));
    const view = new DataView(buf);
    const dataSize = 4 * 1 * 2; // frames * channels * bytesPerSample

    expect(buf.byteLength).toBe(44 + dataSize);
    expect(readAscii(view, 0, 4)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(36 + dataSize);
    expect(readAscii(view, 8, 4)).toBe('WAVE');
    expect(readAscii(view, 12, 4)).toBe('fmt ');
    expect(view.getUint32(16, true)).toBe(16); // PCM fmt chunk size
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // channels
    expect(view.getUint32(24, true)).toBe(8000); // sample rate
    expect(view.getUint32(28, true)).toBe(8000 * 2); // byte rate
    expect(view.getUint16(32, true)).toBe(2); // block align
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(readAscii(view, 36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(dataSize);
  });

  it('quantizes float samples to signed 16-bit PCM', () => {
    const view = new DataView(wavEncode(mono(8000, [0, 0.5, -0.5, 1])));
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(Math.trunc(0.5 * 0x7fff));
    expect(view.getInt16(48, true)).toBe(-0.5 * 0x8000);
    expect(view.getInt16(50, true)).toBe(0x7fff);
  });

  it('clamps out-of-range samples', () => {
    const view = new DataView(wavEncode(mono(8000, [2, -2])));
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
  });

  it('interleaves stereo frames with the right block align', () => {
    const left = Float32Array.from([1, 0]);
    const right = Float32Array.from([-1, 0]);
    const src: PcmSource = {
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 2,
      getChannelData: (c) => (c === 0 ? left : right),
    };
    const buf = wavEncode(src);
    const view = new DataView(buf);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint16(32, true)).toBe(4); // block align = 2ch * 2 bytes
    expect(view.getUint32(40, true)).toBe(2 * 4);
    // First frame interleaves L then R.
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
  });
});

describe('wavToDataUrl', () => {
  it('produces a decodable base64 data URL that round-trips the bytes', () => {
    const url = wavToDataUrl(mono(8000, [0, 0.25, -0.25]));
    expect(url.startsWith('data:audio/wav;base64,')).toBe(true);
    const b64 = url.slice('data:audio/wav;base64,'.length);
    const decoded = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const view = new DataView(decoded.buffer);
    expect(readAscii(view, 0, 4)).toBe('RIFF');
    expect(readAscii(view, 8, 4)).toBe('WAVE');
    expect(decoded.byteLength).toBe(44 + 3 * 2);
  });

  it('bytesToBase64 matches atob inverse for a big buffer', () => {
    const bytes = new Uint8Array(70000);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
    const round = Uint8Array.from(atob(bytesToBase64(bytes)), (c) => c.charCodeAt(0));
    expect(round.length).toBe(bytes.length);
    expect(round[0]).toBe(0);
    expect(round[257]).toBe(1);
  });
});
