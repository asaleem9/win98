'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { normalizePath } from '@/lib/fs/fsOperations';
import { getParentPath } from '@/lib/filesystem';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { playSound } from '@/lib/sounds';
import { usePrint } from '@/components/dialogs/PrintDialog';
import { setClipboard, getClipboard, subscribe } from '@/lib/clipboard';
import {
  invertImageData,
  flipImageDataHorizontal,
  flipImageDataVertical,
  isDataUrl,
  buildFileName,
  rgbToHex,
} from './paintHelpers';

type Tool = 'pencil' | 'brush' | 'eraser' | 'fill' | 'line' | 'rectangle' | 'ellipse' | 'text' | 'picker';

const PALETTE = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#808040', '#004040', '#0080FF', '#004080', '#4000FF', '#804000',
  '#FFFFFF', '#C0C0C0', '#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF',
  '#FFFF80', '#00FF80', '#80FFFF', '#0080C0', '#FF0080', '#FF8040',
];

const TOOLS: { id: Tool; label: string }[] = [
  { id: 'pencil', label: '✏' },
  { id: 'brush', label: '🖌' },
  { id: 'eraser', label: '◻' },
  { id: 'fill', label: '🪣' },
  { id: 'line', label: '╲' },
  { id: 'rectangle', label: '▭' },
  { id: 'ellipse', label: '○' },
  { id: 'text', label: 'A' },
  { id: 'picker', label: '💉' },
];

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'Untitled.bmp';
}

