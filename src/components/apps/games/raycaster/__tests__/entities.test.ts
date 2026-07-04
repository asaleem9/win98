import { makeRng } from '../../engine/rng';
import { WALL } from '../texture';
import {
  tryOpenDoor,
  updateDoor,
  DOOR_HOLD,
  makeEnemy,
  updateEnemy,
  damageEnemy,
  applyPickup,
  applyDamage,
  makePlayerState,
  MAX_HP,
  MAX_AMMO,
  ENEMY_STATS,
  type Door,
  type EnemyContext,
} from '../entities';

function makeDoor(type: number = WALL.DOOR): Door {
  return { x: 2, y: 1, type, axis: 1, state: 'closed', open: 0, timer: 0 };
}

describe('door state machine', () => {
  it('opens an unlocked door and slides it fully open then auto-closes', () => {
    const door = makeDoor();
    expect(tryOpenDoor(door, { silver: false, gold: false })).toBe('opened');
    expect(door.state).toBe('opening');

    // Drive it open.
    for (let i = 0; i < 60 && door.state !== 'open'; i++) updateDoor(door, 1 / 30, false);
    expect(door.state).toBe('open');
    expect(door.open).toBeCloseTo(1, 5);

    // It waits, then closes when nobody is under it.
    updateDoor(door, DOOR_HOLD + 0.1, false);
    expect(door.state).toBe('closing');
    for (let i = 0; i < 60 && door.state !== 'closed'; i++) updateDoor(door, 1 / 30, false);
    expect(door.state).toBe('closed');
    expect(door.open).toBe(0);
  });

  it('will not open a locked door without the matching key', () => {
    const silver = makeDoor(WALL.DOOR_SILVER);
    expect(tryOpenDoor(silver, { silver: false, gold: false })).toBe('locked');
    expect(silver.state).toBe('closed');
    expect(tryOpenDoor(silver, { silver: true, gold: false })).toBe('opened');
  });

  it('stays open while something blocks the doorway', () => {
    const door = makeDoor();
    tryOpenDoor(door, { silver: false, gold: false });
    for (let i = 0; i < 60; i++) updateDoor(door, 1 / 30, false);
    updateDoor(door, DOOR_HOLD + 1, true); // blocked
    expect(door.state).toBe('open');
  });
});

describe('enemy AI', () => {
  const baseCtx = (over: Partial<EnemyContext> = {}): EnemyContext => ({
    playerX: 5,
    playerY: 1.5,
    playerAlive: true,
    canSeePlayer: false,
    blocked: () => false,
    rand: makeRng(1),
    ...over,
  });

  it('switches from patrol to chase when it spots the player', () => {
    const e = makeEnemy(0, 'guard', 1.5, 1.5);
    expect(e.state).toBe('patrol');
    updateEnemy(e, baseCtx({ canSeePlayer: true, playerX: 3 }), 0.1);
    expect(e.state).toBe('chase');
    expect(e.alerted).toBe(true);
  });

  it('stays on patrol while the player is out of sight', () => {
    const e = makeEnemy(0, 'guard', 1.5, 1.5);
    updateEnemy(e, baseCtx({ canSeePlayer: false }), 0.1);
    expect(e.state).toBe('patrol');
  });

  it('enters attack range and eventually fires', () => {
    const e = makeEnemy(0, 'brute', 2, 1.5);
    const ctx = baseCtx({ canSeePlayer: true, playerX: 3, playerY: 1.5, rand: makeRng(7) });
    // Close enough to attack; step until it has fired at least once.
    let fired = false;
    for (let i = 0; i < 200 && !fired; i++) {
      const action = updateEnemy(e, ctx, 1 / 30);
      if (action.fired) fired = true;
    }
    expect(fired).toBe(true);
  });

  it('deals damage no larger than its stat band when it connects', () => {
    const e = makeEnemy(0, 'sentry', 2, 1.5);
    e.state = 'attack';
    const ctx = baseCtx({ canSeePlayer: true, playerX: 2.5, playerY: 1.5, rand: makeRng(3) });
    for (let i = 0; i < 300; i++) {
      const action = updateEnemy(e, ctx, 1 / 30);
      if (action.fired && action.damage > 0) {
        expect(action.damage).toBeLessThanOrEqual(ENEMY_STATS.sentry.dmgMax);
        expect(action.damage).toBeGreaterThanOrEqual(ENEMY_STATS.sentry.dmgMin);
      }
    }
  });

  it('takes damage, gets stunned, then dies', () => {
    const e = makeEnemy(0, 'sentry', 2, 2);
    const killed = damageEnemy(e, 5);
    expect(killed).toBe(false);
    expect(e.state).toBe('hurt');
    const dead = damageEnemy(e, 999);
    expect(dead).toBe(true);
    expect(e.state).toBe('dead');
    // A dead enemy is inert.
    const action = updateEnemy(e, baseCtx({ canSeePlayer: true }), 1);
    expect(action.fired).toBe(false);
  });
});

describe('pickups and damage', () => {
  it('heals with a medkit but not past the cap', () => {
    let p = makePlayerState();
    p.hp = 40;
    const r = applyPickup(p, 'medkit');
    expect(r.picked).toBe(true);
    expect(r.player.hp).toBe(65);
    // At full health the medkit is left on the floor.
    p = { ...p, hp: MAX_HP };
    expect(applyPickup(p, 'medkit').picked).toBe(false);
  });

  it('adds ammo up to the cap', () => {
    const p = { ...makePlayerState(), ammo: MAX_AMMO - 3 };
    const r = applyPickup(p, 'ammoBox');
    expect(r.player.ammo).toBe(MAX_AMMO);
  });

  it('grants keycards and counts treasures as secrets', () => {
    let p = makePlayerState();
    p = applyPickup(p, 'silverKey').player;
    expect(p.silverKey).toBe(true);
    const t = applyPickup(p, 'treasure');
    expect(t.player.treasures).toBe(1);
    expect(t.player.score).toBeGreaterThan(p.score);
  });

  it('lets armor soak part of incoming damage', () => {
    const armored = { ...makePlayerState(), armor: 50 };
    const after = applyDamage(armored, 30);
    expect(after.armor).toBeLessThan(50);
    expect(after.hp).toBeGreaterThan(MAX_HP - 30); // armor absorbed some
  });
});
