'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { Dialog98 } from '@/components/ui/Dialog98';
import { Input98 } from '@/components/ui/Input98';
import { MineIcon, FlagIcon } from './icons';
import {
  Board,
  Difficulty,
  PRESET_CONFIGS,
  BoardConfig,
  createBoard,
  floodReveal,
  revealAllMines,
  flagAllMines,
  checkWin,
  chordReveal,
  cycleMark,
  validateCustomConfig,
  CUSTOM_LIMITS,
} from './logic';

const APP_ID = 'minesweeper';

type Face = 'smile' | 'pressed' | 'dead' | 'cool';
type GameStatus = 'idle' | 'playing' | 'won' | 'lost';
type ActiveDialog = 'none' | 'bestTimes' | 'nameEntry' | 'custom' | 'about';

const NUMBER_COLORS: Record<number, string> = {
  1: '#0000FF', 2: '#008000', 3: '#FF0000', 4: '#000080',
  5: '#800000', 6: '#008080', 7: '#000000', 8: '#808080',
};

const DIFFICULTY_LABELS: Record<'beginner' | 'intermediate' | 'expert', string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  expert: 'Expert',
};

interface BestTimeRecord {
  time: number;
  name: string;
}

type BestTimes = Partial<Record<'beginner' | 'intermediate' | 'expert', BestTimeRecord>>;

const DEFAULT_CUSTOM: BoardConfig = { rows: 16, cols: 16, mines: 40 };

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

const FACE_MAP: Record<Face, string> = {
  smile: '🙂',
  pressed: '😮',
  dead: '💀',
  cool: '😎',
};

