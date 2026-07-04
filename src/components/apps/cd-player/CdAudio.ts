// A thin audio engine for the CD Player. Unlike the Winamp/Media Player engine
// (which routes through the 'wave' mixer channel), this wires its element into
// the 'cd' channel that sounds.ts reserves for exactly this — so the Volume
// Control mixer's "CD Audio" strip governs disc playback. Uses only the public
// sounds.ts exports; when Web Audio is unavailable (jsdom) it plays the element
// directly and every method degrades to a no-op instead of throwing.

import { getAudioContext, getChannelGain } from '@/lib/sounds';

export class CdAudio {
  private audio: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;

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
    const cdGain = getChannelGain('cd');
    if (ctx && cdGain) {
      try {
        this.source = ctx.createMediaElementSource(this.audio);
        this.source.connect(cdGain);
      } catch {
        // graph build failed — the element still plays through its own output
      }
    }
  }

  load(src: string): void {
    this.ensureGraph();
    if (!this.audio) return;
    this.audio.src = src;
    this.audio.load();
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

  get currentTime(): number {
    return this.audio?.currentTime ?? 0;
  }

  get duration(): number {
    return this.audio?.duration || 0;
  }

  destroy(): void {
    this.audio?.pause();
    this.audio?.removeAttribute('src');
    try {
      this.source?.disconnect();
    } catch {
      // already torn down
    }
    this.source = null;
    this.audio = null;
  }
}
