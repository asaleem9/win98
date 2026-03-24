import { expectTypeOf, describe, test } from 'vitest';
import type { WindowState, WindowAction, WindowManagerState } from '@/types/window';
import type { AppCategory, AppDefinition, AppComponentProps } from '@/types/app';
import type { FileType, FSNode } from '@/types/filesystem';
import { cn } from '@/lib/cn';
import { resolvePath, formatSize, getParentPath } from '@/lib/filesystem';
import { getApp, getAllApps, getAppsByCategory, getDesktopApps, getQuickLaunchApps, getStartMenuApps } from '@/lib/appRegistry';
import { WIN98_COLORS, SCREENSAVER_TIMEOUT, DEFAULT_DESKTOP_ICONS } from '@/lib/constants';
import type { Button98 } from '@/components/ui/Button98';
import type { ButtonHTMLAttributes, ComponentProps } from 'react';

describe('WindowState types', () => {
  test('state is exactly the window state union', () => {
    expectTypeOf<WindowState['state']>().toEqualTypeOf<'normal' | 'minimized' | 'maximized'>();
  });

  test('id is string', () => {
    expectTypeOf<WindowState['id']>().toEqualTypeOf<string>();
  });

  test('position is { x: number; y: number }', () => {
    expectTypeOf<WindowState['position']>().toEqualTypeOf<{ x: number; y: number }>();
  });

  test('size is { width: number; height: number }', () => {
    expectTypeOf<WindowState['size']>().toEqualTypeOf<{ width: number; height: number }>();
  });

  test('zIndex is number', () => {
    expectTypeOf<WindowState['zIndex']>().toEqualTypeOf<number>();
  });

  test('isFocused is boolean', () => {
    expectTypeOf<WindowState['isFocused']>().toEqualTypeOf<boolean>();
  });

  test('restoredPosition is optional', () => {
    expectTypeOf<WindowState['restoredPosition']>().toEqualTypeOf<{ x: number; y: number } | undefined>();
  });
});

describe('WindowAction discriminated union', () => {
  test('WindowAction is not never', () => {
    expectTypeOf<WindowAction>().not.toBeNever();
  });

  test('union includes all action types', () => {
    expectTypeOf<Extract<WindowAction, { type: 'OPEN_WINDOW' }>>().not.toBeNever();
    expectTypeOf<Extract<WindowAction, { type: 'CLOSE_WINDOW' }>>().not.toBeNever();
    expectTypeOf<Extract<WindowAction, { type: 'FOCUS_WINDOW' }>>().not.toBeNever();
    expectTypeOf<Extract<WindowAction, { type: 'MINIMIZE_WINDOW' }>>().not.toBeNever();
    expectTypeOf<Extract<WindowAction, { type: 'MAXIMIZE_WINDOW' }>>().not.toBeNever();
    expectTypeOf<Extract<WindowAction, { type: 'RESTORE_WINDOW' }>>().not.toBeNever();
    expectTypeOf<Extract<WindowAction, { type: 'MOVE_WINDOW' }>>().not.toBeNever();
    expectTypeOf<Extract<WindowAction, { type: 'RESIZE_WINDOW' }>>().not.toBeNever();
    expectTypeOf<Extract<WindowAction, { type: 'UPDATE_TITLE' }>>().not.toBeNever();
  });

  test('each member has type and payload', () => {
    expectTypeOf<WindowAction>().toHaveProperty('type');
    expectTypeOf<WindowAction>().toHaveProperty('payload');
  });
});

describe('WindowManagerState', () => {
  test('has windows array and nextZIndex', () => {
    expectTypeOf<WindowManagerState['windows']>().toEqualTypeOf<WindowState[]>();
    expectTypeOf<WindowManagerState['nextZIndex']>().toEqualTypeOf<number>();
  });
});

describe('AppCategory', () => {
  test('is the expected union of string literals', () => {
    expectTypeOf<AppCategory>().toEqualTypeOf<
      'accessories' | 'games' | 'internet' | 'multimedia' | 'system' | 'productivity' | 'utilities' | 'era-games'
    >();
  });
});

