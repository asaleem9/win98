'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { Button98 } from '@/components/ui/Button98';
import { Input98 } from '@/components/ui/Input98';
import { StatusBar98 } from '@/components/ui/StatusBar98';

interface SearchResult {
  filename: string;
  size: string;
  speed: string;
  host: string;
  suspicious: boolean;
}

interface DownloadItem {
  filename: string;
  progress: number;
  speed: string;
  status: 'downloading' | 'stalled' | 'failed';
}

const RESULTS: SearchResult[] = [
  { filename: 'totally_not_a_virus.exe', size: '2.1 MB', speed: '56K', host: '192.168.1.42', suspicious: true },
  { filename: 'free_movie_2001.avi.exe', size: '702 MB', speed: 'Cable', host: '10.0.0.55', suspicious: true },
  { filename: 'song.mp3.scr', size: '3.4 MB', speed: 'T1', host: '172.16.0.12', suspicious: true },
  { filename: 'LinkinPark-InTheEnd.mp3', size: '4.2 MB', speed: '56K', host: '192.168.0.100', suspicious: false },
  { filename: 'coolsong_FINAL_v2_REAL.mp3', size: '3.8 MB', speed: 'Cable', host: '10.0.1.88', suspicious: false },
  { filename: 'system32_update.exe', size: '156 KB', speed: 'T1', host: '172.16.5.3', suspicious: true },
  { filename: 'MatrixDVDRip.avi', size: '1.4 GB', speed: '56K', host: '192.168.2.15', suspicious: false },
  { filename: 'Eminem-TheRealSlimShady.mp3', size: '4.7 MB', speed: 'Cable', host: '10.0.0.33', suspicious: false },
  { filename: 'FREE_SCREENSAVER!!!.scr', size: '890 KB', speed: 'T1', host: '172.16.3.7', suspicious: true },
  { filename: 'photo_album.jpg.exe', size: '1.2 MB', speed: '56K', host: '192.168.1.99', suspicious: true },
  { filename: 'Blink182-AllTheSmallThings.mp3', size: '3.1 MB', speed: 'Cable', host: '10.0.2.44', suspicious: false },
  { filename: 'kazaa_pro_crack.exe', size: '456 KB', speed: 'T1', host: '172.16.0.88', suspicious: true },
];

