import {
  getApp,
  getAllApps,
  getAppsByCategory,
  getDesktopApps,
  getQuickLaunchApps,
  getStartMenuApps,
} from '@/lib/appRegistry';
import type { AppCategory } from '@/types/app';

const validCategories: AppCategory[] = [
  'accessories', 'games', 'internet', 'multimedia',
  'system', 'productivity', 'utilities', 'era-games',
];

describe('getApp', () => {
  it('returns an AppDefinition with correct fields for notepad', () => {
    const app = getApp('notepad');
    expect(app).toBeDefined();
    expect(app!.id).toBe('notepad');
    expect(app!.name).toBe('Notepad');
    expect(app!.category).toBe('accessories');
  });

  it('returns undefined for nonexistent app', () => {
    expect(getApp('nonexistent')).toBeUndefined();
  });
});

describe('getAllApps', () => {
  it('returns an array with 56 entries', () => {
    expect(getAllApps()).toHaveLength(56);
  });
});

describe('getAppsByCategory', () => {
  it('returns only game apps for "games" category', () => {
    const games = getAppsByCategory('games');
    expect(games.length).toBeGreaterThan(0);
    for (const app of games) {
      expect(app.category).toBe('games');
    }
  });

  it('returns only accessory apps for "accessories" category', () => {
    const accessories = getAppsByCategory('accessories');
    expect(accessories.length).toBeGreaterThan(0);
    for (const app of accessories) {
      expect(app.category).toBe('accessories');
    }
  });

  it('returns empty array for non-existent category', () => {
    expect(getAppsByCategory('nonexistent')).toEqual([]);
  });
});

describe('getDesktopApps', () => {
  it('returns apps where desktopIcon === true', () => {
    const desktopApps = getDesktopApps();
    expect(desktopApps.length).toBeGreaterThan(0);
    for (const app of desktopApps) {
      expect(app.desktopIcon).toBe(true);
    }
  });
});

describe('getQuickLaunchApps', () => {
  it('returns apps where quickLaunch === true', () => {
    const qlApps = getQuickLaunchApps();
    expect(qlApps.length).toBeGreaterThan(0);
    for (const app of qlApps) {
      expect(app.quickLaunch).toBe(true);
    }
  });
});

describe('getStartMenuApps', () => {
  it('returns apps that have startMenuPath', () => {
    const smApps = getStartMenuApps();
    expect(smApps.length).toBeGreaterThan(0);
    for (const app of smApps) {
      expect(app.startMenuPath).toBeDefined();
      expect(Array.isArray(app.startMenuPath)).toBe(true);
    }
  });
});

describe('app definitions integrity', () => {
  const allApps = getAllApps();

  it('every app has required fields: id, name, icon, category, component, defaultWindow', () => {
    for (const app of allApps) {
      expect(typeof app.id).toBe('string');
      expect(typeof app.name).toBe('string');
      expect(typeof app.icon).toBe('string');
      expect(app.category).toBeDefined();
      expect(app.component).toBeDefined();
      expect(app.defaultWindow).toBeDefined();
    }
  });

  it('every app defaultWindow has title, width, height', () => {
    for (const app of allApps) {
      expect(typeof app.defaultWindow.title).toBe('string');
      expect(typeof app.defaultWindow.width).toBe('number');
      expect(typeof app.defaultWindow.height).toBe('number');
    }
  });

  it('no duplicate app IDs', () => {
    const ids = allApps.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all categories are valid AppCategory values', () => {
    for (const app of allApps) {
      expect(validCategories).toContain(app.category);
    }
  });

  it('all apps have string id and string name', () => {
    for (const app of allApps) {
      expect(typeof app.id).toBe('string');
      expect(app.id.length).toBeGreaterThan(0);
      expect(typeof app.name).toBe('string');
      expect(app.name.length).toBeGreaterThan(0);
    }
  });

  it('defaultWindow width and height are positive numbers', () => {
    for (const app of allApps) {
      expect(app.defaultWindow.width).toBeGreaterThan(0);
      expect(app.defaultWindow.height).toBeGreaterThan(0);
    }
  });

  it('app component is a function (lazy component or regular)', () => {
    for (const app of allApps) {
      expect(typeof app.component).toBe('object' as string | 'function');
    }
  });

  it('each app category is one of the valid AppCategory union members', () => {
    for (const app of allApps) {
      expect(validCategories.includes(app.category)).toBe(true);
    }
  });

  it('at least one app has singleton === true', () => {
    expect(allApps.some((a) => a.singleton === true)).toBe(true);
  });

  it('at least one app has quickLaunch === true', () => {
    expect(allApps.some((a) => a.quickLaunch === true)).toBe(true);
  });

  it('at least one app has desktopIcon === true', () => {
    expect(allApps.some((a) => a.desktopIcon === true)).toBe(true);
  });
});
