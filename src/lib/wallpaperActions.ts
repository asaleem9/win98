// Shared helpers for turning an image (data: URL or fs path) into a wallpaper
// setting, and for the registry <-> wallpaper string round-trip. Kept pure and
// context-free so Paint, the desktop/Explorer "Set as Wallpaper" items and the
// Registry Editor's live Wallpaper key all agree on the same shapes.

import {
  ImageWallpaper,
  WallpaperMode,
  WallpaperSetting,
  isImageWallpaper,
  WALLPAPERS,
} from './wallpapers';

/** Builds an image wallpaper setting from a data: URL or fs path source. */
export function imageWallpaper(source: string, mode: WallpaperMode): ImageWallpaper {
  return { type: 'image', source, mode };
}

/**
 * The wallpaper's source as a plain string, the way `Control Panel\Desktop`'s
 * `Wallpaper` value reads it: a data: URL / fs path for bitmaps, the id for a
 * named CSS wallpaper, or empty for none.
 */
export function wallpaperToSourceString(w: WallpaperSetting): string {
  if (isImageWallpaper(w)) return w.source;
  if (typeof w === 'string') return w;
  return '';
}

/**
 * Turns a `Wallpaper` string (as edited in the registry) back into a setting:
 * a known named wallpaper id stays a string, anything else becomes a bitmap
 * wallpaper. The current setting's tiling mode carries over when present.
 */
export function sourceStringToWallpaper(value: string, current: WallpaperSetting): WallpaperSetting {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'none') return null;
  if (WALLPAPERS.some((w) => w.id === trimmed)) return trimmed;
  const mode: WallpaperMode = isImageWallpaper(current) ? current.mode : 'center';
  return imageWallpaper(trimmed, mode);
}
