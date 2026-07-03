'use client';

import { useState, useMemo, useCallback } from 'react';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { normalizePath, joinPath } from '@/lib/fs/fsOperations';
import { getParentPath } from '@/lib/filesystem';
import { Button98 } from '@/components/ui/Button98';
import { Select98 } from '@/components/ui/Select98';

export interface FilePickerFilter {
  label: string;
  /** Lowercase extensions without the dot, e.g. ['htm','html']. Empty = all files. */
  extensions: string[];
}

export interface FilePickerDialogProps {
  mode: 'open' | 'save';
  /** Lowercase extensions to show (without the dot), e.g. ['txt','log']. Empty = show all files. */
  extensions?: string[];
  /** Authentic "Files of type:" dropdown. Each entry drives the visible-file filter. */
  filters?: FilePickerFilter[];
  /** Appended on save when the typed name doesn't already carry an allowed extension. */
  defaultExtension?: string;
  /** Directory to start browsing in. Defaults to C:\My Documents. */
  startDir?: string;
  /** Pre-filled filename for Save dialogs. */
  defaultName?: string;
  title?: string;
  onConfirm: (fullPath: string) => void;
  onCancel: () => void;
}

const DEFAULT_DIR = 'C:\\My Documents';

function fileExt(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function FilePickerDialog({
  mode,
  extensions,
  filters,
  defaultExtension,
  startDir,
  defaultName = '',
  title,
  onConfirm,
  onCancel,
}: FilePickerDialogProps) {
  const { listDir, getNode } = useFileSystem();
  const [currentDir, setCurrentDir] = useState(() => {
    const target = normalizePath(startDir || DEFAULT_DIR);
    return getNode(target)?.type === 'directory' ? target : 'C:\\';
  });
  const [fileName, setFileName] = useState(defaultName);
  const [filterIndex, setFilterIndex] = useState(0);

  // The active extension filter comes from the selected "Files of type:" entry
  // when filters are supplied, otherwise the legacy `extensions` prop.
  const activeExtensions = useMemo(() => {
    if (filters && filters.length > 0) return filters[filterIndex]?.extensions ?? [];
    return extensions ?? [];
  }, [filters, filterIndex, extensions]);

  const entries = useMemo(() => {
    const nodes = listDir(currentDir) ?? [];
    const showAll = activeExtensions.length === 0;
    return nodes
      .filter((n) => n.type === 'directory' || showAll || activeExtensions.includes(fileExt(n.name)))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
  }, [listDir, currentDir, activeExtensions]);

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
    // If the typed name looks like a directory that exists, navigate into it.
    const candidate = getNode(joinPath(currentDir, name));
    if (candidate?.type === 'directory') {
      setCurrentDir(joinPath(currentDir, name));
      setFileName('');
      return;
    }
    if (mode === 'save') {
      if (defaultExtension) {
        // Append the default extension unless the name already carries an allowed one.
        if (!activeExtensions.includes(fileExt(name))) name = `${name}.${defaultExtension}`;
      } else if (activeExtensions.length > 0 && !fileExt(name)) {
        // Legacy behavior: fill in the first extension only when none was typed.
        name = `${name}.${activeExtensions[0]}`;
      }
    }
    onConfirm(joinPath(currentDir, name));
  }, [fileName, currentDir, getNode, mode, defaultExtension, activeExtensions, onConfirm]);

  const heading = title ?? (mode === 'open' ? 'Open' : 'Save As');
  const confirmLabel = mode === 'open' ? 'Open' : 'Save';

  return (
    <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20 font-[family-name:var(--win98-font)] text-[11px]">
      <div className="w-[380px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]">
        {/* Title bar */}
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
          {/* Location bar */}
          <div className="flex items-center gap-1">
            <span className="select-none">Look in:</span>
            <div className="flex-1 win98-sunken bg-white h-[18px] flex items-center px-1 truncate">{currentDir}</div>
            <Button98 variant="flat" className="min-w-0 px-2 h-[20px]" onClick={goUp} disabled={!canGoUp} aria-label="Up one level">
              ⬆
            </Button98>
          </div>

          {/* File list */}
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

          {/* Filename row */}
          <div className="flex items-center gap-1">
            <span className="w-[72px] select-none">File name:</span>
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
              {confirmLabel}
            </Button98>
          </div>

          {/* Files of type row */}
          {filters && filters.length > 0 ? (
            <div className="flex items-center gap-1">
              <span className="w-[72px] select-none">Files of type:</span>
              <Select98
                className="flex-1 h-[18px]"
                value={filterIndex}
                onChange={(e) => setFilterIndex(Number(e.target.value))}
              >
                {filters.map((f, i) => (
                  <option key={f.label} value={i}>
                    {f.label}
                  </option>
                ))}
              </Select98>
              <Button98 className="min-w-[64px] h-[20px]" onClick={onCancel}>
                Cancel
              </Button98>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button98 className="min-w-[64px] h-[20px]" onClick={onCancel}>
                Cancel
              </Button98>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
