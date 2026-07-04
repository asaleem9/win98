'use client';

import { useMemo, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useFileOpener } from '@/hooks/useFileOpener';
import { Button98 } from '@/components/ui/Button98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { cn } from '@/lib/cn';
import { formatSize } from '@/lib/filesystem';
import {
  searchFiles,
  sortResults,
  SearchCriteria,
  SearchHit,
  SortKey,
  SortDir,
} from './findUtils';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'folder', label: 'In Folder' },
  { key: 'size', label: 'Size' },
  { key: 'type', label: 'Type' },
  { key: 'modified', label: 'Modified' },
];

const INPUT_CLASS =
  'h-[20px] px-1 bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] outline-none text-[11px]';

function folderOf(path: string): string {
  const cut = path.lastIndexOf('\\');
  return cut > 0 ? path.slice(0, cut) : 'C:\\';
}

function formatModified(date: string): string {
  const t = Date.parse(date);
  return Number.isNaN(t) ? date : new Date(t).toLocaleDateString('en-US');
}

export default function FindFiles({}: AppComponentProps) {
  const { root } = useFileSystem();
  const { openFile } = useFileOpener();
  const [namePattern, setNamePattern] = useState('');
  const [containingText, setContainingText] = useState('');
  const [afterDate, setAfterDate] = useState('');
  const [beforeDate, setBeforeDate] = useState('');
  const [minKB, setMinKB] = useState('');
  const [maxKB, setMaxKB] = useState('');
  const [results, setResults] = useState<SearchHit[] | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const search = () => {
    const criteria: SearchCriteria = {
      name: namePattern.trim(),
      text: containingText.trim(),
      minKB: minKB.trim() ? Number(minKB) : undefined,
      maxKB: maxKB.trim() ? Number(maxKB) : undefined,
      after: afterDate || undefined,
      before: beforeDate || undefined,
    };
    const hasCriteria =
      !!criteria.name ||
      !!criteria.text ||
      criteria.minKB != null ||
      criteria.maxKB != null ||
      !!criteria.after ||
      !!criteria.before;
    if (!hasCriteria) return;
    setResults(searchFiles(root, criteria));
    setSelectedPath(null);
  };

  const newSearch = () => {
    setNamePattern('');
    setContainingText('');
    setAfterDate('');
    setBeforeDate('');
    setMinKB('');
    setMaxKB('');
    setResults(null);
    setSelectedPath(null);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(
    () => (results ? sortResults(results, sortKey, sortDir) : null),
    [results, sortKey, sortDir],
  );

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Search criteria */}
      <div className="p-2 flex flex-col gap-2 border-b border-[var(--win98-button-shadow)]">
        <div className="flex items-center gap-2">
          <label htmlFor="find-name" className="w-[90px] select-none">Named:</label>
          <input
            id="find-name"
            value={namePattern}
            onChange={(e) => setNamePattern(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="e.g. *.txt or report*"
            className={cn('flex-1', INPUT_CLASS)}
          />
          <Button98 onClick={search} className="min-w-[80px]">Find Now</Button98>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="find-text" className="w-[90px] select-none">Containing text:</label>
          <input
            id="find-text"
            value={containingText}
            onChange={(e) => setContainingText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className={cn('flex-1', INPUT_CLASS)}
          />
          <Button98 className="min-w-[80px]" onClick={newSearch}>New Search</Button98>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="find-after" className="w-[90px] select-none">Modified:</label>
          <input
            id="find-after"
            type="date"
            aria-label="Modified after"
            value={afterDate}
            onChange={(e) => setAfterDate(e.target.value)}
            className={INPUT_CLASS}
          />
          <span className="select-none">to</span>
          <input
            type="date"
            aria-label="Modified before"
            value={beforeDate}
            onChange={(e) => setBeforeDate(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="find-min" className="w-[90px] select-none">Size (KB):</label>
          <input
            id="find-min"
            type="number"
            min={0}
            aria-label="Minimum size in KB"
            placeholder="min"
            value={minKB}
            onChange={(e) => setMinKB(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className={cn('w-[80px]', INPUT_CLASS)}
          />
          <span className="select-none">to</span>
          <input
            type="number"
            min={0}
            aria-label="Maximum size in KB"
            placeholder="max"
            value={maxKB}
            onChange={(e) => setMaxKB(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className={cn('w-[80px]', INPUT_CLASS)}
          />
          <span className="ml-auto select-none text-[var(--win98-disabled-text)]">Look in: Local hard drives (C:)</span>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 bg-white overflow-auto border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] m-1">
        {sorted === null ? (
          <div className="p-4 text-[var(--win98-disabled-text)] select-none">
            Enter search criteria and click Find Now.
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-4 select-none">There are no items to show in this view.</div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="text-left px-2 py-[1px] bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-shadow)] border-r-[var(--win98-button-shadow)] font-normal select-none cursor-default"
                  >
                    {col.label}
                    {sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ path, node }) => (
                <tr
                  key={path}
                  className={cn('cursor-default select-none', selectedPath === path && 'bg-[var(--win98-highlight)] text-white')}
                  onClick={() => setSelectedPath(path)}
                  onDoubleClick={() => openFile(path)}
                >
                  <td className="px-2 py-[1px]">
                    <span className="flex items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={node.icon ?? '/icons/file-16.svg'} alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                      {node.name}
                    </span>
                  </td>
                  <td className="px-2 py-[1px]">{folderOf(path)}</td>
                  <td className="px-2 py-[1px]">{node.size !== undefined ? formatSize(node.size) : ''}</td>
                  <td className="px-2 py-[1px]">{node.type === 'directory' ? 'File Folder' : 'File'}</td>
                  <td className="px-2 py-[1px]">{formatModified(node.modified)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <StatusBar98 panels={[{ content: sorted ? `${sorted.length} file(s) found` : 'Ready' }]} />
    </div>
  );
}
