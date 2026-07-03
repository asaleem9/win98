import { evaluateFormula, cellKey, colLabel, parseCellRef, parseRange, GetRaw } from '../formula';

function makeGetRaw(data: Record<string, string>): GetRaw {
  return (key: string) => data[key] ?? '';
}

describe('cell helpers', () => {
  it('colLabel maps 0->A, 25->Z', () => {
    expect(colLabel(0)).toBe('A');
    expect(colLabel(25)).toBe('Z');
  });

  it('cellKey combines column and 1-based row', () => {
    expect(cellKey(0, 0)).toBe('A1');
    expect(cellKey(2, 4)).toBe('C5');
  });

  it('parseCellRef parses valid refs and rejects junk', () => {
    expect(parseCellRef('B3')).toEqual({ col: 1, row: 2 });
    expect(parseCellRef('nope')).toBeNull();
  });

  it('parseRange expands a rectangular block', () => {
    expect(parseRange('A1:A3')).toHaveLength(3);
    expect(parseRange('A1:B2')).toHaveLength(4);
  });
});

describe('evaluateFormula', () => {
  it('returns literals unchanged', () => {
    expect(evaluateFormula('hello', makeGetRaw({}))).toBe('hello');
    expect(evaluateFormula('42', makeGetRaw({}))).toBe('42');
  });

  it('evaluates simple arithmetic', () => {
    expect(evaluateFormula('=2+3*4', makeGetRaw({}))).toBe('14');
  });

  it('resolves cell references', () => {
    const get = makeGetRaw({ A1: '10', A2: '20' });
    expect(evaluateFormula('=A1+A2', get)).toBe('30');
  });

  it('SUM over a range', () => {
    const get = makeGetRaw({ A1: '1', A2: '2', A3: '3' });
    expect(evaluateFormula('=SUM(A1:A3)', get)).toBe('6');
  });

  it('AVERAGE over a range', () => {
    const get = makeGetRaw({ A1: '2', A2: '4', A3: '6' });
    expect(evaluateFormula('=AVERAGE(A1:A3)', get)).toBe('4');
  });

  it('MIN and MAX', () => {
    const get = makeGetRaw({ A1: '5', A2: '1', A3: '9' });
    expect(evaluateFormula('=MIN(A1:A3)', get)).toBe('1');
    expect(evaluateFormula('=MAX(A1:A3)', get)).toBe('9');
  });

  it('COUNT counts numeric cells only', () => {
    const get = makeGetRaw({ A1: '5', A2: 'text', A3: '9' });
    expect(evaluateFormula('=COUNT(A1:A3)', get)).toBe('2');
  });

  it('SUM with comma-separated arguments', () => {
    const get = makeGetRaw({ A1: '10', B1: '5' });
    expect(evaluateFormula('=SUM(A1,B1,5)', get)).toBe('20');
  });

  it('IF with numeric comparison returns the correct branch', () => {
    const get = makeGetRaw({ A1: '10' });
    expect(evaluateFormula('=IF(A1>5,"big","small")', get)).toBe('big');
    expect(evaluateFormula('=IF(A1<5,"big","small")', get)).toBe('small');
  });

  it('IF branch can be a formula', () => {
    const get = makeGetRaw({ A1: '10', A2: '3' });
    expect(evaluateFormula('=IF(A1>5,A1+A2,0)', get)).toBe('13');
  });

  it('guards against circular references', () => {
    const get = makeGetRaw({ A1: '=A2', A2: '=A1' });
    // Should not throw / infinite-loop; resolves refs to 0.
    expect(evaluateFormula('=A1', get, new Set(['A1']))).toBe('0');
  });

  it('reports division by zero', () => {
    expect(evaluateFormula('=1/0', makeGetRaw({}))).toBe('#DIV/0!');
  });
});
