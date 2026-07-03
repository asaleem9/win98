// Spreadsheet formula engine for the Excel clone. Kept UI-free so the logic can
// be unit tested directly. Cell values are looked up through a getRaw callback
// keyed by cell name (e.g. "A1"), returning the raw stored string.

export type GetRaw = (key: string) => string;

const COL_A = 65;

export function colLabel(index: number): string {
  return String.fromCharCode(COL_A + index);
}

export function cellKey(col: number, row: number): string {
  return `${colLabel(col)}${row + 1}`;
}

export function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.trim().match(/^([A-Z])(\d+)$/);
  if (!match) return null;
  return { col: match[1].charCodeAt(0) - COL_A, row: parseInt(match[2], 10) - 1 };
}

export function parseRange(range: string): { col: number; row: number }[] {
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

// Split on commas that are not nested inside parentheses.
function splitArgs(arg: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of arg) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      args.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  args.push(current);
  return args;
}

// Expand a function argument list into the numeric values it references,
// following ranges, single cells, and literal numbers.
function collectNumbers(arg: string, getRaw: GetRaw, visited: Set<string>): number[] {
  const nums: number[] = [];
  for (const part of splitArgs(arg)) {
    const token = part.trim();
    if (!token) continue;
    if (token.includes(':')) {
      for (const c of parseRange(token)) {
        const k = cellKey(c.col, c.row);
        if (visited.has(k)) continue;
        const n = parseFloat(evaluateFormula(getRaw(k), getRaw, new Set([...visited, k])));
        if (!isNaN(n)) nums.push(n);
      }
    } else {
      const ref = parseCellRef(token);
      if (ref) {
        const k = cellKey(ref.col, ref.row);
        if (visited.has(k)) continue;
        const n = parseFloat(evaluateFormula(getRaw(k), getRaw, new Set([...visited, k])));
        if (!isNaN(n)) nums.push(n);
      } else {
        const n = parseFloat(token);
        if (!isNaN(n)) nums.push(n);
      }
    }
  }
  return nums;
}

function evalCondition(cond: string, getRaw: GetRaw, visited: Set<string>): boolean {
  const ops = ['<=', '>=', '<>', '=', '<', '>'];
  for (const op of ops) {
    const idx = cond.indexOf(op);
    if (idx > 0) {
      const lhs = evaluateFormula(`=${cond.slice(0, idx)}`, getRaw, visited);
      const rhs = evaluateFormula(`=${cond.slice(idx + op.length)}`, getRaw, visited);
      const ln = parseFloat(lhs);
      const rn = parseFloat(rhs);
      const bothNum = !isNaN(ln) && !isNaN(rn);
      switch (op) {
        case '<=': return bothNum ? ln <= rn : lhs <= rhs;
        case '>=': return bothNum ? ln >= rn : lhs >= rhs;
        case '<>': return lhs !== rhs;
        case '=': return bothNum ? ln === rn : lhs === rhs;
        case '<': return bothNum ? ln < rn : lhs < rhs;
        case '>': return bothNum ? ln > rn : lhs > rhs;
      }
    }
  }
  // No operator: truthy if non-empty / non-zero.
  const n = parseFloat(evaluateFormula(`=${cond}`, getRaw, visited));
  return isNaN(n) ? cond.trim().length > 0 : n !== 0;
}

function roundResult(n: number): string {
  return Number.isFinite(n) ? String(Math.round(n * 1e10) / 1e10) : '#DIV/0!';
}

export function evaluateFormula(formula: string, getRaw: GetRaw, visited: Set<string> = new Set()): string {
  if (formula == null) return '';
  if (!formula.startsWith('=')) return formula;

  const expr = formula.substring(1).trim();
  const upper = expr.toUpperCase();

  const fnMatch = upper.match(/^([A-Z]+)\((.*)\)$/);
  if (fnMatch) {
    const fn = fnMatch[1];
    // Use the original-case arg slice so string literals survive.
    const arg = expr.slice(expr.indexOf('(') + 1, expr.lastIndexOf(')'));

    switch (fn) {
      case 'SUM': {
        const nums = collectNumbers(arg, getRaw, visited);
        return roundResult(nums.reduce((a, b) => a + b, 0));
      }
      case 'AVERAGE': {
        const nums = collectNumbers(arg, getRaw, visited);
        return nums.length ? roundResult(nums.reduce((a, b) => a + b, 0) / nums.length) : '#DIV/0!';
      }
      case 'MIN': {
        const nums = collectNumbers(arg, getRaw, visited);
        return nums.length ? roundResult(Math.min(...nums)) : '0';
      }
      case 'MAX': {
        const nums = collectNumbers(arg, getRaw, visited);
        return nums.length ? roundResult(Math.max(...nums)) : '0';
      }
      case 'COUNT': {
        return String(collectNumbers(arg, getRaw, visited).length);
      }
      case 'IF': {
        const parts = splitArgs(arg);
        if (parts.length < 2) return '#VALUE!';
        const cond = evalCondition(parts[0].trim(), getRaw, visited);
        const branch = (cond ? parts[1] : parts[2] ?? '').trim();
        return resolveValue(branch, getRaw, visited);
      }
    }
  }

  // Arithmetic: substitute cell references with numeric values, then evaluate.
  const substituted = upper.replace(/[A-Z]+\d+/g, (ref) => {
    const parsed = parseCellRef(ref);
    if (!parsed) return '0';
    const k = cellKey(parsed.col, parsed.row);
    if (visited.has(k)) return '0';
    const val = evaluateFormula(getRaw(k), getRaw, new Set([...visited, k]));
    const n = parseFloat(val);
    return isNaN(n) ? '0' : String(n);
  });

  if (/^[\d+\-*/().\s]+$/.test(substituted)) {
    try {
      const fn = new Function(`return (${substituted})`);
      const result = fn();
      if (typeof result === 'number') return roundResult(result);
      return String(result);
    } catch {
      return '#VALUE!';
    }
  }

  return '#VALUE!';
}

// Resolve an IF branch: a quoted string, a number, a cell ref, or a subformula.
function resolveValue(token: string, getRaw: GetRaw, visited: Set<string>): string {
  const t = token.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return evaluateFormula(`=${t}`, getRaw, visited);
}
