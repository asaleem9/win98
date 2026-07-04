import { MusicPlayer, EQ_FREQUENCIES, EQ_BAND_COUNT, EQ_PRESETS } from '@/lib/audio/player';
import { musicTracks } from '@/lib/audio/tracks';

describe('EQ constants', () => {
  it('exposes the ten classic Winamp band frequencies', () => {
    expect(EQ_FREQUENCIES).toEqual([60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000]);
    expect(EQ_BAND_COUNT).toBe(10);
  });

  it('ships Flat/Rock/Techno/Classical presets, each with one gain per band', () => {
    for (const name of ['Flat', 'Rock', 'Techno', 'Classical']) {
      expect(EQ_PRESETS[name]).toHaveLength(EQ_BAND_COUNT);
    }
    expect(EQ_PRESETS.Flat.every((g) => g === 0)).toBe(true);
  });
});

describe('MusicPlayer', () => {
  // jsdom has no AudioContext, so the graph is never built — the point here is
  // that every control degrades gracefully instead of throwing.
  it('tolerates all controls without a Web Audio context', () => {
    const p = new MusicPlayer();
    expect(() => {
      p.load(musicTracks[0]);
      p.setVolume(0.5);
      p.setBalance(-0.5);
      p.setEqEnabled(true);
      p.setEqBand(0, 6);
      p.setEqBand(99, 6); // out of range, ignored
      p.setEqGains(EQ_PRESETS.Rock);
      p.setPreamp(3);
      p.play();
      p.pause();
      p.stop();
      p.seek(1);
      p.destroy();
    }).not.toThrow();
  });

  it('reports no frequency data when the analyser is unavailable', () => {
    const p = new MusicPlayer();
    expect(p.getFrequencyData(new Uint8Array(128))).toBe(false);
  });

  it('tracks the loaded track', () => {
    const p = new MusicPlayer();
    p.load(musicTracks[1]);
    expect(p.currentTrack?.id).toBe(musicTracks[1].id);
  });
});
