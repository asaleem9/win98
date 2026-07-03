'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AppComponentProps } from '@/types/app';
import { MenuBar, MenuItem } from '@/components/window/MenuBar';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Input98 } from '@/components/ui/Input98';
import { Button98 } from '@/components/ui/Button98';
import { useSettings } from '@/contexts/SettingsContext';
import { useWindows } from '@/contexts/WindowContext';
import { showSystemError } from '@/hooks/useFileOpener';
import Yahoo1998 from './websites/Yahoo1998';
import GeoCities from './websites/GeoCities';
import AltaVista from './websites/AltaVista';
import HampsterDance from './websites/HampsterDance';
import AskJeeves from './websites/AskJeeves';
import WebRing from './websites/WebRing';
import DownloadMoreRam from './websites/DownloadMoreRam';

type PageKey =
  | 'yahoo'
  | 'geocities'
  | 'altavista'
  | 'hampster'
  | 'askjeeves'
  | 'webring'
  | 'downloadram'
  | 'error'
  | 'blank';

const KNOWN_URLS: Record<string, PageKey> = {
  'http://www.yahoo.com': 'yahoo',
  'www.yahoo.com': 'yahoo',
  'yahoo.com': 'yahoo',
  'http://www.geocities.com': 'geocities',
  'www.geocities.com': 'geocities',
  'geocities.com': 'geocities',
  'http://www.geocities.com/area51/vault/4827': 'geocities',
  'http://www.altavista.com': 'altavista',
  'www.altavista.com': 'altavista',
  'altavista.com': 'altavista',
  'http://www.hampsterdance.com': 'hampster',
  'www.hampsterdance.com': 'hampster',
  'hampsterdance.com': 'hampster',
  'http://www.askjeeves.com': 'askjeeves',
  'www.askjeeves.com': 'askjeeves',
  'askjeeves.com': 'askjeeves',
  'ask.com': 'askjeeves',
  'www.ask.com': 'askjeeves',
  'http://www.webring.org': 'webring',
  'www.webring.org': 'webring',
  'webring.org': 'webring',
  'http://www.downloadmoreram.com': 'downloadram',
  'www.downloadmoreram.com': 'downloadram',
  'downloadmoreram.com': 'downloadram',
  'about:blank': 'blank',
};

const DEFAULT_HOME = 'http://www.yahoo.com';

// Pretty title shown in the address history / favorites for a known page.
const PAGE_TITLES: Record<PageKey, string> = {
  yahoo: 'Yahoo!',
  geocities: "Dave's Cool Page - GeoCities",
  altavista: 'AltaVista - The Search Engine',
  hampster: 'The Hampster Dance',
  askjeeves: 'Ask Jeeves',
  webring: 'WebRing Directory',
  downloadram: 'DownloadMoreRAM.com',
  error: 'The page cannot be displayed',
  blank: 'Blank Page',
};

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

