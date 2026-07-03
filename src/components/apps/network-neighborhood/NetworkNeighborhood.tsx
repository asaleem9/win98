'use client';

import { useCallback, useEffect, useMemo, useRef, useState, MouseEvent } from 'react';
import { AppComponentProps } from '@/types/app';
import { FSNode } from '@/types/filesystem';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Dialog98 } from '@/components/ui/Dialog98';
import { Input98 } from '@/components/ui/Input98';
import { Checkbox98 } from '@/components/ui/Checkbox98';
import { Button98 } from '@/components/ui/Button98';
import { Select98 } from '@/components/ui/Select98';
import { ContextMenu, ContextMenuItem } from '@/components/desktop/ContextMenu';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useFileOpener, showSystemError } from '@/hooks/useFileOpener';
import { resolveNetworkPath, networkSharePasswords } from '@/lib/filesystem';
import { cn } from '@/lib/cn';
import { playSound } from '@/lib/sounds';

const APP_ID = 'network-neighborhood';

interface Machine {
  display: string;
  host: string | null;
  icon: string;
  browsable: boolean;
}

const MACHINES: Machine[] = [
  { display: 'Entire Network', host: null, icon: '/icons/network-32.svg', browsable: false },
  { display: 'Dads-computer', host: 'DADS-COMPUTER', icon: '/icons/my-computer-32.svg', browsable: true },
  { display: 'Family-pc', host: 'FAMILY-PC', icon: '/icons/my-computer-32.svg', browsable: true },
  { display: 'Gateway2000', host: 'GATEWAY2000', icon: '/icons/my-computer-32.svg', browsable: false },
  { display: 'Packardbell', host: 'PACKARDBELL', icon: '/icons/my-computer-32.svg', browsable: false },
];

const MY_DOCUMENTS = 'C:\\My Documents';

function machineByHost(host: string): Machine | undefined {
  return MACHINES.find((m) => m.host === host);
}

/** UNC path for a segment stack, e.g. ['DADS-COMPUTER','shared'] → \\DADS-COMPUTER\shared */
function unc(segments: string[]): string {
  return `\\\\${segments.join('\\')}`;
}

function lockKey(host: string, share: string): string {
  return `${host}\\${share}`;
}

interface NetItem {
  id: string;
  label: string;
  icon: string;
  node?: FSNode;
  machine?: Machine;
  locked?: boolean;
}

interface MappedDrive {
  letter: string;
  path: string;
  share: string;
  hostDisplay: string;
  reconnect: boolean;
}

