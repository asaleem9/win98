'use client';

import { useRef, useEffect } from 'react';
import {
  ScreenSaverProps,
  measureSaver,
  saverContainerClass,
  useDismissOnInput,
} from './common';

interface Vertex {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Poly {
  verts: Vertex[];
  hue: number;
  hueSpeed: number;
}

export default function Mystify({ onDismiss, preview = false }: ScreenSaverProps) {
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

    const v = preview ? 0.8 : 2.2;
    const makePoly = (hue: number): Poly => ({
      hue,
      hueSpeed: 0.3 + Math.random() * 0.4,
      verts: Array.from({ length: 4 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2 * v,
        vy: (Math.random() - 0.5) * 2 * v,
      })),
    });

    const polys: Poly[] = [makePoly(180), makePoly(300)];

    let animId: number;

    function tracePoly(verts: Vertex[]) {
      ctx!.beginPath();
      ctx!.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) ctx!.lineTo(verts[i].x, verts[i].y);
      ctx!.closePath();
    }

    function draw() {
      // Fade the previous frame toward black to leave a trailing wake
      ctx!.fillStyle = 'rgba(0,0,0,0.12)';
      ctx!.fillRect(0, 0, width, height);

      ctx!.lineWidth = preview ? 1 : 2;

      for (const poly of polys) {
        poly.hue = (poly.hue + poly.hueSpeed) % 360;

        for (const p of poly.verts) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x <= 0 || p.x >= width) {
            p.vx *= -1;
            p.x = Math.max(0, Math.min(p.x, width));
          }
          if (p.y <= 0 || p.y >= height) {
            p.vy *= -1;
            p.y = Math.max(0, Math.min(p.y, height));
          }
        }

        ctx!.strokeStyle = `hsl(${poly.hue}, 100%, 60%)`;
        tracePoly(poly.verts);
        ctx!.stroke();
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
