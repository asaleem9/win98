'use client';

import type { SiteDef } from './registry';

import { useEffect, useRef, useState } from 'react';
import { playSound } from '@/lib/sounds';

const HAMSTERS = ['🐹', '🐹', '🐹', '🐹', '🐹', '🐹', '🐹', '🐹'];

// Each row bounces on a slightly different beat so the herd looks alive.
const ROWS = [
  { count: 10, delay: 0, size: 28 },
  { count: 8, delay: 0.15, size: 34 },
  { count: 12, delay: 0.3, size: 22 },
  { count: 9, delay: 0.1, size: 30 },
  { count: 11, delay: 0.22, size: 26 },
];

export const site: SiteDef = {
  key: 'hampster',
  urls: ['http://www.hampsterdance.com', 'www.hampsterdance.com', 'hampsterdance.com'],
  title: 'The Hampster Dance',
  keywords: ['hampster', 'hamster', 'dance', 'meme', 'gif', 'music'],
  description: 'The original dancing hamster meme page.',
  render: () => <HampsterDance />,
};

export default function HampsterDance() {
  const [musicOn, setMusicOn] = useState(true);
  const beatRef = useRef(0);

  // Loop the "dee da dee da" tune with a little synth blip every beat.
  useEffect(() => {
    if (!musicOn) return;
    const notes = ['ding', 'notify', 'ding', 'menuClick'] as const;
    const interval = setInterval(() => {
      playSound(notes[beatRef.current % notes.length]);
      beatRef.current += 1;
    }, 450);
    return () => clearInterval(interval);
  }, [musicOn]);

  return (
    <div className="min-h-full bg-[#ffcc00] text-black font-[Arial,sans-serif] overflow-hidden">
      <div className="text-center py-3 bg-[#ff6600] border-b-4 border-[#cc3300]">
        <div className="text-[30px] font-bold text-white" style={{ fontFamily: 'Comic Sans MS, cursive', textShadow: '2px 2px 0 #990000' }}>
          The Hampster Dance!
        </div>
        <div className="text-[13px] text-[#ffff99] mt-1">dee da dee da dee da doh doh &middot; dee da dee da dee da doh doh</div>
      </div>

      <div className="text-center py-2">
        <button
          onClick={() => setMusicOn((m) => !m)}
          className="bg-[#ffffff] border-2 border-[#cc3300] px-3 py-1 text-[12px] font-bold cursor-pointer text-[#cc3300]"
        >
          {musicOn ? '🔊 Stop the Music!' : '🔈 Play the Music!'}
        </button>
      </div>

      <div className="py-2 select-none">
        {ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1 my-1">
            {Array.from({ length: row.count }).map((_, i) => (
              <span
                key={i}
                className="inline-block"
                style={{
                  fontSize: `${row.size}px`,
                  animation: `hampBounce 0.45s ease-in-out ${(row.delay + i * 0.05).toFixed(2)}s infinite`,
                }}
              >
                {HAMSTERS[i % HAMSTERS.length]}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="text-center text-[12px] text-[#663300] pb-4 px-4">
        <p className="my-1 font-bold">Welcome to the Hampster Dance! The #1 site on the World Wide Web!</p>
        <p className="my-1">You are dancer #<b>{('00147302').toString()}</b> to visit this page.</p>
        <p className="my-1 text-[10px]">Best viewed in Netscape Navigator 4.0 with your speakers ON.</p>
        <div className="mt-2 text-[11px] text-[#990000]">
          [ <span className="underline cursor-pointer">Email this page to a friend!</span> ]
        </div>
      </div>

      <style jsx>{`
        @keyframes hampBounce {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
