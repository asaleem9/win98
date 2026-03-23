'use client';

import { useRef, useEffect } from 'react';

interface StarfieldProps {
  onDismiss: () => void;
}

interface Star {
  x: number;
  y: number;
  z: number;
}

export default function Starfield({ onDismiss }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const NUM_STARS = 400;
    const MAX_DEPTH = 1000;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const stars: Star[] = Array.from({ length: NUM_STARS }, () => ({
      x: (Math.random() - 0.5) * canvas.width * 2,
      y: (Math.random() - 0.5) * canvas.height * 2,
      z: Math.random() * MAX_DEPTH,
    }));

    let animId: number;

    function draw() {
      ctx!.fillStyle = '#000000';
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      for (const star of stars) {
        star.z -= 3;
        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * canvas!.width * 2;
          star.y = (Math.random() - 0.5) * canvas!.height * 2;
          star.z = MAX_DEPTH;
        }

        const sx = (star.x / star.z) * 200 + cx;
        const sy = (star.y / star.z) * 200 + cy;
        const size = Math.max(0.5, (1 - star.z / MAX_DEPTH) * 3);
        const brightness = Math.floor((1 - star.z / MAX_DEPTH) * 255);

        ctx!.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
        ctx!.beginPath();
        ctx!.arc(sx, sy, size, 0, Math.PI * 2);
        ctx!.fill();

        // Draw trail
        const prevSx = (star.x / (star.z + 6)) * 200 + cx;
        const prevSy = (star.y / (star.z + 6)) * 200 + cy;
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
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const dismiss = () => onDismiss();
    window.addEventListener('mousemove', dismiss);
    window.addEventListener('mousedown', dismiss);
    window.addEventListener('keydown', dismiss);
    return () => {
      window.removeEventListener('mousemove', dismiss);
      window.removeEventListener('mousedown', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
  }, [onDismiss]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9998] cursor-none"
    />
  );
}
