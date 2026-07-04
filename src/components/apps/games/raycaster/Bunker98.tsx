'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useSettings } from '@/contexts/SettingsContext';
import { Button98 } from '@/components/ui/Button98';
import { cn } from '@/lib/cn';
import { PixelSprite } from '../engine/sprites';
import { makeRng, type Rand } from '../engine/rng';
import { useGameLoop } from '../engine/loop';
import { useWindowActive, PauseVeil } from '../engine/focusPause';
import { buildWallTextures, packRGB, shade, TEX_SIZE, WALL } from './texture';
import { castRay, hasLineOfSight, isSolidPoint, spriteTransform, type RayScene } from './raycast';
import {
  makePlayerState,
  updateDoor,
  tryOpenDoor,
  updateEnemy,
  damageEnemy,
  applyPickup,
  applyDamage,
  ENEMY_STATS,
  type Door,
  type Enemy,
  type Pickup,
  type PlayerState,
} from './entities';
import { LEVELS, makeScene, type ParsedLevel } from './levels';
import { robotSprite, pickupSprite, blasterSprite, enemyFrameIndex, type Billboard } from './sprites';
import { HUD_FACE, HUD_KEY_SILVER, HUD_KEY_GOLD, HUD_AMMO } from '../engine/sprites/raycaster';
import * as SFX from './audio';

const GAME_ID = 'bunker-98';

// Internal render resolution — scaled up crisp by the browser. 320x200 is the
// canonical low-res look the whole genre was built at.
const VIEW_W = 320;
const VIEW_H = 200;

// Movement / camera tuning (world units are tiles).
const MOVE_SPEED = 3.2;
const STRAFE_SPEED = 2.8;
const TURN_SPEED = 2.6; // radians / sec on the keyboard
const MOUSE_SENS = 0.0028;
const PLAYER_R = 0.22;
const FOV_PLANE = 0.66;

const BLAST_DAMAGE = 15;
const FIRE_COOLDOWN = 0.26;
const FOG_DIST = 13;

const KILL_SCORE: Record<string, number> = { sentry: 100, guard: 250, brute: 500 };

// ---------------------------------------------------------------------------
// World — all the mutable, per-frame game state lives in a ref, never in React.
// ---------------------------------------------------------------------------

interface World {
  level: ParsedLevel;
  scene: RayScene;
  doors: Door[];
  doorByTile: Map<number, Door>;
  enemies: Enemy[];
  pickups: Pickup[];
  player: PlayerState;
  posX: number;
  posY: number;
  dirX: number;
  dirY: number;
  planeX: number;
  planeY: number;
  kills: number;
  explored: Uint8Array;
  time: number;
  bob: number;
  // weapon
  weaponFrame: number;
  weaponTimer: number;
  firing: boolean;
  fireCooldown: number;
  // fx
  flash: number;
  message: string;
  messageTimer: number;
  alertTimer: number;
  // outcome
  rand: Rand;
  dead: boolean;
  won: boolean;
  handled: boolean;
}

interface HudState {
  hp: number;
  armor: number;
  ammo: number;
  silver: boolean;
  gold: boolean;
  score: number;
  kills: number;
  totalEnemies: number;
  sector: number;
  face: number;
  message: string;
}

interface ClearStats {
  name: string;
  killPct: number;
  itemPct: number;
  secretPct: number;
  score: number;
}

type Screen = 'title' | 'readthis' | 'play' | 'clear' | 'victory' | 'dead';

function freshSeed(): number {
  return (Math.floor(Math.random() * 0x7fffffff) ^ (Date.now() & 0xffff)) >>> 0;
}

function angleToDir(angle: number): { dirX: number; dirY: number; planeX: number; planeY: number } {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  // Camera plane is perpendicular to the direction, scaled to the field of view.
  return { dirX, dirY, planeX: -dirY * FOV_PLANE, planeY: dirX * FOV_PLANE };
}

