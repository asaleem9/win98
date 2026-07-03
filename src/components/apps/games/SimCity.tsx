'use client';

import { useCallback, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';
import { Button98 } from '@/components/ui/Button98';
import { cn } from '@/lib/cn';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import { makeRng, randInt } from './engine/rng';
import { useInterval } from './engine/loop';
import {
  CityState,
  Tool,
  Tile,
  Milestone,
  createCity,
  applyTool,
  tickCity,
  startFire,
  spawnMonster,
  newMilestones,
  cityYear,
  cityMonthName,
  isZone,
  TOOL_COSTS,
} from './engine/simcity';

const GRID_W = 24;
const GRID_H = 18;
const TICK_MS = 1500;

interface ToolDef {
  tool: Tool;
  label: string;
  glyph: string;
  color: string;
}

const TOOLS: ToolDef[] = [
  { tool: 'bulldoze', label: 'Bulldoze', glyph: '✕', color: '#c0392b' },
  { tool: 'road', label: 'Road', glyph: '≡', color: '#555555' },
  { tool: 'power', label: 'Power Line', glyph: '⌁', color: '#f1c40f' },
  { tool: 'residential', label: 'Residential', glyph: '⌂', color: '#2ecc40' },
  { tool: 'commercial', label: 'Commercial', glyph: '$', color: '#0074d9' },
  { tool: 'industrial', label: 'Industrial', glyph: '⚙', color: '#ffcc00' },
  { tool: 'powerplant', label: 'Power Plant', glyph: '⚡', color: '#e67e22' },
];

// Zone tint deepens with development level so growth is visible at a glance.
function tileStyle(t: Tile): { bg: string; fg: string; glyph: string } {
  if (t.fire > 0) return { bg: '#e74c3c', fg: '#fff', glyph: '🔥' };
  switch (t.type) {
    case 'empty':
      return { bg: '#3a7d34', fg: '', glyph: '' };
    case 'rubble':
      return { bg: '#6b6b6b', fg: '#333', glyph: '·' };
    case 'road':
      return { bg: '#4a4a4a', fg: '#bbb', glyph: '' };
    case 'power':
      return { bg: '#8a7a2a', fg: '#ffec8b', glyph: '⌁' };
    case 'powerplant':
      return { bg: '#e67e22', fg: '#000', glyph: '⚡' };
    case 'residential': {
      const shades = ['#a5d6a7', '#81c784', '#66bb6a', '#4caf50', '#43a047', '#2e7d32'];
      return { bg: shades[t.level], fg: '#0b3d0b', glyph: t.level > 0 ? '⌂' : '' };
    }
    case 'commercial': {
      const shades = ['#90caf9', '#64b5f6', '#42a5f5', '#2196f3', '#1e88e5', '#1565c0'];
      return { bg: shades[t.level], fg: '#04233f', glyph: t.level > 0 ? '$' : '' };
    }
    case 'industrial': {
      const shades = ['#fff59d', '#ffee58', '#fdd835', '#fbc02d', '#f9a825', '#f57f17'];
      return { bg: shades[t.level], fg: '#3d2b00', glyph: t.level > 0 ? '⚙' : '' };
    }
    default:
      return { bg: '#3a7d34', fg: '', glyph: '' };
  }
}

function RciBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-3 text-[10px] font-bold" style={{ color }}>
        {label}
      </span>
      <div className="flex-1 h-[10px] bg-black/20 border border-[var(--win98-button-shadow)]">
        <div className="h-full" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

export default function SimCity({ windowId }: AppComponentProps) {
  void windowId;
  const { getAppPref, setAppPref } = useSettings();

  const [started, setStarted] = useState(false);
  const [showCdError, setShowCdError] = useState(false);
  const [city, setCity] = useState<CityState>(() => createCity(GRID_W, GRID_H));
  const [tool, setTool] = useState<Tool>('road');
  const [running, setRunning] = useState(true);
  const [advisor, setAdvisor] = useState<Milestone | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [bestPop, setBestPop] = useState<number>(() => getAppPref<number>('simcity', 'bestPopulation', 0));

  // Stable RNG for the session — seeded once in a lazy initializer.
  const [rng] = useState<() => number>(() => makeRng(Math.floor(Math.random() * 0x7fffffff)));
  const paintingRef = useRef(false);

  const notify = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash((cur) => (cur === msg ? null : cur)), 1400);
  }, []);

  // One simulated month.
  useInterval(
    () => {
      setCity((prev) => {
        const next = tickCity(prev, rng);
        const crossed = newMilestones(prev.population, next.population);
        if (crossed.length) {
          const top = crossed[crossed.length - 1];
          playSound('chord');
          setAdvisor(top);
        }
        if (next.population > 0) {
          setBestPop((b) => {
            if (next.population > b) {
              setAppPref('simcity', 'bestPopulation', next.population);
              return next.population;
            }
            return b;
          });
        }
        return next;
      });
    },
    TICK_MS,
    started && running && !advisor,
  );

  const place = useCallback(
    (x: number, y: number) => {
      setCity((prev) => {
        const res = applyTool(prev.grid, prev.width, prev.height, x, y, tool);
        if (!res.placed) return prev;
        if (prev.cash < res.cost) {
          playSound('error');
          notify('Insufficient funds!');
          return prev;
        }
        playSound('ding');
        return { ...prev, grid: res.grid, cash: prev.cash - res.cost };
      });
    },
    [tool, notify],
  );

  const handleDown = useCallback(
    (x: number, y: number) => {
      paintingRef.current = true;
      place(x, y);
    },
    [place],
  );
  const handleEnter = useCallback(
    (x: number, y: number) => {
      if (paintingRef.current) place(x, y);
    },
    [place],
  );
  const stopPaint = useCallback(() => {
    paintingRef.current = false;
  }, []);

  const triggerFire = useCallback(() => {
    setCity((prev) => {
      const next = startFire(prev, rng);
      if (next === prev) {
        notify('Nothing flammable to burn!');
        return prev;
      }
      playSound('mineExplosion');
      notify('Fire reported downtown!');
      return next;
    });
  }, [notify, rng]);

  const triggerMonster = useCallback(() => {
    setCity((prev) => {
      playSound('mineExplosion');
      notify('A monster rampages through the city!');
      return spawnMonster(prev, rng, randInt(rng, 2, GRID_W - 3), randInt(rng, 2, GRID_H - 3));
    });
  }, [notify, rng]);

  const newCity = useCallback(() => {
    setCity(createCity(GRID_W, GRID_H));
    setRunning(true);
    setAdvisor(null);
    setStarted(true);
  }, []);

  const setTax = useCallback((rate: number) => {
    setCity((prev) => ({ ...prev, taxRate: rate }));
  }, []);

  // ---- Title screen (preserved SimCity 2000 skyline) ----
  if (!started) {
    return (
      <div className="flex flex-col h-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#000033] via-[#000066] to-[#000044]" />
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute h-px bg-[#4488cc] left-0 right-0" style={{ top: `${i * 5 + 5}%` }} />
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[45%]">
          <svg viewBox="0 0 500 150" className="w-full h-full" preserveAspectRatio="xMidYMax meet">
            <rect x="30" y="50" width="25" height="100" fill="#1a3366" />
            <rect x="32" y="55" width="5" height="7" fill="#ffff66" opacity="0.7" />
            <rect x="42" y="55" width="5" height="7" fill="#ffff66" opacity="0.5" />
            <rect x="32" y="70" width="5" height="7" fill="#ffff66" opacity="0.6" />
            <rect x="70" y="20" width="30" height="130" fill="#1a3366" />
            <rect x="73" y="25" width="5" height="7" fill="#ffff66" opacity="0.8" />
            <rect x="88" y="25" width="5" height="7" fill="#ffff66" opacity="0.5" />
            <rect x="73" y="40" width="5" height="7" fill="#ffff66" opacity="0.4" />
            <rect x="88" y="55" width="5" height="7" fill="#ffff66" opacity="0.7" />
            <rect x="120" y="60" width="20" height="90" fill="#1a3366" />
            <rect x="123" y="65" width="4" height="6" fill="#ffff66" opacity="0.6" />
            <rect x="160" y="30" width="35" height="120" fill="#1a3366" />
            <rect x="163" y="35" width="5" height="7" fill="#ffff66" opacity="0.7" />
            <rect x="180" y="35" width="5" height="7" fill="#ffff66" opacity="0.5" />
            <rect x="163" y="50" width="5" height="7" fill="#ffff66" opacity="0.8" />
            <rect x="180" y="65" width="5" height="7" fill="#ffff66" opacity="0.4" />
            <rect x="210" y="70" width="18" height="80" fill="#1a3366" />
            <rect x="240" y="40" width="28" height="110" fill="#1a3366" />
            <rect x="243" y="45" width="5" height="7" fill="#ffff66" opacity="0.6" />
            <rect x="258" y="60" width="5" height="7" fill="#ffff66" opacity="0.7" />
            <rect x="285" y="15" width="22" height="135" fill="#1a3366" />
            <rect x="288" y="20" width="4" height="6" fill="#ffff66" opacity="0.8" />
            <rect x="288" y="35" width="4" height="6" fill="#ffff66" opacity="0.5" />
            <rect x="320" y="55" width="30" height="95" fill="#1a3366" />
            <rect x="323" y="60" width="5" height="7" fill="#ffff66" opacity="0.7" />
            <rect x="340" y="60" width="5" height="7" fill="#ffff66" opacity="0.4" />
            <rect x="370" y="75" width="15" height="75" fill="#1a3366" />
            <rect x="400" y="45" width="25" height="105" fill="#1a3366" />
            <rect x="403" y="50" width="5" height="7" fill="#ffff66" opacity="0.6" />
            <rect x="440" y="65" width="20" height="85" fill="#1a3366" />
            <rect x="470" y="80" width="30" height="70" fill="#1a3366" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-3 p-4">
          <h1
            className="text-[32px] font-bold tracking-wider"
            style={{ color: '#66aaff', textShadow: '0 0 20px rgba(100,170,255,0.5), 2px 2px 0 #001133', fontFamily: 'serif' }}
          >
            SimCity 2000
          </h1>
          <div className="text-[12px] text-[#88aacc] mb-4" style={{ fontFamily: 'serif' }}>
            The Ultimate City Simulator
          </div>

          <div className="flex flex-col gap-2 w-[180px]">
            {(['New City', 'Load City', 'Edit Scenario', 'Quit'] as const).map((label) => (
              <button
                key={label}
                onClick={() => (label === 'New City' ? newCity() : setShowCdError(true))}
                className="py-2 px-4 text-[12px] cursor-pointer border text-center"
                style={{ background: 'linear-gradient(to bottom, #2255aa, #113377)', borderColor: '#4488cc', color: '#aaccff', fontFamily: 'serif' }}
              >
                {label}
              </button>
            ))}
          </div>

          {bestPop > 0 && (
            <div className="mt-2 text-[11px] text-[#88bbff]" style={{ fontFamily: 'serif' }}>
              Best city on record: {bestPop.toLocaleString()} citizens
            </div>
          )}
          <div className="mt-2 text-[10px] text-[#446688]">&copy; 1993 Maxis Software</div>
        </div>

        {showCdError && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/30">
            <Dialog98
              title="SimCity 2000"
              icon="error"
              message="Please insert the SimCity 2000 CD-ROM to continue. (Try New City instead!)"
              buttons={[{ label: 'OK', onClick: () => setShowCdError(false), default: true }]}
            />
          </div>
        )}
      </div>
    );
  }

  // ---- Builder ----
  const year = cityYear(city.month);
  const month = cityMonthName(city.month);
  const net = city.income - city.expenses;

  return (
    <div className="flex h-full text-[11px] select-none bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)]">
      {/* Left toolbar */}
      <div className="w-[112px] flex-shrink-0 flex flex-col gap-1 p-1 border-r-2 border-[var(--win98-button-shadow)] overflow-y-auto">
        <div className="font-bold text-center">Tools</div>
        {TOOLS.map((t) => (
          <Button98
            key={t.tool}
            active={tool === t.tool}
            onClick={() => setTool(t.tool)}
            className="!min-w-0 !min-h-0 py-[2px] justify-start gap-1"
            title={`${t.label} — $${TOOL_COSTS[t.tool]}`}
          >
            <span className="w-4 text-center" style={{ color: t.color }}>
              {t.glyph}
            </span>
            <span className="flex-1 text-left truncate text-[10px]">{t.label}</span>
          </Button98>
        ))}
        <div className="mt-1 text-[9px] text-center text-[var(--win98-button-shadow)]">
          ${TOOL_COSTS[tool]} / tile
        </div>

        <div className="mt-1 font-bold text-center">Disasters</div>
        <Button98 className="!min-w-0 !min-h-0 py-[2px]" onClick={triggerFire}>
          🔥 Fire
        </Button98>
        <Button98 className="!min-w-0 !min-h-0 py-[2px]" onClick={triggerMonster}>
          🦖 Monster
        </Button98>

        <div className="mt-1 font-bold text-center">Sim</div>
        <Button98 className="!min-w-0 !min-h-0 py-[2px]" onClick={() => setRunning((r) => !r)}>
          {running ? '⏸ Pause' : '▶ Play'}
        </Button98>
        <Button98 className="!min-w-0 !min-h-0 py-[2px]" onClick={newCity}>
          ✱ New City
        </Button98>
      </div>

      {/* Center: map */}
      <div className="flex-1 min-w-0 flex flex-col p-1 overflow-hidden">
        <div
          className="flex-1 min-h-0 grid gap-0 border-2 border-[var(--win98-button-shadow)] bg-[#2b5c26]"
          style={{ gridTemplateColumns: `repeat(${GRID_W}, 1fr)`, gridTemplateRows: `repeat(${GRID_H}, 1fr)` }}
          onPointerLeave={stopPaint}
          onPointerUp={stopPaint}
        >
          {city.grid.map((t, i) => {
            const x = i % GRID_W;
            const y = Math.floor(i / GRID_W);
            const st = tileStyle(t);
            const unlit = isZone(t.type) && !t.powered && t.fire === 0;
            const isMonster = city.monster && city.monster.x === x && city.monster.y === y;
            return (
              <div
                key={i}
                onPointerDown={() => handleDown(x, y)}
                onPointerEnter={() => handleEnter(x, y)}
                className="relative flex items-center justify-center cursor-crosshair"
                style={{ background: st.bg, fontSize: 9, lineHeight: 1, color: st.fg }}
              >
                {isMonster ? '🦖' : st.glyph}
                {unlit && (
                  <span className="absolute top-0 right-0 text-[7px] leading-none text-red-600" title="No power">
                    ⚡
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: dashboard */}
      <div className="w-[132px] flex-shrink-0 flex flex-col gap-1 p-1 border-l-2 border-[var(--win98-button-highlight)] overflow-y-auto">
        <div
          className="text-center font-bold py-[2px] text-white"
          style={{ background: 'linear-gradient(to right, var(--win98-titlebar-active-start), var(--win98-titlebar-active-end))' }}
        >
          {month} {year}
        </div>

        <div className="border border-[var(--win98-button-shadow)] p-1 bg-white text-black">
          <div className="flex justify-between">
            <span>Population</span>
            <span className="font-bold">{city.population.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Jobs</span>
            <span>{city.jobs.toLocaleString()}</span>
          </div>
        </div>

        <div className="border border-[var(--win98-button-shadow)] p-1 bg-white text-black">
          <div className="flex justify-between">
            <span>Funds</span>
            <span className={cn('font-bold', city.cash < 0 && 'text-red-600')}>${city.cash.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-green-700">
            <span>Income</span>
            <span>+${city.income}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Upkeep</span>
            <span>-${city.expenses}</span>
          </div>
          <div className="flex justify-between border-t border-[var(--win98-button-shadow)] mt-[1px] pt-[1px]">
            <span>Net</span>
            <span className={cn(net < 0 ? 'text-red-600' : 'text-green-700')}>
              {net < 0 ? '-' : '+'}${Math.abs(net)}
            </span>
          </div>
        </div>

        <div className="border border-[var(--win98-button-shadow)] p-1 bg-[var(--win98-button-face)]">
          <div className="font-bold mb-[2px]">Tax rate: {city.taxRate}%</div>
          <input
            type="range"
            min={0}
            max={20}
            value={city.taxRate}
            onChange={(e) => setTax(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="border border-[var(--win98-button-shadow)] p-1 bg-[var(--win98-button-face)] flex flex-col gap-[3px]">
          <div className="font-bold">RCI Demand</div>
          <RciBar label="R" value={city.demand.r} color="#2ecc40" />
          <RciBar label="C" value={city.demand.c} color="#0074d9" />
          <RciBar label="I" value={city.demand.i} color="#ffcc00" />
        </div>

        <div className="border border-[var(--win98-button-shadow)] p-1 bg-white text-black text-[10px]">
          Best ever: <span className="font-bold">{bestPop.toLocaleString()}</span>
        </div>
      </div>

      {flash && (
        <div className="absolute left-1/2 top-2 -translate-x-1/2 z-30 px-2 py-1 bg-black/80 text-white text-[11px] rounded-sm pointer-events-none">
          {flash}
        </div>
      )}

      {advisor && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/30">
          <Dialog98
            title="City Advisor"
            icon="info"
            message={
              <div className="max-w-[220px]">
                <div className="font-bold mb-1">New Milestone: {advisor.title}!</div>
                <div>{advisor.message}</div>
                <div className="mt-1 text-[10px]">Population: {advisor.pop.toLocaleString()}+</div>
              </div>
            }
            buttons={[{ label: 'Hurrah!', onClick: () => setAdvisor(null), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
