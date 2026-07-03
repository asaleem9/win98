'use client';

import { useMemo, useState } from 'react';
import type { SiteDef } from './registry';
import { getAllSites } from './registry';

interface WebRingProps {
  onNavigate: (url: string) => void;
}

const RINGS = [
  'The Retro Ring',
  '90s Kids WebRing',
  'Sci-Fi Fans WebRing',
  'GeoCities Homesteaders Ring',
  'The MP3 Traders Ring',
  'Beanie Baby Collectors Ring',
];

export const site: SiteDef = {
  key: 'webring',
  urls: ['http://www.webring.org', 'www.webring.org', 'webring.org', 'http://www.theretroring.com', 'theretroring.com'],
  title: 'The Retro Ring',
  keywords: ['webring', 'retro ring', 'directory', 'links', 'sites', 'ring', 'prev', 'next', 'random', 'surf'],
  description: 'The Retro Ring — a hub that links every site on the ring. Surf them all with Prev, Random, and Next.',
  render: ({ onNavigate }) => <WebRing onNavigate={onNavigate} />,
};

/** The ring's members: every registered site except this hub and about:blank. */
function ringMembers(): SiteDef[] {
  return getAllSites().filter((s) => s.key !== 'webring' && s.key !== 'blank' && s.urls.length > 0);
}

export default function WebRing({ onNavigate }: WebRingProps) {
  const members = useMemo(() => ringMembers(), []);
  const [index, setIndex] = useState(0);

  const goTo = (i: number) => {
    if (members.length === 0) return;
    const wrapped = ((i % members.length) + members.length) % members.length;
    setIndex(wrapped);
    onNavigate(members[wrapped].urls[0]);
  };

  const prev = () => goTo(index - 1);
  const next = () => goTo(index + 1);
  const random = () => {
    if (members.length === 0) return;
    goTo(Math.floor(Math.random() * members.length));
  };

  return (
    <div className="min-h-full bg-[#ccccff] text-black font-[Verdana,Arial,sans-serif] text-[12px]">
      <div className="bg-[#333399] text-white text-center py-3">
        <div className="text-[26px] font-bold" style={{ fontFamily: 'Impact, sans-serif' }}>The Retro Ring</div>
        <div className="text-[11px] text-[#ccccff]">Connecting the Web, one site at a time since 1995</div>
      </div>

      <div className="max-w-[560px] mx-auto px-4 py-3">
        {/* Ring navigation widget */}
        <div className="border-2 border-[#333399] bg-white p-3 mb-4 text-center">
          <div className="text-[13px] font-bold text-[#333399] mb-1">This site belongs to</div>
          <div className="text-[15px] font-bold text-[#cc0000] mb-2">~ The Retro Ring ~</div>
          <div className="flex justify-center items-center gap-2 text-[11px] flex-wrap">
            <button onClick={prev} className="text-[#0000cc] underline cursor-pointer">[ &lt;&lt; Prev ]</button>
            <button onClick={random} className="text-[#0000cc] underline cursor-pointer font-bold">[ Random ]</button>
            <button onClick={next} className="text-[#0000cc] underline cursor-pointer">[ Next &gt;&gt; ]</button>
          </div>
          <div className="text-[10px] text-[#666] mt-2">
            This ring has <b>{members.length}</b> member sites. Keep on surfing!
          </div>
        </div>

        {/* All member sites */}
        <div className="bg-white border border-[#9999cc] p-3 mb-4">
          <div className="text-[13px] font-bold text-[#333399] mb-2 border-b border-[#ccc] pb-1">All Ring Members</div>
          <ul className="space-y-2">
            {members.map((s, i) => (
              <li key={s.key} className="flex items-start gap-2">
                <span className="text-[#999] text-[10px] w-[18px] text-right shrink-0">{i + 1}.</span>
                <div>
                  <span onClick={() => onNavigate(s.urls[0])} className="text-[#0000cc] underline cursor-pointer font-bold">{s.title}</span>
                  <span className="text-[#666] text-[11px]"> &mdash; {s.description}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Browse rings */}
        <div className="bg-white border border-[#9999cc] p-3 mb-4">
          <div className="text-[13px] font-bold text-[#333399] mb-2 border-b border-[#ccc] pb-1">Browse Popular Rings</div>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            {RINGS.map((r) => (
              <div key={r} className="text-[#0000cc] underline cursor-pointer" onClick={random}>{r}</div>
            ))}
          </div>
        </div>

        <div className="text-center text-[10px] text-[#666]">
          Want to add your site to a ring? <span className="text-[#0000cc] underline cursor-pointer">Join The Retro Ring today!</span>
          <br />&copy; 1998 WebRing Inc. Keep the Web connected! &middot; Best viewed at 800x600
        </div>
      </div>
    </div>
  );
}
