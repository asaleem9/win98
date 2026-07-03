'use client';

import type { SiteDef } from './registry';

import { useState } from 'react';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { playSound } from '@/lib/sounds';

const DOWNLOADS_DIR = 'C:\\My Documents\\Downloads';

interface DownloadApp {
  name: string;
  version: string;
  file: string;
  /** File content written to disk — 'installer:<slug>' feeds a future install chain. */
  marker: string;
  size: string;
  note: string;
  stars: number;
  recommended?: boolean;
  warning?: boolean;
}

// Grouped exactly like Download.com's old category rails.
const CATEGORIES: { name: string; apps: DownloadApp[] }[] = [
  {
    name: 'Utilities',
    apps: [
      { name: 'WinZip', version: '7.0', file: 'winzip70.exe', marker: 'installer:winzip', size: '1.2 MB', note: 'The #1 compression utility. Un-zip anything!', stars: 5, recommended: true },
      { name: 'RAM Doubler 98', version: '2.0', file: 'ram_doubler.exe', marker: 'installer:ram-doubler', size: '860 KB', note: 'DOUBLE your memory without opening the case!', stars: 4 },
      { name: 'BonziBUDDY', version: '1.0', file: 'bonzibuddy.exe', marker: 'installer:bonzibuddy', size: '3.4 MB', note: 'A friendly purple gorilla who browses WITH you!', stars: 1, warning: true },
    ],
  },
  {
    name: 'Internet',
    apps: [
      { name: 'Winamp', version: '2.5', file: 'winamp25.exe', marker: 'installer:winamp', size: '1.8 MB', note: 'It really whips the llama’s ass. MP3 + skins!', stars: 5, recommended: true },
      { name: 'RealPlayer G2', version: '6.0', file: 'rp_g2.exe', marker: 'installer:realplayer', size: '4.1 MB', note: 'Streaming audio & video over your 56k modem.', stars: 3 },
      { name: 'ICQ', version: '99a', file: 'icq99a.exe', marker: 'installer:icq', size: '2.6 MB', note: 'Uh-oh! Instant message your buddies worldwide.', stars: 4 },
    ],
  },
  {
    name: 'Games',
    apps: [
      { name: 'DOOM (Shareware)', version: '1.9', file: 'doom19s.exe', marker: 'installer:doom', size: '2.4 MB', note: 'Rip and tear through Episode 1: Knee-Deep in the Dead.', stars: 5, recommended: true },
      { name: 'Duke Nukem 3D', version: 'Shareware', file: 'duke3d.exe', marker: 'installer:duke', size: '3.8 MB', note: 'Hail to the king, baby. Shareware episode included.', stars: 4 },
    ],
  },
];

export const site: SiteDef = {
  key: 'downloads',
  urls: [
    'http://www.download.com',
    'www.download.com',
    'download.com',
    'http://www.downloads.com',
    'downloads.com',
  ],
  title: 'CNET Download.com',
  keywords: ['download', 'downloads', 'cnet', 'shareware', 'freeware', 'software', 'winzip', 'winamp', 'utilities', 'games', 'programs', 'install'],
  description: 'CNET Download.com — the Web’s biggest library of shareware and freeware for Windows.',
  render: () => <CnetDownloads />,
};

