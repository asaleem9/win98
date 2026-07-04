// Billboard art for the raycaster, drawn procedurally into flat RGBA buffers so
// the sprite caster can sample a texel per screen column. Everything is built
// once and cached; transparent pixels are left as 0 (alpha 0) and skipped when
// blitting. Kept pure and DOM-free — the generators only touch typed arrays.

import { packRGB, shade } from './texture';
import type { EnemyKind, EnemyState, PickupKind } from './entities';

export interface Billboard {
  w: number;
  h: number;
  frames: Uint32Array[]; // each w*h, packed 0xAABBGGRR, 0 = transparent
}

// -- drawing primitives ------------------------------------------------------

function blank(w: number, h: number): Uint32Array {
  return new Uint32Array(w * h);
}

function px(buf: Uint32Array, w: number, x: number, y: number, c: number): void {
  if (x < 0 || y < 0 || x >= w || y * w + x >= buf.length) return;
  buf[y * w + x] = c;
}

function rectF(buf: Uint32Array, w: number, x0: number, y0: number, rw: number, rh: number, c: number): void {
  for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) px(buf, w, x, y, c);
}

// Filled ellipse — the workhorse for domes, eyes and treads.
function disc(buf: Uint32Array, w: number, cx: number, cy: number, rx: number, ry: number, c: number): void {
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) px(buf, w, cx + x, cy + y, c);
    }
  }
}

// A vertical light/shadow bevel over an already-filled column band.
function shadeColumn(buf: Uint32Array, w: number, h: number, x0: number, x1: number, lightF: number, darkF: number): void {
  for (let y = 0; y < h; y++) {
    const l = buf[y * w + x0];
    if (l) px(buf, w, x0, y, shade(l, lightF));
    const r = buf[y * w + x1];
    if (r) px(buf, w, x1, y, shade(r, darkF));
  }
}

// Random-but-deterministic spark/scorch scatter for destroyed frames.
function scorch(buf: Uint32Array, w: number, h: number, n: number, seed: number): void {
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd() * w);
    const y = Math.floor(h * 0.4 + rnd() * h * 0.6);
    px(buf, w, x, y, rnd() < 0.5 ? packRGB(40, 36, 34) : packRGB(90, 80, 74));
  }
}

// ---------------------------------------------------------------------------
// Robots — each is 5 frames: walk0, walk1, walk2, attack, destroyed.
// ---------------------------------------------------------------------------

const RW = 28;
const RH = 46;

function sentry(frame: number): Uint32Array {
  const buf = blank(RW, RH);
  const dead = frame === 4;
  const attack = frame === 3;
  const bob = dead ? 6 : [0, -1, 0][frame] ?? 0;
  const cy = 20 + bob;
  const body = packRGB(70, 78, 92);
  const bodyLo = shade(body, 0.7);
  const trim = packRGB(120, 130, 150);
  // Hover orb.
  disc(buf, RW, 14, cy, 9, 8, body);
  disc(buf, RW, 14, cy - 2, 9, 5, shade(body, 1.15));
  disc(buf, RW, 14, cy + 4, 8, 3, bodyLo);
  rectF(buf, RW, 5, cy, 18, 2, trim);
  // Side thruster pods.
  disc(buf, RW, 4, cy + 1, 2, 3, bodyLo);
  disc(buf, RW, 24, cy + 1, 2, 3, bodyLo);
  // Single scanning eye.
  const eye = dead ? packRGB(60, 60, 60) : attack ? packRGB(255, 200, 120) : packRGB(90, 220, 255);
  disc(buf, RW, 14, cy, 4, 3, packRGB(20, 24, 30));
  disc(buf, RW, 14, cy, 3, 2, eye);
  px(buf, RW, 13, cy - 1, packRGB(255, 255, 255));
  if (attack) {
    // Muzzle glow beneath the eye.
    disc(buf, RW, 14, cy + 7, 3, 2, packRGB(255, 230, 150));
    rectF(buf, RW, 13, cy + 8, 2, 5, packRGB(255, 200, 100));
  }
  // Thruster flame flicker while alive.
  if (!dead) {
    const flick = frame % 2 === 0 ? packRGB(120, 200, 255) : packRGB(80, 150, 220);
    disc(buf, RW, 14, cy + 9, 3, 2 + (frame % 2), flick);
  } else {
    scorch(buf, RW, RH, 26, 11);
    // Cracked, tilted shell already low; add a dark seam.
    rectF(buf, RW, 8, cy - 1, 12, 1, packRGB(30, 30, 34));
  }
  shadeColumn(buf, RW, RH, 6, 22, 1.18, 0.72);
  return buf;
}

