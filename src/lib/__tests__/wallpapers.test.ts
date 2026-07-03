import {
  getWallpaper,
  isImageWallpaper,
  imageWallpaperStyle,
  WALLPAPERS,
  WallpaperSetting,
} from '@/lib/wallpapers';

describe('getWallpaper (named CSS wallpapers)', () => {
  it('returns a definition for a known id', () => {
    const clouds = getWallpaper('clouds');
    expect(clouds?.id).toBe('clouds');
    expect(clouds?.style).toBeTruthy();
  });

  it('treats null and "none" as no wallpaper', () => {
    expect(getWallpaper(null)).toBeNull();
    expect(getWallpaper('none')).toBeNull();
  });

  it('returns null for an unknown id', () => {
    expect(getWallpaper('does-not-exist')).toBeNull();
  });
});

describe('isImageWallpaper', () => {
  it('recognizes image wallpaper objects', () => {
    expect(isImageWallpaper({ type: 'image', source: 'data:image/png;base64,AA', mode: 'tile' })).toBe(true);
  });

  it('rejects legacy string / null wallpapers', () => {
    const legacy: WallpaperSetting[] = ['clouds', 'none', null];
    for (const value of legacy) expect(isImageWallpaper(value)).toBe(false);
  });
});

describe('imageWallpaperStyle', () => {
  it('tiles with background-repeat', () => {
    const style = imageWallpaperStyle('data:x', 'tile');
    expect(style.backgroundRepeat).toBe('repeat');
    expect(style.backgroundSize).toBeUndefined();
  });

  it('centers without repeating', () => {
    const style = imageWallpaperStyle('data:x', 'center');
    expect(style.backgroundRepeat).toBe('no-repeat');
    expect(style.backgroundPosition).toBe('center');
    expect(style.backgroundSize).toBeUndefined();
  });

  it('stretches to fill', () => {
    const style = imageWallpaperStyle('data:x', 'stretch');
    expect(style.backgroundSize).toBe('100% 100%');
    expect(style.backgroundRepeat).toBe('no-repeat');
  });

  it('embeds the url in the background image', () => {
    expect(imageWallpaperStyle('data:image/png;base64,AA', 'tile').backgroundImage).toBe(
      'url("data:image/png;base64,AA")',
    );
  });
});

describe('backward compatibility', () => {
  it('every legacy wallpaper id still resolves', () => {
    for (const wp of WALLPAPERS) {
      // 'none' intentionally resolves to null; the rest resolve to themselves
      if (wp.id === 'none') continue;
      expect(getWallpaper(wp.id)?.id).toBe(wp.id);
    }
  });
});
