import { renderHook, act } from '@testing-library/react';
import { useWindowManager, setAppRegistry } from '@/hooks/useWindowManager';

const mockRegistry = {
  'test-app': {
    defaultWindow: { title: 'Test App', width: 400, height: 300, minWidth: 200, minHeight: 150 },
    singleton: false,
  },
  'singleton-app': {
    defaultWindow: { title: 'Singleton App', width: 500, height: 400, minWidth: 250, minHeight: 200 },
    singleton: true,
  },
};

beforeAll(() => {
  setAppRegistry(mockRegistry);
});

describe('OPEN_WINDOW', () => {
  it('opens a window and returns it in the windows array', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    expect(result.current.windows).toHaveLength(1);
    expect(result.current.windows[0].appId).toBe('test-app');
  });

  it('new window is focused', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    expect(result.current.windows[0].isFocused).toBe(true);
  });

  it('opening unfocuses all previous windows', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    act(() => result.current.openWindow('test-app'));
    expect(result.current.windows[0].isFocused).toBe(false);
    expect(result.current.windows[1].isFocused).toBe(true);
  });

  it('window gets unique ID', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    act(() => result.current.openWindow('test-app'));
    const ids = result.current.windows.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('window gets cascade position based on open window count', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const first = result.current.windows[0].position;
    act(() => result.current.openWindow('test-app'));
    const second = result.current.windows[1].position;
    expect(second.x).toBeGreaterThan(first.x);
    expect(second.y).toBeGreaterThan(first.y);
  });

  it('window uses appDef defaults for size/title', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const win = result.current.windows[0];
    expect(win.title).toBe('Test App');
    expect(win.size.width).toBe(400);
    expect(win.size.height).toBe(300);
  });

  it('opening a singleton app twice focuses existing instead of creating new', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('singleton-app'));
    act(() => result.current.openWindow('singleton-app'));
    const singletonWindows = result.current.windows.filter((w) => w.appId === 'singleton-app');
    expect(singletonWindows).toHaveLength(1);
    expect(singletonWindows[0].isFocused).toBe(true);
  });
});

describe('CLOSE_WINDOW', () => {
  it('removes window from array', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const id = result.current.windows[0].id;
    act(() => result.current.closeWindow(id));
    expect(result.current.windows).toHaveLength(0);
  });

  it('auto-focuses topmost remaining window', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    act(() => result.current.openWindow('test-app'));
    const secondId = result.current.windows[1].id;
    act(() => result.current.closeWindow(secondId));
    expect(result.current.windows).toHaveLength(1);
    expect(result.current.windows[0].isFocused).toBe(true);
  });

  it('closing last window leaves empty array', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const id = result.current.windows[0].id;
    act(() => result.current.closeWindow(id));
    expect(result.current.windows).toEqual([]);
  });
});

describe('FOCUS_WINDOW', () => {
  it('sets isFocused true on target, false on others', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    act(() => result.current.openWindow('test-app'));
    const firstId = result.current.windows[0].id;
    act(() => result.current.focusWindow(firstId));
    expect(result.current.windows.find((w) => w.id === firstId)!.isFocused).toBe(true);
    expect(result.current.windows.find((w) => w.id !== firstId)!.isFocused).toBe(false);
  });

  it('updates zIndex to nextZIndex', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    act(() => result.current.openWindow('test-app'));
    const firstId = result.current.windows[0].id;
    const secondZIndex = result.current.windows[1].zIndex;
    act(() => result.current.focusWindow(firstId));
    const focused = result.current.windows.find((w) => w.id === firstId)!;
    expect(focused.zIndex).toBeGreaterThan(secondZIndex);
  });

  it('focusing a minimized window restores it to normal state', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const id = result.current.windows[0].id;
    act(() => result.current.minimizeWindow(id));
    expect(result.current.windows[0].state).toBe('minimized');
    act(() => result.current.focusWindow(id));
    expect(result.current.windows[0].state).toBe('normal');
    expect(result.current.windows[0].isFocused).toBe(true);
  });

  it('focusing already-focused window is a no-op', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const before = result.current.windows;
    act(() => result.current.focusWindow(result.current.windows[0].id));
    expect(result.current.windows).toBe(before);
  });
});