export default function NetworkNeighborhood({}: AppComponentProps) {
  const { createFile } = useFileSystem();
  const { setAppPref } = useSettings();
  const { openFile } = useFileOpener();

  // Navigation stack into the network tree. [] = machines, [host] = shares,
  // [host, share, ...] = inside a share.
  const [path, setPath] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [opening, setOpening] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [passwordFor, setPasswordFor] = useState<{ host: string; share: string } | null>(null);
  const [mapFor, setMapFor] = useState<{ host: string; share: string; sharePath: string } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; item: NetItem } | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const currentNode = useMemo(() => (path.length === 0 ? null : resolveNetworkPath(unc(path))), [path]);

  const items = useMemo<NetItem[]>(() => {
    if (path.length === 0) {
      return MACHINES.map((m) => ({ id: m.display, label: m.display, icon: m.icon, machine: m }));
    }
    const children = currentNode?.children ?? [];
    const atShares = path.length === 1;
    return children.map((node) => ({
      id: node.name,
      label: node.name,
      icon: atShares || node.type === 'directory' ? (node.icon ?? '/icons/folder-16.svg').replace('-16', '-32') : (node.icon ?? '/icons/file-16.svg'),
      node,
      locked: atShares && lockKey(path[0], node.name) in networkSharePasswords,
    }));
  }, [path, currentNode]);

  const isIconView = path.length <= 1;

  // --- navigation -----------------------------------------------------------
  const goToMachines = useCallback(() => { setPath([]); setSelected(null); setStatus(''); }, []);

  const goUp = useCallback(() => {
    if (path.length === 0) return;
    setPath((p) => p.slice(0, -1));
    setSelected(null);
    setStatus('');
  }, [path.length]);

  const enterMachine = useCallback((m: Machine) => {
    if (!m.browsable || !m.host) {
      if (m.display === 'Entire Network') {
        showSystemError('Network Neighborhood', 'Unable to browse the network.\n\nThe network is not present or not started.');
      } else {
        showSystemError('Network Neighborhood', `\\\\${m.host ?? m.display.toUpperCase()} is not accessible.\n\nThe computer or sharename could not be found. Make sure you typed it correctly, and try again.`);
      }
      return;
    }
    // Slow-network flavor: the "Searching for computers..." pass.
    setConnecting(true);
    setStatus(`Connecting to \\\\${m.host}...`);
    const host = m.host;
    later(() => {
      setConnecting(false);
      setPath([host]);
      setSelected(null);
      setStatus('');
    }, 600);
  }, [later]);

  const enterShare = useCallback((share: FSNode) => {
    const host = path[0];
    const key = lockKey(host, share.name);
    if (key in networkSharePasswords && !unlocked.has(key)) {
      setPasswordFor({ host, share: share.name });
      return;
    }
    setPath((p) => [...p, share.name]);
    setSelected(null);
  }, [path, unlocked]);

  const openNetworkFile = useCallback((node: FSNode) => {
    const fullUnc = unc([...path, node.name]);
    // Slow-network flavor: brief hourglass before the app window appears.
    setOpening(true);
    setStatus(`Opening ${node.name}...`);
    later(() => {
      setOpening(false);
      setStatus('');
      openFile(fullUnc);
    }, 300);
  }, [path, later, openFile]);

  const activate = useCallback((item: NetItem) => {
    if (item.machine) { enterMachine(item.machine); return; }
    if (!item.node) return;
    if (item.node.type === 'directory') {
      if (path.length === 1) enterShare(item.node);
      else { setPath((p) => [...p, item.node!.name]); setSelected(null); }
      return;
    }
    openNetworkFile(item.node);
  }, [enterMachine, enterShare, openNetworkFile, path.length]);

  // --- context-menu actions -------------------------------------------------
  const copyToMyDocuments = useCallback((node: FSNode) => {
    const res = createFile(MY_DOCUMENTS, node.name, node.content ?? '');
    if (res.ok) { playSound('menuClick'); setStatus(`'${node.name}' copied to My Documents`); }
    else showSystemError('Copy', res.error);
  }, [createFile]);

  const openMapDialog = useCallback((item: NetItem) => {
    if (!item.node || path.length !== 1) return;
    const host = path[0];
    setMapFor({ host, share: item.node.name, sharePath: unc([host, item.node.name]) });
  }, [path]);

  const confirmMap = useCallback((letter: string, reconnect: boolean) => {
    if (!mapFor) return;
    const hostDisplay = machineByHost(mapFor.host)?.display ?? mapFor.host;
    const mapped: MappedDrive = { letter, path: mapFor.sharePath, share: mapFor.share, hostDisplay, reconnect };
    setAppPref(APP_ID, 'mappedDrive', mapped);
    playSound('ding');
    setStatus(`Mapped ${mappedDriveLabel(mapped)}`);
    setMapFor(null);
  }, [mapFor, setAppPref]);

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    if (!menu) return [];
    const { item } = menu;
    const canMap = path.length === 1 && item.node?.type === 'directory';
    const canCopy = item.node?.type === 'file';
    return [
      { label: 'Open', bold: true, onClick: () => activate(item) },
      ...(canMap ? [{ separator: true } as ContextMenuItem, { label: 'Map Network Drive...', onClick: () => openMapDialog(item) }] : []),
      ...(canCopy ? [{ separator: true } as ContextMenuItem, { label: 'Copy to My Documents', onClick: () => copyToMyDocuments(item.node!) }] : []),
    ];
  }, [menu, path.length, activate, openMapDialog, copyToMyDocuments]);

  const onItemContext = useCallback((item: NetItem, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(item.id);
    setMenu({ x: e.clientX, y: e.clientY, item });
  }, []);

  // --- password gate --------------------------------------------------------
  const submitPassword = useCallback((value: string) => {
    if (!passwordFor) return;
    const key = lockKey(passwordFor.host, passwordFor.share);
    if (value === networkSharePasswords[key]) {
      setUnlocked((prev) => new Set(prev).add(key));
      setPath([passwordFor.host, passwordFor.share]);
      setSelected(null);
      setPasswordFor(null);
      playSound('ding');
    } else {
      showSystemError('Network Neighborhood', `\\\\${passwordFor.host}\\${passwordFor.share} is not accessible.\n\nThe password is incorrect.`);
    }
  }, [passwordFor]);

  const pathLabel = path.length === 0 ? 'Network Neighborhood' : unc(path);
  const objectCount = connecting ? 0 : items.length;

  return (
    <div
      className={cn(
        'flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]',
        opening && 'cursor-wait',
      )}
    >
      {/* Toolbar: Up + address */}
      <div className="flex items-center gap-1 px-1 py-[3px] border-b border-[var(--win98-button-shadow)]">
        <Button98 onClick={goUp} disabled={path.length === 0} className="px-2 h-[20px] min-w-0 min-h-0">Up</Button98>
        {path.length > 1 && (
          <Button98 onClick={goToMachines} className="px-2 h-[20px] min-w-0 min-h-0">Network</Button98>
        )}
        <div className="flex-1 h-[20px] flex items-center gap-1 px-1 ml-1 bg-white border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/network-16.svg" alt="" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
          <span className="truncate">{pathLabel}</span>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 bg-white m-1 overflow-auto border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]"
        onClick={() => setSelected(null)}
      >
        {connecting ? (
          <SearchingSpinner />
        ) : (
          <div className={cn('p-1', isIconView ? 'flex flex-wrap gap-1 content-start' : 'flex flex-col')}>
            {items.map((item) =>
              isIconView ? (
                <IconItem
                  key={item.id}
                  item={item}
                  selected={selected === item.id}
                  onClick={(e) => { e.stopPropagation(); setSelected(item.id); }}
                  onDoubleClick={() => activate(item)}
                  onContextMenu={(e) => onItemContext(item, e)}
                />
              ) : (
                <RowItem
                  key={item.id}
                  item={item}
                  selected={selected === item.id}
                  onClick={(e) => { e.stopPropagation(); setSelected(item.id); }}
                  onDoubleClick={() => activate(item)}
                  onContextMenu={(e) => onItemContext(item, e)}
                />
              ),
            )}
          </div>
        )}
      </div>

      <StatusBar98 panels={[{ content: status || `${objectCount} object(s)` }]} />

      {menu && <ContextMenu items={contextItems} position={{ x: menu.x, y: menu.y }} onClose={() => setMenu(null)} />}

      {passwordFor && (
        <PasswordDialog
          host={passwordFor.host}
          share={passwordFor.share}
          onCancel={() => setPasswordFor(null)}
          onSubmit={submitPassword}
        />
      )}

      {mapFor && (
        <MapDriveDialog
          sharePath={mapFor.sharePath}
          onCancel={() => setMapFor(null)}
          onConfirm={confirmMap}
        />
      )}
    </div>
  );
}

