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

describe('launchParams', () => {
  it('passes launchParams through to the new window with launchCount 1', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app', { launchParams: { filePath: 'C:\\a.txt' } }));
    expect(result.current.windows[0].launchParams).toEqual({ filePath: 'C:\\a.txt' });
    expect(result.current.windows[0].launchCount).toBe(1);
  });

  it('opens without launchParams as undefined', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('test-app'));
    expect(result.current.windows[0].launchParams).toBeUndefined();
    expect(result.current.windows[0].launchCount).toBe(1);
  });

  it('singleton reopen replaces launchParams, bumps launchCount, and focuses', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('singleton-app', { launchParams: { filePath: 'C:\\a.txt' } }));
    act(() => result.current.openWindow('test-app'));
    expect(result.current.windows.find((w) => w.appId === 'singleton-app')!.isFocused).toBe(false);

    act(() => result.current.openWindow('singleton-app', { launchParams: { filePath: 'C:\\b.txt' } }));
    expect(result.current.windows).toHaveLength(2);
    const singleton = result.current.windows.find((w) => w.appId === 'singleton-app')!;
    expect(singleton.isFocused).toBe(true);
    expect(singleton.launchParams).toEqual({ filePath: 'C:\\b.txt' });
    expect(singleton.launchCount).toBe(2);
  });

  it('singleton reopen without params keeps the previous ones but still bumps launchCount', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('singleton-app', { launchParams: { filePath: 'C:\\a.txt' } }));
    act(() => result.current.openWindow('singleton-app'));
    const singleton = result.current.windows.find((w) => w.appId === 'singleton-app')!;
    expect(singleton.launchParams).toEqual({ filePath: 'C:\\a.txt' });
    expect(singleton.launchCount).toBe(2);
  });

  it('singleton reopen with a title updates the title', () => {
    const { result } = renderHook(() => useWindowManager());
    act(() => result.current.openWindow('singleton-app'));
    act(() => result.current.openWindow('singleton-app', { title: 'b.txt - Singleton App' }));
    const singleton = result.current.windows.find((w) => w.appId === 'singleton-app')!;
    expect(singleton.title).toBe('b.txt - Singleton App');
  });
});
