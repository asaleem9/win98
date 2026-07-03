import { FSNode } from '@/types/filesystem';

export interface FsWalkStats {
  fileCount: number;
  totalBytes: number;
  folderCount: number;
}

/** Walks the tree from root, tallying files, bytes and folders (root itself excluded). */
export function walkFsStats(root: FSNode): FsWalkStats {
  let fileCount = 0;
  let totalBytes = 0;
  let folderCount = 0;

  function visit(node: FSNode) {
    if (node.type === 'directory') {
      folderCount++;
      for (const child of node.children ?? []) visit(child);
    } else if (node.type === 'file') {
      fileCount++;
      totalBytes += node.size ?? node.content?.length ?? 0;
    }
  }

  visit(root);
  return { fileCount, totalBytes, folderCount: Math.max(0, folderCount - 1) };
}

/** Formats a byte count with thousands separators the way the classic report did. */
export function formatBytes(bytes: number): string {
  return `${bytes.toLocaleString('en-US')} bytes`;
}

export interface ScanReportOptions {
  stats: FsWalkStats;
  scanType: 'standard' | 'thorough';
  badClusters: number;
  lostFragments: number;
}

/** Builds the classic ScanDisk report lines from real filesystem stats. */
export function buildScanReport({ stats, scanType, badClusters, lostFragments }: ScanReportOptions): string[] {
  const allocationUnit = 32768;
  const totalBytes = Math.max(stats.totalBytes, allocationUnit);
  const totalUnits = Math.ceil(totalBytes / allocationUnit) + 20000;
  const usedUnits = Math.ceil(totalBytes / allocationUnit);
  const availableUnits = Math.max(0, totalUnits - usedUnits);
  const availableBytes = availableUnits * allocationUnit;

  const errorsFound = lostFragments > 0 || (scanType === 'thorough' && badClusters > 0);
  const headline = errorsFound
    ? `ScanDisk found and fixed ${lostFragments + (scanType === 'thorough' ? badClusters : 0)} error(s) on this drive.`
    : 'ScanDisk did not find any errors on this drive.';

  const lines = [
    headline,
    '',
    `${formatBytes(totalUnits * allocationUnit)} total disk space`,
    `${formatBytes(scanType === 'thorough' ? badClusters * allocationUnit : 0)} in bad sectors`,
    `${formatBytes(stats.folderCount * allocationUnit)} in ${stats.folderCount.toLocaleString('en-US')} directories`,
    `${formatBytes(stats.totalBytes)} in ${stats.fileCount.toLocaleString('en-US')} user files`,
    `${formatBytes(availableBytes)} available on disk`,
    '',
    `${formatBytes(allocationUnit)} in each allocation unit`,
    `${totalUnits.toLocaleString('en-US')} total allocation units on disk`,
    `${availableUnits.toLocaleString('en-US')} available allocation units on disk`,
  ];

  if (scanType === 'thorough') {
    lines.push('');
    lines.push(
      badClusters > 0
        ? `Surface scan complete. ${badClusters} bad sector(s) found and marked.`
        : 'Surface scan complete. No bad sectors found.',
    );
  }

  return lines;
}

const SURFACE_COLS = 32;
const SURFACE_ROWS = 12;
export const SURFACE_GRID_SIZE = SURFACE_COLS * SURFACE_ROWS;

/**
 * Deterministic set of bad-cluster indices for the surface scan animation,
 * derived from the file count so results stay stable per disk state.
 */
export function badClusterIndices(fileCount: number, count: number): number[] {
  const seed = fileCount * 2654435761;
  const indices: number[] = [];
  let value = seed;
  for (let i = 0; i < count; i++) {
    value = (value * 1103515245 + 12345) % SURFACE_GRID_SIZE;
    indices.push(Math.abs(value) % SURFACE_GRID_SIZE);
  }
  return Array.from(new Set(indices));
}
