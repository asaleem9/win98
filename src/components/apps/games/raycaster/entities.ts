// Gameplay state machines kept separate from rendering: sliding doors, the robot
// enemy AI, and pickup application. All of it is deterministic given its inputs
// (the RNG is passed in), so the same logic the game runs at 60fps is what the
// tests drive one tick at a time.

import { randInt, type Rand } from '../engine/rng';
import { WALL } from './texture';
import { AXIS_X, AXIS_Y } from './raycast';

// ---------------------------------------------------------------------------
// Doors
// ---------------------------------------------------------------------------

export type DoorState = 'closed' | 'opening' | 'open' | 'closing';

export interface Door {
  x: number;
  y: number;
  type: number; // WALL.DOOR / DOOR_SILVER / DOOR_GOLD
  axis: number; // AXIS_X | AXIS_Y
  state: DoorState;
  open: number; // 0 shut .. 1 fully retracted
  timer: number; // seconds left before an open door auto-closes
}

export const DOOR_SPEED = 1.6; // open fraction per second
export const DOOR_HOLD = 4; // seconds an open door waits before closing

export function doorKey(type: number): 'silver' | 'gold' | null {
  if (type === WALL.DOOR_SILVER) return 'silver';
  if (type === WALL.DOOR_GOLD) return 'gold';
  return null;
}

/**
 * Begin opening a door if it is not already moving open. Locked doors need the
 * matching keycard. Returns 'opened' if it started/was open, 'locked' if a key
 * is missing, or 'busy' if it is already opening/open.
 */
export function tryOpenDoor(door: Door, keys: { silver: boolean; gold: boolean }): 'opened' | 'locked' | 'busy' {
  const need = doorKey(door.type);
  if (need === 'silver' && !keys.silver) return 'locked';
  if (need === 'gold' && !keys.gold) return 'locked';
  if (door.state === 'open' || door.state === 'opening') {
    door.timer = DOOR_HOLD; // standing near it keeps it open
    return 'busy';
  }
  door.state = 'opening';
  return 'opened';
}

/** Advance a door's slide/auto-close. `blocked` keeps it from shutting on the player. */
export function updateDoor(door: Door, dt: number, blocked: boolean): void {
  switch (door.state) {
    case 'opening':
      door.open += DOOR_SPEED * dt;
      if (door.open >= 1) {
        door.open = 1;
        door.state = 'open';
        door.timer = DOOR_HOLD;
      }
      break;
    case 'open':
      door.timer -= dt;
      if (door.timer <= 0 && !blocked) door.state = 'closing';
      else if (blocked) door.timer = Math.max(door.timer, 0.5);
      break;
    case 'closing':
      door.open -= DOOR_SPEED * dt;
      if (door.open <= 0) {
        door.open = 0;
        door.state = 'closed';
      }
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------

export type EnemyKind = 'sentry' | 'guard' | 'brute';
export type EnemyState = 'patrol' | 'chase' | 'attack' | 'hurt' | 'dead';

export interface EnemyStats {
  hp: number;
  speed: number;
  sight: number;
  attackRange: number;
  fireRate: number; // seconds between shots
  dmgMin: number;
  dmgMax: number;
  accuracy: number; // base hit chance at point blank
  falloff: number; // hit chance lost per unit distance
}

export const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  sentry: { hp: 12, speed: 2.2, sight: 9, attackRange: 6, fireRate: 1.1, dmgMin: 3, dmgMax: 8, accuracy: 0.55, falloff: 0.03 },
  guard: { hp: 22, speed: 1.5, sight: 11, attackRange: 8, fireRate: 1.4, dmgMin: 5, dmgMax: 12, accuracy: 0.6, falloff: 0.025 },
  brute: { hp: 46, speed: 0.9, sight: 10, attackRange: 9, fireRate: 1.9, dmgMin: 8, dmgMax: 18, accuracy: 0.66, falloff: 0.02 },
};

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  hp: number;
  state: EnemyState;
  stateTime: number;
  animTime: number;
  attackCooldown: number;
  hurtTime: number;
  alerted: boolean;
}

const HURT_TIME = 0.28;
const ATTACK_WINDUP = 0.35;
const LOSE_INTEREST = 4; // seconds of no sight before giving up the chase

