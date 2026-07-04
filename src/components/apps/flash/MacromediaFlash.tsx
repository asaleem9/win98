'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { standardHelpMenu } from '@/lib/menus';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { addRecentDoc } from '@/lib/recentDocs';
import { showSystemError } from '@/hooks/useFileOpener';
import { normalizePath } from '@/lib/fs/fsOperations';
import { playSound } from '@/lib/sounds';
import {
  createEmptyFrames,
  isBlankFrame,
  nextFrame,
  nextLayerName,
  serializeFla,
  deserializeFla,
  Layer,
  StageConfig,
} from './flashHelpers';

const TOOLS = [
  { icon: '➔', label: 'Arrow' },
  { icon: '⬚', label: 'Subselect' },
  { icon: '━', label: 'Line' },
  { icon: '∅', label: 'Lasso' },
  { icon: '✎', label: 'Pen' },
  { icon: 'T', label: 'Text' },
  { icon: '○', label: 'Oval' },
  { icon: '▭', label: 'Rectangle' },
  { icon: '✏', label: 'Pencil' },
  { icon: '🖌', label: 'Brush' },
  { icon: '🪣', label: 'Paint Bucket' },
  { icon: '🔲', label: 'Eraser' },
  { icon: '💉', label: 'Dropper' },
  { icon: '✋', label: 'Hand' },
  { icon: '🔍', label: 'Zoom' },
];

const PENCIL_TOOL = 8;
const BRUSH_TOOL = 9;

const TOTAL_FRAMES = 60;

const DEFAULT_STAGE: StageConfig = { width: 550, height: 400, bg: '#ffffff', fps: 12 };

function baseName(path: string): string {
  const parts = normalizePath(path).split('\\');
  return parts[parts.length - 1] || 'Untitled';
}

