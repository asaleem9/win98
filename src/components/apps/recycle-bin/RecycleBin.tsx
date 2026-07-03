'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { Button98 } from '@/components/ui/Button98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { cn } from '@/lib/cn';
import { playSound } from '@/lib/sounds';
import { formatSize } from '@/lib/filesystem';

export default function RecycleBin({}: AppComponentProps) {
  const { recycleBin, restoreFromRecycleBin, emptyRecycleBin } = useFileSystem();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = recycleBin.find((i) => i.id === selectedId);

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1 border-b border-[var(--win98-button-shadow)]">
        <Button98
          disabled={!selected}
          onClick={() => {
            if (selected) {
              restoreFromRecycleBin(selected.id);
              setSelectedId(null);
            }
          }}
        >
          Restore
        </Button98>
        <Button98
          disabled={recycleBin.length === 0}
          onClick={() => {
            playSound('emptyBin');
            emptyRecycleBin();
            setSelectedId(null);
          }}
        >
          Empty Recycle Bin
        </Button98>
      </div>

      {/* Item list */}
      <div className="flex-1 bg-white overflow-auto border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] m-1">
        {recycleBin.length === 0 ? (
          <div className="p-4 text-[var(--win98-disabled-text)] select-none">The Recycle Bin is empty.</div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Name', 'Original Location', 'Date Deleted', 'Size'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-2 py-[1px] bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-shadow)] border-r-[var(--win98-button-shadow)] font-normal select-none"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recycleBin.map((item) => (
                <tr
                  key={item.id}
                  className={cn('cursor-default select-none', selectedId === item.id && 'bg-[var(--win98-highlight)] text-white')}
                  onClick={() => setSelectedId(item.id)}
                  onDoubleClick={() => {
                    restoreFromRecycleBin(item.id);
                    setSelectedId(null);
                  }}
                >
                  <td className="px-2 py-[1px] flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.node.icon ?? '/icons/txt-16.svg'} alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                    {item.node.name}
                  </td>
                  <td className="px-2 py-[1px]">{item.originalPath.slice(0, item.originalPath.lastIndexOf('\\')) || 'C:\\'}</td>
                  <td className="px-2 py-[1px]">{item.deletedAt}</td>
                  <td className="px-2 py-[1px]">{item.node.size !== undefined ? formatSize(item.node.size) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <StatusBar98 panels={[{ content: `${recycleBin.length} object(s)` }]} />
    </div>
  );
}
