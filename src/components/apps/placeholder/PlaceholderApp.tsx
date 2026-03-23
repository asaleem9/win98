'use client';

import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';

export default function PlaceholderApp({ windowId }: AppComponentProps) {
  const { windows } = useWindows();
  const win = windows.find((w) => w.id === windowId);

  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <div className="text-center">
        <div className="text-lg mb-2">{win?.title || 'Application'}</div>
        <div className="text-[var(--win98-disabled-text)]">This application is loading...</div>
      </div>
    </div>
  );
}
