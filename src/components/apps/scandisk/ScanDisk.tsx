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
import {
  walkFsStats,
  walkFilePaths,
  detectOrphans,
  buildScanReport,
  badClusterIndices,
  SURFACE_GRID_SIZE,
} from './scandiskHelpers';

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
// The "Checking files..." phase walks the real file list; this is its index.
const FILE_STEP = 4;

export default function ScanDisk({ windowId }: AppComponentProps) {
  void windowId;
  const { root, recycleBin, getNode, createFile } = useFileSystem();
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
  const [savedChkFiles, setSavedChkFiles] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stats = useMemo(() => walkFsStats(root), [root]);
  const filePaths = useMemo(() => walkFilePaths(root), [root]);

  // Real dangling Recycle Bin entries are the drive's lost file fragments.
  const orphans = useMemo(
    () => detectOrphans(recycleBin, (p) => getNode(p)?.type === 'directory'),
    [recycleBin, getNode],
  );

  const allBadClusters = useMemo(() => badClusterIndices(stats.fileCount, 6), [stats.fileCount]);

  const makeReport = useCallback(
    (fixed: boolean) =>
      buildScanReport({
        stats,
        scanType,
        badClusters: scanType === 'thorough' ? allBadClusters.length : 0,
        lostFragments: orphans.length,
        fixed,
      }),
    [stats, scanType, allBadClusters.length, orphans.length],
  );

  const applyFix = useCallback(() => {
    // Recover each lost fragment into the classic FILE0000.CHK, FILE0001.CHK... series.
    const saved: string[] = [];
    orphans.forEach((_, i) => {
      const name = `FILE${String(i).padStart(4, '0')}.CHK`;
      createFile('C:\\', name, 'Recovered lost cluster data.\r\n');
      saved.push(`C:\\${name}`);
    });
    setSavedChkFiles(saved);
    setResults(makeReport(true));
  }, [orphans, createFile, makeReport]);

  const startScan = useCallback(() => {
    setPhase('scanning');
    setProgress(0);
    setResults([]);
    setSurfaceFilled(0);
    setBadCells([]);
    setSavedChkFiles([]);
    setShowFixDialog(false);
    setCurrentStep(SCAN_STEPS[0]);

    let p = 0;
    const totalSteps = scanType === 'thorough' ? SCAN_STEPS.length : SCAN_STEPS.length - 1;
    // Give the real file-checking phase weight proportional to the file count so
    // bigger drives visibly take longer to walk.
    const ticksPerStep = 8;
    const increment = 100 / (totalSteps * ticksPerStep);

    timerRef.current = setInterval(() => {
      p += increment;
      if (p >= 100) {
        p = 100;
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('done');
        setSurfaceFilled(SURFACE_GRID_SIZE);
        setCurrentStep('Scan complete.');
        if (autoFix && orphans.length > 0) {
          applyFix();
        } else {
          setResults(makeReport(false));
          if (orphans.length > 0) setShowFixDialog(true);
        }
      } else {
        const stepIdx = Math.min(Math.floor(p / (100 / totalSteps)), totalSteps - 1);
        if (stepIdx === FILE_STEP && filePaths.length > 0) {
          // Surface a real path as each file is checked.
          const within = (p - (100 * stepIdx) / totalSteps) / (100 / totalSteps);
          const fileIdx = Math.min(filePaths.length - 1, Math.floor(within * filePaths.length));
          setCurrentStep(`Checking files... ${filePaths[fileIdx]}`);
        } else {
          setCurrentStep(SCAN_STEPS[stepIdx]);
        }

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
  }, [scanType, filePaths, allBadClusters, autoFix, orphans.length, applyFix, makeReport]);

  const closeScan = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('idle');
    setProgress(0);
    setResults([]);
    setCurrentStep('');
    setSurfaceFilled(0);
    setBadCells([]);
    setSavedChkFiles([]);
  }, []);

  const confirmFix = useCallback(() => {
    applyFix();
    setShowFixDialog(false);
  }, [applyFix]);

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
            <div className="text-[10px] truncate">{currentStep} {progress}%</div>

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
            <div key={i} className={i === 0 ? 'font-bold' : ''}>{line || ' '}</div>
          ))}
          {savedChkFiles.map((path) => (
            <div key={path} className="mt-1">Lost fragment saved as {path}</div>
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

      {showFixDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <Dialog98
            title="ScanDisk"
            icon="question"
            message={`ScanDisk found ${orphans.length} lost file fragment(s). Save them as FILE0000.CHK?`}
            buttons={[
              { label: 'Yes', onClick: confirmFix, default: true },
              { label: 'No', onClick: () => setShowFixDialog(false) },
            ]}
          />
        </div>
      )}
    </div>
  );
}
