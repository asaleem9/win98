// Isometric (2:1 diamond) math. All pure except drawIsoTileOutline, which is
// guarded so it no-ops without a 2d context. The convention: `origin` is the
// screen position of the top point of tile (0, 0), and isoToScreen returns the
// top point of any tile. tileW/tileH are the full diamond width/height (32x16
// is the house default — see README).

export interface Point {
  x: number;
  y: number;
}

export interface TileCoord {
  tx: number;
  ty: number;
}

/** Screen position of the top vertex of tile (tx, ty). */
export function isoToScreen(
  tx: number,
  ty: number,
  tileW: number,
  tileH: number,
  origin: Point,
): Point {
  return {
    x: origin.x + (tx - ty) * (tileW / 2),
    y: origin.y + (tx + ty) * (tileH / 2),
  };
}

/**
 * Inverse of isoToScreen: fractional tile coords under a screen point. Floor the
 * result to get the tile for click-picking; the fractional part tells you where
 * inside the diamond the point landed.
 */
export function screenToIso(
  sx: number,
  sy: number,
  tileW: number,
  tileH: number,
  origin: Point,
): TileCoord {
  const dx = sx - origin.x;
  const dy = sy - origin.y;
  return {
    tx: dx / tileW + dy / tileH,
    ty: dy / tileH - dx / tileW,
  };
}

/** Painter's-algorithm sort key: tiles further down-screen draw later. */
export function isoDepth(tx: number, ty: number): number {
  // Primary key is tx + ty; ty breaks ties so a higher-ty (more southern) tile
  // on the same diagonal draws on top. Assumes tile coords well under 1e6.
  return (tx + ty) * 1_000_000 + ty;
}

export interface TileOutlineOpts {
  stroke?: string;
  fill?: string;
  lineWidth?: number;
}

/** Trace the diamond for tile (tx, ty), optionally filling and/or stroking it. */
export function drawIsoTileOutline(
  ctx: CanvasRenderingContext2D | null,
  tx: number,
  ty: number,
  tileW: number,
  tileH: number,
  origin: Point,
  opts?: TileOutlineOpts,
): void {
  if (!ctx || typeof ctx.beginPath !== 'function') return;

  const top = isoToScreen(tx, ty, tileW, tileH, origin);
  const hw = tileW / 2;
  const hh = tileH / 2;

  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(top.x + hw, top.y + hh); // right
  ctx.lineTo(top.x, top.y + tileH); // bottom
  ctx.lineTo(top.x - hw, top.y + hh); // left
  ctx.closePath();

  if (opts?.fill) {
    ctx.fillStyle = opts.fill;
    ctx.fill();
  }
  if (opts?.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = opts.lineWidth ?? 1;
    ctx.stroke();
  }
}
