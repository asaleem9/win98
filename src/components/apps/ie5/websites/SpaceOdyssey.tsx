'use client';

import type { SiteDef } from './registry';

import { useState } from 'react';

interface Planet {
  key: string;
  label: string;
  color: string;
  heading: string;
  body: string;
}

const PLANETS: Planet[] = [
  { key: 'jam', label: 'The Jam', color: '#ff6600', heading: 'THE BIG GAME', body: 'The Tune Squad takes on the Monstars in the most important basketball game in the history of the galaxy. Everything is on the line.' },
  { key: 'stellar', label: 'Stellar Cast', color: '#33ccff', heading: 'MEET THE STARS', body: 'A legendary baller. A team of cartoon all-stars. One very confused duck. Get to know the heroes of Space Odyssey.' },
  { key: 'jr', label: 'Junior Jam', color: '#66ff66', heading: 'JR. JAM CLUB', body: 'Games, puzzles, and a coloring book you can print on your dot-matrix. Ask a grown-up before you download.' },
  { key: 'lockers', label: 'Locker Room', color: '#ffcc00', heading: 'THE LOCKER ROOM', body: 'Behind-the-scenes secrets, bloopers, and interviews with the cast. Slam-dunk trivia updated weekly!' },
  { key: 'press', label: 'Press Box', color: '#ff33cc', heading: 'PRESS BOX', body: '"Two thumbs WAY up into orbit!" Read what the critics are saying about the film everyone is talking about.' },
  { key: 'store', label: 'Gift Shop', color: '#cc66ff', heading: 'THE GIFT SHOP', body: 'T-shirts, foam fingers, and a limited-edition CD-ROM. Order by fax or call 1-800-SPACE-98.' },
  { key: 'studio', label: 'The Studio', color: '#00ffcc', heading: 'STUDIO STORE', body: 'How did they put a cartoon and a real person in the same shot? Our animators explain the movie MAGIC.' },
  { key: 'download', label: 'Downloads', color: '#ffffff', heading: 'DOWNLOADS', body: 'Wallpaper, MIDI theme song, and the official trailer. Warm up your modem!' },
];

export const site: SiteDef = {
  key: 'spacejam',
  urls: ['http://www.spaceodyssey.com', 'www.spaceodyssey.com', 'spaceodyssey.com', 'http://www.spaceodyssey.com/jam'],
  title: 'SPACE ODYSSEY — The Movie (Official Site)',
  keywords: ['space odyssey', 'movie', 'basketball', 'cartoon', 'official site', 'trailer', 'film', 'space jam', 'planets'],
  description: 'The OFFICIAL website for SPACE ODYSSEY — the movie event of the millennium. Enter the galaxy!',
  render: () => <SpaceOdyssey />,
};

export default function SpaceOdyssey() {
  const [active, setActive] = useState<Planet>(PLANETS[0]);
  const [trailer, setTrailer] = useState(false);

  return (
    <div
      className="min-h-full text-white font-[Arial,sans-serif] text-[12px]"
      style={{
        background:
          '#000010 url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'5\' cy=\'8\' r=\'0.7\' fill=\'white\'/%3E%3Ccircle cx=\'22\' cy=\'3\' r=\'0.5\' fill=\'white\'/%3E%3Ccircle cx=\'33\' cy=\'18\' r=\'0.8\' fill=\'white\'/%3E%3Ccircle cx=\'12\' cy=\'27\' r=\'0.5\' fill=\'white\'/%3E%3Ccircle cx=\'28\' cy=\'34\' r=\'0.7\' fill=\'white\'/%3E%3Ccircle cx=\'38\' cy=\'9\' r=\'0.5\' fill=\'white\'/%3E%3C/svg%3E") repeat',
      }}
    >
      <div className="text-center pt-4 pb-2">
        <div
          className="text-[30px] font-bold tracking-widest"
          style={{ fontFamily: 'Arial Black, Impact, sans-serif', color: '#ffcc00', textShadow: '0 0 12px #ff6600, 2px 2px 0 #cc0000' }}
        >
          SPACE ODYSSEY
        </div>
        <div className="text-[11px] text-[#88ccff] tracking-[0.3em]">THE MOVIE &middot; OFFICIAL SITE</div>
      </div>

      {/* Circular planet nav grid */}
      <div className="flex justify-center py-3">
        <div className="relative w-[280px] h-[280px]">
          {/* faint orbit rings */}
          <div className="absolute inset-0 rounded-full border border-[#223355]" />
          <div className="absolute inset-[45px] rounded-full border border-[#223355]" />
          {/* central sun */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[64px] h-[64px] rounded-full flex items-center justify-center text-[9px] font-bold text-black text-center"
            style={{ background: 'radial-gradient(circle at 35% 35%, #fff, #ffcc00 60%, #ff6600)', boxShadow: '0 0 24px #ff9900' }}
          >
            ENTER
          </div>
          {PLANETS.map((p, i) => {
            const angle = (i / PLANETS.length) * Math.PI * 2 - Math.PI / 2;
            const r = 118;
            const x = 140 + Math.cos(angle) * r;
            const y = 140 + Math.sin(angle) * r;
            const isActive = p.key === active.key;
            return (
              <button
                key={p.key}
                onClick={() => setActive(p)}
                title={p.label}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[8px] font-bold text-black text-center leading-tight px-1 cursor-pointer"
                style={{
                  left: x,
                  top: y,
                  width: 52,
                  height: 52,
                  background: `radial-gradient(circle at 35% 35%, #fff, ${p.color} 65%)`,
                  boxShadow: isActive ? `0 0 14px ${p.color}, 0 0 4px #fff` : `0 0 6px ${p.color}`,
                  border: isActive ? '2px solid #fff' : '2px solid transparent',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tiny centered content frame */}
      <div className="max-w-[360px] mx-auto px-4 pb-4">
        <div className="border-2 border-[#ffcc00] bg-black/60 p-3 text-center">
          <div className="text-[15px] font-bold text-[#ffcc00] mb-1">{active.heading}</div>
          <div className="text-[11px] text-[#cceeff] leading-relaxed mb-2">{active.body}</div>
          {active.key === 'download' && (
            <div className="mt-2">
              <button
                onClick={() => setTrailer(true)}
                className="bg-[#cc0000] text-[#ffff00] border border-[#ffcc00] px-3 py-1 text-[11px] font-bold cursor-pointer"
              >
                ⬇ Download the trailer (28.8k, ~45 minutes)
              </button>
              {trailer && (
                <div className="text-[10px] text-[#88ff88] mt-2 border border-[#336633] p-2">
                  Connecting to media server&hellip; estimated time remaining: <b>44:58</b>.<br />
                  Please do not use the telephone while downloading.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center text-[9px] text-[#6688aa] mt-3">
          Best viewed with Netscape 3.0+ at 800x600 &middot; Requires QuickTime &middot; &copy; 1998 Astro Pictures
        </div>
      </div>
    </div>
  );
}
