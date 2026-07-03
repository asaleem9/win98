import {
  setClipboard,
  getClipboard,
  clearClipboard,
  subscribe,
  readSystemText,
  __resetClipboard,
  type ClipboardData,
} from '@/lib/clipboard';

// jsdom doesn't provide navigator.clipboard, so install a controllable stub.
let writeText: ReturnType<typeof vi.fn>;
let readText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  __resetClipboard();
  writeText = vi.fn().mockResolvedValue(undefined);
  readText = vi.fn().mockResolvedValue('');
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText, readText },
    writable: true,
    configurable: true,
  });
});

describe('clipboard', () => {
  it('set/get round-trips text data', () => {
    const data: ClipboardData = { kind: 'text', text: 'hello' };
    setClipboard(data);
    expect(getClipboard()).toEqual(data);
  });

  it('starts empty and clears back to null', () => {
    expect(getClipboard()).toBeNull();
    setClipboard({ kind: 'text', text: 'x' });
    clearClipboard();
    expect(getClipboard()).toBeNull();
  });

  it('stores the files-cut shape', () => {
    const data: ClipboardData = { kind: 'files', paths: ['C:\\a', 'C:\\b'], operation: 'cut' };
    setClipboard(data);
    expect(getClipboard()).toEqual(data);
  });

  it('stores image data', () => {
    const data: ClipboardData = { kind: 'image', dataUrl: 'data:image/png;base64,AAAA' };
    setClipboard(data);
    expect(getClipboard()).toEqual(data);
  });

  it('mirrors text to the system clipboard, but not other kinds', () => {
    setClipboard({ kind: 'text', text: 'copy me' });
    expect(writeText).toHaveBeenCalledWith('copy me');
    writeText.mockClear();
    setClipboard({ kind: 'files', paths: ['C:\\a'], operation: 'copy' });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('swallows a rejected system-clipboard write', () => {
    writeText.mockRejectedValue(new Error('denied'));
    expect(() => setClipboard({ kind: 'text', text: 'nope' })).not.toThrow();
    expect(getClipboard()).toEqual({ kind: 'text', text: 'nope' });
  });

  it('notifies subscribers on set and clear', () => {
    const seen: Array<ClipboardData | null> = [];
    const off = subscribe((d) => seen.push(d));
    setClipboard({ kind: 'text', text: 'a' });
    clearClipboard();
    off();
    expect(seen).toEqual([{ kind: 'text', text: 'a' }, null]);
  });

  it('stops notifying after unsubscribe', () => {
    let calls = 0;
    const off = subscribe(() => {
      calls++;
    });
    setClipboard({ kind: 'text', text: '1' });
    off();
    setClipboard({ kind: 'text', text: '2' });
    expect(calls).toBe(1);
  });

  it('readSystemText returns clipboard text', async () => {
    readText.mockResolvedValue('pasted');
    await expect(readSystemText()).resolves.toBe('pasted');
  });

  it('readSystemText returns null when read is denied', async () => {
    readText.mockRejectedValue(new Error('denied'));
    await expect(readSystemText()).resolves.toBeNull();
  });

  it('readSystemText returns null when the API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    await expect(readSystemText()).resolves.toBeNull();
  });
});
