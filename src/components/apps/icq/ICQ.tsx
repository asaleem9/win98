'use client';

// ICQ 99 — the cameo. A flower-topped buddy list with a UIN of your own, a
// clutch of period contacts whose presence drifts as you watch, little message
// windows with canned personalities, and the immortal "Find Random Chat
// Partner!" roulette that always lands you on SmoothTalker_2000. The unmistakable
// "uh-oh!" sounds whenever a message lands. Reply/status logic lives in logic.ts;
// the two-note chime in uhoh.ts. This file is just the window dressing.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { cn } from '@/lib/cn';
import {
  INITIAL_CONTACTS,
  STATUS_META,
  MY_STATUS_CHOICES,
  MY_UIN,
  RANDOM_CHAT_PARTNER,
  RANDOM_CHAT_CONNECT_MSG,
  type Contact,
  type ICQStatus,
} from './contacts';
import { cycleStatus, replyForTurn, smoothTalkerLine, isOnlineGroup } from './logic';
import { playUhOh } from './uhoh';

const CONTACTS_BY_UIN: Record<string, Contact> = Object.fromEntries(
  INITIAL_CONTACTS.map((c) => [c.uin, c]),
);

const REPLY_DELAY_MS = 900;
const RANDOM_ID = 'random';

interface Message {
  id: number;
  from: 'me' | 'them' | 'sys';
  text: string;
}

interface Convo {
  id: string; // a contact uin, or RANDOM_ID
  uin: string;
  nick: string;
  kind: 'contact' | 'random';
  messages: Message[];
  turn: number; // next line index for the reply engine
}

let msgSeq = 1;
const nextMsgId = () => msgSeq++;

// ---------------------------------------------------------------------------
// The ICQ flower — green for online, tinted by the contact's presence colour.
// ---------------------------------------------------------------------------

