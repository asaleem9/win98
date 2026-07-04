// Pure helpers for the MS-DOS prompt: tokenizing input, resolving paths
// against a current directory, formatting `dir /w` output, and matching
// Tab-completion candidates. Kept free of React/context so they're testable
// in isolation.

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
