// Pure arithmetic engine for the calculator — kept free of React so it's easy to unit test.

export type BasicOp = '+' | '-' | '*' | '/' | '^';

/** Applies a basic binary operator. Division by zero yields NaN (displayed as "Error"). */
export function operate(a: number, op: BasicOp, b: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? NaN : a / b;
    case '^': return Math.pow(a, b);
    default: return b;
  }
}

/**
 * Win98 percent semantics: what "B%" resolves to when applied against
 * accumulator A under a pending operator. For +/- it's a percentage of A;
 * for * // it's just B/100 (a plain scaling factor).
 */
export function percent(a: number, op: BasicOp, b: number): number {
  switch (op) {
    case '+':
    case '-':
      return (a * b) / 100;
    case '*':
    case '/':
      return b / 100;
    default:
      return b;
  }
}

/** Full A <op> B% result, per Win98 calculator behavior. */
export function applyPercent(a: number, op: BasicOp, b: number): number {
  const resolved = percent(a, op, b);
  return operate(a, op, resolved);
}

export type AngleMode = 'deg' | 'rad';

function toRadians(value: number, mode: AngleMode): number {
  return mode === 'deg' ? (value * Math.PI) / 180 : value;
}

export const scientific = {
  sin: (x: number, mode: AngleMode) => Math.sin(toRadians(x, mode)),
  cos: (x: number, mode: AngleMode) => Math.cos(toRadians(x, mode)),
  tan: (x: number, mode: AngleMode) => Math.tan(toRadians(x, mode)),
  log: (x: number) => Math.log10(x),
  ln: (x: number) => Math.log(x),
  pow: (base: number, exp: number) => Math.pow(base, exp),
  sqrt: (x: number) => Math.sqrt(x),
  pi: () => Math.PI,
  e: () => Math.E,
};