function guard(frame: number): Uint32Array {
  const buf = blank(RW, RH);
  const dead = frame === 4;
  const attack = frame === 3;
  const steel = packRGB(120, 126, 138);
  const steelLo = shade(steel, 0.68);
  const dark = packRGB(60, 64, 74);
  if (dead) {
    // Collapsed heap.
    rectF(buf, RW, 4, 36, 20, 8, steelLo);
    rectF(buf, RW, 7, 32, 14, 6, steel);
    disc(buf, RW, 12, 33, 4, 3, dark);
    disc(buf, RW, 12, 33, 2, 1, packRGB(120, 40, 40));
    scorch(buf, RW, RH, 30, 23);
    return buf;
  }
  const step = [0, 1, -1][frame] ?? 0;
  // Legs (alternate with the walk step).
  rectF(buf, RW, 8 - step, 34, 4, 10, dark);
  rectF(buf, RW, 16 + step, 34, 4, 10, dark);
  rectF(buf, RW, 7 - step, 42, 6, 2, packRGB(40, 42, 48));
  rectF(buf, RW, 15 + step, 42, 6, 2, packRGB(40, 42, 48));
  // Torso.
  rectF(buf, RW, 6, 18, 16, 18, steel);
  rectF(buf, RW, 6, 18, 16, 3, shade(steel, 1.2));
  rectF(buf, RW, 6, 33, 16, 3, steelLo);
  rectF(buf, RW, 12, 20, 4, 14, dark); // chest seam
  // Shoulders + arm cannon.
  rectF(buf, RW, 3, 19, 4, 6, steelLo);
  rectF(buf, RW, 21, 19, 4, 6, steelLo);
  rectF(buf, RW, 1, 24, 5, 4, dark); // cannon barrel
  if (attack) {
    rectF(buf, RW, 0, 25, 2, 2, packRGB(255, 220, 130));
    disc(buf, RW, 1, 26, 3, 2, packRGB(255, 180, 90));
  }
  // Head + visor.
  rectF(buf, RW, 9, 10, 10, 9, steel);
  rectF(buf, RW, 9, 10, 10, 2, shade(steel, 1.25));
  rectF(buf, RW, 10, 13, 8, 3, packRGB(20, 22, 26));
  const visor = attack ? packRGB(255, 120, 90) : packRGB(230, 70, 70);
  rectF(buf, RW, 11, 14, 6, 1, visor);
  px(buf, RW, 12, 14, packRGB(255, 200, 180));
  shadeColumn(buf, RW, RH, 6, 21, 1.15, 0.74);
  return buf;
}

function brute(frame: number): Uint32Array {
  const buf = blank(RW, RH);
  const dead = frame === 4;
  const attack = frame === 3;
  const armor = packRGB(78, 96, 70);
  const armorLo = shade(armor, 0.66);
  const armorHi = shade(armor, 1.2);
  const dark = packRGB(40, 48, 38);
  if (dead) {
    rectF(buf, RW, 2, 34, 24, 10, armorLo);
    rectF(buf, RW, 5, 30, 18, 6, armor);
    disc(buf, RW, 20, 30, 3, 3, packRGB(120, 40, 40));
    scorch(buf, RW, RH, 40, 37);
    // Smoke puffs.
    disc(buf, RW, 10, 24, 4, 3, packRGB(70, 70, 74));
    disc(buf, RW, 14, 20, 3, 2, packRGB(90, 90, 94));
    return buf;
  }
  const tread = frame % 2;
  // Tracked base.
  rectF(buf, RW, 2, 36, 24, 8, dark);
  for (let x = 3 + tread; x < 26; x += 4) rectF(buf, RW, x, 37, 2, 6, armorLo);
  rectF(buf, RW, 2, 36, 24, 1, armorHi);
  // Wide armored hull.
  rectF(buf, RW, 4, 20, 20, 16, armor);
  rectF(buf, RW, 4, 20, 20, 3, armorHi);
  rectF(buf, RW, 4, 33, 20, 3, armorLo);
  rectF(buf, RW, 6, 24, 16, 8, shade(armor, 0.85));
  // Rivets.
  for (const [rx, ry] of [[6, 22], [21, 22], [6, 34], [21, 34]] as const) disc(buf, RW, rx, ry, 1, 1, armorHi);
  // Twin cannons.
  rectF(buf, RW, 1, 25, 5, 3, dark);
  rectF(buf, RW, 22, 25, 5, 3, dark);
  if (attack) {
    disc(buf, RW, 1, 26, 3, 2, packRGB(255, 200, 110));
    disc(buf, RW, 26, 26, 3, 2, packRGB(255, 200, 110));
  }
  // Sensor head.
  rectF(buf, RW, 10, 13, 8, 8, shade(armor, 0.9));
  rectF(buf, RW, 10, 13, 8, 2, armorHi);
  const eye = attack ? packRGB(255, 160, 90) : packRGB(255, 90, 60);
  rectF(buf, RW, 11, 16, 6, 2, eye);
  shadeColumn(buf, RW, RH, 4, 23, 1.12, 0.76);
  return buf;
}

