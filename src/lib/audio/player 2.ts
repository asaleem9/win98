// Shared music playback engine for Winamp / Media Player. Wraps an
// HTMLAudioElement routed through Web Audio so visualizers get real
// frequency data via the analyser node.
//
// Signal graph (when Web Audio is available):
//   source → analyser → preamp → eq[0..9] → volume → balance → 'wave' channel
// The equalizer is a chain of peaking BiquadFilters (one per band) plus a
// preamp gain; when EQ is off every band and the preamp sit at 0 dB, so the
// chain stays wired but is acoustically transparent. Balance is a StereoPanner.

import { getAudioContext, getMasterGain, getChannelGain } from '@/lib/sounds';
import { MusicTrack } from './tracks';

// Standard Winamp 10-band centre frequencies (Hz).
export const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
export const EQ_BAND_COUNT = EQ_FREQUENCIES.length;

// Classic presets, in dB per band (-12..12), matching EQ_FREQUENCIES order.
export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [6, 4, -2, -4, -1, 2, 5, 7, 7, 8],
  Techno: [8, 5, 0, -3, -2, 1, 6, 8, 8, 7],
  Classical: [0, 0, 0, 0, 0, 0, -4, -4, -4, -6],
};

function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export class MusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private preamp: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private panner: StereoPannerNode | null = null;
  analyser: AnalyserNode | null = null;
  private track: MusicTrack | null = null;

  // EQ state kept in dB so we can re-apply it when the graph is (re)built or
  // the enable flag flips. Bands mirror EQ_FREQUENCIES; preamp is separate.
  private eqEnabled = false;
  private eqGains = new Array(EQ_BAND_COUNT).fill(0);
  private preampDb = 0;
  private balance = 0; // -1 (left) .. 1 (right)

  onEnded?: () => void;
  onTimeUpdate?: (current: number, duration: number) => void;

  private ensureGraph(): void {
    if (this.audio) return;
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.addEventListener('ended', () => this.onEnded?.());
    this.audio.addEventListener('timeupdate', () => {
      if (this.audio) this.onTimeUpdate?.(this.audio.currentTime, this.audio.duration || 0);
    });

    const ctx = getAudioContext();
    if (ctx) {
      try {
        this.source = ctx.createMediaElementSource(this.audio);
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.preamp = ctx.createGain();
        this.eqFilters = EQ_FREQUENCIES.map((freq) => {
          const f = ctx.createBiquadFilter();
          f.type = 'peaking';
          f.frequency.value = freq;
          f.Q.value = 1;
          f.gain.value = 0;
          return f;
        });
        this.gain = ctx.createGain();
        if (typeof ctx.createStereoPanner === 'function') {
          this.panner = ctx.createStereoPanner();
          this.panner.pan.value = this.balance;
        }

        // Wire the chain head-to-tail.
        let tail: AudioNode = this.source;
        tail.connect(this.analyser);
        tail = this.analyser;
        tail.connect(this.preamp);
        tail = this.preamp;
        for (const f of this.eqFilters) {
          tail.connect(f);
          tail = f;
        }
        tail.connect(this.gain);
        tail = this.gain;
        if (this.panner) {
          tail.connect(this.panner);
          tail = this.panner;
        }
        // Route through the shared 'wave' channel (falls back to master, then
        // the raw destination) so channel + system volume/mute all apply.
        const dest = getChannelGain('wave') ?? getMasterGain() ?? ctx.destination;
        tail.connect(dest);

        this.applyEq();
      } catch {
        // graph construction failed — audio element still plays directly
      }
    }
  }

  load(track: MusicTrack): void {
    this.ensureGraph();
    if (!this.audio) return;
    this.track = track;
    this.audio.src = track.src;
    this.audio.load();
  }

  get currentTrack(): MusicTrack | null {
    return this.track;
  }

  play(): void {
    this.ensureGraph();
    void this.audio?.play().catch(() => {});
  }

  pause(): void {
    this.audio?.pause();
  }

  stop(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  seek(seconds: number): void {
    if (this.audio) this.audio.currentTime = seconds;
  }

  setVolume(v: number): void {
    const clamped = Math.min(1, Math.max(0, v));
    if (this.gain) this.gain.gain.value = clamped;
    else if (this.audio) this.audio.volume = clamped;
  }

  /** Left/right balance in [-1, 1]. No-op when StereoPanner is unavailable. */
  setBalance(pan: number): void {
    this.balance = Math.min(1, Math.max(-1, pan));
    if (this.panner) this.panner.pan.value = this.balance;
  }

  /** Turn the equalizer on/off. Off flattens every band + preamp to 0 dB. */
  setEqEnabled(enabled: boolean): void {
    this.eqEnabled = enabled;
    this.applyEq();
  }

  /** Set one band's gain in dB (index into EQ_FREQUENCIES). */
  setEqBand(index: number, db: number): void {
    if (index < 0 || index >= EQ_BAND_COUNT) return;
    this.eqGains[index] = db;
    if (this.eqEnabled && this.eqFilters[index]) this.eqFilters[index].gain.value = db;
  }

  /** Replace all band gains at once (e.g. applying a preset). */
  setEqGains(gains: number[]): void {
    for (let i = 0; i < EQ_BAND_COUNT; i++) this.eqGains[i] = gains[i] ?? 0;
    this.applyEq();
  }

  /** Preamp gain in dB, applied ahead of the band filters. */
  setPreamp(db: number): void {
    this.preampDb = db;
    if (this.preamp) this.preamp.gain.value = this.eqEnabled ? dbToGain(db) : 1;
  }

  private applyEq(): void {
    if (this.preamp) this.preamp.gain.value = this.eqEnabled ? dbToGain(this.preampDb) : 1;
    for (let i = 0; i < this.eqFilters.length; i++) {
      this.eqFilters[i].gain.value = this.eqEnabled ? this.eqGains[i] : 0;
    }
  }

  get currentTime(): number {
    return this.audio?.currentTime ?? 0;
  }

  get duration(): number {
    return this.audio?.duration || 0;
  }

  get playing(): boolean {
    return !!this.audio && !this.audio.paused && !this.audio.ended;
  }

  /** Fills `out` with 0-255 frequency magnitudes; returns false if unavailable. */
  getFrequencyData(out: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyser) return false;
    this.analyser.getByteFrequencyData(out);
    return true;
  }

  destroy(): void {
    this.audio?.pause();
    this.audio?.removeAttribute('src');
    this.audio = null;
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.preamp?.disconnect();
    this.eqFilters.forEach((f) => f.disconnect());
    this.gain?.disconnect();
    this.panner?.disconnect();
    this.source = null;
    this.analyser = null;
    this.preamp = null;
    this.eqFilters = [];
    this.gain = null;
    this.panner = null;
  }
}
