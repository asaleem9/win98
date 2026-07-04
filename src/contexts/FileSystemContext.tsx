'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, ReactNode } from 'react';
import { FSNode } from '@/types/filesystem';
import { virtualFileSystem, getParentPath, resolveNetworkPath } from '@/lib/filesystem';
import {
  resolvePathIn,
  updateNodeAt,
  insertNode,
  removeNode,
  normalizePath,
  uniqueName,
  joinPath,
} from '@/lib/fs/fsOperations';
import { emitFileWrite } from '@/lib/fs/writeEvents';

const STORAGE_KEY = 'win98-fs-v1';
// Kept at 1 so existing saved filesystems still load; the fragments map is an
// additive, optional field (absent in legacy payloads, defaulted to {}).
const STORAGE_VERSION = 1;

export type FSResult = { ok: true } | { ok: false; error: string };

export interface RecycleBinItem {
  id: string;
  originalPath: string;
  deletedAt: string;
  node: FSNode;
}

// --- fragmentation model ----------------------------------------------------
// Each written/created file accumulates a fragment count, keyed by its
// normalized path. The counts are only ever surfaced by ScanDisk / Defrag; the
// map is cleared wholesale when the drive is defragmented.

export interface FragmentationStats {
  files: number;
  fragmented: number;
  fragPercent: number;
}

/** Stable non-negative FNV-1a hash of a path, case-insensitive. */
export function hashPath(path: string): number {
  const p = normalizePath(path).toLowerCase();
  let h = 2166136261;
  for (let i = 0; i < p.length; i++) {
    h ^= p.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Initial fragment count when a file is first written: 1-4, seeded by path. */
export function seedFragments(path: string): number {
  return 1 + (hashPath(path) % 4);
}

/** Next fragment count on a subsequent write: grows by 1-3, seeded by path. */
export function nextFragments(path: string, current: number): number {
  return current + 1 + ((hashPath(path) + current) % 3);
}

/**
 * Real fragmentation figures for a filesystem tree. A file with no recorded
 * fragment count is treated as a single (contiguous) fragment.
 */
export function computeFragStats(root: FSNode, fragments: Record<string, number>): FragmentationStats {
  let files = 0;
  let fragmented = 0;
  const walk = (node: FSNode, path: string) => {
    if (node.type === 'directory') {
      for (const child of node.children ?? []) walk(child, joinPath(path, child.name));
    } else if (node.type === 'file') {
      files++;
      if ((fragments[normalizePath(path)] ?? 1) > 1) fragmented++;
    }
  };
  walk(root, 'C:\\');
  const fragPercent = files ? Math.round((fragmented / files) * 100) : 0;
  return { files, fragmented, fragPercent };
}

interface FSState {
  root: FSNode;
  recycleBin: RecycleBinItem[];
  fragments: Record<string, number>;
}

type FSAction =
  | { type: 'SET_ROOT'; payload: { root: FSNode } }
  | { type: 'SET_FRAGMENTS'; payload: { path: string; value: number } }
  | { type: 'CLEAR_FRAGMENTS' }
  | { type: 'DELETE_TO_BIN'; payload: { path: string; id: string; deletedAt: string } }
  | { type: 'RESTORE_FROM_BIN'; payload: { id: string } }
  | { type: 'EMPTY_BIN' }
  | { type: 'RESET' };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fsReducer(state: FSState, action: FSAction): FSState {
  switch (action.type) {
    case 'SET_ROOT':
      return { ...state, root: action.payload.root };

    case 'SET_FRAGMENTS':
      return {
        ...state,
        fragments: { ...state.fragments, [action.payload.path]: action.payload.value },
      };

    case 'CLEAR_FRAGMENTS':
      return { ...state, fragments: {} };

    case 'DELETE_TO_BIN': {
      const result = removeNode(state.root, action.payload.path);
      if (!result) return state;
      return {
        ...state,
        root: result.root,
        recycleBin: [
          ...state.recycleBin,
          {
            id: action.payload.id,
            originalPath: normalizePath(action.payload.path),
            deletedAt: action.payload.deletedAt,
            node: result.removed,
          },
        ],
      };
    }

    case 'RESTORE_FROM_BIN': {
      const item = state.recycleBin.find((i) => i.id === action.payload.id);
      if (!item) return state;
      const dirPath = getParentPath(item.originalPath);
      const dir = resolvePathIn(state.root, dirPath);
      if (!dir || dir.type !== 'directory') return state;
      const restored = { ...item.node, name: uniqueName(dir, item.node.name) };
      const newRoot = insertNode(state.root, dirPath, restored);
      if (!newRoot) return state;
      return {
        ...state,
        root: newRoot,
        recycleBin: state.recycleBin.filter((i) => i.id !== action.payload.id),
      };
    }

    case 'EMPTY_BIN':
      return { ...state, recycleBin: [] };

    case 'RESET':
      return { root: virtualFileSystem, recycleBin: [], fragments: {} };

    default:
      return state;
  }
}

function loadInitialState(): FSState {
  const fallback: FSState = { root: virtualFileSystem, recycleBin: [], fragments: {} };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== STORAGE_VERSION || !parsed?.root?.children) return fallback;
    // `fragments` is absent in legacy payloads — default it so old saves still load.
    return {
      root: parsed.root,
      recycleBin: parsed.recycleBin ?? [],
      fragments: parsed.fragments ?? {},
    };
  } catch {
    return fallback;
  }
}

