import { CNC_CONFIG } from '../CommandConquer';
import { createRtsState, stepRts, playerBase, enemyBase, type RtsState } from '../engine/rts';
import { validateSpriteDef } from '../engine/sprites';

function stepFor(s: RtsState, seconds: number, dt = 0.05) {
  for (let t = 0; t < seconds; t += dt) stepRts(s, dt);
}

describe('Red Alert config validity', () => {
  const cfg = CNC_CONFIG;
  const unitIds = new Set(Object.keys(cfg.unitTypes));
  const buildingIds = new Set(Object.keys(cfg.buildingTypes));
  const upgradeIds = new Set((cfg.upgrades ?? []).map((u) => u.id));

  it('has exactly one base building', () => {
    const bases = Object.values(cfg.buildingTypes).filter((b) => b.isBase);
    expect(bases).toHaveLength(1);
    expect(bases[0].name).toBe('Construction Yard');
  });

  it('trains every unit at a building that exists', () => {
    for (const def of Object.values(cfg.unitTypes)) {
      expect(buildingIds.has(def.trainedAt)).toBe(true);
    }
  });

  it('gates units and buildings only behind real upgrades', () => {
    for (const def of Object.values(cfg.unitTypes)) {
      if (def.requiresUpgrade) expect(upgradeIds.has(def.requiresUpgrade)).toBe(true);
    }
    for (const def of Object.values(cfg.buildingTypes)) {
      if (def.requiresUpgrade) expect(upgradeIds.has(def.requiresUpgrade)).toBe(true);
    }
  });

  it('resolves every upgrade prereq and effect target', () => {
    for (const up of cfg.upgrades ?? []) {
      expect(buildingIds.has(up.researchAt)).toBe(true);
      if (up.prereqBuilding) expect(buildingIds.has(up.prereqBuilding)).toBe(true);
      if (up.prereqUpgrade) expect(upgradeIds.has(up.prereqUpgrade)).toBe(true);
      for (const eff of up.effects) expect(unitIds.has(eff.unitTypeId)).toBe(true);
      for (const id of up.unlocksUnits ?? []) expect(unitIds.has(id)).toBe(true);
    }
  });

  it('references only real unit and building types in the AI script', () => {
    for (const order of cfg.ai.buildOrder) expect(buildingIds.has(order.buildingTypeId)).toBe(true);
    for (const wave of cfg.ai.attackWaves) {
      expect(['base', 'workers']).toContain(wave.target);
      for (const id of Object.keys(wave.comp)) expect(unitIds.has(id)).toBe(true);
    }
    for (const s of cfg.startUnits) expect(unitIds.has(s.typeId)).toBe(true);
    for (const s of cfg.enemyStartUnits ?? []) expect(unitIds.has(s.typeId)).toBe(true);
  });

  it('points every patch at the single ore resource that regrows', () => {
    expect(cfg.resources).toHaveLength(1);
    const ore = cfg.resources[0].id;
    expect(cfg.map.patchRegrows).toBe(true);
    expect(cfg.map.patchRegrowRate).toBeGreaterThan(0);
    for (const p of cfg.map.patches) expect(p.resourceId).toBe(ore);
  });

  it('validates every wired sprite', () => {
    for (const def of Object.values(cfg.unitTypes)) {
      if (def.sprite) expect(validateSpriteDef(def.sprite)).toEqual([]);
    }
    for (const def of Object.values(cfg.buildingTypes)) {
      if (def.sprite) expect(validateSpriteDef(def.sprite)).toEqual([]);
    }
  });

  it('draws the ore field with a validated patch prop', () => {
    for (const r of cfg.resources) {
      expect(r.sprite).toBeDefined();
      expect(validateSpriteDef(r.sprite!)).toEqual([]);
    }
  });

  it('leaves the whole Allied roster visible — nothing is hidden', () => {
    // Heavy Tank and Tesla Coil are enemy-only but capturable via Soviet
    // Ordnance, so they stay in the panel; the config hides nothing.
    for (const def of Object.values(cfg.unitTypes)) expect(def.hidden).toBeFalsy();
    for (const def of Object.values(cfg.buildingTypes)) expect(def.hidden).toBeFalsy();
  });

  it('makes Ore Trucks the scarce, expensive backbone of the economy', () => {
    const truck = cfg.unitTypes.truck;
    const rifle = cfg.unitTypes.rifle;
    expect(truck.role).toBe('worker');
    expect(cfg.startUnits).toEqual([{ typeId: 'truck', count: 2 }]);
    // Fat, slow, and pricier than a squad of infantry.
    expect(truck.cost.ore).toBeGreaterThan(rifle.cost.ore * 2);
    expect(truck.speed).toBeLessThan(rifle.speed);
    // One heavy load per long haul.
    expect(cfg.harvestAmount).toBeGreaterThanOrEqual(40);
    expect(cfg.harvestTime).toBeGreaterThanOrEqual(4);
  });

  it('carries an A-Bomb superweapon', () => {
    expect(cfg.superweapon?.name).toBe('A-Bomb');
    expect(cfg.superweapon!.cooldownSec).toBeGreaterThan(60);
    expect(cfg.superweapon!.damage).toBeGreaterThan(0);
    expect(cfg.superweapon!.radius).toBeGreaterThan(0);
  });
});

describe('Red Alert harassment loop', () => {
  it("opens by hunting the player's Ore Trucks", () => {
    // The signature Red Alert pressure: the very first wave is a raid on workers.
    expect(CNC_CONFIG.ai.attackWaves[0].target).toBe('workers');
  });

  it('spawns a worker-hunting raid before any base assault', () => {
    const s = createRtsState(CNC_CONFIG);
    // Step just past the first scripted wave (40s) but before the second (75s).
    stepFor(s, 50);
    const waveUnits = s.units.filter((u) => u.owner === 'enemy' && u.orderTarget);
    expect(waveUnits.length).toBeGreaterThan(0);
    // Everything fielded so far is out for the harvesters, not the base.
    expect(waveUnits.every((u) => u.orderTarget === 'workers')).toBe(true);
  });

  it('runs a long skirmish without throwing and keeps the ore economy alive', () => {
    const s = createRtsState(CNC_CONFIG);
    expect(playerBase(s)).toBeDefined();
    expect(enemyBase(s)).toBeDefined();
    const start = s.resources.ore;
    expect(() => stepFor(s, 180)).not.toThrow();
    // Two trucks hauling fat loads should have banked ore over three minutes.
    expect(s.resources.ore).toBeGreaterThan(start);
    // The Soviets should have fielded raids and put down at least one Tesla Coil.
    expect(s.buildings.some((b) => b.owner === 'enemy' && b.typeId === 'tesla')).toBe(true);
  });
});
