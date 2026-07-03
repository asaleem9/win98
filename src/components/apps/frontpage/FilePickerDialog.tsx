'use client';

import { useState, useMemo, useCallback } from 'react';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { normalizePath, joinPath } from '@/lib/fs/fsOperations';
import { getParentPath } from '@/lib/filesystem';
import { Button98 } from '@/components/ui/Button98';
import { ensureHtmlExtension } from './frontpageHelpers';

export interface FilePickerDialogProps {
  mode: 'open' | 'save';
  startDir?: string;
  defaultName?: string;
  title?: string;
  onConfirm: (fullPath: string) => void;
  onCancel: () => void;
}

const DEFAULT_DIR = 'C:\\My Documents';
const EXTENSIONS = ['htm', 'html'];

function fileExt(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function FilePickerDialog({ mode, startDir, defaultName = '', title, onConfirm, onCancel }: FilePickerDialogProps) {
  const { listDir, getNode } = useFileSystem();
  const [currentDir, setCurrentDir] = useState(() => {
    const target = normalizePath(startDir || DEFAULT_DIR);
    return getNode(target)?.type === 'directory' ? target : 'C:\\';
  });
  const [fileName, setFileName] = useState(defaultName);

  const entries = useMemo(() => {
    const nodes = listDir(currentDir) ?? [];
    return nodes
      .filter((n) => n.type === 'directory' || EXTENSIONS.includes(fileExt(n.name)))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
  }, [listDir, currentDir]);

  const canGoUp = normalizePath(currentDir) !== 'C:\\';

  const goUp = useCallback(() => {
    setCurrentDir(getParentPath(currentDir));
  }, [currentDir]);

  const handleEntryClick = useCallback((name: string, isDir: boolean) => {
    if (isDir) return;
    setFileName(name);
  }, []);

  const handleEntryDouble = useCallback(
    (name: string, isDir: boolean) => {
      if (isDir) {
        setCurrentDir(joinPath(currentDir, name));
        return;
      }
      onConfirm(joinPath(currentDir, name));
    },
    [currentDir, onConfirm],
  );

  const handleConfirm = useCallback(() => {
    let name = fileName.trim();
    if (!name) return;
    const candidate = getNode(joinPath(currentDir, name));
    if (candidate?.type === 'directory') {
      setCurrentDir(joinPath(currentDir, name));
      setFileName('');
      return;
    }
    if (mode === 'save') name = ensureHtmlExtension(name);
    onConfirm(joinPath(currentDir, name));
  }, [fileName, currentDir, getNode, mode, onConfirm]);

  const heading = title ?? (mode === 'open' ? 'Open' : 'Save As');

  return (
    <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20 font-[family-name:var(--win98-font)] text-[11px]">
      <div className="w-[380px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]">
        <div className="flex items-center justify-between h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white font-bold select-none">
          <span>{heading}</span>
          <button
            className="w-[16px] h-[14px] flex items-center justify-center bg-[var(--win98-button-face)] text-black border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] text-[9px] leading-none"
            onClick={onCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-2 flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <span className="select-none">Look in:</span>
            <div className="flex-1 win98-sunken bg-white h-[18px] flex items-center px-1 truncate">{currentDir}</div>
            <Button98 variant="flat" className="min-w-0 px-2 h-[20px]" onClick={goUp} disabled={!canGoUp} aria-label="Up one level">
              ⬆
            </Button98>
          </div>

          <div className="h-[160px] overflow-auto bg-white border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
            {entries.length === 0 ? (
              <div className="p-2 text-[var(--win98-disabled-text)] select-none">(empty)</div>
            ) : (
              entries.map((n) => {
                const isDir = n.type === 'directory';
                const selected = !isDir && n.name === fileName;
                return (
                  <div
                    key={n.name}
                    className={`flex items-center gap-1 px-1 h-[18px] cursor-default select-none ${
                      selected ? 'bg-[var(--win98-highlight)] text-white' : ''
                    }`}
                    onClick={() => handleEntryClick(n.name, isDir)}
                    onDoubleClick={() => handleEntryDouble(n.name, isDir)}
                  >
                    <span>{isDir ? '📁' : '📄'}</span>
                    <span className="truncate">{n.name}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="w-[64px] select-none">File name:</span>
            <input
              className="flex-1 win98-sunken bg-white h-[18px] px-1 outline-none"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
                if (e.key === 'Escape') onCancel();
              }}
              autoFocus
            />
            <Button98 className="min-w-[64px] h-[20px]" onClick={handleConfirm}>
              {mode === 'open' ? 'Open' : 'Save'}
            </Button98>
          </div>
          <div className="flex justify-end">
            <Button98 className="min-w-[64px] h-[20px]" onClick={onCancel}>
              Cancel
            </Button98>
          </div>
        </div>
      </div>
    </div>
  );
}
