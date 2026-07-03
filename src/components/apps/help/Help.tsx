'use client';

import { useState, ReactNode } from 'react';
import { AppComponentProps } from '@/types/app';
import { cn } from '@/lib/cn';
import { helpTopics } from './helpContent';

// Render a markdown-lite body: blocks split on blank lines; a block whose lines
// all start with "- " becomes a bullet list, everything else a paragraph.
function renderHelpBody(body: string): ReactNode {
  const blocks = body.trim().split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const lines = block.split('\n');
    if (lines.every((line) => line.startsWith('- '))) {
      return (
        <ul key={i} className="list-disc pl-5 space-y-1 mb-2">
          {lines.map((line, j) => (
            <li key={j}>{line.slice(2)}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="mb-2">
        {block}
      </p>
    );
  });
}

export default function Help({}: AppComponentProps) {
  const [selectedId, setSelectedId] = useState('welcome');
  const topic = helpTopics.find((t) => t.id === selectedId) ?? helpTopics[0];

  return (
    <div className="flex-1 flex bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Topic list */}
      <div className="w-[180px] flex-shrink-0 m-1 bg-white overflow-auto border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
        {helpTopics.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedId(t.id)}
            className={cn(
              'flex items-center gap-1 w-full px-2 py-[3px] text-left cursor-default select-none',
              selectedId === t.id ? 'bg-[var(--win98-highlight)] text-white' : 'hover:bg-[var(--win98-button-face)]',
            )}
          >
            <span>📖</span>
            <span>{t.title}</span>
          </button>
        ))}
      </div>

      {/* Topic content */}
      <div className="flex-1 m-1 ml-0 p-3 bg-white overflow-auto border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] text-[12px] leading-relaxed">
        <h2 className="text-[14px] font-bold mb-2">{topic.title}</h2>
        {renderHelpBody(topic.body)}
      </div>
    </div>
  );
}
