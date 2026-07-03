'use client';

import { useState, useCallback, MouseEvent } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useSettings } from '@/contexts/SettingsContext';
import { showSystemError } from '@/hooks/useFileOpener';
import { ContextMenu, ContextMenuItem } from '@/components/desktop/ContextMenu';
import { Dialog98 } from '@/components/ui/Dialog98';
import { FSNode } from '@/types/filesystem';
import { formatSize } from '@/lib/filesystem';
import { cn } from '@/lib/cn';

const DRIVE_CAPACITY = 2.1 * 1024 * 1024 * 1024; // 2.1 GB local disk

interface DriveDef {
  id: 'a' | 'c' | 'd';
  name: string;
  icon: string;
  type: string;
}

const DRIVES: DriveDef[] = [
  { id: 'a', name: '3½ Floppy (A:)', icon: '/icons/my-computer-16.svg', type: '3½-Inch Floppy Disk' },
  { id: 'c', name: '(C:)', icon: '/icons/my-computer-16.svg', type: 'Local Disk' },
  { id: 'd', name: '(D:)', icon: '/icons/my-computer-16.svg', type: 'CD-ROM Disc' },
];

const SYSTEM_ITEMS = [
  { name: 'Control Panel', icon: '/icons/control-panel-16.svg', action: 'control-panel' as const },
  { name: 'Printers', icon: '/icons/settings-16.svg', action: 'printers' as const },
  { name: 'Dial-Up Networking', icon: '/icons/network-16.svg', action: 'dialup' as const },
];

// A drive mapped from Network Neighborhood, persisted under its appPref bucket.
interface MappedDrive {
  letter: string;
  path: string;
  share: string;
  hostDisplay: string;
  reconnect: boolean;
}

function walkSize(node: FSNode): number {
  if (node.type !== 'directory') return node.size ?? 0;
  return (node.children ?? []).reduce((sum, c) => sum + walkSize(c), 0);
}

type InfoDialog = 'printers' | 'dialup' | 'addPrinter';

