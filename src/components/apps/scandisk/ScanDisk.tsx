'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { Button98 } from '@/components/ui/Button98';
import { GroupBox98 } from '@/components/ui/GroupBox98';
import { Radio98 } from '@/components/ui/Radio98';
import { ProgressBar98 } from '@/components/ui/ProgressBar98';

type ScanPhase = 'idle' | 'scanning' | 'done';

const SCAN_STEPS = [
  'Checking media descriptor...',
  'Checking file allocation tables...',
  'Checking directories...',
  'Checking file system structure...',
  'Checking files...',
  'Checking free space...',
  'Checking lost clusters...',
  'Checking surface integrity...',
];

const SCAN_RESULTS_STANDARD = [
  'ScanDisk did not find any errors on this drive.',
  '',
  '6,448,619,520 bytes total disk space',
  '0 bytes in bad sectors',
  '32,768 bytes in 2 hidden files',
  '4,194,304 bytes in 87 directories',
  '4,210,593,792 bytes in 3,842 user files',
  '2,001,797,120 bytes available on disk',
  '',
  '32,768 bytes in each allocation unit',
  '196,724 total allocation units on disk',
  '61,089 available allocation units on disk',
];

const SCAN_RESULTS_THOROUGH = [
  'ScanDisk found and fixed 2 errors on this drive.',
  '',
  '6,448,619,520 bytes total disk space',
  '0 bytes in bad sectors',
  '32,768 bytes in 2 hidden files',
  '4,194,304 bytes in 87 directories',
  '4,210,593,792 bytes in 3,842 user files',
  '2,001,797,120 bytes available on disk',
  '',
  '32,768 bytes in each allocation unit',
  '196,724 total allocation units on disk',
  '61,089 available allocation units on disk',
  '',
  'Surface scan complete. 2 bad sectors found and marked.',
];

export default function ScanDisk({ windowId }: AppComponentProps) {
  const [drive, setDrive] = useState('C:');
  const [scanType, setScanType] = useState<'standard' | 'thorough'>('standard');
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startScan = useCallback(() => {
    setPhase('scanning');
    setProgress(0);
    setResults([]);
    setCurrentStep(SCAN_STEPS[0]);

    let p = 0;
    const totalSteps = scanType === 'thorough' ? SCAN_STEPS.length : SCAN_STEPS.length - 1;
    const increment = 100 / (totalSteps * 8);

    timerRef.current = setInterval(() => {
      p += increment;
      if (p >= 100) {
        p = 100;
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('done');
        setResults(scanType === 'thorough' ? SCAN_RESULTS_THOROUGH : SCAN_RESULTS_STANDARD);
        setCurrentStep('Scan complete.');
      } else {
        const stepIdx = Math.min(Math.floor(p / (100 / totalSteps)), totalSteps - 1);
        setCurrentStep(SCAN_STEPS[stepIdx]);
      }
      setProgress(Math.min(100, Math.round(p)));
    }, 200);
  }, [scanType]);

  const closeScan = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('idle');
    setProgress(0);
    setResults([]);
    setCurrentStep('');
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] p-3 gap-3">
      <div className="flex items-center gap-2 text-[12px] font-bold">
        <img src="/icons/defrag-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
        ScanDisk - {drive}
      </div>

      {/* Drive selection */}
      <GroupBox98 label="Select the drive you want to check for errors">
        <div className="flex gap-3 mt-1">
          {['C:', 'A:'].map((d) => (
            <Radio98
              key={d}
              name="drive"
              label={`${d} ${d === 'C:' ? '[Hard disk]' : '[3\u00BD Floppy]'}`}
              checked={drive === d}
              onChange={() => setDrive(d)}
              disabled={phase === 'scanning'}
            />
          ))}
        </div>
      </GroupBox98>

      {/* Type of test */}
      <GroupBox98 label="Type of test">
        <div className="flex flex-col gap-2 mt-1">
          <Radio98
            name="scantype"
            label="Standard (checks files and folders for errors)"
            checked={scanType === 'standard'}
            onChange={() => setScanType('standard')}
            disabled={phase === 'scanning'}
          />
          <Radio98
            name="scantype"
            label="Thorough (performs standard test and scans disk surface)"
            checked={scanType === 'thorough'}
            onChange={() => setScanType('thorough')}
            disabled={phase === 'scanning'}
          />
        </div>
      </GroupBox98>

      {/* Progress */}
      {phase !== 'idle' && (
        <GroupBox98 label="Progress">
          <div className="flex flex-col gap-2 mt-1">
            <ProgressBar98 value={progress} />
            <div className="text-[10px]">{currentStep} {progress}%</div>
          </div>
        </GroupBox98>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="flex-1 overflow-auto bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] shadow-[inset_-1px_-1px_0_var(--win98-button-light),inset_1px_1px_0_var(--win98-button-dark-shadow)] p-2 font-[family-name:var(--win98-font-mono)] text-[11px]">
          {results.map((line, i) => (
            <div key={i} className={i === 0 ? 'font-bold' : ''}>{line || '\u00A0'}</div>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-2 mt-auto">
        {phase === 'idle' && (
          <Button98 onClick={startScan}>Start</Button98>
        )}
        {phase === 'scanning' && (
          <Button98 onClick={closeScan}>Cancel</Button98>
        )}
        {phase === 'done' && (
          <>
            <Button98 onClick={startScan}>Scan Again</Button98>
            <Button98 onClick={closeScan}>Close</Button98>
          </>
        )}
      </div>
    </div>
  );
}
