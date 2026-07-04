'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { standardHelpMenu } from '@/lib/menus';
import { usePrint } from '@/components/dialogs/PrintDialog';
import type { PrintContent } from '@/lib/print/types';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { FSNode } from '@/types/filesystem';
import { formatSize, getParentPath } from '@/lib/filesystem';
import { joinPath, normalizePath } from '@/lib/fs/fsOperations';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { playSound } from '@/lib/sounds';

const DISC_CAPACITY = 650 * 1024 * 1024; // 650 MB CD-R

interface CompEntry {
  path: string;
  name: string;
  size: number;
  isDir: boolean;
}

interface CompilationFile {
  app: 'nero';
  version: 1;
  comp: CompEntry[];
}

function folderSize(node: FSNode): number {
  if (node.type !== 'directory') return node.size ?? 0;
  return (node.children ?? []).reduce((s, c) => s + folderSize(c), 0);
}

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'New Compilation';
}

function serializeComp(comp: CompEntry[]): string {
  return JSON.stringify({ app: 'nero', version: 1, comp } satisfies CompilationFile);
}

function parseComp(json: string): CompEntry[] | null {
  try {
    const parsed = JSON.parse(json) as CompilationFile;
    if (parsed?.app === 'nero' && Array.isArray(parsed.comp)) return parsed.comp;
  } catch {
    // not JSON / not our shape
  }
  return null;
}