export default function LimeWire({ windowId }: AppComponentProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'downloads'>('search');
  const [searched, setSearched] = useState(false);
  const downloadTimers = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    return () => {
      downloadTimers.current.forEach(t => clearInterval(t));
    };
  }, []);

  const doSearch = useCallback(() => {
    if (!query.trim()) return;
    setSearched(true);
    const shuffled = [...RESULTS].sort(() => Math.random() - 0.5);
    setResults(shuffled.slice(0, 6 + Math.floor(Math.random() * 6)));
  }, [query]);

  const startDownload = useCallback((result: SearchResult) => {
    const idx = downloads.length;
    const item: DownloadItem = {
      filename: result.filename,
      progress: 0,
      speed: '0.0 KB/s',
      status: 'downloading',
    };
    setDownloads(prev => [...prev, item]);
    setActiveTab('downloads');

    const speeds = ['0.2 KB/s', '0.1 KB/s', '0.5 KB/s', '1.1 KB/s', '0.0 KB/s'];
    const timer = setInterval(() => {
      setDownloads(prev => {
        const updated = [...prev];
        const dl = { ...updated[idx] };
        if (!dl || dl.status === 'failed') {
          clearInterval(timer);
          return prev;
        }
        if (Math.random() < 0.15) {
          dl.status = 'stalled';
          dl.speed = 'HOST UNREACHABLE';
        } else if (Math.random() < 0.08) {
          dl.status = 'failed';
          dl.speed = 'CONNECTION RESET';
          clearInterval(timer);
        } else {
          dl.status = 'downloading';
          dl.progress = Math.min(dl.progress + Math.random() * 2, 95);
          dl.speed = speeds[Math.floor(Math.random() * speeds.length)];
        }
        updated[idx] = dl;
        return updated;
      });
    }, 1500);
    downloadTimers.current.set(idx, timer);
  }, [downloads.length]);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] overflow-hidden">
      {/* Header - green LimeWire brand */}
      <div className="flex items-center gap-2 px-3 py-[6px] bg-gradient-to-r from-[#339933] to-[#66cc33]">
        <span className="font-bold text-white text-[13px]">LimeWire</span>
        <span className="text-[#ccffcc] text-[10px]">v4.12.6</span>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-1 px-2 py-1 bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)]">
        <Input98
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          placeholder="Search for files..."
          className="flex-1"
        />
        <Button98 onClick={doSearch} className="min-w-[60px]">Search</Button98>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--win98-button-shadow)]">
        {(['search', 'downloads'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1 text-[11px] cursor-default border-r border-[var(--win98-button-shadow)] ${
              activeTab === tab ? 'bg-[var(--win98-button-face)] font-bold' : 'bg-[var(--win98-button-shadow)]'
            }`}
          >
            {tab === 'search' ? `Search${results.length ? ` (${results.length})` : ''}` : `Downloads (${downloads.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        {activeTab === 'search' ? (
          <div>
            {!searched ? (
              <div className="flex items-center justify-center h-full text-[#888] py-8">
                Search for files on the Gnutella network
              </div>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] sticky top-0">
                    <th className="text-left px-2 py-[2px] font-normal">Filename</th>
                    <th className="text-left px-2 py-[2px] font-normal w-[60px]">Size</th>
                    <th className="text-left px-2 py-[2px] font-normal w-[50px]">Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr
                      key={i}
                      className="hover:bg-[var(--win98-highlight)] hover:text-[var(--win98-highlight-text)] cursor-default"
                      onDoubleClick={() => startDownload(r)}
                    >
                      <td className="px-2 py-[1px] flex items-center gap-1">
                        {r.suspicious && <span title="Suspicious file" className="text-[#ff0000] text-[13px]">⚠</span>}
                        <span className={r.suspicious ? 'text-[#cc0000]' : ''}>{r.filename}</span>
                      </td>
                      <td className="px-2 py-[1px]">{r.size}</td>
                      <td className="px-2 py-[1px]">{r.speed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div>
            {downloads.length === 0 ? (
              <div className="flex items-center justify-center text-[#888] py-8">
                No active downloads
              </div>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] sticky top-0">
                    <th className="text-left px-2 py-[2px] font-normal">Filename</th>
                    <th className="text-left px-2 py-[2px] font-normal w-[80px]">Progress</th>
                    <th className="text-left px-2 py-[2px] font-normal w-[100px]">Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {downloads.map((dl, i) => (
                    <tr key={i} className="border-b border-[#eee]">
                      <td className="px-2 py-[2px]">{dl.filename}</td>
                      <td className="px-2 py-[2px]">
                        <div className="w-full h-[10px] bg-[#ddd] border border-[#999]">
                          <div
                            className="h-full"
                            style={{
                              width: `${dl.progress}%`,
                              background: dl.status === 'failed' ? '#cc0000' : dl.status === 'stalled' ? '#cc9900' : '#339933',
                            }}
                          />
                        </div>
                      </td>
                      <td className={`px-2 py-[2px] ${dl.status === 'failed' ? 'text-[#cc0000]' : dl.status === 'stalled' ? 'text-[#cc6600]' : ''}`}>
                        {dl.speed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <StatusBar98
        panels={[
          { content: `Hosts: ${Math.floor(Math.random() * 50 + 10)} | Files: ${Math.floor(Math.random() * 100000 + 50000)}` },
          { content: `${downloads.filter(d => d.status === 'downloading').length} active`, width: 60 },
        ]}
      />
    </div>
  );
}
