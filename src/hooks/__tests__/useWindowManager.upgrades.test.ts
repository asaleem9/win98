import { renderHook, act } from '@testing-library/react';
import { useWindowManager, setAppRegistry } from '@/hooks/useWindowManager';

const mockRegistry = {
  'resizable-app': {
    defaultWindow: { title: 'Resizable', width: 400, height: 300, minWidth: 200, minHeight: 150 },
    singleton: false,
  },
  'fixed-app': {
    defaultWindow: { title: 'Fixed', width: 300, height: 200, minWidth: 300, minHeight: 200, resizable: false },
    singleton: false,
  },
};

beforeAll(() => {
  setAppRegistry(mockRegistry);
});

describe('resizable window flag', () => {
  it('defaults resizable to true when the app omits it', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('resizable-app'));
    expect(result.current.windows[0].resizable).toBe(true);
  });

  it('honors resizable:false from the app definition', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('fixed-app'));
    expect(result.current.windows[0].resizable).toBe(false);
  });

  it('RESIZE_WINDOW is a no-op for a non-resizable window', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('fixed-app'));
    const id = result.current.windows[0].id;
    const before = result.current.windows[0].size;
    act(() => result.current.resizeWindow(id, 800, 600));
    expect(result.current.windows[0].size).toEqual(before);
  });

  it('RESIZE_WINDOW still resizes a resizable window', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('resizable-app'));
    const id = result.current.windows[0].id;
    act(() => result.current.resizeWindow(id, 640, 480));
    expect(result.current.windows[0].size).toEqual({ width: 640, height: 480 });
  });
});

describe('owned dialogs', () => {
  it('an explicit id and ownerId are recorded on the window', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('resizable-app', { id: 'owner-a' }));
    act(() => result.current.openWindow('__dialog__', { id: 'child-a', ownerId: 'owner-a', modal: true }));
    const child = result.current.windows.find((w) => w.id === 'child-a')!;
    expect(child.ownerId).toBe('owner-a');
    expect(child.modal).toBe(true);
  });

  it('closing an owner cascades to its owned dialogs (transitively)', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('resizable-app', { id: 'owner-b' }));
    act(() => result.current.openWindow('__dialog__', { id: 'child-b', ownerId: 'owner-b' }));
    act(() => result.current.openWindow('__dialog__', { id: 'grandchild-b', ownerId: 'child-b' }));
    act(() => result.current.closeWindow('owner-b'));
    const ids = result.current.windows.map((w) => w.id);
    expect(ids).not.toContain('owner-b');
    expect(ids).not.toContain('child-b');
    expect(ids).not.toContain('grandchild-b');
  });

  it('focusing an owner guarded by an open modal child redirects focus to the child', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('resizable-app', { id: 'owner-c' }));
    act(() => result.current.openWindow('__dialog__', { id: 'child-c', ownerId: 'owner-c', modal: true }));
    act(() => result.current.openWindow('resizable-app', { id: 'other-c' }));
    act(() => result.current.focusWindow('owner-c'));
    expect(result.current.windows.find((w) => w.id === 'child-c')!.isFocused).toBe(true);
    expect(result.current.windows.find((w) => w.id === 'owner-c')!.isFocused).toBe(false);
  });

  it('minimizing an owner also minimizes its owned dialogs', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('resizable-app', { id: 'owner-d' }));
    act(() => result.current.openWindow('__dialog__', { id: 'child-d', ownerId: 'owner-d' }));
    act(() => result.current.minimizeWindow('owner-d'));
    expect(result.current.windows.find((w) => w.id === 'owner-d')!.state).toBe('minimized');
    expect(result.current.windows.find((w) => w.id === 'child-d')!.state).toBe('minimized');
  });
});

describe('MINIMIZE_ALL / RESTORE_ALL', () => {
  it('MINIMIZE_ALL minimizes top-level windows but skips owned dialogs', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('resizable-app', { id: 'owner-e' }));
    act(() => result.current.openWindow('__dialog__', { id: 'child-e', ownerId: 'owner-e' }));
    act(() => result.current.minimizeAll());
    expect(result.current.windows.find((w) => w.id === 'owner-e')!.state).toBe('minimized');
    expect(result.current.windows.find((w) => w.id === 'child-e')!.state).toBe('normal');
  });

  it('RESTORE_ALL brings every minimized window back to normal', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('resizable-app', { id: 'r1' }));
    act(() => result.current.openWindow('resizable-app', { id: 'r2' }));
    act(() => result.current.minimizeAll());
    expect(result.current.windows.some((w) => w.state === 'minimized')).toBe(true);
    act(() => result.current.restoreAll());
    expect(result.current.windows.every((w) => w.state === 'normal')).toBe(true);
  });
});
