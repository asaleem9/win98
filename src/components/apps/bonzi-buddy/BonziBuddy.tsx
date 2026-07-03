'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { Input98 } from '@/components/ui/Input98';
import { FACTS, JOKES, nextCycleIndex, buildWindowComment } from './bonziLogic';

const adMessages = [
  "CONGRATULATIONS! You're the 1,000,000th visitor! Click HERE to claim your prize!",
  "FREE VACATION TO THE BAHAMAS! Just enter your credit card to confirm!",
  "HOT SINGLES IN YOUR AREA want to meet you! Click NOW!",
  "You have WON a FREE iPod Nano! Claim before midnight!",
  "WARNING: Your computer may be INFECTED! Download our FREE scanner!",
  "Make $5,000/week working from HOME! Doctors HATE this trick!",
  "URGENT: Your AOL account will be SUSPENDED! Verify your password NOW!",
];

const MAX_AD_RESPAWNS = 3;
const IDLE_ANIMATIONS = ['bonzi-wave', 'bonzi-backflip'] as const;

const menuButtonClass =
  'px-3 py-1 bg-[var(--win98-button-face)] text-black text-[11px] cursor-default border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]';

function PopupAd({ message, onClose, style }: { message: string; onClose: () => void; style: React.CSSProperties }) {
  return (
    <div
      className="fixed z-[9999] bg-white border-2 border-solid border-[var(--win98-button-dark-shadow)] shadow-lg"
      style={{ width: 280, ...style }}
    >
      <div className="flex items-center justify-between px-1 py-[2px] bg-[var(--win98-active-title)] text-white">
        <span className="text-[11px] font-[family-name:var(--win98-font)]">Special Offer!!!</span>
        <button
          onClick={onClose}
          className="w-[14px] h-[14px] text-[9px] leading-none flex items-center justify-center bg-[var(--win98-button-face)] text-black border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
        >
          x
        </button>
      </div>
      <div className="p-3 font-[family-name:var(--win98-font)] text-[11px]">
        <div className="text-center">
          <div className="text-[16px] font-bold text-red-600 animate-pulse mb-2">★ WINNER! ★</div>
          <p className="mb-2">{message}</p>
          <button className="px-4 py-1 bg-red-600 text-white font-bold text-[12px] border-none cursor-pointer animate-pulse">
            CLICK HERE!!!
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BonziBuddy({ windowId }: AppComponentProps) {
  const { windows, openWindow } = useWindows();

  const factIndex = useRef(0);
  const jokeIndex = useRef(0);
  const [speech, setSpeech] = useState<string>(FACTS[0]);
  const [punchlinePending, setPunchlinePending] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [popups, setPopups] = useState<Array<{ id: number; message: string; style: React.CSSProperties }>>([]);
  const [nextId, setNextId] = useState(0);
  const adRespawnCount = useRef(0);
  const [sulking, setSulking] = useState(false);

  const [animation, setAnimation] = useState<string | null>(null);

  const punchlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Idle animation loop — every so often Bonzi waves or attempts a backflip.
  useEffect(() => {
    const interval = setInterval(() => {
      const pick = IDLE_ANIMATIONS[Math.floor(Math.random() * IDLE_ANIMATIONS.length)];
      setAnimation(pick);
      setTimeout(() => setAnimation(null), 1200);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Every so often, comment on whichever other app windows happen to be open.
  useEffect(() => {
    const interval = setInterval(() => {
      const titles = windows.map((w) => w.title);
      const randomIndex = Math.floor(Math.random() * Math.max(titles.length, 1));
      const comment = buildWindowComment(titles, randomIndex);
      if (comment) setSpeech(comment);
    }, 9000);
    return () => clearInterval(interval);
  }, [windows]);

  useEffect(() => {
    return () => {
      if (punchlineTimer.current) clearTimeout(punchlineTimer.current);
    };
  }, []);

  const talk = useCallback(() => {
    factIndex.current = nextCycleIndex(factIndex.current, FACTS.length);
    setSpeech(FACTS[factIndex.current]);
    setPunchlinePending(false);
  }, []);

  const tellJoke = useCallback(() => {
    if (punchlineTimer.current) clearTimeout(punchlineTimer.current);
    jokeIndex.current = nextCycleIndex(jokeIndex.current, JOKES.length);
    const joke = JOKES[jokeIndex.current];
    setSpeech(joke.setup);
    setPunchlinePending(true);
    punchlineTimer.current = setTimeout(() => {
      setSpeech(joke.punchline);
      setPunchlinePending(false);
    }, 1800);
  }, []);

  const submitSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      openWindow('ie5', { launchParams: { url: 'www.bonzi.com/search' } });
      setSearchOpen(false);
      setSearchQuery('');
    },
    [openWindow],
  );

  const spawnAd = useCallback(() => {
    if (sulking) return;
    const id = nextId;
    setPopups((prev) => [
      ...prev,
      {
        id,
        message: adMessages[Math.floor(Math.random() * adMessages.length)],
        style: { top: Math.random() * 200 + 50, left: Math.random() * 300 + 50 },
      },
    ]);
    setNextId((prev) => prev + 1);
  }, [nextId, sulking]);

  const closePopup = useCallback(
    (id: number) => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
      adRespawnCount.current += 1;
      if (adRespawnCount.current > MAX_AD_RESPAWNS) {
        setSulking(true);
        setSpeech("Fine. FINE. I'll just sit here quietly then.");
      } else {
        spawnAd();
      }
    },
    [spawnAd],
  );

  const animationClass =
    animation === 'bonzi-wave'
      ? 'animate-[bonzi-wave_1.2s_ease-in-out]'
      : animation === 'bonzi-backflip'
        ? 'animate-[bonzi-backflip_1.2s_ease-in-out]'
        : '';

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#9966CC] to-[#663399] font-[family-name:var(--win98-font)] text-[11px] relative overflow-hidden">
      <style>{`
        @keyframes bonzi-wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-12deg); }
          50% { transform: rotate(10deg); }
          75% { transform: rotate(-6deg); }
        }
        @keyframes bonzi-backflip {
          0% { transform: rotate(0deg) translateY(0); }
          40% { transform: rotate(180deg) translateY(-20px); }
          70% { transform: rotate(340deg) translateY(-4px); }
          100% { transform: rotate(360deg) translateY(0); }
        }
      `}</style>

      {popups.map((popup) => (
        <PopupAd key={popup.id} message={popup.message} onClose={() => closePopup(popup.id)} style={popup.style} />
      ))}

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="relative mb-4">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white border-2 border-black rounded-lg px-3 py-2 min-w-[200px] max-w-[240px] text-center">
            <div className="text-[12px] text-black">{speech}</div>
            <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-black" />
          </div>

          <div
            className={`w-[100px] h-[100px] bg-[#7B2FBE] rounded-full flex items-center justify-center text-[60px] border-4 border-[#5A1F8E] shadow-lg ${animationClass}`}
          >
            {sulking ? '🙈' : '🦍'}
          </div>
        </div>

        <div className="text-white font-bold text-[14px] mb-4 drop-shadow-md">BonziBUDDY</div>

        {searchOpen ? (
          <form onSubmit={submitSearch} className="flex flex-col gap-2 w-[200px]">
            <Input98
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask me anything..."
            />
            <div className="flex gap-2">
              <button type="submit" className={menuButtonClass + ' flex-1'}>
                Go
              </button>
              <button type="button" onClick={() => setSearchOpen(false)} className={menuButtonClass + ' flex-1'}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2 w-[200px]">
            <button onClick={talk} className={menuButtonClass} disabled={punchlinePending}>
              Talk to Bonzi!
            </button>
            <button onClick={tellJoke} className={menuButtonClass} disabled={punchlinePending}>
              Tell me a joke!
            </button>
            <button onClick={() => setSearchOpen(true)} className={menuButtonClass}>
              Search the web
            </button>
            <button onClick={spawnAd} className={menuButtonClass}>
              Show me an offer
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-purple-200 pb-2">BonziBUDDY v4.0 - Your Internet Friend!</div>
    </div>
  );
}
