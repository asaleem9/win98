import {
  SOUND_CHANNELS,
  getChannelState,
  getChannelGain,
  setChannelVolume,
  setChannelMuted,
  setChannelBalance,
  getMasterBalance,
  setMasterBalance,
} from '@/lib/sounds';

// NOTE: the sound module hydrates channel levels from localStorage exactly once,
// on first channel access. This test file must run its hydration case before any
// other channel touch, so it lives first and seeds storage inside the test.
describe('channel hydration (must run first)', () => {
  it('reads persisted channel + master-balance levels from the mixer pref', () => {
    window.localStorage.setItem(
      'win98-prefs-v1',
      JSON.stringify({
        mixer: {
          channels: {
            wave: { volume: 0.5, muted: true, balance: -0.3 },
            midi: { volume: 0.25 },
          },
          masterBalance: 0.4,
        },
      }),
    );
    const state = getChannelState();
    expect(state.wave.volume).toBe(0.5);
    expect(state.wave.muted).toBe(true);
    expect(state.wave.balance).toBeCloseTo(-0.3);
    expect(state.midi.volume).toBe(0.25);
    expect(getMasterBalance()).toBeCloseTo(0.4);
  });
});

describe('channel state', () => {
  it('lists the wave/midi/cd channels', () => {
    expect(SOUND_CHANNELS).toEqual(['wave', 'midi', 'cd']);
  });

  it('clamps and round-trips volume', () => {
    setChannelVolume('cd', 2);
    expect(getChannelState().cd.volume).toBe(1);
    setChannelVolume('cd', -1);
    expect(getChannelState().cd.volume).toBe(0);
    setChannelVolume('cd', 0.6);
    expect(getChannelState().cd.volume).toBeCloseTo(0.6);
  });

  it('round-trips mute per channel', () => {
    setChannelMuted('midi', true);
    expect(getChannelState().midi.muted).toBe(true);
    setChannelMuted('midi', false);
    expect(getChannelState().midi.muted).toBe(false);
  });

  it('clamps channel balance to [-1, 1]', () => {
    setChannelBalance('wave', -5);
    expect(getChannelState().wave.balance).toBe(-1);
    setChannelBalance('wave', 5);
    expect(getChannelState().wave.balance).toBe(1);
  });

  it('returns an isolated snapshot (mutating it does not leak back)', () => {
    const snap = getChannelState();
    snap.wave.volume = 0.123;
    expect(getChannelState().wave.volume).not.toBe(0.123);
  });

  it('has no channel gain node without a Web Audio context (jsdom)', () => {
    expect(getChannelGain('wave')).toBeNull();
  });
});

describe('master balance', () => {
  it('clamps and round-trips', () => {
    setMasterBalance(2);
    expect(getMasterBalance()).toBe(1);
    setMasterBalance(-2);
    expect(getMasterBalance()).toBe(-1);
    setMasterBalance(0);
    expect(getMasterBalance()).toBe(0);
  });
});
