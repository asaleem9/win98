'use client';

import type { SiteDef } from './registry';

import { useEffect, useRef, useState } from 'react';
import { playSound } from '@/lib/sounds';

interface Auction {
  id: string;
  title: string;
  emoji: string;
  startBid: number;
  bids: number;
  /** Seconds left when the page loads. */
  endsIn: number;
  seller: string;
  desc: string;
}

const AUCTIONS: Auction[] = [
  { id: 'a1', title: 'Princess Diana Beanie Baby Bear (RETIRED, MINT!)', emoji: '🐻', startBid: 412.5, bids: 47, endsIn: 3 * 3600 + 41 * 60 + 12, seller: 'beaniequeen_pa', desc: 'PURPLE bear, tag protected in hard case. NO reserve! Retirement = INSTANT collectible. My kids college fund!!' },
  { id: 'a2', title: 'Furby (Gray) BRAND NEW IN BOX - HARD TO FIND', emoji: '🦉', startBid: 89.99, bids: 23, endsIn: 1 * 3600 + 12 * 60 + 5, seller: 'toyz4less99', desc: 'Sold out at every Toys R Us in 3 states! It talks, it sleeps, it learns English. A must for Christmas.' },
  { id: 'a3', title: 'Pokemon 1st Edition Charizard Holo - PSA WORTHY', emoji: '🔥', startBid: 24.0, bids: 31, endsIn: 55 * 60 + 30, seller: 'cardshark_kev', desc: 'Base Set shadowless holographic. Pulled it myself, never played. Sleeve + top loader included.' },
  { id: 'a4', title: 'Tickle Me Elmo (WORKS!) *** RARE ***', emoji: '🧸', startBid: 149.5, bids: 18, endsIn: 6 * 3600 + 3 * 60, seller: 'grandma_dot', desc: 'He giggles when you tickle his tummy! Batteries not included. Smoke free home. Local pickup preferred.' },
  { id: 'a5', title: 'Star Wars Ep 1 Darth Maul Figure (Sealed)', emoji: '🌌', startBid: 12.99, bids: 9, endsIn: 22 * 60 + 44, seller: 'jedimaster77', desc: 'From the NEW movie! Still on card. Buy now before the hype makes this worth THOUSANDS someday.' },
  { id: 'a6', title: 'Sony Walkman Portable CD Player (Skip-Free!)', emoji: '🎧', startBid: 34.0, bids: 6, endsIn: 4 * 3600 + 30 * 60, seller: 'audioAndy', desc: 'ESP anti-skip protection. Great for jogging. Comes with foam headphones and 1 AA adapter.' },
];

