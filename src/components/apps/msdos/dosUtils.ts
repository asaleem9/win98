// Pure helpers for the MS-DOS prompt: tokenizing input, resolving paths
// against a current directory, formatting `dir /w` output, matching
// Tab-completion candidates, and planning an `xcopy` tree walk. Kept free of
// React/context so they're testable in isolation.

import type { FSNode } from '@/types/filesystem';

/** Splits a raw command line into whitespace-separated tokens. */
export function tokenize(rawCmd: string): string[] {
  return rawCmd.trim().split(/\s+/).filter(Boolean);
}

export interface ParsedCommand {
  cmd: string;
  args: string[];
  /** All arguments re-joined with single spaces — handy for commands that take one path-like argument. */
  rest: string;
  raw: string;
}

/** Parses a trimmed command line into a lowercased command name and its arguments. */
export function parseCommand(rawCmd: string): ParsedCommand | null {
  const trimmed = rawCmd.trim();
  if (!trimmed) return null;
  // `cd..` (no space) is DOS shorthand for `cd ..`
  const normalized = /^cd\.\./i.test(trimmed) ? trimmed.replace(/^cd/i, 'cd ') : trimmed;
  const parts = tokenize(normalized);
  const args = parts.slice(1);
  return { cmd: parts[0].toLowerCase(), args, rest: args.join(' '), raw: trimmed };
}

/** Resolves a possibly-relative path argument against the current directory into an absolute DOS path. */
export function resolveDosPath(cwd: string, arg: string): string {
  if (!arg) return cwd;
  if (/^[A-Za-z]:/.test(arg)) return arg.replace(/\\+$/, '') || arg;
  if (arg === '\\' || arg === '/') return 'C:\\';
  if (arg.startsWith('\\') || arg.startsWith('/')) return `C:${arg.replace(/\//g, '\\')}`;
  if (arg === '..') {
    const lastSlash = cwd.lastIndexOf('\\');
    if (lastSlash > 2) return cwd.substring(0, lastSlash);
    return 'C:\\';
  }
  const base = cwd === 'C:\\' ? 'C:' : cwd;
  return `${base}\\${arg.replace(/\//g, '\\')}`.replace(/\\+$/, '');
}

export interface DirEntry {
  name: string;
  isDir: boolean;
}

/** Formats directory entries the way `dir /w` does: names only, in columns. */
export function formatDirWide(entries: DirEntry[], columnsPerRow = 5, columnWidth = 15): string[] {
  const labels = entries.map((e) => (e.isDir ? `[${e.name}]` : e.name));
  const lines: string[] = [];
  for (let i = 0; i < labels.length; i += columnsPerRow) {
    const row = labels.slice(i, i + columnsPerRow);
    lines.push(row.map((label) => label.padEnd(columnWidth)).join('').trimEnd());
  }
  return lines;
}

/** True for a Y/YES confirmation answer (case-insensitive). */
export function isAffirmative(input: string): boolean {
  return /^y(es)?$/i.test(input.trim());
}

export interface XcopyOp {
  kind: 'folder' | 'file';
  /** Destination directory the entry is created in. */
  parent: string;
  name: string;
  content: string;
}

/**
 * Plans the ordered create-operations to copy the children of directory `src`
 * into `destDir`. Parents always precede their children so each op resolves
 * against a directory that already exists. With `recursive` false only the
 * immediate files are copied (subdirectories are skipped, like plain xcopy).
 */
export function planXcopyDir(src: FSNode, destDir: string, recursive: boolean): XcopyOp[] {
  const ops: XcopyOp[] = [];
  const join = (dir: string, name: string) => (dir === 'C:\\' ? `C:\\${name}` : `${dir}\\${name}`);
  const walk = (node: FSNode, dir: string) => {
    for (const child of node.children ?? []) {
      if (child.type === 'file') {
        ops.push({ kind: 'file', parent: dir, name: child.name, content: child.content ?? '' });
      } else if (child.type === 'directory' && recursive) {
        ops.push({ kind: 'folder', parent: dir, name: child.name, content: '' });
        walk(child, join(dir, child.name));
      }
    }
  };
  walk(src, destDir);
  return ops;
}

/** Returns candidate names in `names` that start with `partial` (case-insensitive). */
export function matchCompletions(names: string[], partial: string): string[] {
  const lower = partial.toLowerCase();
  return names.filter((n) => n.toLowerCase().startsWith(lower));
}

/**
 * Given the current input line, splits it into everything-but-the-last-token
 * and the last token (the part to complete), for Tab-completion.
 */
export function splitForCompletion(input: string): { prefix: string; partial: string } {
  const match = input.match(/^(.*\s)?(\S*)$/);
  if (!match) return { prefix: '', partial: input };
  return { prefix: match[1] ?? '', partial: match[2] ?? '' };
}
