// Live registry bindings: a handful of registry values are wired straight to
// real system settings instead of the static/override data layer. Reading a
// bound value reflects the current setting; editing it changes the setting for
// real (and everything else watching it). Everything here is pure so it can be
// unit tested and reused by the Registry Editor component.

import { RegistryValue } from './registryOverrides';
import { WallpaperSetting } from '@/lib/wallpapers';
import { wallpaperToSourceString, sourceStringToWallpaper } from '@/lib/wallpaperActions';

/** The live values a binding reads from / writes to. */
export interface RegistryBindingContext {
  wallpaper: WallpaperSetting;
  setWallpaper: (value: WallpaperSetting) => void;
  /** Screen-saver idle timeout, in seconds (the units the registry stores). */
  screenSaveTimeoutSeconds: number;
  setScreenSaveTimeoutSeconds: (seconds: number) => void;
  registeredOwner: string;
  setRegisteredOwner: (name: string) => void;
}

interface RegistryBinding {
  /** Tree node id the value lives under. */
  keyId: string;
  valueName: string;
  read: (ctx: RegistryBindingContext) => string;
  write: (ctx: RegistryBindingContext, data: string) => void;
}

const BINDINGS: RegistryBinding[] = [
  {
    // HKEY_CURRENT_USER\Control Panel\Desktop\Wallpaper
    keyId: 'HKCU-CP-Desktop',
    valueName: 'Wallpaper',
    read: (ctx) => wallpaperToSourceString(ctx.wallpaper),
    write: (ctx, data) => ctx.setWallpaper(sourceStringToWallpaper(data, ctx.wallpaper)),
  },
  {
    // HKEY_CURRENT_USER\Control Panel\Desktop\ScreenSaveTimeOut
    keyId: 'HKCU-CP-Desktop',
    valueName: 'ScreenSaveTimeOut',
    read: (ctx) => String(ctx.screenSaveTimeoutSeconds),
    write: (ctx, data) => {
      const seconds = parseInt(data, 10);
      if (!Number.isNaN(seconds)) ctx.setScreenSaveTimeoutSeconds(Math.max(0, seconds));
    },
  },
  {
    // HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\RegisteredOwner
    keyId: 'HKLM-SW-MS-Windows-CV',
    valueName: 'RegisteredOwner',
    read: (ctx) => ctx.registeredOwner,
    write: (ctx, data) => ctx.setRegisteredOwner(data),
  },
];

/** The binding for a given key/value, or undefined if the value isn't bound. */
export function findBinding(keyId: string, valueName: string): RegistryBinding | undefined {
  return BINDINGS.find((b) => b.keyId === keyId && b.valueName === valueName);
}

/** Whether editing this value should route to a live setting instead of overrides. */
export function isBoundValue(keyId: string, valueName: string): boolean {
  return findBinding(keyId, valueName) !== undefined;
}

/** Overlays the live setting value onto any bound entries in a key's value list. */
export function applyBoundReads(
  keyId: string,
  values: RegistryValue[],
  ctx: RegistryBindingContext,
): RegistryValue[] {
  return values.map((v) => {
    const binding = findBinding(keyId, v.name);
    return binding ? { ...v, data: binding.read(ctx) } : v;
  });
}
