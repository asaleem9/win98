import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

beforeEach(() => {
  window.localStorage.clear();
});

describe('useLocalStorage', () => {
  it('returns the initial value when nothing stored', () => {
    const { result } = renderHook(() => useLocalStorage('k', 42));
    expect(result.current[0]).toBe(42);
  });

  it('writes and reads back values', () => {
    const first = renderHook(() => useLocalStorage('k', 0));
    act(() => first.result.current[1](7));
    expect(first.result.current[0]).toBe(7);
    expect(JSON.parse(window.localStorage.getItem('k')!)).toBe(7);

    const second = renderHook(() => useLocalStorage('k', 0));
    expect(second.result.current[0]).toBe(7);
  });

  it('supports functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('k', 1));
    act(() => result.current[1]((p) => p + 1));
    expect(result.current[0]).toBe(2);
  });

  it('falls back to initial on corrupt JSON', () => {
    window.localStorage.setItem('k', '{bad');
    const { result } = renderHook(() => useLocalStorage('k', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });
});