export default function NeroBurningROM({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle, closeWindow } = useWindows();
  const { getNode, listDir, writeFile } = useFileSystem();
  const { openPrint, printDialog } = usePrint(windowId, 'Nero Burning ROM');

  const [browserPath, setBrowserPath] = useState('C:\\');
  const [comp, setComp] = useState<CompEntry[]>([]);
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const [selectedBrowser, setSelectedBrowser] = useState<string | null>(null);
  const [burning, setBurning] = useState(false);
  const [burnProgress, setBurnProgress] = useState(0);
  const [erasing, setErasing] = useState(false);
  const [eraseProgress, setEraseProgress] = useState(0);
  const [fileName, setFileName] = useState('New Compilation');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | 'open' | 'save'>(null);

  const busy = burning || erasing;

  useEffect(() => {
    updateTitle(windowId, `${fileName} - Nero Burning ROM`);
  }, [fileName, windowId, updateTitle]);

  const browserRows = useMemo(() => {
    const children = listDir(browserPath);
    if (!children) return [];
    return [...children].sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1));
  }, [listDir, browserPath]);

  const totalUsed = useMemo(() => comp.reduce((s, e) => s + e.size, 0), [comp]);
  const usagePercent = Math.min(100, (totalUsed / DISC_CAPACITY) * 100);

  const addToComp = useCallback((node: FSNode, path: string) => {
    setComp((prev) => {
      if (prev.some((e) => e.path === path)) return prev;
      const size = node.type === 'directory' ? folderSize(node) : node.size ?? 0;
      return [...prev, { path, name: node.name, size, isDir: node.type === 'directory' }];
    });
    playSound('menuClick');
  }, []);

  const handleBrowserOpen = useCallback((node: FSNode, path: string) => {
    if (node.type === 'directory') setBrowserPath(path);
    else addToComp(node, path);
  }, [addToComp]);

  const browserUp = useCallback(() => {
    if (browserPath !== 'C:\\') setBrowserPath(getParentPath(browserPath));
  }, [browserPath]);

  const addSelected = useCallback(() => {
    if (!selectedBrowser) return;
    const node = getNode(selectedBrowser);
    if (node) addToComp(node, selectedBrowser);
  }, [selectedBrowser, getNode, addToComp]);

  const removeSelected = useCallback(() => {
    if (selectedComp) { setComp((prev) => prev.filter((e) => e.path !== selectedComp)); setSelectedComp(null); }
  }, [selectedComp]);

  const newCompilation = useCallback(() => {
    setComp([]);
    setSelectedComp(null);
    setFilePath(null);
    setFileName('New Compilation');
  }, []);

  const loadPath = useCallback((rawPath: string) => {
    const path = normalizePath(rawPath);
    const node = getNode(path);
    if (!node || node.type !== 'file') {
      showSystemError('Nero Burning ROM', `Cannot find the ${baseName(path)} file.`);
      return;
    }
    const parsed = parseComp(node.content ?? '');
    if (!parsed) {
      showSystemError('Nero Burning ROM', `${baseName(path)} is not a valid Nero compilation.`);
      return;
    }
    setComp(parsed);
    setSelectedComp(null);
    setFilePath(path);
    setFileName(baseName(path));
    addRecentDoc(path);
  }, [getNode]);

  useEffect(() => {
    if (launchParams?.filePath) loadPath(launchParams.filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  const doSave = useCallback((path: string) => {
    const result = writeFile(path, serializeComp(comp));
    if (!result.ok) {
      showSystemError('Nero Burning ROM', result.error);
      return;
    }
    setFilePath(path);
    setFileName(baseName(path));
    addRecentDoc(path);
    playSound('ding');
  }, [comp, writeFile]);

  const handleSave = useCallback(() => {
    if (filePath) doSave(filePath);
    else setPicker('save');
  }, [filePath, doSave]);

  const getPrintContent = useCallback((): PrintContent => {
    const lines = ['Nero Burning ROM', `Compilation: ${fileName}`, 'ISO1 - Disc Layout', ''];
    if (comp.length === 0) lines.push('(empty)');
    for (const e of comp) lines.push(`${e.isDir ? '[DIR] ' : '      '}${e.name}   ${formatSize(e.size)}`);
    lines.push('', `Total: ${formatSize(totalUsed)} of 650 MB`);
    return { kind: 'text', text: lines.join('\n') };
  }, [comp, fileName, totalUsed]);

  const handleBurn = useCallback(() => {
    if (busy) return;
    if (totalUsed > DISC_CAPACITY) {
      window.dispatchEvent(new CustomEvent('win98-system-dialog', {
        detail: { title: 'Nero Burning ROM', message: 'The selected files do not fit on the disc.\n\nPlease remove some files or use a larger medium.' },
      }));
      return;
    }
    setBurning(true);
    setBurnProgress(0);
  }, [busy, totalUsed]);

  // The gag: burning always fails catastrophically with a blue screen.
  useEffect(() => {
    if (!burning) return;
    const interval = setInterval(() => {
      setBurnProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          window.dispatchEvent(new CustomEvent('win98-bsod', { detail: { message: 'NERO_BURN_ENGINE_FAILURE' } }));
          return 100;
        }
        return prev + 2;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [burning]);

  const handleErase = useCallback(() => {
    if (busy) return;
    setErasing(true);
    setEraseProgress(0);
  }, [busy]);

  // Erasing a rewritable disc actually works: run the progress to 100%.
  useEffect(() => {
    if (!erasing) return;
    const interval = setInterval(() => {
      setEraseProgress((p) => Math.min(100, p + 5));
    }, 100);
    return () => clearInterval(interval);
  }, [erasing]);

  // When the erase finishes, wipe the compilation clean.
  useEffect(() => {
    if (!erasing || eraseProgress < 100) return;
    setErasing(false);
    setComp([]);
    setSelectedComp(null);
    window.dispatchEvent(new CustomEvent('win98-system-dialog', {
      detail: { title: 'Nero Burning ROM', message: 'The disc is now blank.' },
    }));
  }, [erasing, eraseProgress]);

  const menus: MenuDefinition[] = [
    {
      label: '&File',
      items: [
        { label: '&New', shortcut: 'Ctrl+N', onClick: newCompilation },
        { label: '&Open...', shortcut: 'Ctrl+O', onClick: () => setPicker('open') },
        { label: '&Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save &As...', onClick: () => setPicker('save') },
        { label: '', separator: true },
        { label: '&Print...', shortcut: 'Ctrl+P', onClick: () => openPrint(getPrintContent, fileName) },
        { label: '', separator: true },
        { label: 'E&xit', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: '&Add to Compilation', onClick: addSelected, disabled: !selectedBrowser },
        { label: '&Remove from Compilation', onClick: removeSelected, disabled: !selectedComp },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Toolbar', checked: true, disabled: true },
        { label: '&Status Bar', checked: true, disabled: true },
      ],
    },
    {
      label: '&Recorder',
      items: [
        { label: '&Burn Compilation', onClick: handleBurn, disabled: busy },
        { label: '&Erase Rewritable...', onClick: handleErase, disabled: busy },
        { label: '', separator: true },
        { label: '&Choose Recorder...', disabled: true },
      ],
    },
    standardHelpMenu('Nero Burning ROM'),
  ];

  const btn = 'px-2 h-[22px] text-[11px] cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)] disabled:text-[var(--win98-disabled-text)]';

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]" data-window-id={windowId}>
      <MenuBar menus={menus} windowId={windowId} />

      {/* Toolbar */}
      <div className="flex gap-1 px-2 py-1 border-b border-[var(--win98-button-shadow)]">
        <button className={btn} onClick={newCompilation}>New</button>
        <button className={btn} onClick={() => setPicker('open')}>Open</button>
        <button className={btn} onClick={handleSave}>Save</button>
        <div className="w-px bg-[var(--win98-button-shadow)] mx-1" />
        <button className={`${btn} font-bold`} onClick={handleBurn} disabled={busy}>🔥 Burn</button>
        <button className={btn} onClick={handleErase} disabled={busy}>Erase</button>
      </div>

      {/* Main content - split panels */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel - disc layout / compilation */}
        <div className="w-1/2 flex flex-col border-r border-[var(--win98-button-shadow)]">
          <div className="flex items-center justify-between px-2 py-1 bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] font-bold text-[10px]">
            <span>💿 ISO1 - Disc Layout</span>
            <button className="text-[10px] px-1 border border-solid border-[var(--win98-button-shadow)] disabled:text-[var(--win98-disabled-text)]" onClick={removeSelected} disabled={!selectedComp}>Remove</button>
          </div>
          <div className="flex-1 overflow-auto bg-white">
            {comp.length === 0 ? (
              <div className="p-2 text-[var(--win98-disabled-text)] select-none">Add files from the browser to compile a disc.</div>
            ) : (
              comp.map((e) => (
                <div
                  key={e.path}
                  className={`flex items-center px-2 py-[2px] cursor-default select-none ${selectedComp === e.path ? 'bg-[var(--win98-highlight)] text-white' : ''}`}
                  onClick={() => setSelectedComp(e.path)}
                  onDoubleClick={() => { setComp((prev) => prev.filter((x) => x.path !== e.path)); setSelectedComp(null); }}
                >
                  <span className="mr-1">{e.isDir ? '📁' : '📄'}</span>
                  <span className="flex-1 truncate">{e.name}</span>
                  <span className="text-[10px]">{formatSize(e.size)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel - file browser */}
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-between px-2 py-1 bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] font-bold text-[10px]">
            <span className="truncate">📁 {browserPath}</span>
            <div className="flex gap-1">
              <button className="text-[10px] px-1 border border-solid border-[var(--win98-button-shadow)] disabled:text-[var(--win98-disabled-text)]" onClick={browserUp} disabled={browserPath === 'C:\\'}>Up</button>
              <button className="text-[10px] px-1 border border-solid border-[var(--win98-button-shadow)] disabled:text-[var(--win98-disabled-text)]" onClick={addSelected} disabled={!selectedBrowser}>Add ▶</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-white">
            {browserRows.map((node) => {
              const path = joinPath(browserPath, node.name);
              return (
                <div
                  key={path}
                  className={`flex items-center px-2 py-[2px] cursor-default select-none ${selectedBrowser === path ? 'bg-[var(--win98-highlight)] text-white' : ''}`}
                  onClick={() => setSelectedBrowser(path)}
                  onDoubleClick={() => handleBrowserOpen(node, path)}
                >
                  <span className="mr-1">{node.type === 'directory' ? '📁' : '📄'}</span>
                  <span className="flex-1 truncate">{node.name}</span>
                  <span className="text-[10px]">{node.type === 'file' && node.size ? formatSize(node.size) : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Burn progress */}
      {burning && (
        <div className="px-2 py-2 border-t border-[var(--win98-button-shadow)]">
          <div className="text-[11px] mb-1">Writing track 1 of 1... {burnProgress}%</div>
          <div className="h-4 border border-solid border-[var(--win98-button-shadow)] bg-white">
            <div className="h-full bg-[var(--win98-highlight)] transition-all" style={{ width: `${burnProgress}%` }} />
          </div>
        </div>
      )}

      {/* Erase progress */}
      {erasing && (
        <div className="px-2 py-2 border-t border-[var(--win98-button-shadow)]">
          <div className="text-[11px] mb-1">Erasing rewritable disc... {eraseProgress}%</div>
          <div className="h-4 border border-solid border-[var(--win98-button-shadow)] bg-white">
            <div className="h-full bg-[var(--win98-highlight)] transition-all" style={{ width: `${eraseProgress}%` }} />
          </div>
        </div>
      )}

      {/* Capacity bar */}
      <div className="px-2 py-1 border-t border-[var(--win98-button-highlight)]">
        <div className="flex items-center gap-2 text-[10px]">
          <span className="whitespace-nowrap">Used: {formatSize(totalUsed)}</span>
          <div className="flex-1 h-3 border border-solid border-[var(--win98-button-shadow)] bg-white relative">
            <div
              className={usagePercent > 100 ? 'h-full bg-red-500' : usagePercent > 90 ? 'h-full bg-yellow-500' : 'h-full bg-[var(--win98-highlight)]'}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <span className="whitespace-nowrap">650 MB</span>
        </div>
      </div>

      {picker && (
        <FilePickerDialog
          mode={picker}
          extensions={['nra']}
          defaultName={picker === 'save' ? (fileName.includes('.') ? fileName : `${fileName}.nra`) : ''}
          onCancel={() => setPicker(null)}
          onConfirm={(path) => {
            const target = picker;
            setPicker(null);
            if (target === 'open') loadPath(path);
            else doSave(path);
          }}
        />
      )}

      {printDialog}
    </div>
  );
}
