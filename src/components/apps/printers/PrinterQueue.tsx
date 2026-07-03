'use client';

import { useEffect, useMemo, useState } from 'react';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { ListView98 } from '@/components/ui/ListView98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import {
  subscribeQueue,
  cancelJob,
  cancelAll,
  pauseJob,
  resumeJob,
  setPrinterPaused,
  getPrinter,
} from '@/lib/print/printService';
import type { PrintJob, QueueSnapshot } from '@/lib/print/types';

interface PrinterQueueProps {
  printerId: string;
  windowId?: string;
  onBack: () => void;
}

function statusLabel(job: PrintJob, paused: boolean): string {
  if (paused && job.status !== 'done') return 'Paused - Printing';
  switch (job.status) {
    case 'printing': return 'Printing';
    case 'pending': return 'Spooling';
    case 'paused': return 'Paused';
    case 'done': return 'Printed';
    default: return '';
  }
}

function progressLabel(job: PrintJob): string {
  if (job.status === 'pending') return `${job.totalPages} page(s)`;
  return `${job.currentPage} of ${job.totalPages}`;
}

function startedLabel(job: PrintJob): string {
  return new Date(job.submittedAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function PrinterQueue({ printerId, windowId, onBack }: PrinterQueueProps) {
  const [snap, setSnap] = useState<QueueSnapshot>({ jobs: [], printersPaused: {} });
  const [selectedId, setSelectedId] = useState<string | undefined>();

  useEffect(() => subscribeQueue(setSnap), []);

  const printer = getPrinter(printerId);
  const paused = !!snap.printersPaused[printerId];
  const jobs = useMemo(() => snap.jobs.filter((j) => j.printerId === printerId), [snap, printerId]);
  const selected = jobs.find((j) => j.id === selectedId);

  const items = jobs.map((job) => ({
    id: job.id,
    name: job.documentName,
    icon16: '/icons/printer-16.svg',
    status: statusLabel(job, paused),
    owner: job.owner,
    progress: progressLabel(job),
    started: startedLabel(job),
  }));

  const menus: MenuDefinition[] = [
    {
      label: '&Printer',
      items: [
        { label: 'Pause Printing', checked: paused, onClick: () => setPrinterPaused(printerId, !paused) },
        { label: 'Cancel All Documents', onClick: () => cancelAll(printerId), disabled: jobs.length === 0 },
        { label: '', separator: true },
        { label: 'Close', onClick: onBack },
      ],
    },
    {
      label: '&Document',
      items: [
        {
          label: 'Pause',
          onClick: () => selected && pauseJob(selected.id),
          disabled: !selected || selected.status === 'paused' || selected.status === 'done',
        },
        {
          label: 'Resume',
          onClick: () => selected && resumeJob(selected.id),
          disabled: !selected || selected.status !== 'paused',
        },
        { label: '', separator: true },
        { label: 'Cancel', onClick: () => selected && cancelJob(selected.id), disabled: !selected },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)]">
      <MenuBar menus={menus} windowId={windowId} />
      <ListView98
        mode="details"
        className="flex-1"
        items={items}
        selectedId={selectedId}
        onSelect={(item) => setSelectedId(item.id)}
        columns={[
          { key: 'name', label: 'Document Name', width: 150 },
          { key: 'status', label: 'Status', width: 90 },
          { key: 'owner', label: 'Owner', width: 90 },
          { key: 'progress', label: 'Progress', width: 90 },
          { key: 'started', label: 'Started At', width: 90 },
        ]}
      />
      <StatusBar98
        panels={[
          { content: paused ? 'Paused' : `${jobs.length} document(s) in queue` },
          { content: printer?.port ?? '', width: 80 },
        ]}
      />
    </div>
  );
}
