// The three hand-authored maps and the parser that turns a readable character
// grid into the typed scene the game runs on. Legend:
//
//   #  brick wall      o  stone wall     M  metal wall    c  circuit wall
//   D  door            S  silver door    G  gold door     X  exit lift
//   .  floor (space also works)          P  player start
//   1  sentry drone    2  guard bot      3  brute
//   h  medkit          s  stim           a  ammo clip     A  ammo crate
//   r  armor plate     k  silver key     K  gold key      t  data cache (treasure)
//
// The parser is defensive: ragged rows are padded and the outer edge is forced
// solid, so a stray character can never let the player walk off the map.

import { WALL, isDoorId } from './texture';
import { AXIS_X, AXIS_Y, type RayScene } from './raycast';
import { makeEnemy, type Door, type Enemy, type EnemyKind, type Pickup, type PickupKind } from './entities';

export interface LevelStart {
  x: number;
  y: number;
  angle: number; // radians; 0 = +x (east)
}

export interface ParsedLevel {
  name: string;
  subtitle: string;
  width: number;
  height: number;
  cells: Uint8Array;
  doorAxis: Uint8Array;
  doors: Door[];
  enemies: Enemy[];
  pickups: Pickup[];
  start: LevelStart;
  exit: { x: number; y: number };
  totalItems: number;
  totalEnemies: number;
  totalTreasures: number;
}

const ENEMY_CHARS: Record<string, EnemyKind> = { '1': 'sentry', '2': 'guard', '3': 'brute' };
const PICKUP_CHARS: Record<string, PickupKind> = {
  h: 'medkit',
  s: 'stim',
  a: 'ammo',
  A: 'ammoBox',
  r: 'armor',
  k: 'silverKey',
  K: 'goldKey',
  t: 'treasure',
};

function wallCharToId(ch: string): number | null {
  switch (ch) {
    case '#':
      return WALL.BRICK;
    case 'o':
      return WALL.STONE;
    case 'M':
      return WALL.METAL;
    case 'c':
      return WALL.CIRCUIT;
    case 'D':
      return WALL.DOOR;
    case 'S':
      return WALL.DOOR_SILVER;
    case 'G':
      return WALL.DOOR_GOLD;
    case 'X':
      return WALL.EXIT;
    default:
      return null;
  }
}

export function parseLevel(name: string, subtitle: string, rows: readonly string[]): ParsedLevel {
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  const cells = new Uint8Array(width * height);
  const doorAxis = new Uint8Array(width * height);
  const doors: Door[] = [];
  const enemies: Enemy[] = [];
  const pickups: Pickup[] = [];
  let start: LevelStart | null = null;
  let exit: { x: number; y: number } | null = null;
  let enemyId = 0;
  let pickupId = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x] ?? '#';
      const idx = y * width + x;
      const wallId = wallCharToId(ch);

      if (wallId !== null) {
        cells[idx] = wallId;
        if (isDoorId(wallId)) doors.push({ x, y, type: wallId, axis: AXIS_X, state: 'closed', open: 0, timer: 0 });
        if (wallId === WALL.EXIT) exit = { x, y };
        continue;
      }

      // Floor-standing markers: the tile itself is empty floor.
      cells[idx] = WALL.EMPTY;
      if (ch === 'P') {
        start = { x: x + 0.5, y: y + 0.5, angle: 0 };
      } else if (ENEMY_CHARS[ch]) {
        enemies.push(makeEnemy(enemyId++, ENEMY_CHARS[ch], x + 0.5, y + 0.5));
      } else if (PICKUP_CHARS[ch]) {
        pickups.push({ id: pickupId++, kind: PICKUP_CHARS[ch], x: x + 0.5, y: y + 0.5, taken: false });
      }
    }
  }

  // Force the outer edge solid so no ray or step ever escapes.
  for (let x = 0; x < width; x++) {
    if (cells[x] === WALL.EMPTY) cells[x] = WALL.BRICK;
    const b = (height - 1) * width + x;
    if (cells[b] === WALL.EMPTY) cells[b] = WALL.BRICK;
  }
  for (let y = 0; y < height; y++) {
    if (cells[y * width] === WALL.EMPTY) cells[y * width] = WALL.BRICK;
    const r = y * width + width - 1;
    if (cells[r] === WALL.EMPTY) cells[r] = WALL.BRICK;
  }

  // Resolve each door's slide axis from its solid neighbours.
  const solid = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= width || y >= height) return true;
    const c = cells[y * width + x];
    return c !== WALL.EMPTY && !isDoorId(c);
  };
  for (const door of doors) {
    const northSouth = solid(door.x, door.y - 1) && solid(door.x, door.y + 1);
    const eastWest = solid(door.x - 1, door.y) && solid(door.x + 1, door.y);
    const axis = northSouth ? AXIS_X : eastWest ? AXIS_Y : AXIS_X;
    door.axis = axis;
    doorAxis[door.y * width + door.x] = axis;
  }

  if (!start) throw new Error(`level "${name}" has no start (P)`);
  if (!exit) throw new Error(`level "${name}" has no exit (X)`);

  // Face the player toward the first open cardinal direction.
  const openDir = ([
    [1, 0, 0],
    [0, 1, Math.PI / 2],
    [-1, 0, Math.PI],
    [0, -1, -Math.PI / 2],
  ] as const).find(([dx, dy]) => cells[(Math.floor(start!.y) + dy) * width + (Math.floor(start!.x) + dx)] === WALL.EMPTY);
  if (openDir) start.angle = openDir[2];

  return {
    name,
    subtitle,
    width,
    height,
    cells,
    doorAxis,
    doors,
    enemies,
    pickups,
    start,
    exit,
    totalItems: pickups.length,
    totalEnemies: enemies.length,
    totalTreasures: pickups.filter((p) => p.kind === 'treasure').length,
  };
}