describe('AppComponentProps', () => {
  test('is { windowId: string }', () => {
    expectTypeOf<AppComponentProps>().toEqualTypeOf<{ windowId: string }>();
  });
});

describe('FSNode types', () => {
  test('type property is FileType', () => {
    expectTypeOf<FSNode['type']>().toEqualTypeOf<FileType>();
    expectTypeOf<FileType>().toEqualTypeOf<'file' | 'directory' | 'shortcut'>();
  });

  test('name is string', () => {
    expectTypeOf<FSNode['name']>().toEqualTypeOf<string>();
  });

  test('children is optional FSNode[]', () => {
    expectTypeOf<FSNode['children']>().toEqualTypeOf<FSNode[] | undefined>();
  });

  test('size is optional number', () => {
    expectTypeOf<FSNode['size']>().toEqualTypeOf<number | undefined>();
  });

  test('content is optional string', () => {
    expectTypeOf<FSNode['content']>().toEqualTypeOf<string | undefined>();
  });

  test('readOnly is optional boolean', () => {
    expectTypeOf<FSNode['readOnly']>().toEqualTypeOf<boolean | undefined>();
  });
});

describe('Function return types', () => {
  test('getApp returns AppDefinition | undefined', () => {
    expectTypeOf(getApp).returns.toEqualTypeOf<AppDefinition | undefined>();
  });

  test('getAllApps returns AppDefinition[]', () => {
    expectTypeOf(getAllApps).returns.toEqualTypeOf<AppDefinition[]>();
  });

  test('getAppsByCategory accepts string and returns AppDefinition[]', () => {
    expectTypeOf(getAppsByCategory).parameter(0).toBeString();
    expectTypeOf(getAppsByCategory).returns.toEqualTypeOf<AppDefinition[]>();
  });

  test('getDesktopApps returns AppDefinition[]', () => {
    expectTypeOf(getDesktopApps).returns.toEqualTypeOf<AppDefinition[]>();
  });

  test('getQuickLaunchApps returns AppDefinition[]', () => {
    expectTypeOf(getQuickLaunchApps).returns.toEqualTypeOf<AppDefinition[]>();
  });

  test('getStartMenuApps returns AppDefinition[]', () => {
    expectTypeOf(getStartMenuApps).returns.toEqualTypeOf<AppDefinition[]>();
  });

  test('resolvePath returns FSNode | null', () => {
    expectTypeOf(resolvePath).parameter(0).toBeString();
    expectTypeOf(resolvePath).returns.toEqualTypeOf<FSNode | null>();
  });

  test('formatSize accepts number and returns string', () => {
    expectTypeOf(formatSize).parameter(0).toBeNumber();
    expectTypeOf(formatSize).returns.toBeString();
  });

  test('getParentPath accepts string and returns string', () => {
    expectTypeOf(getParentPath).parameter(0).toBeString();
    expectTypeOf(getParentPath).returns.toBeString();
  });

  test('cn accepts rest params and returns string', () => {
    expectTypeOf(cn).returns.toBeString();
  });
});

describe('Constants', () => {
  test('WIN98_COLORS values are strings', () => {
    expectTypeOf<typeof WIN98_COLORS[keyof typeof WIN98_COLORS]>().toBeString();
  });

  test('SCREENSAVER_TIMEOUT is number', () => {
    expectTypeOf(SCREENSAVER_TIMEOUT).toBeNumber();
  });

  test('DEFAULT_DESKTOP_ICONS is a readonly array', () => {
    expectTypeOf<typeof DEFAULT_DESKTOP_ICONS>().toMatchTypeOf<readonly string[]>();
  });
});

describe('Button98 component props', () => {
  type Button98Props = ComponentProps<typeof Button98>;

  test('accepts variant prop', () => {
    expectTypeOf<Button98Props['variant']>().toEqualTypeOf<'default' | 'flat' | 'start' | undefined>();
  });

  test('accepts active prop', () => {
    expectTypeOf<Button98Props>().toHaveProperty('active');
  });

  test('accepts disabled prop', () => {
    expectTypeOf<Button98Props>().toHaveProperty('disabled');
  });

  test('accepts onClick from ButtonHTMLAttributes', () => {
    expectTypeOf<Button98Props>().toHaveProperty('onClick');
  });
});
