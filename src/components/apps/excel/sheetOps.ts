// Pure spreadsheet operations for the Excel clone: rectangular ranges, chart
// data extraction, sorting, TSV clipboard round-trips and number formatting.
// Kept UI-free so the logic can be unit tested without a grid or a canvas.

import { cellKey, colLabel } from './formula';

export type Cells = Record<string, string>;

export interface CellPos {
  col: number;
  row: number;
}

export interface CellRange {
  c1: number;
  r1: number;
  c2: number;
  r2: number;
}

export type ChartType = 'bar' | 'line';

export interface ChartObject {
  id: string;
  type: ChartType;
  x: number;
  y: number;
  w: number;
  h: number;
  range: CellRange;
  title: string;
}

export interface ChartSeries {
  name: string;
  values: number[];
}

export interface ChartData {
  labels: string[];
  series: ChartSeries[];
}

export type NumFmt = 'general' | 'fixed2' | 'percent' | 'currency';

/** Rectangle spanning two corners, with corners ordered so c1<=c2 and r1<=r2. */
export function normalizeRange(a: CellPos, b: CellPos): CellRange {
  return {
    c1: Math.min(a.col, b.col),
    r1: Math.min(a.row, b.row),
    c2: Math.max(a.col, b.col),
    r2: Math.max(a.row, b.row),
  };
}

/** Every cell position inside a range, row-major. */
export function rangeCells(range: CellRange): CellPos[] {
  const out: CellPos[] = [];
  for (let r = range.r1; r <= range.r2; r++) {
    for (let c = range.c1; c <= range.c2; c++) out.push({ col: c, row: r });
  }
  return out;
}

function looksNumeric(value: string): boolean {
  return value.trim() !== '' && !Number.isNaN(Number(value));
}

/**
 * Turn a selected range into chart-ready series. When the range is more than one
 * column wide and its first column carries non-numeric text, that column becomes
 * the category labels and the remaining columns become series. Otherwise every
 * column is a series and the rows are labelled 1..n. Values that don't parse as
 * numbers count as 0. `getDisplay` receives the evaluated (post-formula) text.
 */
export function buildChartData(
  range: CellRange,
  getDisplay: (col: number, row: number) => string,
): ChartData {
  const rows: number[] = [];
  for (let r = range.r1; r <= range.r2; r++) rows.push(r);
  const cols: number[] = [];
  for (let c = range.c1; c <= range.c2; c++) cols.push(c);

  const firstColVals = rows.map((r) => getDisplay(cols[0], r));
  const firstColIsLabels = cols.length > 1 && firstColVals.some((v) => v.trim() !== '' && !looksNumeric(v));

  const dataCols = firstColIsLabels ? cols.slice(1) : cols;
  const labels = rows.map((r, i) => (firstColIsLabels ? firstColVals[i] || String(i + 1) : String(i + 1)));

  const series: ChartSeries[] = dataCols.map((c) => ({
    name: colLabel(c),
    values: rows.map((r) => {
      const n = Number(getDisplay(c, r));
      return Number.isFinite(n) ? n : 0;
    }),
  }));

  return { labels, series };
}

/**
 * Sort the rows of a range by the value in its first column, carrying every
 * column in the range along with each row. Numeric first-column values sort
 * numerically; otherwise they sort as text. Returns a new cells map.
 */
export function sortRangeBlock(
  cells: Cells,
  range: CellRange,
  dir: 'asc' | 'desc',
  getDisplay: (col: number, row: number) => string,
): Cells {
  const rows: number[] = [];
  for (let r = range.r1; r <= range.r2; r++) rows.push(r);
  const cols: number[] = [];
  for (let c = range.c1; c <= range.c2; c++) cols.push(c);

  const blocks = rows.map((r) => ({
    key: getDisplay(cols[0], r),
    values: cols.map((c) => cells[cellKey(c, r)]),
  }));

  const sorted = [...blocks].sort((a, b) => {
    const an = Number(a.key);
    const bn = Number(b.key);
    const bothNum = looksNumeric(a.key) && looksNumeric(b.key);
    const res = bothNum ? an - bn : a.key.localeCompare(b.key);
    return dir === 'asc' ? res : -res;
  });

  const next: Cells = { ...cells };
  rows.forEach((r, ri) => {
    cols.forEach((c, ci) => {
      const key = cellKey(c, r);
      const value = sorted[ri].values[ci];
      if (value === undefined || value === '') delete next[key];
      else next[key] = value;
    });
  });
  return next;
}

/** Serialize a range to tab-separated rows using the raw stored cell values. */
export function rangeToTsv(cells: Cells, range: CellRange): string {
  const lines: string[] = [];
  for (let r = range.r1; r <= range.r2; r++) {
    const row: string[] = [];
    for (let c = range.c1; c <= range.c2; c++) row.push(cells[cellKey(c, r)] ?? '');
    lines.push(row.join('\t'));
  }
  return lines.join('\n');
}

/** Parse pasted TSV into positioned cell writes anchored at the active cell. */
export function tsvToCellWrites(text: string, anchor: CellPos): { col: number; row: number; value: string }[] {
  const writes: { col: number; row: number; value: string }[] = [];
  text.replace(/\r/g, '').split('\n').forEach((line, ri) => {
    line.split('\t').forEach((value, ci) => {
      writes.push({ col: anchor.col + ci, row: anchor.row + ri, value });
    });
  });
  return writes;
}

/** Apply an Excel-style display format to an already-evaluated cell value. */
export function formatCellValue(display: string, fmt?: NumFmt): string {
  if (!fmt || fmt === 'general') return display;
  const n = Number(display);
  if (display.trim() === '' || Number.isNaN(n)) return display;
  switch (fmt) {
    case 'fixed2':
      return n.toFixed(2);
    case 'percent':
      return `${(n * 100).toFixed(0)}%`;
    case 'currency':
      return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    default:
      return display;
  }
}

let chartCounter = 0;

/** Fresh, collision-free chart id. */
export function nextChartId(): string {
  chartCounter += 1;
  return `chart-${chartCounter}`;
}
