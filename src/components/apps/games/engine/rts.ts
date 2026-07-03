// Config-driven real-time-strategy sim shared by StarCraft, Command & Conquer,
// and Age of Empires II. The three games are described entirely by an RtsConfig:
// a roster of unit and building types, a tech tree, resources, a scripted enemy
// AI, and an optional superweapon. The rules live here. This module is
// deliberately free of React and canvas so it can be unit-tested and so the RAF
// loop can mutate a single state object each frame without re-rendering.

import type { SpriteDef } from './sprites/sprite';
import type { FactionName } from './sprites/palettes';

export type Owner = 'player' | 'enemy';
export type UnitRole = 'worker' | 'combat';

/** Per-resource amounts, keyed by resource id (e.g. { minerals: 50 }). */
export type ResourceBag = Record<string, number>;

export interface ResourceDef {
  id: string;
  name: string;
  color: string;
}

export interface UnitTypeDef {
  name: string;
  hp: number;
  speed: number;
  damage: number;
  range: number;
  rate: number; // seconds between attacks
  cost: ResourceBag;
  supply: number;
  role: UnitRole;
  trainedAt: string; // building typeId that produces this unit
  sightRange: number;
  splashRadius?: number;
  healPerSec?: number;
  requiresUpgrade?: string; // upgrade id that must be researched first
  sprite?: SpriteDef;
}

export interface BuildingTypeDef {
  name: string;
  hp: number;
  cost: ResourceBag;
  size?: { w: number; h: number };
  supplyGrant?: number;
  isBase?: boolean;
  attack?: { damage: number; range: number; rate: number };
  requiresUpgrade?: string;
  buildTimeSec: number;
  sightRange?: number;
  // A building that, once placed, seeds a harvestable patch of this resource at
  // its own location (Age of Empires farms).
  farmYieldsResource?: string;
  farmAmount?: number;
  sprite?: SpriteDef;
}

export interface UpgradeDef {
  id: string;
  name: string;
  cost: ResourceBag;
  researchTimeSec: number;
  researchAt: string; // building typeId that researches it
  prereqBuilding?: string;
  prereqUpgrade?: string;
  effects: { unitTypeId: string; hpMult?: number; dmgMult?: number }[];
  unlocksUnits?: string[];
  announce?: string;
}

export interface AiWave {
  atSec: number;
  comp: Record<string, number>; // unit typeId -> count
  target: 'base' | 'workers';
}

export interface AiConfig {
  personality: 'swarm' | 'harass' | 'boom';
  buildOrder: { atSec: number; buildingTypeId: string }[];
  attackWaves: AiWave[];
  rampFactor: number; // wave sizes grow by this each time after the scripted list
}

export interface SuperweaponConfig {
  name: string;
  cooldownSec: number;
  damage: number;
  radius: number;
  color: string;
}

export interface RtsConfig {
  gameId: string;
  resources: ResourceDef[];
  startResources: ResourceBag;
  unitTypes: Record<string, UnitTypeDef>;
  buildingTypes: Record<string, BuildingTypeDef>;
  upgrades?: UpgradeDef[];
  colors: {
    player: string;
    enemy: string;
    terrain: string;
    grid: string;
  };
  factions?: { player: FactionName; enemy: FactionName };
  startSupply: number;
  aggroRange: number;
  harvestAmount: number;
  harvestTime: number; // seconds to fill cargo
  map: {
    width: number;
    height: number;
    playerBase: { x: number; y: number };
    enemyBase: { x: number; y: number };
    patches: { x: number; y: number; amount: number; resourceId: string }[];
    patchRegrows?: boolean;
    patchRegrowRate?: number; // resource per second toward the original amount
  };
  startUnits: { typeId: string; count: number }[];
  enemyStartUnits?: { typeId: string; count: number }[];
  fogOfWar?: boolean; // default true
  ai: AiConfig;
  superweapon?: SuperweaponConfig;
  winText: string;
  loseText: string;
}

export interface Unit {
  id: number;
  owner: Owner;
  typeId: string;
  role: UnitRole;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mx: number | null; // move target
  my: number | null;
  attackId: number | null; // unit or building id we're attacking
  cooldown: number;
  cargo: number;
  cargoResource: string | null;
  patchId: number | null;
  phase: 'idle' | 'toPatch' | 'mining' | 'toBase';
  mineTimer: number;
  // enemy wave units: where to march and what to hunt
  orderTarget?: 'base' | 'workers';
}

export interface Building {
  id: number;
  owner: Owner;
  typeId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  w: number;
  h: number;
  builtAt: number; // sim time when placed; construction runs for buildTimeSec
  cooldown: number; // defensive fire cooldown
}

export interface ResourcePatch {
  id: number;
  x: number;
  y: number;
  amount: number;
  maxAmount: number;
  resourceId: string;
}

export interface Effect {
  id: number;
  kind: 'muzzle' | 'projectile' | 'explosion' | 'strike' | 'corpse' | 'rubble';
  x: number;
  y: number;
  tx?: number;
  ty?: number;
  age: number;
  ttl: number;
  color?: string;
  radius?: number;
}

export interface ResearchJob {
  upgradeId: string;
  remaining: number;
}

export interface AiRuntime {
  buildIndex: number;
  waveIndex: number;
  rampWave: number;
  waveInterval: number;
  nextRampAt: number;
}

