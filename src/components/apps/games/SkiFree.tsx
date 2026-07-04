'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import { Button98 } from '@/components/ui/Button98';
import { cn } from '@/lib/cn';
import { makeRng, type Rand } from './engine/rng';
import { useGameLoop } from './engine/loop';
import { compileSprite, drawSprite, animFrame } from './engine/sprites';
import type { SpriteDef } from './engine/sprites/sprite';
import {
  SKIER_DOWN,
  SKIER_SIDE,
  SKIER_TUCK,
  SKIER_AIR,
  SKIER_CRASH,
  YETI_RUN,
  YETI_EAT,
  DOG,
  SNOWBOARDER,
  OTHER_SKIER,
  TREE_PINE,
  TREE_SNOWY,
  TREE_DEAD,
  ROCK,
  STUMP,
  JUMP,
  FLAG_RED,
  FLAG_BLUE,
  LIFT_TOWER,
  MOGUL,
} from './engine/sprites/skifree';
import {
  genObstacles,
  genLiftTowers,
  gatesFrom,
  evaluateGate,
  steerVelocity,
  collidesWith,
  overRegion,
  isSolid,
  boxesOverlap,
  playerFootprint,
  unitsToMeters,
  yetiSpeed,
  yetiHasSpawned,
  yetiCatches,
  flipLandsClean,
  trickPoints,
  slalomTime,
  slalomPlacement,
  SLALOM_FINISH_M,
  SECOND_YETI_M,
  BASE_SPEED,
  type GameMode,
  type Direction,
  type Obstacle,
  type ObstacleKind,
  type Gate,
} from './engine/skifree';

const GAME_ID = 'skifree';

// ---- canvas / camera ----
const W = 480;
const H = 360;
const PX = W / 2; // the skier is pinned here; the slope scrolls under them
const PY = Math.round(H * 0.38);
const LANE_HALF = 300; // world-x the field spreads each side of centre

// ---- tuning ----
const AIR_DESCENT = BASE_SPEED * 1.15; // you keep flying downhill while airborne
const AIR_GRAVITY = 520; // pulls the jump arc back down (px/s^2 in "height")
const LAUNCH_VZ = 190; // upward pop off a ramp
const AIR_STEER = 0.5; // limited course changes mid-air
const ROT_SPEED = 7.5; // flip spin, rad/s
const CRASH_TIME = 1.15; // stun after a face-plant, seconds
const EAT_TIME = 2.2; // yeti's meal before the game-over card
const STYLE_CRASH_LOSS = 5;

// Steering resolves to five poses; Left/Right nudge one step along this order.
const DIR_ORDER: Direction[] = ['left', 'diagLeft', 'down', 'diagRight', 'right'];

const OBSTACLE_SPRITE: Record<ObstacleKind, SpriteDef> = {
  treePine: TREE_PINE,
  treeSnowy: TREE_SNOWY,
  treeDead: TREE_DEAD,
  rock: ROCK,
  stump: STUMP,
  jump: JUMP,
  mogul: MOGUL,
  liftTower: LIFT_TOWER,
  flagRed: FLAG_RED,
  flagBlue: FLAG_BLUE,
};

const MODE_LABEL: Record<GameMode, string> = {
  freestyle: 'Free Style',
  slalom: 'Slalom',
  'tree-slalom': 'Tree Slalom',
};

// ---- dynamic slope traffic (not part of the seeded static field) ----
type TrafficKind = 'dog' | 'skier' | 'boarder';
interface Traffic {
  kind: TrafficKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number; // weave clock
  woof: number; // >0 while the dog's bark is on screen
}

interface Yeti {
  x: number;
  y: number;
}

interface Flash {
  text: string;
  t: number;
}

interface StylePop {
  x: number;
  y: number;
  text: string;
  t: number;
}

interface Sim {
  rand: Rand;
  mode: GameMode;
  time: number;
  // skier
  px: number;
  py: number;
  dirIndex: number;
  tuck: boolean;
  // air
  airborne: boolean;
  airZ: number;
  airVz: number;
  rotating: boolean;
  rotation: number;
  usedJumps: Set<Obstacle>;
  // crash / stun
  crashed: boolean;
  crashTimer: number;
  // yeti
  hunger: number;
  yetis: Yeti[];
  spawnedFirst: boolean;
  spawnedSecond: boolean;
  eaten: boolean;
  eatTimer: number;
  eatenBy: Yeti | null;
  // scoring
  style: number;
  distanceM: number;
  maxDistanceM: number;
  // slalom
  gates: Gate[];
  gateResults: Map<number, 'passed' | 'missed'>;
  missedGates: number;
  finished: boolean;
  finishTime: number;
  // traffic
  obstacles: Obstacle[];
  traffic: Traffic[];
  nextSkier: number;
  nextBoarder: number;
  nextDog: number;
  // fx
  flash: Flash | null;
  pops: StylePop[];
  // lifecycle flags read by the React loop
  ended: boolean;
  gameOver: boolean;
}

