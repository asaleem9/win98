'use client';

import { useRef, useEffect } from 'react';

interface Pipes3DProps {
  onDismiss: () => void;
}

interface PipeSegment {
  x: number;
  y: number;
  dir: number; // 0=right, 1=down, 2=left, 3=up
}

const PIPE_COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FF8000', '#8000FF'];
const GRID = 20;
const PIPE_WIDTH = 8;

export default function Pipes3D({ onDismiss }: Pipes3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let color = PIPE_COLORS[Math.floor(Math.random() * PIPE_COLORS.length)];
    let x = Math.floor(Math.random() * (canvas.width / GRID)) * GRID;
    let y = Math.floor(Math.random() * (canvas.height / GRID)) * GRID;
    let dir = Math.floor(Math.random() * 4);
    let segmentCount = 0;
    let maxSegments = 15 + Math.floor(Math.random() * 25);

    let animId: ReturnType<typeof setTimeout>;

    function drawJoint(px: number, py: number) {
      ctx!.fillStyle = color;
      ctx!.beginPath();
      ctx!.arc(px, py, PIPE_WIDTH * 0.7, 0, Math.PI * 2);
      ctx!.fill();
      // Highlight
      ctx!.fillStyle = 'rgba(255,255,255,0.3)';
      ctx!.beginPath();
      ctx!.arc(px - 1, py - 1, PIPE_WIDTH * 0.35, 0, Math.PI * 2);
      ctx!.fill();
    }

    function drawSegment(fromX: number, fromY: number, toX: number, toY: number) {
      // Main pipe body
      ctx!.strokeStyle = color;
      ctx!.lineWidth = PIPE_WIDTH;
      ctx!.lineCap = 'round';
      ctx!.beginPath();
      ctx!.moveTo(fromX, fromY);
      ctx!.lineTo(toX, toY);
      ctx!.stroke();

      // Highlight line
      ctx!.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx!.lineWidth = 2;
      const isVertical = fromX === toX;
      ctx!.beginPath();
      if (isVertical) {
        ctx!.moveTo(fromX - PIPE_WIDTH / 4, fromY);
        ctx!.lineTo(toX - PIPE_WIDTH / 4, toY);
      } else {
        ctx!.moveTo(fromX, fromY - PIPE_WIDTH / 4);
        ctx!.lineTo(toX, toY - PIPE_WIDTH / 4);
      }
      ctx!.stroke();
    }

    function step() {
      const prevX = x;
      const prevY = y;

      // Move
      const dx = [GRID, 0, -GRID, 0][dir];
      const dy = [0, GRID, 0, -GRID][dir];
      x += dx;
      y += dy;
      segmentCount++;

      // Draw segment
      drawSegment(prevX, prevY, x, y);

      // Maybe turn
      if (Math.random() > 0.6) {
        drawJoint(x, y);
        if (Math.random() > 0.5) {
          dir = (dir + 1) % 4;
        } else {
          dir = (dir + 3) % 4;
        }
      }

      // Start new pipe if out of bounds or too many segments
      if (
        x < 0 || x > canvas!.width || y < 0 || y > canvas!.height ||
        segmentCount >= maxSegments
      ) {
        color = PIPE_COLORS[Math.floor(Math.random() * PIPE_COLORS.length)];
        x = Math.floor(Math.random() * (canvas!.width / GRID)) * GRID;
        y = Math.floor(Math.random() * (canvas!.height / GRID)) * GRID;
        dir = Math.floor(Math.random() * 4);
        segmentCount = 0;
        maxSegments = 15 + Math.floor(Math.random() * 25);
        drawJoint(x, y);
      }

      animId = setTimeout(() => requestAnimationFrame(step), 40);
    }

    drawJoint(x, y);
    step();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(animId);
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
