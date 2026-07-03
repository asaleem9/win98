// Pure game logic for Minesweeper. No React, no DOM — safe to unit test.

export type Cell = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  question: boolean;
  adjacent: number;
};

export type Board = Cell[][];

export type Difficulty = 'beginner' | 'intermediate' | 'expert' | 'custom';

export interface BoardConfig {
  rows: number;
  cols: number;
  mines: number;
}

export const PRESET_CONFIGS: Record<'beginner' | 'intermediate' | 'expert', BoardConfig> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

export const CUSTOM_LIMITS = {
  minWidth: 9,
  maxWidth: 30,
  minHeight: 9,
  maxHeight: 24,
  minMines: 1,
};

function makeCell(): Cell {
  return { mine: false, revealed: false, flagged: false, question: false, adjacent: 0 };
}

export function createEmptyBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => makeCell()));
}

/** Fills in the `adjacent` mine-count for every non-mine cell. Mutates and returns the same board. */
export function computeAdjacents(board: Board): Board {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++;
        }
      }
      board[r][c].adjacent = count;
    }
  }
  return board;
}

/**
 * Builds a fresh board with `mines` placed randomly. If `safeR`/`safeC` are given, no mine is
 * placed in that cell or its 8 neighbors (first-click safety).
 */
export function createBoard(
  rows: number,
  cols: number,
  mines: number,
  safeR?: number,
  safeC?: number,
  rng: () => number = Math.random,
): Board {
  const board = createEmptyBoard(rows, cols);
  const totalCells = rows * cols;
  const maxMines = Math.max(0, Math.min(mines, totalCells - 1));

  let placed = 0;
  let attempts = 0;
  const maxAttempts = totalCells * 50 + 1000;
  while (placed < maxMines && attempts < maxAttempts) {
    attempts++;
    const r = Math.floor(rng() * rows);
    const c = Math.floor(rng() * cols);
    if (board[r][c].mine) continue;
    if (safeR !== undefined && safeC !== undefined && Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    board[r][c].mine = true;
    placed++;
  }

  return computeAdjacents(board);
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

/** Flood-fill reveal starting at (r, c). Returns a new board; does not touch flagged cells. */
export function floodReveal(board: Board, r: number, c: number): Board {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  const newBoard = cloneBoard(board);

  const stack: [number, number][] = [[r, c]];
  while (stack.length > 0) {
    const [cr, cc] = stack.pop()!;
    if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue;
    const cell = newBoard[cr][cc];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adjacent === 0 && !cell.mine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          stack.push([cr + dr, cc + dc]);
        }
      }
    }
  }

  return newBoard;
}

/** Reveals every mine on the board (used when the player loses). */
export function revealAllMines(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell.mine ? { ...cell, revealed: true } : cell)));
}

/** True once every non-mine cell has been revealed. */
export function checkWin(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell.mine || cell.revealed));
}

/** Auto-flags every mine (called on win, for display). */
export function flagAllMines(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell.mine ? { ...cell, flagged: true, question: false } : cell)));
}

function neighborsOf(board: Board, r: number, c: number): [number, number][] {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  const out: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc]);
    }
  }
  return out;
}

export function countAdjacentFlags(board: Board, r: number, c: number): number {
  return neighborsOf(board, r, c).filter(([nr, nc]) => board[nr][nc].flagged).length;
}

export interface ChordResult {
  board: Board;
  hitMine: boolean;
  changed: boolean;
}

/**
 * Chord-reveals the neighbors of a revealed numbered cell, if the adjacent flag count matches
 * the cell's number. Any unflagged mine among the neighbors triggers a loss (hitMine: true).
 */
export function chordReveal(board: Board, r: number, c: number): ChordResult {
  const cell = board[r][c];
  if (!cell.revealed || cell.mine || cell.adjacent === 0) {
    return { board, hitMine: false, changed: false };
  }

  const neighbors = neighborsOf(board, r, c);
  const flagCount = neighbors.filter(([nr, nc]) => board[nr][nc].flagged).length;
  if (flagCount !== cell.adjacent) {
    return { board, hitMine: false, changed: false };
  }

  let working = board;
  let hitMine = false;
  let changed = false;
  for (const [nr, nc] of neighbors) {
    const ncell = working[nr][nc];
    if (ncell.flagged || ncell.revealed) continue;
    if (ncell.mine) {
      hitMine = true;
      working = cloneBoard(working);
      working[nr][nc].revealed = true;
      changed = true;
    } else {
      working = floodReveal(working, nr, nc);
      changed = true;
    }
  }

  return { board: working, hitMine, changed };
}

/**
 * Cycles a covered cell's mark: flag -> question -> clear (when marksEnabled), or
 * flag -> clear (when marksEnabled is false). Revealed cells are returned unchanged.
 */
export function cycleMark(cell: Cell, marksEnabled: boolean): Cell {
  if (cell.revealed) return cell;
  if (!cell.flagged && !cell.question) {
    return { ...cell, flagged: true, question: false };
  }
  if (cell.flagged) {
    if (marksEnabled) return { ...cell, flagged: false, question: true };
    return { ...cell, flagged: false, question: false };
  }
  // cell.question is true
  return { ...cell, flagged: false, question: false };
}

export function validateCustomConfig(width: number, height: number, mines: number): string | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(mines)) {
    return 'Please enter valid numbers.';
  }
  if (!Number.isInteger(width) || width < CUSTOM_LIMITS.minWidth || width > CUSTOM_LIMITS.maxWidth) {
    return `Width must be between ${CUSTOM_LIMITS.minWidth} and ${CUSTOM_LIMITS.maxWidth}.`;
  }
  if (!Number.isInteger(height) || height < CUSTOM_LIMITS.minHeight || height > CUSTOM_LIMITS.maxHeight) {
    return `Height must be between ${CUSTOM_LIMITS.minHeight} and ${CUSTOM_LIMITS.maxHeight}.`;
  }
  if (!Number.isInteger(mines) || mines < CUSTOM_LIMITS.minMines) {
    return `Mines must be at least ${CUSTOM_LIMITS.minMines}.`;
  }
  if (mines >= width * height) {
    return 'Too many mines for the board size.';
  }
  return null;
}
