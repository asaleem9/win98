'use client';

import { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { AppComponentProps } from '@/types/app';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useWindows } from '@/contexts/WindowContext';
import { showSystemError } from '@/hooks/useFileOpener';
import { Button98 } from '@/components/ui/Button98';
import { Input98 } from '@/components/ui/Input98';
import { Dialog98 } from '@/components/ui/Dialog98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { MenuBar, MenuDefinition, MenuItem } from '@/components/window/MenuBar';
import { standardHelpMenu } from '@/lib/menus';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { playSound } from '@/lib/sounds';
import { joinPath, normalizePath } from '@/lib/fs/fsOperations';
import { getParentPath } from '@/lib/filesystem';
import {
  ArchiveEntry,
  parseArchive,
  serializeArchive,
  addEntry,
  removeEntry,
  fakeRatio,
  packedSize,
  fakeCrc,
} from '@/lib/archive';

export type ArchiverKind = 'zip' | 'rar';
export type ToolbarAction = 'new' | 'open' | 'add' | 'extract' | 'delete' | 'test' | 'view';

interface ArchiverConfig {
  kind: ArchiverKind;
  productName: string;
  ext: string;
  accent: string;
  nag: ReactNode;
  toolbar: { label: string; icon: string; action: ToolbarAction }[];
  columns: 'zip' | 'rar';
}

const EXTRACT_DEFAULT = 'C:\\My Documents';
const SEP: MenuItem = { label: '', separator: true };

function formatNum(n: number): string {
  return n.toLocaleString('en-US');
}

/** Sample listing shown for the demo archive when the app is opened with no file. */
function demoEntries(): ArchiveEntry[] {
  return [
    { name: 'index.html', size: 24576, content: '<html><body>Under Construction</body></html>' },
    { name: 'style.css', size: 8192, content: 'body { background: #c0c0c0; }' },
    { name: 'logo.bmp', size: 153600, content: '[Bitmap Image - 200x100]' },
    { name: 'readme.txt', size: 4096, content: 'Thank you for downloading!' },
  ];
}