function createSim(seed: number, mode: GameMode, hunger: number): Sim {
  const rand = makeRng(seed);
  const obstacles = genObstacles(seed, { mode, laneHalfWidth: LANE_HALF });
  // A lift line down the left of the run, near the top. Towers collide; the
  // chairs overhead are drawn purely for flavour.
  obstacles.push(...genLiftTowers(-150, 6, 26));
  obstacles.sort((a, b) => a.y - b.y);
  const gates = mode === 'freestyle' ? [] : gatesFrom(obstacles);
  return {
    rand,
    mode,
    time: 0,
    px: 0,
    py: 0,
    dirIndex: 2, // straight down
    tuck: false,
    airborne: false,
    airZ: 0,
    airVz: 0,
    rotating: false,
    rotation: 0,
    usedJumps: new Set(),
    crashed: false,
    crashTimer: 0,
    hunger,
    yetis: [],
    spawnedFirst: false,
    spawnedSecond: false,
    eaten: false,
    eatTimer: 0,
    eatenBy: null,
    style: 0,
    distanceM: 0,
    maxDistanceM: 0,
    gates,
    gateResults: new Map(),
    missedGates: 0,
    finished: false,
    finishTime: 0,
    obstacles,
    traffic: [],
    nextSkier: 3,
    nextBoarder: 6,
    nextDog: 9,
    flash: null,
    pops: [],
    ended: false,
    gameOver: false,
  };
}

function currentDir(sim: Sim): Direction {
  return DIR_ORDER[sim.dirIndex];
}

function flash(sim: Sim, text: string) {
  sim.flash = { text, t: 1.3 };
}

function pop(sim: Sim, text: string) {
  sim.pops.push({ x: sim.px, y: sim.py, text, t: 1 });
}

function crash(sim: Sim) {
  if (sim.crashed) return;
  sim.crashed = true;
  sim.crashTimer = CRASH_TIME;
  sim.airborne = false;
  sim.airZ = 0;
  sim.airVz = 0;
  sim.rotating = false;
  sim.rotation = 0;
  sim.style = Math.max(0, sim.style - STYLE_CRASH_LOSS);
  flash(sim, 'OUCH!');
  playSound('error');
}

// A ramp throws you into the air; ground clutter is cleared until you land.
function launch(sim: Sim) {
  sim.airborne = true;
  sim.airVz = LAUNCH_VZ;
  sim.airZ = 0;
  sim.rotating = false;
  sim.rotation = 0;
  flash(sim, 'JUMP!');
  playSound('menuClick');
}

function land(sim: Sim) {
  sim.airborne = false;
  sim.airZ = 0;
  sim.airVz = 0;
  if (sim.rotating) {
    if (flipLandsClean(sim.rotation)) {
      const pts = trickPoints('flip');
      sim.style += pts;
      pop(sim, `FLIP +${pts}`);
      playSound('ding');
    } else {
      crash(sim);
    }
  }
  sim.rotating = false;
  sim.rotation = 0;
}

// A mid-air trick key: instant style, no landing risk (that is the flip's job).
function airTrick(sim: Sim, key: 'left' | 'right' | 'down' | 'fast') {
  const kind = key === 'down' ? 'daffy' : key === 'fast' ? 'spread' : 'twist';
  const pts = trickPoints(kind);
  sim.style += pts;
  pop(sim, `${kind.toUpperCase()} +${pts}`);
}

function spawnTraffic(sim: Sim, kind: TrafficKind) {
  const belowY = sim.py + 220 + sim.rand() * 260;
  if (kind === 'dog') {
    const fromLeft = sim.rand() < 0.5;
    sim.traffic.push({
      kind: 'dog',
      x: sim.px + (fromLeft ? -260 : 260),
      y: sim.py + (sim.rand() * 140 - 30),
      vx: (fromLeft ? 1 : -1) * (150 + sim.rand() * 50),
      vy: 30 + sim.rand() * 20,
      phase: 0,
      woof: 1.2,
    });
    playSound('notify');
    return;
  }
  if (kind === 'boarder') {
    sim.traffic.push({
      kind: 'boarder',
      x: sim.px + (sim.rand() * 2 - 1) * 180,
      y: belowY,
      vx: (sim.rand() * 2 - 1) * 90,
      vy: 120 + sim.rand() * 60, // reckless — nearly your pace, cuts around
      phase: sim.rand() * Math.PI * 2,
      woof: 0,
    });
    return;
  }
  sim.traffic.push({
    kind: 'skier',
    x: sim.px + (sim.rand() * 2 - 1) * 200,
    y: belowY,
    vx: 0,
    vy: 55 + sim.rand() * 35, // ambling — you catch up and must weave past
    phase: sim.rand() * Math.PI * 2,
    woof: 0,
  });
}

