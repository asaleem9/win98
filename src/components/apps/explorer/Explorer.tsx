'use client';

import { useState, useCallback, useMemo, useEffect, useRef, MouseEvent } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useSettings } from '@/contexts/SettingsContext';
import { imageWallpaper } from '@/lib/wallpaperActions';
import { useFileOpener, showSystemError } from '@/hooks/useFileOpener';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { Toolbar98 } from '@/components/ui/Toolbar98';
import { TreeView98, TreeNode } from '@/components/ui/TreeView98';
import { ListViewMode } from '@/components/ui/ListView98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { ContextMenu, ContextMenuItem } from '@/components/desktop/ContextMenu';
import { Dialog98 } from '@/components/ui/Dialog98';
import { FSNode } from '@/types/filesystem';
import { formatSize, getParentPath } from '@/lib/filesystem';
import { normalizePath, joinPath, uniqueName } from '@/lib/fs/fsOperations';
import { playSound } from '@/lib/sounds';
import { addRecentDoc } from '@/lib/recentDocs';
import { setClipboard, getClipboard, clearClipboard, subscribe, type ClipboardData } from '@/lib/clipboard';
import { FileList, FileRow } from './FileList';

const FILE_TYPES: Record<string, string> = {
  exe: 'Application', dll: 'Application Extension', sys: 'System File',
  txt: 'Text Document', doc: 'Microsoft Word Document', xls: 'Microsoft Excel Worksheet',
  bmp: 'Bitmap Image', ini: 'Configuration Settings', bat: 'MS-DOS Batch File',
  ttf: 'TrueType Font', htm: 'HTML Document', html: 'HTML Document',
  zip: 'WinZip File', rar: 'WinRAR archive', reg: 'Registration Entries',
};

function fileType(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  return FILE_TYPES[ext] || (ext ? `${ext.toUpperCase()} File` : 'File');
}

function toRow(node: FSNode, parentPath: string): FileRow {
  const id = joinPath(parentPath, node.name);
  const isDir = node.type === 'directory';
  const defaultIcon16 = isDir ? '/icons/folder-16.svg' : '/icons/file-16.svg';
  const icon16 = node.icon || defaultIcon16;
  return {
    id,
    name: node.name,
    icon: icon16.replace('-16', '-32'),
    icon16,
    type: isDir ? 'File Folder' : fileType(node.name),
    size: node.type === 'file' && node.size ? formatSize(node.size) : '',
    modified: node.modified,
    isDir,
  };
}

function buildTree(node: FSNode, path: string): TreeNode {
  const fullPath = node.name === 'C:' ? 'C:\\' : (path ? joinPath(path, node.name) : node.name);
  return {
    id: fullPath,
    label: node.name,
    icon: node.icon || '/icons/folder-16.svg',
    children: node.children?.filter((c) => c.type === 'directory').map((c) => buildTree(c, fullPath)),
  };
}

type CreateOp =
  | { kind: 'folder'; dir: string; name: string }
  | { kind: 'file'; dir: string; name: string; content: string }
  | { kind: 'move'; src: string; destDir: string };

