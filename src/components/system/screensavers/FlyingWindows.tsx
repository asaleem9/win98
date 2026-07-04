'use client';

import { useRef, useEffect } from 'react';
import {
  ScreenSaverProps,
  measureSaver,
  saverContainerClass,
  useDismissOnInput,
} from './common';

interface FlyingLogo {
  x: number; // plane offset from centre
  y: number;
  z: number; // depth
}

// The Windows flag: red / green / blue / yellow panes, drawn as a fraction of
// the sprite box so it scales cleanly with depth.
const FLAG_COLORS = ['#FF3B30', '#4CD964', '#007AFF', '#FFCC00'];

export default function FlyingWindows({ onDismiss, preview = false }: ScreenSaverProps) {
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

    const MAX_DEPTH = 1000;
    const speed = 6;
    const numLogos = preview ? 12 : 28;

    const spawn = (): FlyingLogo => ({
      x: (Math.random() - 0.5) * width * 1.6,
      y: (Math.random() - 0.5) * height * 1.6,
      z: Math.random() * MAX_DEPTH,
    });
    const logos: FlyingLogo[] = Array.from({ length: numLogos }, spawn);

    let animId: number;

    function drawFlag(px: number, py: number, size: number) {
      const gap = Math.max(0.5, size * 0.08);
      const pane = (size - gap) / 2;
      const skew = size * 0.14; // parallelogram lean, like the real flag
      const cells: Array<[number, number, string]> = [
        [px, py, FLAG_COLORS[0]],
        [px + pane + gap, py, FLAG_COLORS[1]],
        [px, py + pane + gap, FLAG_COLORS[2]],
        [px + pane + gap, py + pane + gap, FLAG_COLORS[3]],
      ];
      for (const [cxp, cyp, color] of cells) {
        ctx!.fillStyle = color;
        ctx!.beginPath();
        ctx!.moveTo(cxp + skew, cyp);
        ctx!.lineTo(cxp + pane + skew, cyp);
        ctx!.lineTo(cxp + pane, cyp + pane);
        ctx!.lineTo(cxp, cyp + pane);
        ctx!.closePath();
        ctx!.fill();
      }
    }

    function draw() {
      const cx = width / 2;
      const cy = height / 2;
      const focal = Math.min(width, height);
      const baseSize = Math.min(width, height) * 0.5;

      ctx!.fillStyle = '#000000';
      ctx!.fillRect(0, 0, width, height);

      // Painter's order: far flags first so near ones overlap them
      logos.sort((a, b) => b.z - a.z);

      for (const logo of logos) {
        logo.z -= speed;
        const sx = (logo.x / logo.z) * focal + cx;
        const sy = (logo.y / logo.z) * focal + cy;
        const size = (1 - logo.z / MAX_DEPTH) * baseSize + 4;

        if (logo.z <= 1 || sx < -size || sx > width || sy < -size || sy > height) {
          Object.assign(logo, spawn(), { z: MAX_DEPTH });
          continue;
        }

        drawFlag(sx - size / 2, sy - size / 2, size);
      }

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
