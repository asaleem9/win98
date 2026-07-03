'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import { compileSprite, drawSprite, type SpriteDef } from './sprite';

interface Props {
  def: SpriteDef;
  frame?: number;
  /** Integer upscale baked into the canvas. Defaults to 1. */
  scale?: number;
  recolor?: Record<string, string>;
  flipX?: boolean;
  className?: string;
}

/**
 * Render a single frame of a pixel sprite into a crisp <canvas>. Compilation is
 * memoized on the pixel-affecting props, and the frame is drawn once per change.
 * Mounts fine under jsdom (drawing is skipped when there's no 2d context).
 */
function PixelSpriteImpl({ def, frame = 0, scale = 1, recolor, flipX, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stringify recolor so a fresh object literal each render doesn't rebuild.
  const recolorKey = recolor ? JSON.stringify(recolor) : '';
  const sprite = useMemo(
    () => compileSprite(def, { flipX, recolor, scale }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [def, flipX, recolorKey, scale],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = sprite.frameWidth;
    canvas.height = sprite.frameHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSprite(ctx, sprite, 0, 0, { frame, anchor: 'top-left' });
  }, [sprite, frame]);

  return (
    <canvas
      ref={canvasRef}
      width={sprite.frameWidth}
      height={sprite.frameHeight}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

export const PixelSprite = memo(PixelSpriteImpl);
export default PixelSprite;
