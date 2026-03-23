'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';

type CellState = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

type Difficulty = 'beginner' | 'intermediate' | 'expert';
type Face = 'smile' | 'pressed' | 'dead' | 'cool';

const CONFIGS: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

const NUMBER_COLORS: Record<number, string> = {
  1: '#0000FF', 2: '#008000', 3: '#FF0000', 4: '#000080',
  5: '#800000', 6: '#008080', 7: '#000000', 8: '#808080',
};

function LEDDisplay({ value, width = 3 }: { value: number; width?: number }) {
  const str = String(Math.max(-99, Math.min(999, Math.round(value)))).padStart(width, '0');
  return (
    <div className="flex bg-black px-[2px] py-[1px] border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
      {str.split('').map((ch, i) => (
        <span key={i} className="text-[#FF0000] font-bold text-[18px] leading-none w-[11px] text-center font-[family-name:monospace]">
          {ch === '-' ? '-' : ch}
        </span>
      ))}
    </div>
  );
}

function createBoard(rows: number, cols: number, mines: number, safeR?: number, safeC?: number): CellState[][] {
  const board: CellState[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 })),
  );

  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (board[r][c].mine) continue;
    if (safeR !== undefined && safeC !== undefined && Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    board[r][c].mine = true;
    placed++;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++;
        }
      }
      board[r][c].adjacent = count;
    }
  }

  return board;
}

export default function Minesweeper({ windowId }: AppComponentProps) {
  const { resizeWindow } = useWindows();
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const config = CONFIGS[difficulty];
  const [board, setBoard] = useState<CellState[][]>(() => createBoard(config.rows, config.cols, config.mines));
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [face, setFace] = useState<Face>('smile');
  const [time, setTime] = useState(0);
  const [mouseDown, setMouseDown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flagCount = board.flat().filter((c) => c.flagged).length;

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => setTime((t) => Math.min(t + 1, 999)), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  const startNewGame = useCallback((diff?: Difficulty) => {
    const d = diff || difficulty;
    const c = CONFIGS[d];
    setBoard(createBoard(c.rows, c.cols, c.mines));
    setGameState('idle');
    setFace('smile');
    setTime(0);
    if (diff) {
      setDifficulty(diff);
      const cellSize = 16;
      const w = Math.max(200, c.cols * cellSize + 24 + 12);
      const h = c.rows * cellSize + 100;
      resizeWindow(windowId, w, h);
    }
  }, [difficulty, windowId, resizeWindow]);

  const checkWin = useCallback((b: CellState[][]) => {
    const allNonMinesRevealed = b.flat().every((c) => c.mine || c.revealed);
    if (allNonMinesRevealed) {
      setGameState('won');
      setFace('cool');
      // Auto-flag remaining mines
      setBoard((prev) =>
        prev.map((row) =>
          row.map((cell) => (cell.mine ? { ...cell, flagged: true } : cell)),
        ),
      );
    }
  }, []);

  const reveal = useCallback((b: CellState[][], r: number, c: number): CellState[][] => {
    const rows = b.length, cols = b[0].length;
    const newBoard = b.map((row) => row.map((cell) => ({ ...cell })));

    const stack = [[r, c]];
    while (stack.length > 0) {
      const [cr, cc] = stack.pop()!;
      if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) continue;
      if (newBoard[cr][cc].revealed || newBoard[cr][cc].flagged) continue;
      newBoard[cr][cc].revealed = true;
      if (newBoard[cr][cc].adjacent === 0 && !newBoard[cr][cc].mine) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            stack.push([cr + dr, cc + dc]);
          }
        }
      }
    }

    return newBoard;
  }, []);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (gameState === 'won' || gameState === 'lost') return;

    let currentBoard = board;
    if (gameState === 'idle') {
      currentBoard = createBoard(config.rows, config.cols, config.mines, r, c);
      setGameState('playing');
    }

    const cell = currentBoard[r][c];
    if (cell.revealed || cell.flagged) return;

    if (cell.mine) {
      // Reveal all mines
      const newBoard = currentBoard.map((row) =>
        row.map((cl) => (cl.mine ? { ...cl, revealed: true } : cl)),
      );
      setBoard(newBoard);
      setGameState('lost');
      setFace('dead');
      return;
    }

    const newBoard = reveal(currentBoard, r, c);
    setBoard(newBoard);
    checkWin(newBoard);
  }, [board, gameState, config, reveal, checkWin]);

  const handleRightClick = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameState === 'won' || gameState === 'lost') return;
    const cell = board[r][c];
    if (cell.revealed) return;
    setBoard((prev) => {
      const newBoard = prev.map((row) => row.map((cl) => ({ ...cl })));
      newBoard[r][c].flagged = !newBoard[r][c].flagged;
      return newBoard;
    });
  }, [board, gameState]);

  const menus: MenuDefinition[] = [
    {
      label: 'Game',
      items: [
        { label: 'New', shortcut: 'F2', onClick: () => startNewGame() },
        { label: '', separator: true },
        { label: 'Beginner', checked: difficulty === 'beginner', onClick: () => startNewGame('beginner') },
        { label: 'Intermediate', checked: difficulty === 'intermediate', onClick: () => startNewGame('intermediate') },
        { label: 'Expert', checked: difficulty === 'expert', onClick: () => startNewGame('expert') },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'About Minesweeper...', onClick: () => {} },
      ],
    },
  ];

  const FACE_MAP: Record<Face, string> = {
    smile: '🙂',
    pressed: '😮',
    dead: '💀',
    cool: '😎',
  };

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <MenuBar menus={menus} />

      <div className="flex flex-col items-center p-[6px] gap-[6px]">
        {/* Header: mine count, face, timer */}
        <div className="flex items-center justify-between w-full px-[4px] py-[3px] border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
          <LEDDisplay value={config.mines - flagCount} />
          <button
            onClick={() => startNewGame()}
            onMouseDown={() => setMouseDown(true)}
            onMouseUp={() => setMouseDown(false)}
            className="w-[26px] h-[26px] flex items-center justify-center text-[16px] leading-none cursor-default select-none border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] bg-[var(--win98-button-face)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]"
          >
            {FACE_MAP[face]}
          </button>
          <LEDDisplay value={time} />
        </div>

        {/* Game board */}
        <div
          className="border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]"
        >
          {board.map((row, r) => (
            <div key={r} className="flex">
              {row.map((cell, c) => (
                <button
                  key={c}
                  onClick={() => handleCellClick(r, c)}
                  onContextMenu={(e) => handleRightClick(e, r, c)}
                  onMouseDown={() => { if (gameState === 'playing' || gameState === 'idle') setFace('pressed'); }}
                  onMouseUp={() => { if (gameState === 'playing' || gameState === 'idle') setFace('smile'); }}
                  className={`w-[16px] h-[16px] text-[11px] font-bold leading-none flex items-center justify-center cursor-default select-none p-0 ${
                    cell.revealed
                      ? 'bg-[#C0C0C0] border-[0.5px] border-[#808080]'
                      : 'border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-shadow)] border-r-[var(--win98-button-shadow)] bg-[var(--win98-button-face)]'
                  }`}
                  style={cell.revealed && cell.adjacent > 0 ? { color: NUMBER_COLORS[cell.adjacent] } : undefined}
                >
                  {cell.revealed
                    ? cell.mine
                      ? '💣'
                      : cell.adjacent > 0
                        ? cell.adjacent
                        : ''
                    : cell.flagged
                      ? '🚩'
                      : ''}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
