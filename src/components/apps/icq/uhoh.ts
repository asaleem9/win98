// ICQ's unmistakable "uh-oh!" message chime, synthesised on the fly with the Web
// Audio API. Kept deliberately self-contained — it does NOT go through the app's
// shared sound library — so the cameo carries its own little voice. Two square-wave
// notes, a higher "uh" falling to a lower "oh", the sound a whole generation
// learned to jump at.

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor: AudioCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

function playNote(ac: AudioContext, freq: number, start: number, dur: number): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, start);
  // Quick attack, gentle decay — a short percussive chirp, not a drone.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.16, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Play the classic ICQ two-note "uh-oh!" alert. Safely no-ops without audio. */
export function playUhOh(): void {
  const ac = audioContext();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  const now = ac.currentTime;
  playNote(ac, 660, now, 0.11); // "uh"
  playNote(ac, 494, now + 0.12, 0.17); // "oh"
}