function buildWorld(level: ParsedLevel, carry: Partial<PlayerState> | null): World {
  const scene = makeScene(level);
  const doors = level.doors.map((d) => ({ ...d }));
  const doorByTile = new Map<number, Door>();
  for (const d of doors) doorByTile.set(d.y * level.width + d.x, d);
  const enemies = level.enemies.map((e) => ({ ...e }));
  const pickups = level.pickups.map((p) => ({ ...p }));
  const base = makePlayerState();
  const player: PlayerState = carry
    ? { ...base, hp: carry.hp ?? base.hp, armor: carry.armor ?? 0, ammo: carry.ammo ?? base.ammo, score: carry.score ?? 0 }
    : base;
  const cam = angleToDir(level.start.angle);
  return {
    level,
    scene,
    doors,
    doorByTile,
    enemies,
    pickups,
    player,
    posX: level.start.x,
    posY: level.start.y,
    ...cam,
    kills: 0,
    explored: new Uint8Array(level.width * level.height),
    time: 0,
    bob: 0,
    weaponFrame: 0,
    weaponTimer: 0,
    firing: false,
    fireCooldown: 0,
    flash: 0,
    message: 'Sector breached. Clear the bunker.',
    messageTimer: 4,
    alertTimer: 0,
    rand: makeRng(freshSeed()),
    dead: false,
    won: false,
    handled: false,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Bunker98({ windowId }: AppComponentProps) {
  const { getAppPref, setAppPref } = useSettings();
  const windowActive = useWindowActive(windowId);

  const [screen, setScreen] = useState<Screen>('title');
  const [sector, setSector] = useState(0);
  const [hud, setHud] = useState<HudState>(() => emptyHud());
  const [clearStats, setClearStats] = useState<ClearStats | null>(null);
  const [highScore, setHighScore] = useState<number>(() => getAppPref<number>(GAME_ID, 'highScore', 0));
  const [locked, setLocked] = useState(false);

  const worldRef = useRef<World | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const screenRef = useRef<Screen>('title');
  const mapOpenRef = useRef(false);
  const sectorRef = useRef(0);
  const fbRef = useRef<{ img: ImageData; buf: Uint32Array } | null>(null);
  const bgRef = useRef<Uint32Array | null>(null);
  const zRef = useRef<Float32Array>(new Float32Array(VIEW_W));
  const texRef = useRef<Record<number, Uint32Array>>({});

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  useEffect(() => {
    sectorRef.current = sector;
  }, [sector]);

  // Lazily build the textures + framebuffer once (guarded for jsdom, which has
  // no 2d context so getImageData is unavailable).
  const ensureBuffers = useCallback(() => {
    if (!texRef.current[WALL.BRICK]) texRef.current = buildWallTextures();
    if (!bgRef.current) bgRef.current = buildBackground();
    if (!fbRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && typeof ctx.createImageData === 'function') {
        const img = ctx.createImageData(VIEW_W, VIEW_H);
        fbRef.current = { img, buf: new Uint32Array(img.data.buffer) };
      }
    }
  }, []);

  const persistScore = useCallback(
    (score: number) => {
      setHighScore((prev) => {
        const next = Math.max(prev, score);
        if (next !== prev) setAppPref<number>(GAME_ID, 'highScore', next);
        return next;
      });
    },
    [setAppPref],
  );

  const startSector = useCallback(
    (index: number, carry: Partial<PlayerState> | null) => {
      worldRef.current = buildWorld(LEVELS[index], carry);
      mapOpenRef.current = false;
      keysRef.current = {};
      setSector(index);
      setClearStats(null);
      setScreen('play');
      setHud(readHud(worldRef.current));
      requestAnimationFrame(() => wrapRef.current?.focus());
    },
    [],
  );

  // ---- input --------------------------------------------------------------
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (screenRef.current !== 'play') return;
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) e.preventDefault();
      if (k === 'tab') mapOpenRef.current = !mapOpenRef.current;
      if (k === ' ' || k === 'e') interactAhead(worldRef.current);
      if (k === 'control') fire(worldRef.current);
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Pointer-lock mouse look.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (screenRef.current !== 'play' || document.pointerLockElement !== canvasRef.current) return;
      rotate(worldRef.current, e.movementX * MOUSE_SENS);
    };
    const onLockChange = () => setLocked(document.pointerLockElement === canvasRef.current);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('pointerlockchange', onLockChange);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('pointerlockchange', onLockChange);
    };
  }, []);

  const onCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (document.pointerLockElement !== canvasRef.current) {
      canvasRef.current?.requestPointerLock?.();
    } else if (e.button === 0) {
      fire(worldRef.current);
    }
  }, []);

  // ---- main loop ----------------------------------------------------------
  useGameLoop(
    useCallback(
      (dt: number) => {
        const w = worldRef.current;
        if (!w || screenRef.current !== 'play') return;
        ensureBuffers();
        step(w, keysRef.current, dt);
        render(w, canvasRef.current, fbRef.current, bgRef.current, zRef.current, texRef.current, mapOpenRef.current);

        if ((w.dead || w.won) && !w.handled) {
          w.handled = true;
          persistScore(w.player.score);
          if (w.dead) {
            setHud(readHud(w));
            setScreen('dead');
          } else {
            setClearStats(computeStats(w));
            setScreen(sectorRef.current >= LEVELS.length - 1 ? 'victory' : 'clear');
          }
          return;
        }
        setHud(readHud(w));
      },
      [ensureBuffers, persistScore],
    ),
    screen === 'play' && windowActive,
  );

  // F2 restarts the current sector fresh (Windows New Game convention), but only
  // for the focused window so a background game isn't reset by a stray keypress.
  useEffect(() => {
    if (screen !== 'play' || !windowActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'F2') {
        e.preventDefault();
        startSector(sectorRef.current, null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, windowActive, startSector]);

  const carryFrom = (w: World | null): Partial<PlayerState> | null =>
    w ? { hp: Math.max(w.player.hp, 25), armor: w.player.armor, ammo: Math.max(w.player.ammo, 6), score: w.player.score } : null;

  // =========================================================================
  // SCREENS
  // =========================================================================
  if (screen === 'title') {
    return <Title highScore={highScore} onStart={(i) => startSector(i, null)} onReadThis={() => setScreen('readthis')} />;
  }
  if (screen === 'readthis') {
    return <ReadThis onBack={() => setScreen('title')} />;
  }
  if (screen === 'clear' && clearStats) {
    return (
      <IntermissionClear
        stats={clearStats}
        sector={sector}
        onNext={() => startSector(sector + 1, carryFrom(worldRef.current))}
      />
    );
  }
  if (screen === 'victory' && clearStats) {
    return <Victory stats={clearStats} highScore={highScore} onMenu={() => setScreen('title')} />;
  }
  if (screen === 'dead') {
    return (
      <DeathScreen
        score={hud.score}
        onRetry={() => startSector(sector, null)}
        onMenu={() => setScreen('title')}
      />
    );
  }

  // ---- playing ----
  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      className="flex flex-col h-full bg-black outline-none select-none font-[family-name:var(--win98-font)]"
    >
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          onMouseDown={onCanvasMouseDown}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ imageRendering: 'pixelated' }}
        />
        {hud.message && (
          <div className="absolute top-1 left-0 right-0 text-center pointer-events-none">
            <span className="text-[11px] text-[#ffe08a] px-2" style={{ textShadow: '1px 1px 0 #000' }}>
              {hud.message}
            </span>
          </div>
        )}
        {!locked && (
          <div className="absolute bottom-1 right-2 text-[9px] text-white/60 pointer-events-none" style={{ textShadow: '1px 1px 0 #000' }}>
            click to lock mouse · Tab map · F2 restart
          </div>
        )}
        <PauseVeil windowId={windowId} show={!windowActive} />
      </div>
      <StatusBar hud={hud} />
    </div>
  );
}

