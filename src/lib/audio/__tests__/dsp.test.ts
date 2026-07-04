import {
  PcmData,
  EFFECT,
  changeVolume,
  changeSpeed,
  addEcho,
  reverse,
  pcmToWavSource,
} from '@/lib/audio/dsp';

function pcm(sampleRate: number, samples: number[]): PcmData {
  return { sampleRate, channels: [Float32Array.from(samples)] };
}

describe('changeVolume', () => {
  it('scales every sample by the factor', () => {
    const out = changeVolume(pcm(8000, [0.1, -0.2, 0.4]), EFFECT.volumeUp);
    expect(Array.from(out.channels[0])).toEqual([0.1 * 1.25, -0.2 * 1.25, 0.4 * 1.25].map((n) => Math.fround(n)));
  });

  it('does not mutate the source buffer', () => {
    const src = pcm(8000, [0.5]);
    changeVolume(src, 2);
    expect(src.channels[0][0]).toBe(0.5);
  });
});

describe('changeSpeed', () => {
  it('halves the length at 2x and samples every other frame', () => {
    const out = changeSpeed(pcm(8000, [0, 1, 2, 3]), EFFECT.speedUp);
    expect(out.channels[0].length).toBe(2);
    expect(out.channels[0][0]).toBe(0);
    expect(out.channels[0][1]).toBe(2);
  });

  it('doubles the length at 0.5x with interpolation', () => {
    const out = changeSpeed(pcm(8000, [0, 1, 2, 3]), EFFECT.speedDown);
    expect(out.channels[0].length).toBe(8);
    expect(out.channels[0][0]).toBe(0);
    expect(out.channels[0][1]).toBeCloseTo(0.5); // halfway between 0 and 1
    expect(out.channels[0][2]).toBe(1);
  });
});

describe('addEcho', () => {
  it('lays down decaying feedback repeats at the delay interval', () => {
    // sampleRate 10 + echoTime 0.2 -> delay of 2 samples.
    const out = addEcho(pcm(10, [1, 0, 0]), 0.2, 0.5);
    const ch = out.channels[0];
    expect(ch.length).toBe(3 + 2 * 4);
    expect(ch[0]).toBe(1);
    expect(ch[2]).toBeCloseTo(0.5); // first echo
    expect(ch[4]).toBeCloseTo(0.25); // second echo
    expect(ch[6]).toBeCloseTo(0.125); // third echo
  });
});

describe('reverse', () => {
  it('reverses each channel', () => {
    const out = reverse(pcm(8000, [1, 2, 3, 4]));
    expect(Array.from(out.channels[0])).toEqual([4, 3, 2, 1]);
  });
});

describe('pcmToWavSource', () => {
  it('exposes the AudioBuffer-shaped read view', () => {
    const data = pcm(22050, [0, 1]);
    const src = pcmToWavSource(data);
    expect(src.sampleRate).toBe(22050);
    expect(src.numberOfChannels).toBe(1);
    expect(src.length).toBe(2);
    expect(src.getChannelData(0)[1]).toBe(1);
  });
});
