'use client';

import { useRef, useEffect } from 'react';
import {
  ScreenSaverProps,
  measureSaver,
  saverContainerClass,
  useDismissOnInput,
} from './common';

// 1 = wall, 0 = open. A double-ring layout so the right-hand-rule walker loops
// forever without dead-ending.
const MAZE = [
  '############',
  '#..........#',
  '#.########.#',
  '#.#......#.#',
  '#.#.####.#.#',
  '#.#.#..#.#.#',
  '#.#.#..#.#.#',
  '#.#.####.#.#',
  '#.#......#.#',
  '#.########.#',
  '#..........#',
  '############',
].map((row) => [...row].map((c) => (c === '#' ? 1 : 0)));

const H = MAZE.length;
const W = MAZE[0].length;

// dir 0=E 1=S 2=W 3=N (map y grows downward)
const DELTA = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const DIR_ANGLE = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

const isOpen = (x: number, y: number) =>
  y >= 0 && y < H && x >= 0 && x < W && MAZE[y][x] === 0;

// Shortest signed angle from a to b
const angleDelta = (a: number, b: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export default function Maze3D({ onDismiss, preview = false }: ScreenSaverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let { width, height } = measureSaver(containerRef.current, preview);
    canvas.width = width;
    canvas.height = height;

    // Start in the first open cell, heading toward an open neighbour
    let cx = 1;
    let cy = 1;
    let dir = 0;
    while (!isOpen(cx + DELTA[dir][0], cy + DELTA[dir][1])) dir = (dir + 1) % 4;

    let posX = cx + 0.5;
    let posY = cy + 0.5;
    let heading = DIR_ANGLE[dir];
    let flipped = false;

    const smiley = { x: W - 2, y: H - 2 };

    // Right-hand rule: prefer right, then straight, then left, then back
    const decide = () => {
      for (const turn of [1, 0, 3, 2]) {
        const nd = (dir + turn) % 4;
        if (isOpen(cx + DELTA[nd][0], cy + DELTA[nd][1])) return nd;
      }
      return dir;
    };

    let phase: 'turn' | 'move' = 'move';
    let t = 0;
    let turnStart = heading;
    let turnEnd = heading;
    let fromX = posX;
    let fromY = posY;
    let toX = posX;
    let toY = posY;

    const planMove = () => {
      phase = 'move';
      t = 0;
      fromX = cx + 0.5;
      fromY = cy + 0.5;
      toX = cx + DELTA[dir][0] + 0.5;
      toY = cy + DELTA[dir][1] + 0.5;
    };

    const planTurn = (nd: number) => {
      phase = 'turn';
      t = 0;
      turnStart = heading;
      turnEnd = heading + angleDelta(heading, DIR_ANGLE[nd]);
      dir = nd;
    };

    const step = () => {
      const nd = decide();
      if (nd !== dir) planTurn(nd);
      else planMove();
    };
    step();

    const colW = preview ? 4 : 2;
    const zBuffer: number[] = [];

    let animId: number;

    function drawSmileyBillboard() {
      const spriteX = smiley.x + 0.5 - posX;
      const spriteY = smiley.y + 0.5 - posY;
      const dirX = Math.cos(heading);
      const dirY = Math.sin(heading);
      const planeX = -Math.sin(heading) * 0.66;
      const planeY = Math.cos(heading) * 0.66;
      const invDet = 1 / (planeX * dirY - dirX * planeY);
      const tx = invDet * (dirY * spriteX - dirX * spriteY);
      const ty = invDet * (-planeY * spriteX + planeX * spriteY);
      if (ty <= 0.2) return;

      const screenX = (width / 2) * (1 + tx / ty);
      const size = Math.min(width, height) / ty * 0.5;
      const col = Math.floor(screenX / colW);
      if (col < 0 || col >= zBuffer.length || ty >= zBuffer[col]) return;

      const r = size / 2;
      const cyS = height / 2;
      ctx!.fillStyle = '#FFD400';
      ctx!.beginPath();
      ctx!.arc(screenX, cyS, r, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = '#000000';
      ctx!.beginPath();
      ctx!.arc(screenX - r * 0.35, cyS - r * 0.25, r * 0.12, 0, Math.PI * 2);
      ctx!.arc(screenX + r * 0.35, cyS - r * 0.25, r * 0.12, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.strokeStyle = '#000000';
      ctx!.lineWidth = Math.max(1, r * 0.1);
      ctx!.beginPath();
      ctx!.arc(screenX, cyS, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx!.stroke();
    }

    function draw() {
      // Advance the walker
      const dt = phase === 'turn' ? 0.08 : preview ? 0.05 : 0.03;
      t += dt;
      if (phase === 'turn') {
        const e = Math.min(1, t);
        heading = turnStart + (turnEnd - turnStart) * e;
        if (t >= 1) {
          heading = DIR_ANGLE[dir];
          planMove();
        }
      } else {
        const e = Math.min(1, t);
        posX = fromX + (toX - fromX) * e;
        posY = fromY + (toY - fromY) * e;
        if (t >= 1) {
          cx += DELTA[dir][0];
          cy += DELTA[dir][1];
          posX = cx + 0.5;
          posY = cy + 0.5;
          if (cx === smiley.x && cy === smiley.y) {
            flipped = !flipped;
            // Relocate to a random open cell so it keeps happening
            for (let i = 0; i < 30; i++) {
              const rx = 1 + Math.floor(Math.random() * (W - 2));
              const ry = 1 + Math.floor(Math.random() * (H - 2));
              if (isOpen(rx, ry) && !(rx === cx && ry === cy)) {
                smiley.x = rx;
                smiley.y = ry;
                break;
              }
            }
          }
          step();
        }
      }

      // Sky / floor
      const sky = flipped ? '#3a3a3a' : '#101018';
      const floor = flipped ? '#101018' : '#3a3a3a';
      ctx!.fillStyle = sky;
      ctx!.fillRect(0, 0, width, height / 2);
      ctx!.fillStyle = floor;
      ctx!.fillRect(0, height / 2, width, height / 2);

      const dirX = Math.cos(heading);
      const dirY = Math.sin(heading);
      const planeX = -Math.sin(heading) * 0.66;
      const planeY = Math.cos(heading) * 0.66;

      zBuffer.length = 0;
      for (let x = 0; x < width; x += colW) {
        const cameraX = (2 * x) / width - 1;
        const rayX = dirX + planeX * cameraX;
        const rayY = dirY + planeY * cameraX;

        let mapX = Math.floor(posX);
        let mapY = Math.floor(posY);
        const deltaX = rayX === 0 ? 1e30 : Math.abs(1 / rayX);
        const deltaY = rayY === 0 ? 1e30 : Math.abs(1 / rayY);

        let stepX: number;
        let stepY: number;
        let sideDistX: number;
        let sideDistY: number;
        if (rayX < 0) {
          stepX = -1;
          sideDistX = (posX - mapX) * deltaX;
        } else {
          stepX = 1;
          sideDistX = (mapX + 1 - posX) * deltaX;
        }
        if (rayY < 0) {
          stepY = -1;
          sideDistY = (posY - mapY) * deltaY;
        } else {
          stepY = 1;
          sideDistY = (mapY + 1 - posY) * deltaY;
        }

        let side = 0;
        let hit = false;
        for (let guard = 0; guard < 64 && !hit; guard++) {
          if (sideDistX < sideDistY) {
            sideDistX += deltaX;
            mapX += stepX;
            side = 0;
          } else {
            sideDistY += deltaY;
            mapY += stepY;
            side = 1;
          }
          if (mapX < 0 || mapX >= W || mapY < 0 || mapY >= H || MAZE[mapY][mapX] === 1) hit = true;
        }

        const perp = side === 0 ? sideDistX - deltaX : sideDistY - deltaY;
        zBuffer.push(perp);
        const lineH = height / Math.max(0.1, perp);
        const start = -lineH / 2 + height / 2;

        // Flat colour walls, darker on y-sides, dimmer with distance
        const base = flipped ? [90, 200, 160] : [200, 120, 80];
        const shade = (side === 1 ? 0.65 : 1) * Math.max(0.25, Math.min(1, 3 / perp));
        ctx!.fillStyle = `rgb(${Math.round(base[0] * shade)},${Math.round(base[1] * shade)},${Math.round(base[2] * shade)})`;
        ctx!.fillRect(x, start, colW, lineH);
      }

      drawSmileyBillboard();

      animId = requestAnimationFrame(draw);
    }

    draw();

    const handleResize = () => {
      ({ width, height } = measureSaver(containerRef.current, preview));
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [preview]);

  useDismissOnInput(onDismiss, !preview);

  return (
    <div ref={containerRef} className={saverContainerClass(preview)}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