function maybeSpawnTraffic(sim: Sim) {
  if (sim.time >= sim.nextSkier) {
    spawnTraffic(sim, 'skier');
    sim.nextSkier = sim.time + 3.5 + sim.rand() * 3.5;
  }
  if (sim.time >= sim.nextBoarder) {
    spawnTraffic(sim, 'boarder');
    sim.nextBoarder = sim.time + 7 + sim.rand() * 5;
  }
  if (sim.time >= sim.nextDog) {
    spawnTraffic(sim, 'dog');
    sim.nextDog = sim.time + 11 + sim.rand() * 7;
  }
}

function updateTraffic(sim: Sim, dt: number) {
  for (const t of sim.traffic) {
    t.phase += dt;
    if (t.woof > 0) t.woof -= dt;
    if (t.kind === 'skier') {
      t.x += Math.sin(t.phase * 1.6) * 45 * dt; // gentle weave
      t.y += t.vy * dt;
    } else if (t.kind === 'boarder') {
      t.vx += (sim.rand() * 2 - 1) * 140 * dt; // jittery, reckless line
      t.vx = Math.max(-140, Math.min(140, t.vx));
      t.x += t.vx * dt;
      t.y += t.vy * dt;
    } else {
      t.x += t.vx * dt;
      t.y += t.vy * dt;
    }
  }
  // drop anything that has slid well above the top of the view
  sim.traffic = sim.traffic.filter((t) => t.y - sim.py > -(PY + 80) && t.woof > -1);
}

function checkTrafficCollision(sim: Sim) {
  if (sim.airborne || sim.crashed) return;
  const foot = playerFootprint(sim.px, sim.py);
  for (const t of sim.traffic) {
    if (t.kind === 'dog') continue; // the mutt is all bark
    const box = { x: t.x - 5, y: t.y - 4, w: 10, h: 4 };
    if (boxesOverlap(foot, box)) {
      crash(sim);
      return;
    }
  }
}

function spawnYeti(sim: Sim): Yeti {
  return { x: sim.px + (sim.rand() * 2 - 1) * 40, y: sim.py - (PY + 50) };
}

function updateYetis(sim: Sim, dt: number) {
  if (sim.mode !== 'freestyle') return;
  if (!sim.spawnedFirst && yetiHasSpawned(sim.distanceM)) {
    sim.spawnedFirst = true;
    sim.yetis.push(spawnYeti(sim));
    flash(sim, 'HERE COMES THE YETI!');
    playSound('exclamation');
  }
  if (!sim.spawnedSecond && sim.distanceM >= SECOND_YETI_M) {
    sim.spawnedSecond = true;
    sim.yetis.push(spawnYeti(sim));
    flash(sim, 'A SECOND YETI!');
    playSound('exclamation');
  }
  const spd = yetiSpeed(sim.hunger);
  for (const y of sim.yetis) {
    const dx = sim.px - y.x;
    const dy = sim.py - y.y;
    const d = Math.hypot(dx, dy) || 1;
    y.x += (dx / d) * spd * dt;
    y.y += (dy / d) * spd * dt;
    // Airborne skiers can't be grabbed — a well-timed jump buys distance.
    if (!sim.airborne && !sim.eaten && yetiCatches(y.x, y.y, sim.px, sim.py)) {
      sim.eaten = true;
      sim.eatTimer = 0;
      sim.eatenBy = y;
      sim.hunger += 1; // he leaves hungrier every time
      flash(sim, 'GOTCHA!');
      playSound('error');
    }
  }
}

function checkGates(sim: Sim, prevY: number) {
  for (const g of sim.gates) {
    if (sim.gateResults.has(g.id)) continue;
    if (prevY <= g.y && sim.py >= g.y) {
      const res = evaluateGate(g, sim.px);
      sim.gateResults.set(g.id, res);
      if (res === 'missed') {
        sim.missedGates += 1;
        flash(sim, 'MISSED GATE  +2s');
      }
    }
  }
}