export function Archiver({ windowId, launchParams, launchCount, config }: AppComponentProps & { config: ArchiverConfig }) {
  const { readFile, writeFile, getNode } = useFileSystem();
  const { closeWindow } = useWindows();

  const [archivePath, setArchivePath] = useState<string | null>(null);
  const [entries, setEntries] = useState<ArchiveEntry[]>(demoEntries);
  const [selected, setSelected] = useState<number | null>(null);
  const [showNag, setShowNag] = useState(false);
  const [picker, setPicker] = useState<'new' | 'open' | 'add' | null>(null);
  const [extractOpen, setExtractOpen] = useState(false);
  const [pathInput, setPathInput] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  // Load the archive named by launchParams, or fall back to the nag + demo list.
  const loadPath = launchParams?.filePath;
  useEffect(() => {
    if (loadPath) {
      const norm = normalizePath(loadPath);
      const content = readFile(norm);
      const parsed = parseArchive(content);
      if (parsed) {
        setArchivePath(norm);
        setEntries(parsed.entries);
        setShowNag(false);
        setSelected(null);
        return;
      }
      showSystemError(
        config.productName,
        `Cannot open the file:\n\n${norm}\n\nThe archive is either in unknown format or damaged.`,
      );
    }
    setArchivePath(null);
    setEntries(demoEntries());
    setShowNag(true);
    setSelected(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPath, launchCount]);

  const displayPath = archivePath ?? `Untitled.${config.ext}`;

  const totalSize = useMemo(() => entries.reduce((s, e) => s + e.size, 0), [entries]);
  const totalPacked = useMemo(() => entries.reduce((s, e) => s + packedSize(e.size), 0), [entries]);

  const persist = useCallback(
    (next: ArchiveEntry[], path: string) => {
      const res = writeFile(path, serializeArchive(next));
      if (!res.ok) {
        showSystemError(config.productName, res.error);
        return false;
      }
      return true;
    },
    [writeFile, config.productName],
  );

  // ----- File menu -----
  const doNew = useCallback(
    (path: string) => {
      if (!persist([], path)) return;
      setArchivePath(path);
      setEntries([]);
      setShowNag(false);
      setSelected(null);
      playSound('ding');
      setNotice(`Created new archive:\n${path}`);
    },
    [persist],
  );

  const doOpen = useCallback(
    (path: string) => {
      const norm = normalizePath(path);
      const parsed = parseArchive(readFile(norm));
      if (!parsed) {
        showSystemError(
          config.productName,
          `Cannot open the file:\n\n${norm}\n\nThe archive is either in unknown format or damaged.`,
        );
        return;
      }
      setArchivePath(norm);
      setEntries(parsed.entries);
      setShowNag(false);
      setSelected(null);
    },
    [readFile, config.productName],
  );

  const closeArchive = useCallback(() => {
    setArchivePath(null);
    setEntries([]);
    setSelected(null);
  }, []);

  // ----- Actions menu -----
  const doAddFromPath = useCallback(
    (srcPathRaw: string) => {
      const src = normalizePath(srcPathRaw);
      const node = getNode(src);
      if (!node || node.type !== 'file') {
        showSystemError(config.productName, `Cannot find the file:\n\n${src}`);
        return;
      }
      const name = src.split('\\').pop()!;
      const content = node.content ?? '';
      const newEntry: ArchiveEntry = { name, size: node.size ?? content.length, content };
      const next = addEntry(entries, newEntry);

      // Write to the open archive, or create a new one next to the source file.
      let path = archivePath;
      if (!path) path = joinPath(getParentPath(src), `Archive.${config.ext}`);
      if (!persist(next, path)) return;
      setEntries(next);
      setArchivePath(path);
      setShowNag(false);
      setSelected(null);
      playSound('ding');
      setNotice(`Added ${name} to\n${path}`);
    },
    [entries, archivePath, getNode, persist, config.productName, config.ext],
  );

  const openExtract = useCallback(() => {
    setPathInput(EXTRACT_DEFAULT);
    setExtractOpen(true);
  }, []);

  const doExtract = useCallback(async () => {
    const dest = normalizePath(pathInput || EXTRACT_DEFAULT);
    const dir = getNode(dest);
    if (!dir || dir.type !== 'directory') {
      showSystemError(config.productName, `The destination folder does not exist:\n\n${dest}`);
      return;
    }
    setExtractOpen(false);
    // Each write replaces the whole FS root from a snapshot, so yield between
    // files to let the store commit — otherwise only the last file lands.
    let written = 0;
    for (const entry of entries) {
      if (writeFile(joinPath(dest, entry.name), entry.content).ok) written++;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    playSound('ding');
    setNotice(`Extracted ${written} file(s) to\n${dest}`);
  }, [pathInput, entries, getNode, writeFile, config.productName]);

  const deleteEntry = useCallback(() => {
    if (selected === null) return;
    const name = entries[selected]?.name;
    if (!name) return;
    const next = removeEntry(entries, name);
    if (archivePath && !persist(next, archivePath)) return;
    setEntries(next);
    setSelected(null);
    playSound('ding');
    setNotice(`Deleted ${name} from the archive.`);
  }, [selected, entries, archivePath, persist]);

  const testArchive = useCallback(() => {
    playSound('ding');
    setNotice('Testing archive... All files OK. No errors detected.');
  }, []);

  const viewEntry = useCallback(() => {
    if (selected !== null) setNotice(entries[selected].content.slice(0, 400) || '(empty file)');
  }, [selected, entries]);

  const handleToolbar = useCallback(
    (action: ToolbarAction) => {
      switch (action) {
        case 'new': setPicker('new'); break;
        case 'open': setPicker('open'); break;
        case 'add': setPicker('add'); break;
        case 'extract': openExtract(); break;
        case 'delete': deleteEntry(); break;
        case 'test': testArchive(); break;
        case 'view': viewEntry(); break;
      }
    },
    [openExtract, deleteEntry, testArchive, viewEntry],
  );

  const menus: MenuDefinition[] = [
    {
      label: '&File',
      items: [
        { label: '&New Archive...', onClick: () => setPicker('new') },
        { label: '&Open Archive...', onClick: () => setPicker('open') },
        { label: '&Close Archive', onClick: closeArchive, disabled: !archivePath && entries.length === 0 },
        SEP,
        { label: 'E&xit', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: config.kind === 'rar' ? '&Commands' : '&Actions',
      items: [
        { label: '&Add Files to Archive...', onClick: () => setPicker('add') },
        { label: '&Extract To...', onClick: openExtract },
        SEP,
        { label: '&Delete Selected', onClick: deleteEntry, disabled: selected === null },
        { label: '&Test Archive', onClick: testArchive },
      ],
    },
    {
      label: '&Options',
      items: [{ label: '&Registration...', onClick: () => setShowNag(true) }],
    },
    standardHelpMenu(config.productName),
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] relative font-[family-name:var(--win98-font)] text-[11px]">
      {showNag && <NagDialog accent={config.accent} onContinue={() => setShowNag(false)}>{config.nag}</NagDialog>}

      {/* Menu bar */}
      <MenuBar menus={menus} windowId={windowId} />

      {/* Toolbar */}
      <div className="flex gap-1 px-2 py-1 border-b border-[var(--win98-button-shadow)]">
        {config.toolbar.map((b) => (
          <Button98 key={b.label} variant="default" className="min-w-0 px-2 flex-col gap-0 h-auto py-1" onClick={() => handleToolbar(b.action)}>
            <span className="text-base leading-none">{b.icon}</span>
            <span className="text-[10px]">{b.label}</span>
          </Button98>
        ))}
      </div>

      {/* Address bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[var(--win98-button-shadow)]">
        <span className="text-[10px] mr-1">📦</span>
        <div className="flex-1 border border-solid border-[var(--win98-button-shadow)] bg-white px-1 py-[1px] text-[11px] truncate">
          {displayPath}
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-auto bg-white border border-solid border-[var(--win98-button-shadow)] m-1">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 bg-[var(--win98-button-face)]">
            <tr className="border-b border-[var(--win98-button-shadow)]">
              <th className="text-left px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)] min-w-[140px]">Name</th>
              <th className="text-right px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)]">Size</th>
              <th className="text-right px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)]">Packed</th>
              <th className="text-center px-2 py-[2px] font-normal border-r border-[var(--win98-button-shadow)]">Ratio</th>
              <th className="text-left px-2 py-[2px] font-normal">{config.columns === 'rar' ? 'CRC32' : 'Type'}</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={5} className="px-2 py-2 text-[var(--win98-disabled-text)] select-none">Archive is empty.</td></tr>
            ) : (
              entries.map((file, i) => (
                <tr
                  key={file.name}
                  className={`cursor-default select-none ${selected === i ? 'bg-[var(--win98-highlight)] text-white' : ''}`}
                  onClick={() => setSelected(i)}
                  onDoubleClick={() => { setSelected(i); setNotice(file.content.slice(0, 400) || '(empty file)'); }}
                >
                  <td className="px-2 py-[1px]">
                    <span className="mr-1">{iconFor(file.name)}</span>
                    {file.name}
                  </td>
                  <td className="text-right px-2 py-[1px]">{formatNum(file.size)}</td>
                  <td className="text-right px-2 py-[1px]">{formatNum(packedSize(file.size))}</td>
                  <td className="text-center px-2 py-[1px]">{fakeRatio(file.size)}%</td>
                  <td className="px-2 py-[1px]">{config.columns === 'rar' ? fakeCrc(file) : typeLabel(file.name)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <StatusBar98
        panels={[
          { content: selected !== null ? `Selected: ${entries[selected]?.name}` : `${entries.length} file(s)` },
          { content: `${formatNum(totalSize)} bytes`, width: 130 },
          { content: `packed ${formatNum(totalPacked)}`, width: 130 },
        ]}
      />

      {/* New / Open / Add file picker */}
      {picker && (
        <FilePickerDialog
          mode={picker === 'new' ? 'save' : 'open'}
          title={picker === 'new' ? 'New Archive' : picker === 'open' ? 'Open Archive' : 'Add Files to Archive'}
          startDir="C:\\My Documents"
          defaultName={picker === 'new' ? `Archive.${config.ext}` : ''}
          defaultExtension={picker === 'new' ? config.ext : undefined}
          filters={
            picker === 'add'
              ? undefined
              : [
                  { label: `${config.productName} archive (*.${config.ext})`, extensions: [config.ext] },
                  { label: 'All Files (*.*)', extensions: [] },
                ]
          }
          onConfirm={(p) => {
            const which = picker;
            setPicker(null);
            if (which === 'new') doNew(p);
            else if (which === 'open') doOpen(p);
            else doAddFromPath(p);
          }}
          onCancel={() => setPicker(null)}
        />
      )}

      {/* Extract destination prompt */}
      {extractOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/10">
          <Dialog98
            title="Extract"
            icon="question"
            message={
              <div className="w-[300px]">
                <p className="mb-2">Extract files to folder:</p>
                <Input98
                  autoFocus
                  className="w-full"
                  value={pathInput}
                  onChange={(e) => setPathInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') doExtract(); }}
                />
              </div>
            }
            buttons={[
              { label: 'OK', default: true, onClick: doExtract },
              { label: 'Cancel', onClick: () => setExtractOpen(false) },
            ]}
            className="shadow-lg"
          />
        </div>
      )}

      {/* Info notice */}
      {notice && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/10">
          <Dialog98
            title={config.productName}
            icon="info"
            message={<span className="whitespace-pre-wrap max-w-[340px] inline-block break-words">{notice}</span>}
            buttons={[{ label: 'OK', default: true, onClick: () => setNotice(null) }]}
            className="shadow-lg"
          />
        </div>
      )}
    </div>
  );
}

function iconFor(name: string): string {
  const lower = name.toLowerCase();
  if (/\.(bmp|jpg|jpeg|gif|png)$/.test(lower)) return '🖼️';
  if (/\.(htm|html)$/.test(lower)) return '🌐';
  if (/\.exe$/.test(lower)) return '⚙️';
  return '📄';
}

function typeLabel(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop()!.toUpperCase() : '';
  return ext ? `${ext} File` : 'File';
}

function NagDialog({ accent, children, onContinue }: { accent: string; children: ReactNode; onContinue: () => void }) {
  return (
    <div className="absolute inset-0 bg-[var(--win98-button-face)] z-50 flex items-center justify-center">
      <div className="border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] bg-[var(--win98-button-face)] p-4 max-w-[380px] shadow-md">
        <div className="flex gap-3 mb-4">
          <div className="text-4xl" style={{ color: accent }}>📦</div>
          <div className="font-[family-name:var(--win98-font)] text-[11px]">{children}</div>
        </div>
        <div className="flex justify-center gap-2">
          <Button98 onClick={onContinue}>Continue</Button98>
          <Button98>Buy Now!</Button98>
          <Button98 onClick={onContinue}>Close</Button98>
        </div>
      </div>
    </div>
  );
}
