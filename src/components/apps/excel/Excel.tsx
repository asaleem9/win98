'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { standardHelpMenu } from '@/lib/menus';
import { usePrint } from '@/components/dialogs/PrintDialog';
import type { PrintContent } from '@/lib/print/types';
import { setClipboard, getClipboard, subscribe, readSystemText } from '@/lib/clipboard';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { playSound } from '@/lib/sounds';
import { normalizePath } from '@/lib/fs/fsOperations';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { evaluateFormula, cellKey, colLabel } from './formula';
import {
  CellPos,
  ChartData,
  ChartObject,
  ChartType,
  NumFmt,
  buildChartData,
  formatCellValue,
  nextChartId,
  normalizeRange,
  rangeCells,
  rangeToTsv,
  sortRangeBlock,
  tsvToCellWrites,
} from './sheetOps';

const COLS = 26;
const ROWS = 30;
const COL_WIDTH = 64;
const ROW_HEIGHT = 20;
const ROW_HEADER_WIDTH = 40;

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  numFmt?: NumFmt;
}

interface Sheet {
  name: string;
  cells: Record<string, string>;
  formats: Record<string, CellFormat>;
  charts: ChartObject[];
}

interface WorkbookFile {
  app: 'excel';
  version: 1;
  sheets: Sheet[];
  activeSheet: number;
}

function newSheet(name: string): Sheet {
  return { name, cells: {}, formats: {}, charts: [] };
}

function initialSheets(): Sheet[] {
  return [newSheet('Sheet1'), newSheet('Sheet2'), newSheet('Sheet3')];
}

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'Book1';
}

/** Evaluate a cell against a specific cells map (used by sort + charts + print). */
function evaluateAt(cells: Record<string, string>, col: number, row: number): string {
  const key = cellKey(col, row);
  const raw = cells[key];
  if (!raw) return '';
  if (raw.startsWith('=')) return evaluateFormula(raw, (k) => cells[k] || '', new Set([key]));
  return raw;
}

const SERIES_COLORS = ['#000080', '#008000', '#800000', '#808000', '#008080'];

function drawChart(canvas: HTMLCanvasElement | null, data: ChartData, type: ChartType) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const pad = { l: 28, r: 8, t: 8, b: 18 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const all = data.series.flatMap((s) => s.values);
  const max = Math.max(1, ...all.map((v) => Math.abs(v)));
  const n = Math.max(1, data.labels.length);

  ctx.strokeStyle = '#808080';
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + plotH);
  ctx.lineTo(pad.l + plotW, pad.t + plotH);
  ctx.stroke();

  if (type === 'bar') {
    const groupW = plotW / n;
    const seriesCount = Math.max(1, data.series.length);
    const barW = Math.max(1, (groupW * 0.7) / seriesCount);
    data.series.forEach((series, si) => {
      ctx.fillStyle = SERIES_COLORS[si % SERIES_COLORS.length];
      series.values.forEach((v, i) => {
        const h = (Math.abs(v) / max) * plotH;
        const x = pad.l + i * groupW + groupW * 0.15 + si * barW;
        ctx.fillRect(x, pad.t + plotH - h, barW, h);
      });
    });
  } else {
    data.series.forEach((series, si) => {
      ctx.strokeStyle = SERIES_COLORS[si % SERIES_COLORS.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      series.values.forEach((v, i) => {
        const x = pad.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
        const y = pad.t + plotH - (Math.abs(v) / max) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    ctx.lineWidth = 1;
  }
}

function ChartFrame({
  chart,
  data,
  onMove,
  onSetType,
  onRemove,
}: {
  chart: ChartObject;
  data: ChartData;
  onMove: (x: number, y: number) => void;
  onSetType: (type: ChartType) => void;
  onRemove: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    drawChart(canvasRef.current, data, chart.type);
  }, [data, chart.type, chart.w, chart.h]);

  const onDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: chart.x, oy: chart.y };
  };
  const onMoveP = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    onMove(Math.max(0, d.ox + e.clientX - d.sx), Math.max(0, d.oy + e.clientY - d.sy));
  };
  const onUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      className="absolute win98-raised bg-[var(--win98-button-face)] shadow-md z-[30]"
      style={{ left: chart.x, top: chart.y, width: chart.w, height: chart.h }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center h-[16px] px-1 bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white text-[10px] cursor-move select-none"
        onPointerDown={onDown}
        onPointerMove={onMoveP}
        onPointerUp={onUp}
      >
        <span className="flex-1 truncate">{chart.title}</span>
        <button className="px-1 leading-none" title="Bar chart" onClick={() => onSetType('bar')}>▮</button>
        <button className="px-1 leading-none" title="Line chart" onClick={() => onSetType('line')}>╱</button>
        <button className="px-1 leading-none" title="Delete chart" onClick={onRemove}>✕</button>
      </div>
      <canvas ref={canvasRef} width={chart.w} height={Math.max(1, chart.h - 16)} className="block bg-white" />
    </div>
  );
}