// The whole per-frame simulation. Mutates sim; the React loop reads the
// lifecycle flags afterwards to swap screens.
function advance(sim: Sim, dt: number) {
  if (sim.ended) return;
  sim.time += dt;

  if (sim.flash) {
    sim.flash.t -= dt;
    if (sim.flash.t <= 0) sim.flash = null;
  }
  for (const p of sim.pops) {
    p.t -= dt;
    p.y -= 40 * dt;
  }
  sim.pops = sim.pops.filter((p) => p.t > 0);

  // The meal freezes play; when it is done the game-over card takes over.
  if (sim.eaten) {
    sim.eatTimer += dt;
    if (sim.eatTimer >= EAT_TIME) sim.gameOver = true;
    return;
  }

  const prevY = sim.py;

  if (sim.crashed) {
    sim.crashTimer -= dt;
    if (sim.crashTimer <= 0) sim.crashed = false;
    // Still hunted while you sit in the snow — that is the tension.
    updateYetis(sim, dt);
    updateTraffic(sim, dt);
    sim.distanceM = unitsToMeters(sim.py);
    sim.maxDistanceM = Math.max(sim.maxDistanceM, sim.distanceM);
    return;
  }

  const dir = currentDir(sim);

  if (sim.airborne) {
    sim.py += AIR_DESCENT * dt;
    const v = steerVelocity(dir, false);
    sim.px += v.vx * dt * AIR_STEER;
    sim.airVz -= AIR_GRAVITY * dt;
    sim.airZ += sim.airVz * dt;
    if (sim.rotating) sim.rotation += ROT_SPEED * dt;
    if (sim.airZ <= 0) land(sim);
  } else {
    const v = steerVelocity(dir, sim.tuck);
    // Moguls scrub your descent while you ride over a patch.
    let slow = 1;
    for (const o of sim.obstacles) {
      if (o.kind !== 'mogul') continue;
      if (Math.abs(o.y - sim.py) > 20) continue;
      if (overRegion(sim.px, sim.py, o)) {
        slow = 0.6;
        break;
      }
    }
    sim.px += v.vx * dt;
    sim.py += v.vy * dt * slow;
  }

  sim.px = Math.max(-LANE_HALF, Math.min(LANE_HALF, sim.px));
  sim.distanceM = unitsToMeters(sim.py);
  sim.maxDistanceM = Math.max(sim.maxDistanceM, sim.distanceM);

  // ground interactions: ramps launch, solids crash
  if (!sim.airborne && !sim.crashed) {
    for (const o of sim.obstacles) {
      if (Math.abs(o.y - sim.py) > 24) continue;
      if (o.kind === 'jump') {
        if (!sim.usedJumps.has(o) && overRegion(sim.px, sim.py, o)) {
          sim.usedJumps.add(o);
          launch(sim);
          break;
        }
      } else if (isSolid(o.kind) && collidesWith(sim.px, sim.py, o, false)) {
        crash(sim);
        break;
      }
    }
  } else if (sim.airborne) {
    // only the tall lift towers reach an airborne skier
    for (const o of sim.obstacles) {
      if (o.kind !== 'liftTower') continue;
      if (Math.abs(o.y - sim.py) > 24) continue;
      if (collidesWith(sim.px, sim.py, o, true)) {
        crash(sim);
        break;
      }
    }
  }

  maybeSpawnTraffic(sim);
  updateTraffic(sim, dt);
  checkTrafficCollision(sim);
  updateYetis(sim, dt);

  if (sim.mode !== 'freestyle') {
    checkGates(sim, prevY);
    if (!sim.finished && sim.distanceM >= SLALOM_FINISH_M) {
      sim.finished = true;
      sim.finishTime = slalomTime(sim.time, sim.missedGates);
      sim.ended = true;
      playSound('chord');
    }
  }
}

// ---- rendering ----
function skierVisual(sim: Sim): { def: SpriteDef; flipX: boolean } {
  if (sim.crashed) return { def: SKIER_CRASH, flipX: false };
  if (sim.airborne) return { def: SKIER_AIR, flipX: false };
  const dir = currentDir(sim);
  if (dir === 'down') return { def: sim.tuck ? SKIER_TUCK : SKIER_DOWN, flipX: false };
  if (dir === 'diagLeft' || dir === 'left') return { def: SKIER_SIDE, flipX: false };
  return { def: SKIER_SIDE, flipX: true };
}

