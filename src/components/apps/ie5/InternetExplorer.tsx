'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AppComponentProps } from '@/types/app';
import { MenuBar, MenuItem } from '@/components/window/MenuBar';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Input98 } from '@/components/ui/Input98';
import { Button98 } from '@/components/ui/Button98';
import { useSettings } from '@/contexts/SettingsContext';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { showSystemError } from '@/hooks/useFileOpener';
import { standardHelpMenu } from '@/lib/menus';
import { findSiteByUrl } from './websites/registry';
import {
  classifyPage,
  loadDurationFor,
  generateSourceHtml,
  sourceFileName,
  hostOf,
  PageKind,
} from './websites/browser';

const DEFAULT_HOME = 'http://www.yahoo.com';

// Progress ticks every TICK_MS; the seeded per-URL duration decides how many
// ticks a "download" takes.
const TICK_MS = 50;

// Temp dir that actually exists in the virtual FS (AUTOEXEC sets TEMP=C:\TEMP).
const TEMP_DIR = 'C:\\TEMP';

// Title shown in the address history / favorites; unknown URLs show the raw URL.
function titleForUrl(u: string): string {
  return findSiteByUrl(u)?.title ?? u;
}

interface Favorite {
  title: string;
  url: string;
}

const DEFAULT_FAVORITES: Favorite[] = [
  { title: 'Yahoo!', url: 'http://www.yahoo.com' },
  { title: 'AltaVista', url: 'http://www.altavista.com' },
  { title: 'Ask Jeeves', url: 'http://www.askjeeves.com' },
  { title: 'The Hampster Dance', url: 'http://www.hampsterdance.com' },
];

function normalizeUrl(u: string): string {
  return u.trim().toLowerCase().replace(/\/+$/, '');
}

function ArrowLeft() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8 2L3 7L8 12" stroke="currentColor" strokeWidth="2" /></svg>;
}
function ArrowRight() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M6 2L11 7L6 12" stroke="currentColor" strokeWidth="2" /></svg>;
}
function StopIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="#cc0000" /><rect x="4.5" y="4.5" width="5" height="5" fill="white" /></svg>;
}
function RefreshIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 7A4 4 0 1 1 7 3M7 1V5H11" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
function HomeIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L7 2L12 7V12H9V9H5V12H2V7Z" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
function FavIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.8 3.7 4 .6-2.9 2.8.7 4L7 10.2 3.4 12l.7-4L1.2 5.3l4-.6z" fill="#ffcc00" stroke="#cc9900" strokeWidth="0.5" /></svg>;
}

