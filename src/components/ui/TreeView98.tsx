'use client';

import { useState, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TreeNode {
  id: string;
  label: string;
  icon?: string;
  children?: TreeNode[];
  data?: unknown;
}

interface TreeView98Props {
  nodes: TreeNode[];
  onSelect?: (node: TreeNode) => void;
  selectedId?: string;
  className?: string;
}

export function TreeView98({ nodes, onSelect, selectedId, className }: TreeView98Props) {
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
      <div className="p-1">
        {nodes.map((node) => (
          <TreeItem key={node.id} node={node} onSelect={onSelect} selectedId={selectedId} depth={0} />
        ))}
      </div>
    </div>
  );
}

interface TreeItemProps {
  node: TreeNode;
  onSelect?: (node: TreeNode) => void;
  selectedId?: string;
  depth: number;
}

function TreeItem({ node, onSelect, selectedId, depth }: TreeItemProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-[1px] cursor-default select-none',
          isSelected && 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]',
        )}
        style={{ paddingLeft: depth * 16 }}
        onClick={() => onSelect?.(node)}
        onDoubleClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-[9px] h-[9px] border border-[var(--win98-button-shadow)] bg-white flex items-center justify-center text-[9px] leading-none flex-shrink-0"
          >
            {expanded ? '−' : '+'}
          </button>
        ) : (
          <span className="w-[9px] h-[9px] flex-shrink-0" />
        )}
        {node.icon && (
          <img src={node.icon} alt="" className="w-4 h-4 flex-shrink-0" style={{ imageRendering: 'pixelated' }} />
        )}
        <span className="truncate">{node.label}</span>
      </div>
      {expanded && hasChildren && (
        <div className="relative">
          <div
            className="absolute top-0 bottom-0 border-l border-dotted border-[var(--win98-button-shadow)]"
            style={{ left: depth * 16 + 4 }}
          />
          {node.children!.map((child) => (
            <TreeItem key={child.id} node={child} onSelect={onSelect} selectedId={selectedId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
