'use client';

import { useEffect, useState } from 'react';
import { Dialog98 } from '@/components/ui/Dialog98';
import { playSound } from '@/lib/sounds';

interface SystemDialog {
  id: number;
  title: string;
  message: string;
}

let dialogCounter = 0;

/**
 * Renders error/info dialogs dispatched globally via the `win98-system-dialog`
 * CustomEvent ({ detail: { title, message } }). Lets any app or hook surface
 * an authentic system dialog without prop drilling.
 */
export function SystemDialogs() {
  const [dialogs, setDialogs] = useState<SystemDialog[]>([]);

  useEffect(() => {
    const onDialog = (e: Event) => {
      const detail = (e as CustomEvent<{ title?: string; message?: string }>).detail;
      if (!detail?.message) return;
      playSound('error');
      setDialogs((prev) => [
        ...prev,
        { id: ++dialogCounter, title: detail.title ?? 'Windows', message: detail.message! },
      ]);
    };
    window.addEventListener('win98-system-dialog', onDialog);
    return () => window.removeEventListener('win98-system-dialog', onDialog);
  }, []);

  if (dialogs.length === 0) return null;

  return (
    <>
      {dialogs.map((dialog, i) => (
        <div
          key={dialog.id}
          className="fixed inset-0 z-[9000] flex items-center justify-center"
          style={{ paddingTop: i * 24, paddingLeft: i * 24 }}
        >
          <Dialog98
            title={dialog.title}
            icon="error"
            message={<span className="whitespace-pre-wrap">{dialog.message}</span>}
            buttons={[
              {
                label: 'OK',
                default: true,
                onClick: () => setDialogs((prev) => prev.filter((d) => d.id !== dialog.id)),
              },
            ]}
            className="min-w-[320px] max-w-[420px] shadow-lg"
          />
        </div>
      ))}
    </>
  );
}
