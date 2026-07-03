// Config-driven real-time-strategy sim shared by StarCraft, Command & Conquer,
// and Age of Empires II. The three games differ only by an RtsConfig (names,
// colours, costs, map) — the rules live here. This module is deliberately free
// of React and canvas so it can be unit-tested and so the RAF loop can mutate a
// single state object each frame without triggering re-renders.

export type Owner = 'player' | 'enemy';
export type UnitKind = 'worker' | 'soldier';
export type BuildingType = 'base' | 'depot' | 'prod';

export interface Unit {
  id: number;
  owner: Owner;
  kind: UnitKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  // movement
  mx: number | null; // move target
  my: number | null;
  // combat
  attackId: number | null; // unit or building id we're attacking
  cooldown: number;
  // worker economy
  cargo: number;
  patchId: number | null; // resource patch being harvested
  phase: 'idle' | 'toPatch' | 'mining' | 'toBase';
  mineTimer: number;
}

export interface Building {
  id: number;
  owner: Owner;
  type: BuildingType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  w: number;
  h: number;
}

export interface ResourcePatch {
  id: number;
  x: number;
  y: number;
  amount: number;
}

export interface RtsConfig {
  gameId: string;
  resourceName: string; // "Minerals" / "Tiberium" / "Food"
  workerName: string;
  soldierName: string;
  baseName: string;
  depotName: string;
  prodName: string;
  enemyBaseName: string;
  colors: {
    player: string;
    enemy: string;
    resource: string;
    terrain: string;
    grid: string;
  };
  costs: { worker: number; depot: number; prod: number; soldier: number };
  supplyPerDepot: number;
  startSupply: number;
  stats: {
    workerHp: number;
    workerSpeed: number;
    soldierHp: number;
    soldierSpeed: number;
    soldierDamage: number;
    soldierRange: number;
    soldierRate: number; // seconds between attacks
    baseHp: number;
    depotHp: number;
    prodHp: number;
    aggroRange: number;
    harvestAmount: number;
    harvestTime: number; // seconds to fill cargo
  };
  map: {
    width: number;
    height: number;
    playerBase: { x: number; y: number };
    enemyBase: { x: number; y: number };
    patches: { x: number; y: number; amount: number }[];
  };
  waveIntervalSec: number;
  startResource: number;
  startWorkers: number;
  winText: string;
  loseText: string;
  // Optional one-time upgrade (Age of Empires' "Advance to Feudal Age"): spends
  // resource to permanently buff player soldier damage and hp.
  advance?: {
    cost: number;
    label: string;
    damageMult: number;
    hpMult: number;
    announce: string;
  };
}

export interface RtsState {
  config: RtsConfig;
  resource: number;
  supplyCap: number;
  units: Unit[];
  buildings: Building[];
  patches: ResourcePatch[];
  time: number;
  waveTimer: number;
  waveNumber: number;
  status: 'playing' | 'won' | 'lost';
  nextId: number;
  log: string[];
  kills: number;
  playerDmgMult: number;
  playerHpMult: number;
  advanced: boolean;
}

const BUILDING_SIZE: Record<BuildingType, { w: number; h: number }> = {
  base: { w: 46, h: 46 },
  depot: { w: 30, h: 30 },
  prod: { w: 38, h: 38 },
};

export function supplyUsed(state: RtsState): number {
  return state.units.filter((u) => u.owner === 'player').length;
}

export function playerBase(state: RtsState): Building | undefined {
  return state.buildings.find((b) => b.owner === 'player' && b.type === 'base');
}