export default function Explorer({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle, closeWindow } = useWindows();
  const { root, getNode, listDir, readFile, createFile, createFolder, rename, move, deleteToRecycleBin } = useFileSystem();
  const { setSetting } = useSettings();
  const { openFile } = useFileOpener();

  const start = launchParams?.filePath ? normalizePath(launchParams.filePath) : 'C:\\';
  const [currentPath, setCurrentPath] = useState(start);
  const [viewMode, setViewMode] = useState<ListViewMode>('large-icons');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([start]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [addressValue, setAddressValue] = useState(start);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [clip, setClip] = useState<ClipboardData | null>(() => getClipboard());
  const [menu, setMenu] = useState<{ x: number; y: number; targetId: string | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [propsFor, setPropsFor] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [opQueue, setOpQueue] = useState<CreateOp[]>([]);

  const setTitle = useCallback((path: string) => updateTitle(windowId, `Exploring - ${path}`), [updateTitle, windowId]);

  // Re-navigate when a fresh launchParams arrives (My Documents, file-open, etc.)
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const p = launchParams?.filePath ? normalizePath(launchParams.filePath) : 'C:\\';
    setCurrentPath(p);
    setAddressValue(p);
    setSelected(new Set());
    setHistory((h) => [...h, p]);
    setHistoryIndex((i) => i + 1);
    setTitle(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  // Mirror the shared clipboard so paste availability and cut-ghosting stay
  // live, even when another app changes the clipboard.
  useEffect(() => {
    setClip(getClipboard());
    return subscribe((data) => setClip(data));
  }, []);

  const canPaste = clip?.kind === 'files';
  const cutPaths = useMemo(
    () => (clip?.kind === 'files' && clip.operation === 'cut' ? new Set(clip.paths) : new Set<string>()),
    [clip],
  );

  const rows = useMemo<FileRow[]>(() => {
    const children = listDir(currentPath);
    if (!children) return [];
    return [...children]
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1))
      .map((c) => toRow(c, currentPath));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listDir, currentPath, root]);

  const treeNodes = useMemo<TreeNode[]>(() => [buildTree(root, '')], [root]);

  // Serialized executor: one FS mutation per render so context state settles
  // between operations (create/move read a ref that only updates on re-render).
  useEffect(() => {
    if (opQueue.length === 0) return;
    const [op, ...rest] = opQueue;
    if (op.kind === 'folder') createFolder(op.dir, op.name);
    else if (op.kind === 'file') createFile(op.dir, op.name, op.content);
    else move(op.src, op.destDir);
    setOpQueue(rest);
  }, [opQueue, createFolder, createFile, move]);

  const navigateTo = useCallback((path: string, pushHistory = true) => {
    const norm = normalizePath(path);
    const node = getNode(norm);
    if (!node || node.type !== 'directory') {
      showSystemError('Windows Explorer', `'${path}' is not accessible.\n\nThe path is not valid. Check the path and try again.`);
      return false;
    }
    setCurrentPath(norm);
    setAddressValue(norm);
    setSelected(new Set());
    setRenamingId(null);
    setTitle(norm);
    if (pushHistory) {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), norm]);
      setHistoryIndex((prev) => prev + 1);
    }
    return true;
  }, [getNode, historyIndex, setTitle]);

  const handleBack = useCallback(() => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    setHistoryIndex(idx);
    const p = history[idx];
    setCurrentPath(p); setAddressValue(p); setSelected(new Set()); setTitle(p);
  }, [history, historyIndex, setTitle]);

  const handleForward = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    setHistoryIndex(idx);
    const p = history[idx];
    setCurrentPath(p); setAddressValue(p); setSelected(new Set()); setTitle(p);
  }, [history, historyIndex, setTitle]);

  const handleUp = useCallback(() => {
    if (currentPath === 'C:\\') return;
    navigateTo(getParentPath(currentPath));
  }, [currentPath, navigateTo]);

  // Selection --------------------------------------------------------------
  const handleSelectClick = useCallback((id: string, e: MouseEvent) => {
    setRenamingId(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (e.ctrlKey || e.metaKey) {
        if (next.has(id)) next.delete(id); else next.add(id);
      } else if (e.shiftKey && anchor) {
        const ids = rows.map((r) => r.id);
        const a = ids.indexOf(anchor);
        const b = ids.indexOf(id);
        if (a !== -1 && b !== -1) {
          next.clear();
          for (let i = Math.min(a, b); i <= Math.max(a, b); i++) next.add(ids[i]);
        }
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
    if (!e.shiftKey) setAnchor(id);
  }, [anchor, rows]);

  const handleOpen = useCallback((id: string) => {
    const node = getNode(id);
    if (!node) return;
    if (node.type === 'directory') navigateTo(id);
    else { addRecentDoc(id); openFile(id); }
  }, [getNode, navigateTo, openFile]);

  // File operations --------------------------------------------------------
  const newFolder = useCallback(() => { createFolder(currentPath, 'New Folder'); playSound('menuClick'); }, [createFolder, currentPath]);
  const newTextDoc = useCallback(() => { createFile(currentPath, 'New Text Document.txt', ''); playSound('menuClick'); }, [createFile, currentPath]);

  const doDelete = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    playSound('recycle');
    ids.forEach((id) => deleteToRecycleBin(id));
    setSelected(new Set());
    setConfirmDelete(null);
  }, [deleteToRecycleBin]);

  const requestDelete = useCallback((ids: string[]) => { if (ids.length > 0) setConfirmDelete(ids); }, []);

  const commitRename = useCallback((id: string, newName: string) => {
    setRenamingId(null);
    const node = getNode(id);
    if (!node || newName === node.name || !newName.trim()) return;
    const res = rename(id, newName.trim());
    if (!res.ok) showSystemError('Rename', res.error);
  }, [getNode, rename]);

  const doCopy = useCallback((ids: string[]) => { if (ids.length) setClipboard({ kind: 'files', paths: ids, operation: 'copy' }); }, []);
  const doCut = useCallback((ids: string[]) => { if (ids.length) setClipboard({ kind: 'files', paths: ids, operation: 'cut' }); }, []);

  const buildCopyOps = useCallback((node: FSNode, destDir: string, forcedName?: string): CreateOp[] => {
    const dest = getNode(destDir);
    const name = forcedName ?? (dest ? uniqueName(dest, node.name) : node.name);
    if (node.type === 'directory') {
      const ops: CreateOp[] = [{ kind: 'folder', dir: destDir, name }];
      const childDir = joinPath(destDir, name);
      for (const c of node.children ?? []) ops.push(...buildCopyOps(c, childDir, c.name));
      return ops;
    }
    return [{ kind: 'file', dir: destDir, name, content: node.content ?? '' }];
  }, [getNode]);

  const doPaste = useCallback(() => {
    const data = getClipboard();
    if (!data || data.kind !== 'files') return;
    const ops: CreateOp[] = [];
    for (const src of data.paths) {
      const node = getNode(src);
      if (!node) continue;
      if (data.operation === 'cut') ops.push({ kind: 'move', src, destDir: currentPath });
      else ops.push(...buildCopyOps(node, currentPath));
    }
    if (ops.length) setOpQueue((q) => [...q, ...ops]);
    if (data.operation === 'cut') clearClipboard();
    playSound('menuClick');
  }, [getNode, currentPath, buildCopyOps]);

  const selectAll = useCallback(() => setSelected(new Set(rows.map((r) => r.id))), [rows]);
  const invertSelection = useCallback(() => setSelected((prev) => {
    const next = new Set<string>();
    for (const r of rows) if (!prev.has(r.id)) next.add(r.id);
    return next;
  }), [rows]);

  const beginRename = useCallback((id: string | null) => {
    const target = id ?? (selected.size === 1 ? [...selected][0] : null);
    if (target) { setSelected(new Set([target])); setRenamingId(target); }
  }, [selected]);

  // Keyboard shortcuts -----------------------------------------------------
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (renamingId) return;
    if (e.key === 'F2') { e.preventDefault(); beginRename(null); }
    else if (e.key === 'Delete') { e.preventDefault(); requestDelete([...selected]); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); selectAll(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { doCopy([...selected]); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') { doCut([...selected]); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') { doPaste(); }
    else if (e.key === 'Backspace') { e.preventDefault(); handleUp(); }
  }, [renamingId, beginRename, requestDelete, selected, selectAll, doCopy, doCut, doPaste, handleUp]);

  // Menus ------------------------------------------------------------------
  const selArr = useMemo(() => [...selected], [selected]);
  const menus: MenuDefinition[] = [
    {
      label: 'File',
      items: [
        { label: 'New Folder', onClick: newFolder },
        { label: 'New Text Document', onClick: newTextDoc },
        { label: '', separator: true },
        { label: 'Rename', disabled: selected.size !== 1, onClick: () => beginRename(null) },
        { label: 'Delete', disabled: selected.size === 0, onClick: () => requestDelete(selArr) },
        { label: 'Properties', disabled: selected.size !== 1, onClick: () => setPropsFor(selArr[0]) },
        { label: '', separator: true },
        { label: 'Close', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Cut', shortcut: 'Ctrl+X', disabled: selected.size === 0, onClick: () => doCut(selArr) },
        { label: 'Copy', shortcut: 'Ctrl+C', disabled: selected.size === 0, onClick: () => doCopy(selArr) },
        { label: 'Paste', shortcut: 'Ctrl+V', disabled: !canPaste, onClick: doPaste },
        { label: '', separator: true },
        { label: 'Select All', shortcut: 'Ctrl+A', onClick: selectAll },
        { label: 'Invert Selection', onClick: invertSelection },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Large Icons', checked: viewMode === 'large-icons', onClick: () => setViewMode('large-icons') },
        { label: 'Small Icons', checked: viewMode === 'small-icons', onClick: () => setViewMode('small-icons') },
        { label: 'List', checked: viewMode === 'list', onClick: () => setViewMode('list') },
        { label: 'Details', checked: viewMode === 'details', onClick: () => setViewMode('details') },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About Windows Explorer', onClick: () => setShowAbout(true) }],
    },
  ];

  const toolbarItems = [
    { id: 'back', label: 'Back', onClick: handleBack, disabled: historyIndex <= 0 },
    { id: 'forward', label: 'Forward', onClick: handleForward, disabled: historyIndex >= history.length - 1 },
    { id: 'up', label: 'Up', onClick: handleUp, disabled: currentPath === 'C:\\' },
    { id: 'sep1', separator: true },
    { id: 'cut', label: '✂', onClick: () => doCut(selArr), disabled: selected.size === 0 },
    { id: 'copy', label: '⧉', onClick: () => doCopy(selArr), disabled: selected.size === 0 },
    { id: 'paste', label: '📋', onClick: doPaste, disabled: !canPaste },
    { id: 'del', label: '✖', onClick: () => requestDelete(selArr), disabled: selected.size === 0 },
    { id: 'sep2', separator: true },
    { id: 'large', label: '⊞', onClick: () => setViewMode('large-icons'), active: viewMode === 'large-icons' },
    { id: 'small', label: '⊡', onClick: () => setViewMode('small-icons'), active: viewMode === 'small-icons' },
    { id: 'list', label: '☰', onClick: () => setViewMode('list'), active: viewMode === 'list' },
    { id: 'details', label: '≡', onClick: () => setViewMode('details'), active: viewMode === 'details' },
  ];

  const columns = [
    { key: 'name', label: 'Name', width: 200 },
    { key: 'size', label: 'Size', width: 80 },
    { key: 'type', label: 'Type', width: 150 },
    { key: 'modified', label: 'Modified', width: 120 },
  ];

  const openContextMenu = useCallback((id: string | null, e: MouseEvent) => {
    if (id && !selected.has(id)) { setSelected(new Set([id])); setAnchor(id); }
    setMenu({ x: e.clientX, y: e.clientY, targetId: id });
  }, [selected]);

  const contextItems: ContextMenuItem[] = useMemo(() => {
    if (!menu) return [];
    const ids = menu.targetId ? (selected.has(menu.targetId) ? [...selected] : [menu.targetId]) : [];
    if (ids.length === 0) {
      return [
        { label: 'New Folder', onClick: newFolder },
        { label: 'New Text Document', onClick: newTextDoc },
        { separator: true },
        { label: 'Paste', onClick: doPaste, disabled: !canPaste },
        { separator: true },
        { label: 'Select All', onClick: selectAll },
      ];
    }
    const singleName = ids.length === 1 ? getNode(ids[0])?.name ?? '' : '';
    const isImage = /\.(bmp|png)$/i.test(singleName);
    return [
      { label: 'Open', bold: true, onClick: () => handleOpen(ids[0]) },
      ...(isImage
        ? ([
            {
              label: 'Set as Wallpaper',
              onClick: () => {
                const content = readFile(ids[0]);
                const source = content && content.startsWith('data:') ? content : ids[0];
                setSetting('wallpaper', imageWallpaper(source, 'center'));
              },
            },
          ] as ContextMenuItem[])
        : []),
      { separator: true },
      { label: 'Cut', onClick: () => doCut(ids) },
      { label: 'Copy', onClick: () => doCopy(ids) },
      { separator: true },
      { label: 'Delete', onClick: () => requestDelete(ids) },
      { label: 'Rename', disabled: ids.length !== 1, onClick: () => beginRename(ids[0]) },
      { separator: true },
      { label: 'Properties', disabled: ids.length !== 1, onClick: () => setPropsFor(ids[0]) },
    ];
  }, [menu, selected, canPaste, newFolder, newTextDoc, doPaste, selectAll, handleOpen, doCut, doCopy, requestDelete, beginRename, getNode, readFile, setSetting]);

  const objectCount = rows.length;
  const selectedNode = selected.size === 1 ? getNode([...selected][0]) : null;

  return (
    <div
      className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <MenuBar menus={menus} />
      <Toolbar98 items={toolbarItems} />

      {/* Address bar */}
      <div className="flex items-center h-[22px] px-[4px] gap-[4px] bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)]">
        <span className="select-none text-[11px]">Address</span>
        <input
          value={addressValue}
          onChange={(e) => setAddressValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const norm = normalizePath(addressValue);
              const node = getNode(norm);
              if (node && node.type !== 'directory') { addRecentDoc(norm); openFile(norm); }
              else navigateTo(addressValue);
            }
          }}
          className="flex-1 h-[18px] px-[2px] bg-white border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] text-[11px] outline-none"
        />
      </div>

      {/* Main content: tree + list */}
      <div className="flex flex-1 min-h-0 gap-0">
        <TreeView98
          nodes={treeNodes}
          selectedId={currentPath}
          onSelect={(n) => navigateTo(n.id)}
          className="w-[180px] flex-shrink-0 border-r-0"
        />
        <FileList
          rows={rows}
          mode={viewMode}
          selected={selected}
          cutPaths={cutPaths}
          renamingId={renamingId}
          columns={columns}
          onSelectClick={handleSelectClick}
          onOpen={handleOpen}
          onContextMenu={openContextMenu}
          onRenameCommit={commitRename}
          onRenameCancel={() => setRenamingId(null)}
          onBackgroundClick={() => { setSelected(new Set()); setRenamingId(null); }}
        />
      </div>

      <StatusBar98
        panels={[
          { content: selected.size > 0 ? `${selected.size} object(s) selected` : `${objectCount} object(s)` },
          { content: selectedNode?.size ? formatSize(selectedNode.size) : '', width: 100 },
        ]}
      />

      {menu && <ContextMenu items={contextItems} position={{ x: menu.x, y: menu.y }} onClose={() => setMenu(null)} />}

      {confirmDelete && (
        <ModalDialog>
          <Dialog98
            title="Confirm File Delete"
            icon="warning"
            message={
              <span className="max-w-[320px] inline-block">
                {confirmDelete.length === 1
                  ? `Are you sure you want to send '${getNode(confirmDelete[0])?.name ?? 'this item'}' to the Recycle Bin?`
                  : `Are you sure you want to send these ${confirmDelete.length} items to the Recycle Bin?`}
              </span>
            }
            buttons={[
              { label: 'Yes', default: true, onClick: () => doDelete(confirmDelete) },
              { label: 'No', onClick: () => setConfirmDelete(null) },
            ]}
            className="shadow-lg"
          />
        </ModalDialog>
      )}

      {propsFor && <PropertiesDialog node={getNode(propsFor)} path={propsFor} onClose={() => setPropsFor(null)} />}

      {showAbout && (
        <ModalDialog>
          <Dialog98
            title="About Windows Explorer"
            icon="info"
            message={
              <div className="max-w-[320px]">
                <p className="font-bold mb-1">Microsoft Windows</p>
                <p className="mb-2">Windows 98 (4.10.1998)</p>
                <p className="mb-2">Copyright © 1981-1998 Microsoft Corporation</p>
                <p>This product is licensed to:<br />A Valued Customer</p>
              </div>
            }
            buttons={[{ label: 'OK', default: true, onClick: () => setShowAbout(false) }]}
            className="shadow-lg"
          />
        </ModalDialog>
      )}
    </div>
  );
}

