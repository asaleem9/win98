'use client';

import { useState, useCallback, useMemo } from 'react';
import { AppComponentProps } from '@/types/app';
import { MenuBar } from '@/components/window/MenuBar';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Input98 } from '@/components/ui/Input98';
import { Button98 } from '@/components/ui/Button98';
import Yahoo1998 from './websites/Yahoo1998';
import GeoCities from './websites/GeoCities';
import AltaVista from './websites/AltaVista';

type PageKey = 'home' | 'yahoo' | 'geocities' | 'altavista' | 'error' | 'about:blank';

const KNOWN_URLS: Record<string, PageKey> = {
  'http://www.yahoo.com': 'yahoo',
  'https://www.yahoo.com': 'yahoo',
  'www.yahoo.com': 'yahoo',
  'yahoo.com': 'yahoo',
  'http://www.geocities.com': 'geocities',
  'https://www.geocities.com': 'geocities',
  'www.geocities.com': 'geocities',
  'geocities.com': 'geocities',
  'http://www.geocities.com/area51/vault/4827': 'geocities',
  'http://www.altavista.com': 'altavista',
  'https://www.altavista.com': 'altavista',
  'www.altavista.com': 'altavista',
  'altavista.com': 'altavista',
  'about:blank': 'about:blank',
};

const HOME_URL = 'http://www.yahoo.com';

function ArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M8 2L3 7L8 12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M6 2L11 7L6 12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="3" y="3" width="8" height="8" fill="currentColor" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M11 7A4 4 0 1 1 7 3M7 1V5H11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7L7 2L12 7V12H9V9H5V12H2V7Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function InternetExplorer({ windowId }: AppComponentProps) {
  const [url, setUrl] = useState(HOME_URL);
  const [addressBarValue, setAddressBarValue] = useState(HOME_URL);
  const [history, setHistory] = useState<string[]>([HOME_URL]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [statusText, setStatusText] = useState('Done');

  const currentPage = useMemo((): PageKey => {
    const normalized = url.toLowerCase().replace(/\/+$/, '');
    return KNOWN_URLS[normalized] ?? 'error';
  }, [url]);

  const navigate = useCallback((newUrl: string) => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    setUrl(trimmed);
    setAddressBarValue(trimmed);
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(trimmed);
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
    setStatusText('Done');
  }, [historyIndex]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevUrl = history[newIndex];
      setUrl(prevUrl);
      setAddressBarValue(prevUrl);
    }
  }, [historyIndex, history]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextUrl = history[newIndex];
      setUrl(nextUrl);
      setAddressBarValue(nextUrl);
    }
  }, [historyIndex, history]);

  const goHome = useCallback(() => {
    navigate(HOME_URL);
  }, [navigate]);

  const handleAddressSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    navigate(addressBarValue);
  }, [addressBarValue, navigate]);

  const menus = useMemo(() => [
    {
      label: 'File',
      items: [
        { label: 'New Window', shortcut: 'Ctrl+N' },
        { label: 'Open...', shortcut: 'Ctrl+O' },
        { separator: true, label: '' },
        { label: 'Close', shortcut: 'Alt+F4' },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Cut', shortcut: 'Ctrl+X', disabled: true },
        { label: 'Copy', shortcut: 'Ctrl+C', disabled: true },
        { label: 'Paste', shortcut: 'Ctrl+V', disabled: true },
        { separator: true, label: '' },
        { label: 'Select All', shortcut: 'Ctrl+A' },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Toolbar', checked: true },
        { label: 'Status Bar', checked: true },
        { separator: true, label: '' },
        { label: 'Source' },
      ],
    },
    {
      label: 'Favorites',
      items: [
        { label: 'Add to Favorites...' },
        { label: 'Organize Favorites...' },
        { separator: true, label: '' },
        { label: 'Yahoo!', onClick: () => navigate('http://www.yahoo.com') },
        { label: 'GeoCities', onClick: () => navigate('http://www.geocities.com') },
        { label: 'AltaVista', onClick: () => navigate('http://www.altavista.com') },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'About Internet Explorer' },
      ],
    },
  ], [navigate]);

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <MenuBar menus={menus} />

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-1 py-[2px] border-b border-[var(--win98-button-shadow)]">
        <ToolbarButton onClick={goBack} disabled={historyIndex <= 0} label="Back" icon={<ArrowLeft />} />
        <ToolbarButton onClick={goForward} disabled={historyIndex >= history.length - 1} label="Forward" icon={<ArrowRight />} />
        <ToolbarButton onClick={() => {}} label="Stop" icon={<StopIcon />} />
        <ToolbarButton onClick={() => navigate(url)} label="Refresh" icon={<RefreshIcon />} />
        <ToolbarButton onClick={goHome} label="Home" icon={<HomeIcon />} />
      </div>

      {/* Address bar */}
      <form onSubmit={handleAddressSubmit} className="flex items-center gap-1 px-2 py-[3px] border-b border-[var(--win98-button-shadow)]">
        <span className="text-[11px] whitespace-nowrap">Address</span>
        <Input98
          value={addressBarValue}
          onChange={(e) => setAddressBarValue(e.target.value)}
          className="flex-1 h-[20px]"
        />
        <Button98 className="min-w-[40px] min-h-[20px] h-[20px] text-[11px]" type="submit">
          Go
        </Button98>
      </form>

      {/* Content area */}
      <div className="flex-1 overflow-auto bg-white">
        {currentPage === 'about:blank' && (
          <div className="h-full bg-white" />
        )}
        {currentPage === 'home' && <Yahoo1998 />}
        {currentPage === 'yahoo' && <Yahoo1998 />}
        {currentPage === 'geocities' && <GeoCities />}
        {currentPage === 'altavista' && <AltaVista />}
        {currentPage === 'error' && <ErrorPage url={url} />}
      </div>

      <StatusBar98
        panels={[
          { content: statusText },
          { content: 'Internet', width: 80, align: 'center' },
        ]}
      />
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
          <h2 className="text-[16px] font-bold mb-2 text-black">
            The page cannot be displayed
          </h2>
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
          <p className="text-[11px] text-[#666] mt-4">
            Cannot find server or DNS Error<br />
            Internet Explorer
          </p>
          <p className="text-[11px] text-[#999] mt-2">
            URL: {url}
          </p>
        </div>
      </div>
    </div>
  );
}
