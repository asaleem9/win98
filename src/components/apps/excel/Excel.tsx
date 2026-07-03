'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { Dialog98 } from '@/components/ui/Dialog98';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { playSound } from '@/lib/sounds';
import { normalizePath } from '@/lib/fs/fsOperations';
import { FilePickerDialog } from '../notepad/FilePickerDialog';
import { evaluateFormula, cellKey, colLabel } from './formula';

const COLS = 26;
const ROWS = 30;
const COL_WIDTH = 64;
const ROW_HEIGHT = 20;
const ROW_HEADER_WIDTH = 40;

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
}

interface Sheet {
  name: string;
  cells: Record<string, string>;
  formats: Record<string, CellFormat>;
}

interface WorkbookFile {
  app: 'excel';
  version: 1;
  sheets: Sheet[];
  activeSheet: number;
}

function newSheet(name: string): Sheet {
  return { name, cells: {}, formats: {} };
}

function initialSheets(): Sheet[] {
  return [newSheet('Sheet1'), newSheet('Sheet2'), newSheet('Sheet3')];
}

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'Book1';
}

export default function Excel({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle, closeWindow } = useWindows();
  const { getNode, writeFile } = useFileSystem();

  const [sheets, setSheets] = useState<Sheet[]>(initialSheets);
  const [active, setActive] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number }>({ col: 0, row: 0 });
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('Book1');
  const [picker, setPicker] = useState<null | 'open' | 'save'>(null);
  const [readOnlyText, setReadOnlyText] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const sheet = sheets[active];
  const cells = sheet.cells;
  const formats = sheet.formats;

  useEffect(() => {
    updateTitle(windowId, `${fileName} - Microsoft Excel`);
  }, [fileName, windowId, updateTitle]);

  const getCellDisplayValue = useCallback(
    (key: string) => {
      const raw = cells[key];
      if (!raw) return '';
      if (raw.startsWith('=')) return evaluateFormula(raw, (k) => cells[k] || '', new Set([key]));
      return raw;
    },
    [cells],
  );

  const patchSheet = useCallback((updater: (s: Sheet) => Sheet) => {
    setSheets((prev) => prev.map((s, i) => (i === active ? updater(s) : s)));
  }, [active]);

  const setCellValue = useCallback((key: string, value: string) => {
    patchSheet((s) => {
      const nextCells = { ...s.cells };
      if (value === '') delete nextCells[key];
      else nextCells[key] = value;
      return { ...s, cells: nextCells };
    });
  }, [patchSheet]);

  const toggleFormat = useCallback((prop: keyof CellFormat) => {
    const key = cellKey(selectedCell.col, selectedCell.row);
    patchSheet((s) => {
      const current = s.formats[key] || {};
      return { ...s, formats: { ...s.formats, [key]: { ...current, [prop]: !current[prop] } } };
    });
  }, [selectedCell, patchSheet]);

  const handleCellClick = useCallback((col: number, row: number) => {
    if (editingCell) {
      setCellValue(editingCell, editValue);
      setEditingCell(null);
    }
    setSelectedCell({ col, row });
    setFormulaBarValue(cells[cellKey(col, row)] || '');
  }, [editingCell, editValue, cells, setCellValue]);

  const handleCellDoubleClick = useCallback((col: number, row: number) => {
    const key = cellKey(col, row);
    setEditingCell(key);
    setEditValue(cells[key] || '');
    setFormulaBarValue(cells[key] || '');
  }, [cells]);

  const commitEdit = useCallback(() => {
    if (editingCell) {
      setCellValue(editingCell, editValue);
      setFormulaBarValue(editValue);
      setEditingCell(null);
    }
  }, [editingCell, editValue, setCellValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        commitEdit();
        setSelectedCell((prev) => ({ ...prev, row: Math.min(prev.row + 1, ROWS - 1) }));
      } else if (e.key === 'Escape') {
        setEditingCell(null);
        setEditValue('');
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        setSelectedCell((prev) => ({ ...prev, col: Math.min(prev.col + 1, COLS - 1) }));
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
      setCellValue(cellKey(selectedCell.col, selectedCell.row), '');
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
      setSelectedCell((prev) => ({
        col: Math.max(0, Math.min(COLS - 1, prev.col + move.dc)),
        row: Math.max(0, Math.min(ROWS - 1, prev.row + move.dr)),
      }));
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const key = cellKey(selectedCell.col, selectedCell.row);
      setEditingCell(key);
      setEditValue(e.key);
    }
  }, [editingCell, selectedCell, cells, commitEdit, setCellValue]);

  useEffect(() => {
    const key = cellKey(selectedCell.col, selectedCell.row);
    setFormulaBarValue(cells[key] || '');
  }, [selectedCell, cells]);

  useEffect(() => {
    if (editingCell && inputRef.current) inputRef.current.focus();
  }, [editingCell]);

  const loadPath = useCallback((rawPath: string) => {
    const path = normalizePath(rawPath);
    const node = getNode(path);
    if (!node || node.type !== 'file') {
      showSystemError('Microsoft Excel', `Cannot find the ${baseName(path)} file.`);
      return;
    }
    const content = node.content ?? '';
    try {
      const parsed = JSON.parse(content) as WorkbookFile;
      if (parsed && parsed.app === 'excel' && Array.isArray(parsed.sheets)) {
        setSheets(parsed.sheets.length ? parsed.sheets : initialSheets());
        setActive(Math.min(parsed.activeSheet ?? 0, parsed.sheets.length - 1));
        setReadOnlyText(null);
        setFilePath(path);
        setFileName(baseName(path));
        addRecentDoc(path);
        return;
      }
      throw new Error('not our format');
    } catch {
      const shown = initialSheets();
      shown[0].cells['A1'] = content;
      setSheets(shown);
      setActive(0);
      setReadOnlyText(baseName(path));
      setFilePath(null);
      setFileName(baseName(path));
      addRecentDoc(path);
    }
  }, [getNode]);

  useEffect(() => {
    if (launchParams?.filePath) loadPath(launchParams.filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  const doSave = useCallback((path: string) => {
    const payload: WorkbookFile = { app: 'excel', version: 1, sheets, activeSheet: active };
    const result = writeFile(path, JSON.stringify(payload));
    if (!result.ok) {
      showSystemError('Microsoft Excel', result.error);
      return;
    }
    setFilePath(path);
    setFileName(baseName(path));
    setReadOnlyText(null);
    addRecentDoc(path);
    playSound('ding');
  }, [sheets, active, writeFile]);

  const handleSave = useCallback(() => {
    if (filePath) doSave(filePath);
    else setPicker('save');
  }, [filePath, doSave]);

  const handleNew = useCallback(() => {
    setSheets(initialSheets());
    setActive(0);
    setFilePath(null);
    setFileName('Book1');
    setReadOnlyText(null);
  }, []);

  const menus: MenuDefinition[] = [
    {
      label: 'File',
      items: [
        { label: 'New', onClick: handleNew },
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: () => setPicker('open') },
        { label: 'Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save As...', onClick: () => setPicker('save') },
        { label: '', separator: true },
        { label: 'Print...', shortcut: 'Ctrl+P', onClick: () => showSystemError('Microsoft Excel', 'There are no printers installed. To install a printer, use the Add Printer wizard in the Printers folder.') },
        { label: '', separator: true },
        { label: 'Exit', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Clear Contents', shortcut: 'Del', onClick: () => setCellValue(cellKey(selectedCell.col, selectedCell.row), '') },
        { label: 'Copy', shortcut: 'Ctrl+C', onClick: () => { const v = getCellDisplayValue(cellKey(selectedCell.col, selectedCell.row)); if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(v).catch(() => {}); } },
      ],
    },
    {
      label: 'Insert',
      items: [
        { label: 'Function...', onClick: () => showSystemError('Microsoft Excel', 'The Function Wizard is not available in this version.') },
        { label: 'Worksheet', disabled: true },
      ],
    },
    {
      label: 'Format',
      items: [
        { label: 'Bold', onClick: () => toggleFormat('bold') },
        { label: 'Italic', onClick: () => toggleFormat('italic') },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About Microsoft Excel', onClick: () => setShowAbout(true) }],
    },
  ];

  const selKey = cellKey(selectedCell.col, selectedCell.row);
  const selFmt = formats[selKey] || {};

  return (
    <div className="relative flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none" data-window-id={windowId} onKeyDown={handleKeyDown} tabIndex={0}>
      <MenuBar menus={menus} />

      {/* Toolbar */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="New" onClick={handleNew}>📄</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Open" onClick={() => setPicker('open')}>📂</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Save" onClick={handleSave}>💾</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className={`w-[23px] h-[22px] flex items-center justify-center border text-[11px] font-bold ${selFmt.bold ? 'border-t-[var(--win98-button-dark-shadow)] border-l-[var(--win98-button-dark-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] bg-[var(--win98-button-shadow)]/20' : 'border-transparent hover:win98-flat-raised'}`} title="Bold" onClick={() => toggleFormat('bold')}>B</button>
        <button className={`w-[23px] h-[22px] flex items-center justify-center border text-[11px] italic ${selFmt.italic ? 'border-t-[var(--win98-button-dark-shadow)] border-l-[var(--win98-button-dark-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] bg-[var(--win98-button-shadow)]/20' : 'border-transparent hover:win98-flat-raised'}`} title="Italic" onClick={() => toggleFormat('italic')}>I</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="AutoSum" onClick={() => { const key = cellKey(selectedCell.col, selectedCell.row); setEditingCell(key); setEditValue('=SUM()'); }}>Σ</button>
      </div>

      {/* Formula Bar */}
      <div className="flex items-center h-[22px] px-1 gap-1 border-b border-[var(--win98-button-shadow)]">
        <div className="win98-sunken bg-white h-[18px] w-[60px] flex items-center px-1 font-bold">{selKey}</div>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <input
          className="win98-sunken bg-white h-[18px] flex-1 flex items-center px-1 outline-none font-[family-name:var(--win98-font)] text-[11px]"
          value={editingCell ? editValue : formulaBarValue}
          onChange={(e) => {
            const key = editingCell ?? cellKey(selectedCell.col, selectedCell.row);
            if (!editingCell) setEditingCell(key);
            setEditValue(e.target.value);
            setFormulaBarValue(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { commitEdit(); e.stopPropagation(); }
          }}
        />
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto" ref={gridRef}>
        <div style={{ display: 'grid', gridTemplateColumns: `${ROW_HEADER_WIDTH}px repeat(${COLS}, ${COL_WIDTH}px)` }}>
          <div className="win98-raised h-[20px] flex items-center justify-center sticky top-0 left-0 z-20 bg-[var(--win98-button-face)]" />
          {Array.from({ length: COLS }, (_, c) => (
            <div key={c} className="win98-raised h-[20px] flex items-center justify-center sticky top-0 z-10 bg-[var(--win98-button-face)] text-[10px] font-bold">
              {colLabel(c)}
            </div>
          ))}

          {Array.from({ length: ROWS }, (_, r) => (
            <div key={`row-${r}`} className="contents">
              <div className="win98-raised h-[20px] flex items-center justify-center sticky left-0 z-10 bg-[var(--win98-button-face)] text-[10px] font-bold">
                {r + 1}
              </div>
              {Array.from({ length: COLS }, (_, c) => {
                const key = cellKey(c, r);
                const isSelected = selectedCell.col === c && selectedCell.row === r;
                const isEditing = editingCell === key;
                const fmt = formats[key] || {};
                return (
                  <div
                    key={key}
                    className={`border-r border-b border-[#c0c0c0] bg-white flex items-center px-[2px] text-[11px] cursor-cell ${
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
                        onChange={(e) => { setEditValue(e.target.value); setFormulaBarValue(e.target.value); }}
                      />
                    ) : (
                      <span className="truncate" style={{ fontWeight: fmt.bold ? 'bold' : undefined, fontStyle: fmt.italic ? 'italic' : undefined }}>
                        {getCellDisplayValue(key)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center h-[20px] border-t border-[var(--win98-button-highlight)]">
        <div className="flex items-center gap-0">
          <button className="win98-raised px-1 h-[16px] text-[9px] mx-[1px]" onClick={() => setActive((a) => Math.max(0, a - 1))}>◀</button>
          <button className="win98-raised px-1 h-[16px] text-[9px] mx-[1px]" onClick={() => setActive((a) => Math.min(sheets.length - 1, a + 1))}>▶</button>
        </div>
        <div className="flex ml-2">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => { if (editingCell) commitEdit(); setActive(i); }}
              className={`border border-[var(--win98-button-shadow)] px-3 h-[16px] flex items-center text-[10px] ${
                i === active ? 'bg-white font-bold' : 'bg-[var(--win98-button-face)]'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center h-[20px] px-1 border-t border-[var(--win98-button-highlight)]">
        <span className="win98-sunken px-2 py-0 flex-1">{readOnlyText ? `${readOnlyText} (read-only, unsupported format)` : 'Ready'}</span>
      </div>

      {picker && (
        <FilePickerDialog
          mode={picker}
          extensions={['xls']}
          defaultName={picker === 'save' ? (fileName.includes('.') ? fileName : `${fileName}.xls`) : ''}
          onCancel={() => setPicker(null)}
          onConfirm={(path) => {
            const target = picker;
            setPicker(null);
            if (target === 'open') loadPath(path);
            else doSave(path);
          }}
        />
      )}

      {showAbout && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
          <Dialog98
            title="About Microsoft Excel"
            icon="info"
            message={
              <div className="space-y-1">
                <p className="font-bold">Microsoft Excel 97</p>
                <p>Copyright (C) 1985-1997 Microsoft Corp.</p>
              </div>
            }
            buttons={[{ label: 'OK', default: true, onClick: () => setShowAbout(false) }]}
          />
        </div>
      )}
    </div>
  );
}