function render(ctx: CanvasRenderingContext2D, sim: Sim) {
  const sx = (wx: number) => PX + (wx - sim.px);
  const sy = (wy: number) => PY + (wy - sim.py);

  // snow
  ctx.fillStyle = '#eef3f7';
  ctx.fillRect(0, 0, W, H);

  // drifting speed texture — a scatter of flecks anchored to world rows
  ctx.fillStyle = '#dbe4ec';
  const step = 26;
  const startRow = Math.floor((sim.py - PY) / step) - 1;
  for (let r = 0; r < H / step + 3; r++) {
    const worldRow = (startRow + r) * step;
    const h = (worldRow * 2654435761) >>> 0;
    const fx = (h % 460) - 230; // world x within the lane
    const wobble = ((h >> 8) % 40) - 20;
    ctx.fillRect(sx(fx), sy(worldRow) + wobble, 2, 2);
    ctx.fillRect(sx(fx + 120) - 3, sy(worldRow) + (wobble >> 1), 2, 2);
  }

  // lift cable + swaying chairs down the left, drawn under the props
  ctx.strokeStyle = '#8a8f99';
  ctx.lineWidth = 1;
  const cableX = sx(-150);
  ctx.beginPath();
  ctx.moveTo(cableX, 0);
  ctx.lineTo(cableX, H);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const cy = ((i * 90 - (sim.py * 0.4) % 90) + H + 90) % (H + 90) - 45;
    const swayX = cableX + Math.sin(sim.time * 1.2 + i) * 3;
    ctx.fillStyle = '#565a63';
    ctx.fillRect(swayX - 1, cy - 8, 2, 8);
    ctx.fillStyle = '#33417a';
    ctx.fillRect(swayX - 5, cy, 10, 5);
  }

  // paint everything in the world in top-to-bottom order so lower things overlap
  interface Drawable {
    y: number;
    run: () => void;
  }
  const draws: Drawable[] = [];

  for (const o of sim.obstacles) {
    const oy = sy(o.y);
    if (oy < -60 || oy > H + 60) continue;
    const ox = sx(o.x);
    if (ox < -40 || ox > W + 40) continue;
    draws.push({ y: o.y, run: () => drawSprite(ctx, compileSprite(OBSTACLE_SPRITE[o.kind]), ox, oy) });
  }

  for (const t of sim.traffic) {
    const ty = sy(t.y);
    if (ty < -40 || ty > H + 40) continue;
    const tx = sx(t.x);
    draws.push({
      y: t.y,
      run: () => {
        if (t.kind === 'dog') {
          drawSprite(ctx, compileSprite(DOG, { flipX: t.vx > 0 }), tx, ty, {
            frame: animFrame(t.phase, 8, 2),
          });
          if (t.woof > 0) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('woof!', tx, ty - 14);
          }
        } else if (t.kind === 'boarder') {
          drawSprite(ctx, compileSprite(SNOWBOARDER, { flipX: t.vx > 0 }), tx, ty);
        } else {
          drawSprite(ctx, compileSprite(OTHER_SKIER, { flipX: Math.sin(t.phase * 1.6) > 0 }), tx, ty);
        }
      },
    });
  }

  // the skier (with a separated shadow while airborne)
  const vis = skierVisual(sim);
  draws.push({
    y: sim.py + 0.1, // tie-break slightly in front of same-row clutter
    run: () => {
      if (sim.airborne) {
        ctx.fillStyle = 'rgba(90,110,130,0.28)';
        ctx.beginPath();
        ctx.ellipse(PX, PY, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const spr = compileSprite(vis.def, { flipX: vis.flipX });
      const drawY = PY - sim.airZ;
      if (sim.airborne && sim.rotating) {
        ctx.save();
        ctx.translate(PX, drawY - spr.frameHeight / 2);
        ctx.rotate(sim.rotation);
        drawSprite(ctx, spr, 0, spr.frameHeight / 2, { anchor: 'center' });
        ctx.restore();
      } else {
        drawSprite(ctx, spr, PX, drawY);
      }
    },
  });

  for (const y of sim.yetis) {
    const yy = sy(y.y);
    const yx = sx(y.x);
    draws.push({
      y: y.y,
      run: () => {
        const eating = sim.eaten && sim.eatenBy === y;
        const def = eating ? YETI_EAT : YETI_RUN;
        const frame = eating ? animFrame(sim.eatTimer, 3, 2) : animFrame(sim.time, 6, 2);
        drawSprite(ctx, compileSprite(def), eating ? PX : yx, eating ? PY : yy, { frame });
      },
    });
  }

  draws.sort((a, b) => a.y - b.y);
  for (const d of draws) d.run();

  // floating style pops
  ctx.textAlign = 'center';
  for (const p of sim.pops) {
    ctx.globalAlpha = Math.min(1, p.t * 1.5);
    ctx.fillStyle = '#1d5fbf';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(p.text, sx(p.x), sy(p.y) - 24);
  }
  ctx.globalAlpha = 1;

  // banner flash
  if (sim.flash) {
    ctx.globalAlpha = Math.min(1, sim.flash.t * 2);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sim.flash.text, W / 2, 34);
    ctx.globalAlpha = 1;
  }

  // caption under the yeti while it eats
  if (sim.eaten) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, H - 26, W, 26);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('The Abominable Snow Monster got you...', W / 2, H - 9);
  }
}

