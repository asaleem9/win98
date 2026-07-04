'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppComponentProps } from '@/types/app';
import { Button98 } from '@/components/ui/Button98';
import { Input98 } from '@/components/ui/Input98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { ContextMenu, ContextMenuItem } from '@/components/desktop/ContextMenu';
import { standardHelpMenu } from '@/lib/menus';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useWindows } from '@/contexts/WindowContext';
import { showSystemError } from '@/hooks/useFileOpener';
import { musicTracks } from '@/lib/audio/tracks';
import {
  isNortonOpened,
  quarantineThreat,
  threatForDownload,
  showNortonAlert,
} from '@/components/apps/norton/realtimeShield';

const DOWNLOADS_DIR = 'C:\\My Documents\\Downloads';

interface SearchResult {
  filename: string;
  size: string;
  speed: string;
  host: string;
  suspicious: boolean;
  virus: boolean;
  playable: boolean;
  /** Bundled track id, present only for playable results. */
  trackId?: string;
}

interface DownloadItem {
  filename: string;
  progress: number;
  speed: string;
  status: 'downloading' | 'stalled' | 'failed' | 'complete';
  virus: boolean;
  playable: boolean;
  trackId?: string;
  removed?: boolean;
}

const PLAYABLE_RESULTS: SearchResult[] = musicTracks.map((t, i) => ({
  filename: t.fileName,
  size: '3.4 MB',
  speed: (['Cable', 'T1', '56K'] as const)[i % 3],
  host: `10.0.${i}.${(i * 7) % 255}`,
  suspicious: false,
  virus: false,
  playable: true,
  trackId: t.id,
}));

