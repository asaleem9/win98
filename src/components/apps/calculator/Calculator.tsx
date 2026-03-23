'use client';

import { useState, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';

function calcButton(
  label: string,
  onClick: () => void,
  className?: string,
) {
  return (
    <button
      key={label}
      onClick={onClick}
      className={`
        h-[23px] font-[family-name:var(--win98-font)] text-[11px] cursor-default select-none
        bg-[var(--win98-button-face)]
        border-2 border-solid
        border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]
        border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]
        shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]
        active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]
        active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]
        active:shadow-none active:pt-[1px] active:pl-[1px]
        ${className || ''}
      `}
    >
      {label}
    </button>
  );
}

export default function Calculator({ windowId }: AppComponentProps) {
  const [display, setDisplay] = useState('0.');
  const [memory, setMemory] = useState(0);
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [resetOnNext, setResetOnNext] = useState(false);

  const currentValue = parseFloat(display.replace(/,/g, ''));

  const formatDisplay = (n: number): string => {
    if (!isFinite(n)) return 'Error';
    const str = String(n);
    if (str.includes('.')) {
      return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.';
  };

  const inputDigit = useCallback((digit: string) => {
    if (resetOnNext) {
      setDisplay(digit === '.' ? '0.' : digit + '.');
      setResetOnNext(false);
    } else {
      if (digit === '.') {
        if (display.indexOf('.') < display.length - 1) return;
        setDisplay(display.slice(0, -1) + '.' + '');
        return;
      }
      if (display === '0.') {
        setDisplay(digit + '.');
      } else {
        const raw = display.replace(/,/g, '').replace(/\.$/, '');
        setDisplay(formatDisplay(parseFloat(raw + digit)));
      }
    }
  }, [display, resetOnNext]);

  const calculate = useCallback((op: string, a: number, b: number): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? NaN : a / b;
      default: return b;
    }
  }, []);

  const handleOperator = useCallback((op: string) => {
    const val = currentValue;
    if (accumulator !== null && pendingOp && !resetOnNext) {
      const result = calculate(pendingOp, accumulator, val);
      setAccumulator(result);
      setDisplay(formatDisplay(result));
    } else {
      setAccumulator(val);
    }
    setPendingOp(op);
    setResetOnNext(true);
  }, [currentValue, accumulator, pendingOp, resetOnNext, calculate]);

  const handleEquals = useCallback(() => {
    if (accumulator !== null && pendingOp) {
      const result = calculate(pendingOp, accumulator, currentValue);
      setDisplay(formatDisplay(result));
      setAccumulator(null);
      setPendingOp(null);
      setResetOnNext(true);
    }
  }, [accumulator, pendingOp, currentValue, calculate]);

  const handleClear = useCallback(() => {
    setDisplay('0.');
    setAccumulator(null);
    setPendingOp(null);
    setResetOnNext(false);
  }, []);

  const handleClearEntry = useCallback(() => {
    setDisplay('0.');
    setResetOnNext(false);
  }, []);

  const handleBackspace = useCallback(() => {
    const raw = display.replace(/,/g, '').replace(/\.$/, '');
    if (raw.length <= 1) {
      setDisplay('0.');
    } else {
      setDisplay(formatDisplay(parseFloat(raw.slice(0, -1))));
    }
  }, [display]);

  const handlePlusMinus = useCallback(() => {
    const val = currentValue;
    if (val !== 0) {
      setDisplay(formatDisplay(-val));
    }
  }, [currentValue]);

  const handlePercent = useCallback(() => {
    if (accumulator !== null) {
      setDisplay(formatDisplay(accumulator * currentValue / 100));
    }
  }, [accumulator, currentValue]);

  const handleSqrt = useCallback(() => {
    const val = currentValue;
    if (val < 0) {
      setDisplay('Error');
    } else {
      setDisplay(formatDisplay(Math.sqrt(val)));
    }
    setResetOnNext(true);
  }, [currentValue]);

  const handleInverse = useCallback(() => {
    if (currentValue === 0) {
      setDisplay('Error');
    } else {
      setDisplay(formatDisplay(1 / currentValue));
    }
    setResetOnNext(true);
  }, [currentValue]);

  const redBtn = 'text-red-700';
  const blueBtn = 'text-blue-800';

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] p-[6px] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Display */}
      <div
        className="h-[24px] mb-[6px] px-[4px] flex items-center justify-end
          bg-white text-right text-[14px] font-[family-name:var(--win98-font)]
          border-2 border-solid
          border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]
          border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]
          shadow-[inset_-1px_-1px_0_var(--win98-button-light),inset_1px_1px_0_var(--win98-button-dark-shadow)]
          select-all"
      >
        {display}
      </div>

      {/* Memory indicator */}
      <div className="flex gap-1 mb-1">
        <div className="w-[24px] h-[14px] flex items-center justify-center text-[9px]">
          {memory !== 0 && 'M'}
        </div>
      </div>

      {/* Button grid */}
      <div className="grid grid-cols-5 gap-[3px] flex-1">
        {/* Row 1 */}
        <div className="flex items-center justify-center text-[9px] select-none" />
        {calcButton('Backspace', handleBackspace, `col-span-1 ${redBtn}`)}
        {calcButton('CE', handleClearEntry, `${redBtn}`)}
        {calcButton('C', handleClear, `${redBtn}`)}
        <div />

        {/* Row 2 */}
        {calcButton('MC', () => setMemory(0), `${redBtn}`)}
        {calcButton('7', () => inputDigit('7'), blueBtn)}
        {calcButton('8', () => inputDigit('8'), blueBtn)}
        {calcButton('9', () => inputDigit('9'), blueBtn)}
        {calcButton('/', () => handleOperator('/'), redBtn)}

        {/* Row 3 */}
        {calcButton('MR', () => { setDisplay(formatDisplay(memory)); setResetOnNext(true); }, redBtn)}
        {calcButton('4', () => inputDigit('4'), blueBtn)}
        {calcButton('5', () => inputDigit('5'), blueBtn)}
        {calcButton('6', () => inputDigit('6'), blueBtn)}
        {calcButton('*', () => handleOperator('*'), redBtn)}

        {/* Row 4 */}
        {calcButton('MS', () => setMemory(currentValue), redBtn)}
        {calcButton('1', () => inputDigit('1'), blueBtn)}
        {calcButton('2', () => inputDigit('2'), blueBtn)}
        {calcButton('3', () => inputDigit('3'), blueBtn)}
        {calcButton('-', () => handleOperator('-'), redBtn)}

        {/* Row 5 */}
        {calcButton('M+', () => setMemory(memory + currentValue), redBtn)}
        {calcButton('0', () => inputDigit('0'), blueBtn)}
        {calcButton('+/-', handlePlusMinus, blueBtn)}
        {calcButton('.', () => inputDigit('.'), blueBtn)}
        {calcButton('+', () => handleOperator('+'), redBtn)}

        {/* Row 6 */}
        <div />
        {calcButton('sqrt', handleSqrt, blueBtn)}
        {calcButton('%', handlePercent, blueBtn)}
        {calcButton('1/x', handleInverse, blueBtn)}
        {calcButton('=', handleEquals, redBtn)}
      </div>
    </div>
  );
}