// ---- persisted bests ----
interface Bests {
  freestyleDist: number;
  freestyleStyle: number;
  slalomTime: number; // 0 == none set
  treeSlalomTime: number;
}

const NO_TIME = 0;

export default function SkiFree({ windowId }: AppComponentProps) {
  void windowId;
  const { getAppPref, setAppPref } = useSettings();

  const [screen, setScreen] = useState<'title' | 'play' | 'eaten' | 'finish'>('title');
  const [mode, setMode] = useState<GameMode>('freestyle');
  const [bests, setBests] = useState<Bests>(() => ({
    freestyleDist: getAppPref<number>(GAME_ID, 'freestyleDist', 0),
    freestyleStyle: getAppPref<number>(GAME_ID, 'freestyleStyle', 0),
    slalomTime: getAppPref<number>(GAME_ID, 'slalomTime', NO_TIME),
    treeSlalomTime: getAppPref<number>(GAME_ID, 'treeSlalomTime', NO_TIME),
  }));

  const [hud, setHud] = useState({ distance: 0, style: 0, time: 0, missed: 0 });
  const [summary, setSummary] = useState({
    distance: 0,
    style: 0,
    time: 0,
    missed: 0,
    placement: 4,
    newBest: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<Sim | null>(null);
  const hungerRef = useRef(0); // survives restarts so the yeti keeps getting faster
  const hudAccumRef = useRef(0);

  const startRun = useCallback(
    (m: GameMode, hunger: number) => {
      const seed = (Date.now() ^ (m.length * 2654435761)) >>> 0;
      simRef.current = createSim(seed, m, hunger);
      hudAccumRef.current = 0;
      setHud({ distance: 0, style: 0, time: 0, missed: 0 });
      setScreen('play');
    },
    [],
  );

  const beginMode = useCallback(
    (m: GameMode) => {
      setMode(m);
      hungerRef.current = 0;
      startRun(m, 0);
    },
    [startRun],
  );

  const restart = useCallback(() => {
    startRun(mode, hungerRef.current);
  }, [mode, startRun]);

  const finishFreestyle = useCallback(
    (sim: Sim) => {
      hungerRef.current = sim.hunger;
      const dist = Math.floor(sim.maxDistanceM);
      const style = Math.floor(sim.style);
      const newDist = dist > bests.freestyleDist;
      const newStyle = style > bests.freestyleStyle;
      if (newDist || newStyle) {
        const next = {
          ...bests,
          freestyleDist: Math.max(bests.freestyleDist, dist),
          freestyleStyle: Math.max(bests.freestyleStyle, style),
        };
        setBests(next);
        if (newDist) setAppPref<number>(GAME_ID, 'freestyleDist', next.freestyleDist);
        if (newStyle) setAppPref<number>(GAME_ID, 'freestyleStyle', next.freestyleStyle);
      }
      setSummary({ distance: dist, style, time: 0, missed: 0, placement: 4, newBest: newDist || newStyle });
      setScreen('eaten');
    },
    [bests, setAppPref],
  );

  const finishSlalom = useCallback(
    (sim: Sim) => {
      const t = sim.finishTime;
      const key = sim.mode === 'slalom' ? 'slalomTime' : 'treeSlalomTime';
      const prev = sim.mode === 'slalom' ? bests.slalomTime : bests.treeSlalomTime;
      const newBest = prev === NO_TIME || t < prev;
      if (newBest) {
        const next = { ...bests, [key]: t } as Bests;
        setBests(next);
        setAppPref<number>(GAME_ID, key, t);
      }
      setSummary({
        distance: Math.floor(sim.distanceM),
        style: 0,
        time: t,
        missed: sim.missedGates,
        placement: slalomPlacement(t),
        newBest,
      });
      setScreen('finish');
    },
    [bests, setAppPref],
  );

  // ---- input ----
  useEffect(() => {
    if (screen !== 'play') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const sim = simRef.current;
      if (!sim) return;
      const k = e.code;
      const handled =
        k === 'ArrowLeft' ||
        k === 'ArrowRight' ||
        k === 'ArrowUp' ||
        k === 'ArrowDown' ||
        k === 'Space' ||
        k === 'KeyF';
      if (handled) e.preventDefault();
      if (sim.eaten || sim.crashed) return;

      if (sim.airborne) {
        if (e.repeat) return;
        switch (k) {
          case 'ArrowUp':
          case 'Space':
            sim.rotating = true;
            break;
          case 'ArrowLeft':
            airTrick(sim, 'left');
            break;
          case 'ArrowRight':
            airTrick(sim, 'right');
            break;
          case 'ArrowDown':
            airTrick(sim, 'down');
            break;
          case 'KeyF':
            airTrick(sim, 'fast');
            break;
        }
        return;
      }

      switch (k) {
        case 'ArrowLeft':
          sim.dirIndex = Math.max(0, sim.dirIndex - 1);
          break;
        case 'ArrowRight':
          sim.dirIndex = Math.min(DIR_ORDER.length - 1, sim.dirIndex + 1);
          break;
        case 'ArrowDown':
          sim.dirIndex = 2;
          break;
        case 'KeyF':
          sim.tuck = true;
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const sim = simRef.current;
      if (!sim) return;
      if (e.code === 'KeyF') sim.tuck = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      const sim = simRef.current;
      const canvas = canvasRef.current;
      if (!sim || !canvas || sim.airborne || sim.crashed || sim.eaten) return;
      const rect = canvas.getBoundingClientRect();
      const cx = ((e.clientX - rect.left) / rect.width) * W;
      const dxFromPlayer = cx - PX;
      const a = Math.abs(dxFromPlayer);
      let idx = 2;
      if (a >= 14 && a < 60) idx = dxFromPlayer < 0 ? 1 : 3;
      else if (a >= 60) idx = dxFromPlayer < 0 ? 0 : 4;
      sim.dirIndex = idx;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const canvas = canvasRef.current;
    canvas?.addEventListener('mousemove', onMouseMove);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas?.removeEventListener('mousemove', onMouseMove);
    };
  }, [screen]);

  // restart shortcut on the game-over / finish cards
  useEffect(() => {
    if (screen !== 'eaten' && screen !== 'finish') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyF') {
        e.preventDefault();
        restart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, restart]);

  // ---- main loop ----
  useGameLoop(
    useCallback(
      (dt: number) => {
        const sim = simRef.current;
        if (!sim) return;
        const wasEnded = sim.ended;
        advance(sim, dt);
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) render(ctx, sim);
        }
        // hand off to a summary card once the run resolves (guard against the
        // trailing frame that can slip through before the loop is torn down)
        if (sim.gameOver && !wasEnded) {
          sim.ended = true;
          finishFreestyle(sim);
          return;
        }
        if (sim.finished && sim.ended && !wasEnded) {
          finishSlalom(sim);
          return;
        }
        hudAccumRef.current += dt;
        if (hudAccumRef.current >= 0.1) {
          hudAccumRef.current = 0;
          setHud({
            distance: Math.floor(sim.distanceM),
            style: Math.floor(sim.style),
            time: sim.time,
            missed: sim.missedGates,
          });
        }
      },
      [finishFreestyle, finishSlalom],
    ),
    screen === 'play',
  );

  const timed = mode !== 'freestyle';

  // ============================ RENDER ============================
  if (screen === 'play') {
    return (
      <div className="flex flex-col h-full bg-[#eef3f7] select-none">
        <div className="flex items-center justify-between px-2 py-1 text-[11px] bg-[#c0c0c0] border-b-2 border-[#808080]">
          <span className="font-bold">{Math.floor(hud.distance)} m</span>
          {timed ? (
            <span className="tabular-nums">
              {hud.time.toFixed(1)}s{hud.missed > 0 && <span className="text-[#b00] ml-1">+{hud.missed * 2}s</span>}
            </span>
          ) : (
            <span className="tabular-nums">Style {hud.style}</span>
          )}
          <span className="opacity-70">{MODE_LABEL[mode]}</span>
        </div>
        <div className="relative flex-1 min-h-0">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="absolute inset-0 w-full h-full"
            style={{ imageRendering: 'pixelated', cursor: 'none' }}
            tabIndex={0}
          />
        </div>
        <div className="flex items-center justify-center gap-3 px-2 py-1 text-[9px] text-[#333] bg-[#c0c0c0] border-t-2 border-[#dfdfdf]">
          <span><b>← →</b> steer</span>
          <span><b>↓</b> point down</span>
          <span><b>F</b> fast</span>
          <span><b>↑/Space</b> flip in air</span>
        </div>
      </div>
    );
  }

  if (screen === 'eaten' || screen === 'finish') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center bg-[#c0c0c0] text-black select-none">
        {screen === 'eaten' ? (
          <>
            <div className="text-[10px] tracking-[2px] text-[#555]">FREE STYLE</div>
            <div className="text-[18px] font-bold">You are lunch.</div>
            <div className="text-[32px] font-black leading-none tabular-nums">{summary.distance} m</div>
            <div className="text-[11px]">Style points: <b>{summary.style}</b></div>
            {summary.newBest && <div className="text-[11px] font-bold text-[#008000]">New personal best!</div>}
            <div className="text-[10px] text-[#444] mt-1">
              Best {bests.freestyleDist} m &middot; {bests.freestyleStyle} style
            </div>
            <div className="text-[11px] text-[#555] mt-2 italic">
              Press <b>F</b> to restart... he is still hungry.
            </div>
          </>
        ) : (
          <>
            <div className="text-[10px] tracking-[2px] text-[#555]">{MODE_LABEL[mode].toUpperCase()} &middot; FINISH</div>
            <div className="text-[32px] font-black leading-none tabular-nums">{summary.time.toFixed(1)}s</div>
            <div className="text-[12px] font-bold">
              {['', '1st', '2nd', '3rd', '4th'][summary.placement] || '4th'} place
            </div>
            <div className="text-[11px]">
              Missed gates: <b>{summary.missed}</b>{summary.missed > 0 && ` (+${summary.missed * 2}s)`}
            </div>
            {summary.newBest && <div className="text-[11px] font-bold text-[#008000]">New best time!</div>}
            <div className="text-[10px] text-[#444] mt-1">
              Best {(mode === 'slalom' ? bests.slalomTime : bests.treeSlalomTime) === NO_TIME
                ? '—'
                : `${(mode === 'slalom' ? bests.slalomTime : bests.treeSlalomTime).toFixed(1)}s`}
            </div>
          </>
        )}
        <div className="flex gap-2 mt-3">
          <Button98 onClick={restart}>Ski Again</Button98>
          <Button98 onClick={() => setScreen('title')}>Main Menu</Button98>
        </div>
      </div>
    );
  }

  // ---- title / mode select (spare, grey, like the original) ----
  return (
    <div className="flex flex-col h-full bg-[#c0c0c0] text-black select-none p-5">
      <div className="text-center mb-4">
        <h1 className="text-[30px] font-black tracking-tight leading-none" style={{ fontFamily: 'sans-serif' }}>
          Ski<span className="text-[#1d5fbf]">Free</span>
        </h1>
        <div className="text-[10px] text-[#555] mt-1">Point downhill. Mind the trees. Outrun the yeti.</div>
      </div>

      <div className="flex flex-col gap-2 max-w-[260px] w-full mx-auto">
        <ModeCard
          label="Free Style"
          desc="Endless run. The yeti wakes at 2,000 m."
          onClick={() => beginMode('freestyle')}
          best={`Best ${bests.freestyleDist} m`}
        />
        <ModeCard
          label="Slalom"
          desc="Thread every gate. Race to 1,500 m."
          onClick={() => beginMode('slalom')}
          best={bests.slalomTime === NO_TIME ? 'No time yet' : `Best ${bests.slalomTime.toFixed(1)}s`}
        />
        <ModeCard
          label="Tree Slalom"
          desc="Gates, but buried in the woods."
          onClick={() => beginMode('tree-slalom')}
          best={bests.treeSlalomTime === NO_TIME ? 'No time yet' : `Best ${bests.treeSlalomTime.toFixed(1)}s`}
        />
      </div>

      <div className="mt-auto text-center text-[9px] text-[#555] pt-3">
        Steer with the arrow keys or the mouse. Hold F for speed.
      </div>
    </div>
  );
}

function ModeCard({
  label,
  desc,
  best,
  onClick,
}: {
  label: string;
  desc: string;
  best: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left px-3 py-2 bg-[#d4d0c8] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#808080] border-r-[#808080]',
        'hover:bg-[#dedad2] active:border-t-[#808080] active:border-l-[#808080] active:border-b-[#ffffff] active:border-r-[#ffffff]',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">{label}</span>
        <span className="text-[9px] text-[#555]">{best}</span>
      </div>
      <div className="text-[10px] text-[#444]">{desc}</div>
    </button>
  );
}
