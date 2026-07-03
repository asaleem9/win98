// Shared music playback engine for Winamp / Media Player. Wraps an
// HTMLAudioElement routed through Web Audio so visualizers get real
// frequency data via the analyser node.

import { getAudioContext, getMasterGain } from '@/lib/sounds';
import { MusicTrack } from './tracks';

export class MusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  analyser: AnalyserNode | null = null;
  private track: MusicTrack | null = null;
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
        this.gain = ctx.createGain();
        this.source.connect(this.analyser).connect(this.gain);
        // Route through the shared master gain so system volume/mute also apply;
        // fall back to the raw destination if the master node is unavailable.
        const master = getMasterGain();
        this.gain.connect(master ?? ctx.destination);
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
    this.gain?.disconnect();
    this.source = null;
    this.analyser = null;
    this.gain = null;
  }
}
