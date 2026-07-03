'use client';

import { useMemo, useState } from 'react';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { FSNode } from '@/types/filesystem';
import { normalizePath } from '@/lib/fs/fsOperations';
import { getParentPath } from '@/lib/filesystem';
import { getExtension } from '@/lib/fileAssociations';
import { Button98 } from '@/components/ui/Button98';
import { Checkbox98 } from '@/components/ui/Checkbox98';
import { TabControl98 } from '@/components/ui/TabControl98';

export interface PropertiesDialogProps {
  path: string;
  onClose: () => void;
}

// A believable late-90s hard disk so the drive pie has a sensible slice.
const DRIVE_CAPACITY = 2_111_864_832; // ~1.97 GB
const SYSTEM_USED = 486_539_264; // Windows + installed programs baseline

const TYPE_LABELS: Record<string, string> = {
  txt: 'Text Document',
  log: 'Text Document',
  ini: 'Configuration Settings',
  bat: 'MS-DOS Batch File',
  sys: 'System File',
  doc: 'Microsoft Word Document',
  rtf: 'Rich Text Document',
  xls: 'Microsoft Excel Worksheet',
  ppt: 'Microsoft PowerPoint Presentation',
  htm: 'HTML Document',
  html: 'HTML Document',
  bmp: 'Bitmap Image',
  jpg: 'JPEG Image',
  jpeg: 'JPEG Image',
  png: 'PNG Image',
  gif: 'GIF Image',
  exe: 'Application',
  com: 'MS-DOS Application',
  reg: 'Registration Entries',
  zip: 'WinZip File',
};

const ICON_BY_EXT: Record<string, string> = {
  txt: '/icons/notepad-32.svg',
  log: '/icons/notepad-32.svg',
  ini: '/icons/notepad-32.svg',
  doc: '/icons/word-32.svg',
  rtf: '/icons/wordpad-32.svg',
  xls: '/icons/excel-32.svg',
  ppt: '/icons/powerpoint-32.svg',
  htm: '/icons/ie-32.svg',
  html: '/icons/ie-32.svg',
  bmp: '/icons/paint-32.svg',
  jpg: '/icons/paint-32.svg',
  jpeg: '/icons/paint-32.svg',
  png: '/icons/paint-32.svg',
  gif: '/icons/paint-32.svg',
};

interface FolderStats {
  bytes: number;
  files: number;
  folders: number;
}

function folderStats(node: FSNode): FolderStats {
  const stats: FolderStats = { bytes: 0, files: 0, folders: 0 };
  for (const child of node.children ?? []) {
    if (child.type === 'directory') {
      stats.folders += 1;
      const nested = folderStats(child);
      stats.bytes += nested.bytes;
      stats.files += nested.files;
      stats.folders += nested.folders;
    } else {
      stats.files += 1;
      stats.bytes += child.size ?? 0;
    }
  }
  return stats;
}

function friendlySize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} bytes`;
}

function sizeWithBytes(bytes: number): string {
  return `${friendlySize(bytes)} (${bytes.toLocaleString()} bytes)`;
}

/** Derives an authentic-looking 8.3 short name, e.g. "My Documents" -> "MYDOCU~1". */
function dosName(name: string): string {
  const dot = name.lastIndexOf('.');
  const stem = (dot > 0 ? name.slice(0, dot) : name).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const ext = (dot > 0 ? name.slice(dot + 1) : '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3);
  const shortStem = stem.length > 8 ? `${stem.slice(0, 6)}~1` : stem || 'FILE';
  return ext ? `${shortStem}.${ext}` : shortStem;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function wedgePath(cx: number, cy: number, r: number, fraction: number): string {
  const clamped = Math.max(0, Math.min(0.9999, fraction));
  const end = polar(cx, cy, r, clamped * 360);
  const start = polar(cx, cy, r, 0);
  const large = clamped > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`;
}

const ROW_LABEL = 'w-[88px] flex-shrink-0 text-right pr-2 select-none';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start py-[2px]">
      <span className={ROW_LABEL}>{label}</span>
      <span className="flex-1 break-words">{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-2 border-t border-[var(--win98-button-shadow)] border-b border-b-[var(--win98-button-highlight)]" />;
}

