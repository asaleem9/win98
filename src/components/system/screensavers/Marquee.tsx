'use client';

import { useRef, useEffect } from 'react';
import {
  ScreenSaverProps,
  measureSaver,
  saverContainerClass,
  useDismissOnInput,
} from './common';

const DEFAULT_TEXT = 'Your message here.';

export default function Marquee({
  onDismiss,
  preview = false,
  marqueeText,
  marqueeSpeed = 3,
}: ScreenSaverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const text = (marqueeText ?? DEFAULT_TEXT).trim() || DEFAULT_TEXT;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let { width, height } = measureSaver(containerRef.current, preview);
    canvas.width = width;
    canvas.height = height;

    const fontSize = Math.max(10, Math.floor(height * 0.18));
    const font = `bold ${fontSize}px var(--win98-font), sans-serif`;
    const speed = Math.max(0.5, marqueeSpeed);

    ctx.font = font;
    const textWidth = ctx.measureText(text).width || text.length * fontSize * 0.6;

    let x = width;
    let hue = 0;
    let animId: number;

    function draw() {
      ctx!.fillStyle = '#000000';
      ctx!.fillRect(0, 0, width, height);

      hue = (hue + 1) % 360;
      ctx!.font = font;
      ctx!.textBaseline = 'middle';
      ctx!.fillStyle = `hsl(${hue}, 100%, 65%)`;
      ctx!.fillText(text, x, height / 2);

      x -= speed;
      if (x < -textWidth) x = width;

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
  }, [preview, text, marqueeSpeed]);

  useDismissOnInput(onDismiss, !preview);

  return (
    <div ref={containerRef} className={saverContainerClass(preview)}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