export function makeEnemy(id: number, kind: EnemyKind, x: number, y: number): Enemy {
  return {
    id,
    kind,
    x,
    y,
    dirX: 1,
    dirY: 0,
    hp: ENEMY_STATS[kind].hp,
    state: 'patrol',
    stateTime: 0,
    animTime: 0,
    attackCooldown: 0,
    hurtTime: 0,
    alerted: false,
  };
}

export interface EnemyContext {
  playerX: number;
  playerY: number;
  playerAlive: boolean;
  canSeePlayer: boolean;
  blocked: (x: number, y: number) => boolean;
  rand: Rand;
}

export interface EnemyAction {
  fired: boolean;
  damage: number; // damage dealt to the player this tick (0 if missed or no shot)
}

const NO_ACTION: EnemyAction = { fired: false, damage: 0 };

// Axis-separated step so an enemy slides along walls instead of sticking.
function moveEnemy(e: Enemy, tx: number, ty: number, speed: number, dt: number, blocked: EnemyContext['blocked']): void {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = e.x + (dx / len) * speed * dt;
  const ny = e.y + (dy / len) * speed * dt;
  if (!blocked(nx, e.y)) e.x = nx;
  if (!blocked(e.x, ny)) e.y = ny;
}

export function updateEnemy(e: Enemy, ctx: EnemyContext, dt: number): EnemyAction {
  if (e.state === 'dead') return NO_ACTION;

  e.animTime += dt;
  e.stateTime += dt;
  if (e.attackCooldown > 0) e.attackCooldown -= dt;

  const stats = ENEMY_STATS[e.kind];
  const dist = Math.hypot(ctx.playerX - e.x, ctx.playerY - e.y);
  const canEngage = ctx.playerAlive && ctx.canSeePlayer && dist <= stats.sight;
  if (canEngage) e.alerted = true;

  switch (e.state) {
    case 'hurt':
      e.hurtTime -= dt;
      if (e.hurtTime <= 0) setState(e, 'chase');
      return NO_ACTION;

    case 'patrol': {
      if (canEngage) {
        setState(e, 'chase');
        return NO_ACTION;
      }
      // Drift forward, turning when the way is blocked.
      const nx = e.x + e.dirX * stats.speed * 0.5 * dt;
      const ny = e.y + e.dirY * stats.speed * 0.5 * dt;
      if (ctx.blocked(nx, ny)) {
        // Turn to a new cardinal direction.
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        const pick = dirs[Math.floor(ctx.rand() * dirs.length)];
        e.dirX = pick[0];
        e.dirY = pick[1];
      } else {
        e.x = nx;
        e.y = ny;
      }
      return NO_ACTION;
    }

    case 'chase': {
      if (canEngage && dist <= stats.attackRange) {
        setState(e, 'attack');
        return NO_ACTION;
      }
      if (!ctx.canSeePlayer && e.stateTime > LOSE_INTEREST) {
        e.alerted = false;
        setState(e, 'patrol');
        return NO_ACTION;
      }
      // Home in on the player's last-known position.
      moveEnemy(e, ctx.playerX, ctx.playerY, stats.speed, dt, ctx.blocked);
      faceToward(e, ctx.playerX, ctx.playerY);
      return NO_ACTION;
    }

    case 'attack': {
      faceToward(e, ctx.playerX, ctx.playerY);
      if (!canEngage || dist > stats.attackRange) {
        setState(e, 'chase');
        return NO_ACTION;
      }
      // Fire once per windup when the weapon has cooled down.
      if (e.stateTime >= ATTACK_WINDUP && e.attackCooldown <= 0) {
        e.attackCooldown = stats.fireRate;
        e.stateTime = 0;
        const chance = Math.max(0.08, stats.accuracy - dist * stats.falloff);
        if (ctx.rand() < chance) {
          return { fired: true, damage: randInt(ctx.rand, stats.dmgMin, stats.dmgMax) };
        }
        return { fired: true, damage: 0 };
      }
      return NO_ACTION;
    }

    default:
      return NO_ACTION;
  }
}

function setState(e: Enemy, state: EnemyState): void {
  e.state = state;
  e.stateTime = 0;
}

function faceToward(e: Enemy, tx: number, ty: number): void {
  const dx = tx - e.x;
  const dy = ty - e.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    e.dirX = Math.sign(dx);
    e.dirY = 0;
  } else {
    e.dirX = 0;
    e.dirY = Math.sign(dy);
  }
}