export interface RtsState {
  config: RtsConfig;
  resources: ResourceBag;
  enemyResources: number;
  supplyCap: number;
  units: Unit[];
  buildings: Building[];
  patches: ResourcePatch[];
  effects: Effect[];
  time: number;
  status: 'playing' | 'won' | 'lost';
  nextId: number;
  nextEffectId: number;
  log: string[];
  kills: number;
  unitMods: Record<string, { dmg: number; hp: number }>;
  researched: Set<string>;
  research: ResearchJob[];
  ai: AiRuntime;
  superCharge: number;
  fogEnabled: boolean;
  fog: Uint8Array;
  fogCols: number;
  fogRows: number;
  fogTimer: number;
}

/** A single greyable command-panel entry, generated from config + live state. */
export interface CommandOption {
  kind: 'train' | 'build' | 'research' | 'super';
  id: string;
  name: string;
  cost: ResourceBag;
  enabled: boolean;
  reason?: string; // tooltip / why-disabled text
}

const FOG_TILE = 20;
const FOG_UPDATE_SEC = 0.25;
const DEFAULT_BUILDING_SIZE = { w: 34, h: 34 };
const DEFAULT_BUILDING_SIGHT = 150;
const MAX_EFFECTS = 160;

// ---------------------------------------------------------------------------
// Config lookups
// ---------------------------------------------------------------------------

export function unitDef(cfg: RtsConfig, typeId: string): UnitTypeDef | undefined {
  return cfg.unitTypes[typeId];
}

export function buildingDef(cfg: RtsConfig, typeId: string): BuildingTypeDef | undefined {
  return cfg.buildingTypes[typeId];
}

/** The building type flagged isBase — a config is expected to have exactly one. */
export function baseTypeId(cfg: RtsConfig): string {
  for (const [id, def] of Object.entries(cfg.buildingTypes)) {
    if (def.isBase) return id;
  }
  return Object.keys(cfg.buildingTypes)[0];
}

