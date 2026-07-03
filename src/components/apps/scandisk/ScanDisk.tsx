'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppComponentProps } from '@/types/app';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { Button98 } from '@/components/ui/Button98';
import { GroupBox98 } from '@/components/ui/GroupBox98';
import { Radio98 } from '@/components/ui/Radio98';
import { Checkbox98 } from '@/components/ui/Checkbox98';
import { ProgressBar98 } from '@/components/ui/ProgressBar98';
import { Dialog98 } from '@/components/ui/Dialog98';
import { walkFsStats, buildScanReport, badClusterIndices, SURFACE_GRID_SIZE } from './scandiskHelpers';

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

export default function ScanDisk({ windowId }: AppComponentProps) {
  const { root, createFile } = useFileSystem();
  const [drive, setDrive] = useState('C:');
  const [scanType, setScanType] = useState<'standard' | 'thorough'>('standard');
  const [autoFix, setAutoFix] = useState(false);
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [surfaceFilled, setSurfaceFilled] = useState(0);
  const [badCells, setBadCells] = useState<number[]>([]);
  const [showFixDialog, setShowFixDialog] = useState(false);
  const [fixSaved, setFixSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stats = useMemo(() => walkFsStats(root), [root]);

  const lostFragmentCount = useMemo(() => {
    if (!autoFix) return 0;
    return 1 + (stats.fileCount % 2);
  }, [autoFix, stats.fileCount]);

  const allBadClusters = useMemo(() => badClusterIndices(stats.fileCount, 6), [stats.fileCount]);

  const startScan = useCallback(() => {
    setPhase('scanning');
    setProgress(0);
    setResults([]);
    setSurfaceFilled(0);
    setBadCells([]);
    setFixSaved(false);
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
        setSurfaceFilled(SURFACE_GRID_SIZE);
        const report = buildScanReport({
          stats,
          scanType,
          badClusters: scanType === 'thorough' ? allBadClusters.length : 0,
          lostFragments: lostFragmentCount,
        });
        setResults(report);
        setCurrentStep('Scan complete.');
        if (autoFix && lostFragmentCount > 0) {
          setShowFixDialog(true);
        }
      } else {
        const stepIdx = Math.min(Math.floor(p / (100 / totalSteps)), totalSteps - 1);
        setCurrentStep(SCAN_STEPS[stepIdx]);

        // Once we hit the surface scan step (thorough only), animate the cluster grid
        if (scanType === 'thorough' && stepIdx === SCAN_STEPS.length - 1) {
          const surfaceProgress = (p - (100 * stepIdx) / totalSteps) / (100 / totalSteps);
          const filled = Math.round(Math.max(0, Math.min(1, surfaceProgress)) * SURFACE_GRID_SIZE);
          setSurfaceFilled(filled);
          setBadCells(allBadClusters.filter((idx) => idx <= filled));
        }
      }
      setProgress(Math.min(100, Math.round(p)));
    }, 200);
  }, [scanType, stats, allBadClusters, autoFix, lostFragmentCount]);

  const closeScan = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('idle');
    setProgress(0);
    setResults([]);
    setCurrentStep('');
    setSurfaceFilled(0);
    setBadCells([]);
  }, []);

  const saveFragment = useCallback(() => {
    createFile('C:\\', 'FILE0001.CHK', 'Recovered lost cluster data.\r\n');
    setFixSaved(true);
    setShowFixDialog(false);
  }, [createFile]);

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
              label={`${d} ${d === 'C:' ? '[Hard disk]' : '[3½ Floppy]'}`}
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
          <Checkbox98
            label="Fix errors automatically"
            checked={autoFix}
            onChange={(e) => setAutoFix(e.target.checked)}
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

            {scanType === 'thorough' && (
              <div className="flex flex-col items-center gap-1 py-1">
                <div className="border-2 border-solid p-[2px] bg-[#000080] border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
                  <div className="grid gap-[1px]" style={{ gridTemplateColumns: 'repeat(32, 8px)', gridTemplateRows: 'repeat(12, 8px)' }}>
                    {Array.from({ length: SURFACE_GRID_SIZE }, (_, i) => {
                      const isBad = badCells.includes(i);
                      const isFilled = i < surfaceFilled;
                      return (
                        <div
                          key={i}
                          className="w-[8px] h-[8px] flex items-center justify-center text-[6px] font-bold leading-none"
                          style={{ backgroundColor: isBad ? '#FFFF00' : isFilled ? '#C0C0C0' : '#000080', color: '#000' }}
                        >
                          {isBad ? 'B' : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </GroupBox98>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="flex-1 overflow-auto bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] shadow-[inset_-1px_-1px_0_var(--win98-button-light),inset_1px_1px_0_var(--win98-button-dark-shadow)] p-2 font-[family-name:var(--win98-font-mono)] text-[11px]">
          {results.map((line, i) => (
            <div key={i} className={i === 0 ? 'font-bold' : ''}>{line || ' '}</div>
          ))}
          {fixSaved && <div className="mt-1">Lost fragment saved as C:\FILE0001.CHK</div>}
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

      {showFixDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <Dialog98
            title="ScanDisk"
            icon="question"
            message={`ScanDisk found ${lostFragmentCount} lost file fragment(s). Save as C:\\FILE0001.CHK?`}
            buttons={[
              { label: 'Yes', onClick: saveFragment, default: true },
              { label: 'No', onClick: () => setShowFixDialog(false) },
            ]}
          />
        </div>
      )}
    </div>
  );
}
