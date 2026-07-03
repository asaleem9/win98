'use client';

import type { SiteDef } from './registry';

import { useEffect, useState } from 'react';

// No in-universe clock exists in the app, so we count down to the next real
// New Year and label it "the Year 2000" — always a live, positive countdown.
function nextNewYear(now: Date): Date {
  return new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
}

function breakdown(ms: number) {
  const clamp = Math.max(0, ms);
  const days = Math.floor(clamp / 86_400_000);
  const hours = Math.floor((clamp % 86_400_000) / 3_600_000);
  const minutes = Math.floor((clamp % 3_600_000) / 60_000);
  const seconds = Math.floor((clamp % 60_000) / 1000);
  return { days, hours, minutes, seconds };
}

const CHECKLIST = [
  'Bottled water (2 gallons per person, per day)',
  'Canned goods & manual can opener',
  'Flashlights + extra D batteries',
  'Battery-powered AM/FM radio',
  'Cash in small bills (ATMs may fail!)',
  'Printed copies of bank statements',
  'Candles and waterproof matches',
  'First-aid kit & prescription meds',
  'Full tank of gas',
  'Back up your hard drive to floppy disks',
];

export const site: SiteDef = {
  key: 'y2k',
  urls: ['http://www.y2k.com', 'www.y2k.com', 'y2k.com', 'http://www.y2kcountdown.com', 'y2kcountdown.com'],
  title: 'Y2K Preparedness Center',
  keywords: ['y2k', 'millennium bug', 'year 2000', 'countdown', 'preparedness', 'survival', 'apocalypse', 'computers', 'panic'],
  description: 'The Y2K Preparedness Center — a live countdown to the Millennium Bug and how to survive it.',
  render: () => <Y2KCountdown />,
};

export default function Y2KCountdown() {
  const [target] = useState(() => nextNewYear(new Date()));
  const [remaining, setRemaining] = useState(() => target.getTime() - Date.now());
  const [blink, setBlink] = useState(true);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const tick = setInterval(() => setRemaining(target.getTime() - Date.now()), 1000);
    const flash = setInterval(() => setBlink((b) => !b), 600);
    return () => { clearInterval(tick); clearInterval(flash); };
  }, [target]);

  const { days, hours, minutes, seconds } = breakdown(remaining);
  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="min-h-full bg-black text-[#00ff00] font-[Courier_New,monospace] text-[13px]">
      <div className="text-center py-3 border-b-2 border-[#ff0000]">
        <div className={`text-[26px] font-bold ${blink ? 'text-[#ff0000]' : 'text-[#660000]'}`} style={{ textShadow: '0 0 8px #ff0000' }}>
          ☢ Y2K PREPAREDNESS CENTER ☢
        </div>
        <div className="text-[12px] text-[#ffff00] mt-1">Is YOUR family ready for the Millennium Bug?</div>
      </div>

      <div className="max-w-[600px] mx-auto px-4 py-4">
        {/* Countdown */}
        <div className="border-2 border-[#ff0000] bg-[#110000] p-3 mb-4 text-center">
          <div className="text-[#ffff00] text-[12px] mb-2">TIME UNTIL THE YEAR 2000:</div>
          <div className="flex justify-center gap-3">
            {[
              { label: 'DAYS', value: days },
              { label: 'HOURS', value: hours },
              { label: 'MINUTES', value: minutes },
              { label: 'SECONDS', value: seconds },
            ].map((u) => (
              <div key={u.label} className="bg-black border border-[#00ff00] px-2 py-1 min-w-[56px]">
                <div className="text-[26px] font-bold text-[#00ff00]" style={{ textShadow: '0 0 6px #00ff00' }}>
                  {String(u.value).padStart(2, '0')}
                </div>
                <div className="text-[9px] text-[#00aa00]">{u.label}</div>
              </div>
            ))}
          </div>
          <div className={`text-[11px] mt-2 font-bold ${blink ? 'text-[#ff0000]' : 'text-transparent'}`}>
            ⚠ WARNING: TIME IS RUNNING OUT ⚠
          </div>
        </div>

        {/* Article */}
        <div className="border border-[#00aa00] bg-[#001100] p-3 mb-4">
          <div className="text-[18px] font-bold text-[#ffff00] mb-2">THE END OF COMPUTING?</div>
          <p className="mb-2 text-[#00dd00] text-[12px] leading-relaxed">
            When the clock strikes midnight on January 1st, 2000, computers around the world that store
            the year as just <b>TWO DIGITS</b> may believe it is the year <b>1900</b>. Experts warn this
            could crash banks, ground airplanes, disable power grids, and empty your bank account overnight.
          </p>
          <p className="mb-2 text-[#00dd00] text-[12px] leading-relaxed">
            Some say it will be a minor hiccup. Others are moving to cabins in Montana. Who is right?
            <b className="text-[#ffff00]"> Nobody knows.</b> That is why you must PREPARE NOW.
          </p>
          <p className="text-[10px] text-[#00aa00] italic">— reprinted from the Y2K Survival Newsletter, Issue #47</p>
        </div>

        {/* Checklist */}
        <div className="border border-[#00aa00] bg-[#001100] p-3 mb-4">
          <div className="text-[14px] font-bold text-[#ffff00] mb-2">
            YOUR SURVIVAL CHECKLIST ({doneCount}/{CHECKLIST.length})
          </div>
          <div className="space-y-1">
            {CHECKLIST.map((item, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer text-[12px]">
                <input
                  type="checkbox"
                  checked={!!checked[i]}
                  onChange={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
                />
                <span className={checked[i] ? 'line-through text-[#008800]' : 'text-[#00dd00]'}>{item}</span>
              </label>
            ))}
          </div>
          {doneCount === CHECKLIST.length && (
            <div className="text-[#ffff00] font-bold text-center mt-2">✓ You are as ready as you&rsquo;ll ever be. Good luck.</div>
          )}
        </div>

        <div className="text-center text-[10px] text-[#008800]">
          This page is not affiliated with any government agency. &copy; 1999 Y2K Preparedness Center.<br />
          Best viewed before civilization collapses &middot; 800x600
        </div>
      </div>
    </div>
  );
}