function mappedDriveLabel(m: MappedDrive): string {
  return `${m.share} on ${m.hostDisplay} (${m.letter})`;
}

function SearchingSpinner() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 select-none">
      <div className="w-8 h-8 border-2 border-[var(--win98-button-shadow)] border-t-[var(--win98-titlebar-active-start)] rounded-full animate-spin" />
      <span className="text-[var(--win98-disabled-text)]">Searching for computers...</span>
    </div>
  );
}

function IconItem({ item, selected, onClick, onDoubleClick, onContextMenu }: {
  item: NetItem; selected: boolean;
  onClick: (e: MouseEvent) => void; onDoubleClick: () => void; onContextMenu: (e: MouseEvent) => void;
}) {
  return (
    <div
      className="flex flex-col items-center w-[75px] py-[6px] cursor-default select-none"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <div className={cn('p-[2px]', selected && 'bg-[var(--win98-highlight)]')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.icon} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
      </div>
      <span className={cn('text-center leading-tight mt-[2px] max-w-[75px] px-[2px] break-words', selected && 'bg-[var(--win98-highlight)] text-white')}>
        {item.label}
      </span>
    </div>
  );
}

function RowItem({ item, selected, onClick, onDoubleClick, onContextMenu }: {
  item: NetItem; selected: boolean;
  onClick: (e: MouseEvent) => void; onDoubleClick: () => void; onContextMenu: (e: MouseEvent) => void;
}) {
  return (
    <div
      className={cn('flex items-center gap-1 px-1 py-[1px] w-[220px] cursor-default select-none', selected && 'bg-[var(--win98-highlight)] text-white')}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.icon} alt="" className="w-4 h-4 flex-shrink-0" style={{ imageRendering: 'pixelated' }} />
      <span className="truncate">{item.label}</span>
    </div>
  );
}

function PasswordDialog({ host, share, onCancel, onSubmit }: {
  host: string; share: string; onCancel: () => void; onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/10">
      <Dialog98
        title="Enter Network Password"
        icon="question"
        message={
          <div className="w-[280px]">
            <p className="mb-3">You must supply a password to make this connection:</p>
            <div className="flex mb-2">
              <span className="w-[70px] text-[var(--win98-disabled-text)]">Resource:</span>
              <span className="break-all">{`\\\\${host}\\${share}`}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-[70px]">Password:</span>
              <Input98
                type="password"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(value); }}
                className="flex-1"
                aria-label="Password"
              />
            </div>
          </div>
        }
        buttons={[
          { label: 'OK', default: true, onClick: () => onSubmit(value) },
          { label: 'Cancel', onClick: onCancel },
        ]}
        className="shadow-lg"
      />
    </div>
  );
}

const DRIVE_LETTERS = ['Z:', 'Y:', 'X:', 'W:'];

function MapDriveDialog({ sharePath, onCancel, onConfirm }: {
  sharePath: string; onCancel: () => void; onConfirm: (letter: string, reconnect: boolean) => void;
}) {
  const [letter, setLetter] = useState('Z:');
  const [reconnect, setReconnect] = useState(true);
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/10">
      <Dialog98
        title="Map Network Drive"
        message={
          <div className="w-[300px]">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-[50px]">Drive:</span>
              <Select98 value={letter} onChange={(e) => setLetter(e.target.value)} className="w-[70px]" aria-label="Drive">
                {DRIVE_LETTERS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select98>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-[50px]">Path:</span>
              <Input98 readOnly value={sharePath} className="flex-1" aria-label="Path" />
            </div>
            <Checkbox98 label="Reconnect at logon" checked={reconnect} onChange={(e) => setReconnect(e.target.checked)} />
          </div>
        }
        buttons={[
          { label: 'OK', default: true, onClick: () => onConfirm(letter, reconnect) },
          { label: 'Cancel', onClick: onCancel },
        ]}
        className="shadow-lg"
      />
    </div>
  );
}