export default function Paint({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle } = useWindows();
  const { readFile, writeFile } = useFileSystem();
  const { openPrint, printDialog } = usePrint(windowId, 'Paint');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [brushSize, setBrushSize] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [textEdit, setTextEdit] = useState<{ x: number; y: number; value: string } | null>(null);
  const textCommitted = useRef(false);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(1);
  const [canPaste, setCanPaste] = useState(false);
  const [pasted, setPasted] = useState<{ dataUrl: string; x: number; y: number; w: number; h: number } | null>(null);
  const pastedImgRef = useRef<HTMLImageElement>(null);

  // Initialize canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = Math.floor(width);
        const h = Math.floor(height);
        if (w > 0 && h > 0 && (w !== canvasSize.width || h !== canvasSize.height)) {
          // Save existing content
          const ctx = canvas.getContext('2d');
          let imgData: ImageData | undefined;
          if (ctx && canvas.width > 0 && canvas.height > 0) {
            imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          }
          canvas.width = w;
          canvas.height = h;
          setCanvasSize({ width: w, height: h });
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            if (imgData) ctx.putImageData(imgData, 0, 0);
          }
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [canvasSize.width, canvasSize.height]);

  // Keep the overlay canvas (used for live shape previews) the same size as the main canvas.
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    overlay.width = canvasSize.width;
    overlay.height = canvasSize.height;
  }, [canvasSize.width, canvasSize.height]);

  // Reflect the current file + dirty state in the window title.
  useEffect(() => {
    const name = currentFilePath ? baseName(currentFilePath) : 'Untitled';
    updateTitle(windowId, `${dirty ? '*' : ''}${name} - Paint`);
  }, [currentFilePath, dirty, windowId, updateTitle]);

  // Keep Paste enabled state in sync with the shared clipboard.
  useEffect(() => {
    const update = () => setCanPaste(getClipboard()?.kind === 'image');
    update();
    return subscribe(update);
  }, []);

  const saveUndo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack((prev) => [...prev.slice(-9), data]);
    setRedoStack([]);
    setDirty(true);
  }, []);

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || undoStack.length === 0) return;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const last = undoStack[undoStack.length - 1];
    ctx.putImageData(last, 0, 0);
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, current]);
    setDirty(true);
  }, [undoStack]);

  const handleRedo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || redoStack.length === 0) return;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const next = redoStack[redoStack.length - 1];
    ctx.putImageData(next, 0, 0);
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, current]);
    setDirty(true);
  }, [redoStack]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    saveUndo();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [saveUndo]);

  const handleFlipHorizontal = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    saveUndo();
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    flipImageDataHorizontal(imgData);
    ctx.putImageData(imgData, 0, 0);
  }, [saveUndo]);

  const handleFlipVertical = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    saveUndo();
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    flipImageDataVertical(imgData);
    ctx.putImageData(imgData, 0, 0);
  }, [saveUndo]);

  const handleInvertColors = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    saveUndo();
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    invertImageData(imgData.data);
    ctx.putImageData(imgData, 0, 0);
  }, [saveUndo]);

  // Copy the whole picture to the shared clipboard as an image.
  const handleCopy = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setClipboard({ kind: 'image', dataUrl: canvas.toDataURL('image/png') });
  }, []);

  // Cut copies, then clears the picture to the background color.
  const handleCut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    handleCopy();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    saveUndo();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [handleCopy, saveUndo, bgColor]);

  // Deposit the floating pasted selection onto the canvas at its current spot.
  const commitPaste = useCallback(() => {
    setPasted((p) => {
      if (p) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const img = pastedImgRef.current;
        if (canvas && ctx && img) {
          saveUndo();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, p.x, p.y);
          setDirty(true);
        }
      }
      return null;
    });
  }, [saveUndo]);

  // Paste drops the clipboard image as a floating selection the user can drag.
  const handlePaste = useCallback(() => {
    const clip = getClipboard();
    if (!clip || clip.kind !== 'image') return;
    const img = new Image();
    img.onload = () => setPasted({ dataUrl: clip.dataUrl, x: 0, y: 0, w: img.width, h: img.height });
    img.onerror = () => {};
    img.src = clip.dataUrl;
  }, []);

  // While a selection floats, Enter deposits it and Escape discards it.
  useEffect(() => {
    if (!pasted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); commitPaste(); }
      else if (e.key === 'Escape') { e.preventDefault(); setPasted(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pasted, commitPaste]);

  const handleNew = useCallback(() => {
    if (dirty) {
      const proceed = window.confirm('Do you want to discard changes and start a new picture?');
      if (!proceed) return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setUndoStack([]);
    setRedoStack([]);
    setCurrentFilePath(null);
    setDirty(false);
  }, [dirty]);

  const loadPath = useCallback(
    (rawPath: string) => {
      const path = normalizePath(rawPath);
      const content = readFile(path);
      if (content == null) {
        showSystemError('Paint', `Cannot find the file '${path}'. Make sure the path and filename are correct.`);
        return;
      }
      if (!isDataUrl(content)) {
        showSystemError('Paint', 'This does not appear to be a valid bitmap file.');
        return;
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.onerror = () => {
          showSystemError('Paint', 'This does not appear to be a valid bitmap file.');
        };
        img.src = content;
      }
      setUndoStack([]);
      setRedoStack([]);
      setCurrentFilePath(path);
      setDirty(false);
      addRecentDoc(path);
    },
    [readFile],
  );

  const handleOpen = useCallback(() => {
    const path = window.prompt('Open file:', currentFilePath ?? 'C:\\My Documents\\');
    if (!path) return;
    loadPath(path);
  }, [currentFilePath, loadPath]);

  const doSave = useCallback(
    (path: string): boolean => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const dataUrl = canvas.toDataURL('image/png');
      const result = writeFile(path, dataUrl);
      if (!result.ok) {
        showSystemError('Paint', result.error);
        return false;
      }
      setCurrentFilePath(path);
      setDirty(false);
      addRecentDoc(path);
      playSound('ding');
      return true;
    },
    [writeFile],
  );

  const handleSaveAs = useCallback(() => {
    const defaultName = currentFilePath ? baseName(currentFilePath) : 'Untitled.bmp';
    const name = window.prompt('Save As - file name:', defaultName);
    if (!name) return;
    const fileName = buildFileName(name);
    const dir = currentFilePath ? getParentPath(currentFilePath) : 'C:\\My Documents';
    doSave(`${dir}\\${fileName}`);
  }, [currentFilePath, doSave]);

  const handleSave = useCallback(() => {
    if (currentFilePath) doSave(currentFilePath);
    else handleSaveAs();
  }, [currentFilePath, doSave, handleSaveAs]);

  const handlePrint = useCallback(() => {
    const name = currentFilePath ? baseName(currentFilePath) : 'Untitled';
    openPrint(() => {
      const canvas = canvasRef.current;
      return canvas ? { kind: 'image', dataUrl: canvas.toDataURL('image/png') } : null;
    }, name);
  }, [currentFilePath, openPrint]);

  // Honor launch params on mount and whenever the app is re-launched with a file.
  useEffect(() => {
    if (launchParams?.filePath) loadPath(launchParams.filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  const getCanvasPos = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // The canvas is displayed at `zoom`x, so map the pointer back to real pixels.
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  };

  const floodFill = useCallback((startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const w = canvas.width;
    const h = canvas.height;

    const idx = (startY * w + startX) * 4;
    const targetR = data[idx], targetG = data[idx + 1], targetB = data[idx + 2];

    // Parse fill color
    const tmp = document.createElement('canvas');
    tmp.width = tmp.height = 1;
    const tmpCtx = tmp.getContext('2d')!;
    tmpCtx.fillStyle = fillColor;
    tmpCtx.fillRect(0, 0, 1, 1);
    const fd = tmpCtx.getImageData(0, 0, 1, 1).data;
    const fillR = fd[0], fillG = fd[1], fillB = fd[2];

    if (targetR === fillR && targetG === fillG && targetB === fillB) return;

    const match = (i: number) =>
      data[i] === targetR && data[i + 1] === targetG && data[i + 2] === targetB;

    const stack = [[startX, startY]];
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const i = (y * w + x) * 4;
      if (!match(i)) continue;
      data[i] = fillR; data[i + 1] = fillG; data[i + 2] = fillB; data[i + 3] = 255;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    ctx.putImageData(imgData, 0, 0);
  }, []);

  const drawPreview = useCallback(
    (pos: { x: number; y: number }) => {
      const overlay = overlayCanvasRef.current;
      const octx = overlay?.getContext('2d');
      if (!overlay || !octx || !startPos) return;
      octx.clearRect(0, 0, overlay.width, overlay.height);
      octx.strokeStyle = color;
      octx.lineWidth = brushSize;
      if (tool === 'line') {
        octx.beginPath();
        octx.moveTo(startPos.x, startPos.y);
        octx.lineTo(pos.x, pos.y);
        octx.stroke();
      } else if (tool === 'rectangle') {
        octx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      } else if (tool === 'ellipse') {
        const cx = (startPos.x + pos.x) / 2;
        const cy = (startPos.y + pos.y) / 2;
        const rx = Math.abs(pos.x - startPos.x) / 2;
        const ry = Math.abs(pos.y - startPos.y) / 2;
        octx.beginPath();
        octx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        octx.stroke();
      }
    },
    [startPos, tool, color, brushSize],
  );

  const clearOverlay = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    const octx = overlay?.getContext('2d');
    if (overlay && octx) octx.clearRect(0, 0, overlay.width, overlay.height);
  }, []);

  const commitText = useCallback(() => {
    if (textCommitted.current) return;
    textCommitted.current = true;
    setTextEdit((current) => {
      if (current && current.value) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setUndoStack((prev) => [...prev.slice(-9), data]);
          setRedoStack([]);
          setDirty(true);
          ctx.fillStyle = color;
          ctx.font = '14px "MS Sans Serif", Arial, sans-serif';
          ctx.fillText(current.value, current.x, current.y);
        }
      }
      return null;
    });
  }, [color]);

  const cancelText = useCallback(() => {
    textCommitted.current = true;
    setTextEdit(null);
  }, []);

  useEffect(() => {
    if (textEdit) textInputRef.current?.focus();
  }, [textEdit]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // A click on the canvas outside a floating paste drops it into place first.
    if (pasted) { commitPaste(); return; }
    const pos = getCanvasPos(e);
    setMousePos(pos);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (tool === 'fill') {
      saveUndo();
      floodFill(Math.floor(pos.x), Math.floor(pos.y), e.button === 2 ? bgColor : color);
      return;
    }
    if (tool === 'picker') {
      const pixel = ctx.getImageData(Math.floor(pos.x), Math.floor(pos.y), 1, 1).data;
      const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
      if (e.button === 2) setBgColor(hex); else setColor(hex);
      return;
    }
    if (tool === 'text') {
      textCommitted.current = false;
      setTextEdit({ x: pos.x, y: pos.y, value: '' });
      return;
    }

    saveUndo();
    setIsDrawing(true);
    setStartPos(pos);

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = tool === 'eraser' ? bgColor : color;
      ctx.lineWidth = tool === 'brush' ? brushSize * 3 : tool === 'eraser' ? brushSize * 4 : brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [tool, color, bgColor, brushSize, saveUndo, floodFill, pasted, commitPaste, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    setMousePos(pos);

    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'line' || tool === 'rectangle' || tool === 'ellipse') {
      drawPreview(pos);
    }
  }, [isDrawing, tool, drawPreview, zoom]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !startPos) {
      setIsDrawing(false);
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      setIsDrawing(false);
      return;
    }
    const pos = getCanvasPos(e);

    if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.stroke();
    } else if (tool === 'rectangle') {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
    } else if (tool === 'ellipse') {
      const cx = (startPos.x + pos.x) / 2;
      const cy = (startPos.y + pos.y) / 2;
      const rx = Math.abs(pos.x - startPos.x) / 2;
      const ry = Math.abs(pos.y - startPos.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.stroke();
    }

    clearOverlay();
    setIsDrawing(false);
    setStartPos(null);
  }, [isDrawing, startPos, tool, color, brushSize, clearOverlay, zoom]);

  const menus: MenuDefinition[] = [
    {
      label: 'File',
      items: [
        { label: 'New', shortcut: 'Ctrl+N', onClick: handleNew },
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: handleOpen },
        { label: 'Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save As...', onClick: handleSaveAs },
        { label: '', separator: true },
        { label: 'Print...', shortcut: 'Ctrl+P', onClick: handlePrint },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', onClick: handleUndo, disabled: undoStack.length === 0 },
        { label: 'Redo', shortcut: 'Ctrl+Y', onClick: handleRedo, disabled: redoStack.length === 0 },
        { label: '', separator: true },
        { label: 'Cut', shortcut: 'Ctrl+X', onClick: handleCut },
        { label: 'Copy', shortcut: 'Ctrl+C', onClick: handleCopy },
        { label: 'Paste', shortcut: 'Ctrl+V', onClick: handlePaste, disabled: !canPaste },
        { label: '', separator: true },
        { label: 'Clear Image', onClick: clearCanvas },
      ],
    },
    {
      label: 'View',
      items: [
        {
          label: 'Zoom',
          submenu: [
            { label: '1x', radio: true, checked: zoom === 1, onClick: () => setZoom(1) },
            { label: '2x', radio: true, checked: zoom === 2, onClick: () => setZoom(2) },
            { label: '4x', radio: true, checked: zoom === 4, onClick: () => setZoom(4) },
          ],
        },
      ],
    },
    {
      label: 'Image',
      items: [
        { label: 'Clear Image', onClick: clearCanvas },
        { label: 'Flip Horizontal', onClick: handleFlipHorizontal },
        { label: 'Flip Vertical', onClick: handleFlipVertical },
        { label: 'Invert Colors', onClick: handleInvertColors },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)]" onContextMenu={(e) => e.preventDefault()}>
      <MenuBar menus={menus} />

      {/* Toolbar row */}
      <div className="flex items-center h-[26px] px-1 gap-1 bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)] font-[family-name:var(--win98-font)] text-[11px]">
        <button
          onClick={handleUndo}
          className="px-2 h-[20px] text-[11px] bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] cursor-default"
        >
          Undo
        </button>
        <div className="w-[1px] h-[18px] bg-[var(--win98-button-shadow)] mx-1" />
        <label className="select-none">Size:</label>
        <select
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="h-[18px] text-[11px] bg-white border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]"
        >
          {[1, 2, 3, 5, 8].map((s) => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Tool sidebar */}
        <div className="w-[34px] flex-shrink-0 bg-[var(--win98-button-face)] border-r border-[var(--win98-button-shadow)] p-[2px]">
          <div className="grid grid-cols-2 gap-[1px]">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => { commitPaste(); setTool(t.id); }}
                title={t.id}
                className={`
                  w-[14px] h-[14px] flex items-center justify-center text-[10px] leading-none cursor-default select-none
                  border border-solid
                  ${tool === t.id
                    ? 'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] bg-[var(--win98-button-light)]'
                    : 'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-shadow)] border-r-[var(--win98-button-shadow)]'
                  }
                `}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas area */}
        <div ref={containerRef} className="flex-1 min-w-0 overflow-auto bg-[#808080] p-0">
          <div className="relative" style={{ width: canvasSize.width * zoom, height: canvasSize.height * zoom }}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { if (isDrawing) { clearOverlay(); setIsDrawing(false); } }}
              className="block cursor-crosshair"
              data-zoom={zoom}
              style={{ imageRendering: 'pixelated', width: canvasSize.width * zoom, height: canvasSize.height * zoom }}
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ imageRendering: 'pixelated', width: canvasSize.width * zoom, height: canvasSize.height * zoom }}
            />
            {pasted && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={pastedImgRef}
                src={pasted.dataUrl}
                alt=""
                draggable={false}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const origin = pasted;
                  const move = (ev: MouseEvent) => {
                    const dx = (ev.clientX - startX) / zoom;
                    const dy = (ev.clientY - startY) / zoom;
                    setPasted((p) => (p ? { ...p, x: origin.x + dx, y: origin.y + dy } : p));
                  };
                  const up = () => {
                    window.removeEventListener('mousemove', move);
                    window.removeEventListener('mouseup', up);
                  };
                  window.addEventListener('mousemove', move);
                  window.addEventListener('mouseup', up);
                }}
                style={{
                  position: 'absolute',
                  left: pasted.x * zoom,
                  top: pasted.y * zoom,
                  width: pasted.w * zoom,
                  height: pasted.h * zoom,
                  imageRendering: 'pixelated',
                  border: '1px dotted #000',
                  cursor: 'move',
                }}
              />
            )}
            {textEdit && (
              <input
                ref={textInputRef}
                value={textEdit.value}
                onChange={(e) => setTextEdit((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitText();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelText();
                  }
                }}
                onBlur={commitText}
                style={{
                  position: 'absolute',
                  left: textEdit.x * zoom,
                  top: textEdit.y * zoom - 14,
                  font: '14px "MS Sans Serif", Arial, sans-serif',
                  color,
                  background: 'transparent',
                  border: '1px dashed #000',
                  outline: 'none',
                  padding: 0,
                  minWidth: 60,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Color palette */}
      <div className="flex items-center h-[32px] px-1 bg-[var(--win98-button-face)] border-t border-[var(--win98-button-highlight)]">
        {/* Current colors */}
        <div className="relative w-[28px] h-[24px] mr-2 flex-shrink-0">
          <div
            className="absolute bottom-0 right-0 w-[18px] h-[18px] border border-[var(--win98-button-shadow)]"
            style={{ backgroundColor: bgColor }}
            onClick={() => setBgColor(color)}
          />
          <div
            className="absolute top-0 left-0 w-[18px] h-[18px] border border-[var(--win98-button-shadow)] z-10"
            style={{ backgroundColor: color }}
          />
        </div>

        {/* Palette grid */}
        <div className="flex flex-wrap gap-0 border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              onContextMenu={(e) => { e.preventDefault(); setBgColor(c); }}
              className="w-[14px] h-[14px] border-[0.5px] border-[var(--win98-button-shadow)] cursor-default"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      <StatusBar98
        panels={[
          { content: `${Math.round(mousePos.x)}, ${Math.round(mousePos.y)}px` },
          { content: `${canvasSize.width} x ${canvasSize.height}`, width: 100 },
        ]}
      />

      {printDialog}
    </div>
  );
}
