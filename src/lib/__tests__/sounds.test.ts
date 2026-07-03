import { playSound, setSoundsMuted, getSoundsMuted, setMasterVolume, getMasterVolume, getAudioContext } from '@/lib/sounds';

describe('sounds', () => {
  afterEach(() => {
    setSoundsMuted(false);
    setMasterVolume(0.7);
  });

  it('does not throw in jsdom (no AudioContext, stub Audio)', () => {
    expect(() => playSound('ding')).not.toThrow();
    expect(() => playSound('startup')).not.toThrow();
  });

  it('mute state round-trips and short-circuits playback', () => {
    setSoundsMuted(true);
    expect(getSoundsMuted()).toBe(true);
    expect(() => playSound('error')).not.toThrow();
    setSoundsMuted(false);
    expect(getSoundsMuted()).toBe(false);
  });

  it('clamps master volume to [0, 1]', () => {
    setMasterVolume(2);
    expect(getMasterVolume()).toBe(1);
    setMasterVolume(-1);
    expect(getMasterVolume()).toBe(0);
  });

  it('getAudioContext returns null when the API is unavailable', () => {
    // jsdom has no AudioContext
    expect(getAudioContext()).toBeNull();
  });
});
