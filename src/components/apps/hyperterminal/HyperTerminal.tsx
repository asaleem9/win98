'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { playSound } from '@/lib/sounds';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { cn } from '@/lib/cn';
import {
  nextScreen,
  parseGuess,
  isValidGuess,
  compareGuess,
  isNewHighScore,
  isBusyNumber,
  type BbsScreen,
} from './bbsEngine';
import {
  CONNECTIONS,
  CONNECTION_ICONS,
  BBS_FILES,
  BUSY_NUMBERS,
  type BbsConnection,
  type BbsContent,
} from './bbsData';

const APP_ID = 'hyperterminal';
const DOWNLOADS_DIR = 'C:\\My Documents\\Downloads';

// ~2400 baud: reveal a handful of chars every tick so text streams in.
const REVEAL_CHARS = 6;
const REVEAL_TICK_MS = 25;

type Phase = 'list' | 'new' | 'connect' | 'terminal';
type ConnState = 'dialing' | 'online' | 'offline';
type TermColor = 'green' | 'amber' | 'white';

const COLOR_HEX: Record<TermColor, string> = {
  green: '#2aff2a',
  amber: '#ffb000',
  white: '#e6e6e6',
};

// A connection being dialed (a seeded entry, or one the user just described).
interface ActiveConnection {
  name: string;
  icon: string;
  number: string;
  busy?: boolean;
  bbs?: BbsContent;
}

// --- screen body builders (static per screen; interactive bits go in footer) ---

function messagesBody(bbs: BbsContent): string {
  let s = `\n   ===  ${bbs.boardName}  ::  MESSAGE BOARD  ===\n\n`;
  for (const m of bbs.messages) {
    s += `   [${m.num}] ${m.subject}\n`;
    s += `        from ${m.from}  --  ${m.date}\n`;
    s += m.body.split('\n').map((l) => `        ${l}`).join('\n');
    s += '\n\n';
  }
  s += `   [ Press Q to return to the main menu ]\n`;
  return s;
}

function filesBody(): string {
  let s = `\n   ===  FILE AREA  ===\n\n`;
  s += `    #  Filename                   Size   Description\n`;
  s += `   --- -------------------------- ------ ----------------------------\n`;
  for (const f of BBS_FILES) {
    s += `    ${f.num}  ${f.fileName.padEnd(26)} ${f.size.padEnd(6)} ${f.desc}\n`;
  }
  s += `\n   Press 1-${BBS_FILES.length} to select, (D) to download, (Q) to go back.\n`;
  return s;
}

function gamesBody(): string {
  return (
    `\n   ===  GAME ROOM  ===\n\n` +
    `        >>>  G U E S S   T H E   N U M B E R  <<<\n\n` +
    `   I'm thinking of a number between 1 and 100.\n` +
    `   Type your guess and press ENTER.  (Esc to give up)\n`
  );
}

