'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { operate, applyPercent, scientific, BasicOp, AngleMode } from './calcEngine';

const STANDARD_SIZE = { width: 260, height: 300 };
const SCIENTIFIC_SIZE = { width: 400, height: 300 };

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

const BASIC_OPS = new Set(['+', '-', '*', '/']);

export default function Calculator({ windowId }: AppComponentProps) {
  const { resizeWindow } = useWindows();
  const [display, setDisplay] = useState('0.');
  const [memory, setMemory] = useState(0);
  const [pendingOp, setPendingOp] = useState<BasicOp | null>(null);
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [resetOnNext, setResetOnNext] = useState(false);
  const [mode, setMode] = useState<'standard' | 'scientific'>('standard');
  const [angleMode, setAngleMode] = useState<AngleMode>('deg');
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleOperator = useCallback((op: BasicOp) => {
    const val = currentValue;
    if (accumulator !== null && pendingOp && !resetOnNext) {
      const result = operate(accumulator, pendingOp, val);
      setAccumulator(result);
      setDisplay(formatDisplay(result));
    } else {
      setAccumulator(val);
    }
    setPendingOp(op);
    setResetOnNext(true);
  }, [currentValue, accumulator, pendingOp, resetOnNext]);

  const handleEquals = useCallback(() => {
    if (accumulator !== null && pendingOp) {
      const result = operate(accumulator, pendingOp, currentValue);
      setDisplay(formatDisplay(result));
      setAccumulator(null);
      setPendingOp(null);
      setResetOnNext(true);
    }
  }, [accumulator, pendingOp, currentValue]);

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
    if (accumulator !== null && pendingOp) {
      setDisplay(formatDisplay(applyPercent(accumulator, pendingOp, currentValue)));
      setResetOnNext(true);
    }
  }, [accumulator, pendingOp, currentValue]);

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

  const applyUnary = useCallback((fn: (x: number) => number) => {
    setDisplay(formatDisplay(fn(currentValue)));
    setResetOnNext(true);
  }, [currentValue]);

  const applyConstant = useCallback((fn: () => number) => {
    setDisplay(formatDisplay(fn()));
    setResetOnNext(true);
  }, []);

  const handleCopy = useCallback(() => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(display.replace(/,/g, '').replace(/\.$/, ''));
    }
  }, [display]);

  const handlePaste = useCallback(async () => {
    if (!navigator.clipboard?.readText) return;
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseFloat(text);
      if (!Number.isNaN(parsed)) {
        setDisplay(formatDisplay(parsed));
        setResetOnNext(false);
      }
    } catch {
      // clipboard read denied/unavailable — ignore
    }
  }, []);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) {
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        inputDigit(e.key);
      } else if (e.key === '.') {
        inputDigit('.');
      } else if (BASIC_OPS.has(e.key)) {
        handleOperator(e.key as BasicOp);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === '%') {
        handlePercent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputDigit, handleOperator, handleEquals, handleClear, handleBackspace, handlePercent, handleCopy, handlePaste]);

  const redBtn = 'text-red-700';
  const blueBtn = 'text-blue-800';

  const switchMode = useCallback((next: 'standard' | 'scientific') => {
    setMode(next);
    const size = next === 'scientific' ? SCIENTIFIC_SIZE : STANDARD_SIZE;
    resizeWindow(windowId, size.width, size.height);
  }, [resizeWindow, windowId]);

  const menus: MenuDefinition[] = [
    {
      label: 'Edit',
      items: [
        { label: 'Copy', shortcut: 'Ctrl+C', onClick: handleCopy },
        { label: 'Paste', shortcut: 'Ctrl+V', onClick: handlePaste },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Standard', checked: mode === 'standard', onClick: () => switchMode('standard') },
        { label: 'Scientific', checked: mode === 'scientific', onClick: () => switchMode('scientific') },
      ],
    },
  ];

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] outline-none"
    >
      <MenuBar menus={menus} />
      <div className="flex flex-col flex-1 p-[6px]">
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

        <div className="flex gap-2 flex-1 min-h-0">
          {mode === 'scientific' && (
            <div className="grid grid-cols-2 gap-[3px] w-[130px]">
              {calcButton('Deg', () => setAngleMode('deg'), angleMode === 'deg' ? blueBtn : '')}
              {calcButton('Rad', () => setAngleMode('rad'), angleMode === 'rad' ? blueBtn : '')}
              {calcButton('sin', () => applyUnary((x) => scientific.sin(x, angleMode)), blueBtn)}
              {calcButton('cos', () => applyUnary((x) => scientific.cos(x, angleMode)), blueBtn)}
              {calcButton('tan', () => applyUnary((x) => scientific.tan(x, angleMode)), blueBtn)}
              {calcButton('log', () => applyUnary(scientific.log), blueBtn)}
              {calcButton('ln', () => applyUnary(scientific.ln), blueBtn)}
              {calcButton('x^y', () => handleOperator('^'), redBtn)}
              {calcButton('sqrt', () => applyUnary(scientific.sqrt), blueBtn)}
              {calcButton('pi', () => applyConstant(scientific.pi), blueBtn)}
              {calcButton('e', () => applyConstant(scientific.e), blueBtn)}
            </div>
          )}

          {/* Memory indicator + button grid */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex gap-1 mb-1">
              <div className="w-[24px] h-[14px] flex items-center justify-center text-[9px]">
                {memory !== 0 && 'M'}
              </div>
            </div>
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
        </div>
      </div>
    </div>
  );
}
