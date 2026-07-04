import {
  tokenize,
  parseCommand,
  resolveDosPath,
  formatDirWide,
  matchCompletions,
  splitForCompletion,
  isAffirmative,
  planXcopyDir,
} from '../dosUtils';
import { FSNode } from '@/types/filesystem';

test('tokenize splits on whitespace and drops empties', () => {
  expect(tokenize('  dir   /w  ')).toEqual(['dir', '/w']);
});

test('parseCommand lowercases the command and keeps args', () => {
  const parsed = parseCommand('DIR /w');
  expect(parsed?.cmd).toBe('dir');
  expect(parsed?.args).toEqual(['/w']);
  expect(parsed?.rest).toBe('/w');
});

test('parseCommand returns null for blank input', () => {
  expect(parseCommand('   ')).toBeNull();
});

test('parseCommand treats cd.. as cd ..', () => {
  const parsed = parseCommand('cd..');
  expect(parsed?.cmd).toBe('cd');
  expect(parsed?.args).toEqual(['..']);
});

test('resolveDosPath resolves relative names against cwd', () => {
  expect(resolveDosPath('C:\\WINDOWS', 'System')).toBe('C:\\WINDOWS\\System');
});

test('resolveDosPath resolves .. one level up', () => {
  expect(resolveDosPath('C:\\WINDOWS\\System', '..')).toBe('C:\\WINDOWS');
});

test('resolveDosPath .. at drive root stays at root', () => {
  expect(resolveDosPath('C:\\WINDOWS', '..')).toBe('C:\\');
});

test('resolveDosPath treats absolute drive paths as-is', () => {
  expect(resolveDosPath('C:\\WINDOWS', 'C:\\Program Files')).toBe('C:\\Program Files');
});

test('resolveDosPath treats a leading backslash as drive-root relative', () => {
  expect(resolveDosPath('C:\\WINDOWS\\System', '\\Temp')).toBe('C:\\Temp');
});

test('resolveDosPath with empty arg returns cwd', () => {
  expect(resolveDosPath('C:\\WINDOWS', '')).toBe('C:\\WINDOWS');
});

test('formatDirWide lays out names in columns', () => {
  const lines = formatDirWide(
    [
      { name: 'AUTOEXEC.BAT', isDir: false },
      { name: 'WINDOWS', isDir: true },
      { name: 'CONFIG.SYS', isDir: false },
    ],
    2,
    16,
  );
  expect(lines).toEqual([
    'AUTOEXEC.BAT    [WINDOWS]',
    'CONFIG.SYS',
  ]);
});

test('matchCompletions filters case-insensitively by prefix', () => {
  expect(matchCompletions(['WINDOWS', 'Program Files', 'wallpaper.bmp'], 'w')).toEqual([
    'WINDOWS', 'wallpaper.bmp',
  ]);
});

test('splitForCompletion separates the trailing token from the rest', () => {
  expect(splitForCompletion('cd WIN')).toEqual({ prefix: 'cd ', partial: 'WIN' });
  expect(splitForCompletion('dir')).toEqual({ prefix: '', partial: 'dir' });
});

test('isAffirmative recognizes y/yes only', () => {
  expect(isAffirmative('y')).toBe(true);
  expect(isAffirmative('Y')).toBe(true);
  expect(isAffirmative(' yes ')).toBe(true);
  expect(isAffirmative('n')).toBe(false);
  expect(isAffirmative('')).toBe(false);
  expect(isAffirmative('yeah')).toBe(false);
});

describe('planXcopyDir', () => {
  const src: FSNode = {
    name: 'SRC',
    type: 'directory',
    created: '',
    modified: '',
    children: [
      { name: 'a.txt', type: 'file', created: '', modified: '', size: 1, content: 'A' },
      {
        name: 'nested',
        type: 'directory',
        created: '',
        modified: '',
        children: [{ name: 'b.txt', type: 'file', created: '', modified: '', size: 1, content: 'B' }],
      },
    ],
  };

  it('copies only immediate files without recursion', () => {
    const ops = planXcopyDir(src, 'C:\\DEST', false);
    expect(ops).toEqual([{ kind: 'file', parent: 'C:\\DEST', name: 'a.txt', content: 'A' }]);
  });

  it('recreates the tree (parents before children) with recursion', () => {
    const ops = planXcopyDir(src, 'C:\\DEST', true);
    expect(ops).toEqual([
      { kind: 'file', parent: 'C:\\DEST', name: 'a.txt', content: 'A' },
      { kind: 'folder', parent: 'C:\\DEST', name: 'nested', content: '' },
      { kind: 'file', parent: 'C:\\DEST\\nested', name: 'b.txt', content: 'B' },
    ]);
  });
});