export function enemyBase(state: RtsState): Building | undefined {
  return state.buildings.find((b) => b.owner === 'enemy' && b.type === 'base');
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function makeUnit(id: number, owner: Owner, kind: UnitKind, x: number, y: number, cfg: RtsConfig): Unit {
  return {
    id,
    owner,
    kind,
    x,
    y,
    hp: kind === 'worker' ? cfg.stats.workerHp : cfg.stats.soldierHp,
    maxHp: kind === 'worker' ? cfg.stats.workerHp : cfg.stats.soldierHp,
    mx: null,
    my: null,
    attackId: null,
    cooldown: 0,
    cargo: 0,
    patchId: null,
    phase: 'idle',
    mineTimer: 0,
  };
}

function makeBuilding(id: number, owner: Owner, type: BuildingType, x: number, y: number, cfg: RtsConfig): Building {
  const hp = type === 'base' ? cfg.stats.baseHp : type === 'depot' ? cfg.stats.depotHp : cfg.stats.prodHp;
  const size = BUILDING_SIZE[type];
  return { id, owner, type, x, y, hp, maxHp: hp, w: size.w, h: size.h };
}

export function createRtsState(config: RtsConfig): RtsState {
  let nextId = 1;
  const buildings: Building[] = [];
  const units: Unit[] = [];
  const patches: ResourcePatch[] = config.map.patches.map((p) => ({ id: nextId++, x: p.x, y: p.y, amount: p.amount }));

  const pBase = makeBuilding(nextId++, 'player', 'base', config.map.playerBase.x, config.map.playerBase.y, config);
  const eBase = makeBuilding(nextId++, 'enemy', 'base', config.map.enemyBase.x, config.map.enemyBase.y, config);
  buildings.push(pBase, eBase);

  for (let i = 0; i < config.startWorkers; i++) {
    const angle = (i / config.startWorkers) * Math.PI * 2;
    units.push(
      makeUnit(nextId++, 'player', 'worker', pBase.x + Math.cos(angle) * 40, pBase.y + 30 + Math.sin(angle) * 20, config),
    );
  }
  // enemy defenders
  for (let i = 0; i < 3; i++) {
    units.push(makeUnit(nextId++, 'enemy', 'soldier', eBase.x - 30 + i * 20, eBase.y + 40, config));
  }

  return {
    config,
    resource: config.startResource,
    supplyCap: config.startSupply,
    units,
    buildings,
    patches,
    time: 0,
    waveTimer: config.waveIntervalSec,
    waveNumber: 0,
    status: 'playing',
    nextId,
    log: [`${config.baseName} online. Harvest ${config.resourceName.toLowerCase()} and build an army.`],
    kills: 0,
    playerDmgMult: 1,
    playerHpMult: 1,
    advanced: false,
  };
}

/** Age of Empires "Advance to Feudal Age": one-time buff to player soldiers. */
export function advanceAge(state: RtsState): boolean {
  const adv = state.config.advance;
  if (!adv || state.advanced) return false;
  if (!canAfford(state, adv.cost)) return false;
  state.resource -= adv.cost;
  state.advanced = true;
  state.playerDmgMult = adv.damageMult;
  state.playerHpMult = adv.hpMult;
  // buff existing player soldiers
  for (const u of state.units) {
    if (u.owner === 'player' && u.kind === 'soldier') {
      u.maxHp = Math.round(u.maxHp * adv.hpMult);
      u.hp = u.maxHp;
    }
  }
  pushLog(state, adv.announce);
  return true;
}

export function pushLog(state: RtsState, msg: string) {
  state.log.push(msg);
  if (state.log.length > 8) state.log.shift();
}

/** Can the player currently afford a purchase? Pure — used by UI + tests. */
export function canAfford(state: RtsState, cost: number): boolean {
  return state.resource >= cost;
}

export function trainWorker(state: RtsState): boolean {
  const cfg = state.config;
  if (!canAfford(state, cfg.costs.worker)) return false;
  if (supplyUsed(state) >= state.supplyCap) {
    pushLog(state, `Not enough supply — build a ${cfg.depotName}.`);
    return false;
  }
  const base = playerBase(state);
  if (!base) return false;
  state.resource -= cfg.costs.worker;
  state.units.push(makeUnit(state.nextId++, 'player', 'worker', base.x + 30, base.y + 40, cfg));
  return true;
}

export function trainSoldier(state: RtsState): boolean {
  const cfg = state.config;
  if (!canAfford(state, cfg.costs.soldier)) return false;
  const prod = state.buildings.find((b) => b.owner === 'player' && b.type === 'prod');
  if (!prod) {
    pushLog(state, `Build a ${cfg.prodName} first.`);
    return false;
  }
  if (supplyUsed(state) >= state.supplyCap) {
    pushLog(state, `Not enough supply — build a ${cfg.depotName}.`);
    return false;
  }
  state.resource -= cfg.costs.soldier;
  state.units.push(makeUnit(state.nextId++, 'player', 'soldier', prod.x + 20, prod.y + 40, cfg));
  return true;
}

/** Place a building at a location if affordable and not overlapping. */
export function placeBuilding(state: RtsState, type: 'depot' | 'prod', x: number, y: number): boolean {
  const cfg = state.config;
  const cost = type === 'depot' ? cfg.costs.depot : cfg.costs.prod;
  if (!canAfford(state, cost)) return false;
  const size = BUILDING_SIZE[type];
  // keep it on the map
  const cx = Math.max(size.w / 2, Math.min(cfg.map.width - size.w / 2, x));
  const cy = Math.max(size.h / 2, Math.min(cfg.map.height - size.h / 2, y));
  // no overlap with existing buildings
  for (const b of state.buildings) {
    if (Math.abs(b.x - cx) < (b.w + size.w) / 2 && Math.abs(b.y - cy) < (b.h + size.h) / 2) return false;
  }
  state.resource -= cost;
  state.buildings.push(makeBuilding(state.nextId++, 'player', type, cx, cy, cfg));
  if (type === 'depot') state.supplyCap += cfg.supplyPerDepot;
  return true;
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

function moveToward(u: Unit, tx: number, ty: number, speed: number, dt: number): boolean {
  const d = dist(u.x, u.y, tx, ty);
  const step = speed * dt;
  if (d <= step) {
    u.x = tx;
    u.y = ty;
    return true;
  }
  u.x += ((tx - u.x) / d) * step;
  u.y += ((ty - u.y) / d) * step;
  return false;
}

function findTarget(state: RtsState, u: Unit): { x: number; y: number; id: number; kind: 'unit' | 'building' } | null {
  // explicit target first
  if (u.attackId != null) {
    const tu = state.units.find((o) => o.id === u.attackId);
    if (tu && tu.hp > 0) return { x: tu.x, y: tu.y, id: tu.id, kind: 'unit' };
    const tb = state.buildings.find((o) => o.id === u.attackId);
    if (tb && tb.hp > 0) return { x: tb.x, y: tb.y, id: tb.id, kind: 'building' };
    u.attackId = null;
  }
  // auto-aggro nearest enemy in range
  const cfg = state.config;
  let best: { x: number; y: number; id: number; kind: 'unit' | 'building' } | null = null;
  let bestD = cfg.stats.aggroRange;
  for (const o of state.units) {
    if (o.owner === u.owner || o.hp <= 0) continue;
    const d = dist(u.x, u.y, o.x, o.y);
    if (d < bestD) {
      bestD = d;
      best = { x: o.x, y: o.y, id: o.id, kind: 'unit' };
    }
  }
  return best;
}

function damageTarget(state: RtsState, id: number, kind: 'unit' | 'building', amount: number) {
  if (kind === 'unit') {
    const t = state.units.find((o) => o.id === id);
    if (t) t.hp -= amount;
  } else {
    const t = state.buildings.find((o) => o.id === id);
    if (t) t.hp -= amount;
  }
}

function stepSoldier(state: RtsState, u: Unit, dt: number) {
  const cfg = state.config;
  u.cooldown = Math.max(0, u.cooldown - dt);
  const target = findTarget(state, u);
  if (target) {
    const d = dist(u.x, u.y, target.x, target.y);
    if (d > cfg.stats.soldierRange) {
      moveToward(u, target.x, target.y, cfg.stats.soldierSpeed, dt);
    } else if (u.cooldown <= 0) {
      const dmg = cfg.stats.soldierDamage * (u.owner === 'player' ? state.playerDmgMult : 1);
      damageTarget(state, target.id, target.kind, dmg);
      u.cooldown = cfg.stats.soldierRate;
    }
    return;
  }
  // no target: move order
  if (u.mx != null && u.my != null) {
    if (moveToward(u, u.mx, u.my, cfg.stats.soldierSpeed, dt)) {
      u.mx = null;
      u.my = null;
    }
  }
}

function stepWorker(state: RtsState, u: Unit, dt: number) {
  const cfg = state.config;
  const base = state.buildings.find((b) => b.owner === u.owner && (b.type === 'base' || b.type === 'depot'));

  // A worker with an explicit move order that is a soldier-style command just walks.
  if (u.phase === 'idle' && u.mx != null && u.my != null) {
    if (moveToward(u, u.mx, u.my, cfg.stats.workerSpeed, dt)) {
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
    if (moveToward(u, patch.x, patch.y, cfg.stats.workerSpeed, dt)) {
      u.phase = 'mining';
      u.mineTimer = cfg.stats.harvestTime;
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
      const took = Math.min(cfg.stats.harvestAmount, patch.amount);
      patch.amount -= took;
      u.cargo = took;
      u.phase = 'toBase';
    }
    return;
  }

  if (u.phase === 'toBase') {
    if (!base) return;
    if (moveToward(u, base.x, base.y + base.h / 2, cfg.stats.workerSpeed, dt)) {
      if (u.owner === 'player') state.resource += u.cargo;
      u.cargo = 0;
      u.phase = 'idle';
    }
  }
}

// Enemy AI: keep workers mining (already handled), and every wave interval push a
// group of soldiers toward the player's base, escalating in size.
function stepEnemyAI(state: RtsState, dt: number) {
  const cfg = state.config;
  state.waveTimer -= dt;
  if (state.waveTimer <= 0) {
    state.waveNumber++;
    state.waveTimer = cfg.waveIntervalSec;
    const eBase = enemyBase(state);
    const count = 2 + state.waveNumber; // escalate
    if (eBase) {
      for (let i = 0; i < count; i++) {
        const s = makeUnit(state.nextId++, 'enemy', 'soldier', eBase.x - 20 + i * 12, eBase.y - 30, cfg);
        state.units.push(s);
      }
      pushLog(state, `Wave ${state.waveNumber}: ${count} ${cfg.soldierName.toLowerCase()}s incoming!`);
    }
  }
  // enemy soldiers with no target march on the player base
  const pBase = playerBase(state);
  for (const u of state.units) {
    if (u.owner !== 'enemy' || u.kind !== 'soldier') continue;
    if (u.attackId == null && u.mx == null && pBase) {
      u.mx = pBase.x;
      u.my = pBase.y;
    }
  }
}

/** Advance the whole sim by dt seconds. Mutates and returns the same state. */
export function stepRts(state: RtsState, dt: number): RtsState {
  if (state.status !== 'playing') return state;
  state.time += dt;

  for (const u of state.units) {
    if (u.hp <= 0) continue;
    if (u.kind === 'soldier') stepSoldier(state, u, dt);
    else stepWorker(state, u, dt);
  }

  stepEnemyAI(state, dt);

  // remove dead units / buildings, tally kills
  const beforeEnemies = state.units.filter((u) => u.owner === 'enemy').length;
  state.units = state.units.filter((u) => u.hp > 0);
  const afterEnemies = state.units.filter((u) => u.owner === 'enemy').length;
  state.kills += Math.max(0, beforeEnemies - afterEnemies);
  state.buildings = state.buildings.filter((b) => b.hp > 0);

  // win/lose
  if (!enemyBase(state)) {
    state.status = 'won';
    pushLog(state, state.config.winText);
  } else if (!playerBase(state)) {
    state.status = 'lost';
    pushLog(state, state.config.loseText);
  }
  return state;
}

/** Issue a right-click command to selected units: attack an enemy under the
 * cursor, otherwise move (workers re-target the nearest patch if you click one). */
export function commandUnits(state: RtsState, ids: Set<number>, x: number, y: number) {
  // enemy under cursor?
  const enemyUnit = state.units.find((u) => u.owner === 'enemy' && u.hp > 0 && dist(u.x, u.y, x, y) < 16);
  const enemyBldg = state.buildings.find(
    (b) => b.owner === 'enemy' && x > b.x - b.w / 2 && x < b.x + b.w / 2 && y > b.y - b.h / 2 && y < b.y + b.h / 2,
  );
  const patch = state.patches.find((p) => p.amount > 0 && dist(p.x, p.y, x, y) < 22);
  const targetId = enemyUnit ? enemyUnit.id : enemyBldg ? enemyBldg.id : null;

  for (const u of state.units) {
    if (!ids.has(u.id)) continue;
    if (targetId != null) {
      u.attackId = targetId;
      u.mx = null;
      u.my = null;
      if (u.kind === 'worker') u.phase = 'idle';
    } else if (patch && u.kind === 'worker') {
      u.patchId = patch.id;
      u.phase = 'toPatch';
      u.attackId = null;
      u.mx = null;
      u.my = null;
    } else {
      u.mx = x;
      u.my = y;
      u.attackId = null;
      if (u.kind === 'worker') u.phase = 'idle';
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
