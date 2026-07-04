'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { cn } from '@/lib/cn';
import {
  parseCommand,
  generateBotReply,
  checkWarezKick,
  nickColor,
  isNickMention,
  formatIrcTime,
} from './mircEngine';
import {
  CHANNELS,
  CHANNEL_LIST,
  MOTD_LINES,
  SERVER_NAME,
  SERVER_PORT,
  DEFAULT_NICK,
  DEFAULT_CHANNELS,
  helpBotAnswer,
} from './mircData';

const APP_ID = 'mirc';

type LineKind = 'motd' | 'system' | 'notice' | 'message' | 'action' | 'error';

interface IrcLine {
  id: number;
  kind: LineKind;
  from?: string;
  text: string;
  time: string;
}

interface IrcWindow {
  id: string; // 'status' or a channel/query name
  kind: 'status' | 'channel' | 'query';
  lines: IrcLine[];
  nicks: string[];
  joined: boolean;
  kicked: boolean;
  topic: string;
  unread: number;
}

const STATUS_ID = 'status';

let lineCounter = 0;
const nextLineId = () => ++lineCounter;

/** A handful of random distinct picks from a list (for who reacts / who chatters). */
function samples<T>(list: T[], count: number): T[] {
  const pool = [...list];
  const out: T[] = [];
  while (pool.length && out.length < count) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Build the opening roster for a channel: you, its ops, bots, and a few visitors. */
function initialRoster(nick: string, channel: string): string[] {
  const cfg = CHANNELS[channel];
  if (!cfg) return [nick];
  const visitors = samples(cfg.visitors, randInt(2, cfg.visitors.length));
  return Array.from(new Set([nick, ...cfg.ops, ...cfg.bots, ...visitors]));
}

export default function MIRC({ windowId }: AppComponentProps) {
  const { closeWindow } = useWindows();
  const { getAppPref, setAppPref } = useSettings();

  const [nick, setNick] = useState<string>(() => getAppPref(APP_ID, 'nick', DEFAULT_NICK));
  const [windows, setWindows] = useState<IrcWindow[]>([
    { id: STATUS_ID, kind: 'status', lines: [], nicks: [], joined: true, kicked: false, topic: '', unread: 0 },
  ]);
  const [activeId, setActiveId] = useState<string>(STATUS_ID);
  const [input, setInput] = useState('');
  const [showTimestamps, setShowTimestamps] = useState<boolean>(() => getAppPref(APP_ID, 'timestamps', true));
  const [showNickList, setShowNickList] = useState(true);
  const [showAbout, setShowAbout] = useState(false);

  // Refs so timers (ambient chatter, delayed bot replies) read live state.
  const nickRef = useRef(nick);
  nickRef.current = nick;
  const activeRef = useRef(activeId);
  activeRef.current = activeId;
  const replyIndex = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const joinedKnownRef = useRef<string[]>([]);
  // The channels to auto-join, captured once at mount before the persist effect
  // below overwrites the stored value with the live set.
  const savedChannelsRef = useRef<string[]>(getAppPref(APP_ID, 'channels', DEFAULT_CHANNELS));

  const active = windows.find((w) => w.id === activeId) ?? windows[0];

  // Keep the list of joined, bot-populated channels fresh for the ambient timer.
  useEffect(() => {
    joinedKnownRef.current = windows
      .filter((w) => w.kind === 'channel' && w.joined && CHANNELS[w.id])
      .map((w) => w.id);
  }, [windows]);

  // --- line/window helpers --------------------------------------------------

  const appendLine = useCallback((winId: string, line: Omit<IrcLine, 'id' | 'time'>) => {
    const time = formatIrcTime(new Date());
    setWindows((prev) => {
      const exists = prev.some((w) => w.id === winId);
      if (!exists) return prev;
      return prev.map((w) => {
        if (w.id !== winId) return w;
        const unread = winId === activeRef.current ? 0 : w.unread + 1;
        return { ...w, unread, lines: [...w.lines, { ...line, id: nextLineId(), time }] };
      });
    });
  }, []);

  // A message/action from someone else — beeps subtly if it mentions your nick.
  const postFromOther = useCallback(
    (winId: string, from: string, text: string, kind: 'message' | 'action' = 'message') => {
      if (isNickMention(text, nickRef.current) && from !== nickRef.current) playSound('ding');
      appendLine(winId, { kind, from, text });
    },
    [appendLine],
  );

  // Persist the joined channels so they auto-rejoin next session. Keyed on the
  // joined set so it only writes when that actually changes, and kept out of the
  // setWindows updater (which must stay a pure function).
  const joinedChannelsKey = useMemo(
    () => windows.filter((w) => w.kind === 'channel' && w.joined).map((w) => w.id).join('\n'),
    [windows],
  );
  useEffect(() => {
    setAppPref(APP_ID, 'channels', joinedChannelsKey ? joinedChannelsKey.split('\n') : []);
  }, [joinedChannelsKey, setAppPref]);

  // --- bot reactions --------------------------------------------------------

  const scheduleReplies = useCallback(
    (channel: string, userText: string) => {
      const cfg = CHANNELS[channel];
      if (!cfg) return;

      if (channel === '#warez-chat') {
        const kick = checkWarezKick(userText, cfg.ops, replyIndex.current++);
        if (kick) {
          window.setTimeout(() => {
            playSound('ding');
            appendLine(channel, {
              kind: 'system',
              text: `*** ${nickRef.current} was kicked from ${channel} by ${kick.by} (${kick.reason})`,
            });
            appendLine(channel, {
              kind: 'notice',
              text: `* You can rejoin ${channel} at any time -- type  /join ${channel}`,
            });
            setWindows((prev) =>
              prev.map((w) =>
                w.id === channel
                  ? { ...w, joined: false, kicked: true, nicks: w.nicks.filter((n) => n !== nickRef.current) }
                  : w,
              ),
            );
          }, 500);
          return;
        }
      }

      if (channel === '#help') {
        const answer = helpBotAnswer(userText, replyIndex.current++);
        window.setTimeout(() => postFromOther(channel, cfg.ops[0], answer), randInt(600, 1100));
        return;
      }

      // #chat / #y2k: one or two bots react.
      const responders = samples(cfg.bots, randInt(1, 2));
      responders.forEach((bot, i) => {
        const idx = replyIndex.current++;
        const reply = generateBotReply(userText, { canned: cfg.canned, triggers: cfg.triggers, index: idx });
        if (!reply) return;
        window.setTimeout(() => postFromOther(channel, bot, reply), 500 + i * 900 + randInt(0, 500));
      });
    },
    [appendLine, postFromOther],
  );

  // --- commands -------------------------------------------------------------

  const openChannel = useCallback(
    (channel: string) => {
      setWindows((prev) => {
        const existing = prev.find((w) => w.id === channel);
        const cfg = CHANNELS[channel];
        const topic = cfg?.topic ?? 'No topic is set';
        const roster = initialRoster(nickRef.current, channel);
        const joinLines: IrcLine[] = [
          { id: nextLineId(), kind: 'system', time: formatIrcTime(new Date()), text: `*** Now talking in ${channel}` },
          { id: nextLineId(), kind: 'system', time: formatIrcTime(new Date()), text: `*** Topic is: ${topic}` },
          {
            id: nextLineId(),
            kind: 'system',
            time: formatIrcTime(new Date()),
            text: cfg
              ? `*** Users on ${channel}: ${roster.map((n) => (cfg.ops.includes(n) ? `@${n}` : n)).join(' ')}`
              : `*** ${channel}: no one else is here. lonely!`,
          },
        ];
        let next: IrcWindow[];
        if (existing) {
          next = prev.map((w) =>
            w.id === channel
              ? { ...w, joined: true, kicked: false, nicks: roster, topic, lines: [...w.lines, ...joinLines] }
              : w,
          );
        } else {
          next = [
            ...prev,
            { id: channel, kind: 'channel', lines: joinLines, nicks: roster, joined: true, kicked: false, topic, unread: 0 },
          ];
        }
        return next;
      });
      setActiveId(channel);
    },
    [],
  );

  const partChannel = useCallback(
    (channel: string) => {
      setWindows((prev) =>
        prev.map((w) =>
          w.id === channel
            ? {
                ...w,
                joined: false,
                nicks: [],
                lines: [
                  ...w.lines,
                  { id: nextLineId(), kind: 'system', time: formatIrcTime(new Date()), text: `*** You have left ${channel}` },
                ],
              }
            : w,
        ),
      );
    },
    [],
  );

  const changeNick = useCallback(
    (newNick: string) => {
      const old = nickRef.current;
      if (newNick === old) return;
      setNick(newNick);
      setAppPref(APP_ID, 'nick', newNick);
      setWindows((prev) =>
        prev.map((w) => {
          if (w.kind !== 'channel' || !w.joined) return w;
          return {
            ...w,
            nicks: w.nicks.map((n) => (n === old ? newNick : n)),
            lines: [
              ...w.lines,
              { id: nextLineId(), kind: 'system', time: formatIrcTime(new Date()), text: `*** ${old} is now known as ${newNick}` },
            ],
          };
        }),
      );
    },
    [setAppPref],
  );

  const openQuery = useCallback((target: string) => {
    setWindows((prev) => {
      if (prev.some((w) => w.id === target)) return prev;
      return [
        ...prev,
        {
          id: target,
          kind: 'query',
          lines: [{ id: nextLineId(), kind: 'system', time: formatIrcTime(new Date()), text: `*** Private conversation with ${target}` }],
          nicks: [target],
          joined: true,
          kicked: false,
          topic: `Private chat with ${target}`,
          unread: 0,
        },
      ];
    });
    setActiveId(target);
  }, []);

  const runList = useCallback(
    (winId: string) => {
      appendLine(winId, { kind: 'system', text: '*** Channel     Users  Topic' });
      for (const c of CHANNEL_LIST) {
        appendLine(winId, {
          kind: 'notice',
          text: `${c.name.padEnd(14)}${String(c.users).padEnd(6)} ${c.topic}`,
        });
      }
      appendLine(winId, { kind: 'system', text: '*** End of /LIST' });
    },
    [appendLine],
  );

  const printHelp = useCallback(
    (winId: string) => {
      const lines = [
        '*** mIRC commands:',
        '   /join #channel    - join a channel',
        '   /part [#channel]  - leave the current (or named) channel',
        '   /nick newnick     - change your nickname',
        '   /me action        - send an action ( * you wave )',
        '   /msg nick text    - send a private message',
        '   /list             - list channels on the network',
        '   /quit [message]   - disconnect',
        '*** Tip: visit #help and just ask -- the op bot answers.',
      ];
      for (const t of lines) appendLine(winId, { kind: 'notice', text: t });
    },
    [appendLine],
  );

  const handleSend = useCallback(() => {
    const raw = input;
    setInput('');
    const parsed = parseCommand(raw);
    const cur = windows.find((w) => w.id === activeRef.current);
    const winId = cur?.id ?? STATUS_ID;

    switch (parsed.type) {
      case 'say': {
        if (!parsed.text) return;
        if (!cur || cur.kind === 'status') {
          appendLine(STATUS_ID, { kind: 'error', text: '* You are not on a channel. Type /join #chat to start.' });
          return;
        }
        if (cur.kind === 'channel' && !cur.joined) {
          appendLine(winId, { kind: 'error', text: `* Cannot send to ${winId} -- you are not on that channel. Type /join ${winId}` });
          return;
        }
        appendLine(winId, { kind: 'message', from: nickRef.current, text: parsed.text });
        if (cur.kind === 'channel') scheduleReplies(winId, parsed.text);
        else scheduleReplies('#chat', parsed.text); // query windows echo a generic reply path
        return;
      }
      case 'me': {
        if (!cur || cur.kind === 'status' || (cur.kind === 'channel' && !cur.joined)) {
          appendLine(STATUS_ID, { kind: 'error', text: '* You are not on a channel.' });
          return;
        }
        appendLine(winId, { kind: 'action', from: nickRef.current, text: parsed.action });
        if (cur.kind === 'channel') scheduleReplies(winId, parsed.action);
        return;
      }
      case 'join':
        openChannel(parsed.channel);
        return;
      case 'part': {
        const target = parsed.channel ?? (cur?.kind === 'channel' ? cur.id : null);
        if (!target) {
          appendLine(winId, { kind: 'error', text: '* /part: you are not on a channel.' });
          return;
        }
        partChannel(target);
        return;
      }
      case 'nick':
        changeNick(parsed.nick);
        return;
      case 'msg':
        openQuery(parsed.target);
        appendLine(parsed.target, { kind: 'message', from: nickRef.current, text: parsed.text });
        window.setTimeout(() => postFromOther(parsed.target, parsed.target, generateBotReply(parsed.text, { canned: CHANNELS['#chat'].canned, index: replyIndex.current++ })), randInt(700, 1400));
        return;
      case 'list':
        runList(winId);
        return;
      case 'quit':
        appendLine(STATUS_ID, { kind: 'system', text: `*** Disconnected (${parsed.reason ?? 'Leaving'})` });
        window.setTimeout(() => closeWindow(windowId), 400);
        return;
      case 'help':
        printHelp(winId);
        return;
      case 'error':
        appendLine(winId, { kind: 'error', text: parsed.message });
        return;
    }
  }, [input, windows, appendLine, scheduleReplies, openChannel, partChannel, changeNick, openQuery, postFromOther, runList, printHelp, closeWindow, windowId]);

  // --- connect: stream the MOTD, then auto-join saved channels --------------

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    MOTD_LINES.forEach((text, i) => {
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setWindows((prev) =>
            prev.map((w) =>
              w.id === STATUS_ID
                ? { ...w, lines: [...w.lines, { id: nextLineId(), kind: 'motd', time: formatIrcTime(new Date()), text }] }
                : w,
            ),
          );
        }, i * 55),
      );
    });
    // After the MOTD, auto-join the last channels (or the defaults).
    timers.push(
      window.setTimeout(() => {
        if (cancelled) return;
        const saved = savedChannelsRef.current;
        const toJoin = Array.isArray(saved) && saved.length ? saved : DEFAULT_CHANNELS;
        toJoin.filter((c) => CHANNELS[c]).forEach((c) => openChannel(c));
      }, MOTD_LINES.length * 55 + 200),
    );
    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- ambient chatter + visitor ticker -------------------------------------

  useEffect(() => {
    const interval = window.setInterval(() => {
      const chans = joinedKnownRef.current;
      if (!chans.length) return;
      const channel = chans[Math.floor(Math.random() * chans.length)];
      const cfg = CHANNELS[channel];
      if (!cfg) return;
      const roll = Math.random();
      if (roll < 0.4 && cfg.visitors.length) {
        // Someone drifts in or out.
        const who = cfg.visitors[Math.floor(Math.random() * cfg.visitors.length)];
        const joining = Math.random() < 0.5;
        appendLine(channel, {
          kind: 'system',
          text: joining
            ? `*** ${who} (${who.toLowerCase()}@dialup-${randInt(2, 254)}.aol.com) has joined ${channel}`
            : `*** ${who} has quit (Ping timeout: 240 seconds)`,
        });
        setWindows((prev) =>
          prev.map((w) => {
            if (w.id !== channel) return w;
            const nicks = joining ? Array.from(new Set([...w.nicks, who])) : w.nicks.filter((n) => n !== who);
            return { ...w, nicks };
          }),
        );
      } else {
        const bot = cfg.bots[Math.floor(Math.random() * cfg.bots.length)];
        const text = cfg.ambient[Math.floor(Math.random() * cfg.ambient.length)];
        postFromOther(channel, bot, text);
      }
    }, 9000);
    return () => clearInterval(interval);
  }, [appendLine, postFromOther]);

  // Auto-scroll the active window to the newest line.
  useEffect(() => {
    const el = endRef.current;
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'end' });
  }, [active.lines]);

  // --- menus ----------------------------------------------------------------

  const menus = useMemo<MenuDefinition[]>(() => {
    const activeChannel = active.kind === 'channel' ? active.id : null;
    return [
      {
        label: '&File',
        items: [
          { label: 'Options...', disabled: true },
          { label: '', separator: true },
          { label: 'E&xit', onClick: () => closeWindow(windowId) },
        ],
      },
      {
        label: '&View',
        items: [
          {
            label: 'Show &Timestamps',
            checked: showTimestamps,
            onClick: () => setShowTimestamps((v) => { setAppPref(APP_ID, 'timestamps', !v); return !v; }),
          },
          {
            label: 'Show &Nick List',
            checked: showNickList,
            onClick: () => setShowNickList((v) => !v),
          },
          { label: '', separator: true },
          { label: 'Clear Window', onClick: () => setWindows((prev) => prev.map((w) => (w.id === activeRef.current ? { ...w, lines: [] } : w))) },
        ],
      },
      {
        label: '&Commands',
        items: [
          { label: '&Join #chat', onClick: () => openChannel('#chat') },
          { label: 'Join #&warez-chat', onClick: () => openChannel('#warez-chat') },
          { label: 'Join #&y2k', onClick: () => openChannel('#y2k') },
          { label: 'Join #&help', onClick: () => openChannel('#help') },
          { label: '', separator: true },
          { label: 'Channel &List (/list)', onClick: () => runList(activeRef.current) },
          { label: '&Leave Channel', disabled: !activeChannel, onClick: () => activeChannel && partChannel(activeChannel) },
          { label: '', separator: true },
          { label: 'Change &Nick...', onClick: () => { setInput('/nick '); inputRef.current?.focus(); } },
          { label: '&Disconnect', onClick: () => closeWindow(windowId) },
        ],
      },
      {
        label: '&Help',
        items: [
          { label: 'mIRC &Help (/help)', onClick: () => printHelp(activeRef.current) },
          { label: '', separator: true },
          { label: '&About mIRC...', onClick: () => setShowAbout(true) },
        ],
      },
    ];
  }, [active, showTimestamps, showNickList, closeWindow, windowId, setAppPref, openChannel, runList, partChannel, printHelp]);

  // --- render helpers -------------------------------------------------------

  const activeCfg = active.kind === 'channel' ? CHANNELS[active.id] : undefined;
  const sortedNicks = useMemo(() => {
    const ops = activeCfg?.ops ?? [];
    return [...active.nicks].sort((a, b) => {
      const ao = ops.includes(a) ? 0 : 1;
      const bo = ops.includes(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }, [active.nicks, activeCfg]);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none">
      <MenuBar menus={menus} windowId={windowId} />

      {/* Toolbar / topic bar */}
      <div className="flex items-center gap-1 px-1 py-[2px] border-b border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)]">
        <span className="px-1 text-[var(--win98-disabled-text)] shrink-0">{SERVER_NAME}:{SERVER_PORT}</span>
        <div className="flex-1 min-w-0 h-[16px] px-1 flex items-center bg-white border border-[var(--win98-button-shadow)] overflow-hidden whitespace-nowrap text-ellipsis">
          <span className="truncate">{active.kind === 'status' ? 'Status Window' : active.topic}</span>
        </div>
      </div>

      {/* Main area: message log + nick list. Every window keeps its own buffer
          mounted (hidden unless active) so each remembers its scroll position. */}
      <div className="flex flex-1 min-h-0">
        <div className="relative flex-1 min-w-0 bg-white">
          {windows.map((w) => (
            <div
              key={w.id}
              hidden={w.id !== activeId}
              className="absolute inset-0 overflow-y-auto text-black leading-[15px] px-1 py-[2px]"
              style={{ fontFamily: 'var(--win98-font-mono)' }}
            >
              {w.lines.map((line) => (
                <IrcLineView key={line.id} line={line} showTime={showTimestamps} selfNick={nick} ops={CHANNELS[w.id]?.ops ?? []} />
              ))}
              {w.id === activeId && <div ref={endRef} />}
            </div>
          ))}
        </div>

        {showNickList && (active.kind === 'channel' || active.kind === 'query') && (
          <div className="w-[110px] shrink-0 border-l border-[var(--win98-button-shadow)] bg-white overflow-y-auto" style={{ fontFamily: 'var(--win98-font-mono)' }}>
            <div className="px-1 py-[1px] bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] text-[10px] text-[var(--win98-disabled-text)]">
              {sortedNicks.length} users
            </div>
            {sortedNicks.map((n) => {
              const isOp = (activeCfg?.ops ?? []).includes(n);
              return (
                <div
                  key={n}
                  className="px-1 leading-[15px] whitespace-nowrap cursor-default hover:bg-[var(--win98-highlight)] hover:text-white"
                  onDoubleClick={() => openQuery(n)}
                  title="Double-click to open a private message"
                >
                  <span className="text-[var(--win98-disabled-text)]">{isOp ? '@' : ' '}</span>
                  <span style={{ color: nickColor(n) }}>{n}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Kicked banner */}
      {active.kind === 'channel' && active.kicked && (
        <div className="px-2 py-[2px] bg-[#ffffe1] border-t border-[var(--win98-button-shadow)] text-[#800000]">
          You were kicked from {active.id}. Type <b>/join {active.id}</b> to rejoin.
        </div>
      )}

      {/* Input line */}
      <div className="flex items-center gap-1 px-1 py-[3px] border-t border-[var(--win98-button-highlight)] bg-[var(--win98-button-face)]">
        <span className="px-1 shrink-0" style={{ color: nickColor(nick), fontFamily: 'var(--win98-font-mono)' }}>{nick}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
          }}
          className="flex-1 min-w-0 h-[18px] px-1 bg-white border border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] outline-none"
          style={{ fontFamily: 'var(--win98-font-mono)' }}
          placeholder="Type a message, or a command like /join #chat"
          aria-label="mIRC message input"
        />
      </div>

      {/* Switchbar (status + open windows) */}
      <div className="flex items-stretch gap-[2px] px-1 py-[2px] border-t border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)] overflow-x-auto">
        {windows.map((w) => (
          <button
            key={w.id}
            onClick={() => { setActiveId(w.id); setWindows((prev) => prev.map((x) => (x.id === w.id ? { ...x, unread: 0 } : x))); }}
            className={cn(
              'px-2 py-[1px] whitespace-nowrap border cursor-default max-w-[130px] truncate',
              w.id === activeId
                ? 'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] bg-white'
                : 'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-shadow)] border-r-[var(--win98-button-shadow)]',
              w.kind === 'channel' && !w.joined && 'text-[var(--win98-disabled-text)] italic',
            )}
            title={w.id}
          >
            {w.id === STATUS_ID ? SERVER_NAME.split('.')[1] ?? 'Status' : w.id}
            {w.unread > 0 && <span className="ml-1 text-[#800000]">({w.unread})</span>}
          </button>
        ))}
      </div>

      {showAbout && <AboutMirc onClose={() => setShowAbout(false)} />}
    </div>
  );
}

// --- a single log line ------------------------------------------------------

function IrcLineView({ line, showTime, selfNick, ops }: { line: IrcLine; showTime: boolean; selfNick: string; ops: string[] }) {
  const time = showTime ? <span className="text-[var(--win98-disabled-text)]">{line.time} </span> : null;
  if (line.kind === 'message') {
    const isOp = line.from ? ops.includes(line.from) : false;
    return (
      <div className="whitespace-pre-wrap break-words">
        {time}
        <span style={{ color: nickColor(line.from ?? '') }}>
          &lt;{isOp ? '@' : ''}{line.from}&gt;
        </span>{' '}
        <span className={cn(line.from === selfNick && 'text-black')}>{line.text}</span>
      </div>
    );
  }
  if (line.kind === 'action') {
    return (
      <div className="whitespace-pre-wrap break-words italic" style={{ color: nickColor(line.from ?? '') }}>
        {time}* {line.from} {line.text}
      </div>
    );
  }
  if (line.kind === 'error') {
    return <div className="whitespace-pre-wrap break-words text-[#c00000]">{time}{line.text}</div>;
  }
  if (line.kind === 'notice') {
    return <div className="whitespace-pre-wrap break-words text-[#000080]">{time}{line.text}</div>;
  }
  // system / motd
  return (
    <div className={cn('whitespace-pre-wrap break-words', line.kind === 'motd' ? 'text-[#606060]' : 'text-[#008000]')}>
      {line.kind === 'system' && time}
      {line.text}
    </div>
  );
}

// --- About mIRC -------------------------------------------------------------

function AboutMirc({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/30" onMouseDown={onClose}>
      <div
        className="w-[300px] bg-[var(--win98-button-face)] border-2 border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[2px_2px_6px_rgba(0,0,0,0.4)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between h-[18px] px-1 bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white">
          <span className="font-bold">About mIRC</span>
          <button onClick={onClose} className="w-[16px] h-[14px] leading-none bg-[var(--win98-button-face)] text-black border border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] text-[10px]">×</button>
        </div>
        <div className="p-3 text-center">
          <div className="text-[18px] font-bold text-[#000080] mb-1" style={{ fontFamily: 'var(--win98-font-mono)' }}>mIRC v5.7</div>
          <div className="mb-2 text-[var(--win98-disabled-text)]">Internet Relay Chat client</div>
          <div className="text-left leading-[15px] mb-3">
            A little program that connects a lonely modem to a whole planet of
            people typing at once. Somewhere out there the author is still awake,
            still tweaking the code, still wondering if anyone reads the About box.
            <br /><br />
            <i>Just where is the author, anyway? Probably in a channel you have not
            found yet, lurking, waiting for you to say hi.</i>
            <br /><br />
            This copy is unregistered. It will nag you politely, forever, and you
            will love it anyway.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-[2px] bg-[var(--win98-button-face)] border border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