export default function HyperTerminal({ windowId }: AppComponentProps) {
  const { closeWindow } = useWindows();
  const { getAppPref, setAppPref } = useSettings();
  const { createFile } = useFileSystem();

  const [phase, setPhase] = useState<Phase>('list');
  const [termColor, setTermColor] = useState<TermColor>(() => getAppPref(APP_ID, 'color', 'green') as TermColor);

  // New Connection dialog fields.
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState(CONNECTION_ICONS[0]);
  // Connect To dialog fields.
  const [active, setActive] = useState<ActiveConnection | null>(null);
  const [dialNumber, setDialNumber] = useState('');

  // Terminal state.
  const [connState, setConnState] = useState<ConnState>('dialing');
  const [screen, setScreen] = useState<BbsScreen>('main');
  const [bodyText, setBodyText] = useState('');
  const [revealed, setRevealed] = useState(0);
  const [selectedFile, setSelectedFile] = useState(0);
  const [download, setDownload] = useState<{ name: string; progress: number } | null>(null);

  // Guess game state.
  const [secret, setSecret] = useState(0);
  const [gameInput, setGameInput] = useState('');
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [tries, setTries] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  const termRef = useRef<HTMLDivElement>(null);
  // Authoritative body text, mutated synchronously alongside setBodyText so the
  // reveal ticker always sees the latest length even when React batches its
  // commits (e.g. one big advanceTimersByTime in a test).
  const bodyRef = useRef('');
  const triesRef = useRef(0);
  const secretRef = useRef(0);
  const wonRef = useRef(false);
  const gameInputRef = useRef('');
  const screenRef = useRef<BbsScreen>('main');
  const connStateRef = useRef<ConnState>('dialing');
  // Mirror the latest state into refs after each commit so the delayed key
  // handlers and timers read current values without being re-created.
  useEffect(() => {
    triesRef.current = tries;
    secretRef.current = secret;
    wonRef.current = gameWon;
    gameInputRef.current = gameInput;
    screenRef.current = screen;
    connStateRef.current = connState;
  }, [tries, secret, gameWon, gameInput, screen, connState]);
  // How many characters of the body have streamed in. A ref is the source of
  // truth so the reveal advances deterministically every tick even when React
  // coalesces the mirrored setState across a busy batch of timers.
  const revealedRef = useRef(0);

  const bbs = active?.bbs;

  const appendBody = useCallback((text: string) => {
    bodyRef.current += text;
    setBodyText(bodyRef.current);
  }, []);

  const setScreenBody = useCallback((text: string) => {
    bodyRef.current = text;
    setBodyText(text);
    revealedRef.current = 0;
    setRevealed(0);
  }, []);

  const skipReveal = useCallback(() => {
    revealedRef.current = bodyRef.current.length;
    setRevealed(revealedRef.current);
  }, []);

  // Stream the visible portion up to the full body at ~2400 baud. One long-lived
  // ticker advances a ref by a fixed step each tick and mirrors it into state, so
  // reveal keeps pace as new text is appended and survives React batching under
  // fake timers in tests (reading the synchronously-updated body ref for length).
  useEffect(() => {
    const id = window.setInterval(() => {
      const len = bodyRef.current.length;
      if (revealedRef.current >= len) return;
      revealedRef.current = Math.min(len, revealedRef.current + REVEAL_CHARS);
      setRevealed(revealedRef.current);
    }, REVEAL_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Keep the terminal scrolled to the newest text.
  useEffect(() => {
    const el = termRef.current;
    if (el && typeof el.scrollTo === 'function') el.scrollTop = el.scrollHeight;
  }, [revealed, gameLog, download]);

  // --- screen navigation ----------------------------------------------------

  const goToScreen = useCallback(
    (target: BbsScreen) => {
      if (!bbs) return;
      setScreen(target);
      setDownload(null);
      switch (target) {
        case 'main':
          setScreenBody(bbs.mainMenu);
          break;
        case 'messages':
          setScreenBody(messagesBody(bbs));
          break;
        case 'files':
          setSelectedFile(0);
          setScreenBody(filesBody());
          break;
        case 'operator':
          setScreenBody(bbs.operator);
          break;
        case 'games': {
          const s = 1 + Math.floor(Math.random() * 100);
          setSecret(s);
          setGameInput('');
          setGameLog([]);
          setTries(0);
          setGameWon(false);
          setScreenBody(gamesBody());
          break;
        }
        case 'goodbye':
          setScreenBody(`${bbs.goodbye}\n\n   NO CARRIER\n`);
          setConnState('offline');
          break;
      }
    },
    [bbs, setScreenBody],
  );

  // --- dialing --------------------------------------------------------------

  const startDial = useCallback(
    (conn: ActiveConnection) => {
      setPhase('terminal');
      setConnState('dialing');
      setScreen('main');
      const busy = conn.busy || isBusyNumber(conn.number, BUSY_NUMBERS);
      setScreenBody(`\n   HyperTerminal - dialing ${conn.name}\n\n   ATDT ${conn.number}\n`);
      playSound('modemDial');

      const timers: number[] = [];
      timers.push(window.setTimeout(() => appendBody(`\n   DIALING`), 500));
      timers.push(window.setTimeout(() => appendBody(` . . .`), 900));
      timers.push(
        window.setTimeout(() => appendBody(`\n   SCREEEEE-KSHHHHH-ping-ping-BONG-kshhhhhhhh...`), 1400),
      );
      timers.push(
        window.setTimeout(() => {
          if (busy) {
            appendBody(`\n\n   BUSY\n   NO CARRIER\n\n   The line is busy. (Long distance, of course.)\n`);
            setConnState('offline');
            playSound('error');
            return;
          }
          if (!conn.bbs) {
            appendBody(`\n\n   CONNECT 2400\n\n   . . . ringing . . . ringing . . .\n\n   NO ANSWER\n   NO CARRIER\n`);
            setConnState('offline');
            return;
          }
          appendBody(`\n\n   CONNECT 2400\n${conn.bbs.welcome}${conn.bbs.mainMenu}`);
          setConnState('online');
          setScreen('main');
        }, 2200),
      );
      // Best-effort cleanup if the component unmounts mid-dial.
      return timers;
    },
    [appendBody, setScreenBody],
  );

  // --- downloads ------------------------------------------------------------

  const startDownload = useCallback(() => {
    const file = BBS_FILES[selectedFile];
    if (!file || download) return;
    setDownload({ name: file.fileName, progress: 0 });
    const started = Date.now();
    const id = window.setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - started) / 1500) * 100));
      setDownload({ name: file.fileName, progress: pct });
      if (pct >= 100) {
        clearInterval(id);
        createFile(DOWNLOADS_DIR, file.fileName, file.content);
        appendBody(
          `\n   ZMODEM: ${file.fileName} received (${file.size})\n` +
            `   Saved to ${DOWNLOADS_DIR}\\${file.fileName}\n`,
        );
        playSound('ding');
        window.setTimeout(() => setDownload(null), 700);
      }
    }, 90);
  }, [selectedFile, download, createFile, appendBody]);

  // --- guess game key handling ----------------------------------------------

  const handleGameKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        goToScreen('main');
        return;
      }
      if (wonRef.current) {
        if (e.key === 'Enter') {
          e.preventDefault();
          goToScreen('main');
        }
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setGameInput((g) => (g + e.key).slice(0, 3));
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setGameInput((g) => g.slice(0, -1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const guess = parseGuess(gameInputRef.current);
        setGameInput('');
        if (guess === null || !isValidGuess(guess)) {
          setGameLog((l) => [...l, '* please enter a whole number from 1 to 100']);
          return;
        }
        const nextTries = triesRef.current + 1;
        setTries(nextTries);
        const result = compareGuess(secretRef.current, guess);
        if (result === 'correct') {
          const best = getAppPref<number | null>(APP_ID, 'guessBest', null);
          const newLog = [...gameLog, `* ${guess}? YES! You cracked it in ${nextTries} ${nextTries === 1 ? 'try' : 'tries'}!`];
          if (isNewHighScore(nextTries, best)) {
            setAppPref(APP_ID, 'guessBest', nextTries);
            newLog.push('* >>> NEW HIGH SCORE! <<<  (fewest tries wins)');
          } else if (best !== null) {
            newLog.push(`* Board record still stands: ${best} tries.`);
          }
          newLog.push('* Press ENTER to return to the menu.');
          setGameLog(newLog);
          setGameWon(true);
          playSound('ding');
        } else {
          setGameLog((l) => [...l, `* ${guess} is too ${result === 'low' ? 'LOW' : 'HIGH'}. Try again.`]);
        }
      }
    },
    [goToScreen, getAppPref, setAppPref, gameLog],
  );

  // --- terminal key handling ------------------------------------------------

  const handleTermKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (connStateRef.current === 'offline') return;

      // Spacebar skips the streaming reveal.
      if (e.key === ' ' && revealedRef.current < bodyRef.current.length) {
        e.preventDefault();
        skipReveal();
        return;
      }
      if (connStateRef.current === 'dialing') return;

      const cur = screenRef.current;
      if (cur === 'games') {
        handleGameKey(e);
        return;
      }
      if (cur === 'operator') {
        // Any key returns to the main menu.
        e.preventDefault();
        goToScreen('main');
        return;
      }
      if (cur === 'files' && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < BBS_FILES.length) {
          e.preventDefault();
          setSelectedFile(idx);
        }
        return;
      }

      const { screen: ns, action } = nextScreen(cur, e.key);
      if (action === 'download') {
        e.preventDefault();
        startDownload();
        return;
      }
      if (action === 'disconnect') {
        e.preventDefault();
        goToScreen('goodbye');
        return;
      }
      if (ns !== cur) {
        e.preventDefault();
        goToScreen(ns);
      }
    },
    [skipReveal, handleGameKey, goToScreen, startDownload],
  );

  // Focus the terminal whenever it becomes active so keys are captured.
  useEffect(() => {
    if (phase === 'terminal') termRef.current?.focus();
  }, [phase, connState]);

  // --- menus ----------------------------------------------------------------

  const disconnect = useCallback(() => {
    if (connStateRef.current === 'online') goToScreen('goodbye');
    else {
      setPhase('list');
      setActive(null);
    }
  }, [goToScreen]);

  const menus = useMemo<MenuDefinition[]>(() => {
    const setColor = (c: TermColor) => {
      setTermColor(c);
      setAppPref(APP_ID, 'color', c);
    };
    return [
      {
        label: '&File',
        items: [
          { label: '&New Connection...', onClick: () => { setPhase('new'); setNewName(''); setNewIcon(CONNECTION_ICONS[0]); } },
          { label: '&Open Phone Book', onClick: () => setPhase('list') },
          { label: '', separator: true },
          { label: 'E&xit', onClick: () => closeWindow(windowId) },
        ],
      },
      {
        label: '&Call',
        items: [
          { label: '&Disconnect', disabled: phase !== 'terminal' || connState !== 'online', onClick: disconnect },
          { label: '&Reconnect', disabled: phase !== 'terminal' || connState !== 'offline' || !active, onClick: () => active && startDial(active) },
        ],
      },
      {
        label: '&Settings',
        items: [
          { label: '&Green on Black', radio: true, checked: termColor === 'green', onClick: () => setColor('green') },
          { label: '&Amber on Black', radio: true, checked: termColor === 'amber', onClick: () => setColor('amber') },
          { label: '&White on Black', radio: true, checked: termColor === 'white', onClick: () => setColor('white') },
        ],
      },
      {
        label: '&Help',
        items: [
          {
            label: '&About HyperTerminal...',
            onClick: () => window.dispatchEvent(new CustomEvent('win98-about-dialog', { detail: { appName: 'HyperTerminal' } })),
          },
        ],
      },
    ];
  }, [phase, connState, termColor, active, closeWindow, windowId, setAppPref, disconnect, startDial]);

  // --- render ---------------------------------------------------------------

  const visibleBody = bodyText.slice(0, revealed);
  const revealDone = revealed >= bodyText.length;

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none">
      <style>{`@keyframes htblink{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>
      <MenuBar menus={menus} windowId={windowId} />

      {phase === 'list' && (
        <PhoneBook
          onDial={(conn) => {
            setActive({ name: conn.name, icon: conn.icon, number: conn.number, busy: conn.busy, bbs: conn.bbs });
            setDialNumber(conn.number);
            setPhase('connect');
          }}
          onNew={() => { setPhase('new'); setNewName(''); setNewIcon(CONNECTION_ICONS[0]); }}
        />
      )}

      {phase === 'new' && (
        <NewConnectionDialog
          name={newName}
          icon={newIcon}
          onName={setNewName}
          onIcon={setNewIcon}
          onCancel={() => setPhase('list')}
          onOk={() => {
            setActive({ name: newName.trim() || 'New Connection', icon: newIcon, number: '' });
            setDialNumber('');
            setPhase('connect');
          }}
        />
      )}

      {phase === 'connect' && active && (
        <ConnectToDialog
          conn={active}
          number={dialNumber}
          onNumber={setDialNumber}
          onCancel={() => setPhase('list')}
          onDial={() => {
            const conn = { ...active, number: dialNumber.trim() || active.number };
            setActive(conn);
            startDial(conn);
          }}
        />
      )}

      {phase === 'terminal' && (
        <>
          <div
            ref={termRef}
            tabIndex={0}
            role="textbox"
            aria-label="BBS terminal"
            onKeyDown={handleTermKey}
            className="flex-1 min-h-0 overflow-y-auto bg-black px-2 py-1 outline-none leading-[14px] whitespace-pre-wrap break-words"
            style={{ color: COLOR_HEX[termColor], fontFamily: 'var(--win98-font-mono)' }}
          >
            {visibleBody}
            {/* live footer: guess log / download bar / prompt cursor */}
            {connState === 'online' && screen === 'games' && (
              <>
                {gameLog.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
                {!gameWon && revealDone && (
                  <div>
                    {'> '}
                    {gameInput}
                    <span style={{ animation: 'htblink 1s step-end infinite' }}>█</span>
                  </div>
                )}
              </>
            )}
            {connState === 'online' && screen === 'files' && revealDone && !download && (
              <div>
                {`Selected: [${BBS_FILES[selectedFile].num}] ${BBS_FILES[selectedFile].fileName}  --  press (D) to download `}
                <span style={{ animation: 'htblink 1s step-end infinite' }}>█</span>
              </div>
            )}
            {download && (
              <div>
                {`Receiving ${download.name} via ZMODEM...`}
                <br />
                {`[${'®'.repeat(Math.round(download.progress / 4)).padEnd(25, '·')}] ${download.progress}%`}
              </div>
            )}
            {connState === 'online' && (screen === 'main' || screen === 'messages') && revealDone && (
              <span style={{ animation: 'htblink 1s step-end infinite' }}>█</span>
            )}
            {connState === 'dialing' && !revealDone && (
              <span style={{ animation: 'htblink 1s step-end infinite' }}>█</span>
            )}
          </div>

          {connState === 'offline' && (
            <div className="flex items-center gap-2 px-2 py-1 border-t border-[var(--win98-button-highlight)] bg-[var(--win98-button-face)]">
              <span className="text-[var(--win98-disabled-text)]">Disconnected.</span>
              {active && (
                <button
                  onClick={() => startDial(active)}
                  className="px-3 py-[2px] bg-[var(--win98-button-face)] border border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]"
                >
                  Redial
                </button>
              )}
              <button
                onClick={() => { setPhase('list'); setActive(null); }}
                className="px-3 py-[2px] bg-[var(--win98-button-face)] border border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]"
              >
                Phone Book
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 px-2 h-[18px] border-t border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)] text-[10px] text-[var(--win98-disabled-text)]">
            <span>{connState === 'online' ? 'Connected 2400 8-N-1' : connState === 'dialing' ? 'Dialing...' : 'Disconnected'}</span>
            {active && <span>{active.name}</span>}
            <span className="ml-auto">Auto detect | ANSI</span>
          </div>
        </>
      )}
    </div>
  );
}

// --- phone book -------------------------------------------------------------

function PhoneBook({ onDial, onNew }: { onDial: (c: BbsConnection) => void; onNew: () => void }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--win98-button-face)] p-3">
      <div className="mb-2">Choose a service to dial, or create a new connection:</div>
      <div className="grid grid-cols-2 gap-2">
        {CONNECTIONS.map((c) => (
          <button
            key={c.id}
            onDoubleClick={() => onDial(c)}
            onClick={(e) => { if (e.detail === 0) onDial(c); }}
            className="flex items-center gap-2 p-2 text-left bg-[var(--win98-input-bg)] border border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-shadow)] border-r-[var(--win98-button-shadow)] hover:bg-[#e8e8ff]"
            title="Double-click to dial"
          >
            <span className="text-[24px] leading-none">{c.icon}</span>
            <span className="min-w-0">
              <span className="block font-bold truncate">{c.name}</span>
              <span className="block text-[var(--win98-disabled-text)] truncate">{c.number}</span>
            </span>
          </button>
        ))}
        <button
          onClick={onNew}
          className="flex items-center gap-2 p-2 text-left bg-[var(--win98-input-bg)] border border-dashed border-[var(--win98-button-shadow)] hover:bg-[#e8e8ff]"
        >
          <span className="text-[24px] leading-none">✳️</span>
          <span className="font-bold">New Connection...</span>
        </button>
      </div>
      <div className="mt-3 text-[var(--win98-disabled-text)]">
        Tip: the terminal is keyboard-driven once connected. Single keys pick menu
        items, and the spacebar skips the 2400-baud text as it streams in.
      </div>
    </div>
  );
}

// --- new connection dialog --------------------------------------------------

function NewConnectionDialog({
  name,
  icon,
  onName,
  onIcon,
  onOk,
  onCancel,
}: {
  name: string;
  icon: string;
  onName: (v: string) => void;
  onIcon: (v: string) => void;
  onOk: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--win98-button-face)] p-4">
      <div className="font-bold mb-1">New Connection</div>
      <div className="mb-3 text-[var(--win98-disabled-text)]">Enter a name and choose an icon for the connection:</div>
      <label className="block mb-1">Name:</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => onName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onOk(); }}
        className="w-full h-[20px] px-1 mb-3 bg-white border border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] outline-none"
        aria-label="Connection name"
      />
      <label className="block mb-1">Icon:</label>
      <div className="flex flex-wrap gap-1 p-2 mb-4 bg-white border border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
        {CONNECTION_ICONS.map((g) => (
          <button
            key={g}
            onClick={() => onIcon(g)}
            className={cn(
              'w-[32px] h-[32px] text-[20px] leading-none flex items-center justify-center border',
              g === icon
                ? 'border-[var(--win98-highlight)] bg-[#cfe0ff]'
                : 'border-transparent hover:border-[var(--win98-button-shadow)]',
            )}
            aria-label={`Icon ${g}`}
            aria-pressed={g === icon}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onOk}
          disabled={!name.trim()}
          className="px-4 py-[2px] bg-[var(--win98-button-face)] border border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] disabled:text-[var(--win98-disabled-text)]"
        >
          OK
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-[2px] bg-[var(--win98-button-face)] border border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- connect-to dialog ------------------------------------------------------

function ConnectToDialog({
  conn,
  number,
  onNumber,
  onDial,
  onCancel,
}: {
  conn: ActiveConnection;
  number: string;
  onNumber: (v: string) => void;
  onDial: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--win98-button-face)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[28px] leading-none">{conn.icon}</span>
        <span className="font-bold text-[13px]">{conn.name}</span>
      </div>
      <div className="mb-3 text-[var(--win98-disabled-text)]">Enter the details for the phone number that you want to dial:</div>
      <label className="block mb-1">Phone number:</label>
      <input
        autoFocus
        value={number}
        onChange={(e) => onNumber(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onDial(); }}
        placeholder="1-555-555-0100"
        className="w-full h-[20px] px-1 mb-4 bg-white border border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] outline-none"
        style={{ fontFamily: 'var(--win98-font-mono)' }}
        aria-label="Phone number"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onDial}
          className="px-4 py-[2px] bg-[var(--win98-button-face)] border border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]"
        >
          Dial
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-[2px] bg-[var(--win98-button-face)] border border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
