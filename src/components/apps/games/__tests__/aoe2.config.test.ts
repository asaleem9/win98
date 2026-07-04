import { AOE_CONFIG } from '../AgeOfEmpires2';
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

const cfg = AOE_CONFIG;

function stepFor(s: ReturnType<typeof createRtsState>, seconds: number, dt = 0.05) {
  for (let t = 0; t < seconds; t += dt) stepRts(s, dt);
}

function opt(opts: CommandOption[], kind: CommandOption['kind'], id: string): CommandOption {
  const found = opts.find((o) => o.kind === kind && o.id === id);
  if (!found) throw new Error(`no ${kind} option for ${id}`);
  return found;
}

describe('AoE2 config validity', () => {
  const resourceIds = new Set(cfg.resources.map((r) => r.id));
  const buildingIds = new Set(Object.keys(cfg.buildingTypes));
  const unitIds = new Set(Object.keys(cfg.unitTypes));
  const upgradeIds = new Set((cfg.upgrades ?? []).map((u) => u.id));

  it('names the two-resource medieval economy', () => {
    expect([...resourceIds].sort()).toEqual(['food', 'wood']);
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

  it('gated buildings and farms reference real upgrades and resources', () => {
    for (const b of Object.values(cfg.buildingTypes)) {
      if (b.requiresUpgrade) expect(upgradeIds.has(b.requiresUpgrade)).toBe(true);
      if (b.farmYieldsResource) expect(resourceIds.has(b.farmYieldsResource)).toBe(true);
    }
    // The Farm is the renewable food source.
    expect(cfg.buildingTypes.farm.farmYieldsResource).toBe('food');
  });

  it('resolves the Dark -> Feudal -> Castle age chain', () => {
    const feudal = cfg.upgrades!.find((u) => u.id === 'feudal')!;
    const castle = cfg.upgrades!.find((u) => u.id === 'castle')!;
    expect(feudal.prereqUpgrade).toBeUndefined();
    expect(castle.prereqUpgrade).toBe('feudal');
    for (const up of cfg.upgrades!) {
      expect(buildingIds.has(up.researchAt)).toBe(true);
      if (up.prereqUpgrade) expect(upgradeIds.has(up.prereqUpgrade)).toBe(true);
      expect(up.announce).toBeTruthy();
    }
  });

  it('every unlocksUnits entry points at a real unit gated by that upgrade', () => {
    for (const up of cfg.upgrades ?? []) {
      for (const id of up.unlocksUnits ?? []) {
        expect(unitIds.has(id)).toBe(true);
        expect(cfg.unitTypes[id].requiresUpgrade).toBe(up.id);
      }
    }
  });

  it('the AI build order and attack waves reference real types', () => {
    for (const step of cfg.ai.buildOrder) expect(buildingIds.has(step.buildingTypeId)).toBe(true);
    for (const wave of cfg.ai.attackWaves) {
      for (const id of Object.keys(wave.comp)) expect(unitIds.has(id)).toBe(true);
    }
    expect(cfg.ai.personality).toBe('boom');
  });

  it('every unit and building sprite validates clean', () => {
    for (const u of Object.values(cfg.unitTypes)) {
      if (u.sprite) expect(validateSpriteDef(u.sprite)).toEqual([]);
    }
    for (const b of Object.values(cfg.buildingTypes)) {
      if (b.sprite) expect(validateSpriteDef(b.sprite)).toEqual([]);
    }
  });
});

describe('AoE2 seeded smoke', () => {
  it('boots two bases and the starting villagers', () => {
    const s = createRtsState(cfg);
    expect(playerBase(s)).toBeDefined();
    expect(enemyBase(s)).toBeDefined();
    expect(s.units.filter((u) => u.owner === 'player' && u.typeId === 'villager').length).toBe(4);
    expect(s.resources.food).toBe(200);
    expect(s.resources.wood).toBe(200);
  });

  it('ticks a couple of minutes without throwing and keeps playing', () => {
    const s = createRtsState(cfg);
    expect(() => stepFor(s, 130)).not.toThrow();
    expect(s.status).toBe('playing');
  });

  it('locks Feudal/Castle units and buildings until their age is researched', () => {
    const s = createRtsState(cfg);
    const before = getCommandOptions(s);
    expect(opt(before, 'train', 'man_at_arms').reason).toMatch(/Feudal Age/);
    expect(opt(before, 'train', 'archer').reason).toMatch(/Feudal Age/);
    expect(opt(before, 'train', 'knight').reason).toMatch(/Castle Age/);
    expect(opt(before, 'build', 'range').reason).toMatch(/Feudal Age/);
    expect(opt(before, 'build', 'stable').reason).toMatch(/Castle Age/);
    // Castle can't even begin before Feudal is done.
    expect(startResearch(s, 'castle')).toBe(false);
  });

  it('researching the Feudal Age unlocks the Archery Range and Men-at-Arms', () => {
    const s = createRtsState(cfg);
    expect(startResearch(s, 'feudal')).toBe(true);
    stepFor(s, cfg.upgrades!.find((u) => u.id === 'feudal')!.researchTimeSec + 1);
    expect(isResearched(s, 'feudal')).toBe(true);

    const opts = getCommandOptions(s);
    const range = opt(opts, 'build', 'range');
    expect(range.enabled).toBe(true); // unlocked and affordable from the start bank
    // Man-at-Arms is no longer gated by the age (Barracks is now the only need).
    expect(opt(opts, 'train', 'man_at_arms').reason ?? '').not.toMatch(/Feudal Age/);

    // With the age open, the Castle research can now be started.
    s.resources.food = 999;
    s.resources.wood = 999;
    expect(startResearch(s, 'castle')).toBe(true);
  });

  it('placing a Farm seeds a fresh food patch', () => {
    const s = createRtsState(cfg);
    const patchesBefore = s.patches.length;
    s.resources.wood = 999;
    expect(placeBuilding(s, 'farm', 300, 340)).toBe(true);
    expect(s.patches.length).toBe(patchesBefore + 1);
    expect(s.patches.at(-1)!.resourceId).toBe('food');
  });
});
