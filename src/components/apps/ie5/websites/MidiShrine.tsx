'use client';

import type { SiteDef } from './registry';

import { useEffect, useRef, useState } from 'react';
import { getAudioContext, getMasterGain } from '@/lib/sounds';

// Note names → frequency (Hz). 0 = a rest.
const N: Record<string, number> = {
  R: 0,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880,
};

interface MidiTrack {
  file: string;
  desc: string;
  tempo: number; // seconds per step
  notes: string[];
}

const TRACKS: MidiTrack[] = [
  { file: 'CANYON.MID', desc: 'The Windows default. You know this one.', tempo: 0.22, notes: ['E4', 'G4', 'C5', 'B4', 'G4', 'E4', 'G4', 'C5', 'D5', 'C5', 'G4', 'E4'] },
  { file: 'PASSPORT.MID', desc: 'Smooth jazz for your homepage.', tempo: 0.2, notes: ['A4', 'C5', 'E5', 'D5', 'C5', 'A4', 'G4', 'A4', 'C5', 'R'] },
  { file: 'CANON.MID', desc: 'Pachelbel — 8-bit wedding edition.', tempo: 0.26, notes: ['C5', 'G4', 'A4', 'E4', 'F4', 'C4', 'F4', 'G4'] },
  { file: 'GREENSLV.MID', desc: 'Greensleeves. Very sophisticated.', tempo: 0.24, notes: ['A4', 'C5', 'D5', 'E5', 'F5', 'E5', 'D5', 'B4', 'G4', 'A4', 'B4', 'C5', 'A4', 'R'] },
  { file: 'TAKEONME.MID', desc: 'a-ha! Best played at 2am.', tempo: 0.16, notes: ['F5', 'F5', 'D5', 'B4', 'B4', 'E5', 'E5', 'E5', 'G5', 'G5', 'F5', 'D5'] },
  { file: 'MARIO.MID', desc: 'It’s-a me! (legally distinct plumber).', tempo: 0.15, notes: ['E5', 'E5', 'R', 'E5', 'R', 'C5', 'E5', 'R', 'G5', 'R', 'R', 'G4'] },
  { file: 'TETRIS.MID', desc: 'Korobeiniki. You will hear it in your sleep.', tempo: 0.16, notes: ['E5', 'B4', 'C5', 'D5', 'C5', 'B4', 'A4', 'A4', 'C5', 'E5', 'D5', 'C5', 'B4'] },
  { file: 'ENTRTNR.MID', desc: 'The Entertainer. Ragtime, baby.', tempo: 0.17, notes: ['D5', 'E5', 'C5', 'A4', 'B4', 'G4', 'A4', 'C5', 'R', 'D5', 'E5', 'C5'] },
];

export const site: SiteDef = {
  key: 'midishrine',
  urls: ['http://www.midipalace.com', 'www.midipalace.com', 'midipalace.com', 'http://www.midishrine.com', 'midishrine.com'],
  title: 'The MIDI Palace',
  keywords: ['midi', 'music', 'midi files', 'canyon', 'download music', 'sound', 'songs', 'karaoke', 'homepage music'],
  description: 'The MIDI Palace — free .MID files for your homepage. Play them right in your browser!',
  render: () => <MidiShrine />,
};

