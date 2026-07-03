'use client';

import { useEffect, useState } from 'react';

export interface BannerDef {
  id: string;
  /** Scrolling headline text. */
  text: string;
  /** Where a click takes you — a registered site, or a dead URL for the gag. */
  target: string;
  bg: string;
  fg: string;
  /** Small badge shown at the right of the banner. */
  badge?: string;
}

// 468x60 was THE banner size of the late-90s web. downloadmoreram resolves to a
// real page; the rest point at hosts that don't exist, so a click lands on the
// browser's DNS-error page — which is, of course, the joke.
export const ADS: BannerDef[] = [
  { id: 'monkey', text: 'PUNCH THE MONKEY AND WIN $50!!! You are the 1,000,000th visitor!', target: 'http://www.punchthemonkey.com', bg: '#ffcc00', fg: '#cc0000', badge: 'WIN!' },
  { id: 'x10', text: 'X10 Wireless Camera — See what you have been missing. Only $79.99!', target: 'http://www.x10.com', bg: '#000080', fg: '#ffffff', badge: 'NEW' },
  { id: 'bonzi', text: 'FREE! BonziBUDDY wants to be your friend! Download your purple pal today!', target: 'http://www.bonzi.com', bg: '#663399', fg: '#00ff00', badge: 'FREE' },
  { id: 'ram', text: 'Computer running slow? DOWNLOAD MORE RAM — 100% free, no screwdriver required!', target: 'http://www.downloadmoreram.com', bg: '#000000', fg: '#00ff00', badge: 'HOT' },
  { id: 'gold', text: 'CONGRATULATIONS! You have been selected to receive a FREE* iMac! Click NOW!', target: 'http://www.freeprizes.net', bg: '#008080', fg: '#ffff00', badge: '$$$' },
  { id: 'lowfares', text: 'Find LOW airfares! Name your own price and save on travel worldwide!', target: 'http://www.pricelinedeals.com', bg: '#003399', fg: '#ffffff', badge: 'SALE' },
];

function seedToNumber(seed: string | number): number {
  const s = String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Which ad shows for a given seed at rotation step `tick` — fully deterministic. */
export function adForSeed(seed: string | number, tick = 0): BannerDef {
  const start = seedToNumber(seed) % ADS.length;
  return ADS[(start + tick) % ADS.length];
}

interface BannerAdProps {
  onNavigate: (url: string) => void;
  /** Anchors the rotation so a given site always opens on the same ad. */
  seed?: string | number;
  /** Rotation period in ms; set to 0 to hold on a single ad. */
  intervalMs?: number;
  className?: string;
}

export default function BannerAd({ onNavigate, seed = 'default', intervalMs = 4000, className }: BannerAdProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!intervalMs) return;
    const timer = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  const ad = adForSeed(seed, tick);

  return (
    <div
      className={className}
      style={{ width: 468, maxWidth: '100%', height: 60, margin: '0 auto' }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onNavigate(ad.target)}
        onKeyDown={(e) => { if (e.key === 'Enter') onNavigate(ad.target); }}
        className="w-full h-full flex items-center gap-2 px-2 overflow-hidden cursor-pointer border border-solid border-t-[#ffffff] border-l-[#ffffff] border-b-[#808080] border-r-[#808080] select-none"
        style={{ backgroundColor: ad.bg, color: ad.fg }}
        title="Advertisement"
      >
        {ad.badge && (
          <span
            className="shrink-0 px-1 text-[10px] font-bold border border-solid"
            style={{ borderColor: ad.fg }}
          >
            {ad.badge}
          </span>
        )}
        <div className="flex-1 overflow-hidden whitespace-nowrap">
          <span className="banner-scroll inline-block font-bold text-[13px]" style={{ fontFamily: 'Arial, sans-serif' }}>
            {ad.text}
          </span>
        </div>
      </div>

      <style jsx>{`
        .banner-scroll {
          animation: banner-marquee 12s linear infinite;
        }
        @keyframes banner-marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
