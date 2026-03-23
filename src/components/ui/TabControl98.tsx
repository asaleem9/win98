'use client';

import { useState, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabControl98Props {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function TabControl98({ tabs, defaultTab, className }: TabControl98Props) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-1 text-[11px] font-[family-name:var(--win98-font)]',
              'bg-[var(--win98-button-face)] cursor-default select-none',
              'border-2 border-solid relative',
              'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
              'border-r-[var(--win98-button-dark-shadow)]',
              'shadow-[inset_1px_1px_0_var(--win98-button-light)]',
              '-mr-[2px]',
              tab.id === activeTab
                ? 'border-b-[var(--win98-button-face)] z-10 pb-[6px] -mb-[2px]'
                : 'border-b-[var(--win98-button-dark-shadow)] bottom-0',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        className={cn(
          'border-2 border-solid',
          'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
          'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
          'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
          'bg-[var(--win98-button-face)] p-3',
        )}
      >
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
