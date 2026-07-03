'use client';

import { useState, useRef, useEffect, MouseEvent } from 'react';
import { cn } from '@/lib/cn';
import { ListViewMode } from '@/components/ui/ListView98';

export interface FileRow {
  id: string; // full path
  name: string;
  icon: string;
  icon16: string;
  type: string;
  size: string;
  modified: string;
  isDir: boolean;
}

interface FileListProps {
  rows: FileRow[];
  mode: ListViewMode;
  selected: Set<string>;
  renamingId: string | null;
  columns: { key: string; label: string; width?: number }[];
  onSelectClick: (id: string, e: MouseEvent) => void;
  onOpen: (id: string) => void;
  onContextMenu: (id: string | null, e: MouseEvent) => void;
  onRenameCommit: (id: string, newName: string) => void;
  onRenameCancel: () => void;
  onBackgroundClick: () => void;
}

export function FileList({
  rows,
  mode,
  selected,
  renamingId,
  columns,
  onSelectClick,
  onOpen,
  onContextMenu,
  onRenameCommit,
  onRenameCancel,
  onBackgroundClick,
}: FileListProps) {
  return (
    <div
      className={cn(
        'flex-1 bg-white overflow-auto',
        'border-2 border-solid',
        'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
        'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
      )}
      onClick={(e) => { if (e.target === e.currentTarget) onBackgroundClick(); }}
      onContextMenu={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); onContextMenu(null, e); } }}
    >
      {mode === 'details' && (
        <div className="flex border-b border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)] sticky top-0 z-10">
          {columns.map((col) => (
            <div
              key={col.key}
              className="px-2 py-[2px] border-r border-solid border-r-[var(--win98-button-shadow)] font-normal select-none cursor-default"
              style={{ width: col.width || 120 }}
            >
              {col.label}
            </div>
          ))}
        </div>
      )}
      <div
        className={cn(
          'p-1',
          mode === 'large-icons' && 'flex flex-wrap gap-2 content-start',
          mode === 'small-icons' && 'flex flex-wrap gap-0 content-start',
          (mode === 'list' || mode === 'details') && 'flex flex-col',
        )}
        onClick={(e) => { if (e.target === e.currentTarget) onBackgroundClick(); }}
      >
        {rows.map((row) => (
          <FileCell
            key={row.id}
            row={row}
            mode={mode}
            columns={columns}
            isSelected={selected.has(row.id)}
            isRenaming={renamingId === row.id}
            onSelectClick={onSelectClick}
            onOpen={onOpen}
            onContextMenu={onContextMenu}
            onRenameCommit={onRenameCommit}
            onRenameCancel={onRenameCancel}
          />
        ))}
      </div>
    </div>
  );
}

function FileCell({
  row,
  mode,
  columns,
  isSelected,
  isRenaming,
  onSelectClick,
  onOpen,
  onContextMenu,
  onRenameCommit,
  onRenameCancel,
}: {
  row: FileRow;
  mode: ListViewMode;
  columns: { key: string; label: string; width?: number }[];
  isSelected: boolean;
  isRenaming: boolean;
  onSelectClick: (id: string, e: MouseEvent) => void;
  onOpen: (id: string) => void;
  onContextMenu: (id: string | null, e: MouseEvent) => void;
  onRenameCommit: (id: string, newName: string) => void;
  onRenameCancel: () => void;
}) {
  const handleClick = (e: MouseEvent) => { e.stopPropagation(); onSelectClick(row.id, e); };
  const handleContext = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); onContextMenu(row.id, e); };
  const handleDouble = (e: MouseEvent) => { e.stopPropagation(); onOpen(row.id); };

  const label = isRenaming ? (
    <RenameInput initial={row.name} onCommit={(v) => onRenameCommit(row.id, v)} onCancel={onRenameCancel} />
  ) : (
    <span className={cn(mode === 'large-icons' ? 'text-center break-words max-w-[68px] leading-tight' : 'truncate', isSelected && 'bg-[var(--win98-highlight)] text-white px-[2px]')}>
      {row.name}
    </span>
  );

  if (mode === 'large-icons') {
    return (
      <div className="flex flex-col items-center w-[70px] p-1 cursor-default select-none" onClick={handleClick} onDoubleClick={handleDouble} onContextMenu={handleContext}>
        <div className={cn('p-[2px]', isSelected && 'bg-[var(--win98-highlight)]')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.icon} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
        </div>
        <div className="mt-[2px]">{label}</div>
      </div>
    );
  }

  if (mode === 'details') {
    return (
      <div className={cn('flex items-center cursor-default select-none', isSelected && 'bg-[var(--win98-highlight)] text-white')} onClick={handleClick} onDoubleClick={handleDouble} onContextMenu={handleContext}>
        {columns.map((col) => (
          <div key={col.key} className="px-2 py-[1px] truncate flex items-center gap-1" style={{ width: col.width || 120 }}>
            {col.key === 'name' && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.icon16} alt="" className="w-4 h-4 flex-shrink-0" style={{ imageRendering: 'pixelated' }} />
                {isRenaming ? label : row.name}
              </>
            )}
            {col.key !== 'name' && (row[col.key as keyof FileRow] as string)}
          </div>
        ))}
      </div>
    );
  }

  // list + small-icons
  return (
    <div
      className={cn('flex items-center gap-1 px-1 py-[1px] cursor-default select-none', mode === 'list' ? 'w-[160px]' : 'w-[200px]', isSelected && !isRenaming && 'bg-[var(--win98-highlight)] text-white')}
      onClick={handleClick}
      onDoubleClick={handleDouble}
      onContextMenu={handleContext}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={row.icon16} alt="" className="w-4 h-4 flex-shrink-0" style={{ imageRendering: 'pixelated' }} />
      {isRenaming ? label : <span className="truncate">{row.name}</span>}
    </div>
  );
}

function RenameInput({ initial, onCommit, onCancel }: { initial: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const dot = initial.lastIndexOf('.');
    el.setSelectionRange(0, dot > 0 ? dot : initial.length);
  }, [initial]);

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={() => onCommit(value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') onCommit(value);
        else if (e.key === 'Escape') onCancel();
      }}
      className="text-[11px] px-[1px] border border-solid border-black bg-white text-black w-[90px] outline-none"
    />
  );
}