function Flower({ color, size = 15 }: { color: string; size?: number }) {
  const petals = [0, 72, 144, 216, 288];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      {petals.map((a) => {
        const rad = (a * Math.PI) / 180;
        const cx = 12 + Math.cos(rad) * 5.6;
        const cy = 12 + Math.sin(rad) * 5.6;
        return (
          <ellipse
            key={a}
            cx={cx}
            cy={cy}
            rx={4.4}
            ry={2.9}
            fill={color}
            stroke="rgba(0,0,0,0.28)"
            strokeWidth="0.5"
            transform={`rotate(${a} ${cx} ${cy})`}
          />
        );
      })}
      <circle cx="12" cy="12" r="3.3" fill="#ffd23f" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// A single floating message window, draggable by its title bar.
// ---------------------------------------------------------------------------

function MessageWindow({
  convo,
  status,
  zIndex,
  initialX,
  initialY,
  onSend,
  onClose,
  onFocus,
}: {
  convo: Convo;
  status: ICQStatus;
  zIndex: number;
  initialX: number;
  initialY: number;
  onSend: (id: string, text: string) => void;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
}) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const meta = STATUS_META[status];

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [convo.messages.length]);

  const onPointerDown = (e: React.PointerEvent) => {
    onFocus(convo.id);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    onSend(convo.id, t);
    setDraft('');
  };

  return (
    <div
      className="absolute w-[276px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[3px_3px_8px_rgba(0,0,0,0.35)] flex flex-col"
      style={{ left: pos.x, top: pos.y, zIndex }}
      onMouseDown={() => onFocus(convo.id)}
    >
      {/* title bar */}
      <div
        className="flex items-center justify-between px-1 py-[2px] cursor-move select-none text-white text-[11px] font-bold"
        style={{ background: 'linear-gradient(90deg, #0a6e2e, #37b24d)' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="flex items-center gap-1 truncate">
          <Flower color={meta.color} size={13} /> {convo.nick}
        </span>
        <button
          onClick={() => onClose(convo.id)}
          aria-label="Close message window"
          className="px-[5px] leading-none bg-[var(--win98-button-face)] text-black border border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
        >
          &times;
        </button>
      </div>

      {/* who + status */}
      <div className="px-2 py-[3px] text-[10px] text-[#555] border-b border-[var(--win98-button-shadow)] bg-white">
        {convo.uin} &bull; <span style={{ color: meta.color }}>{meta.label}</span>
      </div>

      {/* transcript */}
      <div
        ref={logRef}
        className="h-[150px] overflow-y-auto bg-white p-2 text-[11px] leading-snug border-b border-[var(--win98-button-shadow)]"
      >
        {convo.messages.map((m) =>
          m.from === 'sys' ? (
            <div key={m.id} className="text-center text-[10px] italic text-[#888] my-1">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="mb-1">
              <span className={cn('font-bold', m.from === 'me' ? 'text-[#0a4a9a]' : 'text-[#0a6e2e]')}>
                {m.from === 'me' ? 'You' : convo.nick}:
              </span>{' '}
              <span className="text-[#1a1a1a]">{m.text}</span>
            </div>
          ),
        )}
      </div>

      {/* composer */}
      <div className="flex items-end gap-1 p-1">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message..."
          aria-label={`Message to ${convo.nick}`}
          className="flex-1 h-[38px] resize-none px-1 py-[2px] text-[11px] bg-white outline-none border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]"
        />
        <button
          onClick={send}
          className="min-w-[48px] px-2 py-[4px] text-[11px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)] cursor-pointer"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main window
// ---------------------------------------------------------------------------

export default function ICQ({ windowId }: AppComponentProps) {
  const { closeWindow } = useWindows();

  const [myStatus, setMyStatus] = useState<ICQStatus>('online');
  const [contacts, setContacts] = useState<Contact[]>(() => INITIAL_CONTACTS.map((c) => ({ ...c })));
  const [convos, setConvos] = useState<Convo[]>([]);
  const [statusMenu, setStatusMenu] = useState(false);
  const [mainMenu, setMainMenu] = useState(false);
  const [about, setAbout] = useState(false);

  const myMeta = STATUS_META[myStatus];

  // Contacts drift between presence states, so the list feels alive.
  useEffect(() => {
    const id = setInterval(() => {
      setContacts((cs) => {
        if (cs.length === 0) return cs;
        const pick = Math.floor(Math.random() * cs.length);
        return cs.map((c, i) =>
          i === pick ? { ...c, status: cycleStatus(c.status, Math.random) } : c,
        );
      });
    }, 7000);
    return () => clearInterval(id);
  }, []);

  const bringToFront = useCallback((id: string) => {
    setConvos((cs) => {
      const found = cs.find((c) => c.id === id);
      if (!found) return cs;
      return [...cs.filter((c) => c.id !== id), found];
    });
  }, []);

  const openContact = useCallback(
    (uin: string) => {
      const contact = CONTACTS_BY_UIN[uin];
      if (!contact) return;
      setConvos((cs) => {
        if (cs.some((c) => c.id === uin)) {
          const found = cs.find((c) => c.id === uin)!;
          return [...cs.filter((c) => c.id !== uin), found];
        }
        const convo: Convo = {
          id: uin,
          uin,
          nick: contact.nick,
          kind: 'contact',
          messages: contact.awayMessage
            ? [{ id: nextMsgId(), from: 'sys', text: `Away message: ${contact.awayMessage}` }]
            : [],
          turn: 0,
        };
        return [...cs, convo];
      });
    },
    [],
  );

  const openRandom = useCallback(() => {
    setConvos((cs) => {
      if (cs.some((c) => c.id === RANDOM_ID)) {
        const found = cs.find((c) => c.id === RANDOM_ID)!;
        return [...cs.filter((c) => c.id !== RANDOM_ID), found];
      }
      const convo: Convo = {
        id: RANDOM_ID,
        uin: 'Random UIN',
        nick: RANDOM_CHAT_PARTNER,
        kind: 'random',
        messages: [
          { id: nextMsgId(), from: 'sys', text: RANDOM_CHAT_CONNECT_MSG },
          { id: nextMsgId(), from: 'them', text: smoothTalkerLine(0) },
        ],
        turn: 1,
      };
      return [...cs, convo];
    });
    playUhOh();
  }, []);

  const closeConvo = useCallback((id: string) => {
    setConvos((cs) => cs.filter((c) => c.id !== id));
  }, []);

  // Send a message and schedule the partner's canned reply.
  const sendMessage = useCallback((id: string, text: string) => {
    let replyText: string | null = null;
    setConvos((cs) =>
      cs.map((c) => {
        if (c.id !== id) return c;
        const t = c.turn;
        replyText =
          c.kind === 'random' ? smoothTalkerLine(t) : replyForTurn(CONTACTS_BY_UIN[c.uin], t);
        return {
          ...c,
          turn: t + 1,
          messages: [...c.messages, { id: nextMsgId(), from: 'me', text }],
        };
      }),
    );
    if (replyText === null) return;
    const reply = replyText;
    setTimeout(() => {
      setConvos((cs) =>
        cs.map((c) =>
          c.id === id
            ? { ...c, messages: [...c.messages, { id: nextMsgId(), from: 'them', text: reply }] }
            : c,
        ),
      );
      playUhOh();
    }, REPLY_DELAY_MS);
  }, []);

  const online = useMemo(() => contacts.filter((c) => isOnlineGroup(c.status)), [contacts]);
  const away = useMemo(() => contacts.filter((c) => !isOnlineGroup(c.status)), [contacts]);

  const chooseStatus = (s: ICQStatus) => {
    setMyStatus(s);
    setStatusMenu(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] relative overflow-hidden select-none">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-2 py-[5px] text-white"
        style={{ background: 'linear-gradient(90deg, #0a6e2e 0%, #1f9d4a 55%, #37b24d 100%)' }}
      >
        <Flower color="#ffffff" size={22} />
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-wide">ICQ</div>
          <div className="text-[9px] text-[#d6f5df]">Uh-oh!</div>
        </div>
      </div>

      {/* Your presence */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#eaf7ee] border-b border-[var(--win98-button-shadow)]">
        <span className="flex items-center gap-1 text-[11px]">
          <Flower color={myMeta.color} size={14} />
          <span className="font-bold text-[#0a4a1e]">{MY_UIN}</span>
        </span>
        <button
          onClick={() => setStatusMenu((v) => !v)}
          className="flex items-center gap-1 px-2 py-[1px] text-[10px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] cursor-pointer"
          title="Change your status"
        >
          <span style={{ color: myMeta.color }}>&#10047;</span> {myMeta.label} &#9662;
        </button>
      </div>

      {/* Contact list */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white m-1 border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
        <ContactGroup label={`Online (${online.length})`} contacts={online} onOpen={openContact} />
        <ContactGroup label={`Away (${away.length})`} contacts={away} onOpen={openContact} />
      </div>

      {/* Roulette + main menu */}
      <div className="px-1 pb-1 flex flex-col gap-1">
        <button
          onClick={openRandom}
          className="w-full py-[3px] text-[11px] font-bold text-[#0a4a1e] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)] cursor-pointer"
        >
          &#127800; Find Random Chat Partner!
        </button>
        <div className="relative">
          <button
            onClick={() => setMainMenu((v) => !v)}
            className="flex items-center gap-1 px-2 py-[2px] text-[11px] font-bold text-white cursor-pointer"
            style={{ background: 'linear-gradient(90deg, #0a6e2e, #37b24d)' }}
          >
            <span aria-hidden>&#10047;</span> ICQ &#9652;
          </button>
          {mainMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMainMenu(false)} />
              <div className="absolute bottom-full left-0 z-50 mb-[1px] w-[188px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[2px_2px_5px_rgba(0,0,0,0.35)] py-[2px]">
                <MenuItem
                  onClick={() => {
                    setMainMenu(false);
                    openRandom();
                  }}
                >
                  Find Random Chat Partner!
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setMainMenu(false);
                    setAbout(true);
                  }}
                >
                  About ICQ...
                </MenuItem>
                <div className="h-[1px] bg-[var(--win98-button-shadow)] my-[2px] mx-1" />
                <MenuItem
                  onClick={() => {
                    setMainMenu(false);
                    closeWindow(windowId);
                  }}
                >
                  Exit
                </MenuItem>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status flower menu */}
      {statusMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setStatusMenu(false)} />
          <div className="absolute right-1 top-[64px] z-50 w-[168px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[2px_2px_5px_rgba(0,0,0,0.35)] py-[2px]">
            {MY_STATUS_CHOICES.map((s) => {
              const meta = STATUS_META[s];
              return (
                <button
                  key={s}
                  onClick={() => chooseStatus(s)}
                  title={meta.blurb}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-[3px] text-[11px] text-left hover:bg-[#000080] hover:text-white cursor-pointer',
                    s === myStatus && 'font-bold',
                  )}
                >
                  <span style={{ color: meta.color }}>&#10047;</span> {meta.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Floating message windows, cascaded as they open */}
      {convos.map((c, i) => (
        <MessageWindow
          key={c.id}
          convo={c}
          status={
            c.kind === 'random' ? 'ffc' : contacts.find((x) => x.uin === c.uin)?.status ?? 'online'
          }
          zIndex={10 + i}
          initialX={18 + i * 22}
          initialY={40 + i * 24}
          onSend={sendMessage}
          onClose={closeConvo}
          onFocus={bringToFront}
        />
      ))}

      {about && <AboutDialog onClose={() => setAbout(false)} />}
    </div>
  );
}

function ContactGroup({
  label,
  contacts,
  onOpen,
}: {
  label: string;
  contacts: Contact[];
  onOpen: (uin: string) => void;
}) {
  return (
    <div>
      <div className="px-2 py-[2px] text-[10px] font-bold text-[#0a4a1e] bg-[#dff0e4] border-b border-[#c0d8c8]">
        {label}
      </div>
      {contacts.length === 0 ? (
        <div className="px-2 py-1 text-[10px] italic text-[#999]">Nobody here right now.</div>
      ) : (
        contacts.map((c) => {
          const meta = STATUS_META[c.status];
          return (
            <button
              key={c.uin}
              onDoubleClick={() => onOpen(c.uin)}
              title={`${c.nick} — ${meta.label}. Double-click to message.`}
              className="w-full flex items-center gap-2 px-2 py-[3px] text-left text-[11px] hover:bg-[#dbeee1] focus:bg-[#dbeee1] cursor-pointer"
            >
              <Flower color={meta.color} size={14} />
              <span className="truncate text-[#1a1a1a]">{c.nick}</span>
              <span className="ml-auto text-[9px] text-[#888]">{meta.label}</span>
            </button>
          );
        })
      )}
    </div>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-[3px] text-[11px] hover:bg-[#000080] hover:text-white cursor-pointer"
    >
      {children}
    </button>
  );
}

function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-[260px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[3px_3px_8px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="text-white text-[11px] font-bold px-2 py-1 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, #0a6e2e, #37b24d)' }}
        >
          <span>About ICQ</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="px-[6px] bg-[var(--win98-button-face)] text-black border border-[#808080] leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-4 text-center">
          <div className="flex justify-center mb-1">
            <Flower color="#37b24d" size={44} />
          </div>
          <div className="text-[18px] font-bold text-[#0a4a1e]">ICQ 99a</div>
          <div className="text-[10px] text-[#555] italic">&ldquo;I Seek You&rdquo;</div>
        </div>
        <div className="px-4 pb-2 text-[11px] leading-relaxed">
          <p className="mb-2">Your UIN: <span className="font-bold">{MY_UIN}</span></p>
          <p className="text-[10px] text-[#444]">
            The pager for the Internet age. Send a message and wait for that little
            &ldquo;uh-oh!&rdquo; to come back. Now with {INITIAL_CONTACTS.length} contacts on your list.
          </p>
        </div>
        <div className="flex justify-center pb-3">
          <button
            onClick={onClose}
            className="min-w-[70px] px-3 py-[2px] text-[11px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)] cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