function Stars({ n }: { n: number }) {
  return (
    <span className="text-[#ff9900] tracking-tight" title={`${n} of 5`}>
      {'★'.repeat(n)}
      <span className="text-[#cccccc]">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

export default function CnetDownloads() {
  const { writeFile } = useFileSystem();
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState<{ file: string; name: string } | null>(null);

  const startDownload = (app: DownloadApp) => {
    if (active) return; // one download at a time, just like a 56k modem
    setActive(app.file);
    setSaved(null);
    setProgress(0);
    let p = 0;
    const timer = setInterval(() => {
      p += Math.random() < 0.3 ? 4 : 11; // uneven, dial-up-style trickle
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
        writeFile(`${DOWNLOADS_DIR}\\${app.file}`, app.marker);
        playSound('ding');
        setActive(null);
        setSaved({ file: app.file, name: app.name });
      }
      setProgress(Math.min(p, 100));
    }, 130);
  };

  return (
    <div className="min-h-full bg-white text-black font-[Arial,Helvetica,sans-serif] text-[12px]">
      {/* CNET-style banner */}
      <div className="bg-[#cc0000] text-white px-3 py-2 flex items-baseline gap-2">
        <span className="text-[22px] font-bold italic" style={{ fontFamily: 'Arial Black, Arial, sans-serif' }}>
          Download<span className="text-[#ffcc00]">.com</span>
        </span>
        <span className="text-[10px] text-[#ffdddd]">from CNET &middot; The source for free software</span>
      </div>
      <div className="bg-[#003399] text-white text-[11px] px-3 py-[3px] flex gap-4">
        <span className="font-bold">Windows</span>
        <span className="text-[#aaccff]">Macintosh</span>
        <span className="text-[#aaccff]">Linux</span>
        <span className="text-[#aaccff]">Palm</span>
        <span className="ml-auto text-[#ffff99]">Top 100 Downloads</span>
      </div>

      <div className="max-w-[640px] mx-auto px-3 py-3">
        <div className="border border-[#ffcc66] bg-[#fffbe6] px-3 py-2 mb-3 text-[11px]">
          <b className="text-[#cc6600]">Featured:</b> All titles are certified <b>SpyWare-Free</b>* and scanned for viruses.
          Click <b>Download Now</b> and the file saves straight to your <b>Downloads</b> folder.
          <div className="text-[9px] text-[#999999] mt-1">*BonziBUDDY certification pending.</div>
        </div>

        {CATEGORIES.map((cat) => (
          <div key={cat.name} className="mb-4">
            <div className="bg-[#003399] text-white text-[12px] font-bold px-2 py-[3px]">{cat.name}</div>
            <table className="w-full border-collapse text-[11px]">
              <tbody>
                {cat.apps.map((app, i) => (
                  <tr key={app.file} className={i % 2 ? 'bg-[#eef2fb]' : 'bg-white'}>
                    <td className="align-top py-2 px-2 border-b border-[#dddddd]">
                      <div className="flex items-center gap-1">
                        <span className="text-[#0000cc] underline cursor-pointer font-bold">
                          {app.name} {app.version}
                        </span>
                        {app.recommended && (
                          <span className="bg-[#009900] text-white text-[8px] px-1 rounded-sm">EDITORS&rsquo; PICK</span>
                        )}
                        {app.warning && (
                          <span className="bg-[#cc0000] text-white text-[8px] px-1 rounded-sm">NOT RECOMMENDED</span>
                        )}
                      </div>
                      <div className="text-[#555555] mt-[2px]">{app.note}</div>
                      <div className="text-[9px] text-[#888888] mt-[2px]">
                        <Stars n={app.stars} /> &middot; {app.size} &middot; Freeware
                      </div>
                    </td>
                    <td className="align-middle py-2 px-2 border-b border-[#dddddd] text-right whitespace-nowrap">
                      <button
                        onClick={() => startDownload(app)}
                        disabled={active !== null}
                        className="bg-[#ffcc00] text-black border border-[#cc9900] px-2 py-[3px] text-[10px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        Download Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {active && (
          <div className="border-2 border-[#003399] bg-[#eef2fb] p-3 mb-3">
            <div className="text-[11px] mb-2 font-bold">Downloading {active}&hellip; please do not disconnect.</div>
            <div className="w-full h-[16px] border border-[#333333] bg-white">
              <div className="h-full bg-[#003399] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-[10px] mt-1 text-[#555555]">
              {progress}% complete &middot; est. {Math.max(1, Math.round((100 - progress) / 8))} min remaining (56.6k)
            </div>
          </div>
        )}

        {saved && (
          <div className="border-2 border-[#009900] bg-[#eaffea] p-3 mb-3 text-[11px]">
            <b className="text-[#006600]">Download complete!</b> {saved.name} was saved to:
            <div className="font-[Courier_New,monospace] text-[10px] mt-1">{DOWNLOADS_DIR}\{saved.file}</div>
            <div className="text-[10px] text-[#666666] mt-1">Open My Documents &rarr; Downloads to run the installer.</div>
          </div>
        )}

        <div className="text-center text-[10px] text-[#999999] border-t border-[#cccccc] pt-2 mt-2">
          Copyright &copy; 1999 CNET Networks, Inc. All rights reserved. Best viewed at 800x600.
        </div>
      </div>
    </div>
  );
}
