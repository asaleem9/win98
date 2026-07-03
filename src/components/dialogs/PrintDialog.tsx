'use client';

import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ManagedDialog } from '@/components/window/ManagedDialog';
import { Button98 } from '@/components/ui/Button98';
import { GroupBox98 } from '@/components/ui/GroupBox98';
import { Radio98 } from '@/components/ui/Radio98';
import { Checkbox98 } from '@/components/ui/Checkbox98';
import { Select98 } from '@/components/ui/Select98';
import { Input98 } from '@/components/ui/Input98';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { getPrinters, submitPrintJob, setPrintDeps } from '@/lib/print/printService';
import { renderJobPages } from '@/lib/print/pageRenderer';
import type { PrintContent } from '@/lib/print/types';

const OUTPUT_DIR = 'C:\\My Documents\\Printed Documents';

interface PrintDialogProps {
  ownerId: string;
  appName: string;
  documentName: string;
  getContent: () => PrintContent | null;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 leading-[16px]">
      <span className="w-[54px] shrink-0 text-right select-none">{label}</span>
      <span className="flex-1 truncate">{children}</span>
    </div>
  );
}

export function PrintDialog({ ownerId, appName, documentName, getContent, onClose }: PrintDialogProps) {
  const printers = useMemo(() => getPrinters(), []);
  const [printerId, setPrinterId] = useState(printers[0]?.id ?? '');
  const [copies, setCopies] = useState(1);
  const [rangeMode, setRangeMode] = useState<'all' | 'pages'>('all');
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  const [toFile, setToFile] = useState(false);

  const printer = printers.find((p) => p.id === printerId) ?? printers[0];

  const rangeValid = rangeMode === 'all' || (fromPage >= 1 && toPage >= fromPage);
  const canPrint = !!printer && rangeValid && copies >= 1;

  const handlePrint = useCallback(() => {
    if (!canPrint) return;
    const content = getContent();
    if (!content) {
      onClose();
      return;
    }
    submitPrintJob({ appName, documentName, content, printerId, copies, toFile });
    onClose();
  }, [canPrint, getContent, onClose, appName, documentName, printerId, copies, toFile]);

  const fieldBorder =
    'border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]';

  return (
    <ManagedDialog ownerId={ownerId} title="Print" width={400} height={336} modal onClose={onClose}>
      <div className="flex flex-col h-full p-3 gap-2 font-[family-name:var(--win98-font)] text-[11px]">
        <GroupBox98 label="Printer">
          <div className="flex flex-col gap-[3px] pt-1">
            <div className="flex items-center gap-2">
              <span className="w-[54px] shrink-0 text-right select-none">Name:</span>
              <Select98
                aria-label="Printer name"
                value={printerId}
                onChange={(e) => setPrinterId(e.target.value)}
                className="flex-1"
              >
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select98>
              <Button98 disabled className="min-w-[70px] h-[20px]">Properties</Button98>
            </div>
            <Row label="Status:">Ready</Row>
            <Row label="Type:">{printer?.name}</Row>
            <Row label="Where:">{printer?.port}</Row>
            <div className="flex items-center justify-end pt-[2px]">
              <Checkbox98
                label="Print to file"
                checked={toFile}
                onChange={(e) => setToFile(e.target.checked)}
              />
            </div>
          </div>
        </GroupBox98>

        <div className="flex gap-2">
          <GroupBox98 label="Print range" className="flex-1">
            <div className="flex flex-col gap-[4px] pt-1">
              <Radio98
                name="print-range"
                label="All"
                checked={rangeMode === 'all'}
                onChange={() => setRangeMode('all')}
              />
              <div className="flex items-center gap-1">
                <Radio98
                  name="print-range"
                  label="Pages"
                  checked={rangeMode === 'pages'}
                  onChange={() => setRangeMode('pages')}
                />
                <span className="ml-1 select-none">from:</span>
                <Input98
                  aria-label="From page"
                  type="number"
                  min={1}
                  value={fromPage}
                  disabled={rangeMode !== 'pages'}
                  onChange={(e) => setFromPage(Math.max(1, Number(e.target.value) || 1))}
                  className="w-[38px] h-[18px]"
                />
                <span className="select-none">to:</span>
                <Input98
                  aria-label="To page"
                  type="number"
                  min={1}
                  value={toPage}
                  disabled={rangeMode !== 'pages'}
                  onChange={(e) => setToPage(Math.max(1, Number(e.target.value) || 1))}
                  className="w-[38px] h-[18px]"
                />
              </div>
              {!rangeValid && (
                <span className="text-[var(--win98-minesweeper-red,#ff0000)] leading-[12px]">
                  This is not a valid page range.
                </span>
              )}
            </div>
          </GroupBox98>

          <GroupBox98 label="Copies" className="w-[130px]">
            <div className="flex items-center gap-2 pt-1">
              <span className="select-none">Copies:</span>
              <Input98
                aria-label="Number of copies"
                type="number"
                min={1}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
                className={`w-[46px] h-[18px] ${fieldBorder}`}
              />
            </div>
          </GroupBox98>
        </div>

        <div className="flex-1" />
        <div className="flex justify-end gap-2">
          <Button98 onClick={handlePrint} disabled={!canPrint} className="ring-1 ring-black">OK</Button98>
          <Button98 onClick={onClose}>Cancel</Button98>
        </div>
      </div>
    </ManagedDialog>
  );
}

/**
 * Wire the virtual filesystem + page renderer into the spooler so completed
 * jobs land in "Printed Documents". Safe to mount from any print-capable app or
 * from the Printers folder; the last mount to run wins and the FS write closures
 * dispatch through stable reducer actions, so a stale reference still works.
 */
export function usePrintWiring() {
  const { getNode, writeFile, createFolder } = useFileSystem();

  useEffect(() => {
    setPrintDeps({
      writeFile: (path, content) => {
        writeFile(path, content);
      },
      ensureDir: (dirPath) => {
        if (getNode(dirPath)) return;
        const parts = dirPath.split('\\');
        const name = parts.pop()!;
        const parent = parts.join('\\');
        if (getNode(parent)) createFolder(parent, name);
      },
      renderPages: (job) => renderJobPages(job),
    });
  }, [getNode, writeFile, createFolder]);
}

/**
 * App-facing print hook. Wires the spooler (via usePrintWiring) and hands back
 * an openPrint(getContent, documentName) trigger plus the dialog element to
 * mount.
 */
export function usePrint(windowId: string, appName: string) {
  usePrintWiring();

  const [pending, setPending] = useState<null | { getContent: () => PrintContent | null; documentName: string }>(null);

  const openPrint = useCallback((getContent: () => PrintContent | null, documentName: string) => {
    setPending({ getContent, documentName });
  }, []);

  const printDialog = pending ? (
    <PrintDialog
      ownerId={windowId}
      appName={appName}
      documentName={pending.documentName}
      getContent={pending.getContent}
      onClose={() => setPending(null)}
    />
  ) : null;

  return { openPrint, printDialog, outputDir: OUTPUT_DIR };
}
