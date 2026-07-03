'use client';

import type { SiteDef } from './registry';

import { useState } from 'react';

const RAM_OPTIONS = [
  { size: '64 MB', price: 'FREE', note: 'Recommended for Windows 95' },
  { size: '128 MB', price: 'FREE', note: 'Great for Windows 98!' },
  { size: '256 MB', price: 'FREE', note: 'For power users' },
  { size: '512 MB', price: 'FREE', note: 'EXTREME performance' },
  { size: '1 GB', price: 'FREE', note: 'Why not?!' },
];

export const site: SiteDef = {
  key: 'downloadram',
  urls: ['http://www.downloadmoreram.com', 'www.downloadmoreram.com', 'downloadmoreram.com'],
  title: 'DownloadMoreRAM.com',
  keywords: ['ram', 'memory', 'download', 'upgrade', 'free'],
  description: 'Definitely-real free RAM downloads for your PC.',
  render: () => <DownloadMoreRam />,
};

export default function DownloadMoreRam() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const startDownload = (size: string) => {
    setDownloading(size);
    setDone(false);
    setProgress(0);
    let p = 0;
    const timer = setInterval(() => {
      p += 7;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
        setDone(true);
      }
      setProgress(p);
    }, 120);
  };

  return (
    <div className="min-h-full bg-[#000000] text-[#00ff00] font-[Courier_New,monospace] text-[13px]">
      <div className="text-center py-3 border-b-2 border-[#00ff00]">
        <div className="text-[28px] font-bold text-[#00ff00]" style={{ textShadow: '0 0 8px #00ff00' }}>
          DownloadMoreRAM.com
        </div>
        <div className="text-[12px] text-[#00cc00] mt-1 blink">*** The #1 source for FREE downloadable RAM! ***</div>
      </div>

      <div className="max-w-[520px] mx-auto px-4 py-4">
        <div className="border border-[#00ff00] p-3 mb-4 bg-[#001100]">
          <p className="mb-2">Is your computer running SLOW? Getting &quot;Not enough memory&quot; errors?</p>
          <p className="mb-2 text-[#ffff00]">Just download more RAM! It&apos;s that easy! No screwdriver required!</p>
          <p className="text-[11px] text-[#00aa00]">100% guaranteed to make your PC faster or your money back (it&apos;s free).</p>
        </div>

        <div className="space-y-2 mb-4">
          {RAM_OPTIONS.map((opt) => (
            <div key={opt.size} className="flex items-center justify-between border border-[#008800] p-2 bg-[#001800]">
              <div>
                <span className="text-[#00ff00] font-bold text-[15px]">{opt.size} RAM</span>
                <span className="text-[#00aa00] text-[11px] ml-2">{opt.note}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#ffff00] font-bold">{opt.price}</span>
                <button
                  onClick={() => startDownload(opt.size)}
                  className="bg-[#00ff00] text-black border-none px-3 py-1 text-[11px] font-bold cursor-pointer"
                >
                  DOWNLOAD
                </button>
              </div>
            </div>
          ))}
        </div>

        {downloading && (
          <div className="border-2 border-[#00ff00] p-3 bg-[#001100]">
            <div className="text-[12px] mb-2">
              {done ? `✓ Downloaded ${downloading} of RAM!` : `Downloading ${downloading} of RAM...`}
            </div>
            <div className="w-full h-[16px] border border-[#00ff00] bg-black">
              <div className="h-full bg-[#00ff00] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-[11px] mt-1 text-[#00cc00]">{progress}% complete</div>
            {done && (
              <div className="text-[11px] mt-2 text-[#ffff00]">
                Please restart your computer to install your new RAM. (Just kidding, RAM doesn&apos;t work like this. But you knew that... right?)
              </div>
            )}
          </div>
        )}

        <div className="text-center text-[10px] text-[#008800] mt-4">
          As seen on the World Wide Web! &copy; 1999 DownloadMoreRAM.com
        </div>
      </div>

      <style jsx>{`
        .blink { animation: blinker 1s step-start infinite; }
        @keyframes blinker { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