function buildingSize(def: BuildingTypeDef): { w: number; h: number } {
  return def.size ?? DEFAULT_BUILDING_SIZE;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function moveToward(u: Unit, tx: number, ty: number, speed: number, dt: number): boolean {
  const d = dist(u.x, u.y, tx, ty);
  const step = speed * dt;
  if (d <= step || d === 0) {
    u.x = tx;
    u.y = ty;
    return true;
  }
  u.x += ((tx - u.x) / d) * step;
  u.y += ((ty - u.y) / d) * step;
  return false;
}

// ---------------------------------------------------------------------------
// Resource costs
// ---------------------------------------------------------------------------

/** Can the player pay a cost bag from current resources? Pure — UI + tests use it. */
export function canAffordBag(state: RtsState, cost: ResourceBag): boolean {
  for (const id of Object.keys(cost)) {
    if ((state.resources[id] ?? 0) < cost[id]) return false;
  }
  return true;
}

function spendBag(state: RtsState, cost: ResourceBag): void {
  for (const id of Object.keys(cost)) {
    state.resources[id] = (state.resources[id] ?? 0) - cost[id];
  }
}

function bagTotal(cost: ResourceBag): number {
  let t = 0;
  for (const id of Object.keys(cost)) t += cost[id];
  return t;
}

/** Format a cost bag as "50" or "50/25" ordered by the config's resource list. */
export function formatCost(cfg: RtsConfig, cost: ResourceBag): string {
  const order = cfg.resources.map((r) => r.id);
  const keys = Object.keys(cost).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return keys.map((k) => cost[k]).join('/');
}

// ---------------------------------------------------------------------------
// Supply, bases, upgrades
// ---------------------------------------------------------------------------

export function supplyUsed(state: RtsState): number {
  let n = 0;
  for (const u of state.units) {
    if (u.owner === 'player') n += unitDef(state.config, u.typeId)?.supply ?? 1;
  }
  return n;
}

export function playerBase(state: RtsState): Building | undefined {
  return state.buildings.find((b) => b.owner === 'player' && state.config.buildingTypes[b.typeId]?.isBase);
}

export function enemyBase(state: RtsState): Building | undefined {
  return state.buildings.find((b) => b.owner === 'enemy' && state.config.buildingTypes[b.typeId]?.isBase);
}

export function isResearched(state: RtsState, upgradeId: string): boolean {
  return state.researched.has(upgradeId);
}

function unitUnlocked(state: RtsState, def: UnitTypeDef): boolean {
  return !def.requiresUpgrade || state.researched.has(def.requiresUpgrade);
}

function buildingUnlocked(state: RtsState, def: BuildingTypeDef): boolean {
  return !def.requiresUpgrade || state.researched.has(def.requiresUpgrade);
}

function hasBuilding(state: RtsState, owner: Owner, typeId: string): boolean {
  return state.buildings.some((b) => b.owner === owner && b.typeId === typeId);
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/** 0..1 construction progress; 1 means finished (base and start buildings are). */
export function buildProgress(state: RtsState, b: Building): number {
  const def = state.config.buildingTypes[b.typeId];
  const t = def?.buildTimeSec ?? 0;
  if (t <= 0) return 1;
  return Math.max(0, Math.min(1, (state.time - b.builtAt) / t));
}

export function isBuilt(state: RtsState, b: Building): boolean {
  return buildProgress(state, b) >= 1;
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

function makeUnit(state: RtsState, owner: Owner, typeId: string, x: number, y: number): Unit {
  const def = unitDef(state.config, typeId)!;
  const hpMult = owner === 'player' ? state.unitMods[typeId]?.hp ?? 1 : 1;
  const hp = Math.round(def.hp * hpMult);
  return {
    id: state.nextId++,
    owner,
    typeId,
    role: def.role,
    x,
    y,
    hp,
    maxHp: hp,
    mx: null,
    my: null,
    attackId: null,
    cooldown: 0,
    cargo: 0,
    cargoResource: null,
    patchId: null,
    phase: 'idle',
    mineTimer: 0,
  };
}

function makeBuilding(state: RtsState, owner: Owner, typeId: string, x: number, y: number, prebuilt: boolean): Building {
  const def = buildingDef(state.config, typeId)!;
  const size = buildingSize(def);
  return {
    id: state.nextId++,
    owner,
    typeId,
    x,
    y,
    hp: def.hp,
    maxHp: def.hp,
    w: size.w,
    h: size.h,
    builtAt: prebuilt ? -1e9 : state.time,
    cooldown: 0,
  };
}

function spawnEffect(state: RtsState, e: Omit<Effect, 'id'>): void {
  state.effects.push({ ...e, id: state.nextEffectId++ });
  if (state.effects.length > MAX_EFFECTS) state.effects.splice(0, state.effects.length - MAX_EFFECTS);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export function createRtsState(config: RtsConfig): RtsState {
  const fogEnabled = config.fogOfWar ?? true;
  const fogCols = Math.ceil(config.map.width / FOG_TILE);
  const fogRows = Math.ceil(config.map.height / FOG_TILE);

  const waves = config.ai.attackWaves;
  const waveInterval =
    waves.length >= 2 ? Math.max(10, waves[waves.length - 1].atSec - waves[waves.length - 2].atSec) : 45;

  const state: RtsState = {
    config,
    resources: { ...config.startResources },
    enemyResources: bagTotal(config.startResources),
    supplyCap: config.startSupply,
    units: [],
    buildings: [],
    patches: [],
    effects: [],
    time: 0,
    status: 'playing',
    nextId: 1,
    nextEffectId: 1,
    log: [],
    kills: 0,
    unitMods: {},
    researched: new Set(),
    research: [],
    ai: { buildIndex: 0, waveIndex: 0, rampWave: 0, waveInterval, nextRampAt: Infinity },
    superCharge: 0,
    fogEnabled,
    fog: new Uint8Array(fogCols * fogRows),
    fogCols,
    fogRows,
    fogTimer: 0,
  };

  state.patches = config.map.patches.map((p) => ({
    id: state.nextId++,
    x: p.x,
    y: p.y,
    amount: p.amount,
    maxAmount: p.amount,
    resourceId: p.resourceId,
  }));

  const baseId = baseTypeId(config);
  const pBase = makeBuilding(state, 'player', baseId, config.map.playerBase.x, config.map.playerBase.y, true);
  const eBase = makeBuilding(state, 'enemy', baseId, config.map.enemyBase.x, config.map.enemyBase.y, true);
  state.buildings.push(pBase, eBase);
  state.supplyCap += buildingDef(config, baseId)?.supplyGrant ?? 0;

  const spawnRing = (owner: Owner, base: Building, list: { typeId: string; count: number }[]) => {
    let i = 0;
    for (const entry of list) {
      const def = unitDef(config, entry.typeId);
      if (!def) continue;
      for (let k = 0; k < entry.count; k++) {
        const angle = (i / Math.max(1, totalCount(list))) * Math.PI * 2;
        const dir = owner === 'player' ? 1 : -1;
        state.units.push(
          makeUnit(state, owner, entry.typeId, base.x + Math.cos(angle) * 42, base.y + dir * 34 + Math.sin(angle) * 22),
        );
        i++;
      }
    }
  };
  spawnRing('player', pBase, config.startUnits);
  spawnRing('enemy', eBase, config.enemyStartUnits ?? []);

  const primary = config.resources[0];
  state.log.push(
    `${buildingDef(config, baseId)?.name ?? 'Base'} online. Harvest ${
      primary ? primary.name.toLowerCase() : 'resources'
    } and build an army.`,
  );

  updateFog(state);
  return state;
}

function totalCount(list: { count: number }[]): number {
  return list.reduce((s, e) => s + e.count, 0);
}

export function pushLog(state: RtsState, msg: string) {
  state.log.push(msg);
  if (state.log.length > 8) state.log.shift();
}

// ---------------------------------------------------------------------------
// Player commands: train, build, research, superweapon
// ---------------------------------------------------------------------------

/** Requirement breakdown for a unit type — feeds both trainUnit and the UI. */
function trainCheck(state: RtsState, typeId: string): { def?: UnitTypeDef; ok: boolean; reason?: string } {
  const def = unitDef(state.config, typeId);
  if (!def) return { ok: false, reason: 'Unknown unit' };
  if (!unitUnlocked(state, def)) {
    const up = state.config.upgrades?.find((u) => u.id === def.requiresUpgrade);
    return { def, ok: false, reason: `Requires ${up?.name ?? def.requiresUpgrade}` };
  }
  if (!hasBuilding(state, 'player', def.trainedAt)) {
    return { def, ok: false, reason: `Need ${buildingDef(state.config, def.trainedAt)?.name ?? def.trainedAt}` };
  }
  if (supplyUsed(state) + def.supply > state.supplyCap) {
    return { def, ok: false, reason: 'Not enough supply' };
  }
  if (!canAffordBag(state, def.cost)) return { def, ok: false, reason: 'Insufficient resources' };
  return { def, ok: true };
}

export function trainUnit(state: RtsState, typeId: string): boolean {
  const { def, ok, reason } = trainCheck(state, typeId);
  if (!ok || !def) {
    if (reason && reason !== 'Insufficient resources') pushLog(state, reason);
    return false;
  }
  const src = state.buildings.find((b) => b.owner === 'player' && b.typeId === def.trainedAt)!;
  spendBag(state, def.cost);
  state.units.push(makeUnit(state, 'player', typeId, src.x + src.w / 2 + 8, src.y + src.h / 2 + 8));
  return true;
}

/** True if a building of typeId fits at (x, y): on the map and clear of others. */
export function canPlaceAt(state: RtsState, typeId: string, x: number, y: number): boolean {
  const def = buildingDef(state.config, typeId);
  if (!def) return false;
  const size = buildingSize(def);
  const { width: W, height: H } = state.config.map;
  if (x - size.w / 2 < 0 || x + size.w / 2 > W || y - size.h / 2 < 0 || y + size.h / 2 > H) return false;
  for (const b of state.buildings) {
    if (Math.abs(b.x - x) < (b.w + size.w) / 2 && Math.abs(b.y - y) < (b.h + size.h) / 2) return false;
  }
  return true;
}

export function placeBuilding(state: RtsState, typeId: string, x: number, y: number): boolean {
  const def = buildingDef(state.config, typeId);
  if (!def) return false;
  if (!buildingUnlocked(state, def)) return false;
  if (!canAffordBag(state, def.cost)) return false;
  if (!canPlaceAt(state, typeId, x, y)) return false;
  spendBag(state, def.cost);
  const b = makeBuilding(state, 'player', typeId, x, y, false);
  state.buildings.push(b);
  if (def.supplyGrant) state.supplyCap += def.supplyGrant;
  if (def.farmYieldsResource) {
    state.patches.push({
      id: state.nextId++,
      x,
      y,
      amount: def.farmAmount ?? 300,
      maxAmount: def.farmAmount ?? 300,
      resourceId: def.farmYieldsResource,
    });
  }
  return true;
}

/** Prereq breakdown for an upgrade — feeds startResearch and the UI. */
function researchCheck(state: RtsState, upgradeId: string): { def?: UpgradeDef; ok: boolean; reason?: string } {
  const def = state.config.upgrades?.find((u) => u.id === upgradeId);
  if (!def) return { ok: false, reason: 'Unknown upgrade' };
  if (state.researched.has(upgradeId)) return { def, ok: false, reason: 'Researched' };
  if (state.research.some((r) => r.upgradeId === upgradeId)) return { def, ok: false, reason: 'Researching…' };
  if (def.prereqBuilding && !hasBuilding(state, 'player', def.prereqBuilding)) {
    return { def, ok: false, reason: `Need ${buildingDef(state.config, def.prereqBuilding)?.name ?? def.prereqBuilding}` };
  }
  if (def.prereqUpgrade && !state.researched.has(def.prereqUpgrade)) {
    const up = state.config.upgrades?.find((u) => u.id === def.prereqUpgrade);
    return { def, ok: false, reason: `Requires ${up?.name ?? def.prereqUpgrade}` };
  }
  if (!hasBuilding(state, 'player', def.researchAt)) {
    return { def, ok: false, reason: `Need ${buildingDef(state.config, def.researchAt)?.name ?? def.researchAt}` };
  }
  if (!canAffordBag(state, def.cost)) return { def, ok: false, reason: 'Insufficient resources' };
  return { def, ok: true };
}

export function startResearch(state: RtsState, upgradeId: string): boolean {
  const { def, ok } = researchCheck(state, upgradeId);
  if (!ok || !def) return false;
  spendBag(state, def.cost);
  state.research.push({ upgradeId, remaining: def.researchTimeSec });
  return true;
}

function completeResearch(state: RtsState, def: UpgradeDef): void {
  state.researched.add(def.id);
  for (const eff of def.effects) {
    const mod = (state.unitMods[eff.unitTypeId] ??= { dmg: 1, hp: 1 });
    if (eff.dmgMult) mod.dmg *= eff.dmgMult;
    if (eff.hpMult) {
      mod.hp *= eff.hpMult;
      for (const u of state.units) {
        if (u.owner === 'player' && u.typeId === eff.unitTypeId) {
          u.maxHp = Math.round(u.maxHp * eff.hpMult);
          u.hp = Math.round(u.hp * eff.hpMult);
        }
      }
    }
  }
  if (def.announce) pushLog(state, def.announce);
}

export function superReady(state: RtsState): boolean {
  return !!state.config.superweapon && state.superCharge >= state.config.superweapon.cooldownSec;
}

export function fireSuperweapon(state: RtsState, x: number, y: number): boolean {
  const sw = state.config.superweapon;
  if (!sw || !superReady(state)) return false;
  state.superCharge = 0;
  for (const u of state.units) {
    if (u.owner === 'enemy' && dist(u.x, u.y, x, y) <= sw.radius) u.hp -= sw.damage;
  }
  for (const b of state.buildings) {
    if (b.owner === 'enemy' && dist(b.x, b.y, x, y) <= sw.radius) b.hp -= sw.damage;
  }
  spawnEffect(state, { kind: 'strike', x, y, age: 0, ttl: 0.9, color: sw.color, radius: sw.radius });
  spawnEffect(state, { kind: 'explosion', x, y, age: 0, ttl: 0.6 });
  pushLog(state, `${sw.name} strike!`);
  return true;
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

interface Target {
  x: number;
  y: number;
  id: number;
  kind: 'unit' | 'building';
}

function findTarget(state: RtsState, u: Unit): Target | null {
  // explicit target first
  if (u.attackId != null) {
    const tu = state.units.find((o) => o.id === u.attackId);
    if (tu && tu.hp > 0) return { x: tu.x, y: tu.y, id: tu.id, kind: 'unit' };
    const tb = state.buildings.find((o) => o.id === u.attackId);
    if (tb && tb.hp > 0) return { x: tb.x, y: tb.y, id: tb.id, kind: 'building' };
    u.attackId = null;
  }
  const range = state.config.aggroRange;
  const preferWorkers = u.orderTarget === 'workers';
  let best: Target | null = null;
  let bestScore = Infinity;
  for (const o of state.units) {
    if (o.owner === u.owner || o.hp <= 0) continue;
    const d = dist(u.x, u.y, o.x, o.y);
    if (d > range) continue;
    // harass units treat non-workers as far away so workers win ties
    const score = preferWorkers && o.role !== 'worker' ? d + range : d;
    if (score < bestScore) {
      bestScore = score;
      best = { x: o.x, y: o.y, id: o.id, kind: 'unit' };
    }
  }
  for (const b of state.buildings) {
    if (b.owner === u.owner || b.hp <= 0) continue;
    const d = dist(u.x, u.y, b.x, b.y);
    if (d > range) continue;
    const score = preferWorkers ? d + range * 2 : d;
    if (score < bestScore) {
      bestScore = score;
      best = { x: b.x, y: b.y, id: b.id, kind: 'building' };
    }
  }
  return best;
}

function damageTarget(state: RtsState, t: Target, amount: number): void {
  if (t.kind === 'unit') {
    const o = state.units.find((x) => x.id === t.id);
    if (o) o.hp -= amount;
  } else {
    const o = state.buildings.find((x) => x.id === t.id);
    if (o) o.hp -= amount;
  }
}

function applyAttack(state: RtsState, attacker: Unit, def: UnitTypeDef, t: Target): void {
  const dmg = def.damage * (attacker.owner === 'player' ? state.unitMods[attacker.typeId]?.dmg ?? 1 : 1);
  damageTarget(state, t, dmg);
  if (def.splashRadius) {
    for (const o of state.units) {
      if (o.owner === attacker.owner || o.hp <= 0 || o.id === t.id) continue;
      if (dist(o.x, o.y, t.x, t.y) <= def.splashRadius) o.hp -= dmg * 0.5;
    }
  }
  spawnEffect(state, { kind: 'muzzle', x: attacker.x, y: attacker.y - 4, age: 0, ttl: 0.12 });
  spawnEffect(state, { kind: 'projectile', x: attacker.x, y: attacker.y - 4, tx: t.x, ty: t.y, age: 0, ttl: 0.25 });
}

function healNearby(state: RtsState, healer: Unit, def: UnitTypeDef, dt: number): boolean {
  let best: Unit | null = null;
  let bestD = def.range;
  for (const o of state.units) {
    if (o.owner !== healer.owner || o.id === healer.id || o.hp <= 0 || o.hp >= o.maxHp) continue;
    const d = dist(healer.x, healer.y, o.x, o.y);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  if (!best) return false;
  best.hp = Math.min(best.maxHp, best.hp + def.healPerSec! * dt);
  return true;
}

function stepCombat(state: RtsState, u: Unit, dt: number): void {
  const def = unitDef(state.config, u.typeId);
  if (!def) return;
  u.cooldown = Math.max(0, u.cooldown - dt);

  if (def.healPerSec && healNearby(state, u, def, dt)) {
    // medics tend the wounded and hold position
    return;
  }

  const target = findTarget(state, u);
  if (target) {
    const d = dist(u.x, u.y, target.x, target.y);
    if (d > def.range) {
      moveToward(u, target.x, target.y, def.speed, dt);
    } else if (u.cooldown <= 0) {
      applyAttack(state, u, def, target);
      u.cooldown = def.rate;
    }
    return;
  }

  if (u.mx != null && u.my != null) {
    if (moveToward(u, u.mx, u.my, def.speed, dt)) {
      u.mx = null;
      u.my = null;
    }
  }
}

function dropOff(state: RtsState, u: Unit): Building | undefined {
  let best: Building | undefined;
  let bestD = Infinity;
  for (const b of state.buildings) {
    if (b.owner !== u.owner) continue;
    if (!state.config.buildingTypes[b.typeId]?.isBase) continue;
    const d = dist(u.x, u.y, b.x, b.y);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

function nearestPatch(state: RtsState, x: number, y: number): ResourcePatch | null {
  let best: ResourcePatch | null = null;
  let bestD = Infinity;
  for (const p of state.patches) {
    if (p.amount <= 0) continue;
    const d = dist(x, y, p.x, p.y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

function stepWorker(state: RtsState, u: Unit, dt: number): void {
  const cfg = state.config;
  const def = unitDef(cfg, u.typeId);
  const speed = def?.speed ?? 55;

  if (u.phase === 'idle' && u.mx != null && u.my != null) {
    if (moveToward(u, u.mx, u.my, speed, dt)) {
      u.mx = null;
      u.my = null;
    }
    return;
  }

  if (u.phase === 'idle') {
    const patch = u.patchId != null ? state.patches.find((p) => p.id === u.patchId) : nearestPatch(state, u.x, u.y);
    if (patch && patch.amount > 0) {
      u.patchId = patch.id;
      u.phase = 'toPatch';
    }
    return;
  }

  if (u.phase === 'toPatch') {
    const patch = state.patches.find((p) => p.id === u.patchId);
    if (!patch || patch.amount <= 0) {
      u.phase = 'idle';
      u.patchId = null;
      return;
    }
    if (moveToward(u, patch.x, patch.y, speed, dt)) {
      u.phase = 'mining';
      u.mineTimer = cfg.harvestTime;
    }
    return;
  }

  if (u.phase === 'mining') {
    const patch = state.patches.find((p) => p.id === u.patchId);
    if (!patch || patch.amount <= 0) {
      u.phase = 'toBase';
      return;
    }
    u.mineTimer -= dt;
    if (u.mineTimer <= 0) {
      const took = Math.min(cfg.harvestAmount, patch.amount);
      patch.amount -= took;
      u.cargo = took;
      u.cargoResource = patch.resourceId;
      u.phase = 'toBase';
    }
    return;
  }

  if (u.phase === 'toBase') {
    const base = dropOff(state, u);
    if (!base) return;
    if (moveToward(u, base.x, base.y + base.h / 2, speed, dt)) {
      if (u.cargo > 0) {
        if (u.owner === 'player' && u.cargoResource) {
          state.resources[u.cargoResource] = (state.resources[u.cargoResource] ?? 0) + u.cargo;
        } else if (u.owner === 'enemy') {
          state.enemyResources += u.cargo;
        }
      }
      u.cargo = 0;
      u.cargoResource = null;
      u.phase = 'idle';
    }
  }
}

// Defensive buildings shoot the nearest enemy in range once construction is done.
function stepBuildingFire(state: RtsState, b: Building, dt: number): void {
  const def = state.config.buildingTypes[b.typeId];
  if (!def?.attack || !isBuilt(state, b)) return;
  b.cooldown = Math.max(0, b.cooldown - dt);
  let best: Unit | null = null;
  let bestD = def.attack.range;
  for (const o of state.units) {
    if (o.owner === b.owner || o.hp <= 0) continue;
    const d = dist(b.x, b.y, o.x, o.y);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  if (best && b.cooldown <= 0) {
    best.hp -= def.attack.damage;
    b.cooldown = def.attack.rate;
    spawnEffect(state, { kind: 'muzzle', x: b.x, y: b.y, age: 0, ttl: 0.12 });
    spawnEffect(state, { kind: 'projectile', x: b.x, y: b.y, tx: best.x, ty: best.y, age: 0, ttl: 0.25 });
  }
}

// ---------------------------------------------------------------------------
// Enemy AI
// ---------------------------------------------------------------------------

function nearestPlayerWorker(state: RtsState, x: number, y: number): Unit | null {
  let best: Unit | null = null;
  let bestD = Infinity;
  for (const u of state.units) {
    if (u.owner !== 'player' || u.role !== 'worker' || u.hp <= 0) continue;
    const d = dist(x, y, u.x, u.y);
    if (d < bestD) {
      bestD = d;
      best = u;
    }
  }
  return best;
}

function spawnWave(state: RtsState, comp: Record<string, number>, target: 'base' | 'workers'): void {
  const eBase = enemyBase(state);
  if (!eBase) return;
  const pBase = playerBase(state);
  const dir = pBase && pBase.y < eBase.y ? -1 : 1; // march roughly toward the player
  let i = 0;
  let announced = 0;
  for (const typeId of Object.keys(comp)) {
    const count = comp[typeId];
    if (!unitDef(state.config, typeId)) continue;
    announced += count;
    for (let k = 0; k < count; k++) {
      const u = makeUnit(
        state,
        'enemy',
        typeId,
        eBase.x - 24 + (i % 6) * 12,
        eBase.y + dir * (34 + Math.floor(i / 6) * 12),
      );
      u.orderTarget = target;
      state.units.push(u);
      i++;
    }
  }
  if (announced > 0) {
    const word = target === 'workers' ? 'raiders flanking your harvesters' : 'attackers incoming';
    pushLog(state, `Wave: ${announced} ${word}!`);
  }
}

function enemyBuildSpot(state: RtsState, typeId: string): { x: number; y: number } | null {
  const eBase = enemyBase(state);
  if (!eBase) return null;
  for (let ring = 1; ring <= 4; ring++) {
    for (let a = 0; a < 8; a++) {
      const angle = (a / 8) * Math.PI * 2;
      const x = eBase.x + Math.cos(angle) * (44 + ring * 20);
      const y = eBase.y + Math.sin(angle) * (44 + ring * 20);
      if (canPlaceAt(state, typeId, x, y)) return { x, y };
    }
  }
  return null;
}

function stepEnemyAI(state: RtsState, dt: number): void {
  const cfg = state.config;
  const ai = state.ai;
  state.enemyResources += 3 * dt; // off-map trickle keeps the build order moving

  // Build order — pay from the enemy economy, place near its base.
  const orders = cfg.ai.buildOrder;
  if (ai.buildIndex < orders.length && state.time >= orders[ai.buildIndex].atSec) {
    const order = orders[ai.buildIndex];
    const def = buildingDef(cfg, order.buildingTypeId);
    const cost = def ? bagTotal(def.cost) : 0;
    if (def && state.enemyResources >= cost) {
      const spot = enemyBuildSpot(state, order.buildingTypeId);
      if (spot) {
        state.enemyResources -= cost;
        state.buildings.push(makeBuilding(state, 'enemy', order.buildingTypeId, spot.x, spot.y, false));
      }
      ai.buildIndex++;
    } else if (!def) {
      ai.buildIndex++;
    }
  }

  // Scripted attack waves.
  const waves = cfg.ai.attackWaves;
  while (ai.waveIndex < waves.length && state.time >= waves[ai.waveIndex].atSec) {
    const w = waves[ai.waveIndex];
    spawnWave(state, w.comp, w.target);
    ai.nextRampAt = w.atSec + ai.waveInterval;
    ai.waveIndex++;
  }

  // Endless ramping waves once the script is exhausted.
  if (ai.waveIndex >= waves.length && waves.length > 0 && state.time >= ai.nextRampAt) {
    const last = waves[waves.length - 1];
    const scale = Math.pow(Math.max(1, cfg.ai.rampFactor), ai.rampWave + 1);
    const comp: Record<string, number> = {};
    for (const id of Object.keys(last.comp)) comp[id] = Math.ceil(last.comp[id] * scale);
    spawnWave(state, comp, last.target);
    ai.rampWave++;
    ai.nextRampAt = state.time + ai.waveInterval;
  }

  // March orders for enemy wave units with nothing to shoot.
  const pBase = playerBase(state);
  for (const u of state.units) {
    if (u.owner !== 'enemy' || u.role !== 'combat' || !u.orderTarget) continue;
    if (u.attackId != null) continue;
    if (u.orderTarget === 'workers') {
      const w = nearestPlayerWorker(state, u.x, u.y);
      if (w) {
        u.mx = w.x;
        u.my = w.y;
      } else if (pBase) {
        u.mx = pBase.x;
        u.my = pBase.y;
      }
    } else if (pBase && u.mx == null) {
      u.mx = pBase.x;
      u.my = pBase.y;
    }
  }
}

// ---------------------------------------------------------------------------
// Fog of war
// ---------------------------------------------------------------------------

function fogIndex(state: RtsState, x: number, y: number): number {
  const c = Math.max(0, Math.min(state.fogCols - 1, Math.floor(x / FOG_TILE)));
  const r = Math.max(0, Math.min(state.fogRows - 1, Math.floor(y / FOG_TILE)));
  return r * state.fogCols + c;
}

/** Fog value at a world point: 0 unexplored, 1 explored, 2 currently visible. */
export function fogAt(state: RtsState, x: number, y: number): number {
  if (!state.fogEnabled) return 2;
  return state.fog[fogIndex(state, x, y)];
}

export function isVisible(state: RtsState, x: number, y: number): boolean {
  return fogAt(state, x, y) === 2;
}

/** Recompute player visibility from unit/building sight. Pure over state.fog. */
export function updateFog(state: RtsState): void {
  if (!state.fogEnabled) {
    state.fog.fill(2);
    return;
  }
  const fog = state.fog;
  for (let i = 0; i < fog.length; i++) if (fog[i] === 2) fog[i] = 1;

  const stamp = (x: number, y: number, sight: number) => {
    const tiles = Math.ceil(sight / FOG_TILE);
    const cc = Math.floor(x / FOG_TILE);
    const cr = Math.floor(y / FOG_TILE);
    for (let r = cr - tiles; r <= cr + tiles; r++) {
      if (r < 0 || r >= state.fogRows) continue;
      for (let c = cc - tiles; c <= cc + tiles; c++) {
        if (c < 0 || c >= state.fogCols) continue;
        const wx = c * FOG_TILE + FOG_TILE / 2;
        const wy = r * FOG_TILE + FOG_TILE / 2;
        if (dist(wx, wy, x, y) <= sight) fog[r * state.fogCols + c] = 2;
      }
    }
  };

  for (const u of state.units) {
    if (u.owner !== 'player') continue;
    stamp(u.x, u.y, unitDef(state.config, u.typeId)?.sightRange ?? 100);
  }
  for (const b of state.buildings) {
    if (b.owner !== 'player') continue;
    stamp(b.x, b.y, state.config.buildingTypes[b.typeId]?.sightRange ?? DEFAULT_BUILDING_SIGHT);
  }
}

// ---------------------------------------------------------------------------
// Effects + patch regrow
// ---------------------------------------------------------------------------

function stepEffects(state: RtsState, dt: number): void {
  for (const e of state.effects) {
    e.age += dt;
    if (e.kind === 'projectile' && e.tx != null && e.ty != null) {
      const d = dist(e.x, e.y, e.tx, e.ty);
      const step = (d / Math.max(0.001, e.ttl)) * dt;
      if (d <= step) {
        e.x = e.tx;
        e.y = e.ty;
      } else {
        e.x += ((e.tx - e.x) / d) * step;
        e.y += ((e.ty - e.y) / d) * step;
      }
    }
  }
  state.effects = state.effects.filter((e) => e.age < e.ttl);
}

function regrowPatches(state: RtsState, dt: number): void {
  if (!state.config.map.patchRegrows) return;
  const rate = state.config.map.patchRegrowRate ?? 0;
  if (rate <= 0) return;
  for (const p of state.patches) {
    if (p.amount < p.maxAmount) p.amount = Math.min(p.maxAmount, p.amount + rate * dt);
  }
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------

/** Advance the whole sim by dt seconds. Mutates and returns the same state. */
export function stepRts(state: RtsState, dt: number): RtsState {
  if (state.status !== 'playing') return state;
  state.time += dt;

  // research
  if (state.research.length) {
    for (const job of state.research) job.remaining -= dt;
    const done = state.research.filter((j) => j.remaining <= 0);
    for (const j of done) {
      const def = state.config.upgrades?.find((u) => u.id === j.upgradeId);
      if (def) completeResearch(state, def);
    }
    if (done.length) state.research = state.research.filter((j) => j.remaining > 0);
  }

  // superweapon charge
  if (state.config.superweapon) {
    state.superCharge = Math.min(state.config.superweapon.cooldownSec, state.superCharge + dt);
  }

  for (const u of state.units) {
    if (u.hp <= 0) continue;
    if (u.role === 'worker') stepWorker(state, u, dt);
    else stepCombat(state, u, dt);
  }

  for (const b of state.buildings) {
    if (b.hp > 0) stepBuildingFire(state, b, dt);
  }

  stepEnemyAI(state, dt);
  regrowPatches(state, dt);
  stepEffects(state, dt);

  // fog recompute on a fixed cadence
  state.fogTimer += dt;
  if (state.fogTimer >= FOG_UPDATE_SEC) {
    state.fogTimer = 0;
    updateFog(state);
  }

  // remove dead, leaving corpses/rubble, tally kills
  const beforeEnemies = state.units.reduce((n, u) => n + (u.owner === 'enemy' ? 1 : 0), 0);
  for (const u of state.units) {
    if (u.hp <= 0) spawnEffect(state, { kind: 'corpse', x: u.x, y: u.y, age: 0, ttl: 4 });
  }
  state.units = state.units.filter((u) => u.hp > 0);
  const afterEnemies = state.units.reduce((n, u) => n + (u.owner === 'enemy' ? 1 : 0), 0);
  state.kills += Math.max(0, beforeEnemies - afterEnemies);

  for (const b of state.buildings) {
    if (b.hp <= 0) spawnEffect(state, { kind: 'rubble', x: b.x, y: b.y, age: 0, ttl: 6 });
  }
  state.buildings = state.buildings.filter((b) => b.hp > 0);

  if (!enemyBase(state)) {
    state.status = 'won';
    pushLog(state, state.config.winText);
  } else if (!playerBase(state)) {
    state.status = 'lost';
    pushLog(state, state.config.loseText);
  }
  return state;
}

// ---------------------------------------------------------------------------
// Player selection + orders
// ---------------------------------------------------------------------------

/** Right-click command for selected units: attack under cursor, harvest a patch,
 * or move. Enemy targets are only orderable when currently visible. */
export function commandUnits(state: RtsState, ids: Set<number>, x: number, y: number): void {
  const enemyUnit = state.units.find(
    (u) => u.owner === 'enemy' && u.hp > 0 && dist(u.x, u.y, x, y) < 16 && isVisible(state, u.x, u.y),
  );
  const enemyBldg = state.buildings.find(
    (b) =>
      b.owner === 'enemy' &&
      x > b.x - b.w / 2 &&
      x < b.x + b.w / 2 &&
      y > b.y - b.h / 2 &&
      y < b.y + b.h / 2 &&
      isVisible(state, b.x, b.y),
  );
  const patch = state.patches.find((p) => p.amount > 0 && dist(p.x, p.y, x, y) < 22);
  const targetId = enemyUnit ? enemyUnit.id : enemyBldg ? enemyBldg.id : null;

  for (const u of state.units) {
    if (!ids.has(u.id) || u.owner !== 'player') continue;
    if (targetId != null) {
      u.attackId = targetId;
      u.mx = null;
      u.my = null;
      if (u.role === 'worker') u.phase = 'idle';
    } else if (patch && u.role === 'worker') {
      u.patchId = patch.id;
      u.phase = 'toPatch';
      u.attackId = null;
      u.mx = null;
      u.my = null;
    } else {
      u.mx = x;
      u.my = y;
      u.attackId = null;
      if (u.role === 'worker') u.phase = 'idle';
    }
  }
}

/** Ids of player units inside a selection rectangle. */
export function unitsInRect(state: RtsState, x0: number, y0: number, x1: number, y1: number): number[] {
  const lo = { x: Math.min(x0, x1), y: Math.min(y0, y1) };
  const hi = { x: Math.max(x0, x1), y: Math.max(y0, y1) };
  return state.units
    .filter((u) => u.owner === 'player' && u.x >= lo.x && u.x <= hi.x && u.y >= lo.y && u.y <= hi.y)
    .map((u) => u.id);
}

// ---------------------------------------------------------------------------
// Command panel model
// ---------------------------------------------------------------------------

/** Config-generated, live-greyed command buttons for the current player state. */
export function getCommandOptions(state: RtsState): CommandOption[] {
  const cfg = state.config;
  const out: CommandOption[] = [];

  for (const [id, def] of Object.entries(cfg.unitTypes)) {
    const chk = trainCheck(state, id);
    out.push({ kind: 'train', id, name: def.name, cost: def.cost, enabled: chk.ok, reason: chk.reason });
  }

  for (const [id, def] of Object.entries(cfg.buildingTypes)) {
    if (def.isBase) continue;
    let enabled = true;
    let reason: string | undefined;
    if (!buildingUnlocked(state, def)) {
      enabled = false;
      const up = cfg.upgrades?.find((u) => u.id === def.requiresUpgrade);
      reason = `Requires ${up?.name ?? def.requiresUpgrade}`;
    } else if (!canAffordBag(state, def.cost)) {
      enabled = false;
      reason = 'Insufficient resources';
    }
    out.push({ kind: 'build', id, name: def.name, cost: def.cost, enabled, reason });
  }

  for (const up of cfg.upgrades ?? []) {
    if (state.researched.has(up.id)) continue;
    const chk = researchCheck(state, up.id);
    out.push({ kind: 'research', id: up.id, name: up.name, cost: up.cost, enabled: chk.ok, reason: chk.reason });
  }

  if (cfg.superweapon) {
    const ready = superReady(state);
    out.push({
      kind: 'super',
      id: 'superweapon',
      name: cfg.superweapon.name,
      cost: {},
      enabled: ready,
      reason: ready ? undefined : `Charging (${Math.ceil(cfg.superweapon.cooldownSec - state.superCharge)}s)`,
    });
  }

  return out;
}
