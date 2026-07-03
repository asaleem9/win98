'use client';

import { useEffect, useRef, useState } from 'react';
import { Button98 } from '@/components/ui/Button98';

// Shared Win98 modal chrome for the photoshop-local dialogs.
function DialogShell({
  title,
  width = 300,
  children,
  onClose,
}: {
  title: string;
  width?: number;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/20 font-[family-name:var(--win98-font)] text-[11px]">
      <div
        className="bg-[var(--win98-button-face)] text-black border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]"
        style={{ width }}
      >
        <div className="flex items-center justify-between h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white font-bold select-none">
          <span>{title}</span>
          <button
            className="w-[16px] h-[14px] flex items-center justify-center bg-[var(--win98-button-face)] text-black border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] text-[9px] leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-3">{children}</div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min = 1,
  max = 4000,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-[72px]">{label}</span>
      <input
        type="number"
        className="w-[70px] win98-sunken bg-white px-1 h-[18px] outline-none"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, Math.round(n))));
        }}
      />
    </label>
  );
}

// --- New document ----------------------------------------------------------

export function NewImageDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (opts: { width: number; height: number; background: 'white' | 'transparent' }) => void;
  onCancel: () => void;
}) {
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(300);
  const [background, setBackground] = useState<'white' | 'transparent'>('white');

  return (
    <DialogShell title="New" width={280} onClose={onCancel}>
      <div className="flex flex-col gap-2">
        <NumberField label="Width:" value={width} onChange={setWidth} />
        <NumberField label="Height:" value={height} onChange={setHeight} />
        <label className="flex items-center gap-2">
          <span className="w-[72px]">Contents:</span>
          <select
            className="win98-sunken bg-white px-1 h-[18px] outline-none"
            value={background}
            onChange={(e) => setBackground(e.target.value as 'white' | 'transparent')}
          >
            <option value="white">White</option>
            <option value="transparent">Transparent</option>
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button98 className="min-w-[64px] h-[22px]" onClick={() => onConfirm({ width, height, background })}>
            OK
          </Button98>
          <Button98 className="min-w-[64px] h-[22px]" onClick={onCancel}>
            Cancel
          </Button98>
        </div>
      </div>
    </DialogShell>
  );
}

// --- Canvas size -----------------------------------------------------------

export function CanvasSizeDialog({
  initialWidth,
  initialHeight,
  onConfirm,
  onCancel,
}: {
  initialWidth: number;
  initialHeight: number;
  onConfirm: (opts: { width: number; height: number }) => void;
  onCancel: () => void;
}) {
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);

  return (
    <DialogShell title="Canvas Size" width={280} onClose={onCancel}>
      <div className="flex flex-col gap-2">
        <NumberField label="Width:" value={width} onChange={setWidth} />
        <NumberField label="Height:" value={height} onChange={setHeight} />
        <div className="flex justify-end gap-2 pt-1">
          <Button98 className="min-w-[64px] h-[22px]" onClick={() => onConfirm({ width, height })}>
            OK
          </Button98>
          <Button98 className="min-w-[64px] h-[22px]" onClick={onCancel}>
            Cancel
          </Button98>
        </div>
      </div>
    </DialogShell>
  );
}

// --- Simple numeric prompt (Mosaic cell size, Add Noise amount) -------------

export function ValuePromptDialog({
  title,
  label,
  initial,
  min,
  max,
  onConfirm,
  onCancel,
}: {
  title: string;
  label: string;
  initial: number;
  min: number;
  max: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <DialogShell title={title} width={260} onClose={onCancel}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="flex-1">{label}</span>
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-[36px] text-right win98-sunken bg-white px-1">{value}</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button98 className="min-w-[64px] h-[22px]" onClick={() => onConfirm(value)}>
            OK
          </Button98>
          <Button98 className="min-w-[64px] h-[22px]" onClick={onCancel}>
            Cancel
          </Button98>
        </div>
      </div>
    </DialogShell>
  );
}

// --- Adjustment dialog with live preview ------------------------------------

export interface AdjustmentSlider {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
}

export function AdjustmentDialog({
  title,
  sliders,
  thumbnail,
  transform,
  onApply,
  onCancel,
}: {
  title: string;
  sliders: AdjustmentSlider[];
  /** Small preview source; null in environments without a canvas context. */
  thumbnail: ImageData | null;
  transform: (data: Uint8ClampedArray, params: Record<string, number>) => void;
  onApply: (params: Record<string, number>) => void;
  onCancel: () => void;
}) {
  const [params, setParams] = useState<Record<string, number>>(() =>
    Object.fromEntries(sliders.map((s) => [s.key, s.default])),
  );
  const previewRef = useRef<HTMLCanvasElement>(null);

  // Re-render the preview whenever a slider moves.
  useEffect(() => {
    const canvas = previewRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !thumbnail) return;
    const work = new Uint8ClampedArray(thumbnail.data);
    transform(work, params);
    try {
      const out = new ImageData(work, thumbnail.width, thumbnail.height);
      ctx.putImageData(out, 0, 0);
    } catch {
      // ImageData unsupported (jsdom) — preview stays blank, non-fatal.
    }
  }, [params, thumbnail, transform]);

  return (
    <DialogShell title={title} width={320} onClose={onCancel}>
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-3">
          {sliders.map((s) => (
            <div key={s.key} className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>{s.label}</span>
                <span className="win98-sunken bg-white px-1 min-w-[36px] text-right">{params[s.key]}</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                value={params[s.key]}
                onChange={(e) => setParams((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px]">Preview</span>
          <div className="win98-sunken bg-white p-[2px]">
            <canvas
              ref={previewRef}
              width={thumbnail?.width || 80}
              height={thumbnail?.height || 60}
              className="block"
              style={{ imageRendering: 'pixelated', width: 80, height: 60 }}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-3">
        <Button98 className="min-w-[64px] h-[22px]" onClick={() => onApply(params)}>
          OK
        </Button98>
        <Button98 className="min-w-[64px] h-[22px]" onClick={onCancel}>
          Cancel
        </Button98>
      </div>
    </DialogShell>
  );
}