function ModalDialog({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/10">{children}</div>;
}

function PropertiesDialog({ node, path, onClose }: { node: FSNode | null; path: string; onClose: () => void }) {
  if (!node) return null;
  const isDir = node.type === 'directory';
  const size = isDir ? folderSize(node) : node.size ?? 0;
  return (
    <ModalDialog>
      <Dialog98
        title={`${node.name} Properties`}
        message={
          <div className="w-[280px]">
            <div className="flex items-center gap-3 pb-2 mb-2 border-b border-[var(--win98-button-shadow)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={(node.icon || (isDir ? '/icons/folder-16.svg' : '/icons/file-16.svg')).replace('-16', '-32')} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
              <span className="font-bold break-all">{node.name}</span>
            </div>
            <Row k="Type" v={isDir ? 'File Folder' : fileType(node.name)} />
            <Row k="Location" v={getParentPath(path)} />
            <Row k="Size" v={`${formatSize(size)} (${size.toLocaleString()} bytes)`} />
            {isDir && <Row k="Contains" v={`${(node.children ?? []).length} item(s)`} />}
            <Row k="Created" v={node.created} />
            <Row k="Modified" v={node.modified} />
            {node.readOnly && <Row k="Attributes" v="Read-only" />}
          </div>
        }
        buttons={[{ label: 'OK', default: true, onClick: onClose }]}
        className="shadow-lg"
      />
    </ModalDialog>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex py-[2px]">
      <span className="w-[80px] text-[var(--win98-disabled-text)] shrink-0">{k}:</span>
      <span className="break-all">{v}</span>
    </div>
  );
}

function folderSize(node: FSNode): number {
  if (node.type !== 'directory') return node.size ?? 0;
  return (node.children ?? []).reduce((sum, c) => sum + folderSize(c), 0);
}