export default function MidiShrine() {
  const [playing, setPlaying] = useState<string | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAll = () => {
    if (loopRef.current) clearTimeout(loopRef.current);
    loopRef.current = null;
    for (const osc of oscillatorsRef.current) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    oscillatorsRef.current = [];
  };

  const schedule = (track: MidiTrack) => {
    const ctx = getAudioContext();
    if (!ctx) return; // no Web Audio (e.g. jsdom) — silently no-op
    const dest: AudioNode = getMasterGain() ?? ctx.destination;
    let t = ctx.currentTime + 0.05;
    for (const name of track.notes) {
      const freq = N[name] ?? 0;
      if (freq > 0) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.1, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + track.tempo * 0.85);
        osc.connect(g).connect(dest);
        osc.start(t);
        osc.stop(t + track.tempo);
        oscillatorsRef.current.push(osc);
      }
      t += track.tempo;
    }
    // Loop the riff so it plays like a looping page soundtrack.
    const ms = (t - ctx.currentTime) * 1000;
    loopRef.current = setTimeout(() => {
      oscillatorsRef.current = [];
      schedule(track);
    }, ms);
  };

  const play = (track: MidiTrack) => {
    stopAll();
    setPlaying(track.file);
    schedule(track);
  };

  const stop = () => {
    stopAll();
    setPlaying(null);
  };

  useEffect(() => () => stopAll(), []);

  return (
    <div
      className="min-h-full text-white font-[Verdana,Arial,sans-serif] text-[12px]"
      style={{
        background:
          '#1a0033 url("data:image/svg+xml,%3Csvg width=\'16\' height=\'16\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'2\' cy=\'3\' r=\'0.8\' fill=\'%23ffcc00\'/%3E%3Ccircle cx=\'11\' cy=\'8\' r=\'0.8\' fill=\'%2300ffff\'/%3E%3Ccircle cx=\'6\' cy=\'13\' r=\'0.8\' fill=\'%23ff66ff\'/%3E%3Ccircle cx=\'14\' cy=\'2\' r=\'0.8\' fill=\'%23ffffff\'/%3E%3C/svg%3E") repeat',
      }}
    >
      <div className="text-center py-3 border-b-2 border-[#ffcc00]">
        <div className="text-[28px] font-bold text-[#ffcc00]" style={{ fontFamily: 'Georgia, serif', textShadow: '0 0 10px #ff00ff' }}>
          ♫ The MIDI Palace ♫
        </div>
        <div className="text-[11px] text-[#ccffff] mt-1">The Web&rsquo;s finest collection of free .MID files since 1997</div>
      </div>

      {/* Now playing marquee */}
      <div className="overflow-hidden bg-black/40 border-y border-[#ffcc00] py-1">
        <div className="animate-[midiMarquee_10s_linear_infinite] whitespace-nowrap text-[#00ff99] text-[13px] font-bold">
          {playing
            ? `♪ ♪ ♪  NOW PLAYING: ${playing}  ♪ ♪ ♪  turn your speakers UP!  ♪ ♪ ♪`
            : '♪ ♪ ♪  Welcome to the MIDI Palace — click PLAY on any track below!  ♪ ♪ ♪  Sign the guestbook!  ♪ ♪ ♪'}
        </div>
      </div>

      <div className="max-w-[560px] mx-auto px-4 py-4">
        <div className="border border-[#ffcc00] bg-black/30 p-2">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[#ffcc00] text-left border-b border-[#ffcc00]">
                <th className="py-1 px-2">File</th>
                <th className="py-1 px-2">Description</th>
                <th className="py-1 px-2 w-[90px] text-center">Controls</th>
              </tr>
            </thead>
            <tbody>
              {TRACKS.map((t) => (
                <tr key={t.file} className="border-b border-[#442266]">
                  <td className="py-2 px-2 font-[Courier_New,monospace] text-[#00ffff] whitespace-nowrap">🎵 {t.file}</td>
                  <td className="py-2 px-2 text-[#ddccff]">{t.desc}</td>
                  <td className="py-2 px-2 text-center whitespace-nowrap">
                    {playing === t.file ? (
                      <button onClick={stop} className="bg-[#cc0000] text-white border-none px-2 py-[2px] text-[10px] font-bold cursor-pointer">
                        ■ Stop
                      </button>
                    ) : (
                      <button onClick={() => play(t)} className="bg-[#009900] text-white border-none px-2 py-[2px] text-[10px] font-bold cursor-pointer">
                        ▶ Play
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center text-[10px] text-[#aa99cc] mt-4">
          To use a MIDI on your page, add <code className="text-[#00ff99]">&lt;bgsound src=&quot;canyon.mid&quot; loop=&quot;infinite&quot;&gt;</code><br />
          &copy; 1998 The MIDI Palace &middot; Best heard on a Sound Blaster 16 &middot; 800x600
        </div>
      </div>

      <style jsx>{`
        @keyframes midiMarquee {
          from { transform: translateX(100%); }
          to { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
