'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import { Button98 } from '@/components/ui/Button98';
import { cn } from '@/lib/cn';
import { makeRng, randInt, weightedPick, type Rand } from './engine/rng';
import { useGameLoop } from './engine/loop';
import {
  addTrick,
  bankCombo,
  comboMultiplier,
  comboValue,
  emptyCombo,
  goalTier,
  grindHasBailed,
  SCORE_GOALS,
  trickName,
  trickSpin,
  updateGrindBalance,
  validateLanding,
  type ComboState,
  type GoalTier,
} from './engine/trick';

const GAME_ID = 'tony-hawk-2';

const LEVELS = [
  { name: 'The Hangar', location: 'Mulhawk Airfield' },
  { name: 'School II', location: 'Southern California' },
  { name: 'Marseille', location: 'Marseille, France' },
  { name: 'NY City', location: 'New York City, NY' },
  { name: 'Venice Beach', location: 'Venice, CA' },
  { name: 'Skatestreet', location: 'Ventura, CA' },
  { name: 'Philadelphia', location: 'Philadelphia, PA' },
  { name: 'The Bullring', location: 'Mexico' },
];

// ---- world / physics constants (canvas logical coordinates) ----
const W = 640;
const H = 340;
const GROUND_Y = 252;
const PLAYER_X = 150;
const SCROLL = 178; // px/s auto-scroll
const GRAVITY = 1350; // px/s^2
const JUMP_V = 470;
const RAMP_V = 660;
const RUN_TIME = 120; // seconds
const GRIND_TICK = 0.35; // seconds between grind combo ticks

type FeatureType = 'rail' | 'ramp' | 'gap';
interface Feature {
  type: FeatureType;
  x: number; // world start
  w: number;
  h: number; // rail height above ground
  used?: boolean; // ramps launch once
}

interface Flash {
  text: string;
  color: string;
  t: number;
}

interface Sim {
  rand: Rand;
  time: number;
  worldX: number; // player's world position
  // skater
  y: number; // height above ground (0 = grounded)
  vy: number;
  rotation: number;
  targetRot: number;
  onGround: boolean;
  grinding: boolean;
  railEnd: number;
  balance: number;
  drift: number;
  grindTimer: number;
  down: boolean;
  downTimer: number;
  // scoring
  combo: ComboState;
  score: number;
  bestCombo: number;
  reached: { bronze: boolean; silver: boolean; gold: boolean };
  // fx
  flash: Flash | null;
  ended: boolean;
  features: Feature[];
}

function genFeatures(rand: Rand): Feature[] {
  const feats: Feature[] = [];
  let x = 700;
  const total = 22500;
  while (x < total) {
    const t = weightedPick<FeatureType | 'flat'>(rand, [
      ['rail', 3],
      ['ramp', 2],
      ['gap', 1.4],
      ['flat', 2],
    ]);
    if (t === 'rail') {
      const w = randInt(rand, 150, 280);
      feats.push({ type: 'rail', x, w, h: randInt(rand, 56, 96) });
      x += w;
    } else if (t === 'ramp') {
      const w = randInt(rand, 60, 90);
      feats.push({ type: 'ramp', x, w, h: 0 });
      x += w;
    } else if (t === 'gap') {
      const w = randInt(rand, 70, 130);
      feats.push({ type: 'gap', x, w, h: 0 });
      x += w;
    }
    x += randInt(rand, 280, 540);
  }
  return feats;
}

function createSim(seed: number): Sim {
  const rand = makeRng(seed);
  return {
    rand,
    time: 0,
    worldX: 0,
    y: 0,
    vy: 0,
    rotation: 0,
    targetRot: 0,
    onGround: true,
    grinding: false,
    railEnd: 0,
    balance: 0,
    drift: 0,
    grindTimer: 0,
    down: false,
    downTimer: 0,
    combo: emptyCombo(),
    score: 0,
    bestCombo: 0,
    reached: { bronze: false, silver: false, gold: false },
    flash: null,
    ended: false,
    features: genFeatures(rand),
  };
}

