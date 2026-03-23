'use client';

import { useState } from 'react';
import { Button98 } from '@/components/ui/Button98';
import { cn } from '@/lib/cn';

export type ErrorType = 'illegal-operation' | 'not-responding' | 'general-protection-fault';

interface ErrorDialogProps {
  appName: string;
  errorType?: ErrorType;
  onClose: () => void;
}

const ERROR_TITLES: Record<ErrorType, (name: string) => string> = {
  'illegal-operation': (name) => `${name} has performed an illegal operation and will be shut down.`,
  'not-responding': (name) => `${name} is not responding.`,
  'general-protection-fault': (name) => `${name} has caused a General Protection Fault in module KERNEL32.DLL.`,
};

const ERROR_SUBTITLES: Record<ErrorType, string> = {
  'illegal-operation': 'If the problem persists, contact the program vendor.',
  'not-responding': 'If you choose to end the program now, you will lose any unsaved data. If you choose to wait, the program may respond.',
  'general-protection-fault': 'It may be possible to continue normally. Choose Close to terminate the application.',
};

function generateFakeHexDump(): string {
  const lines: string[] = [];
  const modules = ['KERNEL32', 'USER32', 'GDI32', 'SHELL32', 'COMCTL32', 'MSVCRT'];
  const randomHex = () => Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0');

  lines.push(`${modules[Math.floor(Math.random() * modules.length)]}.DLL at 0x${randomHex()}`);
  lines.push('');
  lines.push('Registers:');
  lines.push(`EAX=0x${randomHex()} EBX=0x${randomHex()} ECX=0x${randomHex()}`);
  lines.push(`EDX=0x${randomHex()} ESI=0x${randomHex()} EDI=0x${randomHex()}`);
  lines.push(`EBP=0x${randomHex()} ESP=0x${randomHex()} EIP=0x${randomHex()}`);
  lines.push('');
  lines.push('Stack dump:');
  for (let i = 0; i < 4; i++) {
    const addr = (0xBFF70000 + i * 16).toString(16).toUpperCase();
    const vals = Array.from({ length: 4 }, () => randomHex()).join(' ');
    lines.push(`${addr}: ${vals}`);
  }

  return lines.join('\n');
}

export function ErrorDialog({ appName, errorType = 'illegal-operation', onClose }: ErrorDialogProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [hexDump] = useState(generateFakeHexDump);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20">
      <div
        className={cn(
          'bg-[var(--win98-button-face)] min-w-[380px] max-w-[460px]',
          'border-2 border-solid',
          'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
          'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
          'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
          'font-[family-name:var(--win98-font)] text-[11px]',
        )}
      >
        {/* Title bar */}
        <div className="h-[18px] bg-[var(--win98-active-title)] px-[2px] flex items-center">
          <span className="text-white text-[11px] font-bold truncate">{appName}</span>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex gap-3 items-start mb-4">
            {/* Error icon */}
            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-[28px]">
              ⚠️
            </div>
            <div>
              <p className="mb-2 font-bold">{ERROR_TITLES[errorType](appName)}</p>
              <p>{ERROR_SUBTITLES[errorType]}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-center gap-2">
            <Button98 onClick={onClose}>Close</Button98>
            {errorType === 'illegal-operation' && (
              <Button98 onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? 'Hide Details' : 'Details >>'}
              </Button98>
            )}
            {errorType === 'not-responding' && (
              <Button98 onClick={onClose}>End Now</Button98>
            )}
          </div>

          {/* Details hex dump */}
          {showDetails && (
            <div
              className={cn(
                'mt-3 p-2 h-[120px] overflow-auto',
                'bg-white text-[10px] font-[family-name:var(--win98-font-fixedsys)]',
                'border-2 border-solid',
                'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
                'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
                'shadow-[inset_-1px_-1px_0_var(--win98-button-light),inset_1px_1px_0_var(--win98-button-dark-shadow)]',
              )}
            >
              <pre className="whitespace-pre">{hexDump}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