export default function Excel({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle, closeWindow } = useWindows();
  const { getNode, writeFile } = useFileSystem();
  const { openPrint, printDialog } = usePrint(windowId, 'Microsoft Excel');

  const [sheets, setSheets] = useState<Sheet[]>(initialSheets);
  const [active, setActive] = useState(0);
  const [selectedCell, setSelectedCell] = useState<CellPos>({ col: 0, row: 0 });
  const [selectionEnd, setSelectionEnd] = useState<CellPos>({ col: 0, row: 0 });
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('Book1');
  const [picker, setPicker] = useState<null | 'open' | 'save'>(null);
  const [readOnlyText, setReadOnlyText] = useState<string | null>(null);
  const [canPaste, setCanPaste] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const sheet = sheets[active];
  const cells = sheet.cells;
  const formats = sheet.formats;
  const charts = sheet.charts;
  const range = normalizeRange(selectedCell, selectionEnd);

  useEffect(() => {
    updateTitle(windowId, `${fileName} - Microsoft Excel`);
  }, [fileName, windowId, updateTitle]);

  // Keep Paste enabled state in sync with the shared clipboard.
  useEffect(() => {
    const update = () => setCanPaste(getClipboard()?.kind === 'text');
    update();
    return subscribe(update);
  }, []);

  const getCellDisplayValue = useCallback(
    (key: string) => {
      const raw = cells[key];
      if (!raw) return '';
      const evaluated = raw.startsWith('=') ? evaluateFormula(raw, (k) => cells[k] || '', new Set([key])) : raw;
      return formatCellValue(evaluated, formats[key]?.numFmt);
    },
    [cells, formats],
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

  const toggleFormat = useCallback((prop: 'bold' | 'italic') => {
    patchSheet((s) => {
      const nextFormats = { ...s.formats };
      for (const p of rangeCells(range)) {
        const key = cellKey(p.col, p.row);
        const current = nextFormats[key] || {};
        nextFormats[key] = { ...current, [prop]: !current[prop] };
      }
      return { ...s, formats: nextFormats };
    });
  }, [range, patchSheet]);

  const applyNumFmt = useCallback((fmt: NumFmt) => {
    patchSheet((s) => {
      const nextFormats = { ...s.formats };
      for (const p of rangeCells(range)) {
        const key = cellKey(p.col, p.row);
        nextFormats[key] = { ...(nextFormats[key] || {}), numFmt: fmt === 'general' ? undefined : fmt };
      }
      return { ...s, formats: nextFormats };
    });
  }, [range, patchSheet]);

  const sortSelection = useCallback((dir: 'asc' | 'desc') => {
    patchSheet((s) => ({
      ...s,
      cells: sortRangeBlock(s.cells, normalizeRange(selectedCell, selectionEnd), dir, (c, r) => evaluateAt(s.cells, c, r)),
    }));
  }, [selectedCell, selectionEnd, patchSheet]);

  const selectSingle = useCallback((col: number, row: number) => {
    setSelectedCell({ col, row });
    setSelectionEnd({ col, row });
  }, []);

  const handleCellClick = useCallback((col: number, row: number, extend: boolean) => {
    if (editingCell) {
      setCellValue(editingCell, editValue);
      setEditingCell(null);
    }
    if (extend) {
      setSelectionEnd({ col, row });
    } else {
      selectSingle(col, row);
      setFormulaBarValue(cells[cellKey(col, row)] || '');
    }
  }, [editingCell, editValue, cells, setCellValue, selectSingle]);

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

  // --- clipboard (cells as TSV text) -----------------------------------------

  const handleCopy = useCallback(() => {
    setClipboard({ kind: 'text', text: rangeToTsv(cells, normalizeRange(selectedCell, selectionEnd)) });
  }, [cells, selectedCell, selectionEnd]);

  const handleCut = useCallback(() => {
    const r = normalizeRange(selectedCell, selectionEnd);
    setClipboard({ kind: 'text', text: rangeToTsv(cells, r) });
    patchSheet((s) => {
      const nextCells = { ...s.cells };
      for (const p of rangeCells(r)) delete nextCells[cellKey(p.col, p.row)];
      return { ...s, cells: nextCells };
    });
  }, [cells, selectedCell, selectionEnd, patchSheet]);

  const handlePaste = useCallback(async () => {
    const clip = getClipboard();
    const text = clip && clip.kind === 'text' ? clip.text : (await readSystemText()) ?? '';
    if (!text) return;
    const writes = tsvToCellWrites(text, selectedCell);
    patchSheet((s) => {
      const nextCells = { ...s.cells };
      for (const w of writes) {
        if (w.col < 0 || w.col >= COLS || w.row < 0 || w.row >= ROWS) continue;
        const key = cellKey(w.col, w.row);
        if (w.value === '') delete nextCells[key];
        else nextCells[key] = w.value;
      }
      return { ...s, cells: nextCells };
    });
  }, [selectedCell, patchSheet]);

  const selectAll = useCallback(() => {
    setSelectedCell({ col: 0, row: 0 });
    setSelectionEnd({ col: COLS - 1, row: ROWS - 1 });
  }, []);

  const clearSelection = useCallback(() => {
    const r = normalizeRange(selectedCell, selectionEnd);
    patchSheet((s) => {
      const nextCells = { ...s.cells };
      for (const p of rangeCells(r)) delete nextCells[cellKey(p.col, p.row)];
      return { ...s, cells: nextCells };
    });
    setFormulaBarValue('');
  }, [selectedCell, selectionEnd, patchSheet]);

  // --- charts ----------------------------------------------------------------

  const insertChart = useCallback((type: ChartType) => {
    patchSheet((s) => {
      const chart: ChartObject = {
        id: nextChartId(),
        type,
        x: 40,
        y: 30,
        w: 320,
        h: 220,
        range: normalizeRange(selectedCell, selectionEnd),
        title: `Chart ${s.charts.length + 1}`,
      };
      return { ...s, charts: [...s.charts, chart] };
    });
  }, [selectedCell, selectionEnd, patchSheet]);

  const updateChart = useCallback((id: string, patch: Partial<ChartObject>) => {
    patchSheet((s) => ({ ...s, charts: s.charts.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, [patchSheet]);

  const removeChart = useCallback((id: string) => {
    patchSheet((s) => ({ ...s, charts: s.charts.filter((c) => c.id !== id) }));
  }, [patchSheet]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        commitEdit();
        setSelectedCell((prev) => { const row = Math.min(prev.row + 1, ROWS - 1); setSelectionEnd({ col: prev.col, row }); return { col: prev.col, row }; });
      } else if (e.key === 'Escape') {
        setEditingCell(null);
        setEditValue('');
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        setSelectedCell((prev) => { const col = Math.min(prev.col + 1, COLS - 1); setSelectionEnd({ col, row: prev.row }); return { col, row: prev.row }; });
      }
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === 'c') { e.preventDefault(); handleCopy(); return; }
      if (k === 'x') { e.preventDefault(); handleCut(); return; }
      if (k === 'v') { e.preventDefault(); void handlePaste(); return; }
      if (k === 'a') { e.preventDefault(); selectAll(); return; }
    }

    if (e.key === 'Enter' || e.key === 'F2') {
      const key = cellKey(selectedCell.col, selectedCell.row);
      setEditingCell(key);
      setEditValue(cells[key] || '');
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      clearSelection();
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
      if (e.shiftKey && e.key !== 'Tab') {
        setSelectionEnd((prev) => ({
          col: Math.max(0, Math.min(COLS - 1, prev.col + move.dc)),
          row: Math.max(0, Math.min(ROWS - 1, prev.row + move.dr)),
        }));
      } else {
        setSelectedCell((prev) => {
          const next = {
            col: Math.max(0, Math.min(COLS - 1, prev.col + move.dc)),
            row: Math.max(0, Math.min(ROWS - 1, prev.row + move.dr)),
          };
          setSelectionEnd(next);
          return next;
        });
      }
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const key = cellKey(selectedCell.col, selectedCell.row);
      setEditingCell(key);
      setEditValue(e.key);
    }
  }, [editingCell, selectedCell, cells, commitEdit, handleCopy, handleCut, handlePaste, selectAll, clearSelection]);

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
        // Backfill fields that older .xls files may not carry (charts/formats).
        const loaded = parsed.sheets.length
          ? parsed.sheets.map((s) => ({ name: s.name, cells: s.cells ?? {}, formats: s.formats ?? {}, charts: s.charts ?? [] }))
          : initialSheets();
        setSheets(loaded);
        setActive(Math.min(parsed.activeSheet ?? 0, loaded.length - 1));
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
    selectSingle(0, 0);
    setFilePath(null);
    setFileName('Book1');
    setReadOnlyText(null);
  }, [selectSingle]);

  const getPrintContent = useCallback((): PrintContent => {
    let maxC = 0;
    let maxR = 0;
    for (const key of Object.keys(cells)) {
      const m = key.match(/^([A-Z])(\d+)$/);
      if (!m) continue;
      maxC = Math.max(maxC, m[1].charCodeAt(0) - 65);
      maxR = Math.max(maxR, parseInt(m[2], 10) - 1);
    }
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = '<table border="1" cellspacing="0" cellpadding="3" style="border-collapse:collapse;font-family:sans-serif;font-size:12px">';
    html += '<tr><th style="background:#c0c0c0"></th>';
    for (let c = 0; c <= maxC; c++) html += `<th style="background:#c0c0c0">${colLabel(c)}</th>`;
    html += '</tr>';
    for (let r = 0; r <= maxR; r++) {
      html += `<tr><th style="background:#c0c0c0">${r + 1}</th>`;
      for (let c = 0; c <= maxC; c++) {
        const key = cellKey(c, r);
        const fmt = formats[key] || {};
        const style = `${fmt.bold ? 'font-weight:bold;' : ''}${fmt.italic ? 'font-style:italic;' : ''}`;
        html += `<td style="${style}">${esc(getCellDisplayValue(key))}</td>`;
      }
      html += '</tr>';
    }
    html += '</table>';
    return { kind: 'html', html };
  }, [cells, formats, getCellDisplayValue]);

  const menus: MenuDefinition[] = [
    {
      label: '&File',
      items: [
        { label: '&New', shortcut: 'Ctrl+N', onClick: handleNew },
        { label: '&Open...', shortcut: 'Ctrl+O', onClick: () => setPicker('open') },
        { label: '&Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save &As...', onClick: () => setPicker('save') },
        { label: '', separator: true },
        { label: '&Print...', shortcut: 'Ctrl+P', onClick: () => openPrint(getPrintContent, fileName) },
        { label: '', separator: true },
        { label: 'E&xit', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: 'Cu&t', shortcut: 'Ctrl+X', onClick: handleCut },
        { label: '&Copy', shortcut: 'Ctrl+C', onClick: handleCopy },
        { label: '&Paste', shortcut: 'Ctrl+V', onClick: () => void handlePaste(), disabled: !canPaste },
        { label: '', separator: true },
        { label: 'Cle&ar Contents', shortcut: 'Del', onClick: clearSelection },
        { label: 'Select &All', shortcut: 'Ctrl+A', onClick: selectAll },
      ],
    },
    {
      label: '&Insert',
      items: [
        {
          label: '&Chart...',
          submenu: [
            { label: '&Bar Chart', onClick: () => insertChart('bar') },
            { label: '&Line Chart', onClick: () => insertChart('line') },
          ],
        },
        { label: '&Function...', onClick: () => showSystemError('Microsoft Excel', 'The Function Wizard is not available in this version.') },
        { label: '&Worksheet', disabled: true },
      ],
    },
    {
      label: 'F&ormat',
      items: [
        { label: '&Bold', onClick: () => toggleFormat('bold') },
        { label: '&Italic', onClick: () => toggleFormat('italic') },
        { label: '', separator: true },
        {
          label: '&Number',
          submenu: [
            { label: '&General', onClick: () => applyNumFmt('general') },
            { label: '&Number (0.00)', onClick: () => applyNumFmt('fixed2') },
            { label: '&Percent (%)', onClick: () => applyNumFmt('percent') },
            { label: '&Currency ($)', onClick: () => applyNumFmt('currency') },
          ],
        },
      ],
    },
    {
      label: '&Data',
      items: [
        { label: 'Sort &Ascending', onClick: () => sortSelection('asc') },
        { label: 'Sort &Descending', onClick: () => sortSelection('desc') },
      ],
    },
    standardHelpMenu('Excel'),
  ];

  const selKey = cellKey(selectedCell.col, selectedCell.row);
  const selFmt = formats[selKey] || {};
  const inRange = (c: number, r: number) => c >= range.c1 && c <= range.c2 && r >= range.r1 && r <= range.r2;

  return (
    <div className="relative flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none" data-window-id={windowId} onKeyDown={handleKeyDown} tabIndex={0}>
      <MenuBar menus={menus} windowId={windowId} />

      {/* Toolbar */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="New" onClick={handleNew}>📄</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Open" onClick={() => setPicker('open')}>📂</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Save" onClick={handleSave}>💾</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className={`w-[23px] h-[22px] flex items-center justify-center border text-[11px] font-bold ${selFmt.bold ? 'border-t-[var(--win98-button-dark-shadow)] border-l-[var(--win98-button-dark-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] bg-[var(--win98-button-shadow)]/20' : 'border-transparent hover:win98-flat-raised'}`} title="Bold" onClick={() => toggleFormat('bold')}>B</button>
        <button className={`w-[23px] h-[22px] flex items-center justify-center border text-[11px] italic ${selFmt.italic ? 'border-t-[var(--win98-button-dark-shadow)] border-l-[var(--win98-button-dark-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] bg-[var(--win98-button-shadow)]/20' : 'border-transparent hover:win98-flat-raised'}`} title="Italic" onClick={() => toggleFormat('italic')}>I</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Chart Wizard" onClick={() => insertChart('bar')}>📊</button>
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
        <div className="relative" style={{ width: 'max-content' }}>
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
                  const highlighted = inRange(c, r) && !isSelected;
                  return (
                    <div
                      key={key}
                      className={`border-r border-b border-[#c0c0c0] flex items-center px-[2px] text-[11px] cursor-cell ${
                        highlighted ? 'bg-[#e6effc]' : 'bg-white'
                      } ${isSelected ? 'outline outline-2 outline-[#000080] -outline-offset-1 z-[5]' : ''}`}
                      style={{ height: ROW_HEIGHT }}
                      onClick={(e) => handleCellClick(c, r, e.shiftKey)}
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

          {/* Floating chart objects */}
          {charts.map((chart) => (
            <ChartFrame
              key={chart.id}
              chart={chart}
              data={buildChartData(chart.range, (c, r) => evaluateAt(cells, c, r))}
              onMove={(x, y) => updateChart(chart.id, { x, y })}
              onSetType={(type) => updateChart(chart.id, { type })}
              onRemove={() => removeChart(chart.id)}
            />
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
              onClick={() => { if (editingCell) commitEdit(); setActive(i); selectSingle(0, 0); }}
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

      {printDialog}
    </div>
  );
}
