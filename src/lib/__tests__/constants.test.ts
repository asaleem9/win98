import {
  WIN98_COLORS,
  SYSTEM_SPECS,
  DESKTOP_GRID,
  WINDOW_DEFAULTS,
  SCREENSAVER_TIMEOUT,
  DEFAULT_DESKTOP_ICONS,
  START_MENU_CATEGORIES,
} from '@/lib/constants';

describe('WIN98_COLORS', () => {
  it('has all expected keys with string values', () => {
    const expectedKeys = [
      'bg', 'desktop', 'windowBg', 'windowText',
      'titlebarActiveStart', 'titlebarActiveEnd',
      'titlebarInactiveStart', 'titlebarInactiveEnd',
      'highlight', 'highlightText',
      'buttonFace', 'buttonHighlight', 'buttonLight', 'buttonShadow', 'buttonDarkShadow',
      'inputBg', 'tooltipBg', 'bsodBg', 'bsodText',
      'link', 'linkVisited', 'startGreen', 'minesweeperRed', 'disabledText',
    ];
    for (const key of expectedKeys) {
      expect(WIN98_COLORS).toHaveProperty(key);
      expect(typeof (WIN98_COLORS as Record<string, unknown>)[key]).toBe('string');
    }
  });
});

describe('SYSTEM_SPECS', () => {
  it('has all expected keys', () => {
    const expectedKeys = [
      'os', 'processor', 'ram', 'ramBytes', 'hardDisk', 'hardDiskFree',
      'display', 'sound', 'modem', 'monitor', 'cdrom', 'bios',
      'resolution', 'colorDepth',
    ];
    for (const key of expectedKeys) {
      expect(SYSTEM_SPECS).toHaveProperty(key);
    }
  });
});

describe('DESKTOP_GRID', () => {
  it('has cellWidth, cellHeight, paddingX, paddingY, columns — all numbers', () => {
    expect(typeof DESKTOP_GRID.cellWidth).toBe('number');
    expect(typeof DESKTOP_GRID.cellHeight).toBe('number');
    expect(typeof DESKTOP_GRID.paddingX).toBe('number');
    expect(typeof DESKTOP_GRID.paddingY).toBe('number');
    expect(typeof DESKTOP_GRID.columns).toBe('number');
  });
});

describe('WINDOW_DEFAULTS', () => {
  it('has all expected keys', () => {
    const expectedKeys = [
      'cascadeOffsetX', 'cascadeOffsetY',
      'cascadeStartX', 'cascadeStartY',
      'minVisibleTitlebar', 'taskbarHeight', 'titlebarHeight',
    ];
    for (const key of expectedKeys) {
      expect(WINDOW_DEFAULTS).toHaveProperty(key);
    }
  });
});

describe('SCREENSAVER_TIMEOUT', () => {
  it('equals 300000 (5 minutes)', () => {
    expect(SCREENSAVER_TIMEOUT).toBe(300000);
  });
});

describe('DEFAULT_DESKTOP_ICONS', () => {
  it('is a readonly array with expected appIds', () => {
    expect(Array.isArray(DEFAULT_DESKTOP_ICONS)).toBe(true);
    expect(DEFAULT_DESKTOP_ICONS).toContain('my-computer');
    expect(DEFAULT_DESKTOP_ICONS).toContain('my-documents');
    expect(DEFAULT_DESKTOP_ICONS).toContain('recycle-bin');
    expect(DEFAULT_DESKTOP_ICONS).toContain('ie5');
  });
});

describe('START_MENU_CATEGORIES', () => {
  it('has programs, accessories, games, etc.', () => {
    expect(START_MENU_CATEGORIES.programs).toBe('Programs');
    expect(START_MENU_CATEGORIES.accessories).toBe('Accessories');
    expect(START_MENU_CATEGORIES.games).toBe('Games');
    expect(START_MENU_CATEGORIES.internetTools).toBe('Internet Tools');
    expect(START_MENU_CATEGORIES.multimedia).toBe('Multimedia');
    expect(START_MENU_CATEGORIES.systemTools).toBe('System Tools');
    expect(START_MENU_CATEGORIES.startup).toBe('StartUp');
  });
});

describe('all const objects are readonly', () => {
  it('all const objects have the expected types (as const)', () => {
    expect(typeof WIN98_COLORS).toBe('object');
    expect(typeof SYSTEM_SPECS).toBe('object');
    expect(typeof DESKTOP_GRID).toBe('object');
    expect(typeof WINDOW_DEFAULTS).toBe('object');
    expect(Array.isArray(DEFAULT_DESKTOP_ICONS)).toBe(true);
    expect(typeof START_MENU_CATEGORIES).toBe('object');
  });
});
