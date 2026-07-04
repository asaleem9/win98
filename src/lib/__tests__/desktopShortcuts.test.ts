import { DESKTOP_APP_FOLDERS, allDesktopShortcuts, buildDesktopAppFolders } from '@/lib/desktopShortcuts';
import { getAllApps, getApp } from '@/lib/appRegistry';

describe('desktop app shortcut folders', () => {
  it('references only real registry apps', () => {
    for (const shortcut of allDesktopShortcuts()) {
      expect(getApp(shortcut.appId), `shortcut '${shortcut.name}' points at missing app '${shortcut.appId}'`).toBeTruthy();
    }
  });

  it('covers every registered app exactly once', () => {
    const shortcutIds = allDesktopShortcuts().map((s) => s.appId);
    expect(new Set(shortcutIds).size).toBe(shortcutIds.length);
    for (const app of getAllApps()) {
      expect(shortcutIds, `app '${app.id}' has no desktop shortcut — add it to a folder in desktopShortcuts.ts`).toContain(app.id);
    }
  });

  it('uses each app registry icon so folders match the Start menu look', () => {
    for (const shortcut of allDesktopShortcuts()) {
      const app = getApp(shortcut.appId)!;
      expect(shortcut.icon).toBe(app.icon16 ?? app.icon);
    }
  });

  it('builds folder nodes with launchable app: content', () => {
    const folders = buildDesktopAppFolders();
    expect(folders.map((f) => f.name)).toEqual(Object.keys(DESKTOP_APP_FOLDERS));
    for (const folder of folders) {
      expect(folder.type).toBe('directory');
      for (const child of folder.children ?? []) {
        expect(child.type).toBe('file');
        expect(child.content).toMatch(/^app:[\w-]+$/);
        expect(child.icon).toBeTruthy();
      }
    }
  });
});
