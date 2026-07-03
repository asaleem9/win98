// Shared pixel-art sprite core. A sprite is authored as plain text: a palette
// mapping single characters to CSS colors, plus one or more frames where every
// frame is an array of equal-length rows. The character '.' is always
// transparent and must never appear in a palette.
//
// The heavy lifting (validateSpriteDef) is pure so tests and tools can lint
// authored art without a DOM. Anything that touches <canvas> is lazy — it only
// reaches for document/getContext when actually asked to draw, which keeps the
// module import-safe under jsdom.

export interface SpriteDef {
  /** char -> CSS color. Must not contain '.' (reserved for transparency). */
  palette: Record<string, string>;
  /** Each frame is an array of equal-length rows; all frames share dimensions. */
  frames: string[][];
}

/** A frame slice within a horizontal strip, ready for drawImage. */
export interface CompiledSprite {
  /** All frames laid out left-to-right on a single canvas. */
  canvas: HTMLCanvasElement;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

export interface CompileOpts {
  flipX?: boolean;
  /** Remap palette chars to new colors before drawing (faction tints, damage flashes). */
  recolor?: Record<string, string>;
  /** Integer upscale baked into the compiled canvas. Defaults to 1. */
  scale?: number;
}

export interface DrawOpts {
  frame?: number;
  /** Extra scale applied at draw time, on top of the compiled scale. */
  scale?: number;
  /** Where (x, y) sits relative to the frame. Defaults to 'bottom-center'. */
  anchor?: 'top-left' | 'bottom-center' | 'center';
}

/**
 * Check an authored def for the mistakes that produce broken or invisible art.
 * Returns a list of human-readable errors (empty means the def is clean). Pure:
 * never touches the DOM, so sheets can ship a test that lints every def.
 */
export function validateSpriteDef(def: SpriteDef): string[] {
  const errors: string[] = [];

  if (Object.prototype.hasOwnProperty.call(def.palette, '.')) {
    errors.push("palette defines '.', which is reserved for transparency");
  }

  if (!Array.isArray(def.frames) || def.frames.length === 0) {
    errors.push('frames is empty');
    return errors;
  }

  const missing = new Set<string>();
  let baseW = -1;
  let baseH = -1;

  def.frames.forEach((frame, fi) => {
    if (!Array.isArray(frame) || frame.length === 0) {
      errors.push(`frame ${fi} has no rows`);
      return;
    }

    const w = frame[0].length;
    const h = frame.length;

    frame.forEach((row, ri) => {
      if (row.length !== w) {
        errors.push(`frame ${fi} row ${ri} is ${row.length} wide, expected ${w}`);
      }
      for (let ci = 0; ci < row.length; ci++) {
        const ch = row[ci];
        if (ch === '.') continue;
        if (!Object.prototype.hasOwnProperty.call(def.palette, ch)) {
          missing.add(ch);
        }
      }
    });

    if (baseW === -1) {
      baseW = w;
      baseH = h;
    } else if (w !== baseW || h !== baseH) {
      errors.push(`frame ${fi} is ${w}x${h}, expected ${baseW}x${baseH}`);
    }
  });

  for (const ch of missing) {
    errors.push(`char '${ch}' is used but missing from palette`);
  }

  return errors;
}

// Compiled canvases are cached per def-identity, keyed by the options that
// affect pixels. A WeakMap lets the cache release when a def is dropped.
const cache = new WeakMap<SpriteDef, Map<string, CompiledSprite>>();

function optsKey(opts?: CompileOpts): string {
  const flipX = opts?.flipX ? 1 : 0;
  const scale = opts?.scale ?? 1;
  // Sort recolor keys so equivalent maps share a cache slot regardless of order.
  const recolor = opts?.recolor
    ? Object.keys(opts.recolor)
        .sort()
        .map((k) => `${k}:${opts.recolor![k]}`)
        .join(',')
    : '';
  return `${flipX}|${scale}|${recolor}`;
}

/**
 * Rasterize every frame onto one horizontal strip canvas at native size * scale.
 * recolor is applied before drawing. Results are cached; call it freely in a
 * render loop. Under jsdom (no 2d context) the canvas is sized correctly but
 * left blank, so callers still get valid dimensions.
 */
export function compileSprite(def: SpriteDef, opts?: CompileOpts): CompiledSprite {
  let byOpts = cache.get(def);
  if (!byOpts) {
    byOpts = new Map();
    cache.set(def, byOpts);
  }
  const key = optsKey(opts);
  const cached = byOpts.get(key);
  if (cached) return cached;

  const scale = Math.max(1, Math.floor(opts?.scale ?? 1));
  const nativeW = def.frames[0][0].length;
  const nativeH = def.frames[0].length;
  const frameCount = def.frames.length;
  const frameWidth = nativeW * scale;
  const frameHeight = nativeH * scale;

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * frameCount;
  canvas.height = frameHeight;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    const palette = opts?.recolor ? { ...def.palette, ...pickRecolor(def, opts.recolor) } : def.palette;
    const flipX = !!opts?.flipX;

    def.frames.forEach((frame, fi) => {
      const originX = fi * frameWidth;
      for (let ry = 0; ry < frame.length; ry++) {
        const row = frame[ry];
        for (let cx = 0; cx < row.length; cx++) {
          const ch = row[cx];
          if (ch === '.') continue;
          const color = palette[ch];
          if (!color) continue;
          const drawCol = flipX ? nativeW - 1 - cx : cx;
          ctx.fillStyle = color;
          ctx.fillRect(originX + drawCol * scale, ry * scale, scale, scale);
        }
      }
    });
  }

  const compiled: CompiledSprite = { canvas, frameWidth, frameHeight, frameCount };
  byOpts.set(key, compiled);
  return compiled;
}

// Only remap chars that actually exist in the palette, so a stray recolor entry
// can't invent a new color slot.
function pickRecolor(def: SpriteDef, recolor: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const ch of Object.keys(recolor)) {
    if (Object.prototype.hasOwnProperty.call(def.palette, ch)) out[ch] = recolor[ch];
  }
  return out;
}

/**
 * Blit one frame of a compiled sprite. Nearest-neighbor scaling stays crisp.
 * The default 'bottom-center' anchor places (x, y) at the sprite's feet, which
 * is what world/iso placement wants — pass 'top-left' for HUD-style drawing.
 * Safe to call with a jsdom-null context (it simply no-ops).
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D | null,
  sprite: CompiledSprite,
  x: number,
  y: number,
  opts?: DrawOpts,
): void {
  if (!ctx || typeof ctx.drawImage !== 'function') return;

  const frame = wrapFrame(opts?.frame ?? 0, sprite.frameCount);
  const scale = opts?.scale ?? 1;
  const destW = sprite.frameWidth * scale;
  const destH = sprite.frameHeight * scale;
  const anchor = opts?.anchor ?? 'bottom-center';

  let dx = x;
  let dy = y;
  if (anchor === 'bottom-center') {
    dx = x - destW / 2;
    dy = y - destH;
  } else if (anchor === 'center') {
    dx = x - destW / 2;
    dy = y - destH / 2;
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sprite.canvas,
    frame * sprite.frameWidth,
    0,
    sprite.frameWidth,
    sprite.frameHeight,
    dx,
    dy,
    destW,
    destH,
  );
}

/** Current frame index for a looping animation at `fps`, given elapsed seconds. */
export function animFrame(timeSec: number, fps: number, frameCount: number): number {
  if (frameCount <= 0) return 0;
  const raw = Math.floor(timeSec * fps);
  return wrapFrame(raw, frameCount);
}

function wrapFrame(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((Math.floor(index) % count) + count) % count;
}