// ===========================================================================
// GAME STEP (mutates world) — module-scope so input handlers can call it too.
// ===========================================================================

function rotate(w: World | null, angle: number): void {
  if (!w) return;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const { dirX, dirY, planeX, planeY } = w;
  w.dirX = dirX * cos - dirY * sin;
  w.dirY = dirX * sin + dirY * cos;
  w.planeX = planeX * cos - planeY * sin;
  w.planeY = planeX * sin + planeY * cos;
}

function attemptMove(w: World, mx: number, my: number): void {
  const nx = w.posX + mx;
  if (!isSolidPoint(w.scene, nx + Math.sign(mx) * PLAYER_R, w.posY)) w.posX = nx;
  const ny = w.posY + my;
  if (!isSolidPoint(w.scene, w.posX, ny + Math.sign(my) * PLAYER_R)) w.posY = ny;
}

function step(w: World, keys: Record<string, boolean>, dt: number): void {
  w.time += dt;

  // --- movement ---
  const fwd = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0);
  const strafe = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);
  const turn = (keys['arrowright'] ? 1 : 0) - (keys['arrowleft'] ? 1 : 0);
  if (turn) rotate(w, turn * TURN_SPEED * dt);
  let moving = false;
  if (fwd) {
    attemptMove(w, w.dirX * fwd * MOVE_SPEED * dt, w.dirY * fwd * MOVE_SPEED * dt);
    moving = true;
  }
  if (strafe) {
    // Strafe along the unit perpendicular (the normalized camera plane).
    const px = -w.dirY;
    const py = w.dirX;
    attemptMove(w, px * strafe * STRAFE_SPEED * dt, py * strafe * STRAFE_SPEED * dt);
    moving = true;
  }
  // Weapon/head bob accumulates only while walking.
  w.bob = moving ? w.bob + dt * 9 : w.bob * 0.8;

  if (keys['control']) fire(w);

  // --- doors ---
  for (const d of w.doors) {
    const tile = d.y * w.level.width + d.x;
    const blocked = occupantInTile(w, d.x, d.y);
    updateDoor(d, dt, blocked);
    w.scene.doorOpen[tile] = d.open;
  }

  // --- enemies ---
  let alertPlayed = false;
  if (w.alertTimer > 0) w.alertTimer -= dt;
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const wasHunting = e.state === 'chase' || e.state === 'attack';
    const dist = Math.hypot(w.posX - e.x, w.posY - e.y);
    const los = dist <= ENEMY_STATS[e.kind].sight && hasLineOfSight(w.scene, e.x, e.y, w.posX, w.posY);
    const action = updateEnemy(
      e,
      {
        playerX: w.posX,
        playerY: w.posY,
        playerAlive: !w.dead,
        canSeePlayer: los,
        blocked: (x, y) => isSolidPoint(w.scene, x, y),
        rand: w.rand,
      },
      dt,
    );
    if (!wasHunting && (e.state === 'chase' || e.state === 'attack') && !alertPlayed && w.alertTimer <= 0) {
      SFX.sfxAlert();
      alertPlayed = true;
      w.alertTimer = 0.5;
    }
    if (action.fired) {
      SFX.sfxEnemyShot();
      if (action.damage > 0) {
        w.player = applyDamage(w.player, action.damage);
        w.flash = 0.45;
        SFX.sfxHurt();
        if (w.player.hp <= 0) {
          w.dead = true;
          SFX.sfxDeath();
        }
      }
    }
  }

  // --- pickups ---
  for (const p of w.pickups) {
    if (p.taken) continue;
    if (Math.hypot(p.x - w.posX, p.y - w.posY) < 0.5) {
      const result = applyPickup(w.player, p.kind);
      if (!result.picked) continue;
      w.player = result.player;
      p.taken = true;
      flash(w, result.label);
      SFX.sfxPickup(result.sound);
      if (p.kind === 'treasure') SFX.sfxSecret();
    }
  }

  // --- weapon animation ---
  if (w.fireCooldown > 0) w.fireCooldown -= dt;
  if (w.firing) {
    w.weaponTimer += dt;
    const seq = [1, 2, 3, 0];
    const idx = Math.floor(w.weaponTimer / 0.06);
    if (idx >= seq.length) {
      w.firing = false;
      w.weaponFrame = 0;
    } else {
      w.weaponFrame = seq[idx];
    }
  }

  // --- fx decay ---
  if (w.flash > 0) w.flash -= dt;
  if (w.messageTimer > 0) {
    w.messageTimer -= dt;
    if (w.messageTimer <= 0) w.message = '';
  }

  markExplored(w);
}

