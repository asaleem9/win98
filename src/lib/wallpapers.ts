import { CSSProperties } from 'react';

export interface WallpaperDef {
  id: string;
  name: string;
  /** CSS background applied to the desktop (patterns recreated in CSS/SVG — no bitmaps) */
  style: CSSProperties;
}

export type WallpaperMode = 'tile' | 'center' | 'stretch';

/** A user-supplied bitmap wallpaper. `source` is a data: URL or an fs path. */
export interface ImageWallpaper {
  type: 'image';
  source: string;
  mode: WallpaperMode;
}

/**
 * Persisted wallpaper value. Named CSS wallpapers stay as a plain id string
 * (or null for none) for backward compat; image wallpapers use the object form.
 */
export type WallpaperSetting = string | null | ImageWallpaper;

export function isImageWallpaper(value: WallpaperSetting): value is ImageWallpaper {
  return typeof value === 'object' && value !== null && value.type === 'image';
}

/** Background CSS for a bitmap wallpaper. `url` must already be a usable URL. */
export function imageWallpaperStyle(url: string, mode: WallpaperMode): CSSProperties {
  const backgroundImage = `url("${url}")`;
  switch (mode) {
    case 'tile':
      return { backgroundImage, backgroundRepeat: 'repeat' };
    case 'center':
      return { backgroundImage, backgroundRepeat: 'no-repeat', backgroundPosition: 'center' };
    case 'stretch':
      return { backgroundImage, backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: '100% 100%' };
  }
}

// Period-flavored wallpapers recreated with CSS gradients/patterns.
export const WALLPAPERS: WallpaperDef[] = [
  {
    id: 'none',
    name: '(None)',
    style: {},
  },
  {
    id: 'clouds',
    name: 'Clouds',
    style: {
      background:
        'radial-gradient(ellipse 60% 40% at 20% 30%, rgba(255,255,255,0.75), transparent 70%),' +
        'radial-gradient(ellipse 50% 35% at 70% 20%, rgba(255,255,255,0.6), transparent 70%),' +
        'radial-gradient(ellipse 70% 45% at 50% 75%, rgba(255,255,255,0.5), transparent 70%),' +
        'linear-gradient(to bottom, #4a7ab5, #7aa8d8)',
    },
  },
  {
    id: 'waves',
    name: 'Waves',
    style: {
      backgroundColor: '#006666',
      backgroundImage:
        'repeating-radial-gradient(circle at 0 0, transparent 0, transparent 18px, rgba(255,255,255,0.08) 18px, rgba(255,255,255,0.08) 20px)',
    },
  },
  {
    id: 'tiles',
    name: 'Tiles',
    style: {
      backgroundColor: '#008080',
      backgroundImage:
        'linear-gradient(45deg, rgba(0,0,0,0.15) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.15) 75%),' +
        'linear-gradient(45deg, rgba(0,0,0,0.15) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.15) 75%)',
      backgroundSize: '32px 32px',
      backgroundPosition: '0 0, 16px 16px',
    },
  },
  {
    id: 'circuits',
    name: 'Circuits',
    style: {
      backgroundColor: '#0a3d0a',
      backgroundImage:
        'linear-gradient(rgba(0,255,0,0.12) 1px, transparent 1px),' +
        'linear-gradient(90deg, rgba(0,255,0,0.12) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    },
  },
  {
    id: 'setup',
    name: 'Windows Setup',
    style: {
      background: 'linear-gradient(to bottom, #000080, #1084d0)',
    },
  },
];

export function getWallpaper(id: string | null): WallpaperDef | null {
  if (!id || id === 'none') return null;
  return WALLPAPERS.find((w) => w.id === id) ?? null;
}
