import {
  normalizeRange,
  rangeCells,
  buildChartData,
  sortRangeBlock,
  rangeToTsv,
  tsvToCellWrites,
  formatCellValue,
  Cells,
} from '../sheetOps';
import { cellKey } from '../formula';

describe('normalizeRange', () => {
  it('orders the two corners so c1<=c2 and r1<=r2', () => {
    expect(normalizeRange({ col: 2, row: 5 }, { col: 0, row: 1 })).toEqual({ c1: 0, r1: 1, c2: 2, r2: 5 });
  });

  it('rangeCells enumerates every cell row-major', () => {
    const cells = rangeCells({ c1: 0, r1: 0, c2: 1, r2: 1 });
    expect(cells).toHaveLength(4);
    expect(cells[0]).toEqual({ col: 0, row: 0 });
    expect(cells[3]).toEqual({ col: 1, row: 1 });
  });
});

describe('buildChartData', () => {
  const disp = (data: Record<string, string>) => (c: number, r: number) => data[cellKey(c, r)] ?? '';

  it('treats a non-numeric first column as category labels', () => {
    const data = { A1: 'Q1', B1: '10', A2: 'Q2', B2: '20' };
    const result = buildChartData({ c1: 0, r1: 0, c2: 1, r2: 1 }, disp(data));
    expect(result.labels).toEqual(['Q1', 'Q2']);
    expect(result.series).toHaveLength(1);
    expect(result.series[0].values).toEqual([10, 20]);
  });

  it('uses row numbers when the range is a single numeric column', () => {
    const data = { A1: '5', A2: '7' };
    const result = buildChartData({ c1: 0, r1: 0, c2: 0, r2: 1 }, disp(data));
    expect(result.labels).toEqual(['1', '2']);
    expect(result.series[0].values).toEqual([5, 7]);
  });

  it('coerces non-numeric data cells to 0', () => {
    const data = { A1: '3', A2: 'oops' };
    const result = buildChartData({ c1: 0, r1: 0, c2: 0, r2: 1 }, disp(data));
    expect(result.series[0].values).toEqual([3, 0]);
  });
});

describe('sortRangeBlock', () => {
  const disp = (cells: Cells) => (c: number, r: number) => cells[cellKey(c, r)] ?? '';

  it('sorts rows ascending by the first column, carrying the whole row', () => {
    const cells: Cells = { A1: '3', B1: 'c', A2: '1', B2: 'a', A3: '2', B3: 'b' };
    const sorted = sortRangeBlock(cells, { c1: 0, r1: 0, c2: 1, r2: 2 }, 'asc', disp(cells));
    expect([sorted.A1, sorted.A2, sorted.A3]).toEqual(['1', '2', '3']);
    expect([sorted.B1, sorted.B2, sorted.B3]).toEqual(['a', 'b', 'c']);
  });

  it('sorts descending', () => {
    const cells: Cells = { A1: '1', A2: '3', A3: '2' };
    const sorted = sortRangeBlock(cells, { c1: 0, r1: 0, c2: 0, r2: 2 }, 'desc', disp(cells));
    expect([sorted.A1, sorted.A2, sorted.A3]).toEqual(['3', '2', '1']);
  });
});

describe('TSV clipboard round-trip', () => {
  it('serializes a range to tab/newline separated raw values', () => {
    const cells: Cells = { A1: '1', B1: '2', A2: '=A1+B1' };
    const tsv = rangeToTsv(cells, { c1: 0, r1: 0, c2: 1, r2: 1 });
    expect(tsv).toBe('1\t2\n=A1+B1\t');
  });

  it('parses pasted TSV into positioned writes anchored at the active cell', () => {
    const writes = tsvToCellWrites('a\tb\nc\td', { col: 2, row: 3 });
    expect(writes).toContainEqual({ col: 2, row: 3, value: 'a' });
    expect(writes).toContainEqual({ col: 3, row: 3, value: 'b' });
    expect(writes).toContainEqual({ col: 3, row: 4, value: 'd' });
  });
});

describe('formatCellValue', () => {
  it('leaves general and non-numeric values untouched', () => {
    expect(formatCellValue('42')).toBe('42');
    expect(formatCellValue('hello', 'fixed2')).toBe('hello');
    expect(formatCellValue('', 'currency')).toBe('');
  });

  it('applies fixed, percent and currency formats', () => {
    expect(formatCellValue('3.5', 'fixed2')).toBe('3.50');
    expect(formatCellValue('0.25', 'percent')).toBe('25%');
    expect(formatCellValue('1234.5', 'currency')).toBe('$1,234.50');
  });
});