export default function TonyHawk2({ windowId }: AppComponentProps) {
  void windowId;
  const { getAppPref, setAppPref } = useSettings();

  const [screen, setScreen] = useState<'title' | 'run' | 'summary'>('title');
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [best, setBest] = useState<number>(() => getAppPref<number>(GAME_ID, 'highScore', 0));

  const [hud, setHud] = useState({
    score: 0,
    timeLeft: RUN_TIME,
    comboVal: 0,
    mult: 1,
    tier: 'none' as GoalTier,
    grinding: false,
  });
  const [summary, setSummary] = useState({
    score: 0,
    bestCombo: 0,
    newBest: false,
    tier: 'none' as GoalTier,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<Sim | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const hudAccumRef = useRef(0);

  const flash = useCallback((sim: Sim, text: string, color: string) => {
    sim.flash = { text, color, t: 0.9 };
  }, []);

  const crash = useCallback(
    (sim: Sim) => {
      sim.down = true;
      sim.downTimer = 1.1;
      sim.combo = emptyCombo();
      sim.grinding = false;
      sim.onGround = true;
      sim.y = 0;
      sim.vy = 0;
      sim.rotation = 0;
      sim.targetRot = 0;
      flash(sim, 'BAIL!', '#ff3838');
      playSound('error');
    },
    [flash],
  );

  const checkGoals = useCallback(
    (sim: Sim) => {
      const tier = goalTier(sim.score);
      if (tier === 'gold' && !sim.reached.gold) {
        sim.reached.gold = sim.reached.silver = sim.reached.bronze = true;
        flash(sim, 'GOLD MEDAL!', '#ffd700');
        playSound('chord');
      } else if (tier === 'silver' && !sim.reached.silver) {
        sim.reached.silver = sim.reached.bronze = true;
        flash(sim, 'SILVER!', '#d8d8e0');
        playSound('cardWin');
      } else if (tier === 'bronze' && !sim.reached.bronze) {
        sim.reached.bronze = true;
        flash(sim, 'BRONZE!', '#cd7f32');
        playSound('notify');
      }
    },
    [flash],
  );

  const startRun = useCallback(() => {
    simRef.current = createSim((Date.now() ^ (selectedLevel * 2654435761)) >>> 0);
    keysRef.current = { left: false, right: false };
    hudAccumRef.current = 0;
    setHud({ score: 0, timeLeft: RUN_TIME, comboVal: 0, mult: 1, tier: 'none', grinding: false });
    setScreen('run');
  }, [selectedLevel]);

  const endRun = useCallback(
    (sim: Sim) => {
      sim.ended = true;
      const finalScore = sim.score;
      const newBest = finalScore > best;
      if (newBest) {
        setBest(finalScore);
        setAppPref<number>(GAME_ID, 'highScore', finalScore);
        playSound('chord');
      }
      setSummary({
        score: finalScore,
        bestCombo: sim.bestCombo,
        newBest,
        tier: goalTier(finalScore),
      });
      setScreen('summary');
    },
    [best, setAppPref],
  );

  // ---- input ----
  const doTrick = useCallback(
    (sim: Sim, id: string) => {
      if (sim.down || sim.onGround || sim.grinding) return;
      sim.combo = addTrick(sim.combo, id);
      sim.targetRot += trickSpin(id);
      flash(sim, trickName(id), '#ccff00');
    },
    [flash],
  );

  const ollie = useCallback((sim: Sim) => {
    if (sim.down) return;
    if (sim.onGround || sim.grinding) {
      sim.vy = JUMP_V;
      sim.onGround = false;
      sim.grinding = false; // hop off a rail keeps the combo alive
    }
  }, []);

  useEffect(() => {
    if (screen !== 'run') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const sim = simRef.current;
      if (!sim) return;
      const k = e.code;
      const game =
        k === 'Space' ||
        k === 'ArrowLeft' ||
        k === 'ArrowRight' ||
        k === 'ArrowUp' ||
        k === 'ArrowDown' ||
        k === 'KeyA' ||
        k === 'KeyD' ||
        k === 'KeyW' ||
        k === 'KeyS';
      if (game) e.preventDefault();
      if (e.repeat) {
        if (k === 'ArrowLeft' || k === 'KeyA') keysRef.current.left = true;
        if (k === 'ArrowRight' || k === 'KeyD') keysRef.current.right = true;
        return;
      }
      switch (k) {
        case 'Space':
          ollie(sim);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          keysRef.current.left = true;
          doTrick(sim, 'kickflip');
          break;
        case 'ArrowRight':
        case 'KeyD':
          keysRef.current.right = true;
          doTrick(sim, 'heelflip');
          break;
        case 'ArrowUp':
        case 'KeyW':
          doTrick(sim, 'grab');
          break;
        case 'ArrowDown':
        case 'KeyS':
          doTrick(sim, 'manual');
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.code;
      if (k === 'ArrowLeft' || k === 'KeyA') keysRef.current.left = false;
      if (k === 'ArrowRight' || k === 'KeyD') keysRef.current.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [screen, ollie, doTrick]);

  // ---- simulation step ----
  const step = useCallback(
    (sim: Sim, dt: number) => {
      sim.time += dt;
      sim.worldX += SCROLL * dt;
      if (sim.flash) {
        sim.flash.t -= dt;
        if (sim.flash.t <= 0) sim.flash = null;
      }

      if (sim.down) {
        sim.downTimer -= dt;
        if (sim.downTimer <= 0) sim.down = false;
      } else if (sim.grinding) {
        const input = (keysRef.current.left ? 1 : 0) + (keysRef.current.right ? -1 : 0);
        sim.balance = updateGrindBalance(sim.balance, sim.drift, input, dt);
        sim.grindTimer += dt;
        if (sim.grindTimer >= GRIND_TICK) {
          sim.grindTimer -= GRIND_TICK;
          sim.combo = addTrick(sim.combo, 'grind');
        }
        if (grindHasBailed(sim.balance)) {
          crash(sim);
        } else if (sim.worldX > sim.railEnd) {
          // rode off the end — drop back into the air, combo intact
          sim.grinding = false;
          sim.onGround = false;
          sim.vy = 40;
        }
      } else if (!sim.onGround) {
        // airborne physics
        sim.vy -= GRAVITY * dt;
        sim.y += sim.vy * dt;
        sim.rotation += (sim.targetRot - sim.rotation) * Math.min(1, dt * 11);

        // try to catch a rail on the way down
        if (sim.vy <= 0) {
          for (const f of sim.features) {
            if (f.type !== 'rail') continue;
            if (
              sim.worldX >= f.x &&
              sim.worldX <= f.x + f.w &&
              sim.y <= f.h + 10 &&
              sim.y >= f.h - 44
            ) {
              sim.grinding = true;
              sim.y = f.h;
              sim.vy = 0;
              sim.railEnd = f.x + f.w;
              sim.balance = 0;
              sim.grindTimer = 0;
              sim.drift = (sim.rand() < 0.5 ? -1 : 1) * (0.7 + sim.rand() * 0.7);
              sim.combo = addTrick(sim.combo, 'grind');
              flash(sim, '50-50 GRIND', '#7fdfff');
              break;
            }
          }
        }

        // landing on the ground
        if (sim.y <= 0 && sim.vy <= 0 && !sim.grinding) {
          const overGap = sim.features.some(
            (f) => f.type === 'gap' && sim.worldX >= f.x && sim.worldX <= f.x + f.w,
          );
          if (overGap) {
            crash(sim);
          } else {
            const landing = validateLanding(sim.rotation);
            const hadCombo = sim.combo.tricks.length > 0;
            if (landing === 'bail') {
              crash(sim);
            } else {
              sim.onGround = true;
              sim.y = 0;
              sim.vy = 0;
              sim.rotation = Math.round(sim.rotation / 360) * 360;
              sim.targetRot = sim.rotation;
              if (hadCombo) {
                const pts = bankCombo(sim.combo, landing);
                sim.score += pts;
                sim.bestCombo = Math.max(sim.bestCombo, pts);
                flash(
                  sim,
                  `${landing === 'clean' ? 'CLEAN' : 'SKETCHY'} +${pts.toLocaleString()}`,
                  landing === 'clean' ? '#ccff00' : '#ffcc44',
                );
                playSound('ding');
                checkGoals(sim);
              }
              sim.combo = emptyCombo();
            }
          }
        }
      } else {
        // grounded: ramps launch you skyward
        for (const f of sim.features) {
          if (f.type !== 'ramp' || f.used) continue;
          if (sim.worldX >= f.x && sim.worldX <= f.x + f.w) {
            f.used = true;
            sim.vy = RAMP_V;
            sim.onGround = false;
            flash(sim, 'AIR!', '#ffffff');
            break;
          }
        }
        // rode into a gap while grounded
        const inGap = sim.features.some(
          (f) => f.type === 'gap' && sim.worldX >= f.x && sim.worldX <= f.x + f.w,
        );
        if (inGap && !sim.down) crash(sim);
      }

      if (sim.time >= RUN_TIME && !sim.ended) {
        endRun(sim);
      }
    },
    [crash, flash, checkGoals, endRun],
  );

  // ---- rendering ----
  const draw = useCallback((ctx: CanvasRenderingContext2D, sim: Sim) => {
    const camX = sim.worldX - PLAYER_X;
    const sx = (wx: number) => wx - camX;

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0a0a16');
    sky.addColorStop(0.6, '#181410');
    sky.addColorStop(1, '#211a08');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // parallax skyline
    ctx.fillStyle = 'rgba(204,255,0,0.05)';
    const pOff = (sim.worldX * 0.25) % 120;
    for (let i = -1; i < W / 60 + 1; i++) {
      const bx = i * 60 - pOff;
      const bh = 40 + ((i * 37) % 60);
      ctx.fillRect(bx, GROUND_Y - bh, 46, bh);
    }

    // ground
    ctx.fillStyle = '#16161c';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    // carve gaps + draw features
    for (const f of sim.features) {
      const fx = sx(f.x);
      if (fx > W + 60 || fx + f.w < -60) continue;
      if (f.type === 'gap') {
        ctx.fillStyle = '#05050a';
        ctx.fillRect(fx, GROUND_Y, f.w, H - GROUND_Y);
      } else if (f.type === 'ramp') {
        ctx.fillStyle = '#2a2a12';
        ctx.beginPath();
        ctx.moveTo(fx, GROUND_Y);
        ctx.quadraticCurveTo(fx + f.w, GROUND_Y, fx + f.w, GROUND_Y - 54);
        ctx.lineTo(fx + f.w, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ccff00';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (f.type === 'rail') {
        const ry = GROUND_Y - f.h;
        ctx.strokeStyle = '#4a3a1a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fx + 6, GROUND_Y);
        ctx.lineTo(fx + 6, ry);
        ctx.moveTo(fx + f.w - 6, GROUND_Y);
        ctx.lineTo(fx + f.w - 6, ry);
        ctx.stroke();
        ctx.strokeStyle = '#ff5cf0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(fx, ry);
        ctx.lineTo(fx + f.w, ry);
        ctx.stroke();
      }
    }

    // neon ground edge (skip gaps)
    ctx.strokeStyle = '#ccff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let penDown = false;
    for (let x = 0; x <= W; x += 8) {
      const wx = x + camX;
      const overGap = sim.features.some(
        (f) => f.type === 'gap' && wx >= f.x && wx <= f.x + f.w,
      );
      if (overGap) {
        penDown = false;
        continue;
      }
      if (!penDown) {
        ctx.moveTo(x, GROUND_Y);
        penDown = true;
      } else {
        ctx.lineTo(x, GROUND_Y);
      }
    }
    ctx.stroke();

    // skater
    const feetY = GROUND_Y - sim.y;
    ctx.save();
    ctx.translate(PLAYER_X, feetY - 10);
    if (!sim.onGround && !sim.grinding && !sim.down) {
      ctx.rotate((sim.rotation * Math.PI) / 180);
    } else if (sim.down) {
      ctx.rotate(Math.PI / 2.2);
    }
    // board
    ctx.fillStyle = '#ccff00';
    ctx.fillRect(-14, 8, 28, 4);
    ctx.fillStyle = '#888';
    ctx.fillRect(-11, 12, 4, 3);
    ctx.fillRect(7, 12, 4, 3);
    // body
    ctx.fillStyle = '#e8e8f0';
    ctx.fillRect(-5, -14, 10, 20);
    ctx.fillStyle = '#ffcf9e';
    ctx.beginPath();
    ctx.arc(0, -19, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // combo readout above skater
    if (sim.combo.tricks.length > 0) {
      const val = comboValue(sim.combo);
      const mult = comboMultiplier(sim.combo);
      ctx.fillStyle = '#ccff00';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${val.toLocaleString()}  x${mult}`, PLAYER_X, feetY - 46);
    }

    // flash message
    if (sim.flash) {
      ctx.globalAlpha = Math.min(1, sim.flash.t * 2.2);
      ctx.fillStyle = sim.flash.color;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sim.flash.text, W / 2, 70);
      ctx.globalAlpha = 1;
    }

    // grind balance meter
    if (sim.grinding) {
      const bw = 220;
      const bx = (W - bw) / 2;
      const by = H - 30;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 2, by - 2, bw + 4, 16);
      // danger zones
      ctx.fillStyle = 'rgba(255,56,56,0.5)';
      ctx.fillRect(bx, by, bw * 0.12, 12);
      ctx.fillRect(bx + bw * 0.88, by, bw * 0.12, 12);
      ctx.fillStyle = '#2a2a30';
      ctx.fillRect(bx + bw * 0.12, by, bw * 0.76, 12);
      // marker (balance -2..2 mapped across bar, bail at +/-1)
      const t = (sim.balance / 2 + 0.5);
      const mx = bx + Math.max(0, Math.min(1, t)) * bw;
      ctx.fillStyle = '#ccff00';
      ctx.fillRect(mx - 3, by - 3, 6, 18);
      ctx.fillStyle = '#7fdfff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BALANCE — tap Left / Right', W / 2, by - 8);
    }
  }, []);

  // ---- main loop ----
  useGameLoop(
    useCallback(
      (dt: number) => {
        const sim = simRef.current;
        if (!sim || sim.ended) return;
        step(sim, dt);
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (!ctx) return; // jsdom has no 2d context
          draw(ctx, sim);
        }
        // throttle HUD sync to React
        hudAccumRef.current += dt;
        if (hudAccumRef.current >= 0.12) {
          hudAccumRef.current = 0;
          setHud({
            score: sim.score,
            timeLeft: Math.max(0, RUN_TIME - sim.time),
            comboVal: comboValue(sim.combo),
            mult: comboMultiplier(sim.combo),
            tier: goalTier(sim.score),
            grinding: sim.grinding,
          });
        }
      },
      [step, draw],
    ),
    screen === 'run',
  );

  const mm = Math.floor(hud.timeLeft / 60);
  const ss = Math.floor(hud.timeLeft % 60);

  // ============================ RENDER ============================
  if (screen === 'run') {
    return (
      <div className="flex flex-col h-full bg-black select-none">
        {/* HUD strip */}
        <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold bg-[#0a0a0a] border-b border-[#333]">
          <div className="text-[#ccff00]">
            SCORE <span className="tabular-nums">{hud.score.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Medal on={hud.tier === 'bronze' || hud.tier === 'silver' || hud.tier === 'gold'} color="#cd7f32" label="B" />
            <Medal on={hud.tier === 'silver' || hud.tier === 'gold'} color="#d8d8e0" label="S" />
            <Medal on={hud.tier === 'gold'} color="#ffd700" label="G" />
          </div>
          <div className={cn('tabular-nums', hud.timeLeft < 15 ? 'text-[#ff3838]' : 'text-white')}>
            {mm}:{ss.toString().padStart(2, '0')}
          </div>
        </div>
        <div className="relative flex-1 min-h-0">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="absolute inset-0 w-full h-full"
            style={{ imageRendering: 'pixelated' }}
            tabIndex={0}
          />
        </div>
        {/* controls hint */}
        <div className="flex items-center justify-center gap-3 px-2 py-1 text-[9px] text-[#888] bg-[#0a0a0a] border-t border-[#333]">
          <span><b className="text-[#ccff00]">SPACE</b> ollie</span>
          <span><b className="text-[#ccff00]">←→</b> flips</span>
          <span><b className="text-[#ccff00]">↑</b> grab</span>
          <span><b className="text-[#ccff00]">↓</b> manual</span>
        </div>
      </div>
    );
  }

  if (screen === 'summary') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center"
        style={{ background: 'linear-gradient(160deg,#0a0a0a,#1a1a0a,#0a0a0a)' }}>
        <div className="text-[10px] text-[#999] tracking-[3px]">RUN COMPLETE</div>
        <div className="text-[13px] font-bold text-white">{LEVELS[selectedLevel].name}</div>
        <div className="text-[42px] font-black leading-none tabular-nums" style={{ color: '#ccff00', textShadow: '2px 2px 0 #1a2200' }}>
          {summary.score.toLocaleString()}
        </div>
        {summary.tier !== 'none' && (
          <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: summary.tier === 'gold' ? '#ffd700' : summary.tier === 'silver' ? '#d8d8e0' : '#cd7f32' }}>
            {summary.tier} medal earned
          </div>
        )}
        <div className="text-[11px] text-[#aaa]">Best combo: <span className="text-[#ccff00]">{summary.bestCombo.toLocaleString()}</span></div>
        {summary.newBest ? (
          <div className="text-[11px] font-bold text-[#ccff00] animate-pulse">NEW HIGH SCORE!</div>
        ) : (
          <div className="text-[11px] text-[#888]">High score: {best.toLocaleString()}</div>
        )}
        <div className="flex gap-2 mt-2">
          <Button98 onClick={startRun}>Skate Again</Button98>
          <Button98 onClick={() => setScreen('title')}>Levels</Button98>
        </div>
      </div>
    );
  }

  // ---- title / level select ----
  return (
    <div className="flex flex-col h-full relative overflow-hidden select-none">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #0a0a0a 0%, #1a1a0a 50%, #0a0a0a 100%)' }} />
      <div className="relative z-10 flex flex-col flex-1 p-4">
        <div className="text-center mb-3">
          <div className="text-[10px] text-[#999] tracking-[3px] mb-1">TONY HAWK&apos;S</div>
          <h1 className="text-[26px] font-black tracking-tight leading-none"
            style={{ color: '#ccff00', textShadow: '2px 2px 0 #1a2200, 0 0 15px rgba(204,255,0,0.3)', fontFamily: 'sans-serif' }}>
            PRO SKATER 2
          </h1>
          <div className="w-[180px] h-[2px] bg-gradient-to-r from-transparent via-[#ccff00] to-transparent mx-auto mt-2" />
        </div>

        <div className="text-[10px] text-[#888] tracking-wider text-center mb-2">SELECT LEVEL</div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-[2px]">
            {LEVELS.map((level, i) => (
              <button
                key={level.name}
                onClick={() => setSelectedLevel(i)}
                onDoubleClick={startRun}
                onMouseEnter={() => setSelectedLevel(i)}
                className="py-[5px] px-3 text-left cursor-pointer border transition-colors flex justify-between items-center"
                style={{
                  background: selectedLevel === i ? 'linear-gradient(to right, rgba(204,255,0,0.15), transparent)' : 'transparent',
                  borderColor: selectedLevel === i ? '#ccff00' : 'transparent',
                  color: selectedLevel === i ? '#ccff00' : '#666',
                }}
              >
                <span className="text-[12px] font-bold">{level.name}</span>
                <span className="text-[10px] opacity-60">{level.location}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#333]">
          <div className="text-[10px] text-[#555]">
            Goals: {SCORE_GOALS.bronze.toLocaleString()} / {SCORE_GOALS.silver.toLocaleString()} / {SCORE_GOALS.gold.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#ccff00]">Best {best.toLocaleString()}</div>
        </div>
        <div className="flex justify-center mt-3">
          <Button98 onClick={startRun} className="min-w-[160px] font-bold">START SKATING</Button98>
        </div>
      </div>
    </div>
  );
}

function Medal({ on, color, label }: { on: boolean; color: string; label: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-[15px] h-[15px] rounded-full text-[9px] font-black"
      style={{
        background: on ? color : '#222',
        color: on ? '#000' : '#555',
        boxShadow: on ? `0 0 6px ${color}` : 'none',
      }}
    >
      {label}
    </span>
  );
}