export default function MyComputer({}: AppComponentProps) {
  const { openWindow } = useWindows();
  const { root } = useFileSystem();
  const { getAppPref } = useSettings();
  const mappedDrive = getAppPref<MappedDrive | null>('network-neighborhood', 'mappedDrive', null);
  const [menu, setMenu] = useState<{ x: number; y: number; drive: DriveDef } | null>(null);
  const [propsDrive, setPropsDrive] = useState<DriveDef | null>(null);
  const [info, setInfo] = useState<InfoDialog | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const openDrive = useCallback((drive: DriveDef) => {
    if (drive.id === 'c') { openWindow('explorer', { launchParams: { filePath: 'C:\\' } }); return; }
    if (drive.id === 'a') { showSystemError('3½ Floppy (A:)', 'A:\\ is not accessible.\n\nThe device is not ready.'); return; }
    showSystemError('(D:)', 'D:\\ is not accessible.\n\nPlease insert a CD into the drive.');
  }, [openWindow]);

  const handleSystemItem = useCallback((action: string) => {
    if (action === 'control-panel') openWindow('control-panel');
    else if (action === 'printers') setInfo('printers');
    else if (action === 'dialup') setInfo('dialup');
  }, [openWindow]);

  const onDriveContext = useCallback((drive: DriveDef, e: MouseEvent) => {
    e.preventDefault();
    setSelected(drive.name);
    setMenu({ x: e.clientX, y: e.clientY, drive });
  }, []);

  const contextItems: ContextMenuItem[] = menu ? [
    { label: 'Open', bold: true, onClick: () => openDrive(menu.drive) },
    { label: 'Explore', onClick: () => openDrive(menu.drive) },
    { separator: true },
    { label: 'Properties', onClick: () => setPropsDrive(menu.drive) },
  ] : [];

  return (
    <div className="flex-1 flex flex-col bg-white font-[family-name:var(--win98-font)] text-[11px]">
      {/* Toolbar */}
      <div className={cn('flex items-center gap-1 px-2 py-1 bg-[var(--win98-button-face)]', 'border-b border-[var(--win98-button-shadow)]')}>
        <span className="text-[var(--win98-disabled-text)]">Address</span>
        <div className={cn('flex-1 h-[20px] flex items-center gap-1 px-1 bg-white', 'border border-solid', 'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]', 'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/my-computer-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
          <span>My Computer</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3" onClick={() => setSelected(null)}>
        <div className="flex flex-wrap gap-4">
          {DRIVES.map((drive) => (
            <IconCell
              key={drive.name}
              name={drive.name}
              icon={drive.icon}
              selected={selected === drive.name}
              onClick={(e) => { e.stopPropagation(); setSelected(drive.name); }}
              onDoubleClick={() => openDrive(drive)}
              onContextMenu={(e) => onDriveContext(drive, e)}
            />
          ))}
          {mappedDrive && (
            <IconCell
              name={`${mappedDrive.share} on ${mappedDrive.hostDisplay} (${mappedDrive.letter})`}
              icon="/icons/network-32.svg"
              selected={selected === mappedDrive.letter}
              onClick={(e) => { e.stopPropagation(); setSelected(mappedDrive.letter); }}
              onDoubleClick={() => openWindow('explorer', { launchParams: { filePath: mappedDrive.path } })}
            />
          )}
        </div>

        <div className="mx-0 my-3 border-t border-[var(--win98-button-shadow)]" />

        <div className="flex flex-wrap gap-4">
          {SYSTEM_ITEMS.map((item) => (
            <IconCell
              key={item.name}
              name={item.name}
              icon={item.icon}
              selected={selected === item.name}
              onClick={(e) => { e.stopPropagation(); setSelected(item.name); }}
              onDoubleClick={() => handleSystemItem(item.action)}
            />
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className={cn('flex items-center h-[20px] px-2 bg-[var(--win98-button-face)]', 'border-t border-[var(--win98-button-highlight)]', 'text-[11px]')}>
        <span>{DRIVES.length + SYSTEM_ITEMS.length + (mappedDrive ? 1 : 0)} object(s)</span>
      </div>

      {menu && <ContextMenu items={contextItems} position={{ x: menu.x, y: menu.y }} onClose={() => setMenu(null)} />}
      {propsDrive && <DriveProperties drive={propsDrive} root={root} onClose={() => setPropsDrive(null)} />}
      {info && <SystemInfoDialog which={info} onClose={() => setInfo(null)} onAddPrinter={() => setInfo('addPrinter')} />}
    </div>
  );
}

function IconCell({ name, icon, selected, onClick, onDoubleClick, onContextMenu }: {
  name: string; icon: string; selected: boolean;
  onClick: (e: MouseEvent) => void; onDoubleClick: () => void; onContextMenu?: (e: MouseEvent) => void;
}) {
  return (
    <div className="flex flex-col items-center w-[75px] cursor-default select-none p-1" onClick={onClick} onDoubleClick={onDoubleClick} onContextMenu={onContextMenu}>
      <div className={cn('p-[2px]', selected && 'bg-[var(--win98-highlight)]')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
      </div>
      <span className={cn('text-center text-[11px] mt-1 px-[2px]', selected && 'bg-[var(--win98-highlight)] text-white')}>{name}</span>
    </div>
  );
}

function DriveProperties({ drive, root, onClose }: { drive: DriveDef; root: FSNode; onClose: () => void }) {
  const removable = drive.id !== 'c';
  const used = drive.id === 'c' ? walkSize(root) : 0;
  const capacity = drive.id === 'c' ? DRIVE_CAPACITY : 0;
  const free = Math.max(0, capacity - used);

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/10">
      <Dialog98
        title={`${drive.name} Properties`}
        message={
          removable ? (
            <div className="w-[280px]">
              <Row k="Label" v="(none)" />
              <Row k="Type" v={drive.type} />
              <div className="my-2 border-t border-[var(--win98-button-shadow)]" />
              <p className="text-[var(--win98-disabled-text)]">{drive.id === 'a' ? 'The device is not ready.' : 'There is no disc in the drive.'}</p>
            </div>
          ) : (
            <div className="w-[300px]">
              <Row k="Label" v="(none)" />
              <Row k="Type" v="Local Disk" />
              <Row k="File system" v="FAT32" />
              <div className="my-2 border-t border-[var(--win98-button-shadow)]" />
              <div className="flex items-center gap-4">
                <UsagePie used={used} free={free} />
                <div className="flex-1">
                  <Legend color="#c000c0" label="Used space" value={formatSize(used)} />
                  <Legend color="#0000c0" label="Free space" value={formatSize(free)} />
                  <div className="my-1 border-t border-[var(--win98-button-shadow)]" />
                  <div className="flex justify-between"><span>Capacity:</span><span>{formatSize(capacity)}</span></div>
                </div>
              </div>
            </div>
          )
        }
        buttons={[{ label: 'OK', default: true, onClick: onClose }]}
        className="shadow-lg"
      />
    </div>
  );
}

function UsagePie({ used, free }: { used: number; free: number }) {
  const total = used + free || 1;
  const usedFrac = used / total;
  const angle = Math.max(2, usedFrac * 360); // near-empty disk still shows a sliver
  const r = 34, cx = 40, cy = 40;
  const large = angle > 180 ? 1 : 0;
  const rad = (a: number) => (a - 90) * (Math.PI / 180);
  const x = cx + r * Math.cos(rad(angle));
  const y = cy + r * Math.sin(rad(angle));
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx={cx} cy={cy} r={r} fill="#0000c0" stroke="#000" strokeWidth="1" />
      <path d={`M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} Z`} fill="#c000c0" stroke="#000" strokeWidth="1" />
    </svg>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-[1px]">
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 border border-black" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

function SystemInfoDialog({ which, onClose, onAddPrinter }: { which: InfoDialog; onClose: () => void; onAddPrinter: () => void }) {
  const content: Record<InfoDialog, { title: string; body: React.ReactNode; buttons: { label: string; default?: boolean; onClick: () => void }[] }> = {
    printers: {
      title: 'Printers',
      body: (
        <div className="w-[300px]">
          <p className="mb-2">This folder contains the printers installed on your computer.</p>
          <div className="flex items-center gap-2 p-2 bg-white border border-solid border-[var(--win98-button-shadow)]">
            <span className="text-2xl">🖨️</span>
            <span>Add Printer</span>
          </div>
          <p className="mt-2 text-[10px] text-[var(--win98-disabled-text)]">Double-click Add Printer to install a new printer.</p>
        </div>
      ),
      buttons: [
        { label: 'Add Printer', onClick: onAddPrinter },
        { label: 'Close', default: true, onClick: onClose },
      ],
    },
    dialup: {
      title: 'Dial-Up Networking',
      body: (
        <div className="w-[300px]">
          <p className="mb-2">Use Dial-Up Networking to connect to another computer or the Internet over a modem.</p>
          <div className="flex items-center gap-2 p-2 bg-white border border-solid border-[var(--win98-button-shadow)]">
            <span className="text-2xl">☎️</span>
            <span>Make New Connection</span>
          </div>
          <p className="mt-2 text-[10px] text-[var(--win98-disabled-text)]">No modem is currently installed. Windows will start the Modem Wizard.</p>
        </div>
      ),
      buttons: [{ label: 'Close', default: true, onClick: onClose }],
    },
    addPrinter: {
      title: 'Add Printer Wizard',
      body: (
        <div className="w-[320px]">
          <p className="font-bold mb-2">Welcome to the Add Printer Wizard</p>
          <p className="mb-2">This wizard helps you install a printer or make printer connections.</p>
          <p className="text-[10px] text-[var(--win98-disabled-text)]">
            Detecting printer ports... LPT1 not responding. Please check that your printer is plugged in, turned on, and stocked with at least 3 sheets of paper.
          </p>
        </div>
      ),
      buttons: [{ label: 'Cancel', default: true, onClick: onClose }],
    },
  };
  const c = content[which];
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/10">
      <Dialog98 title={c.title} icon="info" message={c.body} buttons={c.buttons} className="shadow-lg" />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex py-[2px]">
      <span className="w-[90px] text-[var(--win98-disabled-text)] shrink-0">{k}:</span>
      <span className="break-all">{v}</span>
    </div>
  );
}
