import { FSNode } from '@/types/filesystem';
import { walkFsStats, buildBlockMap, percentFragmented, BLOCK_GRID_SIZE } from '../defragHelpers';

function makeRoot(children: FSNode[]): FSNode {
  return {
    name: 'C:',
    type: 'directory',
    created: '2026-01-01',
    modified: '2026-01-01',
    children,
  };
}

describe('walkFsStats', () => {
  it('counts files, bytes, and folders while excluding the root drive', () => {
    const root = makeRoot([
      { name: 'a.txt', type: 'file', created: '', modified: '', size: 100 },
      {
        name: 'Sub',
        type: 'directory',
        created: '',
        modified: '',
        children: [{ name: 'b.txt', type: 'file', created: '', modified: '', size: 50 }],
      },
    ]);

    const stats = walkFsStats(root);
    expect(stats.fileCount).toBe(2);
    expect(stats.totalBytes).toBe(150);
    expect(stats.folderCount).toBe(1);
  });

  it('falls back to content length when size is missing', () => {
    const root = makeRoot([{ name: 'a.txt', type: 'file', created: '', modified: '', content: 'hello' }]);
    expect(walkFsStats(root).totalBytes).toBe(5);
  });

  it('handles an empty drive', () => {
    const root = makeRoot([]);
    const stats = walkFsStats(root);
    expect(stats).toEqual({ fileCount: 0, totalBytes: 0, folderCount: 0 });
  });

  it('ignores shortcuts', () => {
    const root = makeRoot([{ name: 'link', type: 'shortcut', created: '', modified: '', target: 'C:\\x' }]);
    const stats = walkFsStats(root);
    expect(stats.fileCount).toBe(0);
    expect(stats.folderCount).toBe(0);
  });
});

describe('buildBlockMap', () => {
  it('returns exactly totalBlocks entries', () => {
    const root = makeRoot([{ name: 'a.txt', type: 'file', created: '', modified: '', size: 4096 }]);
    const blocks = buildBlockMap(root, 50);
    expect(blocks).toHaveLength(50);
  });

  it('defaults to the full grid size', () => {
    const root = makeRoot([]);
    expect(buildBlockMap(root)).toHaveLength(BLOCK_GRID_SIZE);
  });

  it('marks readOnly files as unmovable', () => {
    const root = makeRoot([{ name: 'io.sys', type: 'file', created: '', modified: '', size: 2048, readOnly: true }]);
    const blocks = buildBlockMap(root, 20);
    expect(blocks).toContain('unmovable');
    expect(blocks).not.toContain('used');
  });

  it('marks writable files as used and directories separately', () => {
    const root = makeRoot([
      {
        name: 'Sub',
        type: 'directory',
        created: '',
        modified: '',
        children: [{ name: 'a.txt', type: 'file', created: '', modified: '', size: 2048 }],
      },
    ]);
    const blocks = buildBlockMap(root, 20);
    expect(blocks).toContain('directory');
    expect(blocks).toContain('used');
  });

  it('fills remaining space with free blocks', () => {
    const root = makeRoot([]);
    const blocks = buildBlockMap(root, 10);
    expect(blocks.every((b) => b === 'free')).toBe(true);
  });

  it('never overflows totalBlocks even with many files', () => {
    const children: FSNode[] = Array.from({ length: 50 }, (_, i) => ({
      name: `f${i}.txt`,
      type: 'file' as const,
      created: '',
      modified: '',
      size: 20000,
    }));
    const root = makeRoot(children);
    const blocks = buildBlockMap(root, 30);
    expect(blocks).toHaveLength(30);
  });
});

describe('percentFragmented', () => {
  it('is deterministic for the same file count', () => {
    expect(percentFragmented(42)).toBe(percentFragmented(42));
  });

  it('stays within the 5-39 range', () => {
    for (const count of [0, 1, 5, 100, 3842, 999999]) {
      const pct = percentFragmented(count);
      expect(pct).toBeGreaterThanOrEqual(5);
      expect(pct).toBeLessThanOrEqual(39);
    }
  });

  it('can differ across different counts', () => {
    const values = new Set([0, 1, 2, 3, 4, 5, 6, 7].map(percentFragmented));
    expect(values.size).toBeGreaterThan(1);
  });
});
