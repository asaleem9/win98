'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { Dialog98 } from '@/components/ui/Dialog98';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { playSound } from '@/lib/sounds';
import { normalizePath } from '@/lib/fs/fsOperations';
import { FilePickerDialog } from '../notepad/FilePickerDialog';

interface Slide {
  title: string;
  bullets: string[];
}

interface PresentationFile {
  app: 'powerpoint';
  version: 1;
  slides: Slide[];
}

function initialSlides(): Slide[] {
  return [
    {
      title: 'Welcome to Windows 98',
      bullets: [
        'Faster and more reliable than ever',
        'True plug-and-play support',
        'Internet Explorer 5 included',
        'Windows Media Player built-in',
        'FAT32 support for large drives',
      ],
    },
  ];
}

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'Presentation1';
}

export default function PowerPoint({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle, closeWindow } = useWindows();
  const { getNode, writeFile } = useFileSystem();

  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [current, setCurrent] = useState(0);
  const [slideShow, setSlideShow] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('Presentation1');
  const [picker, setPicker] = useState<null | 'open' | 'save'>(null);
  const [showAbout, setShowAbout] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);

  const slide = slides[current] ?? slides[0];

  useEffect(() => {
    updateTitle(windowId, `${fileName} - Microsoft PowerPoint`);
  }, [fileName, windowId, updateTitle]);

  const clampIndex = useCallback((i: number, len: number) => Math.max(0, Math.min(len - 1, i)), []);

  const patchSlide = useCallback((index: number, updater: (s: Slide) => Slide) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? updater(s) : s)));
  }, []);

  const addSlide = useCallback(() => {
    setSlides((prev) => {
      const next = [...prev];
      next.splice(current + 1, 0, { title: 'New Slide', bullets: ['Click to add text'] });
      return next;
    });
    setCurrent((c) => c + 1);
  }, [current]);

  const duplicateSlide = useCallback(() => {
    setSlides((prev) => {
      const next = [...prev];
      next.splice(current + 1, 0, { title: prev[current].title, bullets: [...prev[current].bullets] });
      return next;
    });
    setCurrent((c) => c + 1);
  }, [current]);

  const deleteSlide = useCallback(() => {
    setSlides((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((_, i) => i !== current);
      setCurrent((c) => clampIndex(c, next.length));
      return next;
    });
  }, [current, clampIndex]);

  const moveSlide = useCallback((dir: -1 | 1) => {
    setSlides((prev) => {
      const target = current + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[current], next[target]] = [next[target], next[current]];
      setCurrent(target);
      return next;
    });
  }, [current]);

  const advance = useCallback((dir: 1 | -1) => {
    setCurrent((c) => {
      const nextIdx = c + dir;
      if (nextIdx >= slides.length) {
        setSlideShow(false);
        return c;
      }
      return Math.max(0, nextIdx);
    });
  }, [slides.length]);

  useEffect(() => {
    if (!slideShow) return;
    rootRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSlideShow(false);
      else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); advance(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slideShow, advance]);

  const startSlideShow = useCallback(() => {
    setCurrent(0);
    setSlideShow(true);
  }, []);

  const loadPath = useCallback((rawPath: string) => {
    const path = normalizePath(rawPath);
    const node = getNode(path);
    if (!node || node.type !== 'file') {
      showSystemError('Microsoft PowerPoint', `Cannot find the ${baseName(path)} file.`);
      return;
    }
    try {
      const parsed = JSON.parse(node.content ?? '') as PresentationFile;
      if (parsed?.app === 'powerpoint' && Array.isArray(parsed.slides) && parsed.slides.length) {
        setSlides(parsed.slides);
        setCurrent(0);
        setFilePath(path);
        setFileName(baseName(path));
        addRecentDoc(path);
        return;
      }
      throw new Error('bad format');
    } catch {
      showSystemError('Microsoft PowerPoint', `${baseName(path)} is not a valid PowerPoint presentation, or the file is corrupt.`);
    }
  }, [getNode]);

  useEffect(() => {
    if (launchParams?.filePath) loadPath(launchParams.filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  const doSave = useCallback((path: string) => {
    const payload: PresentationFile = { app: 'powerpoint', version: 1, slides };
    const result = writeFile(path, JSON.stringify(payload));
    if (!result.ok) {
      showSystemError('Microsoft PowerPoint', result.error);
      return;
    }
    setFilePath(path);
    setFileName(baseName(path));
    addRecentDoc(path);
    playSound('ding');
  }, [slides, writeFile]);

  const handleSave = useCallback(() => {
    if (filePath) doSave(filePath);
    else setPicker('save');
  }, [filePath, doSave]);

  const handleNew = useCallback(() => {
    setSlides(initialSlides());
    setCurrent(0);
    setFilePath(null);
    setFileName('Presentation1');
  }, []);

  const menus: MenuDefinition[] = [
    {
      label: 'File',
      items: [
        { label: 'New', onClick: handleNew },
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: () => setPicker('open') },
        { label: 'Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save As...', onClick: () => setPicker('save') },
        { label: '', separator: true },
        { label: 'Print...', shortcut: 'Ctrl+P', onClick: () => showSystemError('Microsoft PowerPoint', 'There are no printers installed. To install a printer, use the Add Printer wizard in the Printers folder.') },
        { label: '', separator: true },
        { label: 'Exit', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'New Slide', onClick: addSlide },
        { label: 'Duplicate Slide', onClick: duplicateSlide },
        { label: 'Delete Slide', onClick: deleteSlide },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Normal', checked: true, disabled: true },
        { label: 'Slide Sorter', disabled: true },
        { label: '', separator: true },
        { label: 'Slide Show', shortcut: 'F5', onClick: startSlideShow },
      ],
    },
    {
      label: 'Insert',
      items: [
        { label: 'New Slide', onClick: addSlide },
        { label: 'Picture', onClick: () => showSystemError('Microsoft PowerPoint', 'The Clip Gallery is not available. Please insert the Office 97 CD-ROM.') },
      ],
    },
    {
      label: 'Slide Show',
      items: [
        { label: 'View Show', shortcut: 'F5', onClick: startSlideShow },
        { label: 'Rehearse Timings', disabled: true },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About Microsoft PowerPoint', onClick: () => setShowAbout(true) }],
    },
  ];

  if (slideShow) {
    return (
      <div
        ref={rootRef}
        tabIndex={0}
        className="relative h-full w-full bg-black flex items-center justify-center outline-none cursor-pointer select-none"
        data-window-id={windowId}
        onClick={() => advance(1)}
        onContextMenu={(e) => { e.preventDefault(); advance(-1); }}
      >
        <div className="w-full h-full flex flex-col p-12 text-white">
          <h1 className="text-[36px] font-bold text-center mb-8" style={{ color: '#FFD700' }}>{slide.title}</h1>
          <div className="flex-1 flex flex-col justify-center gap-4 px-12">
            {slide.bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-3 text-[24px]">
                <span>•</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
          <div className="text-center text-[12px] text-gray-400">
            Slide {current + 1} of {slides.length} — click or → to advance, Esc to exit
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none" data-window-id={windowId}>
      <MenuBar menus={menus} />

      {/* Toolbar */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[var(--win98-button-shadow)]">
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="New" onClick={handleNew}>📄</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Open" onClick={() => setPicker('open')}>📂</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Save" onClick={handleSave}>💾</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="New Slide" onClick={addSlide}>➕</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Duplicate Slide" onClick={duplicateSlide}>⧉</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Delete Slide" onClick={deleteSlide}>🗑️</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[var(--win98-button-shadow)] border-r border-r-[var(--win98-button-highlight)]" />
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Slide Show (F5)" onClick={startSlideShow}>▶</button>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Slide thumbnail sidebar */}
        <div className="w-[130px] bg-[var(--win98-button-face)] border-r-2 border-r-[var(--win98-button-shadow)] overflow-y-auto p-2 flex flex-col gap-2">
          <div className="flex gap-1 mb-1">
            <button className="win98-raised px-1 h-[16px] text-[9px] flex-1" title="Move up" onClick={() => moveSlide(-1)} disabled={current === 0}>▲</button>
            <button className="win98-raised px-1 h-[16px] text-[9px] flex-1" title="Move down" onClick={() => moveSlide(1)} disabled={current === slides.length - 1}>▼</button>
          </div>
          {slides.map((s, i) => (
            <div
              key={i}
              className={`border-2 cursor-pointer ${i === current ? 'border-[#000080]' : 'border-[var(--win98-button-shadow)]'}`}
              onClick={() => setCurrent(i)}
            >
              <div className="bg-white aspect-[4/3] p-1 flex flex-col">
                <div className="text-[6px] font-bold text-[#000080] text-center mb-[2px] truncate">{s.title}</div>
                {s.bullets.slice(0, 3).map((b, j) => (
                  <div key={j} className="text-[4px] text-black pl-1 truncate">• {b}</div>
                ))}
              </div>
              <div className="text-center text-[9px] py-[1px] bg-[var(--win98-button-face)]">{i + 1}</div>
            </div>
          ))}
        </div>

        {/* Slide editing area */}
        <div className="flex-1 bg-[#808080] flex items-center justify-center overflow-auto p-4">
          <div className="bg-white shadow-lg border border-[var(--win98-button-shadow)]" style={{ width: '480px', minHeight: '360px', position: 'relative' }}>
            <div className="absolute inset-0 flex flex-col p-6">
              <input
                className="text-[24px] font-bold text-[#000080] text-center mb-4 border border-dashed border-transparent hover:border-[#808080] focus:border-[#808080] px-2 py-1 outline-none bg-transparent"
                value={slide.title}
                onChange={(e) => patchSlide(current, (s) => ({ ...s, title: e.target.value }))}
              />
              <div className="h-[2px] bg-[#000080] mb-4 mx-4" />
              <textarea
                className="flex-1 text-[14px] text-black border border-dashed border-transparent hover:border-[#808080] focus:border-[#808080] px-2 outline-none resize-none bg-transparent font-[family-name:var(--win98-font)]"
                value={slide.bullets.join('\n')}
                onChange={(e) => patchSlide(current, (s) => ({ ...s, bullets: e.target.value.split('\n') }))}
                placeholder="One bullet per line"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center h-[20px] px-1 border-t border-[var(--win98-button-highlight)]">
        <span className="win98-sunken px-2 py-0 flex-1">Slide {current + 1} of {slides.length}</span>
        <span className="win98-sunken px-2 py-0 w-[120px]">Default Design</span>
      </div>

      {picker && (
        <FilePickerDialog
          mode={picker}
          extensions={['ppt']}
          defaultName={picker === 'save' ? (fileName.includes('.') ? fileName : `${fileName}.ppt`) : ''}
          onCancel={() => setPicker(null)}
          onConfirm={(path) => {
            const target = picker;
            setPicker(null);
            if (target === 'open') loadPath(path);
            else doSave(path);
          }}
        />
      )}

      {showAbout && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
          <Dialog98
            title="About Microsoft PowerPoint"
            icon="info"
            message={
              <div className="space-y-1">
                <p className="font-bold">Microsoft PowerPoint 97</p>
                <p>Copyright (C) 1987-1997 Microsoft Corp.</p>
              </div>
            }
            buttons={[{ label: 'OK', default: true, onClick: () => setShowAbout(false) }]}
          />
        </div>
      )}
    </div>
  );
}
