'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { Input98 } from '@/components/ui/Input98';
import { Button98 } from '@/components/ui/Button98';
import { ProgressBar98 } from '@/components/ui/ProgressBar98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useWindows } from '@/contexts/WindowContext';
import { musicTracks } from '@/lib/audio/tracks';

const DOWNLOADS_DIR = 'C:\\My Documents\\Downloads';

interface SearchResult {
  song: string;
  artist: string;
  bitrate: string;
  speed: string;
  user: string;
  size: string;
  fileName: string;
  /** True for the bundled tracks that actually play in Winamp. */
  playable: boolean;
}

interface Download {
  song: string;
  artist: string;
  fileName: string;
  playable: boolean;
  progress: number;
  stalled: boolean;
  complete: boolean;
  speed: string;
}

function sanitize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// The bundled, genuinely-playable tracks surfaced as Napster results.
const REAL_TRACKS: SearchResult[] = musicTracks.map((t) => ({
  song: t.title,
  artist: t.artist,
  bitrate: String(t.kbps),
  speed: 'Cable',
  user: 'mp3_archive_99',
  size: '3.4 MB',
  fileName: t.fileName,
  playable: true,
}));

const JOKE_DATABASE: Omit<SearchResult, 'fileName' | 'playable'>[] = [
  { song: 'Smells Like Teen Spirit', artist: 'Nirvana', bitrate: '128', speed: 'T1', user: 'grunge_fan_92', size: '4.7 MB' },
  { song: 'Smells Like Teen Spirit', artist: 'Nirvana', bitrate: '192', speed: 'Cable', user: 'KurtCobainFan', size: '7.1 MB' },
  { song: 'Smells Like Teen Spirit', artist: 'Nirvana', bitrate: '64', speed: '56K', user: 'rocker_dude', size: '2.4 MB' },
  { song: 'Wannabe', artist: 'Spice Girls', bitrate: '128', speed: 'Cable', user: 'spice_world_98', size: '3.2 MB' },
  { song: 'Wannabe', artist: 'Spice Girls', bitrate: '160', speed: 'T1', user: 'PopMusic4Ever', size: '4.0 MB' },
  { song: 'MMMBop', artist: 'Hanson', bitrate: '128', speed: '56K', user: 'hanson_bro', size: '4.8 MB' },
  { song: 'No Diggity', artist: 'Blackstreet', bitrate: '128', speed: 'Cable', user: 'hip_hop_head', size: '4.5 MB' },
  { song: 'Tubthumping', artist: 'Chumbawamba', bitrate: '128', speed: 'T1', user: 'uk_music_fan', size: '4.2 MB' },
  { song: 'Semi-Charmed Life', artist: 'Third Eye Blind', bitrate: '192', speed: 'Cable', user: '3eb_rocks', size: '6.3 MB' },
  { song: 'Iris', artist: 'Goo Goo Dolls', bitrate: '128', speed: '56K', user: 'romantic_soul', size: '5.3 MB' },
  { song: 'Bitter Sweet Symphony', artist: 'The Verve', bitrate: '128', speed: 'Cable', user: 'britpop_king', size: '6.7 MB' },
  { song: 'Barbie Girl', artist: 'Aqua', bitrate: '128', speed: 'T1', user: 'eurodance99', size: '3.6 MB' },
  { song: 'Blue (Da Ba Dee)', artist: 'Eiffel 65', bitrate: '128', speed: 'Cable', user: 'dance_master', size: '4.1 MB' },
  { song: 'Baby One More Time', artist: 'Britney Spears', bitrate: '128', speed: 'T1', user: 'britney_army', size: '3.8 MB' },
  { song: 'Livin La Vida Loca', artist: 'Ricky Martin', bitrate: '128', speed: 'Cable', user: 'latin_beats', size: '4.0 MB' },
  { song: 'All Star', artist: 'Smash Mouth', bitrate: '192', speed: 'T1', user: 'somebody_once', size: '5.5 MB' },
  { song: 'Under The Bridge', artist: 'Red Hot Chili Peppers', bitrate: '128', speed: 'Cable', user: 'RHCP_fan', size: '4.9 MB' },
  { song: 'What Is Love', artist: 'Haddaway', bitrate: '128', speed: 'Cable', user: 'night_at_rox', size: '3.5 MB' },
];

const SONG_DATABASE: SearchResult[] = [
  ...REAL_TRACKS,
  ...JOKE_DATABASE.map((r) => ({
    ...r,
    fileName: `${sanitize(r.artist)}-${sanitize(r.song)}.mp3`,
    playable: false,
  })),
];

