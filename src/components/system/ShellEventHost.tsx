'use client';

import { useEffect, useState } from 'react';
import { useFileOpener } from '@/hooks/useFileOpener';
import { RunDialog } from './RunDialog';

/**
 * Bridges global shell events to context-bound actions:
 * - `win98-run-dialog` shows the Run... dialog
 * - `win98-open-file` ({ detail: { path } }) opens a file in its associated app
 * Must render inside WindowProvider + FileSystemProvider.
 */
export function ShellEventHost() {
  const [runOpen, setRunOpen] = useState(false);
  const { openFile } = useFileOpener();

  useEffect(() => {
    const onRun = () => setRunOpen(true);
    const onOpenFile = (e: Event) => {
      const detail = (e as CustomEvent<{ path?: string }>).detail;
      if (detail?.path) openFile(detail.path);
    };
    window.addEventListener('win98-run-dialog', onRun);
    window.addEventListener('win98-open-file', onOpenFile);
    return () => {
      window.removeEventListener('win98-run-dialog', onRun);
      window.removeEventListener('win98-open-file', onOpenFile);
    };
  }, [openFile]);

  if (!runOpen) return null;
  return <RunDialog onClose={() => setRunOpen(false)} />;
}
