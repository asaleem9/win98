'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { Button98 } from '@/components/ui/Button98';
import { Select98 } from '@/components/ui/Select98';
import { Checkbox98 } from '@/components/ui/Checkbox98';
import { ProgressBar98 } from '@/components/ui/ProgressBar98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Dialog98 } from '@/components/ui/Dialog98';
import { cn } from '@/lib/cn';
import { buildBlockMap, BlockType, BLOCK_GRID_SIZE } from './defragHelpers';

const BLOCK_COLORS: Record<BlockType, string> = {
  free: '#FFFFFF',
  used: '#0000CC',
  unmovable: '#00CC00',
  directory: '#CCCC00',
  fragmented: '#CC0000',
};

const LEGEND: { type: BlockType | 'reading' | 'writing'; label: string; color: string }[] = [
  { type: 'used', label: 'Contiguous', color: BLOCK_COLORS.used },
  { type: 'fragmented', label: 'Fragmented', color: BLOCK_COLORS.fragmented },
  { type: 'unmovable', label: 'Unmovable', color: BLOCK_COLORS.unmovable },
  { type: 'reading', label: 'Reading', color: '#00FFFF' },
  { type: 'writing', label: 'Writing', color: '#FF00FF' },
  { type: 'free', label: 'Free', color: BLOCK_COLORS.free },
];

// Below this percentage Windows 98 recommends against defragmenting.
const RECOMMEND_THRESHOLD = 10;

export default function DiskDefragmenter({ windowId }: AppComponentProps) {
  void windowId;
  const { root, fragments, getFragmentationStats, clearFragmentation } = useFileSystem();
  const [drive, setDrive] = useState('C:');
  const [showDetails, setShowDetails] = useState(true);
  const [blocks, setBlocks] = useState<BlockType[]>(() => buildBlockMap(root, fragments));
  const [defragging, setDefragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Ready');
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);
  const [cursorMode, setCursorMode] = useState<'reading' | 'writing'>('reading');
  const [dialog, setDialog] = useState<null | { title: string; message: string }>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Recomputed on every render so it reflects the live filesystem + fragment map.
  const frag = getFragmentationStats();

  const analyze = useCallback(() => {
    setBlocks(buildBlockMap(root, fragments));
    setProgress(0);
    const pct = getFragmentationStats().fragPercent;
    setStatus(`Drive ${drive} - Analysis complete. ${pct}% fragmented.`);
    setDialog({
      title: 'Disk Defragmenter',
      message:
        pct < RECOMMEND_THRESHOLD
          ? `Drive ${drive} is ${pct}% fragmented.\n\nYou do not need to defragment this drive now.`
          : `Drive ${drive} is ${pct}% fragmented.\n\nYou should defragment this drive now.`,
    });
  }, [drive, root, fragments, getFragmentationStats]);

  const defragment = useCallback(() => {
    if (defragging) return;
    const before = getFragmentationStats().fragPercent;
    // The consolidated target: same files, laid out contiguously with no fragments.
    const target = buildBlockMap(root, {});
    setDefragging(true);
    setProgress(0);
    setStatus(`Defragmenting drive ${drive}...`);

    const total = BLOCK_GRID_SIZE;
    let step = 0;

    function tick() {
      step++;
      const pct = Math.min(100, Math.floor((step / total) * 100));
      setProgress(pct);

      // Sweep a reading/writing cursor across the grid as blocks settle
      const readIdx = Math.min(total - 1, step);
      const writeIdx = Math.max(0, step - 3);
      setCursorMode(step % 6 < 3 ? 'reading' : 'writing');
      setCursorIndex(step % 6 < 3 ? readIdx : writeIdx);

      // Reveal the consolidated layout one block at a time.
      setBlocks((prev) => {
        const settled = Math.min(step, total);
        return [...target.slice(0, settled), ...prev.slice(settled)].slice(0, total);
      });

      if (step < total) {
        timerRef.current = setTimeout(tick, 15);
      } else {
        setBlocks(target);
        clearFragmentation();
        setDefragging(false);
        setCursorIndex(null);
        setStatus(`Defragmentation of drive ${drive} is complete.`);
        setDialog({
          title: 'Disk Defragmenter',
          message:
            `Defragmentation of drive ${drive} is complete.\n\n` +
            `Fragmentation before: ${before}%\n` +
            `Fragmentation after: 0%`,
        });
      }
    }

    tick();
  }, [defragging, drive, root, getFragmentationStats, clearFragmentation]);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDefragging(false);
    setCursorIndex(null);
    setStatus('Stopped.');
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-[var(--win98-button-shadow)]">
        <span>Select drive:</span>
        <Select98 value={drive} onChange={(e) => setDrive(e.target.value)} className="w-[180px]" disabled={defragging}>
          <option value="C:">C: [WINDOWS98]</option>
          <option value="D:">D: [DATA]</option>
          <option value="A:">A: [3.5 Floppy]</option>
        </Select98>
        <Button98 onClick={analyze} disabled={defragging}>Analyze</Button98>
        <Button98 onClick={defragment} disabled={defragging}>Defragment</Button98>
        <Button98 onClick={stop} disabled={!defragging}>Stop</Button98>
        <div className="ml-auto">
          <Checkbox98 label="Show Details" checked={showDetails} onChange={(e) => setShowDetails(e.target.checked)} />
        </div>
      </div>

      {/* Block grid */}
      {showDetails && (
        <div className="flex-1 p-3 flex flex-col items-center justify-center">
          <div
            className={cn(
              'border-2 border-solid p-[2px] bg-white inline-block',
              'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
              'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
            )}
          >
            <div
              className="grid gap-[1px]"
              style={{
                gridTemplateColumns: `repeat(28, 12px)`,
                gridTemplateRows: `repeat(16, 10px)`,
              }}
            >
              {blocks.map((block, i) => {
                const isCursor = defragging && cursorIndex === i;
                const bg = isCursor ? (cursorMode === 'reading' ? '#00FFFF' : '#FF00FF') : BLOCK_COLORS[block];
                return <div key={i} className="w-[12px] h-[10px]" style={{ backgroundColor: bg }} />;
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
            {LEGEND.map(({ type, label, color }) => (
              <div key={type} className="flex items-center gap-1">
                <div className="w-[10px] h-[8px] border border-[#808080]" style={{ backgroundColor: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showDetails && <div className="flex-1" />}

      {/* Fragmentation readout */}
      <div className="px-3 pb-1 flex items-center justify-between text-[10px]">
        <span>{frag.fragmented} of {frag.files} files fragmented</span>
        <span>{frag.fragPercent}% fragmented</span>
      </div>

      {/* Progress */}
      <div className="px-3 pb-1">
        <ProgressBar98 value={progress} />
      </div>

      <StatusBar98 panels={[{ content: status }]} />

      {dialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <Dialog98
            title={dialog.title}
            icon="info"
            message={<span className="whitespace-pre-line">{dialog.message}</span>}
            buttons={[{ label: 'OK', onClick: () => setDialog(null), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