/** Apply damage to an enemy. Returns true if the hit destroyed it. */
export function damageEnemy(e: Enemy, amount: number): boolean {
  if (e.state === 'dead') return false;
  e.hp -= amount;
  e.alerted = true;
  if (e.hp <= 0) {
    e.hp = 0;
    setState(e, 'dead');
    return true;
  }
  setState(e, 'hurt');
  e.hurtTime = HURT_TIME;
  return false;
}

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------

export type PickupKind = 'medkit' | 'stim' | 'ammo' | 'ammoBox' | 'armor' | 'silverKey' | 'goldKey' | 'treasure';

export interface Pickup {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  taken: boolean;
}

export interface PlayerState {
  hp: number;
  armor: number;
  ammo: number;
  silverKey: boolean;
  goldKey: boolean;
  score: number;
  items: number; // pickups grabbed (for the level tally)
  treasures: number; // treasures grabbed (the "secrets" tally)
}

export const MAX_HP = 100;
export const MAX_ARMOR = 100;
export const MAX_AMMO = 99;

export function makePlayerState(): PlayerState {
  return { hp: MAX_HP, armor: 0, ammo: 8, silverKey: false, goldKey: false, score: 0, items: 0, treasures: 0 };
}

export interface PickupResult {
  player: PlayerState;
  picked: boolean;
  label: string;
  sound: 'health' | 'ammo' | 'key' | 'treasure';
}

/**
 * Fold a pickup into the player state, immutably. `picked` is false when the
 * pickup would do nothing (a medkit at full health), so the caller can leave it
 * on the floor.
 */
export function applyPickup(player: PlayerState, kind: PickupKind): PickupResult {
  const p = { ...player };
  switch (kind) {
    case 'medkit':
      if (player.hp >= MAX_HP) return miss(player);
      p.hp = Math.min(MAX_HP, player.hp + 25);
      p.items += 1;
      p.score += 50;
      return { player: p, picked: true, label: 'Medkit +25', sound: 'health' };
    case 'stim':
      if (player.hp >= MAX_HP) return miss(player);
      p.hp = Math.min(MAX_HP, player.hp + 10);
      p.items += 1;
      p.score += 25;
      return { player: p, picked: true, label: 'Stim +10', sound: 'health' };
    case 'armor':
      if (player.armor >= MAX_ARMOR) return miss(player);
      p.armor = Math.min(MAX_ARMOR, player.armor + 30);
      p.items += 1;
      p.score += 75;
      return { player: p, picked: true, label: 'Armor Plate +30', sound: 'health' };
    case 'ammo':
      if (player.ammo >= MAX_AMMO) return miss(player);
      p.ammo = Math.min(MAX_AMMO, player.ammo + 8);
      p.items += 1;
      return { player: p, picked: true, label: 'Cell Clip +8', sound: 'ammo' };
    case 'ammoBox':
      if (player.ammo >= MAX_AMMO) return miss(player);
      p.ammo = Math.min(MAX_AMMO, player.ammo + 20);
      p.items += 1;
      return { player: p, picked: true, label: 'Cell Crate +20', sound: 'ammo' };
    case 'silverKey':
      p.silverKey = true;
      p.items += 1;
      p.score += 100;
      return { player: p, picked: true, label: 'Silver Keycard', sound: 'key' };
    case 'goldKey':
      p.goldKey = true;
      p.items += 1;
      p.score += 100;
      return { player: p, picked: true, label: 'Gold Keycard', sound: 'key' };
    case 'treasure':
      p.score += 500;
      p.items += 1;
      p.treasures += 1;
      return { player: p, picked: true, label: 'Data Cache +500', sound: 'treasure' };
    default:
      return miss(player);
  }
}

function miss(player: PlayerState): PickupResult {
  return { player, picked: false, label: '', sound: 'health' };
}

/** Split incoming damage between armor (soaks two thirds) and health. */
export function applyDamage(player: PlayerState, amount: number): PlayerState {
  const p = { ...player };
  if (p.armor > 0) {
    const soak = Math.min(p.armor, Math.ceil(amount * 0.66));
    p.armor -= soak;
    amount -= soak;
  }
  p.hp = Math.max(0, p.hp - amount);
  return p;
}

export { AXIS_X, AXIS_Y };
