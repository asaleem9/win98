// Archive file convention shared by WinZip and WinRAR. An "archive" is a plain
// FS file whose text content is JSON of the shape:
//   { archive: true, entries: [ { name, size, content }, ... ] }
// Any app can create one; the archivers read and extract them.

export interface ArchiveEntry {
  name: string;
  size: number;
  content: string;
}

export interface ArchiveData {
  archive: true;
  entries: ArchiveEntry[];
}

/** True when the string parses as a well-formed archive payload. */
export function isArchiveContent(content: string | null | undefined): boolean {
  return parseArchive(content) !== null;
}

/**
 * Parses archive JSON. Returns null when the content is missing, not JSON, or
 * doesn't match the archive shape. Entries are coerced to safe defaults so a
 * partially-malformed archive still lists something instead of throwing.
 */
export function parseArchive(content: string | null | undefined): ArchiveData | null {
  if (!content) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as { archive?: unknown }).archive !== true ||
    !Array.isArray((parsed as { entries?: unknown }).entries)
  ) {
    return null;
  }
  const entries: ArchiveEntry[] = (parsed as { entries: unknown[] }).entries.map((raw) => {
    const e = (raw ?? {}) as Partial<ArchiveEntry>;
    const content = typeof e.content === 'string' ? e.content : '';
    const size = typeof e.size === 'number' && e.size >= 0 ? e.size : content.length;
    return {
      name: typeof e.name === 'string' && e.name ? e.name : 'untitled',
      size,
      content,
    };
  });
  return { archive: true, entries };
}

/** Serializes entries into archive JSON suitable for writing to an FS file. */
export function serializeArchive(entries: ArchiveEntry[]): string {
  const data: ArchiveData = { archive: true, entries };
  return JSON.stringify(data, null, 2);
}

/** Deflate-style ratio gag: bigger files "compress" better, capped 10–90%. */
export function fakeRatio(size: number): number {
  if (size <= 0) return 0;
  const r = Math.round(20 + Math.min(70, Math.log2(size + 1) * 4));
  return Math.max(10, Math.min(90, r));
}

/** Packed size implied by {@link fakeRatio}. */
export function packedSize(size: number): number {
  return Math.round(size * (1 - fakeRatio(size) / 100));
}

/** CRC32-ish hex stamp derived from name+content, for display only. */
export function fakeCrc(entry: ArchiveEntry): string {
  const src = `${entry.name}:${entry.content}`;
  let h = 0xffffffff;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    for (let k = 0; k < 8; k++) h = (h >>> 1) ^ (0xedb88320 & -(h & 1));
  }
  return ((h ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, '0');
}
