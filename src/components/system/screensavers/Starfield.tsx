'use client';

import { useRef, useEffect } from 'react';
import {
  ScreenSaverProps,
  measureSaver,
  saverContainerClass,
  useDismissOnInput,
} from './common';

interface Star {
  x: number;
  y: number;
  z: number;
}

export default function Starfield({ onDismiss, preview = false, speed = 3 }: ScreenSaverProps) {
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
    const numStars = preview ? 140 : 400;

    const spawn = (): Star => ({
      x: (Math.random() - 0.5) * width * 2,
      y: (Math.random() - 0.5) * height * 2,
      z: Math.random() * MAX_DEPTH,
    });
    const stars: Star[] = Array.from({ length: numStars }, spawn);

    let animId: number;

    function draw() {
      const cx = width / 2;
      const cy = height / 2;
      const focal = Math.min(width, height) * 0.9;

      ctx!.fillStyle = '#000000';
      ctx!.fillRect(0, 0, width, height);

      for (const star of stars) {
        star.z -= speed;
        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * width * 2;
          star.y = (Math.random() - 0.5) * height * 2;
          star.z = MAX_DEPTH;
        }

        const sx = (star.x / star.z) * focal + cx;
        const sy = (star.y / star.z) * focal + cy;
        const size = Math.max(0.5, (1 - star.z / MAX_DEPTH) * 3);
        const brightness = Math.floor((1 - star.z / MAX_DEPTH) * 255);

        ctx!.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
        ctx!.beginPath();
        ctx!.arc(sx, sy, size, 0, Math.PI * 2);
        ctx!.fill();

        // Motion streak toward the vanishing point
        const prevSx = (star.x / (star.z + speed * 2)) * focal + cx;
        const prevSy = (star.y / (star.z + speed * 2)) * focal + cy;
        ctx!.strokeStyle = `rgba(${brightness},${brightness},${brightness},0.3)`;
        ctx!.lineWidth = size * 0.5;
        ctx!.beginPath();
        ctx!.moveTo(prevSx, prevSy);
        ctx!.lineTo(sx, sy);
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
  }, [preview, speed]);

  useDismissOnInput(onDismiss, !preview);

  return (
    <div ref={containerRef} className={saverContainerClass(preview)}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
