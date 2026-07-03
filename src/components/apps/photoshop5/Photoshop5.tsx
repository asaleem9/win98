'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { playSound } from '@/lib/sounds';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { standardHelpMenu } from '@/lib/menus';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { normalizePath } from '@/lib/fs/fsOperations';
import { getParentPath } from '@/lib/filesystem';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { setClipboard, getClipboard } from '@/lib/clipboard';
import {
  addLayer,
  adjustBrightnessContrast,
  adjustHueSaturation,
  addNoisePixels,
  boxBlurPixels,
  clipToSelection,
  deserializePsd,
  duplicatedName,
  embossPixels,
  findEdgesPixels,
  floodFill,
  hexToRgb,
  invertPixels,
  linearGradient,
  magicWandMask,
  mosaicPixels,
  nextLayerName,
  polygonMask,
  rectMask,
  removeLayer,
  reorderLayers,
  rgbToHex,
  selectionBoundary,
  serializePsd,
  sharpenPixels,
  BlendMode,
  PsdDocument,
  PsLayer,
  RGBA,
} from './photoshopHelpers';
import {
  AdjustmentDialog,
  AdjustmentSlider,
  CanvasSizeDialog,
  NewImageDialog,
  ValuePromptDialog,
} from './PhotoshopDialogs';

type ToolId =
  | 'marquee' | 'move' | 'lasso' | 'wand' | 'crop' | 'type' | 'gradient'
  | 'brush' | 'pencil' | 'eraser' | 'bucket' | 'blur' | 'smudge'
  | 'zoom' | 'hand' | 'eyedropper';

const TOOLS: { id: ToolId; icon: string; label: string }[] = [
  { id: 'marquee', icon: '⬚', label: 'Rectangular Marquee' },
  { id: 'move', icon: '➔', label: 'Move' },
  { id: 'lasso', icon: '◇', label: 'Lasso' },
  { id: 'wand', icon: '✦', label: 'Magic Wand' },
  { id: 'crop', icon: '⬒', label: 'Crop' },
  { id: 'type', icon: 'T', label: 'Type' },
  { id: 'gradient', icon: '◐', label: 'Gradient' },
  { id: 'brush', icon: '🖌', label: 'Paintbrush' },
  { id: 'pencil', icon: '✎', label: 'Pencil' },
  { id: 'eraser', icon: '🔲', label: 'Eraser' },
  { id: 'bucket', icon: '🪣', label: 'Paint Bucket' },
  { id: 'blur', icon: '💧', label: 'Blur' },
  { id: 'smudge', icon: '👆', label: 'Smudge' },
  { id: 'zoom', icon: '🔍', label: 'Zoom' },
  { id: 'hand', icon: '✋', label: 'Hand' },
  { id: 'eyedropper', icon: '💉', label: 'Eyedropper' },
];

const SWATCHES = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#808080'];
const BLEND_LABELS: Record<BlendMode, string> = { normal: 'Normal', multiply: 'Multiply', screen: 'Screen', overlay: 'Overlay' };

const DEFAULT_W = 400;
const DEFAULT_H = 300;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

interface HistoryEntry {
  label: string;
  layerId: string;
  snapshot: ImageData;
}

type DragPreview =
  | { type: 'rect'; x0: number; y0: number; x1: number; y1: number }
  | { type: 'line'; x0: number; y0: number; x1: number; y1: number }
  | { type: 'poly'; points: { x: number; y: number }[] }
  | null;

let layerCounter = 0;
function makeLayerId() {
  layerCounter += 1;
  return `layer-${layerCounter}-${Date.now()}`;
}

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'Untitled';
}

function isDataUrl(s: string): boolean {
  return typeof s === 'string' && s.startsWith('data:');
}

function newLayer(name: string): PsLayer {
  return { id: makeLayerId(), name, visible: true, opacity: 100, blend: 'normal' };
}

