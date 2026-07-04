import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  FileSystemProvider,
  useFileSystem,
  hashPath,
  seedFragments,
  nextFragments,
  computeFragStats,
} from '@/contexts/FileSystemContext';
import { normalizePath } from '@/lib/fs/fsOperations';
import { FSNode } from '@/types/filesystem';

function wrapper({ children }: { children: ReactNode }) {
  return <FileSystemProvider>{children}</FileSystemProvider>;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('fragmentation helpers', () => {
  it('hashPath is deterministic, non-negative, and case/slash-insensitive', () => {
    expect(hashPath('C:\\a\\b.txt')).toBe(hashPath('C:\\a\\b.txt'));
    expect(hashPath('C:\\A\\B.TXT')).toBe(hashPath('c:/a/b.txt'));
    expect(hashPath('C:\\a\\b.txt')).toBeGreaterThanOrEqual(0);
  });

  it('seedFragments stays in the 1-4 range and is deterministic', () => {
    for (const p of ['C:\\one.txt', 'C:\\dir\\two.mp3', 'C:\\x', 'C:\\My Documents\\y.doc']) {
      const s = seedFragments(p);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(4);
      expect(seedFragments(p)).toBe(s);
    }
  });

  it('nextFragments always grows and is deterministic for a given (path, count)', () => {
    const p = 'C:\\grow.txt';
    const a = nextFragments(p, 1);
    expect(a).toBeGreaterThan(1);
    expect(nextFragments(p, 1)).toBe(a);
    expect(nextFragments(p, a)).toBeGreaterThan(a);
  });

  it('computeFragStats counts files and fragmented files with correct percentage', () => {
    const root: FSNode = {
      name: 'C:', type: 'directory', created: '', modified: '',
      children: [
        { name: 'a.txt', type: 'file', created: '', modified: '', size: 10 },
        {
          name: 'Sub', type: 'directory', created: '', modified: '',
          children: [
            { name: 'b.txt', type: 'file', created: '', modified: '', size: 10 },
            { name: 'c.txt', type: 'file', created: '', modified: '', size: 10 },
          ],
        },
        { name: 'd.txt', type: 'file', created: '', modified: '', size: 10 },
      ],
    };
    const stats = computeFragStats(root, { 'C:\\Sub\\b.txt': 3 });
    expect(stats).toEqual({ files: 4, fragmented: 1, fragPercent: 25 });
  });

  it('treats files with no recorded fragments as contiguous', () => {
    const root: FSNode = {
      name: 'C:', type: 'directory', created: '', modified: '',
      children: [{ name: 'a.txt', type: 'file', created: '', modified: '', size: 10 }],
    };
    expect(computeFragStats(root, {})).toEqual({ files: 1, fragmented: 0, fragPercent: 0 });
  });

  it('reports zero percent for an empty drive', () => {
    const root: FSNode = { name: 'C:', type: 'directory', created: '', modified: '', children: [] };
    expect(computeFragStats(root, {})).toEqual({ files: 0, fragmented: 0, fragPercent: 0 });
  });
});

describe('FileSystemContext fragmentation tracking', () => {
  it('seeds a fragment count deterministically when a file is created', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    const path = 'C:\\My Documents\\frag-new.txt';
    act(() => { result.current.writeFile(path, 'hello'); });
    expect(result.current.fragments[normalizePath(path)]).toBe(seedFragments(normalizePath(path)));
  });

  it('increments the fragment count deterministically on rewrite', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    const path = 'C:\\My Documents\\frag-grow.txt';
    const norm = normalizePath(path);
    act(() => { result.current.writeFile(path, 'a'); });
    const afterSeed = result.current.fragments[norm];
    act(() => { result.current.writeFile(path, 'ab'); });
    expect(result.current.fragments[norm]).toBe(nextFragments(norm, afterSeed));
    expect(result.current.fragments[norm]).toBeGreaterThan(afterSeed);
  });

  it('surfaces fragmented files through getFragmentationStats', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    const path = 'C:\\My Documents\\frag-stats.txt';
    // Two writes guarantee a count above 1 (i.e. fragmented) regardless of seed.
    act(() => { result.current.writeFile(path, 'a'); });
    act(() => { result.current.writeFile(path, 'ab'); });
    const stats = result.current.getFragmentationStats();
    expect(stats.files).toBeGreaterThan(0);
    expect(stats.fragmented).toBeGreaterThan(0);
    expect(stats.fragPercent).toBeGreaterThan(0);
  });

  it('clearFragmentation wipes the map so nothing reads as fragmented', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    const path = 'C:\\My Documents\\frag-clear.txt';
    act(() => { result.current.writeFile(path, 'a'); });
    act(() => { result.current.writeFile(path, 'ab'); });
    expect(result.current.getFragmentationStats().fragmented).toBeGreaterThan(0);
    act(() => { result.current.clearFragmentation(); });
    expect(result.current.fragments).toEqual({});
    expect(result.current.getFragmentationStats().fragmented).toBe(0);
    expect(result.current.getFragmentationStats().fragPercent).toBe(0);
  });

  it('persists the fragments map and rehydrates it', () => {
    vi.useFakeTimers();
    const path = 'C:\\My Documents\\frag-persist.txt';
    const norm = normalizePath(path);
    const first = renderHook(() => useFileSystem(), { wrapper });
    act(() => { first.result.current.writeFile(path, 'saved'); });
    act(() => { vi.advanceTimersByTime(600); });
    const expected = first.result.current.fragments[norm];
    first.unmount();
    vi.useRealTimers();

    const saved = JSON.parse(window.localStorage.getItem('win98-fs-v1')!);
    expect(saved.fragments[norm]).toBe(expected);

    const second = renderHook(() => useFileSystem(), { wrapper });
    expect(second.result.current.fragments[norm]).toBe(expected);
  });

  it('loads legacy saves that predate the fragments field', () => {
    vi.useFakeTimers();
    const first = renderHook(() => useFileSystem(), { wrapper });
    act(() => { first.result.current.writeFile('C:\\My Documents\\legacy.txt', 'kept'); });
    act(() => { vi.advanceTimersByTime(600); });
    first.unmount();
    vi.useRealTimers();

    // Strip the fragments field to mimic a payload written before this feature.
    const legacy = JSON.parse(window.localStorage.getItem('win98-fs-v1')!);
    delete legacy.fragments;
    window.localStorage.setItem('win98-fs-v1', JSON.stringify(legacy));

    const second = renderHook(() => useFileSystem(), { wrapper });
    expect(second.result.current.readFile('C:\\My Documents\\legacy.txt')).toBe('kept');
    expect(second.result.current.fragments).toEqual({});
  });
});