function occupantInTile(w: World, tx: number, ty: number): boolean {
  if (Math.floor(w.posX) === tx && Math.floor(w.posY) === ty) return true;
  for (const e of w.enemies) if (e.state !== 'dead' && Math.floor(e.x) === tx && Math.floor(e.y) === ty) return true;
  return false;
}

function fire(w: World | null): void {
  if (!w || w.dead || w.firing || w.fireCooldown > 0) return;
  if (w.player.ammo <= 0) {
    SFX.sfxNoAmmo();
    flash(w, 'Out of energy cells!');
    return;
  }
  w.player = { ...w.player, ammo: w.player.ammo - 1 };
  w.firing = true;
  w.weaponTimer = 0;
  w.weaponFrame = 1;
  w.fireCooldown = FIRE_COOLDOWN;
  SFX.sfxBlaster();

  // Hitscan: the enemy whose billboard covers screen centre and is nearest.
  const cam = { posX: w.posX, posY: w.posY, dirX: w.dirX, dirY: w.dirY, planeX: w.planeX, planeY: w.planeY };
  let best: Enemy | null = null;
  let bestDepth = Infinity;
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const { tx, ty } = spriteTransform(cam, e.x, e.y);
    if (ty <= 0.2) continue;
    const screenX = (VIEW_W / 2) * (1 + tx / ty);
    const bill = robotSprite(e.kind);
    const screenH = Math.abs(VIEW_H / ty) * 0.95;
    const screenW = screenH * (bill.w / bill.h);
    if (Math.abs(screenX - VIEW_W / 2) > screenW / 2) continue;
    if (!hasLineOfSight(w.scene, w.posX, w.posY, e.x, e.y)) continue;
    if (ty < bestDepth) {
      bestDepth = ty;
      best = e;
    }
  }
  if (best) {
    const killed = damageEnemy(best, BLAST_DAMAGE);
    if (killed) {
      w.kills += 1;
      w.player = { ...w.player, score: w.player.score + (KILL_SCORE[best.kind] ?? 100) };
      SFX.sfxEnemyDown();
    }
  }
}

function interactAhead(w: World | null): void {
  if (!w || w.dead) return;
  // Probe the tiles just ahead for a door or the exit lift.
  for (const reach of [0.6, 1.1, 1.6]) {
    const tx = Math.floor(w.posX + w.dirX * reach);
    const ty = Math.floor(w.posY + w.dirY * reach);
    if (tx < 0 || ty < 0 || tx >= w.level.width || ty >= w.level.height) continue;
    const cell = w.scene.cells[ty * w.level.width + tx];
    if (cell === WALL.EXIT) {
      w.won = true;
      SFX.sfxExit();
      return;
    }
    const door = w.doorByTile.get(ty * w.level.width + tx);
    if (door) {
      const res = tryOpenDoor(door, { silver: w.player.silverKey, gold: w.player.goldKey });
      if (res === 'opened') {
        SFX.sfxDoor();
      } else if (res === 'locked') {
        SFX.sfxDoorLocked();
        flash(w, door.type === WALL.DOOR_GOLD ? 'Gold keycard required' : 'Silver keycard required');
      }
      return;
    }
  }
}

function flash(w: World, message: string): void {
  w.message = message;
  w.messageTimer = 2.6;
}

function markExplored(w: World): void {
  const r = 4;
  const cx = Math.floor(w.posX);
  const cy = Math.floor(w.posY);
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || y < 0 || x >= w.level.width || y >= w.level.height) continue;
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) w.explored[y * w.level.width + x] = 1;
    }
  }
}

// ===========================================================================
// RENDERING
// ===========================================================================

function buildBackground(): Uint32Array {
  const bg = new Uint32Array(VIEW_W * VIEW_H);
  for (let y = 0; y < VIEW_H; y++) {
    let color: number;
    if (y < VIEW_H / 2) {
      // Ceiling: dark steel, lighter toward the horizon.
      const t = y / (VIEW_H / 2);
      color = packRGB(18 + t * 26, 20 + t * 30, 26 + t * 38);
    } else {
      // Floor: grey, darker toward the horizon then brighter underfoot.
      const t = (y - VIEW_H / 2) / (VIEW_H / 2);
      color = packRGB(30 + t * 44, 30 + t * 42, 34 + t * 40);
    }
    for (let x = 0; x < VIEW_W; x++) bg[y * VIEW_W + x] = color;
  }
  return bg;
}

function fogFactor(dist: number, side: number): number {
  let f = 1 - dist / FOG_DIST;
  if (f < 0.12) f = 0.12;
  else if (f > 1) f = 1;
  if (side === 1) f *= 0.72;
  return f;
}

