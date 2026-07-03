'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, ReactNode } from 'react';
import { FSNode } from '@/types/filesystem';
import { virtualFileSystem, getParentPath } from '@/lib/filesystem';
import {
  resolvePathIn,
  updateNodeAt,
  insertNode,
  removeNode,
  normalizePath,
  uniqueName,
} from '@/lib/fs/fsOperations';

const STORAGE_KEY = 'win98-fs-v1';
const STORAGE_VERSION = 1;

export type FSResult = { ok: true } | { ok: false; error: string };

export interface RecycleBinItem {
  id: string;
  originalPath: string;
  deletedAt: string;
  node: FSNode;
}

interface FSState {
  root: FSNode;
  recycleBin: RecycleBinItem[];
}

type FSAction =
  | { type: 'SET_ROOT'; payload: { root: FSNode } }
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

    case 'DELETE_TO_BIN': {
      const result = removeNode(state.root, action.payload.path);
      if (!result) return state;
      return {
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
        root: newRoot,
        recycleBin: state.recycleBin.filter((i) => i.id !== action.payload.id),
      };
    }

    case 'EMPTY_BIN':
      return { ...state, recycleBin: [] };

    case 'RESET':
      return { root: virtualFileSystem, recycleBin: [] };

    default:
      return state;
  }
}

function loadInitialState(): FSState {
  const fallback: FSState = { root: virtualFileSystem, recycleBin: [] };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== STORAGE_VERSION || !parsed?.root?.children) return fallback;
    return { root: parsed.root, recycleBin: parsed.recycleBin ?? [] };
  } catch {
    return fallback;
  }
}

export interface FileSystemContextType {
  root: FSNode;
  recycleBin: RecycleBinItem[];
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
          JSON.stringify({ version: STORAGE_VERSION, root: state.root, recycleBin: state.recycleBin }),
        );
      } catch {
        // quota exceeded or storage unavailable — non-fatal
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [state]);

  const api = useMemo<FileSystemContextType>(() => {
    const getNode = (path: string) => resolvePathIn(stateRef.current.root, path);

    const setRoot = (root: FSNode | null): FSResult => {
      if (!root) return { ok: false, error: 'The system cannot find the path specified.' };
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
        const existing = resolvePathIn(root, path);
        if (existing) {
          if (existing.type !== 'file') return { ok: false, error: 'Access is denied.' };
          const err = guardWritable(existing);
          if (err) return { ok: false, error: err };
          return setRoot(
            updateNodeAt(root, path, (n) => ({
              ...n,
              content,
              size: content.length,
              modified: today(),
            })),
          );
        }
        // Create new file at path
        const dirPath = getParentPath(path);
        const name = normalizePath(path).split('\\').pop()!;
        const dir = resolvePathIn(root, dirPath);
        if (!dir || dir.type !== 'directory') return { ok: false, error: 'The system cannot find the path specified.' };
        if (dir.readOnly) return { ok: false, error: 'Access is denied.' };
        return setRoot(
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
      },
      createFile: (dirPath, name, content = '') => {
        const root = stateRef.current.root;
        const dir = resolvePathIn(root, dirPath);
        if (!dir || dir.type !== 'directory') return { ok: false, error: 'The system cannot find the path specified.' };
        return setRoot(
          insertNode(root, dirPath, {
            name: uniqueName(dir, name),
            type: 'file',
            icon: '/icons/txt-16.svg',
            created: today(),
            modified: today(),
            size: content.length,
            content,
          }),
        );
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
    };
  }, [state]);

  return <FileSystemContext.Provider value={api}>{children}</FileSystemContext.Provider>;
}

export function useFileSystem() {
  const ctx = useContext(FileSystemContext);
  if (!ctx) throw new Error('useFileSystem must be used within FileSystemProvider');
  return ctx;
}
