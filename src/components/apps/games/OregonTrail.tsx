'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import { Button98 } from '@/components/ui/Button98';
import { cn } from '@/lib/cn';
import { useGameLoop } from './engine/loop';
import { makeRng, pick } from './engine/rng';
import {
  Cart,
  GameState,
  Pace,
  Rations,
  Profession,
  RiverMethod,
  Tombstone,
  PRICES,
  HUNT_BAG_CAP,
  FERRY_COST,
  professionCash,
  computeStoreTotal,
  remainingCash,
  canAfford,
  initialState,
  travel,
  resolveRiver,
  riverDepth,
  resolveHunt,
  animalMeat,
  computeScore,
  formatDate,
  makeTombstone,
  nextLandmark,
  aliveCount,
} from './engine/oregon';

type Screen = 'start' | 'store' | 'trail' | 'hunt' | 'end';

const PROFESSIONS: { id: Profession; label: string; cash: number; desc: string }[] = [
  { id: 'banker', label: 'Banker from Boston', cash: 1600, desc: 'Easiest — most cash, 1x score' },
  { id: 'carpenter', label: 'Carpenter from Ohio', cash: 800, desc: 'Medium — 2x score' },
  { id: 'farmer', label: 'Farmer from Illinois', cash: 400, desc: 'Hardest — least cash, 3x score' },
];

const PACES: Pace[] = ['steady', 'strenuous', 'grueling'];
const RATIONS: Rations[] = ['filling', 'meager', 'bare-bones'];

const EPITAPHS = [
  'Should have packed more food.',
  'The river won.',
  'Bit by more than the trail.',
  'Gone but not forgotten.',
  'Here lies a weary pioneer.',
  'Dysentery: 1, Pioneer: 0.',
];

interface Animal {
  id: number;
  x: number;
  y: number;
  vx: number;
  kind: 'buffalo' | 'deer' | 'rabbit' | 'bird';
  w: number;
  h: number;
  dead: boolean;
}

const ANIMAL_GLYPH: Record<Animal['kind'], string> = {
  buffalo: '🐂',
  deer: '🦌',
  rabbit: '🐇',
  bird: '🐦',
};

const HUNT_SECONDS = 12;
const HUNT_W = 460;
const HUNT_H = 220;

