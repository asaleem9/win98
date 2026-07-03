'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { playSound } from '@/lib/sounds';
import { addLayer, boxBlurPixels, invertPixels, nextLayerName, removeLayer, PsLayer } from './photoshopHelpers';

const MENU_ITEMS = ['File', 'Edit', 'Image', 'Layer', 'Select', 'Filter', 'View', 'Window', 'Help'];

const TOOLS = [
  { icon: '⬚', label: 'Marquee' },
  { icon: '➔', label: 'Move' },
  { icon: '◇', label: 'Lasso' },
  { icon: '✦', label: 'Magic Wand' },
  { icon: '⬒', label: 'Crop' },
  { icon: 'T', label: 'Type' },
  { icon: '◐', label: 'Gradient' },
  { icon: '🖌', label: 'Brush' },
  { icon: '✎', label: 'Pencil' },
  { icon: '🔲', label: 'Eraser' },
  { icon: '🪣', label: 'Paint Bucket' },
  { icon: '💧', label: 'Blur' },
  { icon: '👆', label: 'Smudge' },
  { icon: '🔍', label: 'Zoom' },
  { icon: '✋', label: 'Hand' },
  { icon: '💉', label: 'Eyedropper' },
];

const TOOL_BRUSH = 7;
const TOOL_PENCIL = 8;
const TOOL_ERASER = 9;

const FILTERS = ['Blur', 'Gaussian Blur', 'Sharpen', 'Noise', 'Pixelate', 'Distort', 'Render', 'Stylize'];
const REAL_FILTERS = new Set(['Invert', 'Blur']);

const SWATCHES = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#808080'];

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 300;

interface HistoryEntry {
  label: string;
  layerId: string;
  snapshot: ImageData;
}

let layerCounter = 0;
function makeLayerId() {
  layerCounter += 1;
  return `layer-${layerCounter}-${Date.now()}`;
}