export default function MacromediaFlash({ windowId, launchParams, launchCount }: AppComponentProps) {
  const { updateTitle, closeWindow } = useWindows();
  const { getNode, writeFile } = useFileSystem();

  const [selectedTool, setSelectedTool] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [isPlaying, setIsPlaying] = useState(false);
  const [onionSkin, setOnionSkin] = useState(false);
  const [stage, setStage] = useState<StageConfig>(DEFAULT_STAGE);
  const [layers, setLayers] = useState<Layer[]>([
    { name: 'Layer 1', visible: true, locked: false, frames: createEmptyFrames(TOTAL_FRAMES) },
  ]);

  const [fileName, setFileName] = useState('Untitled');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | 'open' | 'save'>(null);
  const [docForm, setDocForm] = useState<StageConfig | null>(null);

  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const onionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    updateTitle(windowId, `${fileName} - Macromedia Flash`);
  }, [fileName, windowId, updateTitle]);

  // Draw whatever's stored for the current frame onto every layer's canvas.
  useEffect(() => {
    layers.forEach((layer, i) => {
      const canvas = canvasRefs.current[i];
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, stage.width, stage.height);
      const snapshot = layer.frames[currentFrame - 1];
      if (!isBlankFrame(snapshot)) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = snapshot as string;
      }
    });
  }, [currentFrame, layers.length, stage.width, stage.height]); // eslint-disable-line react-hooks/exhaustive-deps

  // Onion skin: faint preview of the previous frame on the active layer.
  useEffect(() => {
    const canvas = onionCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, stage.width, stage.height);
    if (!onionSkin || isPlaying || currentFrame <= 1) return;
    const prevSnapshot = layers[selectedLayer]?.frames[currentFrame - 2];
    if (isBlankFrame(prevSnapshot)) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = prevSnapshot as string;
  }, [onionSkin, isPlaying, currentFrame, selectedLayer, layers, stage.width, stage.height]);

  // Playback loop.
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setCurrentFrame((f) => nextFrame(f, TOTAL_FRAMES));
    }, 1000 / stage.fps);
    return () => clearInterval(id);
  }, [isPlaying, stage.fps]);

  const commitStroke = () => {
    const canvas = canvasRefs.current[selectedLayer];
    if (!canvas) return;
    let dataUrl: string | null = null;
    try {
      dataUrl = canvas.toDataURL();
    } catch {
      return;
    }
    setLayers((prev) =>
      prev.map((layer, i) =>
        i === selectedLayer
          ? {
              ...layer,
              frames: layer.frames.map((f, fi) => (fi === currentFrame - 1 ? dataUrl : f)),
            }
          : layer
      )
    );
  };

  const canDraw = !isPlaying && (selectedTool === PENCIL_TOOL || selectedTool === BRUSH_TOOL);

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!canDraw) return;
    const canvas = canvasRefs.current[selectedLayer];
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = selectedTool === BRUSH_TOOL ? 6 : 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRefs.current[selectedLayer];
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    commitStroke();
  };

  const handlePlay = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    playSound?.('chord');
  };

  const handleStop = () => {
    setIsPlaying(false);
  };

  const handleRewind = () => {
    setIsPlaying(false);
    setCurrentFrame(1);
  };

  const step = (dir: 1 | -1) => {
    setCurrentFrame((f) => Math.max(1, Math.min(TOTAL_FRAMES, f + dir)));
  };

  const handleAddLayer = () => {
    setLayers((prev) => {
      const next = [
        ...prev,
        { name: nextLayerName(prev), visible: true, locked: false, frames: createEmptyFrames(TOTAL_FRAMES) },
      ];
      setSelectedLayer(next.length - 1);
      return next;
    });
    playSound?.('ding');
  };

  const handleNew = () => {
    setLayers([{ name: 'Layer 1', visible: true, locked: false, frames: createEmptyFrames(TOTAL_FRAMES) }]);
    setStage(DEFAULT_STAGE);
    setSelectedLayer(0);
    setCurrentFrame(1);
    setIsPlaying(false);
    setFilePath(null);
    setFileName('Untitled');
  };

  const loadPath = useCallback((rawPath: string) => {
    const path = normalizePath(rawPath);
    const node = getNode(path);
    if (!node || node.type !== 'file') {
      showSystemError('Macromedia Flash', `Cannot find the ${baseName(path)} file.`);
      return;
    }
    const doc = deserializeFla(node.content ?? '');
    if (!doc || doc.layers.length === 0) {
      showSystemError('Macromedia Flash', `${baseName(path)} is not a valid Flash movie, or the file is corrupt.`);
      return;
    }
    setLayers(doc.layers);
    setStage(doc.stage);
    setSelectedLayer(0);
    setCurrentFrame(1);
    setIsPlaying(false);
    setFilePath(path);
    setFileName(baseName(path));
    addRecentDoc(path);
  }, [getNode]);

  useEffect(() => {
    if (launchParams?.filePath) loadPath(launchParams.filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchCount]);

  const doSave = useCallback((path: string) => {
    const payload = serializeFla({ app: 'flash', version: 1, stage, totalFrames: TOTAL_FRAMES, layers });
    const result = writeFile(path, payload);
    if (!result.ok) {
      showSystemError('Macromedia Flash', result.error);
      return;
    }
    setFilePath(path);
    setFileName(baseName(path));
    addRecentDoc(path);
    playSound?.('ding');
  }, [stage, layers, writeFile]);

  const handleSave = () => {
    if (filePath) doSave(filePath);
    else setPicker('save');
  };

  const menus: MenuDefinition[] = [
    {
      label: '&File',
      items: [
        { label: '&New', shortcut: 'Ctrl+N', onClick: handleNew },
        { label: '&Open...', shortcut: 'Ctrl+O', onClick: () => setPicker('open') },
        { label: '', separator: true },
        { label: '&Save', shortcut: 'Ctrl+S', onClick: handleSave },
        { label: 'Save &As...', onClick: () => setPicker('save') },
        { label: '', separator: true },
        { label: '&Print...', shortcut: 'Ctrl+P', disabled: true },
        { label: '', separator: true },
        { label: 'E&xit', onClick: () => closeWindow(windowId) },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: '&Undo', shortcut: 'Ctrl+Z', disabled: true },
        { label: '&Redo', shortcut: 'Ctrl+Y', disabled: true },
        { label: '', separator: true },
        { label: 'Cu&t', shortcut: 'Ctrl+X', disabled: true },
        { label: '&Copy', shortcut: 'Ctrl+C', disabled: true },
        { label: '&Paste', shortcut: 'Ctrl+V', disabled: true },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Onion Skin', checked: onionSkin, onClick: () => setOnionSkin((v) => !v) },
        { label: '', separator: true },
        { label: 'Zoom &In', disabled: true },
        { label: 'Zoom &Out', disabled: true },
      ],
    },
    {
      label: '&Insert',
      items: [
        { label: 'New &Layer', onClick: handleAddLayer },
        { label: 'New &Symbol...', disabled: true },
        { label: 'Blank &Keyframe', disabled: true },
      ],
    },
    {
      label: '&Modify',
      items: [
        { label: '&Document...', onClick: () => setDocForm(stage) },
        { label: '', separator: true },
        { label: 'Convert to &Symbol...', disabled: true },
        { label: '&Break Apart', disabled: true },
      ],
    },
    {
      label: '&Control',
      items: [
        { label: '&Play', shortcut: 'Enter', onClick: handlePlay },
        { label: '&Stop', onClick: handleStop },
        { label: '&Rewind', onClick: handleRewind },
        { label: '', separator: true },
        { label: 'Step &Forward', onClick: () => step(1) },
        { label: 'Step &Backward', onClick: () => step(-1) },
        { label: '', separator: true },
        { label: '&Test Movie', disabled: true },
      ],
    },
    standardHelpMenu('Macromedia Flash'),
  ];

  return (
    <div className="flex flex-col h-full text-[11px] select-none" style={{ backgroundColor: '#d4d0c8', color: '#000', fontFamily: 'var(--win98-font)' }} data-window-id={windowId}>
      <MenuBar menus={menus} windowId={windowId} />

      {/* Toolbar row */}
      <div className="flex items-center h-[26px] px-1 gap-[1px] border-b border-[#808080]">
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="New" onClick={handleNew}>📄</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Open" onClick={() => setPicker('open')}>📂</button>
        <button className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]" title="Save" onClick={handleSave}>💾</button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[#808080] border-r border-r-white" />
        <button
          className={`w-[23px] h-[22px] flex items-center justify-center border text-[11px] ${isPlaying ? 'border-[#808080] border-r-white border-b-white bg-[#a0a0a0]' : 'border-transparent hover:win98-flat-raised'}`}
          onClick={handlePlay}
          title="Play"
        >
          ▶
        </button>
        <button
          className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]"
          onClick={handleStop}
          title="Stop"
        >
          ⏹
        </button>
        <button
          className="w-[23px] h-[22px] flex items-center justify-center border border-transparent hover:win98-flat-raised text-[11px]"
          onClick={handleRewind}
          title="Rewind"
        >
          ⏮
        </button>
        <div className="w-px h-[18px] mx-[2px] border-l border-[#808080] border-r border-r-white" />
        <button
          className={`h-[22px] px-1 flex items-center justify-center border text-[10px] ${onionSkin ? 'border-[#808080] border-r-white border-b-white bg-[#a0a0a0]' : 'border-transparent hover:win98-flat-raised'}`}
          onClick={() => setOnionSkin((v) => !v)}
          title="Onion Skin"
        >
          Onion
        </button>
        <span className="text-[10px] ml-1">100%</span>
      </div>

      {/* Timeline */}
      <div className="border-b border-[#808080]" style={{ backgroundColor: '#d4d0c8' }}>
        <div className="flex">
          {/* Layer list area */}
          <div className="w-[150px] border-r border-[#808080]">
            <div className="h-[18px] flex items-center px-2 text-[10px] font-bold border-b border-[#808080]" style={{ backgroundColor: '#c0c0c0' }}>
              Timeline
            </div>
            {layers.map((layer, i) => (
              <div
                key={i}
                className={`h-[20px] flex items-center px-1 gap-1 border-b border-[#c0c0c0] cursor-pointer text-[10px] ${
                  selectedLayer === i ? 'bg-[#000080] text-white' : ''
                }`}
                onClick={() => setSelectedLayer(i)}
              >
                <span className="text-[8px]">{layer.visible ? '👁' : '  '}</span>
                <span className="text-[8px]">{layer.locked ? '🔒' : '  '}</span>
                <span className="flex-1 truncate">{layer.name}</span>
              </div>
            ))}
            {/* Add layer button */}
            <div className="h-[20px] flex items-center px-1 gap-1 border-b border-[#c0c0c0]">
              <button className="text-[10px] hover:underline" onClick={handleAddLayer}>
                + Add Layer
              </button>
            </div>
          </div>

          {/* Frames area */}
          <div className="flex-1 overflow-x-auto">
            {/* Frame numbers */}
            <div className="h-[18px] flex items-end border-b border-[#808080]" style={{ backgroundColor: '#c0c0c0' }}>
              {Array.from({ length: TOTAL_FRAMES }, (_, i) => (
                <div
                  key={i}
                  className="w-[10px] flex-shrink-0 flex items-center justify-center"
                >
                  {(i + 1) % 5 === 0 && (
                    <span className="text-[7px]">{i + 1}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Layer frames */}
            {layers.map((layer, li) => (
              <div key={li} className="h-[20px] flex border-b border-[#c0c0c0]">
                {Array.from({ length: TOTAL_FRAMES }, (_, fi) => (
                  <div
                    key={fi}
                    className={`w-[10px] h-full flex-shrink-0 border-r cursor-pointer ${
                      fi + 1 === currentFrame ? 'bg-[#ff6666]' : fi === 0 ? 'bg-[#c8c8c8]' : ''
                    } ${(fi + 1) % 5 === 0 ? 'border-r-[#808080]' : 'border-r-[#d0d0d0]'}`}
                    onClick={() => setCurrentFrame(fi + 1)}
                  >
                    {(fi === 0 || !isBlankFrame(layer.frames[fi])) && (
                      <div className="w-[4px] h-[4px] bg-black rounded-full mx-auto mt-[7px]" />
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* Playhead indicator */}
            <div className="h-[4px] relative" style={{ backgroundColor: '#d4d0c8' }}>
              <div
                className="absolute top-0 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-red-500"
                style={{ left: `${(currentFrame - 1) * 10 + 3}px` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Tools panel */}
        <div className="w-[36px] flex-shrink-0 border-r border-[#808080] py-1" style={{ backgroundColor: '#d4d0c8' }}>
          <div className="grid grid-cols-2 gap-[1px] px-[2px]">
            {TOOLS.map((tool, i) => (
              <button
                key={i}
                className={`w-[15px] h-[15px] flex items-center justify-center text-[10px] ${
                  selectedTool === i
                    ? 'bg-[#a0a0a0] border border-[#808080] border-r-white border-b-white'
                    : 'border border-transparent hover:border-white hover:border-r-[#808080] hover:border-b-[#808080]'
                }`}
                onClick={() => setSelectedTool(i)}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* Colors */}
          <div className="mt-2 flex flex-col items-center gap-1">
            <div className="relative w-[24px] h-[24px]">
              <button
                aria-label="White"
                className="absolute bottom-0 right-0 w-[14px] h-[14px] border border-[#808080] bg-white"
                onClick={() => setCurrentColor('#ffffff')}
              />
              <button
                aria-label="Black"
                className="absolute top-0 left-0 w-[14px] h-[14px] border border-[#808080] bg-black"
                onClick={() => setCurrentColor('#000000')}
              />
            </div>
            <div className="win98-sunken w-[20px] h-[10px]" style={{ backgroundColor: currentColor }} />
          </div>
        </div>

        {/* Stage (canvas) */}
        <div className="flex-1 overflow-auto flex items-center justify-center" style={{ backgroundColor: '#808080' }}>
          <div className="relative border border-[#000]" style={{ width: stage.width, height: stage.height, backgroundColor: stage.bg }}>
            <canvas
              ref={onionCanvasRef}
              width={stage.width}
              height={stage.height}
              className="absolute inset-0 pointer-events-none"
              style={{ opacity: 0.3 }}
            />
            {layers.map((layer, i) => (
              <canvas
                key={i}
                ref={(el) => {
                  canvasRefs.current[i] = el;
                }}
                width={stage.width}
                height={stage.height}
                className="absolute inset-0 pointer-events-none"
                style={{ display: layer.visible ? 'block' : 'none' }}
              />
            ))}
            <div
              className="absolute inset-0"
              style={{ cursor: canDraw ? 'crosshair' : 'default' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>
        </div>

        {/* Library panel */}
        <div className="w-[160px] flex-shrink-0 flex flex-col border-l border-[#808080]" style={{ backgroundColor: '#d4d0c8' }}>
          <div className="h-[18px] flex items-center px-2 text-[10px] font-bold border-b border-[#808080]" style={{ backgroundColor: '#000080', color: '#fff' }}>
            Library
          </div>
          <div className="flex-1 bg-white p-1 text-[10px]">
            <div className="text-[#808080] text-center mt-4">No items in library</div>
          </div>
          {/* Library preview */}
          <div className="h-[80px] border-t border-[#808080] flex items-center justify-center bg-white">
            <span className="text-[10px] text-[#808080]">Preview</span>
          </div>
        </div>
      </div>

      {/* Properties panel */}
      <div className="h-[60px] border-t border-[#808080] flex" style={{ backgroundColor: '#d4d0c8' }}>
        <div className="flex-1 p-1">
          <div className="text-[10px] font-bold mb-1">Properties</div>
          <div className="flex gap-4 text-[10px]">
            <div className="flex gap-1 items-center">
              <span>W:</span>
              <div className="win98-sunken bg-white h-[14px] w-[40px] px-1">{stage.width}</div>
            </div>
            <div className="flex gap-1 items-center">
              <span>H:</span>
              <div className="win98-sunken bg-white h-[14px] w-[40px] px-1">{stage.height}</div>
            </div>
            <div className="flex gap-1 items-center">
              <span>FPS:</span>
              <div className="win98-sunken bg-white h-[14px] w-[30px] px-1">{stage.fps}</div>
            </div>
            <div className="flex gap-1 items-center">
              <span>Frame:</span>
              <span>{currentFrame}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-[20px] flex items-center px-1 border-t border-white">
        <span className="win98-sunken px-2 py-0 flex-1">Frame {currentFrame} / {TOTAL_FRAMES}</span>
        <span className="win98-sunken px-2 py-0 w-[100px]">{stage.fps.toFixed(1)} fps</span>
      </div>

      {picker && (
        <FilePickerDialog
          mode={picker}
          extensions={['fla']}
          defaultName={picker === 'save' ? (fileName.includes('.') ? fileName : `${fileName}.fla`) : ''}
          onCancel={() => setPicker(null)}
          onConfirm={(path) => {
            const target = picker;
            setPicker(null);
            if (target === 'open') loadPath(path);
            else doSave(path);
          }}
        />
      )}

      {docForm && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20">
          <div className="win98-window p-0 w-[280px]">
            <div className="win98-titlebar px-2">
              <span className="flex-1 text-[11px] font-bold text-white">Document Properties</span>
            </div>
            <div className="p-3 bg-[var(--win98-button-face)] flex flex-col gap-2 text-[11px]">
              <label className="flex items-center gap-2">
                <span className="w-[70px]">Width:</span>
                <input type="number" min={1} className="win98-sunken bg-white h-[18px] w-[70px] px-1" value={docForm.width}
                  onChange={(e) => setDocForm((d) => d && { ...d, width: Math.max(1, Number(e.target.value) || 1) })} />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-[70px]">Height:</span>
                <input type="number" min={1} className="win98-sunken bg-white h-[18px] w-[70px] px-1" value={docForm.height}
                  onChange={(e) => setDocForm((d) => d && { ...d, height: Math.max(1, Number(e.target.value) || 1) })} />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-[70px]">Frame rate:</span>
                <input type="number" min={1} className="win98-sunken bg-white h-[18px] w-[70px] px-1" value={docForm.fps}
                  onChange={(e) => setDocForm((d) => d && { ...d, fps: Math.max(1, Number(e.target.value) || 1) })} />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-[70px]">Background:</span>
                <input type="color" className="win98-sunken h-[18px] w-[40px]" value={docForm.bg}
                  onChange={(e) => setDocForm((d) => d && { ...d, bg: e.target.value })} />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button className="win98-raised px-4 py-[2px]" onClick={() => { setStage(docForm); setDocForm(null); }}>OK</button>
                <button className="win98-raised px-3 py-[2px]" onClick={() => setDocForm(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