export default function InternetExplorer({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { getAppPref, setAppPref } = useSettings();
  const { openWindow, closeWindow } = useWindows();
  const { writeFile } = useFileSystem();

  const homePage = getAppPref<string>('ie5', 'homepage', DEFAULT_HOME);
  const workOffline = getAppPref<boolean>('system', 'workOffline', false);
  const initialUrl = launchParams?.url ? launchParams.url : homePage;

  // committedUrl is the page actually on screen; the address bar can be ahead of
  // it while a new page "downloads".
  const [committedUrl, setCommittedUrl] = useState(initialUrl);
  const [addressBarValue, setAddressBarValue] = useState(initialUrl);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [visited, setVisited] = useState<string[]>([initialUrl]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Done');
  const [showToolbar, setShowToolbar] = useState(true);
  const [showStatusBar, setShowStatusBar] = useState(true);

  const [dialog, setDialog] = useState<null | 'addFav' | 'organize' | 'options' | 'open'>(null);
  const [favNameInput, setFavNameInput] = useState('');
  const [homeInput, setHomeInput] = useState(homePage);
  const [openInput, setOpenInput] = useState('');

  // URLs already fetched this session load faster the next time ("cached").
  const cacheRef = useRef<Set<string>>(new Set([normalizeUrl(initialUrl)]));
  const loadRef = useRef<{ interval: ReturnType<typeof setInterval> } | null>(null);
  const mountLaunchCount = useRef(launchCount);

  const favorites = getAppPref<Favorite[]>('ie5', 'favorites', DEFAULT_FAVORITES);

  const currentSite = useMemo(() => findSiteByUrl(committedUrl), [committedUrl]);

  const clearLoad = useCallback(() => {
    if (loadRef.current) {
      clearInterval(loadRef.current.interval);
      loadRef.current = null;
    }
  }, []);

  // Drive a dial-up-speed "download": progress fills over a seeded duration while
  // the status text steps through Finding → Connecting → Opening, then the page
  // is committed. Nothing new renders until it completes (Stop keeps the old page).
  const beginLoad = useCallback((target: string) => {
    clearLoad();
    const key = normalizeUrl(target);
    const cached = cacheRef.current.has(key);
    cacheRef.current.add(key);
    const duration = loadDurationFor(target, cached);
    const host = hostOf(target);

    setLoading(true);
    setProgress(0);
    setStatusText(`Finding site ${host}...`);

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += TICK_MS;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct < 30) setStatusText(`Finding site ${host}...`);
      else if (pct < 65) setStatusText('Connecting...');
      else if (pct < 100) setStatusText(`Opening page ${host}...`);

      if (pct >= 100) {
        clearInterval(interval);
        loadRef.current = null;
        setLoading(false);
        setStatusText('Done');
        setCommittedUrl(target);
      }
    }, TICK_MS);
    loadRef.current = { interval };
  }, [clearLoad]);

  const navigate = useCallback((newUrl: string) => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    setAddressBarValue(trimmed);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), trimmed]);
    setHistoryIndex((prev) => prev + 1);
    setVisited((prev) => [trimmed, ...prev.filter((u) => normalizeUrl(u) !== normalizeUrl(trimmed))].slice(0, 15));
    beginLoad(trimmed);
  }, [historyIndex, beginLoad]);

  // Stop button — cancels the in-flight "load" and stays on the current page.
  const stop = useCallback(() => {
    clearLoad();
    setLoading(false);
    setProgress(0);
    setStatusText('Stopped');
    setAddressBarValue(committedUrl);
  }, [clearLoad, committedUrl]);

  const reload = useCallback(() => beginLoad(committedUrl), [beginLoad, committedUrl]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const i = historyIndex - 1;
      setHistoryIndex(i);
      setAddressBarValue(history[i]);
      beginLoad(history[i]);
    }
  }, [historyIndex, history, beginLoad]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const i = historyIndex + 1;
      setHistoryIndex(i);
      setAddressBarValue(history[i]);
      beginLoad(history[i]);
    }
  }, [historyIndex, history, beginLoad]);

  const goHome = useCallback(() => navigate(homePage), [navigate, homePage]);

  const toggleOffline = useCallback(() => {
    setAppPref('system', 'workOffline', !workOffline);
  }, [setAppPref, workOffline]);

  const goOnline = useCallback(() => {
    setAppPref('system', 'workOffline', false);
    beginLoad(committedUrl);
  }, [setAppPref, beginLoad, committedUrl]);

  const viewSource = useCallback(() => {
    const html = generateSourceHtml(committedUrl);
    const path = `${TEMP_DIR}\\${sourceFileName(committedUrl)}`;
    const res = writeFile(path, html);
    if (!res.ok) {
      showSystemError('View Source', res.error);
      return;
    }
    openWindow('notepad', { launchParams: { filePath: path } });
  }, [committedUrl, writeFile, openWindow]);

  // Honor launchParams.url when the Start menu re-launches this window.
  useEffect(() => {
    if (launchCount !== mountLaunchCount.current && launchParams?.url) {
      navigate(launchParams.url);
      mountLaunchCount.current = launchCount;
    }
    // navigate intentionally excluded — we react only to launchCount changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount, launchParams?.url]);

  useEffect(() => () => clearLoad(), [clearLoad]);

  const handleAddressSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    navigate(addressBarValue);
  }, [addressBarValue, navigate]);

  const openAddFavorite = useCallback(() => {
    setFavNameInput(currentSite ? currentSite.title : committedUrl);
    setDialog('addFav');
  }, [currentSite, committedUrl]);

  const confirmAddFavorite = useCallback(() => {
    const title = favNameInput.trim() || committedUrl;
    const next = [...favorites.filter((f) => normalizeUrl(f.url) !== normalizeUrl(committedUrl)), { title, url: committedUrl }];
    setAppPref('ie5', 'favorites', next);
    setDialog(null);
  }, [favNameInput, committedUrl, favorites, setAppPref]);

  const removeFavorite = useCallback((target: string) => {
    setAppPref('ie5', 'favorites', favorites.filter((f) => f.url !== target));
  }, [favorites, setAppPref]);

  const saveHome = useCallback(() => {
    setAppPref('ie5', 'homepage', homeInput.trim() || DEFAULT_HOME);
    setDialog(null);
  }, [homeInput, setAppPref]);

  const eraDialog = useCallback((title: string, message: string) => {
    showSystemError(title, message);
  }, []);

  const menus: { label: string; items: MenuItem[] }[] = useMemo(() => [
    {
      label: 'File',
      items: [
        { label: 'New Window', shortcut: 'Ctrl+N', onClick: () => openWindow('ie5') },
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: () => { setOpenInput(''); setDialog('open'); } },
        { separator: true, label: '' },
        { label: 'Save As...', onClick: () => eraDialog('Save Web Page', 'This feature is not available in this version of Internet Explorer.') },
        { label: 'Print...', shortcut: 'Ctrl+P', onClick: () => eraDialog('Print', 'There is no printer installed.\n\nTo install a printer, point to Settings on the Start menu, and then click Printers.') },
        { separator: true, label: '' },
        { label: 'Work Offline', checked: workOffline, onClick: toggleOffline },
        { separator: true, label: '' },
        { label: 'Close', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Cut', shortcut: 'Ctrl+X', disabled: true },
        { label: 'Copy', shortcut: 'Ctrl+C', disabled: true },
        { label: 'Paste', shortcut: 'Ctrl+V', disabled: true },
        { separator: true, label: '' },
        { label: 'Find (on This Page)...', shortcut: 'Ctrl+F', onClick: () => eraDialog('Find', 'Find on this page is not available.') },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Toolbar', checked: showToolbar, onClick: () => setShowToolbar((v) => !v) },
        { label: 'Status Bar', checked: showStatusBar, onClick: () => setShowStatusBar((v) => !v) },
        { separator: true, label: '' },
        { label: 'Stop', shortcut: 'Esc', onClick: stop, disabled: !loading },
        { label: 'Refresh', shortcut: 'F5', onClick: reload },
        { separator: true, label: '' },
        { label: 'Source', onClick: viewSource },
      ],
    },
    {
      label: 'Favorites',
      items: [
        { label: 'Add to Favorites...', onClick: openAddFavorite },
        { label: 'Organize Favorites...', onClick: () => setDialog('organize') },
        { separator: true, label: '' },
        ...(favorites.length
          ? favorites.map((f) => ({ label: f.title, onClick: () => navigate(f.url) }))
          : [{ label: '(Empty)', disabled: true }]),
      ],
    },
    {
      label: 'History',
      items: visited.length
        ? visited.map((u) => ({
            label: titleForUrl(u),
            onClick: () => navigate(u),
          }))
        : [{ label: '(No history)', disabled: true }],
    },
    {
      label: 'Tools',
      items: [
        { label: 'Internet Options...', onClick: () => { setHomeInput(homePage); setDialog('options'); } },
      ],
    },
    standardHelpMenu('Internet Explorer'),
  ], [showToolbar, showStatusBar, favorites, visited, homePage, workOffline, loading, toggleOffline, stop, reload, viewSource, navigate, openAddFavorite, openWindow, closeWindow, windowId, eraDialog]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] relative">
      <MenuBar menus={menus} windowId={windowId} />

      {showToolbar && (
        <div className="flex items-center gap-1 px-1 py-[2px] border-b border-[var(--win98-button-shadow)]">
          <ToolbarButton onClick={goBack} disabled={historyIndex <= 0} label="Back" icon={<ArrowLeft />} />
          <ToolbarButton onClick={goForward} disabled={historyIndex >= history.length - 1} label="Forward" icon={<ArrowRight />} />
          <ToolbarButton onClick={stop} disabled={!loading} label="Stop" icon={<StopIcon />} />
          <ToolbarButton onClick={reload} label="Refresh" icon={<RefreshIcon />} />
          <ToolbarButton onClick={goHome} label="Home" icon={<HomeIcon />} />
          <div className="w-px self-stretch bg-[var(--win98-button-shadow)] mx-[2px]" />
          <ToolbarButton onClick={openAddFavorite} label="Favorites" icon={<FavIcon />} />
        </div>
      )}

      <form onSubmit={handleAddressSubmit} className="flex items-center gap-1 px-2 py-[3px] border-b border-[var(--win98-button-shadow)]">
        <span className="whitespace-nowrap">Address</span>
        <Input98 value={addressBarValue} onChange={(e) => setAddressBarValue(e.target.value)} className="flex-1 h-[20px]" />
        <Button98 className="min-w-[40px] min-h-[20px] h-[20px]" type="submit">Go</Button98>
      </form>

      <div className="flex-1 overflow-auto bg-white relative">
        <PageView url={committedUrl} workOffline={workOffline} onNavigate={navigate} onConnect={goOnline} />
        {/* White flash while a page downloads — the committed page stays underneath so Stop can fall back to it. */}
        {loading && <div className="absolute inset-0 bg-white z-10" />}
      </div>

      {loading && (
        <div className="flex items-center gap-2 px-2 py-[2px] bg-[var(--win98-button-face)] border-t border-[var(--win98-button-highlight)]">
          <span className="text-[10px] text-[#333] whitespace-nowrap">{progress}%</span>
          <div className="flex-1 h-[12px] bg-white border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] overflow-hidden">
            <div className="h-full bg-[var(--win98-highlight)] transition-[width] duration-75" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {showStatusBar && (
        <StatusBar98
          panels={[
            { content: statusText },
            { content: workOffline ? 'Offline' : 'Internet', width: 80, align: 'center' },
          ]}
        />
      )}

      {dialog && (
        <div className="absolute inset-0 z-20 bg-black/20 flex items-center justify-center" onMouseDown={() => setDialog(null)}>
          <div
            className="w-[320px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-white px-2 py-[2px] font-bold flex items-center justify-between bg-[linear-gradient(to_right,var(--win98-titlebar-active-start),var(--win98-titlebar-active-end))]">
              <span>
                {dialog === 'addFav' && 'Add Favorite'}
                {dialog === 'organize' && 'Organize Favorites'}
                {dialog === 'options' && 'Internet Options'}
                {dialog === 'open' && 'Open'}
              </span>
              <button onClick={() => setDialog(null)} className="px-1 leading-none">×</button>
            </div>
            <div className="p-3">
              {dialog === 'addFav' && (
                <>
                  <div className="mb-2">Internet Explorer will add this page to your Favorites list.</div>
                  <div className="mb-1 text-[10px] text-[#666]">Name:</div>
                  <Input98 value={favNameInput} onChange={(e) => setFavNameInput(e.target.value)} className="w-full mb-3" autoFocus />
                  <div className="flex justify-end gap-2">
                    <Button98 onClick={confirmAddFavorite}>OK</Button98>
                    <Button98 onClick={() => setDialog(null)}>Cancel</Button98>
                  </div>
                </>
              )}
              {dialog === 'organize' && (
                <>
                  <div className="mb-2 text-[10px] text-[#666]">Select a favorite to remove it.</div>
                  <div className="bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] h-[120px] overflow-auto mb-3">
                    {favorites.length === 0 && <div className="p-2 text-[#999]">No favorites.</div>}
                    {favorites.map((f) => (
                      <div key={f.url} className="flex items-center justify-between px-2 py-[2px] hover:bg-[#e8e8ff]">
                        <span className="truncate">⭐ {f.title}</span>
                        <button onClick={() => removeFavorite(f.url)} className="text-[10px] text-[#cc0000] underline cursor-pointer ml-2">Remove</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button98 onClick={() => setDialog(null)}>Close</Button98>
                  </div>
                </>
              )}
              {dialog === 'options' && (
                <>
                  <div className="mb-2 font-bold">Home page</div>
                  <div className="mb-1 text-[10px] text-[#666]">You can change which page to use for your home page.</div>
                  <Input98 value={homeInput} onChange={(e) => setHomeInput(e.target.value)} className="w-full mb-2" autoFocus />
                  <div className="flex gap-2 mb-3">
                    <Button98 className="min-w-0 text-[10px]" onClick={() => setHomeInput(committedUrl)}>Use Current</Button98>
                    <Button98 className="min-w-0 text-[10px]" onClick={() => setHomeInput(DEFAULT_HOME)}>Use Default</Button98>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button98 onClick={saveHome}>OK</Button98>
                    <Button98 onClick={() => setDialog(null)}>Cancel</Button98>
                  </div>
                </>
              )}
              {dialog === 'open' && (
                <>
                  <div className="mb-2">Type the Internet address of a document, and Internet Explorer will open it for you.</div>
                  <div className="mb-1 text-[10px] text-[#666]">Open:</div>
                  <Input98
                    value={openInput}
                    onChange={(e) => setOpenInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && openInput.trim()) { navigate(openInput); setDialog(null); } }}
                    className="w-full mb-3"
                    placeholder="http://www.yahoo.com"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button98 onClick={() => { if (openInput.trim()) { navigate(openInput); setDialog(null); } }}>OK</Button98>
                    <Button98 onClick={() => setDialog(null)}>Cancel</Button98>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ onClick, disabled, label, icon }: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center min-w-[40px] h-[36px] px-[4px]
        border border-transparent cursor-default select-none
        ${!disabled ? `hover:border-t-[var(--win98-button-highlight)] hover:border-l-[var(--win98-button-highlight)]
        hover:border-b-[var(--win98-button-shadow)] hover:border-r-[var(--win98-button-shadow)]
        active:border-t-[var(--win98-button-shadow)] active:border-l-[var(--win98-button-shadow)]
        active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]` : 'opacity-50'}
      `}
    >
      <div className="w-4 h-4 flex items-center justify-center">{icon}</div>
      <span className="text-[9px] leading-none mt-[2px]">{label}</span>
    </button>
  );
}

// Renders the committed page: a real site, or the era-authentic error variant
// its URL/offline state calls for.
function PageView({ url, workOffline, onNavigate, onConnect }: {
  url: string;
  workOffline: boolean;
  onNavigate: (url: string) => void;
  onConnect: () => void;
}) {
  const kind = classifyPage(url, { workOffline });
  if (kind === 'site') {
    const site = findSiteByUrl(url)!;
    return <>{site.render({ onNavigate })}</>;
  }
  return <ErrorPage kind={kind} url={url} onConnect={onConnect} />;
}

const ERROR_COPY: Record<Exclude<PageKind, 'site'>, { heading: string; lead: string; code: string }> = {
  dns: {
    heading: 'The page cannot be displayed',
    lead: 'The page you are looking for is currently unavailable. The Web site might be experiencing technical difficulties, or you may need to adjust your browser settings.',
    code: 'Cannot find server or DNS Error',
  },
  http404: {
    heading: 'The page cannot be found',
    lead: 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
    code: 'HTTP 404 - File not found',
  },
  offline: {
    heading: 'The page cannot be displayed',
    lead: 'You are currently working offline. To view this page, you must connect to the Internet.',
    code: 'Internet Explorer is currently working offline',
  },
};

function ErrorPage({ kind, url, onConnect }: { kind: PageKind; url: string; onConnect: () => void }) {
  const copy = ERROR_COPY[kind as Exclude<PageKind, 'site'>] ?? ERROR_COPY.dns;
  return (
    <div className="p-6 font-[family-name:var(--win98-font)]">
      <div className="flex items-start gap-4">
        <div className="text-[32px]">{kind === 'offline' ? '🔌' : '❌'}</div>
        <div>
          <h2 className="text-[16px] font-bold mb-2 text-black">{copy.heading}</h2>
          <p className="text-[12px] text-[#333] mb-3">{copy.lead}</p>
          <hr className="border-[#cccccc] mb-3" />
          <p className="text-[12px] text-[#333] mb-2">Please try the following:</p>
          <ul className="text-[12px] text-[#333] list-disc pl-5 space-y-1">
            {kind === 'offline' ? (
              <>
                <li>Click the <strong>Connect</strong> button to go online.</li>
                <li>To browse offline, click the <strong>File</strong> menu, and then click <strong>Work Offline</strong> to clear it.</li>
              </>
            ) : kind === 'http404' ? (
              <>
                <li>Make sure that the Web site address displayed in the address bar is spelled and formatted correctly.</li>
                <li>Click the <strong>Back</strong> button to try another link.</li>
                <li>Click the <strong>Refresh</strong> button, or try again later.</li>
              </>
            ) : (
              <>
                <li>Click the <strong>Refresh</strong> button, or try again later.</li>
                <li>If you typed the page address in the Address bar, make sure that it is spelled correctly.</li>
                <li>To check your connection settings, click the <strong>Tools</strong> menu, and then click <strong>Internet Options</strong>.</li>
              </>
            )}
          </ul>
          {kind === 'offline' && (
            <div className="mt-4">
              <Button98 onClick={onConnect}>Connect</Button98>
            </div>
          )}
          <p className="text-[11px] text-[#666] mt-4">{copy.code}<br />Internet Explorer</p>
          <p className="text-[11px] text-[#999] mt-2">URL: {url}</p>
        </div>
      </div>
    </div>
  );
}
