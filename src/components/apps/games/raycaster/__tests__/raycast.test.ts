import { castRay, hasLineOfSight, isBlocking, isSolidPoint, spriteTransform, AXIS_X, type RayScene } from '../raycast';
import { WALL } from '../texture';

// A small hand-built scene: solid brick border around open floor, with helpers
// to drop walls and doors in.
function grid(rows: string[]): RayScene {
  const height = rows.length;
  const width = rows[0].length;
  const cells = new Uint8Array(width * height);
  const doorOpen = new Float32Array(width * height);
  const doorAxis = new Uint8Array(width * height);
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      const idx = y * width + x;
      if (ch === '#') cells[idx] = WALL.BRICK;
      else if (ch === 'D') {
        cells[idx] = WALL.DOOR;
        doorAxis[idx] = AXIS_X; // plane at constant x
      }
    }
  });
  return { width, height, cells, doorOpen, doorAxis };
}

describe('DDA wall casting', () => {
  const scene = grid([
    '#######',
    '#.....#',
    '#.....#',
    '#.....#',
    '#######',
  ]);

  it('hits the east wall at the expected distance looking straight ahead', () => {
    // Standing at x=1.5 (just inside west wall), the east wall face is at x=6.
    const hit = castRay(scene, 1.5, 2.5, 1, 0);
    expect(hit).not.toBeNull();
    expect(hit!.wall).toBe(WALL.BRICK);
    expect(hit!.side).toBe(0);
    expect(hit!.dist).toBeCloseTo(4.5, 5); // 6 - 1.5
  });

  it('hits the north wall looking up', () => {
    const hit = castRay(scene, 3.5, 3.5, 0, -1);
    expect(hit!.side).toBe(1);
    expect(hit!.dist).toBeCloseTo(2.5, 5); // 3.5 - 1
  });

  it('reports texture coordinate along the struck wall', () => {
    const hit = castRay(scene, 1.25, 2.5, 1, 0);
    expect(hit!.tex).toBeGreaterThanOrEqual(0);
    expect(hit!.tex).toBeLessThan(1);
  });

  it('returns a nearer hit for a closer wall', () => {
    const near = castRay(scene, 4.5, 2.5, 1, 0)!; // wall at x=6
    const far = castRay(scene, 1.5, 2.5, 1, 0)!;
    expect(near.dist).toBeLessThan(far.dist);
  });
});

describe('doors in the ray march', () => {
  // A one-tile corridor running east-west with a door in the middle. Walls
  // north and south of the door make it a constant-x (AXIS_X) sliding plane.
  const scene = grid([
    '#####',
    '#.D.#',
    '#####',
  ]);

  it('a shut door stops the ray at its centre plane', () => {
    const hit = castRay(scene, 1.5, 1.5, 1, 0)!;
    expect(hit.door).toBe(true);
    expect(hit.wall).toBe(WALL.DOOR);
    expect(hit.dist).toBeCloseTo(1.0, 5); // door plane at x = 2.5, minus posX 1.5
  });

  it('an open door lets the ray pass to the wall behind', () => {
    scene.doorOpen[1 * scene.width + 2] = 1; // fully retracted
    const hit = castRay(scene, 1.5, 1.5, 1, 0)!;
    expect(hit.door).toBe(false);
    expect(hit.wall).toBe(WALL.BRICK); // the east wall at x=4
    scene.doorOpen[1 * scene.width + 2] = 0;
  });
});

describe('line of sight', () => {
  const scene = grid([
    '#######',
    '#.....#',
    '#.###.#',
    '#.....#',
    '#######',
  ]);

  it('is clear across open floor', () => {
    expect(hasLineOfSight(scene, 1.5, 1.5, 5.5, 1.5)).toBe(true);
  });

  it('is blocked by a wall between the two points', () => {
    // The wall block spans x=2..4 at y=2; peer through it diagonally.
    expect(hasLineOfSight(scene, 1.5, 1.5, 3.5, 3.5)).toBe(false);
  });

  it('treats a shut door as opaque and an open one as clear', () => {
    const d = grid(['#####', '#.D.#', '#####']);
    expect(hasLineOfSight(d, 1.5, 1.5, 3.5, 1.5)).toBe(false);
    d.doorOpen[1 * d.width + 2] = 1;
    expect(hasLineOfSight(d, 1.5, 1.5, 3.5, 1.5)).toBe(true);
  });
});

describe('collision probes', () => {
  const scene = grid(['###', '#.#', '###']);
  it('flags solid tiles and clears open ones', () => {
    expect(isBlocking(scene, 0, 0)).toBe(true);
    expect(isBlocking(scene, 1, 1)).toBe(false);
    expect(isSolidPoint(scene, 1.5, 1.5)).toBe(false);
    expect(isSolidPoint(scene, 0.5, 0.5)).toBe(true);
  });
});

describe('sprite projection', () => {
  const cam = { posX: 2, posY: 2, dirX: 1, dirY: 0, planeX: 0, planeY: 0.66 };

  it('puts a sprite ahead of the camera at positive depth', () => {
    const { ty } = spriteTransform(cam, 5, 2);
    expect(ty).toBeGreaterThan(0);
  });

  it('puts a sprite behind the camera at non-positive depth', () => {
    const { ty } = spriteTransform(cam, -1, 2);
    expect(ty).toBeLessThanOrEqual(0);
  });

  it('offsets a sprite to the correct side of screen centre', () => {
    const left = spriteTransform(cam, 5, 1); // to the player's left
    const right = spriteTransform(cam, 5, 3);
    expect(Math.sign(left.tx)).not.toBe(Math.sign(right.tx));
  });
});
