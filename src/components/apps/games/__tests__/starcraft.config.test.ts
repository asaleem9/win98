import { STARCRAFT_CONFIG } from '../StarCraft';
import { validateSpriteDef } from '../engine/sprites/sprite';
import {
  createRtsState,
  stepRts,
  startResearch,
  isResearched,
  placeBuilding,
  getCommandOptions,
  playerBase,
  enemyBase,
  baseTypeId,
  type CommandOption,
} from '../engine/rts';

const cfg = STARCRAFT_CONFIG;

function stepFor(s: ReturnType<typeof createRtsState>, seconds: number, dt = 0.05) {
  for (let t = 0; t < seconds; t += dt) stepRts(s, dt);
}

function opt(opts: CommandOption[], kind: CommandOption['kind'], id: string): CommandOption {
  const found = opts.find((o) => o.kind === kind && o.id === id);
  if (!found) throw new Error(`no ${kind} option for ${id}`);
  return found;
}

function enemyUnits(s: ReturnType<typeof createRtsState>) {
  return s.units.filter((u) => u.owner === 'enemy').length;
}

describe('StarCraft config validity', () => {
  const resourceIds = new Set(cfg.resources.map((r) => r.id));
  const buildingIds = new Set(Object.keys(cfg.buildingTypes));
  const unitIds = new Set(Object.keys(cfg.unitTypes));
  const upgradeIds = new Set((cfg.upgrades ?? []).map((u) => u.id));

  it('names the Minerals + Vespene Gas economy', () => {
    expect([...resourceIds].sort()).toEqual(['gas', 'minerals']);
    for (const id of Object.keys(cfg.startResources)) expect(resourceIds.has(id)).toBe(true);
  });

  it('has exactly one base building', () => {
    const bases = Object.values(cfg.buildingTypes).filter((b) => b.isBase);
    expect(bases.length).toBe(1);
    expect(baseTypeId(cfg)).toBe('base');
  });

  it('every cost bag references a real resource', () => {
    const bags = [
      ...Object.values(cfg.unitTypes).map((u) => u.cost),
      ...Object.values(cfg.buildingTypes).map((b) => b.cost),
      ...(cfg.upgrades ?? []).map((u) => u.cost),
    ];
    for (const bag of bags) {
      for (const id of Object.keys(bag)) expect(resourceIds.has(id)).toBe(true);
    }
  });

  it('every unit trains at a real building and gates on a real upgrade', () => {
    for (const u of Object.values(cfg.unitTypes)) {
      expect(buildingIds.has(u.trainedAt)).toBe(true);
      if (u.requiresUpgrade) expect(upgradeIds.has(u.requiresUpgrade)).toBe(true);
    }
  });

  it('gated buildings and the Refinery reference real upgrades and resources', () => {
    for (const b of Object.values(cfg.buildingTypes)) {
      if (b.requiresUpgrade) expect(upgradeIds.has(b.requiresUpgrade)).toBe(true);
      if (b.farmYieldsResource) expect(resourceIds.has(b.farmYieldsResource)).toBe(true);
    }
    expect(cfg.buildingTypes.refinery.farmYieldsResource).toBe('gas');
  });

  it('resolves every upgrade prereq and research building', () => {
    for (const up of cfg.upgrades ?? []) {
      expect(buildingIds.has(up.researchAt)).toBe(true);
      if (up.prereqBuilding) expect(buildingIds.has(up.prereqBuilding)).toBe(true);
      if (up.prereqUpgrade) expect(upgradeIds.has(up.prereqUpgrade)).toBe(true);
      for (const eff of up.effects) expect(unitIds.has(eff.unitTypeId)).toBe(true);
    }
    // Infantry Weapons stacks: level 2 needs level 1 first.
    expect(cfg.upgrades!.find((u) => u.id === 'infWeapons2')!.prereqUpgrade).toBe('infWeapons1');
  });

  it('every unlocksUnits entry points at a real unit gated by that upgrade', () => {
    for (const up of cfg.upgrades ?? []) {
      for (const id of up.unlocksUnits ?? []) {
        expect(unitIds.has(id)).toBe(true);
        expect(cfg.unitTypes[id].requiresUpgrade).toBe(up.id);
      }
    }
    expect(cfg.upgrades!.find((u) => u.id === 'siegeTech')!.unlocksUnits).toEqual(['tank']);
  });

  it('the swarm AI build order and attack waves reference real types', () => {
    for (const step of cfg.ai.buildOrder) expect(buildingIds.has(step.buildingTypeId)).toBe(true);
    for (const wave of cfg.ai.attackWaves) {
      for (const id of Object.keys(wave.comp)) expect(unitIds.has(id)).toBe(true);
    }
    expect(cfg.ai.personality).toBe('swarm');
    // Exactly one early raid aimed at the harvesters, the rest at the base.
    const raids = cfg.ai.attackWaves.filter((w) => w.target === 'workers');
    expect(raids).toHaveLength(1);
    expect(raids[0].atSec).toBeLessThan(cfg.ai.attackWaves.find((w) => w.target === 'base')!.atSec);
  });

  it('every unit and building sprite validates clean', () => {
    for (const u of Object.values(cfg.unitTypes)) {
      expect(u.sprite).toBeDefined();
      expect(validateSpriteDef(u.sprite!)).toEqual([]);
    }
    for (const b of Object.values(cfg.buildingTypes)) {
      expect(b.sprite).toBeDefined();
      expect(validateSpriteDef(b.sprite!)).toEqual([]);
    }
  });

  it('draws both resources with a validated patch prop (crystal + geyser)', () => {
    for (const r of cfg.resources) {
      expect(r.sprite).toBeDefined();
      expect(validateSpriteDef(r.sprite!)).toEqual([]);
    }
  });

  it('flags the enemy-only Zerg roster and its gate hidden', () => {
    expect(cfg.unitTypes.zergling.hidden).toBe(true);
    expect(cfg.unitTypes.hydralisk.hidden).toBe(true);
    expect(cfg.buildingTypes.sunkenColony.hidden).toBe(true);
    expect(cfg.upgrades!.find((u) => u.id === 'zergSwarm')!.hidden).toBe(true);
    // Everything the player can actually field stays visible.
    expect(cfg.unitTypes.marine.hidden).toBeFalsy();
    expect(cfg.buildingTypes.barracks.hidden).toBeFalsy();
  });
});