/** A fresh mutable scene view over a parsed level (doors start shut). */
export function makeScene(level: ParsedLevel): RayScene {
  return {
    width: level.width,
    height: level.height,
    cells: level.cells,
    doorOpen: new Float32Array(level.width * level.height),
    doorAxis: level.doorAxis,
  };
}

/**
 * BFS from the start over walkable tiles (doors treated as open), returning true
 * when a floor tile next to the exit lift is reachable. Guards that every level
 * is actually completable.
 */
export function exitReachable(level: ParsedLevel): boolean {
  const { width, height, cells, start, exit } = level;
  const walkable = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const c = cells[y * width + x];
    return c === WALL.EMPTY || isDoorId(c);
  };
  const seen = new Uint8Array(width * height);
  const queue: number[] = [];
  const sx = Math.floor(start.x);
  const sy = Math.floor(start.y);
  queue.push(sy * width + sx);
  seen[sy * width + sx] = 1;
  while (queue.length) {
    const idx = queue.shift()!;
    const x = idx % width;
    const y = (idx - x) / width;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!walkable(nx, ny)) continue;
      const ni = ny * width + nx;
      if (seen[ni]) continue;
      seen[ni] = 1;
      queue.push(ni);
    }
  }
  // Reachable if any tile orthogonally adjacent to the exit was visited.
  return [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].some(([dx, dy]) => {
    const nx = exit.x + dx;
    const ny = exit.y + dy;
    return nx >= 0 && ny >= 0 && nx < width && ny < height && seen[ny * width + nx] === 1;
  });
}

// ---------------------------------------------------------------------------
// The maps
// ---------------------------------------------------------------------------

const L1_GRID = [
  '########################',
  '#P.............ooooooo.#',
  '#.######.a.....o...a.o.#',
  '#.#.1..#...#...D..t..o.#',
  '#.#.h..D.......o.....o.#',
  '#.#....#.......ooooooo.#',
  '#.######...............#',
  '#.........##D###....r..#',
  '#.........#....#.......#',
  '#.######..#.2..#.......#',
  '#.#....#..#....#.#######',
  '#.#.s..D..######.#....##',
  '#.#.1..#.........D..a.##',
  '#.######.........#..X.##',
  '#........1...2...#######',
  '########################',
];

const L2_GRID = [
  '############################',
  '#P.......#....h....#..2....#',
  '#..####..#..####...#..oo...#',
  '#..#..D..#..#..#...S..oo..k#',
  '#..#..#..#..D..#...#.......#',
  '#..#..#..#..#..#...####.####',
  '#..#..####..####...#.......#',
  '#..#...............#..A....#',
  '#..####..####..##..#.......#',
  '#.....#..#..#..2#..####..###',
  '#..2..D..#..#...#.....#....#',
  '#.....#..#..####.####.S..t.#',
  '#..####..#.....a....#.#....#',
  '#..#.....####..####.#.####.#',
  '#..#..r.....#.....#.#....#.#',
  '#..#........D..3..#.#..3.D.#',
  '#..###############.#......X#',
  '############################',
];

const L3_GRID = [
  '#############################',
  '#P.......#....2....#....K...#',
  '#..cccc..#..####...G..####..#',
  '#..c..c..D..#..#...#..#3.#..#',
  '#..c..c..#..#..#...#..#..#..#',
  '#..cc.c..#..#..####.#.####..#',
  '#........#..#.......#......t#',
  '#..####..#..D..##.#.#..######',
  '#..#..#..#..#...#.#.#.......#',
  '#..#3.#..#..####.#.####..#..#',
  '#..#..S..#.....#.#....#..S..#',
  '#..#..#..####..#.#..2.#..#..#',
  '#..####.....#..#.#....#..#..#',
  '#.......###.D..#.####.####..#',
  '#..r......#....#....#.....3.#',
  '#..####...####.####.#..####.#',
  '#..#..#......#....#.#..#..#.#',
  '#..#..####...D..3.#.#..#k.#.#',
  '#..#.....#...#....#.#..####.#',
  '#..D..2..#...####.G.#.......#',
  '#........#......#...#..t..XX#',
  '#############################',
];

export const LEVELS: ParsedLevel[] = [
  parseLevel('Sector One', 'Cold Storage', L1_GRID),
  parseLevel('Sector Two', 'Keycard Vaults', L2_GRID),
  parseLevel('Sector Three', 'Reactor Core', L3_GRID),
];
