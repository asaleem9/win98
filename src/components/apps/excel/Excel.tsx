'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppComponentProps } from '@/types/app';

const COLS = 26;
const ROWS = 30;
const COL_WIDTH = 64;
const ROW_HEIGHT = 20;
const ROW_HEADER_WIDTH = 40;

const MENU_ITEMS = ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Data', 'Window', 'Help'];

function colLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function cellKey(col: number, row: number): string {
  return `${colLabel(col)}${row + 1}`;
}

function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.match(/^([A-Z])(\d+)$/);
  if (!match) return null;
  return { col: match[1].charCodeAt(0) - 65, row: parseInt(match[2]) - 1 };
}

function parseRange(range: string): { col: number; row: number }[] {
  const [start, end] = range.split(':');
  const s = parseCellRef(start);
  const e = parseCellRef(end);
  if (!s || !e) return [];
  const cells: { col: number; row: number }[] = [];
  for (let c = Math.min(s.col, e.col); c <= Math.max(s.col, e.col); c++) {
    for (let r = Math.min(s.row, e.row); r <= Math.max(s.row, e.row); r++) {
      cells.push({ col: c, row: r });
    }
  }
  return cells;
}

export default function Excel({ windowId }: AppComponentProps) {
  const [cells, setCells] = useState<Record<string, string>>({});
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number }>({ col: 0, row: 0 });
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const getCellRawValue = useCallback((key: string) => cells[key] || '', [cells]);

  const evaluateFormula = useCallback((formula: string, visited: Set<string> = new Set()): string => {
    if (!formula.startsWith('=')) return formula;

    const expr = formula.substring(1).toUpperCase();

    // SUM function
    const sumMatch = expr.match(/^SUM\((.+)\)$/);
    if (sumMatch) {
      const arg = sumMatch[1];
      if (arg.includes(':')) {
        const rangeCells = parseRange(arg);
        let sum = 0;
        for (const c of rangeCells) {
          const k = cellKey(c.col, c.row);
          if (visited.has(k)) return '#REF!';
          const val = evaluateFormula(getCellRawValue(k), new Set([...visited, k]));
          const n = parseFloat(val);
          if (!isNaN(n)) sum += n;
        }
        return String(sum);
      }
    }

    // AVERAGE function
    const avgMatch = expr.match(/^AVERAGE\((.+)\)$/);
    if (avgMatch) {
      const arg = avgMatch[1];
      if (arg.includes(':')) {
        const rangeCells = parseRange(arg);
        let sum = 0;
        let count = 0;
        for (const c of rangeCells) {
          const k = cellKey(c.col, c.row);
          if (visited.has(k)) return '#REF!';
          const val = evaluateFormula(getCellRawValue(k), new Set([...visited, k]));
          const n = parseFloat(val);
          if (!isNaN(n)) { sum += n; count++; }
        }
        return count > 0 ? String(sum / count) : '#DIV/0!';
      }
    }

    // Simple arithmetic: replace cell references with values, then evaluate
    let replaced = expr.replace(/[A-Z]\d+/g, (ref) => {
      const parsed = parseCellRef(ref);
      if (!parsed) return '0';
      const k = cellKey(parsed.col, parsed.row);
      if (visited.has(k)) return '0';
      const val = evaluateFormula(getCellRawValue(k), new Set([...visited, k]));
      const n = parseFloat(val);
      return isNaN(n) ? '0' : String(n);
    });

    // Only allow safe characters: digits, operators, dots, parens, spaces
    if (/^[\d+\-*/().  ]+$/.test(replaced)) {
      try {
        const fn = new Function(`return (${replaced})`);
        const result = fn();
        if (typeof result === 'number') {
          return Number.isFinite(result) ? String(Math.round(result * 1e10) / 1e10) : '#DIV/0!';
        }
        return String(result);
      } catch {
        return '#VALUE!';
      }
    }

    return '#VALUE!';
  }, [getCellRawValue]);

  const getCellDisplayValue = useCallback((key: string) => {
    const raw = cells[key];
    if (!raw) return '';
    if (raw.startsWith('=')) {
      return evaluateFormula(raw, new Set([key]));
    }
    return raw;
  }, [cells, evaluateFormula]);

  const handleCellClick = useCallback((col: number, row: number) => {
    if (editingCell) {
      // Commit current edit
      setCells(prev => ({ ...prev, [editingCell]: editValue }));
      setEditingCell(null);
    }
    setSelectedCell({ col, row });
    const key = cellKey(col, row);
    setFormulaBarValue(cells[key] || '');
  }, [editingCell, editValue, cells]);

  const handleCellDoubleClick = useCallback((col: number, row: number) => {
    const key = cellKey(col, row);
    setEditingCell(key);
    setEditValue(cells[key] || '');
    setFormulaBarValue(cells[key] || '');
  }, [cells]);

  const commitEdit = useCallback(() => {
    if (editingCell) {
      setCells(prev => ({ ...prev, [editingCell]: editValue }));
      setFormulaBarValue(editValue);
      setEditingCell(null);
    }
  }, [editingCell, editValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        commitEdit();
        setSelectedCell(prev => ({ ...prev, row: Math.min(prev.row + 1, ROWS - 1) }));
      } else if (e.key === 'Escape') {
        setEditingCell(null);
        setEditValue('');
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        setSelectedCell(prev => ({ ...prev, col: Math.min(prev.col + 1, COLS - 1) }));
      }
      return;
    }

    if (e.key === 'Enter' || e.key === 'F2') {
      const key = cellKey(selectedCell.col, selectedCell.row);
      setEditingCell(key);
      setEditValue(cells[key] || '');
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const key = cellKey(selectedCell.col, selectedCell.row);
      setCells(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setFormulaBarValue('');
      return;
    }

    const moves: Record<string, { dc: number; dr: number }> = {
      ArrowUp: { dc: 0, dr: -1 },
      ArrowDown: { dc: 0, dr: 1 },
      ArrowLeft: { dc: -1, dr: 0 },
      ArrowRight: { dc: 1, dr: 0 },
      Tab: { dc: 1, dr: 0 },
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      setSelectedCell(prev => ({
        col: Math.max(0, Math.min(COLS - 1, prev.col + move.dc)),
        row: Math.max(0, Math.min(ROWS - 1, prev.row + move.dr)),
      }));
      return;
    }

    // Start typing to edit
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const key = cellKey(selectedCell.col, selectedCell.row);
      setEditingCell(key);
      setEditValue(e.key);
    }
  }, [editingCell, selectedCell, cells, commitEdit]);

  // Update formula bar when selection changes
  useEffect(() => {
    const key = cellKey(selectedCell.col, selectedCell.row);
    setFormulaBarValue(cells[key] || '');
  }, [selectedCell, cells]);

  // Focus input when editing
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none" data-window-id={windowId} onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Menu Bar */}
      <div className="flex items-center h-[20px] px-1 border-b border-[var(--win98-button-shadow)]">
        {MENU_ITEMS.map((item) => (
          <button key={item} className="px-2 h-[18px] hover:bg-[var(--win98-highlight)] hover:text-[var(--win98-highlight-text)]">
            {item}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">📄</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">📂</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">💾</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">✂</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">📋</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">Σ</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]">📊</button>
      </div>

      {/* Formula Bar */}
      <div className="flex items-center h-[22px] px-1 gap-1 border-b border-[var(--win98-button-shadow)]">
        <div className="win98-sunken bg-white h-[18px] w-[60px] flex items-center px-1 font-bold">
          {cellKey(selectedCell.col, selectedCell.row)}
        </div>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <div className="win98-sunken bg-white h-[18px] flex-1 flex items-center px-1">
          {formulaBarValue}
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto" ref={gridRef}>
        <div style={{ display: 'grid', gridTemplateColumns: `${ROW_HEADER_WIDTH}px repeat(${COLS}, ${COL_WIDTH}px)` }}>
          {/* Header row */}
          <div className="win98-raised h-[20px] flex items-center justify-center sticky top-0 left-0 z-20 bg-[var(--win98-button-face)]" />
          {Array.from({ length: COLS }, (_, c) => (
            <div key={c} className="win98-raised h-[20px] flex items-center justify-center sticky top-0 z-10 bg-[var(--win98-button-face)] text-[10px] font-bold">
              {colLabel(c)}
            </div>
          ))}

          {/* Data rows */}
          {Array.from({ length: ROWS }, (_, r) => (
            <>
              {/* Row header */}
              <div key={`rh-${r}`} className="win98-raised h-[20px] flex items-center justify-center sticky left-0 z-10 bg-[var(--win98-button-face)] text-[10px] font-bold">
                {r + 1}
              </div>
              {/* Cells */}
              {Array.from({ length: COLS }, (_, c) => {
                const key = cellKey(c, r);
                const isSelected = selectedCell.col === c && selectedCell.row === r;
                const isEditing = editingCell === key;

                return (
                  <div
                    key={key}
                    className={`h-[${ROW_HEIGHT}px] border-r border-b border-[#c0c0c0] bg-white flex items-center px-[2px] text-[11px] cursor-cell ${
                      isSelected ? 'outline outline-2 outline-[#000080] -outline-offset-1 z-[5]' : ''
                    }`}
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => handleCellClick(c, r)}
                    onDoubleClick={() => handleCellDoubleClick(c, r)}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        className="w-full h-full outline-none bg-white text-[11px] font-[family-name:var(--win98-font)]"
                        value={editValue}
                        onChange={(e) => {
                          setEditValue(e.target.value);
                          setFormulaBarValue(e.target.value);
                        }}
                      />
                    ) : (
                      <span className="truncate">{getCellDisplayValue(key)}</span>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center h-[20px] border-t border-[var(--win98-button-highlight)]">
        <div className="flex items-center gap-0">
          <button className="win98-raised px-1 h-[16px] text-[9px] mx-[1px]">◀</button>
          <button className="win98-raised px-1 h-[16px] text-[9px] mx-[1px]">▶</button>
        </div>
        <div className="flex ml-2">
          <div className="bg-white border border-[var(--win98-button-shadow)] px-3 h-[16px] flex items-center text-[10px] font-bold">Sheet1</div>
          <div className="bg-[var(--win98-button-face)] border border-[var(--win98-button-shadow)] px-3 h-[16px] flex items-center text-[10px]">Sheet2</div>
          <div className="bg-[var(--win98-button-face)] border border-[var(--win98-button-shadow)] px-3 h-[16px] flex items-center text-[10px]">Sheet3</div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center h-[20px] px-1 border-t border-[var(--win98-button-highlight)]">
        <span className="win98-sunken px-2 py-0 flex-1">Ready</span>
      </div>
    </div>
  );
}