describe('StarCraft seeded smoke', () => {
  it('boots two bases and the starting SCVs', () => {
    const s = createRtsState(cfg);
    expect(playerBase(s)).toBeDefined();
    expect(enemyBase(s)).toBeDefined();
    expect(s.units.filter((u) => u.owner === 'player' && u.typeId === 'scv').length).toBe(4);
    expect(s.units.filter((u) => u.owner === 'enemy' && u.typeId === 'zergling').length).toBe(4);
    expect(s.resources.minerals).toBe(150);
    expect(s.resources.gas).toBe(0);
  });

  it('survives the opening worker raid without losing the base', () => {
    const s = createRtsState(cfg);
    expect(() => stepFor(s, 80)).not.toThrow();
    expect(s.status).toBe('playing');
  });

  it('grinds a long passive skirmish without throwing', () => {
    // With no player input the base eventually falls to the swarm; we only assert
    // the sim never throws across a full ramp cycle.
    const s = createRtsState(cfg);
    expect(() => stepFor(s, 260)).not.toThrow();
  });

  it('spawns the first swarm wave and lays Sunken Colony defenses', () => {
    const s = createRtsState(cfg);
    const start = enemyUnits(s);
    stepFor(s, 60);
    expect(enemyUnits(s)).toBeGreaterThan(start); // the 50s raid has hatched
    stepFor(s, 110);
    // Command Center + at least one Sunken Colony from the enemy build order.
    expect(s.buildings.filter((b) => b.owner === 'enemy').length).toBeGreaterThanOrEqual(2);
  });

  it('locks the Siege Tank behind Siege Tech and unlocks it once researched', () => {
    const s = createRtsState(cfg);
    expect(opt(getCommandOptions(s), 'train', 'tank').reason).toMatch(/Siege Tech/);
    // Siege Tech needs a Factory first.
    expect(startResearch(s, 'siegeTech')).toBe(false);

    s.resources.minerals = 9999;
    s.resources.gas = 9999;
    expect(placeBuilding(s, 'factory', 260, 320)).toBe(true);
    stepFor(s, cfg.buildingTypes.factory.buildTimeSec + 0.5);
    expect(startResearch(s, 'siegeTech')).toBe(true);
    stepFor(s, cfg.upgrades!.find((u) => u.id === 'siegeTech')!.researchTimeSec + 1);
    expect(isResearched(s, 'siegeTech')).toBe(true);
    expect(opt(getCommandOptions(s), 'train', 'tank').reason ?? '').not.toMatch(/Siege Tech/);
  });

  it('placing a Refinery seeds a fresh gas patch', () => {
    const s = createRtsState(cfg);
    const patchesBefore = s.patches.length;
    s.resources.minerals = 999;
    expect(placeBuilding(s, 'refinery', 260, 300)).toBe(true);
    expect(s.patches.length).toBe(patchesBefore + 1);
    expect(s.patches.at(-1)!.resourceId).toBe('gas');
  });

  it('keeps the enemy-only Zerg roster out of the player command panel', () => {
    const s = createRtsState(cfg);
    const opts = getCommandOptions(s);
    // The Zerg trio and their strain gate are hidden, so they never surface as
    // panel entries — not even permanently-greyed ones.
    expect(opts.some((o) => o.kind === 'train' && o.id === 'zergling')).toBe(false);
    expect(opts.some((o) => o.kind === 'train' && o.id === 'hydralisk')).toBe(false);
    expect(opts.some((o) => o.kind === 'build' && o.id === 'sunkenColony')).toBe(false);
    expect(opts.some((o) => o.kind === 'research' && o.id === 'zergSwarm')).toBe(false);
    // The Terran roster the player actually commands is still listed.
    expect(opt(opts, 'train', 'marine').name).toBe('Marine');
    expect(opt(opts, 'build', 'barracks').name).toBe('Barracks');
    // The strain itself can never be researched — it needs a Sunken Colony.
    s.resources.minerals = 9999;
    s.resources.gas = 9999;
    expect(startResearch(s, 'zergSwarm')).toBe(false);
  });
});
