import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { SettingsProvider, useSettings, DEFAULT_SETTINGS } from '@/contexts/SettingsContext';

function wrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('SettingsContext', () => {
  it('provides defaults', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('sets and persists settings', () => {
    const first = renderHook(() => useSettings(), { wrapper });
    act(() => first.result.current.setSetting('desktopColor', '#000000'));
    expect(first.result.current.settings.desktopColor).toBe('#000000');
    first.unmount();

    const second = renderHook(() => useSettings(), { wrapper });
    expect(second.result.current.settings.desktopColor).toBe('#000000');
  });

  it('stores per-app prefs with fallbacks', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.getAppPref('minesweeper', 'bestTime', 999)).toBe(999);
    act(() => result.current.setAppPref('minesweeper', 'bestTime', 42));
    expect(result.current.getAppPref('minesweeper', 'bestTime', 999)).toBe(42);
  });

  it('keeps prefs for different apps separate', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    act(() => {
      result.current.setAppPref('a', 'x', 1);
      result.current.setAppPref('b', 'x', 2);
    });
    expect(result.current.getAppPref('a', 'x', 0)).toBe(1);
    expect(result.current.getAppPref('b', 'x', 0)).toBe(2);
  });
});
