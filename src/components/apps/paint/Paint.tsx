'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { StatusBar98 } from '@/components/ui/StatusBar98';

type Tool = 'pencil' | 'brush' | 'eraser' | 'fill' | 'line' | 'rectangle' | 'ellipse' | 'text' | 'picker';

const PALETTE = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#808040', '#004040', '#0080FF', '#004080', '#4000FF', '#804000',
  '#FFFFFF', '#C0C0C0', '#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF',
  '#FFFF80', '#00FF80', '#80FFFF', '#0080FF', '#FF0080', '#FF8040',
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

export default function Paint({ windowId }: AppComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [brushSize, setBrushSize] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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

  const saveUndo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack((prev) => [...prev.slice(-9), data]);
  }, []);

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    ctx.putImageData(last, 0, 0);
    setUndoStack((prev) => prev.slice(0, -1));
  }, [undoStack]);

  const getCanvasPos = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    setMousePos(pos);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    saveUndo();

    if (tool === 'fill') {
      floodFill(Math.floor(pos.x), Math.floor(pos.y), e.button === 2 ? bgColor : color);
      return;
    }
    if (tool === 'picker') {
      const pixel = ctx.getImageData(Math.floor(pos.x), Math.floor(pos.y), 1, 1).data;
      const hex = '#' + [pixel[0], pixel[1], pixel[2]].map((c) => c.toString(16).padStart(2, '0')).join('');
      if (e.button === 2) setBgColor(hex); else setColor(hex);
      return;
    }
    if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        ctx.fillStyle = color;
        ctx.font = '14px "MS Sans Serif", Arial, sans-serif';
        ctx.fillText(text, pos.x, pos.y);
      }
      return;
    }

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
  }, [tool, color, bgColor, brushSize, saveUndo, floodFill]);

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
    }
  }, [isDrawing, tool]);

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

    setIsDrawing(false);
    setStartPos(null);
  }, [isDrawing, startPos, tool, color, brushSize]);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)]" onContextMenu={(e) => e.preventDefault()}>
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
                onClick={() => setTool(t.id)}
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
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { if (isDrawing) setIsDrawing(false); }}
            className="block cursor-crosshair"
            style={{ imageRendering: 'pixelated' }}
          />
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
    </div>
  );
}
