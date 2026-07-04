import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { FileSystemProvider, useFileSystem } from '@/contexts/FileSystemContext';

function wrapper({ children }: { children: ReactNode }) {
  return <FileSystemProvider>{children}</FileSystemProvider>;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('FileSystemContext', () => {
  it('exposes the seeded tree', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    expect(result.current.getNode('C:\\My Documents\\readme.txt')).toBeTruthy();
    expect(result.current.listDir('C:\\My Documents')!.length).toBeGreaterThan(0);
  });

  it('writes and reads a file', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    act(() => {
      expect(result.current.writeFile('C:\\My Documents\\notes.txt', 'test content').ok).toBe(true);
    });
    expect(result.current.readFile('C:\\My Documents\\notes.txt')).toBe('test content');
  });

  it('overwrites existing file content and updates size', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    act(() => {
      result.current.writeFile('C:\\My Documents\\readme.txt', 'new');
    });
    expect(result.current.readFile('C:\\My Documents\\readme.txt')).toBe('new');
    expect(result.current.getNode('C:\\My Documents\\readme.txt')?.size).toBe(3);
  });

  it('rejects writes to readOnly nodes', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    let res;
    act(() => {
      res = result.current.writeFile('C:\\Windows\\System\\KERNEL32.DLL', 'oops');
    });
    expect(res).toEqual({ ok: false, error: 'Access is denied.' });
  });

  it('creates folders with unique-name semantics', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    act(() => {
      result.current.createFolder('C:\\My Documents', 'New Folder');
    });
    act(() => {
      result.current.createFolder('C:\\My Documents', 'New Folder');
    });
    const names = result.current.listDir('C:\\My Documents')!.map((n) => n.name);
    expect(names).toContain('New Folder');
    expect(names).toContain('New Folder (2)');
  });

  it('renames and rejects invalid names', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    act(() => {
      expect(result.current.rename('C:\\My Documents\\readme.txt', 'renamed.txt').ok).toBe(true);
    });
    expect(result.current.getNode('C:\\My Documents\\renamed.txt')).toBeTruthy();
    let bad;
    act(() => {
      bad = result.current.rename('C:\\My Documents\\renamed.txt', 'a<b.txt');
    });
    expect(bad!.ok).toBe(false);
  });

  it('moves nodes between directories', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    act(() => {
      expect(result.current.move('C:\\My Documents\\readme.txt', 'C:\\TEMP').ok).toBe(true);
    });
    expect(result.current.getNode('C:\\TEMP\\readme.txt')).toBeTruthy();
    expect(result.current.getNode('C:\\My Documents\\readme.txt')).toBeNull();
  });

  it('refuses to move a folder into itself', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    let res;
    act(() => {
      res = result.current.move('C:\\My Documents', 'C:\\My Documents\\My Pictures');
    });
    expect(res!.ok).toBe(false);
  });

  it('round-trips delete → recycle bin → restore', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    act(() => {
      expect(result.current.deleteToRecycleBin('C:\\My Documents\\readme.txt').ok).toBe(true);
    });
    expect(result.current.getNode('C:\\My Documents\\readme.txt')).toBeNull();
    expect(result.current.recycleBin).toHaveLength(1);
    const id = result.current.recycleBin[0].id;
    act(() => {
      expect(result.current.restoreFromRecycleBin(id).ok).toBe(true);
    });
    expect(result.current.getNode('C:\\My Documents\\readme.txt')).toBeTruthy();
    expect(result.current.recycleBin).toHaveLength(0);
  });

  it('empties the recycle bin', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    act(() => {
      result.current.deleteToRecycleBin('C:\\My Documents\\readme.txt');
    });
    act(() => {
      result.current.emptyRecycleBin();
    });
    expect(result.current.recycleBin).toHaveLength(0);
  });

  it('deletes permanently', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    act(() => {
      expect(result.current.deletePermanently('C:\\My Documents\\readme.txt').ok).toBe(true);
    });
    expect(result.current.getNode('C:\\My Documents\\readme.txt')).toBeNull();
    expect(result.current.recycleBin).toHaveLength(0);
  });

  it('persists to localStorage and rehydrates', async () => {
    vi.useFakeTimers();
    const first = renderHook(() => useFileSystem(), { wrapper });
    act(() => {
      first.result.current.writeFile('C:\\My Documents\\persisted.txt', 'saved');
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    first.unmount();
    vi.useRealTimers();

    expect(window.localStorage.getItem('win98-fs-v1')).toBeTruthy();

    const second = renderHook(() => useFileSystem(), { wrapper });
    expect(second.result.current.readFile('C:\\My Documents\\persisted.txt')).toBe('saved');
  });

  it('reseeds on corrupt storage', () => {
    window.localStorage.setItem('win98-fs-v1', '{not json');
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    expect(result.current.getNode('C:\\My Documents')).toBeTruthy();
  });
});

describe('same-tick mutation batches', () => {
  it('keeps every mutation when a folder is created and written to in one tick', () => {
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    act(() => {
      // The print spooler does exactly this: ensure the output folder exists,
      // then write one file per page, all before React re-renders.
      expect(result.current.createFolder('C:\\My Documents', 'Printed Documents').ok).toBe(true);
      expect(result.current.writeFile('C:\\My Documents\\Printed Documents\\doc - Page 1.png', 'data:one').ok).toBe(true);
      expect(result.current.writeFile('C:\\My Documents\\Printed Documents\\doc - Page 2.png', 'data:two').ok).toBe(true);
    });
    expect(result.current.readFile('C:\\My Documents\\Printed Documents\\doc - Page 1.png')).toBe('data:one');
    expect(result.current.readFile('C:\\My Documents\\Printed Documents\\doc - Page 2.png')).toBe('data:two');
  });
});
