'use client';

import { useRef, useEffect } from 'react';
import {
  ScreenSaverProps,
  measureSaver,
  saverContainerClass,
  useDismissOnInput,
  shade,
} from './common';

const PIPE_COLORS = ['#FF4136', '#2ECC40', '#0074D9', '#FFDC00', '#B10DC9', '#39CCCC', '#FF851B', '#F012BE'];

// Six axis-aligned moves through a voxel grid. Ordered so `dir ^ 1` is the
// reverse of `dir`, which keeps the pipe from doubling back on itself.
const DIRS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const;

export default function Pipes3D({ onDismiss, preview = false }: ScreenSaverProps) {
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

    const cell = preview ? 12 : 30;
    const pipeW = preview ? 5 : 13;
    const maxSegments = preview ? 160 : 1100;
    const isoX = cell * 0.866;
    const isoY = cell * 0.5;

    const project = (gx: number, gy: number, gz: number) => ({
      x: width / 2 + (gx - gz) * isoX,
      y: height / 2 + (gx + gz) * isoY - gy * cell,
    });

    const inBounds = (p: { x: number; y: number }) =>
      p.x > pipeW && p.x < width - pipeW && p.y > pipeW && p.y < height - pipeW;

    let color = PIPE_COLORS[0];
    let g = { x: 0, y: 0, z: 0 };
    let dir = 0;
    let visited = new Set<string>();
    let drawn = 0;

    const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

    function paintBackground() {
      ctx!.fillStyle = '#0a0a12';
      ctx!.fillRect(0, 0, width, height);
    }

    function drawSegment(from: { x: number; y: number }, to: { x: number; y: number }) {
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      let nx = -(to.y - from.y);
      let ny = to.x - from.x;
      const len = Math.hypot(nx, ny) || 1;
      nx = (nx / len) * (pipeW / 2);
      ny = (ny / len) * (pipeW / 2);

      // Cylinder shading: dark rim -> bright core -> dark rim across the tube
      const grad = ctx!.createLinearGradient(mx - nx, my - ny, mx + nx, my + ny);
      grad.addColorStop(0, shade(color, 0.35));
      grad.addColorStop(0.5, shade(color, 1.25));
      grad.addColorStop(1, shade(color, 0.4));

      ctx!.strokeStyle = grad;
      ctx!.lineWidth = pipeW;
      ctx!.lineCap = 'round';
      ctx!.beginPath();
      ctx!.moveTo(from.x, from.y);
      ctx!.lineTo(to.x, to.y);
      ctx!.stroke();
    }

    function drawJoint(p: { x: number; y: number }) {
      const r = pipeW * 0.75;
      const grad = ctx!.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
      grad.addColorStop(0, shade(color, 1.4));
      grad.addColorStop(1, shade(color, 0.4));
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx!.fill();
    }

    function startPipe() {
      color = PIPE_COLORS[Math.floor(Math.random() * PIPE_COLORS.length)];
      dir = Math.floor(Math.random() * 6);
      // Find a fresh grid cell whose projection lands on-screen
      for (let i = 0; i < 40; i++) {
        const range = 6;
        const cand = {
          x: Math.floor((Math.random() - 0.5) * range * 2),
          y: Math.floor((Math.random() - 0.5) * range),
          z: Math.floor((Math.random() - 0.5) * range * 2),
        };
        if (!visited.has(key(cand.x, cand.y, cand.z)) && inBounds(project(cand.x, cand.y, cand.z))) {
          g = cand;
          break;
        }
      }
      visited.add(key(g.x, g.y, g.z));
      drawJoint(project(g.x, g.y, g.z));
    }

    function pickDir(): number | null {
      const reverse = dir ^ 1;
      const options: number[] = [];
      for (let d = 0; d < 6; d++) {
        if (d === reverse) continue;
        const [dx, dy, dz] = DIRS[d];
        const n = { x: g.x + dx, y: g.y + dy, z: g.z + dz };
        if (visited.has(key(n.x, n.y, n.z))) continue;
        if (!inBounds(project(n.x, n.y, n.z))) continue;
        options.push(d);
      }
      if (options.length === 0) return null;
      // Bias toward carrying straight on; otherwise pick a random elbow
      if (options.includes(dir) && Math.random() > 0.28) return dir;
      return options[Math.floor(Math.random() * options.length)];
    }

    let animId: ReturnType<typeof setTimeout>;

    function step() {
      const next = pickDir();
      if (next === null) {
        startPipe();
      } else {
        const turned = next !== dir;
        const from = project(g.x, g.y, g.z);
        const [dx, dy, dz] = DIRS[next];
        g = { x: g.x + dx, y: g.y + dy, z: g.z + dz };
        dir = next;
        const to = project(g.x, g.y, g.z);
        drawSegment(from, to);
        if (turned) drawJoint(from);
        visited.add(key(g.x, g.y, g.z));
        drawn++;
      }

      if (drawn >= maxSegments) {
        paintBackground();
        visited = new Set();
        drawn = 0;
        startPipe();
      }

      animId = setTimeout(() => requestAnimationFrame(step), preview ? 55 : 32);
    }

    paintBackground();
    startPipe();
    step();

    const handleResize = () => {
      ({ width, height } = measureSaver(containerRef.current, preview));
      canvas.width = width;
      canvas.height = height;
      paintBackground();
      visited = new Set();
      drawn = 0;
      startPipe();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(animId);
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