const FILE_RESULTS: Omit<SearchResult, 'virus' | 'playable'>[] = [
  { filename: 'FREE_RAM_DOWNLOADER.exe', size: '128 KB', speed: 'T1', host: '66.66.66.66', suspicious: true },
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

// Anything that's an executable / screensaver masquerading as media is "a virus".
function isVirusFile(name: string): boolean {
  return /\.(exe|scr|bat|com|vbs)$/i.test(name) || /free_ram/i.test(name);
}

const RESULTS: SearchResult[] = [
  ...PLAYABLE_RESULTS,
  ...FILE_RESULTS.map((r) => ({ ...r, virus: isVirusFile(r.filename), playable: false })),
];

export default function LimeWire({ windowId }: AppComponentProps) {
  const { createFile } = useFileSystem();
  const { getAppPref, setAppPref } = useSettings();
  const { openWindow, closeWindow } = useWindows();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'downloads'>('search');
  const [searched, setSearched] = useState(false);
  const [selectedDownload, setSelectedDownload] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  const [network, setNetwork] = useState({ hosts: 34, files: 82113 });
  const downloadTimers = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const persistedRef = useRef<Set<number>>(new Set());
  const virusFiredRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const timers = downloadTimers.current;
    return () => { timers.forEach((t) => clearInterval(t)); };
  }, []);

  // Live-ish Gnutella network stats, updated from a timer (not render).
  useEffect(() => {
    const t = setInterval(() => {
      setNetwork((n) => ({
        hosts: Math.max(8, n.hosts + Math.floor(Math.random() * 10 - 4)),
        files: Math.max(40000, n.files + Math.floor(Math.random() * 2000 - 900)),
      }));
    }, 2500);
    return () => clearInterval(t);
  }, []);

  const doSearch = useCallback(() => {
    if (!query.trim()) return;
    setSearched(true);
    const q = query.trim().toLowerCase();
    // Always surface the playable tracks; mix in matching junk files.
    const matches = RESULTS.filter((r) => r.playable || r.filename.toLowerCase().includes(q));
    const pool = matches.length >= 4 ? matches : RESULTS;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setResults(shuffled.slice(0, 6 + Math.floor(Math.random() * 6)));
  }, [query]);

  const startDownload = useCallback((result: SearchResult) => {
    const idx = downloads.length;
    const item: DownloadItem = {
      filename: result.filename,
      progress: 0,
      speed: '0.0 KB/s',
      status: 'downloading',
      virus: result.virus,
      playable: result.playable,
      trackId: result.trackId,
    };
    setDownloads((prev) => [...prev, item]);
    setActiveTab('downloads');

    const speeds = ['0.2 KB/s', '0.1 KB/s', '0.5 KB/s', '1.1 KB/s', '2.3 KB/s'];
    const timer = setInterval(() => {
      setDownloads((prev) => {
        const updated = [...prev];
        const dl = { ...updated[idx] };
        if (!dl || dl.status === 'failed' || dl.status === 'complete' || dl.removed) {
          clearInterval(timer);
          return prev;
        }
        // Viruses download suspiciously fast; junk files occasionally die.
        if (!dl.virus && Math.random() < 0.05) {
          dl.status = 'failed';
          dl.speed = 'CONNECTION RESET';
          clearInterval(timer);
        } else if (!dl.virus && Math.random() < 0.08) {
          dl.status = 'stalled';
          dl.speed = 'HOST UNREACHABLE';
        } else {
          dl.status = 'downloading';
          dl.progress = Math.min(dl.progress + (dl.virus ? 12 : Math.random() * 4 + 1), 100);
          dl.speed = dl.virus ? '999.9 KB/s' : speeds[Math.floor(Math.random() * speeds.length)];
          if (dl.progress >= 100) {
            dl.progress = 100;
            dl.status = 'complete';
            clearInterval(timer);
          }
        }
        updated[idx] = dl;
        return updated;
      });
    }, 700);
    downloadTimers.current.set(idx, timer);
  }, [downloads.length]);

  // Persist completed downloads as real files, and spring the virus trap.
  useEffect(() => {
    downloads.forEach((dl, i) => {
      if (dl.status !== 'complete') return;
      if (dl.virus && !virusFiredRef.current.has(i)) {
        virusFiredRef.current.add(i);
        if (isNortonOpened()) {
          // Norton's real-time shield intercepts the download and quarantines it
          // before the gorilla can get a foot in the door.
          quarantineThreat({ getAppPref, setAppPref }, threatForDownload(dl.filename, DOWNLOADS_DIR));
          showNortonAlert();
        } else {
          openWindow('bonzi-buddy');
          showSystemError(
            'Windows Security Alert',
            `You have downloaded ${dl.filename}!\n\nWarning: This program has made changes to your computer. A friendly purple gorilla has been installed and will now help you browse the Internet.\n\n(Tip: never run .exe files from LimeWire.)`,
          );
        }
      }
      if (!dl.virus && !persistedRef.current.has(i)) {
        persistedRef.current.add(i);
        // Bundled tracks store a 'track:<id>' reference; other files use a
        // placeholder that players resolve by filename.
        createFile(DOWNLOADS_DIR, dl.filename, dl.trackId ? `track:${dl.trackId}` : '[MP3 Audio]');
      }
    });
  }, [downloads, createFile, openWindow, getAppPref, setAppPref]);

  const playInWinamp = useCallback((filename: string) => {
    openWindow('winamp', { launchParams: { filePath: `${DOWNLOADS_DIR}\\${filename}` } });
  }, [openWindow]);

  // Cancel a transfer (stops its timer and drops it from the list) — the way to
  // dismiss a download that's stuck on HOST UNREACHABLE.
  const cancelDownload = useCallback((index: number) => {
    const timer = downloadTimers.current.get(index);
    if (timer) { clearInterval(timer); downloadTimers.current.delete(index); }
    setDownloads((prev) => prev.map((d, i) => (i === index ? { ...d, removed: true } : d)));
    setSelectedDownload((sel) => (sel === index ? null : sel));
    setMenu(null);
  }, []);

  const clearFinished = useCallback(() => {
    setDownloads((prev) => prev.map((d) => (d.status === 'complete' ? { ...d, removed: true } : d)));
    setMenu(null);
  }, []);

  const visibleDownloads = downloads.filter((d) => !d.removed);
  const completedCount = downloads.filter((d) => d.status === 'complete' && !d.removed).length;

  // What Actions > Cancel Transfer targets: a selected transfer if it's still
  // going, otherwise the first live/stalled one.
  const cancellableIndex = useMemo(() => {
    const isCancellable = (d?: DownloadItem) =>
      !!d && !d.removed && (d.status === 'downloading' || d.status === 'stalled');
    if (selectedDownload !== null && isCancellable(downloads[selectedDownload])) return selectedDownload;
    return downloads.findIndex(isCancellable);
  }, [selectedDownload, downloads]);

  const menus = useMemo<MenuDefinition[]>(() => [
    {
      label: '&File',
      items: [
        {
          label: '&Open Downloads Folder',
          onClick: () => openWindow('explorer', { launchParams: { filePath: DOWNLOADS_DIR } }),
        },
        { label: '', separator: true },
        { label: 'E&xit', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: '&Actions',
      items: [
        { label: '&Cancel Transfer', onClick: () => cancelDownload(cancellableIndex), disabled: cancellableIndex < 0 },
        { label: 'Clear &Finished', onClick: clearFinished, disabled: completedCount === 0 },
      ],
    },
    standardHelpMenu('LimeWire'),
  ], [openWindow, closeWindow, windowId, cancelDownload, cancellableIndex, clearFinished, completedCount]);

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    if (!menu) return [];
    const dl = downloads[menu.index];
    return [
      { label: 'Cancel', onClick: () => cancelDownload(menu.index), disabled: !dl || dl.removed },
      { separator: true },
      { label: 'Clear Finished', onClick: clearFinished, disabled: completedCount === 0 },
    ];
  }, [menu, downloads, cancelDownload, clearFinished, completedCount]);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] overflow-hidden">
      <MenuBar menus={menus} windowId={windowId} />

      {/* Header - green LimeWire brand */}
      <div className="flex items-center gap-2 px-3 py-[6px] bg-gradient-to-r from-[#339933] to-[#66cc33]">
        <span className="font-bold text-white text-[13px]">LimeWire</span>
        <span className="text-[#ccffcc] text-[10px]">v4.12.6</span>
        {/* Connection quality indicator */}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[10px] text-white font-bold">Connection:</span>
          <div className="flex items-end gap-[1px] h-[12px]">
            {[5, 8, 11, 14].map((h, i) => (
              <div key={i} className="w-[3px] bg-[#ffff00]" style={{ height: `${h}px` }} />
            ))}
          </div>
          <span className="text-[10px] text-[#ffff66] font-bold">Turbo-Charged!</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-1 px-2 py-1 bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)]">
        <Input98
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          placeholder="Search for files..."
          className="flex-1"
        />
        <Button98 onClick={doSearch} className="min-w-[60px]">Search</Button98>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--win98-button-shadow)]">
        {(['search', 'downloads'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1 text-[11px] cursor-default border-r border-[var(--win98-button-shadow)] ${
              activeTab === tab ? 'bg-[var(--win98-button-face)] font-bold' : 'bg-[var(--win98-button-shadow)]'
            }`}
          >
            {tab === 'search' ? `Search${results.length ? ` (${results.length})` : ''}` : `Downloads (${visibleDownloads.length})`}
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
                        {r.playable && <span title="Playable audio" className="text-[#00aa00]">🟢</span>}
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
            {visibleDownloads.length === 0 ? (
              <div className="flex items-center justify-center text-[#888] py-8">No active downloads</div>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] sticky top-0">
                    <th className="text-left px-2 py-[2px] font-normal">Filename</th>
                    <th className="text-left px-2 py-[2px] font-normal w-[80px]">Progress</th>
                    <th className="text-left px-2 py-[2px] font-normal w-[110px]">Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {downloads.map((dl, i) => dl.removed ? null : (
                    <tr
                      key={i}
                      className={`border-b border-[#eee] cursor-default ${selectedDownload === i ? 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]' : ''}`}
                      onClick={() => setSelectedDownload(i)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setSelectedDownload(i);
                        setMenu({ x: e.clientX, y: e.clientY, index: i });
                      }}
                    >
                      <td className="px-2 py-[2px]">{dl.filename}</td>
                      <td className="px-2 py-[2px]">
                        <div className="w-full h-[10px] bg-[#ddd] border border-[#999]">
                          <div
                            className="h-full"
                            style={{
                              width: `${dl.progress}%`,
                              background: dl.status === 'failed' ? '#cc0000' : dl.status === 'stalled' ? '#cc9900' : dl.status === 'complete' ? '#339933' : '#66cc33',
                            }}
                          />
                        </div>
                      </td>
                      <td className={`px-2 py-[2px] ${dl.status === 'failed' ? 'text-[#cc0000]' : dl.status === 'stalled' ? 'text-[#cc6600]' : ''}`}>
                        {dl.status === 'complete' ? (
                          dl.virus ? (
                            <span className="text-[#cc0000] font-bold">INFECTED!</span>
                          ) : (
                            <button onClick={() => playInWinamp(dl.filename)} className="text-[#0066cc] underline cursor-pointer">▶ Play</button>
                          )
                        ) : (
                          dl.speed
                        )}
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
          { content: `Hosts: ${network.hosts} | Files: ${network.files.toLocaleString()}` },
          { content: `${downloads.filter((d) => d.status === 'downloading' && !d.removed).length} active`, width: 60 },
        ]}
      />

      {menu && (
        <ContextMenu items={contextItems} position={{ x: menu.x, y: menu.y }} onClose={() => setMenu(null)} />
      )}
    </div>
  );
}