const ROBOTS: Record<EnemyKind, (frame: number) => Uint32Array> = { sentry, guard, brute };

function buildRobot(kind: EnemyKind): Billboard {
  return { w: RW, h: RH, frames: [0, 1, 2, 3, 4].map((f) => ROBOTS[kind](f)) };
}

/** Frame index for an enemy given its state and animation clock. */
export function enemyFrameIndex(state: EnemyState, animTime: number): number {
  if (state === 'dead') return 4;
  if (state === 'attack') return 3;
  if (state === 'hurt') return 1;
  return Math.floor(animTime * 6) % 3; // walk cycle
}

// ---------------------------------------------------------------------------
// Pickups — single 16x16 frame each.
// ---------------------------------------------------------------------------

const PW = 16;

function medkit(): Uint32Array {
  const b = blank(PW, PW);
  rectF(b, PW, 2, 4, 12, 9, packRGB(230, 230, 235));
  rectF(b, PW, 2, 4, 12, 2, packRGB(255, 255, 255));
  rectF(b, PW, 2, 11, 12, 2, packRGB(180, 180, 186));
  rectF(b, PW, 6, 6, 4, 5, packRGB(210, 50, 50)); // cross V
  rectF(b, PW, 4, 7, 8, 2, packRGB(210, 50, 50)); // cross H
  rectF(b, PW, 5, 3, 6, 2, packRGB(80, 82, 90)); // handle
  return b;
}

function stim(): Uint32Array {
  const b = blank(PW, PW);
  rectF(b, PW, 6, 2, 4, 11, packRGB(210, 220, 230));
  rectF(b, PW, 6, 5, 4, 6, packRGB(90, 200, 120)); // fluid
  rectF(b, PW, 5, 2, 6, 1, packRGB(150, 156, 170));
  rectF(b, PW, 7, 13, 2, 3, packRGB(180, 186, 200)); // needle
  return b;
}

function ammo(): Uint32Array {
  const b = blank(PW, PW);
  rectF(b, PW, 4, 3, 8, 10, packRGB(60, 90, 150)); // cell
  rectF(b, PW, 4, 3, 8, 2, packRGB(110, 150, 220));
  rectF(b, PW, 6, 1, 4, 2, packRGB(200, 200, 90)); // terminal
  rectF(b, PW, 5, 6, 6, 1, packRGB(120, 200, 255));
  rectF(b, PW, 5, 9, 6, 1, packRGB(120, 200, 255));
  return b;
}

function ammoBox(): Uint32Array {
  const b = blank(PW, PW);
  rectF(b, PW, 2, 5, 12, 9, packRGB(70, 76, 66));
  rectF(b, PW, 2, 5, 12, 2, packRGB(100, 108, 96));
  rectF(b, PW, 2, 12, 12, 2, packRGB(48, 52, 46));
  rectF(b, PW, 6, 7, 4, 5, packRGB(200, 200, 90)); // cell icon
  rectF(b, PW, 7, 5, 2, 2, packRGB(90, 96, 86));
  return b;
}

function armor(): Uint32Array {
  const b = blank(PW, PW);
  // Chest plate silhouette.
  for (let y = 0; y < PW; y++) {
    for (let x = 0; x < PW; x++) {
      const w2 = 6 - Math.floor(y / 3);
      if (y >= 2 && y <= 13 && x >= 8 - w2 && x <= 7 + w2) px(b, PW, x, y, packRGB(70, 120, 160));
    }
  }
  rectF(b, PW, 5, 2, 6, 2, packRGB(120, 180, 220));
  rectF(b, PW, 7, 5, 2, 6, packRGB(150, 200, 240));
  return b;
}

function keycard(tint: number, hi: number): Uint32Array {
  const b = blank(PW, PW);
  rectF(b, PW, 3, 4, 10, 8, tint);
  rectF(b, PW, 3, 4, 10, 2, hi);
  rectF(b, PW, 5, 7, 6, 3, packRGB(30, 32, 38)); // magnetic strip
  rectF(b, PW, 10, 5, 2, 2, packRGB(240, 240, 240)); // chip
  return b;
}

