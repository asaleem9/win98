'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { Button98 } from '@/components/ui/Button98';
import { Select98 } from '@/components/ui/Select98';
import { ProgressBar98 } from '@/components/ui/ProgressBar98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { cn } from '@/lib/cn';

type BlockType = 'free' | 'used' | 'fragmented' | 'system';

const BLOCK_COLORS: Record<BlockType, string> = {
  free: '#FFFFFF',
  used: '#0000CC',
  fragmented: '#CC0000',
  system: '#00CC00',
};

const COLS = 28;
const ROWS = 16;
const TOTAL = COLS * ROWS;

function generateBlocks(): BlockType[] {
  return Array.from({ length: TOTAL }, () => {
    const r = Math.random();
    if (r < 0.06) return 'system';
    if (r < 0.30) return 'free';
    if (r < 0.55) return 'fragmented';
    return 'used';
  });
}

export default function DiskDefragmenter({ windowId }: AppComponentProps) {
  const [drive, setDrive] = useState('C:');
  const [blocks, setBlocks] = useState<BlockType[]>(() => generateBlocks());
  const [defragging, setDefragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Ready');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const analyze = useCallback(() => {
    setBlocks(generateBlocks());
    setProgress(0);
    setStatus(`Drive ${drive} - Analysis complete. ${Math.floor(Math.random() * 20 + 10)}% fragmented.`);
  }, [drive]);

  const defragment = useCallback(() => {
    if (defragging) return;
    setDefragging(true);
    setProgress(0);
    setStatus(`Defragmenting drive ${drive}...`);

    let step = 0;

    function tick() {
      step++;
      const pct = Math.min(100, Math.floor((step / TOTAL) * 100));
      setProgress(pct);

      setBlocks((prev) => {
        const next = [...prev];
        // Sort one more block into place each tick
        // Move system blocks to the front, then used, then free
        const systemBlocks = next.filter((b) => b === 'system');
        const usedBlocks = next.filter((b) => b === 'used' || b === 'fragmented');
        const freeBlocks = next.filter((b) => b === 'free');

        const sortedCount = Math.min(step, TOTAL);
        const sorted = [...systemBlocks, ...usedBlocks.map(() => 'used' as BlockType), ...freeBlocks];
        const result = [...sorted.slice(0, sortedCount), ...next.slice(sortedCount)];
        return result.slice(0, TOTAL);
      });

      if (step < TOTAL) {
        timerRef.current = setTimeout(tick, 30);
      } else {
        setDefragging(false);
        setStatus(`Defragmentation of drive ${drive} is complete.`);
      }
    }

    tick();
  }, [defragging, drive]);

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
        <Select98 value={drive} onChange={(e) => setDrive(e.target.value)} className="w-[180px]">
          <option value="C:">C: [WINDOWS98]</option>
          <option value="D:">D: [DATA]</option>
          <option value="A:">A: [3.5 Floppy]</option>
        </Select98>
        <Button98 onClick={analyze} disabled={defragging}>Analyze</Button98>
        <Button98 onClick={defragment} disabled={defragging}>Defragment</Button98>
        <Button98 onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); setDefragging(false); setStatus('Stopped.'); }} disabled={!defragging}>
          Stop
        </Button98>
      </div>

      {/* Block grid */}
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
              gridTemplateColumns: `repeat(${COLS}, 12px)`,
              gridTemplateRows: `repeat(${ROWS}, 10px)`,
            }}
          >
            {blocks.map((block, i) => (
              <div
                key={i}
                className="w-[12px] h-[10px]"
                style={{ backgroundColor: BLOCK_COLORS[block] }}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3">
          {(Object.entries(BLOCK_COLORS) as [BlockType, string][]).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-[10px] h-[8px] border border-[#808080]" style={{ backgroundColor: color }} />
              <span className="capitalize">{type === 'used' ? 'Optimized' : type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="px-3 pb-1">
        <ProgressBar98 value={progress} />
      </div>

      <StatusBar98 panels={[{ content: status }]} />
    </div>
  );
}