export default function Photoshop5({ windowId }: AppComponentProps) {
  const [selectedTool, setSelectedTool] = useState(TOOL_BRUSH);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [activePanel, setActivePanel] = useState<'layers' | 'history' | 'color'>('layers');

  const [layers, setLayers] = useState<PsLayer[]>(() => [
    { id: makeLayerId(), name: 'Background', visible: true },
  ]);
  const [activeLayerId, setActiveLayerId] = useState(layers[0].id);
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const isDrawing = useRef(false);
  const strokeSnapshot = useRef<ImageData | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const getActiveCanvas = useCallback(() => canvasRefs.current.get(activeLayerId) ?? null, [activeLayerId]);

  const pushHistory = useCallback((label: string) => {
    const canvas = getActiveCanvas();
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, { label, layerId: activeLayerId, snapshot }];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [activeLayerId, getActiveCanvas, historyIndex]);

  // Seed history with the initial blank state once canvases exist.
  useEffect(() => {
    if (history.length === 0) {
      pushHistory('New');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restoreHistory = useCallback((index: number) => {
    const entry = history[index];
    if (!entry) return;
    const canvas = canvasRefs.current.get(entry.layerId);
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.putImageData(entry.snapshot, 0, 0);
    setHistoryIndex(index);
  }, [history]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const strokeAt = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    if (selectedTool === TOOL_ERASER) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (selectedTool === TOOL_PENCIL) {
      ctx.fillStyle = fgColor;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    } else {
      // Brush: soft-ish thicker stroke
      ctx.fillStyle = fgColor;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const isDrawTool = selectedTool === TOOL_BRUSH || selectedTool === TOOL_PENCIL || selectedTool === TOOL_ERASER;

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawTool) return;
    const canvas = getActiveCanvas();
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    isDrawing.current = true;
    strokeSnapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { x, y } = getPos(e);
    strokeAt(ctx, x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = getActiveCanvas();
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = getPos(e);
    strokeAt(ctx, x, y);
  };

  const finishStroke = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    strokeSnapshot.current = null;
    const label = selectedTool === TOOL_ERASER ? 'Eraser' : selectedTool === TOOL_PENCIL ? 'Pencil' : 'Brush';
    pushHistory(label);
  };

  const handleMouseUp = () => finishStroke();
  const handleMouseLeave = () => finishStroke();

  const handleFilterClick = (name: string) => {
    setActiveMenu(null);
    if (!REAL_FILTERS.has(name)) {
      setShowError(true);
      playSound('error');
      return;
    }
    const canvas = getActiveCanvas();
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (name === 'Invert') {
      invertPixels(imageData.data);
    } else if (name === 'Blur') {
      boxBlurPixels(imageData.data, imageData.width, imageData.height, 2);
    }
    ctx.putImageData(imageData, 0, 0);
    pushHistory(name);
    playSound('ding');
  };

  const handleAddLayer = () => {
    const name = nextLayerName(layers);
    const newLayer: PsLayer = { id: makeLayerId(), name, visible: true };
    setLayers((prev) => addLayer(prev, () => newLayer));
    setActiveLayerId(newLayer.id);
    playSound('chord');
  };

  const handleDeleteLayer = () => {
    setLayers((prev) => {
      const result = removeLayer(prev, activeLayerId);
      if (result !== prev) {
        canvasRefs.current.delete(activeLayerId);
        setActiveLayerId(result[result.length - 1].id);
      }
      return result;
    });
    pushHistory('Delete Layer');
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  };

  const handleUndo = () => {
    if (historyIndex > 0) restoreHistory(historyIndex - 1);
  };

  return (
    <div className="flex flex-col h-full text-[11px] select-none" style={{ backgroundColor: '#535353', color: '#c0c0c0', fontFamily: 'var(--win98-font)' }} data-window-id={windowId}>
      {/* Menu Bar */}
      <div className="flex items-center h-[20px] px-1" style={{ backgroundColor: '#c0c0c0', color: '#000', borderBottom: '1px solid #808080' }}>
        {MENU_ITEMS.map((item) => (
          <div key={item} className="relative">
            <button
              className={`px-2 h-[18px] ${activeMenu === item ? 'bg-[#000080] text-white' : 'hover:bg-[#000080] hover:text-white'}`}
              onClick={() => setActiveMenu(activeMenu === item ? null : item)}
              onMouseEnter={() => activeMenu && setActiveMenu(item)}
            >
              {item}
            </button>
            {activeMenu === item && item === 'Filter' && (
              <div className="absolute top-full left-0 z-50 win98-menu min-w-[180px]" style={{ backgroundColor: '#c0c0c0', color: '#000' }}>
                <div className="win98-menu-item" onClick={() => handleFilterClick('Invert')}>Invert</div>
                <div className="win98-menu-item" onClick={() => handleFilterClick('Blur')}>Blur</div>
                {FILTERS.filter((f) => f !== 'Blur').map((f) => (
                  <div key={f} className="win98-menu-item" onClick={() => handleFilterClick(f)}>{f}...</div>
                ))}
              </div>
            )}
            {activeMenu === item && item === 'Edit' && (
              <div className="absolute top-full left-0 z-50 win98-menu min-w-[140px]" style={{ backgroundColor: '#c0c0c0', color: '#000' }}>
                <div className="win98-menu-item" onClick={() => { setActiveMenu(null); handleUndo(); }}>Undo</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Options bar */}
      <div className="h-[24px] flex items-center px-2 gap-2" style={{ backgroundColor: '#c0c0c0', borderBottom: '1px solid #808080', color: '#000' }}>
        <span className="text-[10px]">Brush:</span>
        <div className="w-[40px] h-[14px] win98-sunken bg-white flex items-center px-1 text-[10px]">13</div>
        <span className="text-[10px]">Mode:</span>
        <select className="h-[16px] win98-sunken bg-white text-[10px] px-1">
          <option>Normal</option>
          <option>Dissolve</option>
          <option>Multiply</option>
          <option>Screen</option>
        </select>
        <span className="text-[10px]">Opacity:</span>
        <div className="w-[40px] h-[14px] win98-sunken bg-white flex items-center px-1 text-[10px]">100%</div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Tool palette */}
        <div className="w-[52px] flex flex-col items-center py-1 gap-0 flex-shrink-0" style={{ backgroundColor: '#c0c0c0', borderRight: '1px solid #808080' }}>
          <div className="grid grid-cols-2 gap-[1px] p-[2px]">
            {TOOLS.map((tool, i) => (
              <button
                key={i}
                className={`w-[22px] h-[22px] flex items-center justify-center text-[12px] ${
                  selectedTool === i
                    ? 'bg-[#a0a0a0] border border-[#808080] border-r-[#ffffff] border-b-[#ffffff]'
                    : 'border border-transparent hover:border-[#ffffff] hover:border-r-[#808080] hover:border-b-[#808080]'
                }`}
                style={{ color: '#000' }}
                onClick={() => setSelectedTool(i)}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* Color swatches */}
          <div className="relative mt-2 w-[36px] h-[36px]">
            <div
              className="absolute bottom-0 right-0 w-[22px] h-[22px] border border-[#808080]"
              style={{ backgroundColor: bgColor }}
            />
            <div
              className="absolute top-0 left-0 w-[22px] h-[22px] border border-[#808080]"
              style={{ backgroundColor: fgColor }}
            />
            {/* Swap icon */}
            <button
              className="absolute top-[-2px] right-[-2px] text-[8px]"
              style={{ color: '#000' }}
              onClick={() => { setFgColor(bgColor); setBgColor(fgColor); }}
            >
              ⇄
            </button>
          </div>

          {/* Quick swatch palette */}
          <div className="grid grid-cols-3 gap-[1px] mt-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                className="w-[10px] h-[10px] border border-[#808080]"
                style={{ backgroundColor: c }}
                title={c}
                onClick={() => setFgColor(c)}
              />
            ))}
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto flex items-center justify-center" style={{ backgroundColor: '#535353' }}>
          <div className="relative">
            {/* Canvas title bar */}
            <div className="h-[18px] flex items-center px-2 text-[10px] font-bold" style={{ backgroundColor: '#000080', color: '#fff' }}>
              Untitled-1 @ 100% (RGB)
            </div>
            {/* Layered canvas stack */}
            <div
              className="relative bg-white border border-[#000]"
              style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            >
              {layers.map((layer) => (
                <canvas
                  key={layer.id}
                  ref={(el) => {
                    if (el) canvasRefs.current.set(layer.id, el);
                    else canvasRefs.current.delete(layer.id);
                  }}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="absolute top-0 left-0"
                  style={{
                    display: layer.visible ? 'block' : 'none',
                    cursor: isDrawTool ? 'crosshair' : 'default',
                    pointerEvents: layer.id === activeLayerId ? 'auto' : 'none',
                  }}
                  onMouseDown={layer.id === activeLayerId ? handleMouseDown : undefined}
                  onMouseMove={layer.id === activeLayerId ? handleMouseMove : undefined}
                  onMouseUp={layer.id === activeLayerId ? handleMouseUp : undefined}
                  onMouseLeave={layer.id === activeLayerId ? handleMouseLeave : undefined}
                  data-layer-name={layer.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right panels */}
        <div className="w-[180px] flex flex-col flex-shrink-0" style={{ backgroundColor: '#c0c0c0', borderLeft: '1px solid #808080' }}>
          {/* Navigator / Info */}
          <div className="border-b border-[#808080]">
            <div className="h-[18px] flex items-center px-2 text-[10px] font-bold" style={{ backgroundColor: '#000080', color: '#fff' }}>
              Navigator
            </div>
            <div className="h-[80px] flex items-center justify-center" style={{ backgroundColor: '#535353' }}>
              <div className="w-[60px] h-[45px] bg-white border border-red-500" />
            </div>
          </div>

          {/* Color / Swatches / Brushes panel tabs */}
          <div className="border-b border-[#808080]">
            <div className="flex" style={{ borderBottom: '1px solid #808080' }}>
              <button
                className={`px-2 py-[1px] text-[10px] ${activePanel === 'color' ? 'font-bold bg-[#c0c0c0]' : 'bg-[#a0a0a0]'}`}
                onClick={() => setActivePanel('color')}
                style={{ color: '#000' }}
              >
                Color
              </button>
              <button className="px-2 py-[1px] text-[10px] bg-[#a0a0a0]" style={{ color: '#000' }}>Swatches</button>
              <button className="px-2 py-[1px] text-[10px] bg-[#a0a0a0]" style={{ color: '#000' }}>Brushes</button>
            </div>
            {activePanel === 'color' && (
              <div className="p-2 space-y-1">
                {['R', 'G', 'B'].map((ch, i) => (
                  <div key={ch} className="flex items-center gap-1 text-[10px]" style={{ color: '#000' }}>
                    <span className="w-[10px]">{ch}:</span>
                    <div className="flex-1 h-[8px] bg-gradient-to-r from-black" style={{ backgroundImage: `linear-gradient(to right, black, ${ch === 'R' ? 'red' : ch === 'G' ? 'lime' : 'blue'})` }} />
                    <span className="w-[20px] text-right">{i === 0 ? '0' : '0'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Layers / Channels / Paths */}
          <div className="flex-1 flex flex-col">
            <div className="flex" style={{ borderBottom: '1px solid #808080' }}>
              <button
                className={`px-2 py-[1px] text-[10px] ${activePanel === 'layers' ? 'font-bold bg-[#c0c0c0]' : 'bg-[#a0a0a0]'}`}
                onClick={() => setActivePanel('layers')}
                style={{ color: '#000' }}
              >
                Layers
              </button>
              <button className="px-2 py-[1px] text-[10px] bg-[#a0a0a0]" style={{ color: '#000' }}>Channels</button>
              <button className="px-2 py-[1px] text-[10px] bg-[#a0a0a0]" style={{ color: '#000' }}>Paths</button>
            </div>
            <div className="flex items-center gap-1 px-1 py-[2px]" style={{ borderBottom: '1px solid #808080', color: '#000' }}>
              <span className="text-[10px]">Opacity:</span>
              <div className="win98-sunken bg-white h-[14px] flex-1 flex items-center px-1 text-[10px]">100%</div>
            </div>
            <div className="flex-1 bg-white overflow-auto" style={{ color: '#000' }}>
              {[...layers].reverse().map((layer) => (
                <div
                  key={layer.id}
                  className={`flex items-center gap-1 px-1 py-[2px] text-[10px] cursor-pointer ${
                    layer.id === activeLayerId ? 'bg-[#000080] text-white' : 'text-black hover:bg-[#dcdcdc]'
                  }`}
                  onClick={() => setActiveLayerId(layer.id)}
                >
                  <span
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layer.id);
                    }}
                  >
                    {layer.visible ? '👁' : '  '}
                  </span>
                  <div className="w-[24px] h-[18px] bg-white border border-[#808080]" />
                  <span className="flex-1">{layer.name}</span>
                </div>
              ))}
            </div>
            {/* Layer buttons */}
            <div className="flex items-center gap-[1px] p-[2px]" style={{ borderTop: '1px solid #808080', color: '#000' }}>
              <button className="w-[20px] h-[18px] win98-raised text-[10px] flex items-center justify-center" onClick={handleAddLayer} title="New Layer">📄</button>
              <button className="w-[20px] h-[18px] win98-raised text-[10px] flex items-center justify-center">📁</button>
              <button className="w-[20px] h-[18px] win98-raised text-[10px] flex items-center justify-center" onClick={handleDeleteLayer} title="Delete Layer">🗑</button>
            </div>
          </div>

          {/* History */}
          <div className="h-[80px] border-t border-[#808080] flex flex-col">
            <div className="flex" style={{ borderBottom: '1px solid #808080' }}>
              <button
                className={`px-2 py-[1px] text-[10px] ${activePanel === 'history' ? 'font-bold bg-[#c0c0c0]' : 'bg-[#a0a0a0]'}`}
                onClick={() => setActivePanel('history')}
                style={{ color: '#000' }}
              >
                History
              </button>
              <button className="px-2 py-[1px] text-[10px] bg-[#a0a0a0]" style={{ color: '#000' }}>Actions</button>
            </div>
            <div className="bg-white flex-1 p-1 text-[10px] overflow-auto" style={{ color: '#000' }}>
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
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-[20px] flex items-center px-1" style={{ backgroundColor: '#c0c0c0', borderTop: '1px solid #fff', color: '#000' }}>
        <span className="win98-sunken px-2 py-0 flex-1">Doc: 351K/351K</span>
      </div>

      {/* Error Dialog */}
      {showError && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
          <div className="win98-window p-0 w-[350px]" style={{ backgroundColor: '#c0c0c0' }}>
            <div className="win98-titlebar px-2">
              <span className="flex-1 text-[11px] font-bold text-white">Adobe Photoshop</span>
            </div>
            <div className="p-4 flex gap-3 items-start" style={{ color: '#000' }}>
              <span className="text-[24px]">⚠️</span>
              <p className="text-[11px] leading-relaxed">Could not complete the Filter command because of a program error.</p>
            </div>
            <div className="flex justify-center pb-3">
              <button className="win98-raised px-6 py-1 text-[11px]" style={{ color: '#000' }} onClick={() => setShowError(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
