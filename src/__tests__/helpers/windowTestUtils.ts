import { WindowState, WindowManagerState } from '@/types/window';

export function createMockWindowState(overrides?: Partial<WindowState>): WindowState {
  return {
    id: 'window-test-1',
    appId: 'notepad',
    title: 'Test Window',
    position: { x: 100, y: 100 },
    size: { width: 400, height: 300 },
    minSize: { width: 200, height: 150 },
    zIndex: 10,
    state: 'normal',
    isFocused: true,
    ...overrides,
  };
}

export function createMockManagerState(overrides?: Partial<WindowManagerState>): WindowManagerState {
  return {
    windows: [],
    nextZIndex: 10,
    ...overrides,
  };
}
