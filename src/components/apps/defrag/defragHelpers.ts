import { FSNode } from '@/types/filesystem';
import { joinPath, normalizePath } from '@/lib/fs/fsOperations';

export type BlockType = 'free' | 'used' | 'unmovable' | 'directory' | 'fragmented';

export interface FsWalkStats {
  fileCount: number;
  totalBytes: number;
  folderCount: number;
}

/** Walks the tree from root, tallying files, bytes and folders. */
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
    // shortcuts are neither counted as files nor folders
  }

  visit(root);
  // Exclude the root itself from the folder count (it's the drive, not a folder within it)
  return { fileCount, totalBytes, folderCount: Math.max(0, folderCount - 1) };
}

const GRID_COLS = 28;
const GRID_ROWS = 16;
export const BLOCK_GRID_SIZE = GRID_COLS * GRID_ROWS;

/**
 * Builds a deterministic block map from the real filesystem tree. Each
 * file/folder contributes a run of blocks sized by its content; readOnly nodes
 * become "unmovable" system blocks, files whose recorded fragment count exceeds
 * one are painted "fragmented", and the remaining space is free.
 */
export function buildBlockMap(
  root: FSNode,
  fragments: Record<string, number> = {},
  totalBlocks: number = BLOCK_GRID_SIZE,
): BlockType[] {
  const blocks: BlockType[] = [];

  function blocksForSize(size: number): number {
    // roughly one block per 2KB, clamped so nothing is too greedy
    return Math.max(1, Math.min(6, Math.round(size / 2048) + 1));
  }

  function visit(node: FSNode, path: string, isRoot: boolean) {
    if (blocks.length >= totalBlocks) return;
    if (node.type === 'directory') {
      if (!isRoot) blocks.push('directory');
      for (const child of node.children ?? []) {
        if (blocks.length >= totalBlocks) break;
        visit(child, joinPath(path, child.name), false);
      }
    } else if (node.type === 'file') {
      const count = blocksForSize(node.size ?? node.content?.length ?? 0);
      const fragmented = (fragments[normalizePath(path)] ?? 1) > 1;
      const type: BlockType = node.readOnly ? 'unmovable' : fragmented ? 'fragmented' : 'used';
      for (let i = 0; i < count && blocks.length < totalBlocks; i++) {
        blocks.push(type);
      }
    }
  }

  visit(root, 'C:\\', true);

  while (blocks.length < totalBlocks) {
    blocks.push('free');
  }

  return blocks.slice(0, totalBlocks);
}