export interface FileSystemContextType {
  root: FSNode;
  recycleBin: RecycleBinItem[];
  /** Per-file fragment counts keyed by normalized path (see the fragmentation model). */
  fragments: Record<string, number>;
  getNode: (path: string) => FSNode | null;
  listDir: (path: string) => FSNode[] | null;
  readFile: (path: string) => string | null;
  writeFile: (path: string, content: string) => FSResult;
  createFile: (dirPath: string, name: string, content?: string) => FSResult;
  createFolder: (dirPath: string, name: string) => FSResult;
  rename: (path: string, newName: string) => FSResult;
  move: (srcPath: string, destDirPath: string) => FSResult;
  deleteToRecycleBin: (path: string) => FSResult;
  restoreFromRecycleBin: (id: string) => FSResult;
  emptyRecycleBin: () => void;
  deletePermanently: (path: string) => FSResult;
  reset: () => void;
  getFragmentationStats: () => FragmentationStats;
  clearFragmentation: () => void;
}

const FileSystemContext = createContext<FileSystemContextType | null>(null);

let recycleIdCounter = 0;

export function FileSystemProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(fsReducer, undefined, loadInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Debounced persistence
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            version: STORAGE_VERSION,
            root: state.root,
            recycleBin: state.recycleBin,
            fragments: state.fragments,
          }),
        );
      } catch {
        // quota exceeded or storage unavailable — non-fatal
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [state]);

  const api = useMemo<FileSystemContextType>(() => {
    // Network Neighborhood shares live in a separate static tree outside the
    // C: root (see resolveNetworkPath); consult it first so network files open
    // through the normal readFile/openFile pipeline. C: paths fall through.
    const getNode = (path: string) => resolveNetworkPath(path) ?? resolvePathIn(stateRef.current.root, path);

    const setRoot = (root: FSNode | null): FSResult => {
      if (!root) return { ok: false, error: 'The system cannot find the path specified.' };
      // Keep the ref in step immediately, not at the next render — callers batch
      // mutations in one tick (create a folder then write into it, or write one
      // page per loop iteration) and each must see the tree the previous one
      // produced, or later dispatches clobber earlier ones.
      stateRef.current = { ...stateRef.current, root };
      dispatch({ type: 'SET_ROOT', payload: { root } });
      return { ok: true };
    };

    const guardWritable = (node: FSNode | null): string | null => {
      if (!node) return 'The system cannot find the file specified.';
      if (node.readOnly) return 'Access is denied.';
      return null;
    };

    return {
      root: state.root,
      recycleBin: state.recycleBin,
      fragments: state.fragments,
      getNode,
      listDir: (path) => {
        const node = getNode(path);
        return node?.type === 'directory' ? (node.children ?? []) : null;
      },
      readFile: (path) => {
        const node = getNode(path);
        return node?.type === 'file' ? (node.content ?? '') : null;
      },
      writeFile: (path, content) => {
        const root = stateRef.current.root;
        const norm = normalizePath(path);
        const existing = resolvePathIn(root, path);
        if (existing) {
          if (existing.type !== 'file') return { ok: false, error: 'Access is denied.' };
          const err = guardWritable(existing);
          if (err) return { ok: false, error: err };
          const res = setRoot(
            updateNodeAt(root, path, (n) => ({
              ...n,
              content,
              size: content.length,
              modified: today(),
            })),
          );
          if (res.ok) {
            const current = stateRef.current.fragments[norm] ?? 1;
            dispatch({ type: 'SET_FRAGMENTS', payload: { path: norm, value: nextFragments(norm, current) } });
            emitFileWrite(norm, content);
          }
          return res;
        }
        // Create new file at path
        const dirPath = getParentPath(path);
        const name = norm.split('\\').pop()!;
        const dir = resolvePathIn(root, dirPath);
        if (!dir || dir.type !== 'directory') return { ok: false, error: 'The system cannot find the path specified.' };
        if (dir.readOnly) return { ok: false, error: 'Access is denied.' };
        const res = setRoot(
          insertNode(root, dirPath, {
            name,
            type: 'file',
            icon: '/icons/txt-16.svg',
            created: today(),
            modified: today(),
            size: content.length,
            content,
          }),
        );
        if (res.ok) {
          dispatch({ type: 'SET_FRAGMENTS', payload: { path: norm, value: seedFragments(norm) } });
          emitFileWrite(norm, content);
        }
        return res;
      },
      createFile: (dirPath, name, content = '') => {
        const root = stateRef.current.root;
        const dir = resolvePathIn(root, dirPath);
        if (!dir || dir.type !== 'directory') return { ok: false, error: 'The system cannot find the path specified.' };
        const finalName = uniqueName(dir, name);
        const res = setRoot(
          insertNode(root, dirPath, {
            name: finalName,
            type: 'file',
            icon: '/icons/txt-16.svg',
            created: today(),
            modified: today(),
            size: content.length,
            content,
          }),
        );
        if (res.ok) {
          const norm = normalizePath(joinPath(dirPath, finalName));
          dispatch({ type: 'SET_FRAGMENTS', payload: { path: norm, value: seedFragments(norm) } });
          emitFileWrite(norm, content);
        }
        return res;
      },
      createFolder: (dirPath, name) => {
        const root = stateRef.current.root;
        const dir = resolvePathIn(root, dirPath);
        if (!dir || dir.type !== 'directory') return { ok: false, error: 'The system cannot find the path specified.' };
        return setRoot(
          insertNode(root, dirPath, {
            name: uniqueName(dir, name),
            type: 'directory',
            icon: '/icons/folder-16.svg',
            created: today(),
            modified: today(),
            children: [],
          }),
        );
      },
      rename: (path, newName) => {
        const root = stateRef.current.root;
        const node = resolvePathIn(root, path);
        const err = guardWritable(node);
        if (err) return { ok: false, error: err };
        if (!newName.trim() || /[\\/:*?"<>|]/.test(newName)) {
          return { ok: false, error: 'A filename cannot contain any of the following characters: \\ / : * ? " < > |' };
        }
        const parent = resolvePathIn(root, getParentPath(path));
        if (
          parent?.children?.some(
            (c) => c.name.toLowerCase() === newName.toLowerCase() && c.name.toLowerCase() !== node!.name.toLowerCase(),
          )
        ) {
          return { ok: false, error: 'A file with that name already exists.' };
        }
        return setRoot(updateNodeAt(root, path, (n) => ({ ...n, name: newName, modified: today() })));
      },
      move: (srcPath, destDirPath) => {
        const root = stateRef.current.root;
        const node = resolvePathIn(root, srcPath);
        const err = guardWritable(node);
        if (err) return { ok: false, error: err };
        const dest = resolvePathIn(root, destDirPath);
        if (!dest || dest.type !== 'directory') return { ok: false, error: 'The system cannot find the path specified.' };
        const normSrc = normalizePath(srcPath);
        const normDest = normalizePath(destDirPath);
        if (normDest === normSrc || normDest.startsWith(`${normSrc}\\`)) {
          return { ok: false, error: 'Cannot move a folder into itself.' };
        }
        if (normalizePath(getParentPath(srcPath)) === normDest) return { ok: true };
        const removed = removeNode(root, srcPath);
        if (!removed) return { ok: false, error: 'The system cannot find the file specified.' };
        const destAfter = resolvePathIn(removed.root, destDirPath)!;
        return setRoot(
          insertNode(removed.root, destDirPath, {
            ...removed.removed,
            name: uniqueName(destAfter, removed.removed.name),
          }),
        );
      },
      deleteToRecycleBin: (path) => {
        const node = resolvePathIn(stateRef.current.root, path);
        const err = guardWritable(node);
        if (err) return { ok: false, error: err };
        dispatch({
          type: 'DELETE_TO_BIN',
          payload: { path, id: `rb-${++recycleIdCounter}-${Date.now()}`, deletedAt: today() },
        });
        return { ok: true };
      },
      restoreFromRecycleBin: (id) => {
        if (!stateRef.current.recycleBin.some((i) => i.id === id)) {
          return { ok: false, error: 'Item not found in Recycle Bin.' };
        }
        dispatch({ type: 'RESTORE_FROM_BIN', payload: { id } });
        return { ok: true };
      },
      emptyRecycleBin: () => dispatch({ type: 'EMPTY_BIN' }),
      deletePermanently: (path) => {
        const root = stateRef.current.root;
        const node = resolvePathIn(root, path);
        const err = guardWritable(node);
        if (err) return { ok: false, error: err };
        const removed = removeNode(root, path);
        if (!removed) return { ok: false, error: 'The system cannot find the file specified.' };
        return setRoot(removed.root);
      },
      reset: () => dispatch({ type: 'RESET' }),
      getFragmentationStats: () => computeFragStats(stateRef.current.root, stateRef.current.fragments),
      clearFragmentation: () => dispatch({ type: 'CLEAR_FRAGMENTS' }),
    };
  }, [state]);

  return <FileSystemContext.Provider value={api}>{children}</FileSystemContext.Provider>;
}

export function useFileSystem() {
  const ctx = useContext(FileSystemContext);
  if (!ctx) throw new Error('useFileSystem must be used within FileSystemProvider');
  return ctx;
}