describe('MINIMIZE_WINDOW', () => {
  it('sets state to minimized and isFocused to false', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const id = result.current.windows[0].id;
    act(() => result.current.minimizeWindow(id));
    expect(result.current.windows[0].state).toBe('minimized');
    expect(result.current.windows[0].isFocused).toBe(false);
  });

  it('auto-focuses next topmost visible window', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    act(() => result.current.openWindow('test-app'));
    const secondId = result.current.windows[1].id;
    act(() => result.current.minimizeWindow(secondId));
    expect(result.current.windows[0].isFocused).toBe(true);
  });
});

describe('MAXIMIZE_WINDOW', () => {
  it('sets state to maximized', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const id = result.current.windows[0].id;
    act(() => result.current.maximizeWindow(id));
    expect(result.current.windows[0].state).toBe('maximized');
  });

  it('saves restoredPosition and restoredSize', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const id = result.current.windows[0].id;
    const originalPos = { ...result.current.windows[0].position };
    const originalSize = { ...result.current.windows[0].size };
    act(() => result.current.maximizeWindow(id));
    expect(result.current.windows[0].restoredPosition).toEqual(originalPos);
    expect(result.current.windows[0].restoredSize).toEqual(originalSize);
  });
});

describe('RESTORE_WINDOW', () => {
  it('sets state back to normal', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const id = result.current.windows[0].id;
    act(() => result.current.maximizeWindow(id));
    act(() => result.current.restoreWindow(id));
    expect(result.current.windows[0].state).toBe('normal');
  });

  it('restores saved position and size', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const id = result.current.windows[0].id;
    const originalPos = { ...result.current.windows[0].position };
    const originalSize = { ...result.current.windows[0].size };
    act(() => result.current.maximizeWindow(id));
    act(() => result.current.restoreWindow(id));
    expect(result.current.windows[0].position).toEqual(originalPos);
    expect(result.current.windows[0].size).toEqual(originalSize);
  });
});

describe('MOVE_WINDOW', () => {
  it('updates position to new x, y', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const id = result.current.windows[0].id;
    act(() => result.current.moveWindow(id, 200, 300));
    expect(result.current.windows[0].position).toEqual({ x: 200, y: 300 });
  });

  it('only affects target window', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    act(() => result.current.openWindow('test-app'));
    const firstId = result.current.windows[0].id;
    const secondPos = { ...result.current.windows[1].position };
    act(() => result.current.moveWindow(firstId, 999, 999));
    expect(result.current.windows[0].position).toEqual({ x: 999, y: 999 });
    expect(result.current.windows[1].position).toEqual(secondPos);
  });
});

describe('RESIZE_WINDOW', () => {
  it('updates size with new width, height', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const id = result.current.windows[0].id;
    act(() => result.current.resizeWindow(id, 800, 600));
    expect(result.current.windows[0].size).toEqual({ width: 800, height: 600 });
  });

  it('enforces minimum size', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const id = result.current.windows[0].id;
    act(() => result.current.resizeWindow(id, 10, 10));
    expect(result.current.windows[0].size.width).toBe(200);
    expect(result.current.windows[0].size.height).toBe(150);
  });
});

describe('UPDATE_TITLE', () => {
  it('changes the title of the target window', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const id = result.current.windows[0].id;
    act(() => result.current.updateTitle(id, 'New Title'));
    expect(result.current.windows[0].title).toBe('New Title');
  });
});

describe('z-index monotonic increment', () => {
  it('each focus/open increments nextZIndex', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    const z1 = result.current.windows[0].zIndex;
    act(() => result.current.openWindow('test-app'));
    const z2 = result.current.windows[1].zIndex;
    expect(z2).toBeGreaterThan(z1);
  });

  it('z-indexes are always increasing', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    act(() => result.current.openWindow('test-app'));
    act(() => result.current.openWindow('test-app'));
    const firstId = result.current.windows[0].id;
    act(() => result.current.focusWindow(firstId));
    const zIndexes = result.current.windows.map((w) => w.zIndex);
    const focused = result.current.windows.find((w) => w.id === firstId)!;
    expect(focused.zIndex).toBe(Math.max(...zIndexes));
  });
});