function pageKeyFor(url: string): PageKey {
  return KNOWN_URLS[normalizeUrl(url)] ?? 'error';
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

  const homePage = getAppPref<string>('ie5', 'homepage', DEFAULT_HOME);
  const initialUrl = launchParams?.url ? launchParams.url : homePage;

  const [url, setUrl] = useState(initialUrl);
  const [addressBarValue, setAddressBarValue] = useState(initialUrl);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [visited, setVisited] = useState<string[]>([initialUrl]);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('Done');
  const [showToolbar, setShowToolbar] = useState(true);
  const [showStatusBar, setShowStatusBar] = useState(true);

  const [dialog, setDialog] = useState<null | 'addFav' | 'organize' | 'options' | 'open'>(null);
  const [favNameInput, setFavNameInput] = useState('');
  const [homeInput, setHomeInput] = useState(homePage);
  const [openInput, setOpenInput] = useState('');

  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountLaunchCount = useRef(launchCount);

  const favorites = getAppPref<Favorite[]>('ie5', 'favorites', DEFAULT_FAVORITES);

  const currentPage = useMemo((): PageKey => pageKeyFor(url), [url]);

  const beginLoad = useCallback((target: string) => {
    if (loadTimer.current) clearTimeout(loadTimer.current);
    setLoading(true);
    setStatusText(`Opening page ${target}...`);
    loadTimer.current = setTimeout(() => {
      loadTimer.current = null;
      setLoading(false);
      setStatusText('Done');
    }, 700);
  }, []);

  const navigate = useCallback((newUrl: string) => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    setUrl(trimmed);
    setAddressBarValue(trimmed);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), trimmed]);
    setHistoryIndex((prev) => prev + 1);
    setVisited((prev) => [trimmed, ...prev.filter((u) => normalizeUrl(u) !== normalizeUrl(trimmed))].slice(0, 15));
    beginLoad(trimmed);
  }, [historyIndex, beginLoad]);

  // Stop button — cancels the in-flight "load".
  const stop = useCallback(() => {
    if (loadTimer.current) {
      clearTimeout(loadTimer.current);
      loadTimer.current = null;
    }
    setLoading(false);
    setStatusText('Stopped');
  }, []);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const i = historyIndex - 1;
      setHistoryIndex(i);
      setUrl(history[i]);
      setAddressBarValue(history[i]);
      beginLoad(history[i]);
    }
  }, [historyIndex, history, beginLoad]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const i = historyIndex + 1;
      setHistoryIndex(i);
      setUrl(history[i]);
      setAddressBarValue(history[i]);
      beginLoad(history[i]);
    }
  }, [historyIndex, history, beginLoad]);

  const goHome = useCallback(() => navigate(homePage), [navigate, homePage]);

  // Honor launchParams.url when the Start menu re-launches this window.
  useEffect(() => {
    if (launchCount !== mountLaunchCount.current && launchParams?.url) {
      navigate(launchParams.url);
      mountLaunchCount.current = launchCount;
    }
    // navigate intentionally excluded — we react only to launchCount changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount, launchParams?.url]);

  useEffect(() => () => { if (loadTimer.current) clearTimeout(loadTimer.current); }, []);

  const handleAddressSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    navigate(addressBarValue);
  }, [addressBarValue, navigate]);

  const openAddFavorite = useCallback(() => {
    setFavNameInput(PAGE_TITLES[currentPage] === 'The page cannot be displayed' ? url : PAGE_TITLES[currentPage]);
    setDialog('addFav');
  }, [currentPage, url]);

  const confirmAddFavorite = useCallback(() => {
    const title = favNameInput.trim() || url;
    const next = [...favorites.filter((f) => normalizeUrl(f.url) !== normalizeUrl(url)), { title, url }];
    setAppPref('ie5', 'favorites', next);
    setDialog(null);
  }, [favNameInput, url, favorites, setAppPref]);

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
        { label: 'Refresh', shortcut: 'F5', onClick: () => navigate(url) },
        { label: 'Source', onClick: () => eraDialog('View Source', 'The source for this page cannot be displayed.') },
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
            label: PAGE_TITLES[pageKeyFor(u)] === 'The page cannot be displayed' ? u : PAGE_TITLES[pageKeyFor(u)],
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
    {
      label: 'Help',
      items: [
        { label: 'About Internet Explorer', onClick: () => eraDialog('About Internet Explorer', 'Microsoft Internet Explorer 5\n\nVersion 5.00.2314.1003\n\nCopyright © 1995-1999 Microsoft Corp.\n\nThis product is licensed to:\nA Valued Customer') },
      ],
    },
  ], [showToolbar, showStatusBar, favorites, visited, url, homePage, navigate, openAddFavorite, openWindow, closeWindow, windowId, eraDialog]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] relative">
      <MenuBar menus={menus} />

      {showToolbar && (
        <div className="flex items-center gap-1 px-1 py-[2px] border-b border-[var(--win98-button-shadow)]">
          <ToolbarButton onClick={goBack} disabled={historyIndex <= 0} label="Back" icon={<ArrowLeft />} />
          <ToolbarButton onClick={goForward} disabled={historyIndex >= history.length - 1} label="Forward" icon={<ArrowRight />} />
          <ToolbarButton onClick={stop} disabled={!loading} label="Stop" icon={<StopIcon />} />
          <ToolbarButton onClick={() => navigate(url)} label="Refresh" icon={<RefreshIcon />} />
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
        {loading && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[var(--win98-highlight)] animate-pulse z-10" />
        )}
        {currentPage === 'blank' && <div className="h-full bg-white" />}
        {currentPage === 'yahoo' && <Yahoo1998 />}
        {currentPage === 'geocities' && <GeoCities />}
        {currentPage === 'altavista' && <AltaVista />}
        {currentPage === 'hampster' && <HampsterDance />}
        {currentPage === 'askjeeves' && <AskJeeves onNavigate={navigate} />}
        {currentPage === 'webring' && <WebRing onNavigate={navigate} />}
        {currentPage === 'downloadram' && <DownloadMoreRam />}
        {currentPage === 'error' && <ErrorPage url={url} />}
      </div>

      {showStatusBar && (
        <StatusBar98
          panels={[
            { content: statusText },
            { content: 'Internet', width: 80, align: 'center' },
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
                    <Button98 className="min-w-0 text-[10px]" onClick={() => setHomeInput(url)}>Use Current</Button98>
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

function ErrorPage({ url }: { url: string }) {
  return (
    <div className="p-6 font-[family-name:var(--win98-font)]">
      <div className="flex items-start gap-4">
        <div className="text-[32px]">❌</div>
        <div>
          <h2 className="text-[16px] font-bold mb-2 text-black">The page cannot be displayed</h2>
          <p className="text-[12px] text-[#333] mb-3">
            The page you are looking for is currently unavailable. The Web site might be
            experiencing technical difficulties, or you may need to adjust your browser settings.
          </p>
          <hr className="border-[#cccccc] mb-3" />
          <p className="text-[12px] text-[#333] mb-2">Please try the following:</p>
          <ul className="text-[12px] text-[#333] list-disc pl-5 space-y-1">
            <li>Click the <strong>Refresh</strong> button, or try again later.</li>
            <li>If you typed the page address in the Address bar, make sure that it is spelled correctly.</li>
            <li>To check your connection settings, click the <strong>Tools</strong> menu, and then click <strong>Internet Options</strong>.</li>
          </ul>
          <p className="text-[11px] text-[#666] mt-4">Cannot find server or DNS Error<br />Internet Explorer</p>
          <p className="text-[11px] text-[#999] mt-2">URL: {url}</p>
        </div>
      </div>
    </div>
  );
}