function fmtTime(total: number): string {
  if (total <= 0) return 'ENDED';
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export const site: SiteDef = {
  key: 'ebay',
  urls: ['http://www.ebay.com', 'www.ebay.com', 'ebay.com'],
  title: 'eBay: Your Personal Trading Community',
  keywords: ['ebay', 'auction', 'bid', 'beanie babies', 'furby', 'pokemon', 'collectibles', 'buy', 'sell', 'trading'],
  description: 'eBay online auctions — bid on Beanie Babies, Furbys, Pokemon cards and more collectibles.',
  render: () => <Ebay1998 />,
};

export default function Ebay1998() {
  const [times, setTimes] = useState<Record<string, number>>(
    () => Object.fromEntries(AUCTIONS.map((a) => [a.id, a.endsIn])),
  );
  const [bids, setBids] = useState<Record<string, { amount: number; count: number }>>(
    () => Object.fromEntries(AUCTIONS.map((a) => [a.id, { amount: a.startBid, count: a.bids }])),
  );
  const [outbid, setOutbid] = useState<string | null>(null);
  const outbidTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Every auction clock ticks down once a second.
  useEffect(() => {
    const t = setInterval(() => {
      setTimes((prev) => {
        const next: Record<string, number> = {};
        for (const [id, v] of Object.entries(prev)) next[id] = Math.max(0, v - 1);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => () => { if (outbidTimer.current) clearTimeout(outbidTimer.current); }, []);

  const placeBid = (a: Auction) => {
    if (times[a.id] <= 0) return;
    const increment = a.startBid < 30 ? 1 : a.startBid < 150 ? 5 : 25;
    setBids((prev) => ({
      ...prev,
      [a.id]: { amount: Math.round((prev[a.id].amount + increment) * 100) / 100, count: prev[a.id].count + 1 },
    }));
    setOutbid(null);
    playSound('menuClick');
    // The rival bidder always comes back. There is no winning.
    if (outbidTimer.current) clearTimeout(outbidTimer.current);
    outbidTimer.current = setTimeout(() => {
      setBids((prev) => ({
        ...prev,
        [a.id]: { amount: Math.round((prev[a.id].amount + increment) * 100) / 100, count: prev[a.id].count + 1 },
      }));
      setOutbid(a.id);
      playSound('exclamation');
    }, 3000);
  };

  return (
    <div className="min-h-full bg-white text-black font-[Arial,Helvetica,sans-serif] text-[12px]">
      {/* eBay wordmark */}
      <div className="bg-white border-b-2 border-[#cccccc] px-3 py-2 flex items-center gap-2">
        <span className="text-[26px] font-bold italic tracking-tight">
          <span className="text-[#e53238]">e</span><span className="text-[#0064d2]">b</span><span className="text-[#f5af02]">a</span><span className="text-[#86b817]">y</span>
        </span>
        <span className="text-[10px] text-[#666666]">Your Personal Trading Community&trade;</span>
        <span className="ml-auto text-[10px] text-[#0000cc] underline cursor-pointer">register &middot; sign in &middot; my eBay</span>
      </div>
      <div className="bg-[#003399] text-white text-[11px] px-3 py-[3px] flex gap-4">
        <span className="text-[#ffff99] font-bold">Featured</span>
        <span className="text-[#aaccff]">Toys &amp; Beanies</span>
        <span className="text-[#aaccff]">Collectibles</span>
        <span className="text-[#aaccff]">Electronics</span>
        <span className="ml-auto text-[#aaccff]">{AUCTIONS.length} items found</span>
      </div>

      <div className="max-w-[640px] mx-auto px-3 py-3">
        <div className="text-[13px] font-bold text-[#cc6600] mb-2">Hot Items ending soon!</div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#ffcc00] text-[10px] text-left">
              <th className="px-2 py-1 border border-[#cc9900]">Item</th>
              <th className="px-2 py-1 border border-[#cc9900] w-[80px]">Price</th>
              <th className="px-2 py-1 border border-[#cc9900] w-[50px]">Bids</th>
              <th className="px-2 py-1 border border-[#cc9900] w-[110px]">Time Left</th>
              <th className="px-2 py-1 border border-[#cc9900] w-[70px]"></th>
            </tr>
          </thead>
          <tbody>
            {AUCTIONS.map((a, i) => {
              const ended = times[a.id] <= 0;
              return (
                <tr key={a.id} className={i % 2 ? 'bg-[#f4f8ff]' : 'bg-white'}>
                  <td className="px-2 py-2 border border-[#dddddd] align-top">
                    <div className="flex items-start gap-2">
                      <span className="text-[22px] leading-none">{a.emoji}</span>
                      <div>
                        <div className="text-[#0000cc] underline cursor-pointer font-bold text-[11px]">{a.title}</div>
                        <div className="text-[#666666] text-[10px] mt-[2px]">{a.desc}</div>
                        <div className="text-[9px] text-[#999999] mt-[2px]">seller: {a.seller} (feedback: {120 + i * 37} ⭐)</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 border border-[#dddddd] align-top text-[#009900] font-bold whitespace-nowrap">
                    ${bids[a.id].amount.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 border border-[#dddddd] align-top text-center">{bids[a.id].count}</td>
                  <td className={`px-2 py-2 border border-[#dddddd] align-top whitespace-nowrap font-bold ${times[a.id] < 3600 && !ended ? 'text-[#cc0000]' : 'text-[#333333]'}`}>
                    {fmtTime(times[a.id])}
                  </td>
                  <td className="px-2 py-2 border border-[#dddddd] align-top text-center">
                    <button
                      onClick={() => placeBid(a)}
                      disabled={ended}
                      className="bg-[#0064d2] text-white border-none px-2 py-[3px] text-[10px] font-bold cursor-pointer disabled:opacity-50"
                    >
                      {ended ? 'Ended' : 'Bid!'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {outbid && (
          <div className="border-2 border-[#cc0000] bg-[#ffecec] text-[#cc0000] font-bold text-center py-2 mt-3 animate-pulse">
            ⚠ You have been outbid! Someone bid higher on &ldquo;{AUCTIONS.find((a) => a.id === outbid)?.title}&rdquo;. Bid again to stay in the lead!
          </div>
        )}

        <div className="text-center text-[10px] text-[#999999] border-t border-[#cccccc] pt-2 mt-3">
          Copyright &copy; 1998 eBay Inc. eBay is a trademark of eBay Inc. Best experienced at 800x600.
        </div>
      </div>
    </div>
  );
}
