'use client';

import { cn } from '@/lib/cn';

export type ListViewMode = 'large-icons' | 'small-icons' | 'list' | 'details';

export interface ListItem {
  id: string;
  name: string;
  icon?: string;
  icon16?: string;
  type?: string;
  size?: string;
  modified?: string;
  data?: unknown;
}

interface ListView98Props {
  items: ListItem[];
  mode?: ListViewMode;
  selectedId?: string;
  onSelect?: (item: ListItem) => void;
  onDoubleClick?: (item: ListItem) => void;
  columns?: { key: string; label: string; width?: number }[];
  className?: string;
}

export function ListView98({
  items,
  mode = 'large-icons',
  selectedId,
  onSelect,
  onDoubleClick,
  columns,
  className,
}: ListView98Props) {
  return (
    <div
      className={cn(
        'bg-white overflow-auto',
        'border-2 border-solid',
        'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
        'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
        'shadow-[inset_-1px_-1px_0_var(--win98-button-light),inset_1px_1px_0_var(--win98-button-dark-shadow)]',
        'font-[family-name:var(--win98-font)] text-[11px]',
        className,
      )}
    >
      {mode === 'details' && columns && (
        <div className="flex border-b border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)] sticky top-0">
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                'px-2 py-[2px] border-r border-solid',
                'border-r-[var(--win98-button-shadow)]',
                'font-normal select-none cursor-default',
              )}
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
          mode === 'list' && 'flex flex-col',
          mode === 'details' && 'flex flex-col',
        )}
      >
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect?.(item)}
            onDoubleClick={() => onDoubleClick?.(item)}
            className={cn(
              'cursor-default select-none',
              mode === 'large-icons' && [
                'flex flex-col items-center w-[70px] p-1',
                selectedId === item.id && 'text-[var(--win98-highlight-text)]',
              ],
              mode === 'small-icons' && [
                'flex items-center gap-1 px-1 py-[1px] w-[200px]',
                selectedId === item.id && 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]',
              ],
              mode === 'list' && [
                'flex items-center gap-1 px-1 py-[1px]',
                selectedId === item.id && 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]',
              ],
              mode === 'details' && [
                'flex items-center',
                selectedId === item.id && 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]',
              ],
            )}
          >
            {mode === 'large-icons' ? (
              <>
                <div className={cn('p-[2px]', selectedId === item.id && 'bg-[var(--win98-highlight)]')}>
                  {item.icon && (
                    <img src={item.icon} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
                  )}
                </div>
                <span
                  className={cn(
                    'text-center text-[10px] leading-tight mt-[2px] break-words max-w-[68px]',
                    selectedId === item.id && 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)] px-[2px]',
                  )}
                >
                  {item.name}
                </span>
              </>
            ) : mode === 'details' && columns ? (
              columns.map((col) => (
                <div key={col.key} className="px-2 py-[1px] truncate flex items-center gap-1" style={{ width: col.width || 120 }}>
                  {col.key === 'name' && item.icon16 && (
                    <img src={item.icon16} alt="" className="w-4 h-4 flex-shrink-0" style={{ imageRendering: 'pixelated' }} />
                  )}
                  {(item as unknown as Record<string, unknown>)[col.key] as string}
                </div>
              ))
            ) : (
              <>
                {item.icon16 && (
                  <img src={item.icon16} alt="" className="w-4 h-4 flex-shrink-0" style={{ imageRendering: 'pixelated' }} />
                )}
                <span className="truncate">{item.name}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