export default function OregonTrail({ windowId }: AppComponentProps) {
  void windowId;
  const { getAppPref, setAppPref } = useSettings();

  const [screen, setScreen] = useState<Screen>('start');
  const [game, setGame] = useState<GameState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [leader, setLeader] = useState('Emmett');

  // A persistent RNG for live play, created lazily (never during render body math).
  const rngRef = useRef<(() => number) | null>(null);
  const getRng = useCallback(() => {
    if (!rngRef.current) rngRef.current = makeRng((Math.floor(Math.random() * 1e9) >>> 0) || 1);
    return rngRef.current;
  }, []);

  // ---- persistence ----------------------------------------------------------
  const highScore = getAppPref<number>('oregon-trail', 'highScore', 0);
  const tombstone = getAppPref<Tombstone | null>('oregon-trail', 'tombstone', null);

  const addLog = useCallback((lines: string[]) => {
    if (!lines.length) return;
    setLog((prev) => [...prev, ...lines].slice(-80));
  }, []);

  // ---- store state ----------------------------------------------------------
  const [profession, setProfession] = useState<Profession>('banker');
  const [cart, setCart] = useState<Cart>({ oxen: 4, food: 400, ammo: 5, clothing: 3, parts: 2 });

  const startTitle = useCallback(() => {
    playSound('chord');
    setProfession('banker');
    setCart({ oxen: 4, food: 400, ammo: 5, clothing: 3, parts: 2 });
    setScreen('store');
  }, []);

  const beginJourney = useCallback(() => {
    if (!canAfford(profession, cart)) {
      playSound('error');
      return;
    }
    if (cart.oxen < 1) {
      playSound('error');
      return;
    }
    const g = initialState(profession, cart, [leader, 'Charles', 'Hannah', 'Willie', 'Ada']);
    setGame(g);
    setLog([`${formatDate(0)} — departing Independence, Missouri.`, 'The trail west begins.']);
    setScreen('trail');
    playSound('ding');
  }, [profession, cart, leader]);

  // ---- trail actions --------------------------------------------------------
  const [river, setRiver] = useState<{ depth: number } | null>(null);

  // Apply a resolved state + log lines, then handle river / death / victory
  // transitions right here (no setState-in-effect cascades).
  const commit = useCallback(
    (next: GameState, events: string[]) => {
      setGame(next);
      addLog(events);
      if (next.status === 'atRiver') {
        setRiver({ depth: riverDepth(getRng()) });
        playSound('exclamation');
      } else if (next.status === 'dead') {
        const epitaph = pick(getRng(), EPITAPHS);
        setAppPref('oregon-trail', 'tombstone', makeTombstone(next, leader, epitaph));
        setScreen('end');
        playSound('error');
      } else if (next.status === 'arrived') {
        const score = computeScore(next);
        if (score > highScore) setAppPref('oregon-trail', 'highScore', score);
        setScreen('end');
        playSound('cardWin');
      }
    },
    [addLog, getRng, leader, setAppPref, highScore],
  );

  const onTravel = useCallback(() => {
    if (!game || game.status !== 'traveling') return;
    const { state, events } = travel(game, getRng(), 6);
    commit(state, events.length ? events : [`Rolling on… day ${state.day}, mile ${state.miles}.`]);
  }, [game, getRng, commit]);

  const setPace = useCallback((p: Pace) => setGame((g) => (g ? { ...g, pace: p } : g)), []);
  const setRations = useCallback((r: Rations) => setGame((g) => (g ? { ...g, rations: r } : g)), []);

  const crossRiver = useCallback(
    (method: RiverMethod) => {
      if (!game || game.status !== 'atRiver' || !river) return;
      const { state, events } = resolveRiver(game, method, river.depth, getRng());
      setRiver(null);
      commit(state, events);
    },
    [game, river, getRng, commit],
  );

  const restart = useCallback(() => {
    setGame(null);
    setLog([]);
    setRiver(null);
    setScreen('start');
  }, []);

  // ===========================================================================
  // HUNTING MINIGAME
  // ===========================================================================
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animalsRef = useRef<Animal[]>([]);
  const nextIdRef = useRef(1);
  const [huntTime, setHuntTime] = useState(HUNT_SECONDS);
  const [huntBag, setHuntBag] = useState(0);
  const [huntShots, setHuntShots] = useState(0);
  const huntActiveRef = useRef(false);
  const huntTimeRef = useRef(HUNT_SECONDS);
  const huntBagRef = useRef(0);
  const huntShotsRef = useRef(0);
  const finishHuntRef = useRef<() => void>(() => {});

  const startHunt = useCallback(() => {
    if (!game) return;
    if (game.ammo <= 0) {
      playSound('error');
      addLog(['You have no ammunition to hunt with.']);
      return;
    }
    animalsRef.current = [];
    nextIdRef.current = 1;
    huntTimeRef.current = HUNT_SECONDS;
    huntBagRef.current = 0;
    huntShotsRef.current = 0;
    setHuntTime(HUNT_SECONDS);
    setHuntBag(0);
    setHuntShots(0);
    huntActiveRef.current = true;
    setScreen('hunt');
    playSound('ding');
  }, [game, addLog]);

  const spawnRef = useRef(0);
  useGameLoop(
    (dt) => {
      if (!huntActiveRef.current) return;
      // countdown
      huntTimeRef.current = Math.max(0, huntTimeRef.current - dt);
      setHuntTime(huntTimeRef.current);
      if (huntTimeRef.current <= 0) {
        huntActiveRef.current = false;
        finishHuntRef.current();
        return;
      }
      // spawn
      spawnRef.current -= dt;
      if (spawnRef.current <= 0 && animalsRef.current.length < 6) {
        spawnRef.current = 0.6 + Math.random() * 0.9;
        const rng = getRng();
        const kind = pick(rng, ['buffalo', 'deer', 'rabbit', 'bird'] as const);
        const fromLeft = Math.random() < 0.5;
        const size = kind === 'buffalo' ? 46 : kind === 'deer' ? 36 : 26;
        const speed = (kind === 'rabbit' || kind === 'bird' ? 90 : 45) + Math.random() * 40;
        animalsRef.current.push({
          id: nextIdRef.current++,
          x: fromLeft ? -size : HUNT_W + size,
          y: kind === 'bird' ? 20 + Math.random() * 60 : 90 + Math.random() * (HUNT_H - 130),
          vx: fromLeft ? speed : -speed,
          kind,
          w: size,
          h: size,
          dead: false,
        });
      }
      // move
      animalsRef.current = animalsRef.current.filter((a) => {
        a.x += a.vx * dt;
        return a.x > -80 && a.x < HUNT_W + 80;
      });
      // draw
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#0a1f0a';
      ctx.fillRect(0, 0, HUNT_W, HUNT_H);
      ctx.strokeStyle = '#1f5f1f';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, HUNT_W - 2, HUNT_H - 2);
      ctx.fillStyle = '#12401a';
      ctx.fillRect(0, HUNT_H - 40, HUNT_W, 40);
      ctx.font = '30px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const a of animalsRef.current) {
        ctx.font = `${a.w}px serif`;
        ctx.fillText(ANIMAL_GLYPH[a.kind], a.x, a.y);
      }
    },
    screen === 'hunt',
  );

  const shootHunt = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!huntActiveRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * HUNT_W;
      const my = ((e.clientY - rect.top) / rect.height) * HUNT_H;
      huntShotsRef.current += 1;
      setHuntShots(huntShotsRef.current);
      // topmost hit
      const hit = [...animalsRef.current]
        .reverse()
        .find((a) => Math.abs(a.x - mx) < a.w / 2 + 6 && Math.abs(a.y - my) < a.h / 2 + 6);
      if (hit) {
        animalsRef.current = animalsRef.current.filter((a) => a.id !== hit.id);
        huntBagRef.current += animalMeat(hit.kind);
        setHuntBag(huntBagRef.current);
        playSound('ding');
      } else {
        playSound('error');
      }
    },
    [],
  );

  const finishHunt = useCallback(() => {
    if (!game || screen !== 'hunt') return;
    huntActiveRef.current = false;
    const { state, events } = resolveHunt(game, huntBagRef.current, huntShotsRef.current);
    setGame(state);
    addLog(events);
    setScreen('trail');
    playSound('chord');
  }, [game, screen, addLog]);

  // Keep the loop's timeout handler pointed at the latest finishHunt closure.
  useEffect(() => {
    finishHuntRef.current = finishHunt;
  }, [finishHunt]);

  // ===========================================================================
  // RENDER
  // ===========================================================================
  const total = useMemo(() => computeStoreTotal(cart), [cart]);
  const left = useMemo(() => remainingCash(profession, cart), [profession, cart]);
  const affordable = left >= 0;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [log]);

  const shell = 'flex flex-col h-full bg-black text-[#33ff33] font-[family-name:monospace] p-3 overflow-hidden';

  return (
    <div className={cn(shell, 'text-[13px]')}>
      {screen === 'start' && (
        <div
          className="flex flex-col items-center justify-center flex-1 gap-3 outline-none"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') startTitle();
          }}
        >
          <pre className="text-center text-[#33ff33] text-[11px] leading-tight">{`
 _____ _            ___                            _____          _ _
|_   _| |__   ___  / _ \\ _ __ ___  __ _  ___  _ _|_   _| __ __ _(_) |
  | | | '_ \\ / _ \\| | | | '__/ _ \\/ _\` |/ _ \\| '_ \\| || '__/ _\` | | |
  | | | | | |  __/| |_| | | |  __/ (_| | (_) | | | | || | | (_| | | |
  |_| |_| |_|\\___| \\___/|_|  \\___|\\__, |\\___/|_| |_|_||_|  \\__,_|_|_|
                                   |___/
          `}</pre>
          <p className="text-[12px]">Independence, Missouri &middot; 1848</p>
          {highScore > 0 && <p className="text-[11px] text-[#ffff66]">Top score: {highScore}</p>}
          {tombstone && (
            <p className="text-[10px] text-[#88ff88] text-center max-w-[80%]">
              Along the way you may pass a grave: here lies {tombstone.name}, {tombstone.miles} mi in.
            </p>
          )}
          <button
            onClick={startTitle}
            className="mt-2 text-[#33ff33] bg-transparent border border-[#33ff33] px-4 py-1 cursor-pointer hover:bg-[#33ff33] hover:text-black"
          >
            Press ENTER to start
          </button>
        </div>
      )}

      {screen === 'store' && (
        <div className="flex flex-col flex-1 overflow-y-auto gap-3">
          <div className="text-center border-b border-[#33ff33] pb-1">MATT&apos;S GENERAL STORE — outfit your wagon</div>

          <div>
            <div className="mb-1 text-[#ffff66]">1. Choose your profession:</div>
            <div className="flex flex-col gap-1">
              {PROFESSIONS.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    'flex items-center gap-2 cursor-pointer px-1',
                    profession === p.id && 'bg-[#0a3a0a]',
                  )}
                >
                  <input
                    type="radio"
                    name="prof"
                    checked={profession === p.id}
                    onChange={() => setProfession(p.id)}
                  />
                  <span className="flex-1">
                    {p.label} — ${p.cash}
                  </span>
                  <span className="text-[10px] text-[#88ff88]">{p.desc}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <span className="text-[#ffff66]">Wagon leader:</span>
              <input
                value={leader}
                maxLength={12}
                onChange={(e) => setLeader(e.target.value.replace(/[^\w '-]/g, ''))}
                className="bg-black border border-[#33ff33] text-[#33ff33] px-1 w-[140px] font-[family-name:monospace] text-[12px] outline-none"
              />
            </label>
          </div>

          <div>
            <div className="mb-1 text-[#ffff66]">2. Buy supplies (cash: ${professionCash(profession)}):</div>
            <div className="flex flex-col gap-1">
              <StoreRow label="Oxen" unit="head" price={PRICES.oxen} step={1} value={cart.oxen} onChange={(v) => setCart((c) => ({ ...c, oxen: v }))} />
              <StoreRow label="Food" unit="lbs" price={PRICES.food} step={50} value={cart.food} onChange={(v) => setCart((c) => ({ ...c, food: v }))} />
              <StoreRow label="Ammunition" unit="boxes" price={PRICES.ammo} step={1} value={cart.ammo} onChange={(v) => setCart((c) => ({ ...c, ammo: v }))} />
              <StoreRow label="Clothing" unit="sets" price={PRICES.clothing} step={1} value={cart.clothing} onChange={(v) => setCart((c) => ({ ...c, clothing: v }))} />
              <StoreRow label="Spare parts" unit="each" price={PRICES.parts} step={1} value={cart.parts} onChange={(v) => setCart((c) => ({ ...c, parts: v }))} />
            </div>
          </div>

          <div className="border-t border-[#33ff33] pt-1 flex justify-between">
            <span>Spent: ${total.toFixed(2)}</span>
            <span className={cn(!affordable && 'text-[#ff5555]')}>Cash left: ${left.toFixed(2)}</span>
          </div>

          <div className="flex gap-2 justify-center pt-1">
            <Button98 onClick={restart}>Back</Button98>
            <Button98 onClick={beginJourney} disabled={!affordable || cart.oxen < 1}>
              Set out on the trail →
            </Button98>
          </div>
        </div>
      )}

      {screen === 'trail' && game && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="border-b border-[#33ff33] pb-1 mb-1 text-[11px]">
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              <span>{formatDate(game.day)}</span>
              <span>Mile {game.miles}/2000</span>
              <span>Health {healthWord(game.health)}</span>
              <span>Party {aliveCount(game)}/{game.members.length}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[#88ff88]">
              <span>🐂 {game.oxen}</span>
              <span>🍖 {game.food} lbs</span>
              <span>🔫 {game.ammo} boxes</span>
              <span>🧥 {game.clothing}</span>
              <span>🔧 {game.parts}</span>
              <span>💵 ${game.cash.toFixed(0)}</span>
            </div>
            <div className="text-[#ffff66]">
              {nextLandmark(game)
                ? `Next: ${nextLandmark(game)!.name} (${nextLandmark(game)!.miles - game.miles} mi)`
                : 'Willamette Valley ahead!'}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto mb-1 text-[12px] leading-snug">
            {log.map((line, i) => (
              <div key={i} className="min-h-[16px]">
                {line}
              </div>
            ))}
            {tombstone && game.miles >= tombstone.miles - 20 && game.miles <= tombstone.miles + 20 && (
              <div className="text-[#88ff88]">⚰ A weathered grave: &ldquo;Here lies {tombstone.name}.&rdquo;</div>
            )}
          </div>

          {game.status === 'atRiver' && river ? (
            <div className="border-t border-[#33ff33] pt-1">
              <p className="text-[#ffff66]">The river is {river.depth} feet deep. How do you cross?</p>
              <div className="flex gap-2 flex-wrap mt-1">
                <Button98 onClick={() => crossRiver('ford')}>Ford it</Button98>
                <Button98 onClick={() => crossRiver('caulk')}>Caulk &amp; float</Button98>
                <Button98 onClick={() => crossRiver('ferry')} disabled={game.cash < FERRY_COST}>
                  Take ferry (${FERRY_COST})
                </Button98>
              </div>
            </div>
          ) : (
            <div className="border-t border-[#33ff33] pt-1 flex flex-col gap-1">
              <div className="flex flex-wrap gap-3 text-[10px]">
                <Segmented label="Pace" options={PACES} value={game.pace} onSelect={setPace} />
                <Segmented label="Rations" options={RATIONS} value={game.rations} onSelect={setRations} />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button98 onClick={onTravel}>Continue on trail</Button98>
                <Button98 onClick={startHunt} disabled={game.ammo <= 0}>
                  Hunt
                </Button98>
              </div>
            </div>
          )}
        </div>
      )}

      {screen === 'hunt' && game && (
        <div className="flex flex-col flex-1 items-center gap-2">
          <div className="flex justify-between w-full text-[11px] text-[#ffff66]">
            <span>Time: {Math.ceil(huntTime)}s</span>
            <span>Bag: {Math.min(HUNT_BAG_CAP, huntBag)}/{HUNT_BAG_CAP} lbs</span>
            <span>Shots: {huntShots}</span>
          </div>
          <canvas
            ref={canvasRef}
            width={HUNT_W}
            height={HUNT_H}
            onClick={shootHunt}
            className="max-w-full cursor-crosshair border border-[#1f5f1f]"
            style={{ aspectRatio: `${HUNT_W} / ${HUNT_H}` }}
          />
          <p className="text-[10px] text-[#88ff88]">
            Click animals to shoot. Buffalo 350, deer 50, rabbit 12, bird 8 lbs. Haul capped at {HUNT_BAG_CAP} lbs.
          </p>
          <Button98 onClick={finishHunt}>Return to wagon</Button98>
        </div>
      )}

      {screen === 'end' && game && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center">
          {game.status === 'arrived' ? (
            <>
              <div className="text-[18px] text-[#ffff66]">★ You reached the Willamette Valley! ★</div>
              <div className="text-[12px]">
                <div>{formatDate(game.day)} — {game.day} days on the trail</div>
                <div>{aliveCount(game)} of {game.members.length} pioneers survived</div>
              </div>
              <div className="text-[16px]">Final score: {computeScore(game)}</div>
              {computeScore(game) >= highScore && <div className="text-[#ffff66]">★ New high score! ★</div>}
            </>
          ) : (
            <>
              <pre className="text-[#cccccc] text-[11px] leading-tight">{`
      .-"""""-.
     /  R I P  \\
    |           |
    | Here lies |
    |  a brave  |
    |  pioneer  |`}</pre>
              <div className="text-[13px]">
                Here lies <span className="text-[#ffff66]">{leader}</span>
              </div>
              <div className="text-[11px] text-[#88ff88]">{game.causeOfDeath}</div>
              <div className="text-[11px] italic">&ldquo;{tombstone?.epitaph}&rdquo;</div>
              <div className="text-[11px]">Made it {game.miles} miles &middot; {formatDate(game.day)}</div>
              <div className="text-[12px]">Score: {computeScore(game)}</div>
            </>
          )}
          <button
            onClick={restart}
            className="mt-2 text-[#33ff33] bg-transparent border border-[#33ff33] px-4 py-1 cursor-pointer hover:bg-[#33ff33] hover:text-black"
          >
            Travel again
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers (no game math here)
// ---------------------------------------------------------------------------

function healthWord(h: number): string {
  if (h >= 80) return 'Good';
  if (h >= 55) return 'Fair';
  if (h >= 30) return 'Poor';
  if (h > 0) return 'Very Poor';
  return 'Dead';
}

function StoreRow({
  label,
  unit,
  price,
  step,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  price: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-[110px]">{label}</span>
      <button
        onClick={() => onChange(Math.max(0, value - step))}
        className="border border-[#33ff33] w-6 hover:bg-[#33ff33] hover:text-black"
        aria-label={`less ${label}`}
      >
        −
      </button>
      <span className="w-[70px] text-right tabular-nums">
        {value} {unit}
      </span>
      <button
        onClick={() => onChange(value + step)}
        className="border border-[#33ff33] w-6 hover:bg-[#33ff33] hover:text-black"
        aria-label={`more ${label}`}
      >
        +
      </button>
      <span className="text-[10px] text-[#88ff88] ml-auto">${price}/{unit.replace(/s$/, '')}</span>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[#88ff88]">{label}:</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onSelect(o)}
          className={cn(
            'px-1 border border-[#1f5f1f] capitalize',
            value === o ? 'bg-[#33ff33] text-black' : 'text-[#33ff33] hover:border-[#33ff33]',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