export default function Photoshop5({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { windows, updateTitle, closeWindow } = useWindows();
  const { readFile, writeFile } = useFileSystem();
  const isFocused = windows.find((w) => w.id === windowId)?.isFocused ?? false;
  const closeSelf = useCallback(() => closeWindow(windowId), [closeWindow, windowId]);

  const [selectedTool, setSelectedTool] = useState<ToolId>('brush');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [activePanel, setActivePanel] = useState<'layers' | 'history'>('layers');

  const [brushSize, setBrushSize] = useState(6);
  const [tolerance, setTolerance] = useState(32);
  const [fontSize, setFontSize] = useState(24);
  const [zoom, setZoom] = useState(1);

  const [canvasSize, setCanvasSize] = useState({ width: DEFAULT_W, height: DEFAULT_H });
  const sizeRef = useRef(canvasSize);
  sizeRef.current = canvasSize;

  const [layers, setLayers] = useState<PsLayer[]>(() => [newLayer('Background')]);
  const [activeLayerId, setActiveLayerId] = useState(layers[0].id);
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const [selection, setSelection] = useState<{ mask: Uint8Array } | null>(null);
  const selectionMask = selection?.mask ?? null;

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const [textEdit, setTextEdit] = useState<{ x: number; y: number; value: string } | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Dialog routing.
  const [picker, setPicker] = useState<null | { mode: 'open' | 'save'; kind: 'psd' | 'png' }>(null);
  const [showNew, setShowNew] = useState(false);
  const [showCanvasSize, setShowCanvasSize] = useState(false);
  const [valuePrompt, setValuePrompt] = useState<null | 'mosaic' | 'noise'>(null);
  const [adjustment, setAdjustment] = useState<null | 'brightness' | 'hue'>(null);
  const [adjustThumb, setAdjustThumb] = useState<ImageData | null>(null);

  // Interaction refs.
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const dragging = useRef(false);
  const strokeSnapshot = useRef<ImageData | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const lassoPoints = useRef<{ x: number; y: number }[]>([]);
  const panStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const moveState = useRef<{ floatCanvas: HTMLCanvasElement; hole: ImageData; startX: number; startY: number } | null>(null);
  const textCommitted = useRef(false);
  const textInputRef = useRef<HTMLInputElement>(null);
  const pendingPaint = useRef<Map<string, string>>(new Map());
  const resizeRestore = useRef<null | (() => void)>(null);

  // Overlay animation state.
  const boundaryRef = useRef<number[]>([]);
  const phaseRef = useRef(0);
  const dragPreviewRef = useRef<DragPreview>(null);

  const getCanvas = useCallback((id: string) => canvasRefs.current.get(id) ?? null, []);
  const getCtx = useCallback((id: string) => getCanvas(id)?.getContext('2d') ?? null, [getCanvas]);
  const getActiveCtx = useCallback(() => getCtx(activeLayerId), [getCtx, activeLayerId]);

  // --- overlay (marching ants + transient previews) --------------------------

  const renderOverlay = useCallback(() => {
    const octx = overlayRef.current?.getContext('2d');
    if (!octx) return;
    const { width, height } = sizeRef.current;
    octx.clearRect(0, 0, width, height);

    const b = boundaryRef.current;
    const phase = phaseRef.current;
    for (let k = 0; k < b.length; k += 2) {
      const x = b[k], y = b[k + 1];
      octx.fillStyle = ((x + y + phase) >> 1) & 1 ? '#ffffff' : '#000000';
      octx.fillRect(x, y, 1, 1);
    }

    const dp = dragPreviewRef.current;
    if (dp) {
      octx.strokeStyle = '#000000';
      octx.lineWidth = 1;
      if (dp.type === 'rect') {
        const x = Math.min(dp.x0, dp.x1);
        const y = Math.min(dp.y0, dp.y1);
        octx.strokeRect(x + 0.5, y + 0.5, Math.abs(dp.x1 - dp.x0), Math.abs(dp.y1 - dp.y0));
      } else if (dp.type === 'line') {
        octx.beginPath();
        octx.moveTo(dp.x0, dp.y0);
        octx.lineTo(dp.x1, dp.y1);
        octx.stroke();
      } else if (dp.type === 'poly' && dp.points.length > 1) {
        octx.beginPath();
        octx.moveTo(dp.points[0].x, dp.points[0].y);
        for (let i = 1; i < dp.points.length; i++) octx.lineTo(dp.points[i].x, dp.points[i].y);
        octx.stroke();
      }
    }

    // Crop shading: darken outside the pending crop rect.
    if (cropRect) {
      octx.fillStyle = 'rgba(0,0,0,0.4)';
      octx.fillRect(0, 0, width, height);
      octx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      octx.strokeStyle = '#ffffff';
      octx.strokeRect(cropRect.x + 0.5, cropRect.y + 0.5, cropRect.w, cropRect.h);
    }
  }, [cropRect]);

  // Recompute the selection outline whenever the mask or size changes.
  useEffect(() => {
    boundaryRef.current = selectionMask
      ? selectionBoundary(selectionMask, canvasSize.width, canvasSize.height)
      : [];
    renderOverlay();
  }, [selectionMask, canvasSize, renderOverlay]);

  // Animate the marching ants.
  useEffect(() => {
    const id = window.setInterval(() => {
      phaseRef.current = (phaseRef.current + 1) & 7;
      renderOverlay();
    }, 120);
    return () => window.clearInterval(id);
  }, [renderOverlay]);

  // --- history ---------------------------------------------------------------

  const pushHistory = useCallback((label: string) => {
    const ctx = getActiveCtx();
    if (!ctx) return;
    const { width, height } = sizeRef.current;
    const snapshot = ctx.getImageData(0, 0, width, height);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), { label, layerId: activeLayerId, snapshot }]);
    setHistoryIndex((prev) => prev + 1);
    setDirty(true);
  }, [activeLayerId, getActiveCtx, historyIndex]);

  const restoreHistory = useCallback((index: number) => {
    const entry = history[index];
    if (!entry) return;
    const ctx = getCtx(entry.layerId);
    if (!ctx) return;
    ctx.putImageData(entry.snapshot, 0, 0);
    setHistoryIndex(index);
  }, [history, getCtx]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) restoreHistory(historyIndex - 1);
  }, [historyIndex, restoreHistory]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1);
  }, [historyIndex, history.length, restoreHistory]);

  // Seed history + paint the background layer white on first mount.
  useEffect(() => {
    const ctx = getActiveCtx();
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }
    pushHistory('New');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drain queued layer paints (Open / Paste / Duplicate) once canvases mount.
  useEffect(() => {
    if (pendingPaint.current.size === 0) return;
    pendingPaint.current.forEach((dataUrl, id) => {
      const canvas = getCanvas(id);
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      pendingPaint.current.delete(id);
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = dataUrl;
    });
  }, [layers, canvasSize, getCanvas]);

  // Repaint canvases after a size change (crop / canvas size / open).
  useLayoutEffect(() => {
    if (resizeRestore.current) {
      const fn = resizeRestore.current;
      resizeRestore.current = null;
      fn();
    }
  }, [canvasSize]);

  // Reflect the current document in the window title.
  useEffect(() => {
    const name = currentFilePath ? baseName(currentFilePath) : 'Untitled-1';
    updateTitle(windowId, `${dirty ? '*' : ''}${name} - Adobe Photoshop`);
  }, [currentFilePath, dirty, windowId, updateTitle]);

  // --- coordinate helpers ----------------------------------------------------

  const getPos = useCallback((e: React.MouseEvent) => {
    const rect = stackRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.floor((e.clientX - rect.left) / zoom),
      y: Math.floor((e.clientY - rect.top) / zoom),
    };
  }, [zoom]);

  // --- flatten / sampling ----------------------------------------------------

  const flattenToCanvas = useCallback((fillWhite = false): HTMLCanvasElement | null => {
    if (typeof document === 'undefined') return null;
    const out = document.createElement('canvas');
    out.width = canvasSize.width;
    out.height = canvasSize.height;
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    if (fillWhite) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
    }
    for (const layer of layers) {
      if (!layer.visible) continue;
      const c = getCanvas(layer.id);
      if (!c) continue;
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = (layer.blend === 'normal' ? 'source-over' : layer.blend) as GlobalCompositeOperation;
      ctx.drawImage(c, 0, 0);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return out;
  }, [canvasSize, layers, getCanvas]);

  // --- pixel-edit plumbing (respects the active selection) -------------------

  const editActiveLayer = useCallback((fn: (data: Uint8ClampedArray, w: number, h: number) => void, label: string) => {
    const ctx = getActiveCtx();
    if (!ctx) return;
    const { width, height } = sizeRef.current;
    const imageData = ctx.getImageData(0, 0, width, height);
    const before = new Uint8ClampedArray(imageData.data);
    fn(imageData.data, width, height);
    clipToSelection(imageData.data, before, selectionMask);
    ctx.putImageData(imageData, 0, 0);
    pushHistory(label);
  }, [getActiveCtx, selectionMask, pushHistory]);

  // Wrap a heavy synchronous edit so the wait cursor paints before it blocks.
  const runHeavy = useCallback((fn: () => void) => {
    setBusy(true);
    requestAnimationFrame(() => {
      try {
        fn();
      } finally {
        setBusy(false);
      }
    });
  }, []);

  // --- brush / pencil / eraser / blur / smudge -------------------------------

  const stampAt = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    if (selectedTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (selectedTool === 'pencil') {
      ctx.fillStyle = fgColor;
      ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(brushSize / 3)), Math.max(1, Math.round(brushSize / 3)));
    } else {
      ctx.fillStyle = fgColor;
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [selectedTool, brushSize, fgColor]);

  const blurUnder = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const r = brushSize + 2;
    const sx = Math.max(0, x - r);
    const sy = Math.max(0, y - r);
    const w = Math.min(sizeRef.current.width - sx, r * 2);
    const h = Math.min(sizeRef.current.height - sy, r * 2);
    if (w <= 0 || h <= 0) return;
    const region = ctx.getImageData(sx, sy, w, h);
    boxBlurPixels(region.data, w, h, 1);
    ctx.putImageData(region, sx, sy);
  }, [brushSize]);

  const smudgeTo = useCallback((ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) => {
    if (typeof document === 'undefined') return;
    const r = brushSize + 2;
    const sx = Math.max(0, from.x - r);
    const sy = Math.max(0, from.y - r);
    const w = Math.min(sizeRef.current.width - sx, r * 2);
    const h = Math.min(sizeRef.current.height - sy, r * 2);
    if (w <= 0 || h <= 0) return;
    const region = ctx.getImageData(sx, sy, w, h);
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d');
    if (!tctx) return;
    tctx.putImageData(region, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(tmp, sx + (to.x - from.x), sy + (to.y - from.y));
    ctx.restore();
  }, [brushSize]);

  const isStrokeTool = selectedTool === 'brush' || selectedTool === 'pencil' || selectedTool === 'eraser'
    || selectedTool === 'blur' || selectedTool === 'smudge';

  // --- selection ops ---------------------------------------------------------

  const selectAll = useCallback(() => {
    setSelection({ mask: rectMask(0, 0, canvasSize.width, canvasSize.height, canvasSize.width, canvasSize.height) });
  }, [canvasSize]);

  const deselect = useCallback(() => setSelection(null), []);

  // --- crop ------------------------------------------------------------------

  const applyCrop = useCallback(() => {
    if (!cropRect || cropRect.w < 1 || cropRect.h < 1) { setCropRect(null); return; }
    const { x, y, w, h } = cropRect;
    // Capture each layer's cropped pixels before the size change wipes canvases.
    const grabbed = new Map<string, ImageData>();
    for (const layer of layers) {
      const ctx = getCtx(layer.id);
      if (ctx) grabbed.set(layer.id, ctx.getImageData(x, y, w, h));
    }
    resizeRestore.current = () => {
      grabbed.forEach((data, id) => {
        const ctx = getCtx(id);
        if (ctx) ctx.putImageData(data, 0, 0);
      });
      pushHistory('Crop');
    };
    setSelection(null);
    setCropRect(null);
    setCanvasSize({ width: w, height: h });
  }, [cropRect, layers, getCtx, pushHistory]);

  // --- pointer handling ------------------------------------------------------

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);
    const alt = e.altKey;
    const right = e.button === 2;
    const ctx = getActiveCtx();

    switch (selectedTool) {
      case 'eyedropper': {
        const flat = flattenToCanvas();
        const fctx = flat?.getContext('2d');
        if (!fctx) return;
        const p = fctx.getImageData(pos.x, pos.y, 1, 1).data;
        const hex = rgbToHex(p[0], p[1], p[2]);
        if (alt || right) setBgColor(hex); else setFgColor(hex);
        return;
      }
      case 'bucket': {
        if (!ctx) return;
        const { width, height } = sizeRef.current;
        const img = ctx.getImageData(0, 0, width, height);
        const [r, g, b] = hexToRgb(right ? bgColor : fgColor);
        const fill: RGBA = [r, g, b, 255];
        runHeavy(() => {
          floodFill(img.data, width, height, pos.x, pos.y, fill, tolerance, selectionMask);
          ctx.putImageData(img, 0, 0);
          pushHistory('Paint Bucket');
        });
        return;
      }
      case 'wand': {
        if (!ctx) return;
        const { width, height } = sizeRef.current;
        const img = ctx.getImageData(0, 0, width, height);
        const mask = magicWandMask(img.data, width, height, pos.x, pos.y, tolerance);
        setSelection({ mask });
        return;
      }
      case 'marquee':
      case 'crop':
        dragStart.current = pos;
        setCropRect(null);
        return;
      case 'gradient':
        dragStart.current = pos;
        return;
      case 'lasso':
        lassoPoints.current = [pos];
        dragging.current = true;
        return;
      case 'zoom': {
        setZoom((z) => {
          const next = alt || right ? z / 2 : z * 2;
          return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
        });
        return;
      }
      case 'hand': {
        const sc = scrollRef.current;
        if (sc) panStart.current = { x: e.clientX, y: e.clientY, left: sc.scrollLeft, top: sc.scrollTop };
        return;
      }
      case 'type': {
        textCommitted.current = false;
        setTextEdit({ x: pos.x, y: pos.y, value: '' });
        return;
      }
      case 'move': {
        if (!ctx || typeof document === 'undefined') return;
        const { width, height } = sizeRef.current;
        const base = ctx.getImageData(0, 0, width, height);
        const hole = new ImageData(new Uint8ClampedArray(base.data), width, height);
        const floatCanvas = document.createElement('canvas');
        floatCanvas.width = width;
        floatCanvas.height = height;
        const fctx = floatCanvas.getContext('2d');
        if (!fctx) return;
        if (selectionMask) {
          // Float only the selected pixels; punch them out of the base layer.
          const floatData = new ImageData(new Uint8ClampedArray(base.data), width, height);
          for (let p = 0; p < selectionMask.length; p++) {
            const i = p * 4;
            if (selectionMask[p]) {
              hole.data[i + 3] = 0;
            } else {
              floatData.data[i + 3] = 0;
            }
          }
          fctx.putImageData(floatData, 0, 0);
        } else {
          fctx.putImageData(base, 0, 0);
          hole.data.fill(0);
        }
        moveState.current = { floatCanvas, hole, startX: pos.x, startY: pos.y };
        drawing.current = true;
        return;
      }
      default: {
        // stroke tools
        if (!ctx) return;
        const { width, height } = sizeRef.current;
        strokeSnapshot.current = ctx.getImageData(0, 0, width, height);
        drawing.current = true;
        lastPos.current = pos;
        if (selectedTool === 'brush' || selectedTool === 'pencil' || selectedTool === 'eraser') {
          stampAt(ctx, pos.x, pos.y);
        } else if (selectedTool === 'blur') {
          blurUnder(ctx, pos.x, pos.y);
        }
        return;
      }
    }
  }, [selectedTool, getPos, getActiveCtx, flattenToCanvas, bgColor, fgColor, tolerance, selectionMask, runHeavy, pushHistory, stampAt, blurUnder]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);

    if (selectedTool === 'hand' && panStart.current) {
      const sc = scrollRef.current;
      if (sc) {
        sc.scrollLeft = panStart.current.left - (e.clientX - panStart.current.x);
        sc.scrollTop = panStart.current.top - (e.clientY - panStart.current.y);
      }
      return;
    }

    if ((selectedTool === 'marquee' || selectedTool === 'crop') && dragStart.current) {
      const s = dragStart.current;
      dragPreviewRef.current = { type: 'rect', x0: s.x, y0: s.y, x1: pos.x, y1: pos.y };
      renderOverlay();
      return;
    }

    if (selectedTool === 'gradient' && dragStart.current) {
      const s = dragStart.current;
      dragPreviewRef.current = { type: 'line', x0: s.x, y0: s.y, x1: pos.x, y1: pos.y };
      renderOverlay();
      return;
    }

    if (selectedTool === 'lasso' && dragging.current) {
      lassoPoints.current.push(pos);
      dragPreviewRef.current = { type: 'poly', points: lassoPoints.current };
      renderOverlay();
      return;
    }

    if (selectedTool === 'move' && moveState.current) {
      const ctx = getActiveCtx();
      const ms = moveState.current;
      if (!ctx) return;
      ctx.putImageData(ms.hole, 0, 0);
      ctx.drawImage(ms.floatCanvas, pos.x - ms.startX, pos.y - ms.startY);
      return;
    }

    if (isStrokeTool && drawing.current && lastPos.current) {
      const ctx = getActiveCtx();
      if (!ctx) return;
      if (selectedTool === 'brush' || selectedTool === 'pencil' || selectedTool === 'eraser') {
        // Interpolate between samples so fast drags stay connected.
        const from = lastPos.current;
        const dist = Math.hypot(pos.x - from.x, pos.y - from.y);
        const steps = Math.max(1, Math.round(dist / 2));
        for (let i = 1; i <= steps; i++) {
          stampAt(ctx, from.x + ((pos.x - from.x) * i) / steps, from.y + ((pos.y - from.y) * i) / steps);
        }
      } else if (selectedTool === 'blur') {
        blurUnder(ctx, pos.x, pos.y);
      } else if (selectedTool === 'smudge') {
        smudgeTo(ctx, lastPos.current, pos);
      }
      lastPos.current = pos;
    }
  }, [selectedTool, getPos, getActiveCtx, isStrokeTool, stampAt, blurUnder, smudgeTo, renderOverlay]);

  const finishStroke = useCallback(() => {
    const ctx = getActiveCtx();
    if (ctx && strokeSnapshot.current && selectionMask) {
      // Clip the whole stroke to the selection using the pre-stroke snapshot.
      const { width, height } = sizeRef.current;
      const now = ctx.getImageData(0, 0, width, height);
      clipToSelection(now.data, strokeSnapshot.current.data, selectionMask);
      ctx.putImageData(now, 0, 0);
    }
    strokeSnapshot.current = null;
    const labels: Partial<Record<ToolId, string>> = {
      brush: 'Paintbrush', pencil: 'Pencil', eraser: 'Eraser', blur: 'Blur', smudge: 'Smudge',
    };
    pushHistory(labels[selectedTool] ?? 'Edit');
  }, [getActiveCtx, selectionMask, selectedTool, pushHistory]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);

    if (selectedTool === 'hand') { panStart.current = null; return; }

    if (selectedTool === 'marquee' && dragStart.current) {
      const s = dragStart.current;
      dragStart.current = null;
      dragPreviewRef.current = null;
      const x = Math.min(s.x, pos.x), y = Math.min(s.y, pos.y);
      const w = Math.abs(pos.x - s.x), h = Math.abs(pos.y - s.y);
      if (w > 1 && h > 1) setSelection({ mask: rectMask(x, y, w, h, canvasSize.width, canvasSize.height) });
      else setSelection(null);
      renderOverlay();
      return;
    }

    if (selectedTool === 'crop' && dragStart.current) {
      const s = dragStart.current;
      dragStart.current = null;
      dragPreviewRef.current = null;
      const x = Math.min(s.x, pos.x), y = Math.min(s.y, pos.y);
      const w = Math.abs(pos.x - s.x), h = Math.abs(pos.y - s.y);
      if (w > 1 && h > 1) setCropRect({ x, y, w, h });
      return;
    }

    if (selectedTool === 'gradient' && dragStart.current) {
      const s = dragStart.current;
      dragStart.current = null;
      dragPreviewRef.current = null;
      const ctx = getActiveCtx();
      if (ctx) {
        const { width, height } = sizeRef.current;
        const img = ctx.getImageData(0, 0, width, height);
        const before = new Uint8ClampedArray(img.data);
        linearGradient(img.data, width, height, s.x, s.y, pos.x, pos.y, hexToRgb(fgColor), hexToRgb(bgColor), selectionMask);
        clipToSelection(img.data, before, selectionMask);
        ctx.putImageData(img, 0, 0);
        pushHistory('Gradient');
      }
      renderOverlay();
      return;
    }

    if (selectedTool === 'lasso' && dragging.current) {
      dragging.current = false;
      dragPreviewRef.current = null;
      const pts = lassoPoints.current;
      lassoPoints.current = [];
      if (pts.length >= 3) setSelection({ mask: polygonMask(pts, canvasSize.width, canvasSize.height) });
      renderOverlay();
      return;
    }

    if (selectedTool === 'move' && moveState.current) {
      moveState.current = null;
      drawing.current = false;
      pushHistory('Move');
      return;
    }

    if (isStrokeTool && drawing.current) {
      drawing.current = false;
      lastPos.current = null;
      finishStroke();
      return;
    }
  }, [selectedTool, getPos, canvasSize, getActiveCtx, fgColor, bgColor, selectionMask, isStrokeTool, finishStroke, pushHistory, renderOverlay]);

  const handleMouseLeave = useCallback(() => {
    if (drawing.current && isStrokeTool) {
      drawing.current = false;
      lastPos.current = null;
      finishStroke();
    }
    if (moveState.current) { moveState.current = null; drawing.current = false; pushHistory('Move'); }
    panStart.current = null;
  }, [isStrokeTool, finishStroke, pushHistory]);

  // --- type tool -------------------------------------------------------------

  useEffect(() => {
    if (textEdit) textInputRef.current?.focus();
  }, [textEdit]);

  const commitText = useCallback(() => {
    if (textCommitted.current) return;
    textCommitted.current = true;
    setTextEdit((current) => {
      if (current && current.value) {
        const ctx = getActiveCtx();
        if (ctx) {
          const { width, height } = sizeRef.current;
          const before = ctx.getImageData(0, 0, width, height);
          ctx.fillStyle = fgColor;
          ctx.font = `${fontSize}px "MS Sans Serif", Arial, sans-serif`;
          ctx.textBaseline = 'top';
          ctx.fillText(current.value, current.x, current.y);
          if (selectionMask) {
            const now = ctx.getImageData(0, 0, width, height);
            clipToSelection(now.data, before.data, selectionMask);
            ctx.putImageData(now, 0, 0);
          }
          pushHistory('Type');
        }
      }
      return null;
    });
  }, [getActiveCtx, fgColor, fontSize, selectionMask, pushHistory]);

  // --- filters & adjustments -------------------------------------------------

  const runFilter = useCallback((fn: (d: Uint8ClampedArray, w: number, h: number) => void, label: string) => {
    runHeavy(() => editActiveLayer(fn, label));
    playSound('ding');
  }, [runHeavy, editActiveLayer]);

  const openAdjustment = useCallback((kind: 'brightness' | 'hue') => {
    // Build a small preview thumbnail from the active layer.
    let thumb: ImageData | null = null;
    if (typeof document !== 'undefined') {
      const src = getCanvas(activeLayerId);
      const tmp = document.createElement('canvas');
      tmp.width = 80; tmp.height = 60;
      const tctx = tmp.getContext('2d');
      if (src && tctx) {
        try {
          tctx.drawImage(src, 0, 0, 80, 60);
          thumb = tctx.getImageData(0, 0, 80, 60);
        } catch {
          thumb = null;
        }
      }
    }
    setAdjustThumb(thumb);
    setAdjustment(kind);
  }, [activeLayerId, getCanvas]);

  // --- file: new / open / save / export --------------------------------------

  const resetHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  const handleNew = useCallback((opts: { width: number; height: number; background: 'white' | 'transparent' }) => {
    const bg = newLayer('Background');
    resizeRestore.current = () => {
      const ctx = getCtx(bg.id);
      if (!ctx) { resetHistory(); return; }
      ctx.clearRect(0, 0, opts.width, opts.height);
      if (opts.background === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, opts.width, opts.height);
      }
      setHistory([{ label: 'New', layerId: bg.id, snapshot: ctx.getImageData(0, 0, opts.width, opts.height) }]);
      setHistoryIndex(0);
    };
    setSelection(null);
    setZoom(1);
    setLayers([bg]);
    setActiveLayerId(bg.id);
    setCanvasSize({ width: opts.width, height: opts.height });
    setCurrentFilePath(null);
    setDirty(false);
    setShowNew(false);
  }, [getCtx, resetHistory]);

  const loadPsd = useCallback((doc: PsdDocument, path: string) => {
    const built: PsLayer[] = doc.layers.length
      ? doc.layers.map((l) => ({ id: makeLayerId(), name: l.name, visible: l.visible, opacity: l.opacity, blend: l.blend }))
      : [newLayer('Background')];
    pendingPaint.current.clear();
    doc.layers.forEach((l, i) => { if (built[i]) pendingPaint.current.set(built[i].id, l.dataUrl); });
    setSelection(null);
    setZoom(1);
    setCanvasSize({ width: doc.width, height: doc.height });
    setLayers(built);
    setActiveLayerId(built[built.length - 1].id);
    setCurrentFilePath(path);
    setDirty(false);
    resetHistory();
    addRecentDoc(path);
  }, [resetHistory]);

  const loadImageFile = useCallback((dataUrl: string, path: string) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || DEFAULT_W;
      const h = img.naturalHeight || DEFAULT_H;
      const bg = newLayer('Background');
      pendingPaint.current.clear();
      pendingPaint.current.set(bg.id, dataUrl);
      setSelection(null);
      setZoom(1);
      setCanvasSize({ width: w, height: h });
      setLayers([bg]);
      setActiveLayerId(bg.id);
      setCurrentFilePath(path);
      setDirty(false);
      resetHistory();
      addRecentDoc(path);
    };
    img.onerror = () => showSystemError('Adobe Photoshop', 'Could not open the document because the file is not compatible.');
    img.src = dataUrl;
  }, [resetHistory]);

  const openPath = useCallback((rawPath: string) => {
    const path = normalizePath(rawPath);
    const content = readFile(path);
    if (content == null) {
      showSystemError('Adobe Photoshop', `Could not open '${path}' because the file could not be found.`);
      return;
    }
    const psd = deserializePsd(content);
    if (psd) { loadPsd(psd, path); return; }
    if (isDataUrl(content)) { loadImageFile(content, path); return; }
    showSystemError('Adobe Photoshop', 'Could not open the document because it is not a valid file.');
  }, [readFile, loadPsd, loadImageFile]);

  const buildPsd = useCallback((): PsdDocument => ({
    format: 'psd-json',
    version: 1,
    width: canvasSize.width,
    height: canvasSize.height,
    layers: layers.map((l) => ({
      name: l.name,
      opacity: l.opacity,
      blend: l.blend,
      visible: l.visible,
      dataUrl: getCanvas(l.id)?.toDataURL('image/png') ?? '',
    })),
  }), [canvasSize, layers, getCanvas]);

  const savePsdTo = useCallback((path: string) => {
    const result = writeFile(path, serializePsd(buildPsd()));
    if (!result.ok) { showSystemError('Adobe Photoshop', result.error); return; }
    setCurrentFilePath(path);
    setDirty(false);
    addRecentDoc(path);
    playSound('ding');
  }, [writeFile, buildPsd]);

  const exportPngTo = useCallback((path: string) => {
    const flat = flattenToCanvas();
    if (!flat) return;
    const result = writeFile(path, flat.toDataURL('image/png'));
    if (!result.ok) { showSystemError('Adobe Photoshop', result.error); return; }
    addRecentDoc(path);
    playSound('ding');
  }, [flattenToCanvas, writeFile]);

  const handleSave = useCallback(() => {
    if (currentFilePath && currentFilePath.toLowerCase().endsWith('.psd')) savePsdTo(currentFilePath);
    else setPicker({ mode: 'save', kind: 'psd' });
  }, [currentFilePath, savePsdTo]);

  const onPickerConfirm = useCallback((fullPath: string) => {
    const p = picker;
    setPicker(null);
    if (!p) return;
    if (p.mode === 'open') openPath(fullPath);
    else if (p.kind === 'psd') savePsdTo(fullPath);
    else exportPngTo(fullPath);
  }, [picker, openPath, savePsdTo, exportPngTo]);

  // Honor launch params on mount and re-launch.
  useEffect(() => {
    if (launchParams?.filePath) openPath(launchParams.filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  // --- edit: copy / paste ----------------------------------------------------

  const handleCopy = useCallback(() => {
    const flat = flattenToCanvas();
    if (!flat) return;
    setClipboard({ kind: 'image', dataUrl: flat.toDataURL('image/png') });
    playSound('ding');
  }, [flattenToCanvas]);

  const handlePaste = useCallback(() => {
    const clip = getClipboard();
    if (!clip || clip.kind !== 'image') return;
    const layer = newLayer(nextLayerName(layers));
    pendingPaint.current.set(layer.id, clip.dataUrl);
    setLayers((prev) => addLayer(prev, () => layer));
    setActiveLayerId(layer.id);
    setDirty(true);
    playSound('ding');
  }, [layers]);

  // --- layer operations ------------------------------------------------------

  const handleAddLayer = useCallback(() => {
    const layer = newLayer(nextLayerName(layers));
    setLayers((prev) => addLayer(prev, () => layer));
    setActiveLayerId(layer.id);
    setDirty(true);
    playSound('chord');
  }, [layers]);

  const handleDuplicateLayer = useCallback(() => {
    const src = layers.find((l) => l.id === activeLayerId);
    if (!src) return;
    const dup = { ...newLayer(duplicatedName(src.name)), opacity: src.opacity, blend: src.blend, visible: src.visible };
    const dataUrl = getCanvas(src.id)?.toDataURL('image/png');
    if (dataUrl) pendingPaint.current.set(dup.id, dataUrl);
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === activeLayerId);
      const next = prev.slice();
      next.splice(idx + 1, 0, dup);
      return next;
    });
    setActiveLayerId(dup.id);
    setDirty(true);
  }, [layers, activeLayerId, getCanvas]);

  const handleDeleteLayer = useCallback(() => {
    setLayers((prev) => {
      const result = removeLayer(prev, activeLayerId);
      if (result !== prev) {
        canvasRefs.current.delete(activeLayerId);
        setActiveLayerId(result[result.length - 1].id);
        setDirty(true);
      }
      return result;
    });
  }, [activeLayerId]);

  const handleMergeDown = useCallback(() => {
    const idx = layers.findIndex((l) => l.id === activeLayerId);
    if (idx <= 0 || typeof document === 'undefined') return;
    const upper = layers[idx];
    const lower = layers[idx - 1];
    const lctx = getCtx(lower.id);
    const uc = getCanvas(upper.id);
    if (lctx && uc) {
      lctx.globalAlpha = upper.opacity / 100;
      lctx.globalCompositeOperation = (upper.blend === 'normal' ? 'source-over' : upper.blend) as GlobalCompositeOperation;
      lctx.drawImage(uc, 0, 0);
      lctx.globalAlpha = 1;
      lctx.globalCompositeOperation = 'source-over';
    }
    setLayers((prev) => prev.filter((l) => l.id !== upper.id));
    canvasRefs.current.delete(upper.id);
    setActiveLayerId(lower.id);
    setDirty(true);
  }, [layers, activeLayerId, getCtx, getCanvas]);

  const handleFlatten = useCallback(() => {
    const flat = flattenToCanvas(true);
    if (!flat) return;
    const bg = newLayer('Background');
    pendingPaint.current.clear();
    pendingPaint.current.set(bg.id, flat.toDataURL('image/png'));
    layers.forEach((l) => canvasRefs.current.delete(l.id));
    setSelection(null);
    setLayers([bg]);
    setActiveLayerId(bg.id);
    setDirty(true);
  }, [flattenToCanvas, layers]);

  const updateActiveLayer = useCallback((patch: Partial<PsLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === activeLayerId ? { ...l, ...patch } : l)));
    setDirty(true);
  }, [activeLayerId]);

  const toggleVisible = useCallback((id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
    setDirty(true);
  }, []);

  // Drag-reorder in the panel (rows are shown top-first).
  const dragIndex = useRef<number | null>(null);
  const onRowDragStart = (arrIndex: number) => { dragIndex.current = arrIndex; };
  const onRowDrop = (arrIndex: number) => {
    if (dragIndex.current === null || dragIndex.current === arrIndex) { dragIndex.current = null; return; }
    setLayers((prev) => reorderLayers(prev, dragIndex.current!, arrIndex));
    dragIndex.current = null;
    setDirty(true);
  };

  // --- keyboard shortcuts ----------------------------------------------------

  useEffect(() => {
    if (!isFocused) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') { if (cropRect) setCropRect(null); else deselect(); return; }
      if (e.key === 'Enter' && cropRect) { e.preventDefault(); applyCrop(); return; }
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z') { e.preventDefault(); handleUndo(); }
      else if (k === 'y') { e.preventDefault(); handleRedo(); }
      else if (k === 'c') { e.preventDefault(); handleCopy(); }
      else if (k === 'v') { e.preventDefault(); handlePaste(); }
      else if (k === 'a') { e.preventDefault(); selectAll(); }
      else if (k === 'd') { e.preventDefault(); deselect(); }
      else if (k === 'n') { e.preventDefault(); setShowNew(true); }
      else if (k === 'o') { e.preventDefault(); setPicker({ mode: 'open', kind: 'psd' }); }
      else if (k === 's') { e.preventDefault(); handleSave(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFocused, cropRect, deselect, applyCrop, handleUndo, handleRedo, handleCopy, handlePaste, selectAll, handleSave]);

  // --- menus -----------------------------------------------------------------

  const canPaste = getClipboard()?.kind === 'image';
  const canMergeDown = layers.findIndex((l) => l.id === activeLayerId) > 0;

  const menus: MenuDefinition[] = [
    {
      label: '&File',
      items: [
        { label: '&New...', shortcut: 'Ctrl+N', onClick: () => setShowNew(true) },
        { label: '&Open...', shortcut: 'Ctrl+O', onClick: () => setPicker({ mode: 'open', kind: 'psd' }) },
        { label: '', separator: true },
        { label: '&Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save &As...', onClick: () => setPicker({ mode: 'save', kind: 'psd' }) },
        { label: '&Export as PNG...', onClick: () => setPicker({ mode: 'save', kind: 'png' }) },
        { label: '', separator: true },
        { label: 'E&xit', onClick: closeSelf },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: '&Undo', shortcut: 'Ctrl+Z', onClick: handleUndo, disabled: historyIndex <= 0 },
        { label: '&Redo', shortcut: 'Ctrl+Y', onClick: handleRedo, disabled: historyIndex >= history.length - 1 },
        { label: '', separator: true },
        { label: '&Copy', shortcut: 'Ctrl+C', onClick: handleCopy },
        { label: '&Paste', shortcut: 'Ctrl+V', onClick: handlePaste, disabled: !canPaste },
      ],
    },
    {
      label: '&Image',
      items: [
        {
          label: '&Adjust',
          submenu: [
            { label: '&Brightness/Contrast...', onClick: () => openAdjustment('brightness') },
            { label: '&Hue/Saturation...', onClick: () => openAdjustment('hue') },
            { label: '', separator: true },
            { label: '&Invert', shortcut: 'Ctrl+I', onClick: () => runFilter((d) => invertPixels(d), 'Invert') },
          ],
        },
        { label: '', separator: true },
        { label: '&Canvas Size...', onClick: () => setShowCanvasSize(true) },
        { label: '&Flatten Image', onClick: handleFlatten },
      ],
    },
    {
      label: '&Layer',
      items: [
        { label: '&New Layer', onClick: handleAddLayer },
        { label: '&Duplicate Layer', onClick: handleDuplicateLayer },
        { label: 'De&lete Layer', onClick: handleDeleteLayer, disabled: layers.length <= 1 },
        { label: '', separator: true },
        { label: '&Merge Down', onClick: handleMergeDown, disabled: !canMergeDown },
        { label: 'Flatten &Image', onClick: handleFlatten },
      ],
    },
    {
      label: '&Select',
      items: [
        { label: '&All', shortcut: 'Ctrl+A', onClick: selectAll },
        { label: '&Deselect', shortcut: 'Ctrl+D', onClick: deselect, disabled: !selection },
      ],
    },
    {
      label: 'Filte&r',
      items: [
        { label: '&Blur', onClick: () => runFilter((d, w, h) => boxBlurPixels(d, w, h, 2), 'Blur') },
        { label: '&Sharpen', onClick: () => runFilter((d, w, h) => sharpenPixels(d, w, h), 'Sharpen') },
        { label: '', separator: true },
        {
          label: '&Stylize',
          submenu: [
            { label: '&Emboss', onClick: () => runFilter((d, w, h) => embossPixels(d, w, h), 'Emboss') },
            { label: '&Find Edges', onClick: () => runFilter((d, w, h) => findEdgesPixels(d, w, h), 'Find Edges') },
          ],
        },
        {
          label: '&Pixelate',
          submenu: [
            { label: '&Mosaic...', onClick: () => setValuePrompt('mosaic') },
          ],
        },
        {
          label: '&Noise',
          submenu: [
            { label: '&Add Noise...', onClick: () => setValuePrompt('noise') },
          ],
        },
      ],
    },
    {
      label: '&View',
      items: [
        { label: 'Zoom &In', shortcut: 'Ctrl++', onClick: () => setZoom((z) => Math.min(MAX_ZOOM, z * 2)) },
        { label: 'Zoom &Out', shortcut: 'Ctrl+-', onClick: () => setZoom((z) => Math.max(MIN_ZOOM, z / 2)) },
        { label: '&Actual Pixels', onClick: () => setZoom(1) },
      ],
    },
    standardHelpMenu('Adobe Photoshop'),
  ];

  // --- options bar -----------------------------------------------------------

  const renderOptions = () => {
    const label = TOOLS.find((t) => t.id === selectedTool)?.label ?? '';
    const brushTools = selectedTool === 'brush' || selectedTool === 'pencil' || selectedTool === 'eraser' || selectedTool === 'blur' || selectedTool === 'smudge';
    return (
      <div className="h-[24px] flex items-center px-2 gap-3 text-black" style={{ backgroundColor: '#c0c0c0', borderBottom: '1px solid #808080' }}>
        <span className="text-[10px] font-bold min-w-[90px]">{label}</span>
        {brushTools && (
          <label className="flex items-center gap-1 text-[10px]">
            Brush:
            <input type="range" min={1} max={40} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} />
            <span className="w-[24px]">{brushSize}px</span>
          </label>
        )}
        {(selectedTool === 'bucket' || selectedTool === 'wand') && (
          <label className="flex items-center gap-1 text-[10px]">
            Tolerance:
            <input type="range" min={0} max={128} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} />
            <span className="w-[24px]">{tolerance}</span>
          </label>
        )}
        {selectedTool === 'type' && (
          <label className="flex items-center gap-1 text-[10px]">
            Size:
            <input type="range" min={8} max={96} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
            <span className="w-[30px]">{fontSize}px</span>
          </label>
        )}
        {selectedTool === 'gradient' && <span className="text-[10px]">Drag to draw a foreground to background gradient.</span>}
        {selectedTool === 'crop' && <span className="text-[10px]">Drag a rectangle, then press Enter to crop.</span>}
        {selectedTool === 'zoom' && <span className="text-[10px]">Zoom: {Math.round(zoom * 100)}% (Alt-click to zoom out)</span>}
      </div>
    );
  };

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const docName = currentFilePath ? baseName(currentFilePath) : 'Untitled-1';

  return (
    <div
      className="flex flex-col h-full text-[11px] select-none"
      style={{ backgroundColor: '#535353', color: '#c0c0c0', fontFamily: 'var(--win98-font)', cursor: busy ? 'wait' : undefined }}
      data-window-id={windowId}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuBar menus={menus} windowId={windowId} className="text-black" />
      {renderOptions()}

      <div className="flex-1 flex overflow-hidden">
        {/* Tool palette */}
        <div className="w-[52px] flex flex-col items-center py-1 flex-shrink-0" style={{ backgroundColor: '#c0c0c0', borderRight: '1px solid #808080' }}>
          <div className="grid grid-cols-2 gap-[1px] p-[2px]">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                className={`w-[22px] h-[22px] flex items-center justify-center text-[12px] ${
                  selectedTool === tool.id
                    ? 'bg-[#a0a0a0] border border-[#808080] border-r-[#ffffff] border-b-[#ffffff]'
                    : 'border border-transparent hover:border-[#ffffff] hover:border-r-[#808080] hover:border-b-[#808080]'
                }`}
                style={{ color: '#000' }}
                onClick={() => setSelectedTool(tool.id)}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* Foreground / background color */}
          <div className="relative mt-2 w-[36px] h-[36px]">
            <div className="absolute bottom-0 right-0 w-[22px] h-[22px] border border-[#808080]" style={{ backgroundColor: bgColor }} title="Background color" />
            <div className="absolute top-0 left-0 w-[22px] h-[22px] border border-[#808080]" style={{ backgroundColor: fgColor }} title="Foreground color" />
            <button className="absolute top-[-2px] right-[-2px] text-[8px]" style={{ color: '#000' }} title="Swap colors" onClick={() => { setFgColor(bgColor); setBgColor(fgColor); }}>⇄</button>
          </div>

          <div className="grid grid-cols-3 gap-[1px] mt-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                className="w-[10px] h-[10px] border border-[#808080]"
                style={{ backgroundColor: c }}
                title={c}
                onClick={() => setFgColor(c)}
                onContextMenu={(e) => { e.preventDefault(); setBgColor(c); }}
              />
            ))}
          </div>
        </div>

        {/* Canvas area */}
        <div ref={scrollRef} className="flex-1 overflow-auto flex items-start justify-center p-4" style={{ backgroundColor: '#535353' }}>
          <div className="inline-block">
            <div className="h-[18px] flex items-center px-2 text-[10px] font-bold" style={{ backgroundColor: '#000080', color: '#fff' }}>
              {docName} @ {Math.round(zoom * 100)}% (RGB)
            </div>
            <div
              ref={stackRef}
              className="relative border border-black"
              style={{ width: canvasSize.width * zoom, height: canvasSize.height * zoom, backgroundColor: '#ffffff', cursor: selectedTool === 'hand' ? 'grab' : 'crosshair' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onDoubleClick={() => { if (cropRect) applyCrop(); }}
            >
              {layers.map((layer) => (
                <canvas
                  key={layer.id}
                  ref={(el) => { if (el) canvasRefs.current.set(layer.id, el); else canvasRefs.current.delete(layer.id); }}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ imageRendering: 'pixelated', display: layer.visible ? 'block' : 'none', opacity: layer.opacity / 100, mixBlendMode: layer.blend === 'normal' ? 'normal' : layer.blend, pointerEvents: 'none' }}
                  data-layer-name={layer.name}
                />
              ))}
              <canvas
                ref={overlayRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ imageRendering: 'pixelated' }}
              />
              {textEdit && (
                <input
                  ref={textInputRef}
                  value={textEdit.value}
                  onChange={(e) => setTextEdit((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commitText(); }
                    else if (e.key === 'Escape') { e.preventDefault(); textCommitted.current = true; setTextEdit(null); }
                  }}
                  onBlur={commitText}
                  style={{
                    position: 'absolute',
                    left: textEdit.x * zoom,
                    top: textEdit.y * zoom,
                    font: `${fontSize * zoom}px "MS Sans Serif", Arial, sans-serif`,
                    color: fgColor,
                    background: 'transparent',
                    border: '1px dashed #000',
                    outline: 'none',
                    padding: 0,
                    minWidth: 40,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right panels */}
        <div className="w-[180px] flex flex-col flex-shrink-0" style={{ backgroundColor: '#c0c0c0', borderLeft: '1px solid #808080' }}>
          {/* Layers / History tabs */}
          <div className="flex" style={{ borderBottom: '1px solid #808080' }}>
            <button className={`px-2 py-[1px] text-[10px] ${activePanel === 'layers' ? 'font-bold bg-[#c0c0c0]' : 'bg-[#a0a0a0]'}`} style={{ color: '#000' }} onClick={() => setActivePanel('layers')}>Layers</button>
            <button className={`px-2 py-[1px] text-[10px] ${activePanel === 'history' ? 'font-bold bg-[#c0c0c0]' : 'bg-[#a0a0a0]'}`} style={{ color: '#000' }} onClick={() => setActivePanel('history')}>History</button>
          </div>

          {activePanel === 'layers' ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Blend + opacity for the active layer */}
              <div className="p-1 flex flex-col gap-1" style={{ borderBottom: '1px solid #808080', color: '#000' }}>
                <select
                  className="win98-sunken bg-white text-[10px] h-[16px] px-1"
                  value={activeLayer?.blend ?? 'normal'}
                  onChange={(e) => updateActiveLayer({ blend: e.target.value as BlendMode })}
                >
                  {(Object.keys(BLEND_LABELS) as BlendMode[]).map((m) => (
                    <option key={m} value={m}>{BLEND_LABELS[m]}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1 text-[10px]">
                  <span>Opacity:</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={activeLayer?.opacity ?? 100}
                    onChange={(e) => updateActiveLayer({ opacity: Number(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="w-[28px] text-right">{activeLayer?.opacity ?? 100}%</span>
                </div>
              </div>

              <div className="flex-1 bg-white overflow-auto" style={{ color: '#000' }}>
                {layers.map((layer) => layer).reverse().map((layer) => {
                  const arrIndex = layers.indexOf(layer);
                  return (
                    <div
                      key={layer.id}
                      draggable
                      onDragStart={() => onRowDragStart(arrIndex)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onRowDrop(arrIndex)}
                      className={`flex items-center gap-1 px-1 py-[2px] text-[10px] cursor-pointer ${layer.id === activeLayerId ? 'bg-[#000080] text-white' : 'text-black hover:bg-[#dcdcdc]'}`}
                      onClick={() => setActiveLayerId(layer.id)}
                    >
                      <span className="cursor-pointer w-[12px]" onClick={(e) => { e.stopPropagation(); toggleVisible(layer.id); }}>{layer.visible ? '👁' : '·'}</span>
                      <div className="w-[24px] h-[18px] bg-white border border-[#808080]" />
                      <span className="flex-1 truncate">{layer.name}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-[1px] p-[2px]" style={{ borderTop: '1px solid #808080', color: '#000' }}>
                <button className="w-[20px] h-[18px] win98-raised text-[10px] flex items-center justify-center" onClick={handleAddLayer} title="New Layer">📄</button>
                <button className="w-[20px] h-[18px] win98-raised text-[10px] flex items-center justify-center" onClick={handleDuplicateLayer} title="Duplicate Layer">⧉</button>
                <button className="w-[20px] h-[18px] win98-raised text-[10px] flex items-center justify-center" onClick={handleMergeDown} title="Merge Down" disabled={!canMergeDown}>⬇</button>
                <button className="w-[20px] h-[18px] win98-raised text-[10px] flex items-center justify-center" onClick={handleDeleteLayer} title="Delete Layer">🗑</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-white overflow-auto p-1 text-[10px]" style={{ color: '#000' }}>
              {history.map((entry, i) => (
                <div
                  key={i}
                  className={`px-1 cursor-pointer ${i === historyIndex ? 'bg-[#000080] text-white' : 'hover:bg-[#dcdcdc]'}`}
                  onClick={() => restoreHistory(i)}
                >
                  {entry.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="h-[20px] flex items-center px-1 gap-2" style={{ backgroundColor: '#c0c0c0', borderTop: '1px solid #fff', color: '#000' }}>
        <span className="win98-sunken px-2 py-0" style={{ minWidth: 90 }}>{Math.round(zoom * 100)}%</span>
        <span className="win98-sunken px-2 py-0 flex-1">{canvasSize.width} x {canvasSize.height} · {layers.length} layer{layers.length === 1 ? '' : 's'}{selection ? ' · Selection active' : ''}</span>
      </div>

      {/* Dialogs */}
      {picker && (
        <FilePickerDialog
          mode={picker.mode}
          filters={
            picker.kind === 'png'
              ? [{ label: 'PNG Image (*.png)', extensions: ['png'] }]
              : picker.mode === 'open'
                ? [
                    { label: 'Photoshop (*.psd)', extensions: ['psd'] },
                    { label: 'Images (*.png, *.bmp, *.jpg, *.gif)', extensions: ['png', 'bmp', 'jpg', 'jpeg', 'gif'] },
                    { label: 'All Files (*.*)', extensions: [] },
                  ]
                : [{ label: 'Photoshop (*.psd)', extensions: ['psd'] }]
          }
          defaultExtension={picker.kind === 'png' ? 'png' : 'psd'}
          defaultName={picker.mode === 'save' ? `${docName.replace(/\.[^.]+$/, '')}.${picker.kind === 'png' ? 'png' : 'psd'}` : ''}
          startDir={currentFilePath ? getParentPath(currentFilePath) : 'C:\\My Documents'}
          title={picker.mode === 'open' ? 'Open' : picker.kind === 'png' ? 'Export as PNG' : 'Save As'}
          onConfirm={onPickerConfirm}
          onCancel={() => setPicker(null)}
        />
      )}

      {showNew && <NewImageDialog onConfirm={handleNew} onCancel={() => setShowNew(false)} />}

      {showCanvasSize && (
        <CanvasSizeDialog
          initialWidth={canvasSize.width}
          initialHeight={canvasSize.height}
          onConfirm={({ width, height }) => {
            const grabbed = new Map<string, ImageData>();
            for (const layer of layers) {
              const ctx = getCtx(layer.id);
              if (ctx) grabbed.set(layer.id, ctx.getImageData(0, 0, Math.min(canvasSize.width, width), Math.min(canvasSize.height, height)));
            }
            resizeRestore.current = () => {
              grabbed.forEach((data, id) => { const ctx = getCtx(id); if (ctx) ctx.putImageData(data, 0, 0); });
              pushHistory('Canvas Size');
            };
            setSelection(null);
            setCanvasSize({ width, height });
            setShowCanvasSize(false);
          }}
          onCancel={() => setShowCanvasSize(false)}
        />
      )}

      {valuePrompt === 'mosaic' && (
        <ValuePromptDialog
          title="Mosaic"
          label="Cell Size:"
          initial={8}
          min={2}
          max={64}
          onConfirm={(v) => { setValuePrompt(null); runFilter((d, w, h) => mosaicPixels(d, w, h, v), 'Mosaic'); }}
          onCancel={() => setValuePrompt(null)}
        />
      )}

      {valuePrompt === 'noise' && (
        <ValuePromptDialog
          title="Add Noise"
          label="Amount:"
          initial={32}
          min={1}
          max={128}
          onConfirm={(v) => { setValuePrompt(null); runFilter((d) => addNoisePixels(d, v), 'Add Noise'); }}
          onCancel={() => setValuePrompt(null)}
        />
      )}

      {adjustment === 'brightness' && (
        <AdjustmentDialog
          title="Brightness/Contrast"
          thumbnail={adjustThumb}
          sliders={BRIGHTNESS_SLIDERS}
          transform={(d, p) => adjustBrightnessContrast(d, p.brightness, p.contrast)}
          onApply={(p) => { setAdjustment(null); runFilter((d) => adjustBrightnessContrast(d, p.brightness, p.contrast), 'Brightness/Contrast'); }}
          onCancel={() => setAdjustment(null)}
        />
      )}

      {adjustment === 'hue' && (
        <AdjustmentDialog
          title="Hue/Saturation"
          thumbnail={adjustThumb}
          sliders={HUE_SLIDERS}
          transform={(d, p) => adjustHueSaturation(d, p.hue, p.saturation, p.lightness)}
          onApply={(p) => { setAdjustment(null); runFilter((d) => adjustHueSaturation(d, p.hue, p.saturation, p.lightness), 'Hue/Saturation'); }}
          onCancel={() => setAdjustment(null)}
        />
      )}
    </div>
  );
}

const BRIGHTNESS_SLIDERS: AdjustmentSlider[] = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100, default: 0 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100, default: 0 },
];

const HUE_SLIDERS: AdjustmentSlider[] = [
  { key: 'hue', label: 'Hue', min: -180, max: 180, default: 0 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, default: 0 },
  { key: 'lightness', label: 'Lightness', min: -100, max: 100, default: 0 },
];
