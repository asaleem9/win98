'use client';

import { useRef, useEffect } from 'react';

interface FlyingWindowsProps {
  onDismiss: () => void;
}

interface FlyingLogo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  colors: string[];
}

const FLAG_PALETTES = [
  ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
  ['#FF4444', '#44FF44', '#4444FF', '#FFFF44'],
  ['#CC0000', '#00CC00', '#0000CC', '#CCCC00'],
  ['#FF6600', '#00CC66', '#6600FF', '#FFCC00'],
];

export default function FlyingWindows({ onDismiss }: FlyingWindowsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const logos: FlyingLogo[] = Array.from({ length: 6 }, () => ({
      x: Math.random() * (canvas.width - 60),
      y: Math.random() * (canvas.height - 60),
      vx: (Math.random() * 2 + 1) * (Math.random() > 0.5 ? 1 : -1),
      vy: (Math.random() * 2 + 1) * (Math.random() > 0.5 ? 1 : -1),
      size: 30 + Math.random() * 30,
      colors: FLAG_PALETTES[Math.floor(Math.random() * FLAG_PALETTES.length)],
    }));

    let animId: number;

    function drawFlag(logo: FlyingLogo) {
      const { x, y, size, colors } = logo;
      const half = size / 2;
      const gap = size * 0.06;
      const qSize = half - gap / 2;

      // Slight wave effect
      const skew = Math.sin(Date.now() / 400 + logo.x) * 2;

      // Four quadrants of the Windows flag
      ctx!.fillStyle = colors[0]; // top-left (red)
      ctx!.beginPath();
      ctx!.moveTo(x + skew, y);
      ctx!.lineTo(x + qSize + skew, y);
      ctx!.lineTo(x + qSize, y + qSize);
      ctx!.lineTo(x, y + qSize);
      ctx!.fill();

      ctx!.fillStyle = colors[1]; // top-right (green)
      ctx!.beginPath();
      ctx!.moveTo(x + half + gap / 2 + skew, y);
      ctx!.lineTo(x + size + skew, y);
      ctx!.lineTo(x + size, y + qSize);
      ctx!.lineTo(x + half + gap / 2, y + qSize);
      ctx!.fill();

      ctx!.fillStyle = colors[2]; // bottom-left (blue)
      ctx!.beginPath();
      ctx!.moveTo(x, y + half + gap / 2);
      ctx!.lineTo(x + qSize, y + half + gap / 2);
      ctx!.lineTo(x + qSize - skew, y + size);
      ctx!.lineTo(x - skew, y + size);
      ctx!.fill();

      ctx!.fillStyle = colors[3]; // bottom-right (yellow)
      ctx!.beginPath();
      ctx!.moveTo(x + half + gap / 2, y + half + gap / 2);
      ctx!.lineTo(x + size, y + half + gap / 2);
      ctx!.lineTo(x + size - skew, y + size);
      ctx!.lineTo(x + half + gap / 2 - skew, y + size);
      ctx!.fill();
    }

    function draw() {
      ctx!.fillStyle = '#000022';
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      for (const logo of logos) {
        logo.x += logo.vx;
        logo.y += logo.vy;

        if (logo.x <= 0 || logo.x + logo.size >= canvas!.width) {
          logo.vx *= -1;
          logo.x = Math.max(0, Math.min(logo.x, canvas!.width - logo.size));
        }
        if (logo.y <= 0 || logo.y + logo.size >= canvas!.height) {
          logo.vy *= -1;
          logo.y = Math.max(0, Math.min(logo.y, canvas!.height - logo.size));
        }

        drawFlag(logo);
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