export function PropertiesDialog({ path, onClose }: PropertiesDialogProps) {
  const { getNode } = useFileSystem();
  const normalized = normalizePath(path);
  const isDrive = normalized === 'C:\\';
  const node = useMemo(() => getNode(normalized), [getNode, normalized]);

  const [readOnly, setReadOnly] = useState(() => !!node?.readOnly);
  const [hidden, setHidden] = useState(false);
  const [archive, setArchive] = useState(true);

  const title = isDrive ? '(C:) Properties' : `${node?.name ?? 'Item'} Properties`;

  const general = isDrive ? (
    <DriveGeneral node={node} />
  ) : (
    <FileGeneral
      path={normalized}
      node={node}
      readOnly={readOnly}
      hidden={hidden}
      archive={archive}
      onReadOnly={setReadOnly}
      onHidden={setHidden}
      onArchive={setArchive}
    />
  );

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center bg-black/20 font-[family-name:var(--win98-font)] text-[11px]">
      <div className="w-[320px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]">
        {/* Title bar */}
        <div className="flex items-center justify-between h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white font-bold select-none">
          <span className="truncate">{title}</span>
          <button
            className="w-[16px] h-[14px] flex items-center justify-center bg-[var(--win98-button-face)] text-black border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] text-[9px] leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-2">
          <TabControl98 tabs={[{ id: 'general', label: 'General', content: general }]} />

          {/* OK / Cancel / Apply */}
          <div className="flex justify-end gap-[6px] pt-3">
            <Button98 className="min-w-[70px]" onClick={onClose}>
              OK
            </Button98>
            <Button98 className="min-w-[70px]" onClick={onClose}>
              Cancel
            </Button98>
            <Button98 className="min-w-[70px]" disabled>
              Apply
            </Button98>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileGeneral({
  path,
  node,
  readOnly,
  hidden,
  archive,
  onReadOnly,
  onHidden,
  onArchive,
}: {
  path: string;
  node: FSNode | null;
  readOnly: boolean;
  hidden: boolean;
  archive: boolean;
  onReadOnly: (v: boolean) => void;
  onHidden: (v: boolean) => void;
  onArchive: (v: boolean) => void;
}) {
  const name = node?.name ?? path.split('\\').pop() ?? path;
  const isDir = node?.type === 'directory';
  const ext = getExtension(name);

  const icon = isDir ? '/icons/folder-32.svg' : ICON_BY_EXT[ext] ?? '/icons/file-32.svg';
  const type = isDir ? 'File Folder' : TYPE_LABELS[ext] ?? (ext ? `${ext.toUpperCase()} File` : 'File');

  const stats = useMemo(() => (isDir && node ? folderStats(node) : null), [isDir, node]);
  const sizeBytes = isDir ? stats?.bytes ?? 0 : node?.size ?? 0;

  const location = getParentPath(path);
  const contains = stats ? `${stats.files.toLocaleString()} Files, ${stats.folders.toLocaleString()} Folders` : null;

  return (
    <div>
      {/* Icon + name header */}
      <div className="flex items-center gap-2 pb-1">
        <img src={icon} alt="" width={32} height={32} className="w-8 h-8 flex-shrink-0" style={{ imageRendering: 'pixelated' }} />
        <span className="flex-1 break-words">{name}</span>
      </div>
      <Divider />

      <Row label="Type:" value={type} />
      <Row label="Location:" value={location} />
      <Row label="Size:" value={sizeWithBytes(sizeBytes)} />
      {contains && <Row label="Contains:" value={contains} />}
      <Divider />

      <Row label="MS-DOS name:" value={dosName(name)} />
      {node?.created && <Row label="Created:" value={node.created} />}
      {node?.modified && <Row label="Modified:" value={node.modified} />}
      <Divider />

      <div className="flex items-start">
        <span className={ROW_LABEL}>Attributes:</span>
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex gap-4">
            <Checkbox98 label="Read-only" checked={readOnly} onChange={(e) => onReadOnly(e.target.checked)} />
            <Checkbox98 label="Hidden" checked={hidden} onChange={(e) => onHidden(e.target.checked)} />
          </div>
          <div className="flex gap-4">
            <Checkbox98 label="Archive" checked={archive} onChange={(e) => onArchive(e.target.checked)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DriveGeneral({ node }: { node: FSNode | null }) {
  const used = useMemo(() => SYSTEM_USED + (node ? folderStats(node).bytes : 0), [node]);
  const free = Math.max(0, DRIVE_CAPACITY - used);
  const capacity = DRIVE_CAPACITY;
  const usedFraction = capacity > 0 ? used / capacity : 0;

  return (
    <div>
      <div className="flex items-center gap-2 pb-1">
        <img src="/icons/drive-16.svg" alt="" width={32} height={32} className="w-8 h-8 flex-shrink-0" style={{ imageRendering: 'pixelated' }} />
        <span className="flex-1">Windows 98 (C:)</span>
      </div>
      <Divider />

      <Row label="Type:" value="Local Disk" />
      <Row label="File system:" value="FAT32" />
      <Divider />

      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center py-[2px]">
            <span className="w-3 h-3 mr-2 flex-shrink-0" style={{ backgroundColor: '#ff00ff' }} />
            <span className="w-[70px] select-none">Used space:</span>
            <span className="flex-1 text-right">{used.toLocaleString()} bytes</span>
          </div>
          <div className="pl-5 text-right text-[var(--win98-disabled-text)]">{friendlySize(used)}</div>

          <div className="flex items-center py-[2px]">
            <span className="w-3 h-3 mr-2 flex-shrink-0" style={{ backgroundColor: '#00ffff' }} />
            <span className="w-[70px] select-none">Free space:</span>
            <span className="flex-1 text-right">{free.toLocaleString()} bytes</span>
          </div>
          <div className="pl-5 text-right text-[var(--win98-disabled-text)]">{friendlySize(free)}</div>

          <Divider />
          <div className="flex items-center py-[2px]">
            <span className="w-[86px] select-none">Capacity:</span>
            <span className="flex-1 text-right">{capacity.toLocaleString()} bytes</span>
          </div>
          <div className="text-right text-[var(--win98-disabled-text)]">{friendlySize(capacity)}</div>
        </div>

        {/* Pie chart */}
        <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label="Disk usage" className="flex-shrink-0">
          <circle cx="44" cy="44" r="40" fill="#00ffff" stroke="#000000" strokeWidth="1" />
          <path d={wedgePath(44, 44, 40, usedFraction)} fill="#ff00ff" stroke="#000000" strokeWidth="1" />
        </svg>
      </div>

      <Divider />
      <div className="text-center">Drive C</div>
    </div>
  );
}
