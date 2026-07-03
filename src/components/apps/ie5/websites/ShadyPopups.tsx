'use client';

import type { SiteDef } from './registry';

import { useEffect, useState } from 'react';
import { useWindows } from '@/contexts/WindowContext';

const POPUP_URL = 'http://www.free-screensavers-98.com/wow';
const MAX_POPUPS = 3;

export const site: SiteDef = {
  key: 'shadypopups',
  urls: [
    'http://www.free-screensavers-98.com',
    'www.free-screensavers-98.com',
    'free-screensavers-98.com',
    POPUP_URL,
    'http://www.free-screensavers-98.com/win',
  ],
  title: 'FREE SCREENSAVERS & CURSORS!!!',
  keywords: ['screensavers', 'cursors', 'free', 'smileys', 'popups', 'download', 'wallpaper', 'winner', 'prize'],
  description: 'FREE animated cursors, screensavers and smileys!!! You are the 1,000,000th visitor!!!',
  render: () => <ShadyPopups />,
};

export default function ShadyPopups() {
  const { openWindow } = useWindows();
  const [opened, setOpened] = useState(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 400);
    return () => clearInterval(t);
  }, []);

  // Any interaction spawns 1-2 more browser windows — until we hit the cap so
  // we don't bury the desktop.
  const spawn = () => {
    setOpened((count) => {
      if (count >= MAX_POPUPS) return count;
      const want = Math.min(MAX_POPUPS - count, 1 + Math.round(Math.random()));
      for (let i = 0; i < want; i++) {
        openWindow('ie5', { launchParams: { url: POPUP_URL } });
      }
      return count + want;
    });
  };

  return (
    <div
      onClick={spawn}
      className="min-h-full bg-[#ffff00] text-black font-[Arial,sans-serif] text-[12px] cursor-pointer select-none"
    >
      {/* Flashing SALE banner */}
      <div className={`text-center py-2 text-[22px] font-bold ${blink ? 'bg-[#ff0000] text-[#ffff00]' : 'bg-[#0000ff] text-white'}`}>
        ★☆★ FREE STUFF!!! CLICK ANYWHERE!!! ★☆★
      </div>

      <div className="max-w-[560px] mx-auto px-4 py-3 text-center">
        <div className="text-[26px] font-bold text-[#ff00ff] my-2" style={{ fontFamily: 'Comic Sans MS, cursive', textShadow: '2px 2px 0 #000' }}>
          FREE SCREENSAVERS &amp; CURSORS!!!
        </div>

        <div className={`inline-block border-4 border-dashed px-4 py-2 my-2 ${blink ? 'border-[#ff0000] text-[#ff0000]' : 'border-[#009900] text-[#009900]'} bg-white font-bold text-[15px]`}>
          🎉 CONGRATULATIONS!!! 🎉<br />
          You are visitor #1,000,000!!!<br />
          You have WON a FREE iMac!!!
        </div>

        <div className="grid grid-cols-3 gap-2 my-3">
          {['🖱️ Animated Cursors', '💾 3D Screensavers', '😀 Smiley Packs', '🎆 Fireworks Cursor', '🐶 Puppy Screensaver', '💰 Money Wallpaper'].map((t) => (
            <div key={t} className="border-2 border-[#000099] bg-white p-2 text-[11px] font-bold hover:bg-[#ffffcc]">
              {t}<br />
              <span className="text-[#009900]">FREE!</span>
            </div>
          ))}
        </div>

        <button className="bg-[#ff0000] text-[#ffff00] border-4 border-[#000099] px-6 py-2 text-[16px] font-bold cursor-pointer my-2 animate-pulse">
          ⬇ DOWNLOAD NOW!!! ⬇
        </button>

        <div className="text-[10px] text-[#333] mt-3 bg-white/70 p-2">
          {opened >= MAX_POPUPS
            ? '(Your popup blocker finally kicked in. Phew.)'
            : `100% VIRUS FREE* — clicking may open bonus offers (${opened}/${MAX_POPUPS})`}
          <br />*not a guarantee. Best viewed at 800x600 with Active Desktop ON.
        </div>

        <div className="text-[9px] text-[#666] mt-2">
          &copy; 1999 Free-Screensavers-98 Network &middot; A subsidiary of Definitely Not Spyware Inc.
        </div>
      </div>
    </div>
  );
}
