'use client';

import type { SiteDef } from './registry';

import { useState } from 'react';
import { playSound } from '@/lib/sounds';

export const site: SiteDef = {
  key: 'dancingbaby',
  urls: [
    'http://www.dancingbaby.com',
    'www.dancingbaby.com',
    'dancingbaby.com',
    'http://www.oogachaka.com',
    'oogachaka.com',
  ],
  title: 'The Dancing Baby',
  keywords: ['dancing baby', 'baby', 'oogachaka', 'cha cha', 'ally mcbeal', 'animation', '3d', 'meme', 'gif'],
  description: 'The Dancing Baby — the original cha-cha-ing 3D render, straight off Ally McBeal.',
  render: () => <DancingBaby />,
};

/** Inline SVG of the famous rendered baby — a stack of simple 3D-ish shapes. */
function BabySvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 100 130" className="dance-baby">
      {/* shadow */}
      <ellipse cx="50" cy="125" rx="28" ry="5" fill="#000000" opacity="0.15" />
      {/* head */}
      <circle cx="50" cy="24" r="20" fill="#f2c79a" stroke="#c99a63" strokeWidth="1.5" />
      <circle cx="43" cy="22" r="2.4" fill="#3a2a1a" />
      <circle cx="57" cy="22" r="2.4" fill="#3a2a1a" />
      <path d="M44 31 Q50 35 56 31" fill="none" stroke="#a06a3a" strokeWidth="1.5" />
      <path d="M40 10 Q50 2 60 10" fill="none" stroke="#8a5a2a" strokeWidth="2" />
      {/* body / diaper */}
      <path d="M34 44 Q50 40 66 44 L62 84 Q50 90 38 84 Z" fill="#f2c79a" stroke="#c99a63" strokeWidth="1.5" />
      <path d="M36 74 Q50 70 64 74 L62 92 Q50 100 38 92 Z" fill="#ffffff" stroke="#cccccc" strokeWidth="1.5" />
      {/* arms */}
      <path d="M34 48 Q18 52 16 66" fill="none" stroke="#f2c79a" strokeWidth="9" strokeLinecap="round" />
      <path d="M66 48 Q82 52 84 66" fill="none" stroke="#f2c79a" strokeWidth="9" strokeLinecap="round" />
      {/* legs */}
      <path d="M44 92 Q42 108 46 120" fill="none" stroke="#f2c79a" strokeWidth="11" strokeLinecap="round" />
      <path d="M56 92 Q58 108 54 120" fill="none" stroke="#f2c79a" strokeWidth="11" strokeLinecap="round" />
    </svg>
  );
}

export default function DancingBaby() {
  const [tiled, setTiled] = useState(false);

  const babies = tiled ? Array.from({ length: 12 }) : [null];

  return (
    <div className="min-h-full bg-[#008080] text-white font-[Arial,sans-serif] text-[12px] flex flex-col">
      <div className="text-center py-3 border-b-2 border-[#004040]">
        <div className="text-[26px] font-bold" style={{ fontFamily: 'Comic Sans MS, cursive', textShadow: '2px 2px 0 #003030' }}>
          ~ The Dancing Baby ~
        </div>
        <div className="text-[13px] text-[#ccffff] mt-1 tracking-widest">ooga-chaka ooga-ooga ooga-chaka</div>
      </div>

      <div className="text-center py-2 flex justify-center gap-2">
        <button
          onClick={() => { playSound('chord'); }}
          className="bg-white text-[#008080] border-2 border-[#004040] px-3 py-1 text-[11px] font-bold cursor-pointer"
        >
          ♪ Play the riff!
        </button>
        <button
          onClick={() => setTiled((t) => !t)}
          className="bg-white text-[#008080] border-2 border-[#004040] px-3 py-1 text-[11px] font-bold cursor-pointer"
        >
          {tiled ? 'Just one baby' : 'Tile the babies!'}
        </button>
      </div>

      <div className={`flex-1 py-3 ${tiled ? 'grid grid-cols-4 gap-2 justify-items-center' : 'flex justify-center items-center'}`}>
        {babies.map((_, i) => (
          <div
            key={i}
            style={{ animationDelay: `${(i % 4) * 0.12}s` }}
            className="inline-block"
          >
            <BabySvg size={tiled ? 70 : 150} />
          </div>
        ))}
      </div>

      <div className="text-center text-[11px] text-[#ccffff] pb-4 px-4">
        <p className="my-1">As seen on <b>Ally McBeal</b>! The hottest 3D animation on the Web.</p>
        <p className="my-1 text-[10px]">Requires a fast Pentium and at LEAST 16 MB of RAM. Best viewed at 800x600.</p>
        <p className="my-1 text-[10px] text-[#aaeeee]">You are baby-watcher #00028841</p>
      </div>

      <style jsx>{`
        .dance-baby {
          animation: babyWobble 0.9s ease-in-out infinite;
          transform-origin: 50% 90%;
        }
        @keyframes babyWobble {
          0%   { transform: rotate(-7deg) translateY(0) scaleX(1); }
          25%  { transform: rotate(0deg) translateY(-6px) scaleX(0.96); }
          50%  { transform: rotate(7deg) translateY(0) scaleX(1); }
          75%  { transform: rotate(0deg) translateY(-6px) scaleX(1.04); }
          100% { transform: rotate(-7deg) translateY(0) scaleX(1); }
        }
      `}</style>
    </div>
  );
}
