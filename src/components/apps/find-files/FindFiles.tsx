'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useFileOpener } from '@/hooks/useFileOpener';
import { Button98 } from '@/components/ui/Button98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { cn } from '@/lib/cn';
import { FSNode } from '@/types/filesystem';
import { formatSize } from '@/lib/filesystem';

interface SearchResult {
  path: string;
  node: FSNode;
}

export default function FindFiles({}: AppComponentProps) {
  const { root } = useFileSystem();
  const { openFile } = useFileOpener();
  const [namePattern, setNamePattern] = useState('');
  const [containingText, setContainingText] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const search = () => {
    const name = namePattern.trim().toLowerCase();
    const text = containingText.trim().toLowerCase();
    if (!name && !text) return;

    const found: SearchResult[] = [];
    const walk = (node: FSNode, path: string) => {
      for (const child of node.children ?? []) {
        const childPath = `${path}\\${child.name}`;
        const nameMatch = !name || child.name.toLowerCase().includes(name);
        const textMatch = !text || (child.content ?? '').toLowerCase().includes(text);
        if (nameMatch && textMatch && (child.type === 'file' || !text)) {
          found.push({ path: childPath, node: child });
        }
        if (child.type === 'directory') walk(child, childPath);
      }
    };
    walk(root, 'C:');
    setResults(found);
    setSelectedPath(null);
  };

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
            className="flex-1 h-[20px] px-1 bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] outline-none text-[11px]"
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
            className="flex-1 h-[20px] px-1 bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] outline-none text-[11px]"
          />
          <Button98
            className="min-w-[80px]"
            onClick={() => {
              setNamePattern('');
              setContainingText('');
              setResults(null);
            }}
          >
            New Search
          </Button98>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-[90px] select-none">Look in:</span>
          <span className="select-none">Local hard drives (C:)</span>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 bg-white overflow-auto border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] m-1">
        {results === null ? (
          <div className="p-4 text-[var(--win98-disabled-text)] select-none">
            Enter search criteria and click Find Now.
          </div>
        ) : results.length === 0 ? (
          <div className="p-4 select-none">There are no items to show in this view.</div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Name', 'In Folder', 'Size', 'Type'].map((h) => (
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
              {results.map(({ path, node }) => (
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
                  <td className="px-2 py-[1px]">{path.slice(0, path.lastIndexOf('\\')) || 'C:\\'}</td>
                  <td className="px-2 py-[1px]">{node.size !== undefined ? formatSize(node.size) : ''}</td>
                  <td className="px-2 py-[1px]">{node.type === 'directory' ? 'File Folder' : 'File'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <StatusBar98 panels={[{ content: results ? `${results.length} file(s) found` : 'Ready' }]} />
    </div>
  );
}
