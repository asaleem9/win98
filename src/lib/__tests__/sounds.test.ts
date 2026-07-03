import {
  playSound,
  setSoundsMuted,
  getSoundsMuted,
  setMasterVolume,
  getMasterVolume,
  getAudioContext,
  getMasterGain,
  setSoundOverride,
  getSoundOverride,
} from '@/lib/sounds';

describe('sounds', () => {
  afterEach(() => {
    setSoundsMuted(false);
    setMasterVolume(0.7);
    setSoundOverride('ding', null);
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

  it('getMasterGain returns null without an AudioContext', () => {
    // With no AudioContext there is no gain graph to build
    expect(getMasterGain()).toBeNull();
  });

  it('sound overrides round-trip and clear with null', () => {
    expect(getSoundOverride('ding')).toBeNull();
    setSoundOverride('ding', 'data:audio/wav;base64,AAAA');
    expect(getSoundOverride('ding')).toBe('data:audio/wav;base64,AAAA');
    setSoundOverride('ding', null);
    expect(getSoundOverride('ding')).toBeNull();
  });

  it('plays an overridden cue without throwing', () => {
    setSoundOverride('ding', 'data:audio/wav;base64,AAAA');
    expect(() => playSound('ding')).not.toThrow();
  });
});