export default function Napster({ windowId }: AppComponentProps) {
  void windowId;
  const { createFile } = useFileSystem();
  const { openWindow } = useWindows();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [metallicaBlocked, setMetallicaBlocked] = useState(false);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [activeTab, setActiveTab] = useState<'search' | 'downloads' | 'library'>('search');
  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const [usersOnline, setUsersOnline] = useState(147203);
  const downloadTimers = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const persistedRef = useRef<Set<number>>(new Set());

  // Nudge the "users online" readout over time (updates from a timer, not render).
  useEffect(() => {
    const t = setInterval(() => setUsersOnline((n) => Math.max(90000, n + Math.floor(Math.random() * 400 - 180))), 3000);
    return () => clearInterval(t);
  }, []);

  const search = useCallback(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Empty search surfaces the genuinely-playable tracks.
      setMetallicaBlocked(false);
      setResults(REAL_TRACKS);
      return;
    }

    if (q.includes('metallica')) {
      setMetallicaBlocked(true);
      setResults([]);
      return;
    }
    setMetallicaBlocked(false);

    const matches = SONG_DATABASE.filter(
      (s) => s.song.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q),
    );
    setResults(matches);
  }, [query]);

  const startDownload = useCallback((result: SearchResult) => {
    const downloadIndex = downloads.length;
    const stallAt = Math.random() < 0.3 ? 99 : -1;
    const newDownload: Download = {
      song: result.song,
      artist: result.artist,
      fileName: result.fileName,
      playable: result.playable,
      progress: 0,
      stalled: false,
      complete: false,
      speed: result.speed === 'T1' ? '45.2 KB/s' : result.speed === 'Cable' ? '22.1 KB/s' : '3.4 KB/s',
    };

    setDownloads((prev) => [...prev, newDownload]);
    setActiveTab('downloads');

    const interval = setInterval(() => {
      setDownloads((prev) => {
        const updated = [...prev];
        const dl = { ...updated[downloadIndex] };
        if (dl.complete || dl.stalled) return prev;

        dl.progress += (Math.random() * 3 + 1);
        if (stallAt > 0 && dl.progress >= stallAt) {
          dl.progress = stallAt;
          dl.stalled = true;
          dl.speed = '0.0 KB/s';
        } else if (dl.progress >= 100) {
          dl.progress = 100;
          dl.complete = true;
        }
        updated[downloadIndex] = dl;
        return updated;
      });
    }, 300);

    downloadTimers.current.set(downloadIndex, interval);
  }, [downloads.length]);

  // When a download completes, write a real file into the Downloads folder so it
  // shows up in Explorer and (for bundled tracks) plays in Winamp.
  useEffect(() => {
    downloads.forEach((dl, i) => {
      if (dl.complete && dl.fileName && !persistedRef.current.has(i)) {
        persistedRef.current.add(i);
        createFile(DOWNLOADS_DIR, dl.fileName, '[MP3 Audio]');
      }
    });
  }, [downloads, createFile]);

  const playInWinamp = useCallback((fileName: string) => {
    openWindow('winamp', { launchParams: { filePath: `${DOWNLOADS_DIR}\\${fileName}` } });
  }, [openWindow]);

  // Cleanup timers
  useEffect(() => {
    const timers = downloadTimers.current;
    return () => { timers.forEach((timer) => clearInterval(timer)); };
  }, []);

  const completed = downloads.filter((d) => d.complete);

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Napster header */}
      <div className="bg-[#1a1a1a] text-white flex items-center px-3 py-1">
        <div className="flex items-center gap-2">
          <div className="text-[16px]">🎧</div>
          <div className="text-[14px] font-bold">Napster</div>
        </div>
        <div className="ml-auto text-[10px] text-[#999]">
          Users Online: {usersOnline.toLocaleString()}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--win98-button-shadow)]">
        {(['search', 'downloads', 'library'] as const).map((tab) => (
          <button
            key={tab}
            className={`px-4 py-1 text-[11px] cursor-pointer border-r border-[var(--win98-button-shadow)] capitalize ${
              activeTab === tab ? 'bg-[var(--win98-button-face)] font-bold' : 'bg-[#d4d0c8]'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'downloads'
              ? `Downloads (${downloads.filter((d) => !d.complete).length})`
              : tab === 'library'
              ? `Library (${completed.length})`
              : 'Search'}
          </button>
        ))}
      </div>

      {activeTab === 'search' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-1 p-2">
            <Input98
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
              placeholder="Search for songs..."
              className="flex-1"
            />
            <Button98 onClick={search} className="min-w-[60px]">Search</Button98>
          </div>

          {metallicaBlocked && (
            <div className="mx-2 mb-2 bg-[#ffcccc] border-2 border-[#cc0000] p-3 text-center">
              <div className="text-[14px] font-bold text-[#cc0000] mb-1">⛔ BLOCKED BY COURT ORDER ⛔</div>
              <div className="text-[12px] text-[#660000]">
                Metallica has filed a lawsuit against Napster. All Metallica songs
                have been removed per court order (April 2000).
              </div>
              <div className="text-[10px] text-[#999] mt-1">
                &quot;To have our music traded on Napster without our consent
                is not right.&quot; — Lars Ulrich
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto mx-2 mb-2 bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[var(--win98-button-face)] sticky top-0">
                  <th className="text-left px-2 py-1 font-normal border-b border-[var(--win98-button-shadow)]">Song</th>
                  <th className="text-left px-2 py-1 font-normal border-b border-[var(--win98-button-shadow)]">Artist</th>
                  <th className="text-left px-1 py-1 font-normal border-b border-[var(--win98-button-shadow)] w-[40px]">kbps</th>
                  <th className="text-left px-1 py-1 font-normal border-b border-[var(--win98-button-shadow)] w-[45px]">Speed</th>
                  <th className="text-left px-2 py-1 font-normal border-b border-[var(--win98-button-shadow)]">User</th>
                  <th className="text-left px-1 py-1 font-normal border-b border-[var(--win98-button-shadow)] w-[30px]"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr
                    key={i}
                    className={`cursor-pointer ${selectedResult === i ? 'bg-[var(--win98-highlight)] text-white' : 'hover:bg-[#e8e8ff]'}`}
                    onClick={() => setSelectedResult(i)}
                    onDoubleClick={() => startDownload(r)}
                  >
                    <td className="px-2 py-[2px] truncate max-w-[140px]">
                      {r.playable ? '🟢' : '🎵'} {r.song}
                    </td>
                    <td className="px-2 py-[2px] truncate max-w-[100px]">{r.artist}</td>
                    <td className="px-1 py-[2px]">{r.bitrate}</td>
                    <td className="px-1 py-[2px]">
                      <span className={r.speed === 'T1' ? 'text-[#009900]' : r.speed === 'Cable' ? 'text-[#0066cc]' : 'text-[#cc6600]'}>
                        {r.speed}
                      </span>
                    </td>
                    <td className="px-2 py-[2px] truncate max-w-[100px]">{r.user}</td>
                    <td className="px-1 py-[2px]">
                      <button
                        className="text-[9px] text-[#0066cc] underline cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); startDownload(r); }}
                      >
                        Get
                      </button>
                    </td>
                  </tr>
                ))}
                {results.length === 0 && !metallicaBlocked && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#999]">
                      {query ? 'No results found' : 'Enter a search term (or search empty for playable tracks)'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'downloads' && (
        <div className="flex-1 overflow-auto p-2">
          {downloads.length === 0 ? (
            <div className="text-center py-8 text-[#999]">
              No downloads yet. Search for songs and click &quot;Get&quot; to download.
            </div>
          ) : (
            <div className="space-y-2">
              {downloads.map((dl, i) => (
                <div key={i} className="bg-white border border-[#ccc] p-2">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold truncate">🎵 {dl.artist} - {dl.song}.mp3</span>
                    <span className={`text-[10px] ${dl.stalled ? 'text-[#cc0000]' : dl.complete ? 'text-[#009900]' : 'text-[#0066cc]'}`}>
                      {dl.stalled ? 'Stalled!' : dl.complete ? 'Complete' : dl.speed}
                    </span>
                  </div>
                  <ProgressBar98 value={dl.progress} />
                  <div className="text-[10px] text-[#999] mt-1">
                    {dl.stalled
                      ? `${Math.round(dl.progress)}% - Connection stalled at 99%... Waiting for user`
                      : dl.complete
                      ? `Saved to ${DOWNLOADS_DIR}`
                      : `${Math.round(dl.progress)}%`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'library' && (
        <div className="flex-1 overflow-auto p-2">
          {completed.length === 0 ? (
            <div className="text-center py-8 text-[#999]">
              Your library is empty. Completed downloads appear here.
            </div>
          ) : (
            <div className="bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
              {completed.map((dl, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-[3px] border-b border-[#eee] hover:bg-[#e8e8ff]">
                  <div className="flex items-center gap-2 truncate">
                    <span>{dl.playable ? '🟢' : '🎵'}</span>
                    <span className="truncate">{dl.fileName}</span>
                  </div>
                  <button
                    onClick={() => playInWinamp(dl.fileName)}
                    className="text-[10px] text-[#0066cc] underline cursor-pointer ml-2 whitespace-nowrap"
                    title={dl.playable ? 'Play in Winamp' : 'Open in Winamp (may not play)'}
                  >
                    ▶ Play
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <StatusBar98
        panels={[
          { content: `${downloads.filter((d) => !d.complete && !d.stalled).length} active downloads` },
          { content: `${results.length} results`, width: 80 },
        ]}
      />
    </div>
  );
}
