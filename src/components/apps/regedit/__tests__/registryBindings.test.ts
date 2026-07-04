import {
  findBinding,
  isBoundValue,
  applyBoundReads,
  RegistryBindingContext,
} from '../registryBindings';
import { RegistryValue } from '../registryOverrides';
import { isImageWallpaper } from '@/lib/wallpapers';

function makeCtx(overrides: Partial<RegistryBindingContext> = {}): RegistryBindingContext {
  return {
    wallpaper: 'clouds',
    setWallpaper: vi.fn(),
    screenSaveTimeoutSeconds: 600,
    setScreenSaveTimeoutSeconds: vi.fn(),
    registeredOwner: 'User',
    setRegisteredOwner: vi.fn(),
    ...overrides,
  };
}

describe('isBoundValue / findBinding', () => {
  it('recognizes the three live-bound registry values', () => {
    expect(isBoundValue('HKCU-CP-Desktop', 'Wallpaper')).toBe(true);
    expect(isBoundValue('HKCU-CP-Desktop', 'ScreenSaveTimeOut')).toBe(true);
    expect(isBoundValue('HKLM-SW-MS-Windows-CV', 'RegisteredOwner')).toBe(true);
  });

  it('leaves unbound values on the same keys alone', () => {
    expect(isBoundValue('HKCU-CP-Desktop', 'TileWallpaper')).toBe(false);
    expect(isBoundValue('HKLM-SW-MS-Windows-CV', 'ProductName')).toBe(false);
  });

  it('does not match a bound value name under the wrong key', () => {
    expect(isBoundValue('HKCR-.txt', 'Wallpaper')).toBe(false);
    expect(findBinding('HKCR-.txt', 'Wallpaper')).toBeUndefined();
  });
});

describe('applyBoundReads', () => {
  it('overlays the live setting onto bound values and leaves the rest untouched', () => {
    const ctx = makeCtx({
      wallpaper: { type: 'image', source: 'data:image/png;base64,AA', mode: 'tile' },
      screenSaveTimeoutSeconds: 300,
    });
    const values: RegistryValue[] = [
      { name: 'Wallpaper', type: 'REG_SZ', data: 'C:\\Windows\\Setup.bmp' },
      { name: 'ScreenSaveTimeOut', type: 'REG_DWORD', data: '999' },
      { name: 'TileWallpaper', type: 'REG_DWORD', data: '0' },
    ];

    const read = applyBoundReads('HKCU-CP-Desktop', values, ctx);

    expect(read.find((v) => v.name === 'Wallpaper')?.data).toBe('data:image/png;base64,AA');
    expect(read.find((v) => v.name === 'ScreenSaveTimeOut')?.data).toBe('300');
    // Unbound value keeps its static data.
    expect(read.find((v) => v.name === 'TileWallpaper')?.data).toBe('0');
  });

  it('reads a named CSS wallpaper as its plain id', () => {
    const ctx = makeCtx({ wallpaper: 'clouds' });
    const values: RegistryValue[] = [{ name: 'Wallpaper', type: 'REG_SZ', data: 'x' }];
    expect(applyBoundReads('HKCU-CP-Desktop', values, ctx)[0].data).toBe('clouds');
  });

  it('reads the registered owner from its live source', () => {
    const ctx = makeCtx({ registeredOwner: 'Neo' });
    const values: RegistryValue[] = [{ name: 'RegisteredOwner', type: 'REG_SZ', data: 'User' }];
    expect(applyBoundReads('HKLM-SW-MS-Windows-CV', values, ctx)[0].data).toBe('Neo');
  });
});

describe('binding writes (registry -> live setting)', () => {
  it('turns an edited Wallpaper data URL into an image wallpaper, carrying the current mode', () => {
    const ctx = makeCtx({
      wallpaper: { type: 'image', source: 'old', mode: 'tile' },
    });
    findBinding('HKCU-CP-Desktop', 'Wallpaper')!.write(ctx, 'data:image/png;base64,BB');

    expect(ctx.setWallpaper).toHaveBeenCalledTimes(1);
    const written = (ctx.setWallpaper as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(isImageWallpaper(written)).toBe(true);
    expect(written.source).toBe('data:image/png;base64,BB');
    expect(written.mode).toBe('tile');
  });

  it('keeps a known wallpaper id as a plain string when edited', () => {
    const ctx = makeCtx();
    findBinding('HKCU-CP-Desktop', 'Wallpaper')!.write(ctx, 'waves');
    expect(ctx.setWallpaper).toHaveBeenCalledWith('waves');
  });

  it('parses ScreenSaveTimeOut seconds and clamps negatives to zero', () => {
    const ctx = makeCtx();
    const binding = findBinding('HKCU-CP-Desktop', 'ScreenSaveTimeOut')!;

    binding.write(ctx, '120');
    expect(ctx.setScreenSaveTimeoutSeconds).toHaveBeenLastCalledWith(120);

    binding.write(ctx, '-30');
    expect(ctx.setScreenSaveTimeoutSeconds).toHaveBeenLastCalledWith(0);
  });

  it('ignores a non-numeric ScreenSaveTimeOut edit', () => {
    const ctx = makeCtx();
    findBinding('HKCU-CP-Desktop', 'ScreenSaveTimeOut')!.write(ctx, 'not a number');
    expect(ctx.setScreenSaveTimeoutSeconds).not.toHaveBeenCalled();
  });

  it('routes an edited RegisteredOwner straight to the live setter', () => {
    const ctx = makeCtx();
    findBinding('HKLM-SW-MS-Windows-CV', 'RegisteredOwner')!.write(ctx, 'Trinity');
    expect(ctx.setRegisteredOwner).toHaveBeenCalledWith('Trinity');
  });
});
