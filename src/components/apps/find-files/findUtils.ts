// Pure search/filter/sort helpers for Find Files. Kept free of React and the
// filesystem context so the wildcard, size, date, and sort logic can be tested
// in isolation. `searchFiles` walks a plain FSNode tree passed in by the caller.

import { FSNode } from '@/types/filesystem';

export interface SearchHit {
  path: string;
  node: FSNode;
}

export type SortKey = 'name' | 'folder' | 'size' | 'type' | 'modified';
export type SortDir = 'asc' | 'desc';

export interface SearchCriteria {
  /** Wildcard/substring name pattern. Empty matches every name. */
  name?: string;
  /** Case-insensitive substring the file content must contain. */
  text?: string;
  /** Minimum size in KB (inclusive). */
  minKB?: number;
  /** Maximum size in KB (inclusive). */
  maxKB?: number;
  /** Modified on or after this ISO date (YYYY-MM-DD). */
  after?: string;
  /** Modified on or before this ISO date (YYYY-MM-DD). */
  before?: string;
}

const MS_PER_DAY = 86_400_000;

/**
 * Converts a DOS-style wildcard pattern (`*` any run, `?` one char) into an
 * anchored, case-insensitive RegExp. Every other regex metacharacter is escaped.
 */
export function globToRegExp(pattern: string): RegExp {
  const body = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${body}$`, 'i');
}

/**
 * Matches a filename against a Find pattern. Patterns containing `*` or `?` are
 * treated as wildcards (whole-name match); a plain pattern matches as a
 * case-insensitive substring, the way the Windows Find "Named:" box behaves.
 */
export function matchesName(name: string, pattern: string | undefined): boolean {
  const p = (pattern ?? '').trim();
  if (!p) return true;
  if (/[*?]/.test(p)) return globToRegExp(p).test(name);
  return name.toLowerCase().includes(p.toLowerCase());
}

/** True when `bytes` falls within the optional KB bounds (inclusive). */
export function withinSize(bytes: number, minKB?: number, maxKB?: number): boolean {
  if (minKB != null && bytes < minKB * 1024) return false;
  if (maxKB != null && bytes > maxKB * 1024) return false;
  return true;
}

/**
 * True when the ISO `modified` date falls within the optional [after, before]
 * window (both inclusive, whole-day granularity). Unparseable dates only pass
 * when no bound is set.
 */
export function withinDateModified(modified: string, after?: string, before?: string): boolean {
  if (after == null && before == null) return true;
  const t = Date.parse(modified);
  if (Number.isNaN(t)) return false;
  if (after != null) {
    const a = Date.parse(after);
    if (!Number.isNaN(a) && t < a) return false;
  }
  if (before != null) {
    const b = Date.parse(before);
    // Include the whole "before" day.
    if (!Number.isNaN(b) && t > b + MS_PER_DAY - 1) return false;
  }
  return true;
}

function typeLabel(node: FSNode): string {
  return node.type === 'directory' ? 'File Folder' : 'File';
}

function folderOf(path: string): string {
  const cut = path.lastIndexOf('\\');
  return cut > 0 ? path.slice(0, cut) : 'C:\\';
}

/** Walks `root` and returns every node matching the criteria, with full paths. */
export function searchFiles(root: FSNode, criteria: SearchCriteria): SearchHit[] {
  const { name, text, minKB, maxKB, after, before } = criteria;
  const lowerText = text?.trim().toLowerCase() ?? '';
  const sizeActive = minKB != null || maxKB != null;
  const dateActive = after != null || before != null;
  const hits: SearchHit[] = [];

  const walk = (node: FSNode, path: string) => {
    for (const child of node.children ?? []) {
      const childPath = `${path}\\${child.name}`;
      const isFile = child.type === 'file';

      const nameOk = matchesName(child.name, name);
      const textOk = !lowerText || (isFile && (child.content ?? '').toLowerCase().includes(lowerText));
      const sizeOk = !sizeActive || (isFile && withinSize(child.size ?? 0, minKB, maxKB));
      const dateOk = !dateActive || withinDateModified(child.modified, after, before);

      if (nameOk && textOk && sizeOk && dateOk) {
        hits.push({ path: childPath, node: child });
      }
      if (child.type === 'directory') walk(child, childPath);
    }
  };

  walk(root, 'C:');
  return hits;
}

/** Returns a new array of hits sorted by the given column and direction. */
export function sortResults(hits: SearchHit[], key: SortKey, dir: SortDir): SearchHit[] {
  const factor = dir === 'asc' ? 1 : -1;
  const compare = (a: SearchHit, b: SearchHit): number => {
    switch (key) {
      case 'size':
        return (a.node.size ?? -1) - (b.node.size ?? -1);
      case 'modified':
        return (Date.parse(a.node.modified) || 0) - (Date.parse(b.node.modified) || 0);
      case 'folder':
        return folderOf(a.path).toLowerCase().localeCompare(folderOf(b.path).toLowerCase());
      case 'type':
        return typeLabel(a.node).localeCompare(typeLabel(b.node));
      case 'name':
      default:
        return a.node.name.toLowerCase().localeCompare(b.node.name.toLowerCase());
    }
  };
  // Stable tiebreak on name keeps equal rows from reshuffling between sorts.
  return [...hits].sort((a, b) => {
    const primary = compare(a, b);
    if (primary !== 0) return primary * factor;
    return a.node.name.toLowerCase().localeCompare(b.node.name.toLowerCase());
  });
}
