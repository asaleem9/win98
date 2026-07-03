import {
  parseArchive,
  isArchiveContent,
  serializeArchive,
  fakeRatio,
  packedSize,
  fakeCrc,
  ArchiveEntry,
} from '@/lib/archive';

describe('parseArchive', () => {
  it('parses a well-formed archive payload', () => {
    const json = JSON.stringify({ archive: true, entries: [{ name: 'a.txt', size: 5, content: 'hello' }] });
    const parsed = parseArchive(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.entries).toHaveLength(1);
    expect(parsed!.entries[0]).toEqual({ name: 'a.txt', size: 5, content: 'hello' });
  });

  it('returns null for non-JSON content', () => {
    expect(parseArchive('not json at all')).toBeNull();
  });

  it('returns null when archive flag is missing', () => {
    expect(parseArchive(JSON.stringify({ entries: [] }))).toBeNull();
  });

  it('returns null when archive flag is not true', () => {
    expect(parseArchive(JSON.stringify({ archive: false, entries: [] }))).toBeNull();
  });

  it('returns null when entries is not an array', () => {
    expect(parseArchive(JSON.stringify({ archive: true, entries: 'nope' }))).toBeNull();
  });

  it('returns null for null/undefined/empty content', () => {
    expect(parseArchive(null)).toBeNull();
    expect(parseArchive(undefined)).toBeNull();
    expect(parseArchive('')).toBeNull();
  });

  it('accepts an empty entries array', () => {
    const parsed = parseArchive(JSON.stringify({ archive: true, entries: [] }));
    expect(parsed).toEqual({ archive: true, entries: [] });
  });

  it('coerces malformed entries to safe defaults', () => {
    const json = JSON.stringify({ archive: true, entries: [{}, { name: 'x' }, { content: 'yo' }] });
    const parsed = parseArchive(json)!;
    expect(parsed.entries[0]).toEqual({ name: 'untitled', size: 0, content: '' });
    expect(parsed.entries[1]).toEqual({ name: 'x', size: 0, content: '' });
    // size falls back to content length when absent
    expect(parsed.entries[2]).toEqual({ name: 'untitled', size: 2, content: 'yo' });
  });
});

describe('isArchiveContent', () => {
  it('is true for valid archives and false otherwise', () => {
    expect(isArchiveContent(JSON.stringify({ archive: true, entries: [] }))).toBe(true);
    expect(isArchiveContent('hello world')).toBe(false);
    expect(isArchiveContent(null)).toBe(false);
  });
});

describe('serializeArchive', () => {
  it('round-trips through parseArchive', () => {
    const entries: ArchiveEntry[] = [
      { name: 'index.html', size: 12, content: '<html></html>' },
      { name: 'readme.txt', size: 3, content: 'yo!' },
    ];
    const parsed = parseArchive(serializeArchive(entries))!;
    expect(parsed.entries).toEqual(entries);
  });

  it('produces content recognized by isArchiveContent', () => {
    expect(isArchiveContent(serializeArchive([]))).toBe(true);
  });
});

describe('compression display helpers', () => {
  it('fakeRatio stays within 0..90 and 0 for empty files', () => {
    expect(fakeRatio(0)).toBe(0);
    for (const size of [1, 100, 1024, 1_000_000]) {
      const r = fakeRatio(size);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(90);
    }
  });

  it('packedSize never exceeds the original size', () => {
    for (const size of [0, 10, 5000, 1_048_576]) {
      expect(packedSize(size)).toBeLessThanOrEqual(size);
      expect(packedSize(size)).toBeGreaterThanOrEqual(0);
    }
  });

  it('fakeCrc is a stable 8-char hex stamp', () => {
    const entry: ArchiveEntry = { name: 'a.txt', size: 5, content: 'hello' };
    const crc = fakeCrc(entry);
    expect(crc).toMatch(/^[0-9A-F]{8}$/);
    expect(fakeCrc(entry)).toBe(crc);
    expect(fakeCrc({ name: 'b.txt', size: 5, content: 'hello' })).not.toBe(crc);
  });
});