function render(
  w: World,
  canvas: HTMLCanvasElement | null,
  fb: { img: ImageData; buf: Uint32Array } | null,
  bg: Uint32Array | null,
  z: Float32Array,
  tex: Record<number, Uint32Array>,
  mapOpen: boolean,
): void {
  if (!canvas || !fb || !bg) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const buf = fb.buf;
  buf.set(bg);

  // --- walls ---
  for (let x = 0; x < VIEW_W; x++) {
    const cameraX = (2 * x) / VIEW_W - 1;
    const rdx = w.dirX + w.planeX * cameraX;
    const rdy = w.dirY + w.planeY * cameraX;
    const hit = castRay(w.scene, w.posX, w.posY, rdx, rdy);
    if (!hit) {
      z[x] = Infinity;
      continue;
    }
    const perp = Math.max(0.0001, hit.dist);
    z[x] = perp;
    const lineH = Math.floor(VIEW_H / perp);
    const top = Math.floor(VIEW_H / 2 - lineH / 2);
    const start = Math.max(0, top);
    const end = Math.min(VIEW_H - 1, top + lineH);
    const texture = tex[hit.wall] ?? tex[WALL.BRICK];
    let texX = Math.floor(hit.tex * TEX_SIZE) & (TEX_SIZE - 1);
    if (!hit.door && ((hit.side === 0 && rdx > 0) || (hit.side === 1 && rdy < 0))) texX = TEX_SIZE - 1 - texX;
    const f = fogFactor(perp, hit.side);
    for (let y = start; y <= end; y++) {
      let texY = Math.floor(((y - top) * TEX_SIZE) / lineH);
      if (texY < 0) texY = 0;
      else if (texY >= TEX_SIZE) texY = TEX_SIZE - 1;
      buf[y * VIEW_W + x] = shade(texture[texY * TEX_SIZE + texX], f);
    }
  }

  // --- sprites (enemies + pickups), far to near ---
  drawSprites(w, buf, z);

  // --- weapon overlay ---
  drawWeapon(w, buf);

  ctx.putImageData(fb.img, 0, 0);

  // --- damage flash ---
  if (w.flash > 0) {
    ctx.fillStyle = `rgba(190,24,24,${Math.min(0.5, w.flash)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // --- crosshair ---
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(VIEW_W / 2 - 4, VIEW_H / 2, 8, 1);
  ctx.fillRect(VIEW_W / 2, VIEW_H / 2 - 4, 1, 8);

  if (mapOpen) drawAutomap(ctx, w);
}

interface DrawItem {
  x: number;
  y: number;
  bill: Billboard;
  frame: number;
  vscale: number;
  flashWhite: boolean;
}

function drawSprites(w: World, buf: Uint32Array, z: Float32Array): void {
  const cam = { posX: w.posX, posY: w.posY, dirX: w.dirX, dirY: w.dirY, planeX: w.planeX, planeY: w.planeY };
  const items: DrawItem[] = [];
  for (const e of w.enemies) {
    items.push({
      x: e.x,
      y: e.y,
      bill: robotSprite(e.kind),
      frame: enemyFrameIndex(e.state, e.animTime),
      vscale: 0.95,
      flashWhite: e.state === 'hurt',
    });
  }
  for (const p of w.pickups) {
    if (p.taken) continue;
    items.push({ x: p.x, y: p.y, bill: pickupSprite(p.kind), frame: 0, vscale: 0.42, flashWhite: false });
  }
  // Sort by squared distance, far first.
  items.sort(
    (a, b) =>
      (b.x - w.posX) * (b.x - w.posX) + (b.y - w.posY) * (b.y - w.posY) - ((a.x - w.posX) * (a.x - w.posX) + (a.y - w.posY) * (a.y - w.posY)),
  );

  for (const it of items) {
    const { tx, ty } = spriteTransform(cam, it.x, it.y);
    if (ty <= 0.1) continue;
    const screenX = (VIEW_W / 2) * (1 + tx / ty);
    const fullH = VIEW_H / ty;
    const drawH = Math.floor(fullH * it.vscale);
    const drawW = Math.floor(drawH * (it.bill.w / it.bill.h));
    const floorLine = Math.floor(VIEW_H / 2 + fullH / 2);
    const topY = floorLine - drawH;
    const leftX = Math.floor(screenX - drawW / 2);
    const px = it.bill.frames[it.frame] ?? it.bill.frames[0];
    const f = fogFactor(ty, 0);
    for (let s = 0; s < drawW; s++) {
      const sx = leftX + s;
      if (sx < 0 || sx >= VIEW_W) continue;
      if (ty >= z[sx]) continue; // occluded by a nearer wall
      const texX = Math.floor((s / drawW) * it.bill.w);
      for (let yy = 0; yy < drawH; yy++) {
        const sy = topY + yy;
        if (sy < 0 || sy >= VIEW_H) continue;
        const texY = Math.floor((yy / drawH) * it.bill.h);
        const c = px[texY * it.bill.w + texX];
        if ((c >>> 24) === 0) continue;
        buf[sy * VIEW_W + sx] = it.flashWhite ? 0xffffffff : shade(c, f);
      }
    }
  }
}

function drawWeapon(w: World, buf: Uint32Array): void {
  const bill = blasterSprite();
  const frame = bill.frames[w.weaponFrame] ?? bill.frames[0];
  const scale = (VIEW_H * 0.62) / bill.h;
  const drawW = Math.floor(bill.w * scale);
  const drawH = Math.floor(bill.h * scale);
  const bobX = Math.sin(w.bob) * 5;
  const bobY = Math.abs(Math.cos(w.bob)) * 4;
  const left = Math.floor((VIEW_W - drawW) / 2 + bobX);
  const topY = Math.floor(VIEW_H - drawH + bobY);
  for (let yy = 0; yy < drawH; yy++) {
    const sy = topY + yy;
    if (sy < 0 || sy >= VIEW_H) continue;
    const texY = Math.floor((yy / drawH) * bill.h);
    for (let s = 0; s < drawW; s++) {
      const sx = left + s;
      if (sx < 0 || sx >= VIEW_W) continue;
      const texX = Math.floor((s / drawW) * bill.w);
      const c = frame[texY * bill.w + texX];
      if ((c >>> 24) === 0) continue;
      buf[sy * VIEW_W + sx] = c;
    }
  }
}

function drawAutomap(ctx: CanvasRenderingContext2D, w: World): void {
  const { width, height } = w.level;
  const cell = Math.max(2, Math.floor(Math.min(120 / width, 120 / height)));
  const mapW = width * cell;
  const mapH = height * cell;
  const ox = 6;
  const oy = 6;
  ctx.fillStyle = 'rgba(6,10,14,0.82)';
  ctx.fillRect(ox - 2, oy - 2, mapW + 4, mapH + 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!w.explored[y * width + x]) continue;
      const c = w.scene.cells[y * width + x];
      if (c === WALL.EMPTY) continue;
      if (c === WALL.EXIT) ctx.fillStyle = '#59e07a';
      else if (c === WALL.DOOR || c === WALL.DOOR_SILVER || c === WALL.DOOR_GOLD) ctx.fillStyle = '#e0c24a';
      else ctx.fillStyle = '#6a7686';
      ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    }
  }
  // Player marker + heading.
  const pxp = ox + w.posX * cell;
  const pyp = oy + w.posY * cell;
  ctx.fillStyle = '#ff4040';
  ctx.fillRect(pxp - 1, pyp - 1, 3, 3);
  ctx.strokeStyle = '#ff8080';
  ctx.beginPath();
  ctx.moveTo(pxp, pyp);
  ctx.lineTo(pxp + w.dirX * cell * 1.6, pyp + w.dirY * cell * 1.6);
  ctx.stroke();
}

// ===========================================================================
// HUD READOUT
// ===========================================================================

function emptyHud(): HudState {
  return { hp: 100, armor: 0, ammo: 8, silver: false, gold: false, score: 0, kills: 0, totalEnemies: 0, sector: 0, face: 0 as number, message: '' };
}

function faceForHp(hp: number): number {
  if (hp <= 0) return 3;
  if (hp <= 33) return 2;
  if (hp <= 66) return 1;
  return 0;
}

function readHud(w: World): HudState {
  return {
    hp: Math.max(0, Math.round(w.player.hp)),
    armor: Math.round(w.player.armor),
    ammo: w.player.ammo,
    silver: w.player.silverKey,
    gold: w.player.goldKey,
    score: w.player.score,
    kills: w.kills,
    totalEnemies: w.level.totalEnemies,
    sector: LEVELS.indexOf(w.level),
    face: faceForHp(w.player.hp),
    message: w.message,
  };
}

function computeStats(w: World): ClearStats {
  const pct = (a: number, b: number) => (b === 0 ? 100 : Math.round((a / b) * 100));
  return {
    name: `${w.level.name} — ${w.level.subtitle}`,
    killPct: pct(w.kills, w.level.totalEnemies),
    itemPct: pct(w.player.items, w.level.totalItems),
    secretPct: pct(w.player.treasures, w.level.totalTreasures),
    score: w.player.score,
  };
}

// ===========================================================================
// UI SUB-COMPONENTS
// ===========================================================================

// Seven-segment digit rendered as an SVG so the HUD numerals glow like an
// era-appropriate LED readout.
const SEG_MAP: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgcde',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcfgd',
};

function SevenSeg({ value, digits, color = '#4dff6a' }: { value: number; digits: number; color?: string }) {
  const str = Math.max(0, Math.floor(value)).toString().padStart(digits, '0').slice(-digits);
  return (
    <div className="flex gap-[2px]">
      {str.split('').map((ch, i) => (
        <SegDigit key={i} char={ch} color={color} />
      ))}
    </div>
  );
}

function SegDigit({ char, color }: { char: string; color: string }) {
  const on = new Set((SEG_MAP[char] ?? '').split(''));
  const dim = 'rgba(255,255,255,0.06)';
  const c = (s: string) => (on.has(s) ? color : dim);
  const glow = (s: string) => (on.has(s) ? { filter: 'drop-shadow(0 0 1.5px currentColor)' } : undefined);
  return (
    <svg viewBox="0 0 12 20" width="9" height="15" style={{ color }}>
      <rect x="2.5" y="0.5" width="7" height="2" fill={c('a')} style={glow('a')} />
      <rect x="9.5" y="2.5" width="2" height="6" fill={c('b')} style={glow('b')} />
      <rect x="9.5" y="11" width="2" height="6" fill={c('c')} style={glow('c')} />
      <rect x="2.5" y="17.5" width="7" height="2" fill={c('d')} style={glow('d')} />
      <rect x="0.5" y="11" width="2" height="6" fill={c('e')} style={glow('e')} />
      <rect x="0.5" y="2.5" width="2" height="6" fill={c('f')} style={glow('f')} />
      <rect x="2.5" y="9" width="7" height="2" fill={c('g')} style={glow('g')} />
    </svg>
  );
}

function StatusPanel({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-2 border-x border-[#101418]', className)}>
      <div className="text-[8px] tracking-widest text-[#7d8a63] uppercase mb-[1px]">{label}</div>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

function StatusBar({ hud }: { hud: HudState }) {
  return (
    <div
      className="flex items-stretch h-[62px] border-t-2 border-[#454d38] text-[#c9d4b0]"
      style={{ background: 'linear-gradient(#3a4230,#242a1c)' }}
    >
      <StatusPanel label="Sector">
        <SevenSeg value={hud.sector + 1} digits={1} color="#9fe0ff" />
      </StatusPanel>
      <StatusPanel label="Health">
        <SevenSeg value={hud.hp} digits={3} color={hud.hp <= 33 ? '#ff5a5a' : '#4dff6a'} />
      </StatusPanel>
      <StatusPanel label="Armor">
        <SevenSeg value={hud.armor} digits={3} color="#6ab0ff" />
      </StatusPanel>
      <div className="flex flex-col items-center justify-center px-3 bg-[#1a1e14] border-x-2 border-[#101418]">
        <PixelSprite def={HUD_FACE} frame={hud.face} scale={2} />
      </div>
      <StatusPanel label="Ammo">
        <PixelSprite def={HUD_AMMO} scale={1} />
        <SevenSeg value={hud.ammo} digits={2} color="#ffd24a" />
      </StatusPanel>
      <StatusPanel label="Keys" className="min-w-[46px]">
        <div className="flex flex-col gap-[2px]">
          <div style={{ opacity: hud.silver ? 1 : 0.18 }}>
            <PixelSprite def={HUD_KEY_SILVER} scale={1} />
          </div>
          <div style={{ opacity: hud.gold ? 1 : 0.18 }}>
            <PixelSprite def={HUD_KEY_GOLD} scale={1} />
          </div>
        </div>
      </StatusPanel>
      <StatusPanel label="Score" className="flex-1">
        <SevenSeg value={hud.score} digits={6} color="#ffe08a" />
      </StatusPanel>
    </div>
  );
}

// ---- title -----------------------------------------------------------------

const SECTOR_BLURB = ['Cold Storage — a warm-up patrol.', 'Keycard Vaults — locked and ambushed.', 'Reactor Core — the deep end.'];

function Title({ highScore, onStart, onReadThis }: { highScore: number; onStart: (i: number) => void; onReadThis: () => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex flex-col h-full relative overflow-hidden select-none font-[family-name:var(--win98-font)]">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, #2a1d12 0%, #140d07 55%, #050302 100%)' }} />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,#000 0 2px,transparent 2px 4px)' }}
      />
      <div className="relative z-10 flex flex-col items-center flex-1 p-4 overflow-auto">
        <div className="mt-2 text-[10px] tracking-[6px] text-[#b06a2a]">STEEL DAWN PRESENTS</div>
        <h1
          className="text-[46px] font-black leading-none tracking-tighter"
          style={{
            fontFamily: 'Impact, "Arial Black", sans-serif',
            background: 'linear-gradient(#ffd27a,#e8892a 45%,#7a2f10)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(2px 3px 0 #200) drop-shadow(0 0 14px rgba(232,137,42,0.35))',
          }}
        >
          BUNKER 98
        </h1>
        <div className="text-[11px] tracking-[3px] text-[#caa06a] mb-3">3D COMBAT · EPISODE ONE</div>

        <div className="text-[10px] text-[#9a8460] mb-1 tracking-widest">SELECT A SECTOR</div>
        <div className="flex flex-col gap-[3px] w-[280px]">
          {LEVELS.map((lvl, i) => (
            <button
              key={lvl.name}
              onMouseEnter={() => setHover(i)}
              onClick={() => onStart(i)}
              className="flex items-center gap-3 px-3 py-[7px] text-left border cursor-pointer transition-colors"
              style={{
                background: hover === i ? 'linear-gradient(90deg,rgba(232,137,42,0.28),transparent)' : 'rgba(0,0,0,0.25)',
                borderColor: hover === i ? '#c0722c' : '#3a2a18',
                color: hover === i ? '#ffcf8a' : '#a08860',
              }}
            >
              <span className="text-[22px] font-black w-6 text-center" style={{ fontFamily: 'Impact, sans-serif' }}>
                {i + 1}
              </span>
              <span>
                <span className="block font-bold text-[13px]">{lvl.name}</span>
                <span className="block text-[9px] opacity-70">{SECTOR_BLURB[i]}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <Button98 onClick={onReadThis}>Read This!</Button98>
          <Button98 onClick={() => onStart(0)}>New Game</Button98>
        </div>
        <div className="mt-3 text-[10px] text-[#8a6a3a]">
          HIGH SCORE <span className="text-[#ffd27a] font-bold tabular-nums">{highScore.toLocaleString()}</span>
        </div>
        <div className="mt-auto pt-3 text-[9px] text-[#5a4326]">Move WASD · Turn ←→/mouse · Fire Ctrl/click · Use E/Space · Map Tab</div>
      </div>
    </div>
  );
}

function ReadThis({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col h-full bg-[#0d0a06] text-[#d8c49a] font-[family-name:var(--win98-font)] p-4 overflow-auto">
      <div className="text-[16px] font-black tracking-wide text-[#ffcf8a] mb-2" style={{ fontFamily: 'Impact, sans-serif' }}>
        READ THIS!
      </div>
      <div className="text-[11px] leading-relaxed space-y-2 max-w-[440px]">
        <p>
          <b className="text-[#ffcf8a]">Congratulations, operative.</b> You have been sealed inside Bunker 98 with a prototype energy blaster and
          a bad attitude. The maintenance drones have, regrettably, gone hostile.
        </p>
        <p>
          <b>Objective:</b> reach the exit lift in each sector. Some are behind locked blast doors — find the matching{' '}
          <span className="text-[#e8ebf2]">silver</span> or <span className="text-[#ffe08a]">gold</span> keycard first.
        </p>
        <p>
          <b>Controls:</b> WASD to move, A/D strafe, arrows or the mouse to turn, <b>Ctrl</b> or click to fire, <b>E</b>/<b>Space</b> to open
          doors and throw the exit lever, <b>Tab</b> for the map.
        </p>
        <p>
          <b>Pro tip:</b> data caches are worth a fortune and count toward your secret rating. Nobody has to know you took the scenic route.
        </p>
        <p className="text-[#9a8460] italic">This page intentionally contains 100% more registration reminders than the original manuals.</p>
      </div>
      <div className="mt-4">
        <Button98 onClick={onBack}>Back</Button98>
      </div>
    </div>
  );
}

function StatRow({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center gap-2 w-[240px]">
      <span className="w-[70px] text-[11px] text-[#caa06a] uppercase tracking-wide">{label}</span>
      <div className="flex-1 h-[10px] bg-black/60 border border-[#3a2a18] overflow-hidden">
        <div className="h-full transition-[width] duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#7a2f10,#ffcf5a)' }} />
      </div>
      <span className="w-[34px] text-right text-[12px] text-[#ffd27a] font-bold tabular-nums">{pct}%</span>
    </div>
  );
}

function IntermissionClear({ stats, sector, onNext }: { stats: ClearStats; sector: number; onNext: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center select-none"
      style={{ background: 'radial-gradient(ellipse at center,#1e2415,#0a0d06)' }}
    >
      <div className="text-[10px] tracking-[4px] text-[#8aa060]">SECTOR CLEARED</div>
      <div className="text-[15px] font-black text-[#ffcf8a]" style={{ fontFamily: 'Impact, sans-serif' }}>
        {stats.name}
      </div>
      <div className="flex flex-col gap-2 my-2">
        <StatRow label="Kills" pct={stats.killPct} />
        <StatRow label="Items" pct={stats.itemPct} />
        <StatRow label="Secrets" pct={stats.secretPct} />
      </div>
      <div className="text-[11px] text-[#caa06a]">
        Score <span className="text-[#ffd27a] font-bold text-[15px] tabular-nums">{stats.score.toLocaleString()}</span>
      </div>
      <Button98 onClick={onNext} className="mt-2">
        Descend to Sector {sector + 2}
      </Button98>
    </div>
  );
}

function Victory({ stats, highScore, onMenu }: { stats: ClearStats; highScore: number; onMenu: () => void }) {
  const newBest = stats.score >= highScore;
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center select-none"
      style={{ background: 'radial-gradient(ellipse at center,#2a1d12,#0a0503)' }}
    >
      <div className="text-[10px] tracking-[5px] text-[#b06a2a]">BUNKER 98 SECURED</div>
      <div className="text-[30px] font-black leading-none" style={{ fontFamily: 'Impact, sans-serif', color: '#ffcf8a', textShadow: '2px 2px 0 #200' }}>
        MISSION COMPLETE
      </div>
      <p className="text-[11px] text-[#caa06a] max-w-[380px] leading-relaxed">
        The last drone sparks and topples. The reactor stabilizes. You step into the lift as the sirens fade — another day, another bunker
        cleared.
      </p>
      <div className="text-[13px] text-[#ffd27a] font-bold tabular-nums mt-1">FINAL SCORE {stats.score.toLocaleString()}</div>
      {newBest && <div className="text-[11px] text-[#4dff6a] font-bold animate-pulse">NEW HIGH SCORE!</div>}
      <Button98 onClick={onMenu} className="mt-2">
        Main Menu
      </Button98>
    </div>
  );
}

function DeathScreen({ score, onRetry, onMenu }: { score: number; onRetry: () => void; onMenu: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center select-none" style={{ background: 'radial-gradient(ellipse at center,#3a0d0d,#0a0303)' }}>
      <div className="text-[34px] font-black" style={{ fontFamily: 'Impact, sans-serif', color: '#ff5a5a', textShadow: '2px 2px 0 #200' }}>
        YOU DIED
      </div>
      <p className="text-[11px] text-[#e0a0a0]">The drones reclaim the bunker. Your suit goes dark.</p>
      <div className="text-[11px] text-[#caa06a]">
        Score <span className="text-[#ffd27a] font-bold tabular-nums">{score.toLocaleString()}</span>
      </div>
      <div className="flex gap-2 mt-2">
        <Button98 onClick={onRetry}>Retry Sector</Button98>
        <Button98 onClick={onMenu}>Main Menu</Button98>
      </div>
    </div>
  );
}
