import { FSNode } from '@/types/filesystem';

/**
 * Normalizes a path to canonical `C:\Foo\Bar` form: forward slashes converted,
 * duplicate/trailing backslashes stripped, drive letter uppercased.
 */
export function normalizePath(path: string): string {
  let p = path.replace(/\//g, '\\').replace(/\\+/g, '\\').replace(/\\+$/, '');
  if (/^c:$/i.test(p) || p === '') return 'C:\\';
  p = p.replace(/^c:/i, 'C:');
  if (!p.startsWith('C:')) p = `C:\\${p.replace(/^\\/, '')}`;
  return p;
}

function pathParts(path: string): string[] {
  return normalizePath(path).replace(/^C:\\?/, '').split('\\').filter(Boolean);
}

export function joinPath(dirPath: string, name: string): string {
  const dir = normalizePath(dirPath);
  return dir === 'C:\\' ? `C:\\${name}` : `${dir}\\${name}`;
}

/** Resolves a path against an arbitrary root (case-insensitive names). */
export function resolvePathIn(root: FSNode, path: string): FSNode | null {
  const parts = pathParts(path);
  let current = root;
  for (const part of parts) {
    if (current.type !== 'directory' || !current.children) return null;
    const child = current.children.find((c) => c.name.toLowerCase() === part.toLowerCase());
    if (!child) return null;
    current = child;
  }
  return current;
}

/**
 * Returns a new tree with the node at `path` replaced by `updater(node)`.
 * Only the spine of the tree is copied. Returns null if the path doesn't resolve.
 */
export function updateNodeAt(root: FSNode, path: string, updater: (n: FSNode) => FSNode): FSNode | null {
  const parts = pathParts(path);
  if (parts.length === 0) return updater(root);

  function walk(node: FSNode, depth: number): FSNode | null {
    if (node.type !== 'directory' || !node.children) return null;
    const idx = node.children.findIndex((c) => c.name.toLowerCase() === parts[depth].toLowerCase());
    if (idx === -1) return null;
    const child = node.children[idx];
    const newChild = depth === parts.length - 1 ? updater(child) : walk(child, depth + 1);
    if (newChild === null) return null;
    const children = [...node.children];
    children[idx] = newChild;
    return { ...node, children };
  }

  return walk(root, 0);
}

/**
 * Inserts `node` into the directory at `dirPath`. Returns the new root,
 * or null if the directory doesn't exist, isn't a directory, or already
 * contains an entry with the same name.
 */
export function insertNode(root: FSNode, dirPath: string, node: FSNode): FSNode | null {
  const dir = resolvePathIn(root, dirPath);
  if (!dir || dir.type !== 'directory') return null;
  if ((dir.children ?? []).some((c) => c.name.toLowerCase() === node.name.toLowerCase())) return null;
  return updateNodeAt(root, dirPath, (d) => ({ ...d, children: [...(d.children ?? []), node] }));
}

/**
 * Removes the node at `path`. Returns the new root plus the removed node,
 * or null if the path doesn't resolve (or is the root itself).
 */
export function removeNode(root: FSNode, path: string): { root: FSNode; removed: FSNode } | null {
  const parts = pathParts(path);
  if (parts.length === 0) return null;
  const target = resolvePathIn(root, path);
  if (!target) return null;

  const parentPath = parts.slice(0, -1).join('\\');
  const name = parts[parts.length - 1];
  const newRoot = updateNodeAt(root, parentPath ? `C:\\${parentPath}` : 'C:\\', (dir) => ({
    ...dir,
    children: (dir.children ?? []).filter((c) => c.name.toLowerCase() !== name.toLowerCase()),
  }));
  if (!newRoot) return null;
  return { root: newRoot, removed: target };
}

/**
 * Picks a name that doesn't collide in `dir`: "New Folder", "New Folder (2)", …
 * Preserves the extension for file names ("song.mp3" → "song (2).mp3").
 */
export function uniqueName(dir: FSNode, base: string): string {
  const existing = new Set((dir.children ?? []).map((c) => c.name.toLowerCase()));
  if (!existing.has(base.toLowerCase())) return base;

  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : '';
  for (let i = 2; ; i++) {
    const candidate = `${stem} (${i})${ext}`;
    if (!existing.has(candidate.toLowerCase())) return candidate;
  }
}
