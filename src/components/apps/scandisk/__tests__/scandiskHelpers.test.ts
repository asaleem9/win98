import { FSNode } from '@/types/filesystem';
import { walkFsStats, buildScanReport, badClusterIndices, formatBytes, SURFACE_GRID_SIZE } from '../scandiskHelpers';

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
  it('counts files, bytes, and folders excluding root', () => {
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
    expect(stats).toEqual({ fileCount: 2, totalBytes: 150, folderCount: 1 });
  });

  it('handles an empty drive', () => {
    expect(walkFsStats(makeRoot([]))).toEqual({ fileCount: 0, totalBytes: 0, folderCount: 0 });
  });
});

describe('formatBytes', () => {
  it('adds thousands separators', () => {
    expect(formatBytes(1234567)).toBe('1,234,567 bytes');
  });

  it('handles zero', () => {
    expect(formatBytes(0)).toBe('0 bytes');
  });
});

describe('buildScanReport', () => {
  const stats = { fileCount: 10, totalBytes: 20000, folderCount: 3 };

  it('reports no errors for a clean standard scan', () => {
    const lines = buildScanReport({ stats, scanType: 'standard', badClusters: 0, lostFragments: 0 });
    expect(lines[0]).toBe('ScanDisk did not find any errors on this drive.');
    expect(lines.some((l) => l.includes('10 user files'))).toBe(true);
    expect(lines.some((l) => l.includes('3 directories'))).toBe(true);
  });

  it('reports fixed errors when lost fragments were found', () => {
    const lines = buildScanReport({ stats, scanType: 'standard', badClusters: 0, lostFragments: 2 });
    expect(lines[0]).toContain('found and fixed');
  });

  it('includes a surface scan summary line for thorough scans', () => {
    const lines = buildScanReport({ stats, scanType: 'thorough', badClusters: 2, lostFragments: 0 });
    expect(lines[0]).toContain('found and fixed');
    expect(lines[lines.length - 1]).toContain('bad sector(s) found and marked');
  });

  it('does not add a surface scan line for standard scans', () => {
    const lines = buildScanReport({ stats, scanType: 'standard', badClusters: 0, lostFragments: 0 });
    expect(lines.some((l) => l.includes('Surface scan'))).toBe(false);
  });
});

describe('badClusterIndices', () => {
  it('is deterministic for the same file count', () => {
    expect(badClusterIndices(42, 2)).toEqual(badClusterIndices(42, 2));
  });

  it('returns indices within the grid bounds', () => {
    const indices = badClusterIndices(7, 3);
    for (const idx of indices) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(SURFACE_GRID_SIZE);
    }
  });

  it('returns no more than requested count (dedup allowed)', () => {
    expect(badClusterIndices(1, 2).length).toBeLessThanOrEqual(2);
  });
});