export default function Minesweeper({ windowId }: AppComponentProps) {
  const { resizeWindow } = useWindows();
  const { getAppPref, setAppPref } = useSettings();

  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [customConfig, setCustomConfig] = useState<BoardConfig>(DEFAULT_CUSTOM);
  const config: BoardConfig = difficulty === 'custom' ? customConfig : PRESET_CONFIGS[difficulty];

  const [board, setBoard] = useState<Board>(() => createBoard(config.rows, config.cols, config.mines));
  const [gameState, setGameState] = useState<GameStatus>('idle');
  const [face, setFace] = useState<Face>('smile');
  const [time, setTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [marksEnabled, setMarksEnabledState] = useState(true);
  const [bestTimes, setBestTimesState] = useState<BestTimes>({});
  const [dialog, setDialog] = useState<ActiveDialog>('none');
  const [pendingRecord, setPendingRecord] = useState<{ difficulty: 'beginner' | 'intermediate' | 'expert'; time: number } | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [customWidth, setCustomWidth] = useState(String(DEFAULT_CUSTOM.cols));
  const [customHeight, setCustomHeight] = useState(String(DEFAULT_CUSTOM.rows));
  const [customMines, setCustomMines] = useState(String(DEFAULT_CUSTOM.mines));
  const [customError, setCustomError] = useState<string | null>(null);

  const chordPosRef = useRef<{ r: number; c: number } | null>(null);
  const suppressMarkRef = useRef(false);
  const [chordPos, setChordPos] = useState<{ r: number; c: number } | null>(null);

  // Load persisted prefs once on mount.
  useEffect(() => {
    setMarksEnabledState(getAppPref<boolean>(APP_ID, 'marksEnabled', true));
    setBestTimesState(getAppPref<BestTimes>(APP_ID, 'bestTimes', {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flagCount = board.flat().filter((c) => c.flagged).length;

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => setTime((t) => Math.min(t + 1, 999)), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  // Release any in-progress chord if the mouse buttons come up outside the board.
  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (chordPosRef.current) {
        chordPosRef.current = null;
        setChordPos(null);
        setFace((f) => (f === 'pressed' ? 'smile' : f));
      }
    };
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, []);

  const resizeForConfig = useCallback((c: BoardConfig) => {
    const cellSize = 16;
    const w = Math.max(200, c.cols * cellSize + 24 + 12);
    const h = c.rows * cellSize + 100;
    resizeWindow(windowId, w, h);
  }, [windowId, resizeWindow]);

  const startNewGame = useCallback((opts?: { difficulty?: Difficulty; custom?: BoardConfig }) => {
    const nextDifficulty = opts?.difficulty ?? difficulty;
    const nextConfig = nextDifficulty === 'custom'
      ? (opts?.custom ?? customConfig)
      : PRESET_CONFIGS[nextDifficulty as 'beginner' | 'intermediate' | 'expert'];

    setBoard(createBoard(nextConfig.rows, nextConfig.cols, nextConfig.mines));
    setGameState('idle');
    setFace('smile');
    setTime(0);
    chordPosRef.current = null;
    setChordPos(null);
    playSound('mineClick');

    if (opts?.custom) setCustomConfig(opts.custom);
    if (opts?.difficulty && opts.difficulty !== difficulty) {
      setDifficulty(opts.difficulty);
      resizeForConfig(nextConfig);
    } else if (opts?.custom) {
      resizeForConfig(opts.custom);
    }
  }, [difficulty, customConfig, resizeForConfig]);

  const recordWinIfBest = useCallback((finishTime: number) => {
    if (difficulty === 'custom') return;
    const d = difficulty;
    const existing = bestTimes[d];
    if (!existing || finishTime < existing.time) {
      setPendingRecord({ difficulty: d, time: finishTime });
      setNameInput('');
      setDialog('nameEntry');
    }
  }, [difficulty, bestTimes]);

  const finishGame = useCallback((newBoard: Board, finalTime: number) => {
    if (checkWin(newBoard)) {
      setBoard(flagAllMines(newBoard));
      setGameState('won');
      setFace('cool');
      playSound('mineWin');
      recordWinIfBest(finalTime);
    } else {
      setBoard(newBoard);
    }
  }, [recordWinIfBest]);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (gameState === 'won' || gameState === 'lost') return;

    let currentBoard = board;
    let currentTime = time;
    if (gameState === 'idle') {
      currentBoard = createBoard(config.rows, config.cols, config.mines, r, c);
      setGameState('playing');
      currentTime = 0;
    }

    const cell = currentBoard[r][c];
    if (cell.revealed || cell.flagged) return;

    if (cell.mine) {
      setBoard(revealAllMines(currentBoard));
      setGameState('lost');
      setFace('dead');
      playSound('mineExplosion');
      return;
    }

    const newBoard = floodReveal(currentBoard, r, c);
    finishGame(newBoard, currentTime);
  }, [board, gameState, config, time, finishGame]);

  const performChord = useCallback((r: number, c: number) => {
    if (gameState !== 'playing') return;
    const result = chordReveal(board, r, c);
    if (!result.changed) return;
    if (result.hitMine) {
      setBoard(revealAllMines(result.board));
      setGameState('lost');
      setFace('dead');
      playSound('mineExplosion');
      return;
    }
    finishGame(result.board, time);
  }, [board, gameState, time, finishGame]);

  const handleMark = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (chordPosRef.current) return;
    if (suppressMarkRef.current) {
      suppressMarkRef.current = false;
      return;
    }
    if (gameState === 'won' || gameState === 'lost') return;
    const cell = board[r][c];
    if (cell.revealed) return;
    setBoard((prev) => {
      const next = prev.map((row) => row.map((cl) => ({ ...cl })));
      next[r][c] = cycleMark(next[r][c], marksEnabled);
      return next;
    });
  }, [board, gameState, marksEnabled]);

  const handleCellMouseDown = useCallback((e: React.MouseEvent, r: number, c: number) => {
    suppressMarkRef.current = false;
    if (gameState === 'won' || gameState === 'lost') return;
    const bothDown = e.button === 1 || ((e.buttons & 1) === 1 && (e.buttons & 2) === 2);
    if (bothDown) {
      suppressMarkRef.current = true;
      chordPosRef.current = { r, c };
      setChordPos({ r, c });
      setFace('pressed');
      return;
    }
    if (e.button === 0) {
      setFace('pressed');
    }
  }, [gameState]);

  const handleCellMouseUp = useCallback((e: React.MouseEvent, r: number, c: number) => {
    if (gameState === 'won' || gameState === 'lost') {
      setFace((f) => (f === 'pressed' ? 'smile' : f));
      return;
    }
    const chording = chordPosRef.current;
    if (chording && chording.r === r && chording.c === c) {
      chordPosRef.current = null;
      setChordPos(null);
      setFace('smile');
      performChord(r, c);
      return;
    }
    if (chording) {
      chordPosRef.current = null;
      setChordPos(null);
    }
    if (e.button === 0) {
      setFace('smile');
      if (gameState === 'idle' || gameState === 'playing') handleCellClick(r, c);
    }
  }, [gameState, performChord, handleCellClick]);

  const setMarksEnabled = useCallback((v: boolean) => {
    setMarksEnabledState(v);
    setAppPref(APP_ID, 'marksEnabled', v);
  }, [setAppPref]);

  const confirmRecord = useCallback(() => {
    if (!pendingRecord) return;
    const name = nameInput.trim() || 'Anonymous';
    const next: BestTimes = { ...bestTimes, [pendingRecord.difficulty]: { time: pendingRecord.time, name } };
    setBestTimesState(next);
    setAppPref(APP_ID, 'bestTimes', next);
    setPendingRecord(null);
    setDialog('none');
  }, [pendingRecord, nameInput, bestTimes, setAppPref]);

  const resetScores = useCallback(() => {
    setBestTimesState({});
    setAppPref(APP_ID, 'bestTimes', {});
  }, [setAppPref]);

  const openCustomDialog = useCallback(() => {
    setCustomWidth(String(config.cols));
    setCustomHeight(String(config.rows));
    setCustomMines(String(config.mines));
    setCustomError(null);
    setDialog('custom');
  }, [config]);

  const applyCustomBoard = useCallback(() => {
    const width = parseInt(customWidth, 10);
    const height = parseInt(customHeight, 10);
    const mines = parseInt(customMines, 10);
    const error = validateCustomConfig(width, height, mines);
    if (error) {
      setCustomError(error);
      return;
    }
    setDialog('none');
    startNewGame({ difficulty: 'custom', custom: { rows: height, cols: width, mines } });
  }, [customWidth, customHeight, customMines, startNewGame]);

  const menus: MenuDefinition[] = [
    {
      label: 'Game',
      items: [
        { label: 'New', shortcut: 'F2', onClick: () => startNewGame() },
        { label: '', separator: true },
        { label: 'Beginner', checked: difficulty === 'beginner', onClick: () => startNewGame({ difficulty: 'beginner' }) },
        { label: 'Intermediate', checked: difficulty === 'intermediate', onClick: () => startNewGame({ difficulty: 'intermediate' }) },
        { label: 'Expert', checked: difficulty === 'expert', onClick: () => startNewGame({ difficulty: 'expert' }) },
        { label: 'Custom...', checked: difficulty === 'custom', onClick: openCustomDialog },
        { label: '', separator: true },
        { label: 'Marks (?)', checked: marksEnabled, onClick: () => setMarksEnabled(!marksEnabled) },
        { label: '', separator: true },
        { label: 'Best Times...', onClick: () => setDialog('bestTimes') },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'About Minesweeper...', onClick: () => setDialog('about') },
      ],
    },
  ];

  return (
    <div className="relative flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <MenuBar menus={menus} />

      <div className="flex flex-col items-center p-[6px] gap-[6px]">
        {/* Header: mine count, face, timer */}
        <div className="flex items-center justify-between w-full px-[4px] py-[3px] border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
          <LEDDisplay value={config.mines - flagCount} />
          <button
            onClick={() => startNewGame()}
            onMouseDown={() => setFace('pressed')}
            onMouseUp={() => setFace('smile')}
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
              {row.map((cell, c) => {
                const isChordTarget = !!chordPos && Math.abs(chordPos.r - r) <= 1 && Math.abs(chordPos.c - c) <= 1 && !cell.revealed && !cell.flagged;
                return (
                  <button
                    key={c}
                    onMouseDown={(e) => handleCellMouseDown(e, r, c)}
                    onMouseUp={(e) => handleCellMouseUp(e, r, c)}
                    onContextMenu={(e) => handleMark(e, r, c)}
                    className={`w-[16px] h-[16px] text-[11px] font-bold leading-none flex items-center justify-center cursor-default select-none p-0 ${
                      cell.revealed
                        ? 'bg-[#C0C0C0] border-[0.5px] border-[#808080]'
                        : isChordTarget
                          ? 'bg-[#BDBDBD] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-shadow)] border-r-[var(--win98-button-shadow)]'
                          : 'border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-shadow)] border-r-[var(--win98-button-shadow)] bg-[var(--win98-button-face)]'
                    }`}
                    style={cell.revealed && cell.adjacent > 0 && !cell.mine ? { color: NUMBER_COLORS[cell.adjacent] } : undefined}
                  >
                    {cell.revealed
                      ? cell.mine
                        ? <MineIcon />
                        : cell.adjacent > 0
                          ? cell.adjacent
                          : ''
                      : cell.flagged
                        ? <FlagIcon />
                        : cell.question
                          ? '?'
                          : ''}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {dialog === 'nameEntry' && pendingRecord && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
          <Dialog98
            title="New Best Time!"
            icon="info"
            message={
              <div className="flex flex-col gap-2 min-w-[220px]">
                <p>
                  You have the fastest time for {DIFFICULTY_LABELS[pendingRecord.difficulty]} ({pendingRecord.time} seconds).
                  Please enter your name:
                </p>
                <Input98
                  autoFocus
                  value={nameInput}
                  maxLength={24}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmRecord(); }}
                />
              </div>
            }
            buttons={[{ label: 'OK', onClick: confirmRecord, default: true }]}
          />
        </div>
      )}

      {dialog === 'bestTimes' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
          <Dialog98
            title="Fastest Mine Times"
            icon="info"
            message={
              <div className="flex flex-col gap-1 min-w-[220px]">
                {(['beginner', 'intermediate', 'expert'] as const).map((d) => {
                  const rec = bestTimes[d];
                  return (
                    <div key={d} className="flex justify-between gap-4">
                      <span>{DIFFICULTY_LABELS[d]}:</span>
                      <span>{rec ? `${rec.time} seconds  ${rec.name}` : 'no time yet'}</span>
                    </div>
                  );
                })}
              </div>
            }
            buttons={[
              { label: 'Reset Scores', onClick: resetScores },
              { label: 'OK', onClick: () => setDialog('none'), default: true },
            ]}
          />
        </div>
      )}

      {dialog === 'custom' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
          <Dialog98
            title="Custom Field"
            icon="question"
            message={
              <div className="flex flex-col gap-2 min-w-[220px]">
                <label className="flex items-center justify-between gap-2">
                  <span>Width ({CUSTOM_LIMITS.minWidth}-{CUSTOM_LIMITS.maxWidth}):</span>
                  <Input98 className="w-[60px]" value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span>Height ({CUSTOM_LIMITS.minHeight}-{CUSTOM_LIMITS.maxHeight}):</span>
                  <Input98 className="w-[60px]" value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} />
                </label>
                <label className="flex items-center justify-between gap-2">
                  <span>Mines:</span>
                  <Input98 className="w-[60px]" value={customMines} onChange={(e) => setCustomMines(e.target.value)} />
                </label>
                {customError && <p className="text-[#FF0000]">{customError}</p>}
              </div>
            }
            buttons={[
              { label: 'OK', onClick: applyCustomBoard, default: true },
              { label: 'Cancel', onClick: () => setDialog('none') },
            ]}
          />
        </div>
      )}

      {dialog === 'about' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
          <Dialog98
            title="About Minesweeper"
            icon="info"
            message={
              <div className="flex flex-col gap-1 min-w-[200px]">
                <p className="font-bold">Minesweeper</p>
                <p>Clear the field without detonating a mine.</p>
                <p>Left-click to reveal, right-click to flag. Hold both buttons (or middle-click) on a revealed number to chord-reveal its neighbors.</p>
              </div>
            }
            buttons={[{ label: 'OK', onClick: () => setDialog('none'), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
