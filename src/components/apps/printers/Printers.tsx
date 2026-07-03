'use client';

import { useEffect, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { ListView98, ListItem } from '@/components/ui/ListView98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { getPrinters } from '@/lib/print/printService';
import { usePrintWiring } from '@/components/dialogs/PrintDialog';
import { AddPrinterWizard } from './AddPrinterWizard';
import { PrinterQueue } from './PrinterQueue';

const ADD_PRINTER_ID = '__add-printer__';

export default function Printers({ windowId }: AppComponentProps) {
  const { updateTitle, closeWindow } = useWindows();
  usePrintWiring();

  const printers = getPrinters();
  const [view, setView] = useState<{ mode: 'folder' } | { mode: 'queue'; printerId: string }>({ mode: 'folder' });
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (view.mode === 'queue') {
      const p = printers.find((pr) => pr.id === view.printerId);
      updateTitle(windowId, p ? p.name : 'Printers');
    } else {
      updateTitle(windowId, 'Printers');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, windowId]);

  if (view.mode === 'queue') {
    return (
      <PrinterQueue
        printerId={view.printerId}
        windowId={windowId}
        onBack={() => setView({ mode: 'folder' })}
      />
    );
  }

  const items: ListItem[] = [
    { id: ADD_PRINTER_ID, name: 'Add Printer', icon: '/icons/settings-32.svg', icon16: '/icons/settings-16.svg' },
    ...printers.map((p) => ({
      id: p.id,
      name: p.name,
      icon: '/icons/printer-32.svg',
      icon16: '/icons/printer-16.svg',
    })),
  ];

  const openItem = (id: string) => {
    if (id === ADD_PRINTER_ID) setShowWizard(true);
    else setView({ mode: 'queue', printerId: id });
  };

  const menus: MenuDefinition[] = [
    {
      label: '&File',
      items: [
        {
          label: '&Open',
          onClick: () => selectedId && openItem(selectedId),
          disabled: !selectedId,
        },
        { label: 'Add &Printer...', onClick: () => setShowWizard(true) },
        { label: '', separator: true },
        { label: '&Close', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: '&Help',
      items: [
        {
          label: '&About Printers',
          onClick: () => window.dispatchEvent(new CustomEvent('win98-about-dialog', { detail: { appName: 'Printers' } })),
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)]">
      <MenuBar menus={menus} windowId={windowId} />
      <ListView98
        mode="large-icons"
        className="flex-1"
        items={items}
        selectedId={selectedId}
        onSelect={(item) => setSelectedId(item.id)}
        onDoubleClick={(item) => openItem(item.id)}
      />
      <StatusBar98 panels={[{ content: `${printers.length} printer(s)` }]} />

      {showWizard && <AddPrinterWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
}
