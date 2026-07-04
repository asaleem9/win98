import { LEVELS, parseLevel, exitReachable, makeScene } from '../levels';
import { WALL } from '../texture';

describe('level parsing', () => {
  it('ships three levels that all parse', () => {
    expect(LEVELS).toHaveLength(3);
    for (const level of LEVELS) {
      expect(level.width).toBeGreaterThan(0);
      expect(level.height).toBeGreaterThan(0);
      expect(level.cells).toHaveLength(level.width * level.height);
    }
  });

  it('has exactly one start per level', () => {
    for (const level of LEVELS) {
      // The parser throws without a start, so reaching here means one exists;
      // assert the recorded start sits on floor, not inside a wall.
      const idx = Math.floor(level.start.y) * level.width + Math.floor(level.start.x);
      expect(level.cells[idx]).toBe(WALL.EMPTY);
    }
  });

  it('encloses every level with a solid border', () => {
    for (const level of LEVELS) {
      const { width, height, cells } = level;
      for (let x = 0; x < width; x++) {
        expect(cells[x]).not.toBe(WALL.EMPTY);
        expect(cells[(height - 1) * width + x]).not.toBe(WALL.EMPTY);
      }
      for (let y = 0; y < height; y++) {
        expect(cells[y * width]).not.toBe(WALL.EMPTY);
        expect(cells[y * width + width - 1]).not.toBe(WALL.EMPTY);
      }
    }
  });

  it('keeps the exit reachable from the start (ignoring doors)', () => {
    for (const level of LEVELS) {
      expect(exitReachable(level)).toBe(true);
    }
  });

  it('records door slide axes and initial closed state', () => {
    for (const level of LEVELS) {
      for (const door of level.doors) {
        expect(door.axis === 1 || door.axis === 2).toBe(true);
        expect(door.state).toBe('closed');
        expect(door.open).toBe(0);
        expect(level.doorAxis[door.y * level.width + door.x]).toBe(door.axis);
      }
    }
  });

  it('tallies enemies, items and treasures', () => {
    for (const level of LEVELS) {
      expect(level.totalEnemies).toBe(level.enemies.length);
      expect(level.totalItems).toBe(level.pickups.length);
      expect(level.totalTreasures).toBe(level.pickups.filter((p) => p.kind === 'treasure').length);
    }
  });

  it('reports an unreachable exit walled off from the start', () => {
    const sealed = parseLevel('Test', 'Sealed', [
      '######',
      '#P.#X#',
      '#..#.#',
      '######',
    ]);
    expect(exitReachable(sealed)).toBe(false);
  });

  it('builds a scene with shut doors', () => {
    const scene = makeScene(LEVELS[0]);
    expect(scene.doorOpen.every((v) => v === 0)).toBe(true);
    expect(scene.cells).toBe(LEVELS[0].cells);
  });
});