function treasure(): Uint32Array {
  const b = blank(PW, PW);
  // Glowing data cache / crystal.
  disc(b, PW, 8, 8, 6, 6, packRGB(40, 60, 90));
  disc(b, PW, 8, 8, 4, 5, packRGB(120, 200, 255));
  disc(b, PW, 8, 7, 2, 3, packRGB(220, 245, 255));
  rectF(b, PW, 2, 8, 12, 1, packRGB(180, 230, 255));
  rectF(b, PW, 8, 2, 1, 12, packRGB(180, 230, 255));
  return b;
}

const PICKUPS: Record<PickupKind, () => Uint32Array> = {
  medkit,
  stim,
  ammo,
  ammoBox,
  armor,
  silverKey: () => keycard(packRGB(190, 194, 205), packRGB(235, 238, 245)),
  goldKey: () => keycard(packRGB(220, 180, 60), packRGB(255, 225, 120)),
  treasure,
};

function buildPickup(kind: PickupKind): Billboard {
  return { w: PW, h: PW, frames: [PICKUPS[kind]()] };
}

// ---------------------------------------------------------------------------
// Player blaster — a foreground overlay, not a billboard. 64x44, four frames:
// idle, then a three-step recoil/flash cycle.
// ---------------------------------------------------------------------------

const GW = 64;
const GH = 44;

function blaster(frame: number): Uint32Array {
  const b = blank(GW, GH);
  const recoil = [0, 6, 3, 1][frame] ?? 0;
  const yo = recoil;
  const metal = packRGB(96, 102, 114);
  const metalHi = shade(metal, 1.25);
  const metalLo = shade(metal, 0.6);
  const glove = packRGB(150, 120, 80);
  const gloveLo = shade(glove, 0.7);
  // Barrel housing rising from the bottom centre.
  rectF(b, GW, 24, 16 + yo, 16, 28, metal);
  rectF(b, GW, 24, 16 + yo, 3, 28, metalHi);
  rectF(b, GW, 37, 16 + yo, 3, 28, metalLo);
  rectF(b, GW, 27, 12 + yo, 10, 6, shade(metal, 0.85));
  // Emitter ring at the muzzle.
  rectF(b, GW, 28, 9 + yo, 8, 4, metalLo);
  rectF(b, GW, 30, 8 + yo, 4, 2, packRGB(60, 66, 78));
  // Gloved fists gripping either side.
  rectF(b, GW, 16, 26 + yo, 10, 14, glove);
  rectF(b, GW, 16, 26 + yo, 10, 2, shade(glove, 1.2));
  for (let i = 0; i < 4; i++) rectF(b, GW, 17, 28 + i * 3 + yo, 8, 1, gloveLo);
  rectF(b, GW, 38, 26 + yo, 10, 14, glove);
  rectF(b, GW, 38, 26 + yo, 10, 2, shade(glove, 1.2));
  for (let i = 0; i < 4; i++) rectF(b, GW, 39, 28 + i * 3 + yo, 8, 1, gloveLo);
  // Charge indicator.
  const lamp = frame === 0 ? packRGB(80, 200, 255) : packRGB(255, 220, 140);
  rectF(b, GW, 30, 20 + yo, 4, 2, lamp);
  // Muzzle flash on the fire frames.
  if (frame === 1 || frame === 2) {
    const big = frame === 1;
    disc(b, GW, 32, 7 + yo, big ? 11 : 7, big ? 9 : 6, packRGB(255, 240, 170));
    disc(b, GW, 32, 7 + yo, big ? 7 : 4, big ? 6 : 4, packRGB(255, 255, 220));
    // Bolt streak upward.
    rectF(b, GW, 31, 0, 2, 8 + yo, packRGB(180, 235, 255));
  }
  return b;
}

function buildBlaster(): Billboard {
  return { w: GW, h: GH, frames: [0, 1, 2, 3].map(blaster) };
}

// ---------------------------------------------------------------------------
// Cached accessors.
// ---------------------------------------------------------------------------

const robotCache: Partial<Record<EnemyKind, Billboard>> = {};
const pickupCache: Partial<Record<PickupKind, Billboard>> = {};
let blasterCache: Billboard | null = null;

export function robotSprite(kind: EnemyKind): Billboard {
  return (robotCache[kind] ??= buildRobot(kind));
}

export function pickupSprite(kind: PickupKind): Billboard {
  return (pickupCache[kind] ??= buildPickup(kind));
}

export function blasterSprite(): Billboard {
  return (blasterCache ??= buildBlaster());
}
