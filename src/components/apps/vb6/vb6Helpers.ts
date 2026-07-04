// Pure helpers for the form designer: control creation, positioning and array ops.
// Kept free of React/DOM so they're trivial to unit test.

export type ControlType = 'CommandButton' | 'Label' | 'TextBox' | 'CheckBox';

export interface VbControl {
  id: string;
  type: ControlType;
  x: number;
  y: number;
  width: number;
  height: number;
  caption: string;
  name: string;
}

const NAME_PREFIX: Record<ControlType, string> = {
  CommandButton: 'Command',
  Label: 'Label',
  TextBox: 'Text',
  CheckBox: 'Check',
};

const DEFAULT_SIZE: Record<ControlType, { width: number; height: number }> = {
  CommandButton: { width: 120, height: 32 },
  Label: { width: 72, height: 16 },
  TextBox: { width: 96, height: 20 },
  CheckBox: { width: 80, height: 16 },
};

/** Rounds a coordinate to the nearest grid line (8px by default, matching the form's dot grid). */
export function snapToGrid(value: number, grid = 8): number {
  return Math.round(value / grid) * grid;
}

/** Returns the next unused "Prefix#" name for a control type, given the controls already on the form. */
export function nextName(controls: VbControl[], prefix: string): string {
  let max = 0;
  for (const c of controls) {
    if (!c.name.startsWith(prefix)) continue;
    const suffix = c.name.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) continue;
    const num = parseInt(suffix, 10);
    if (num > max) max = num;
  }
  return `${prefix}${max + 1}`;
}

let idCounter = 0;

/** Generates a fresh, collision-free control id. Exported mainly so tests can reset determinism if needed. */
export function nextControlId(): string {
  idCounter += 1;
  return `ctrl-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Builds a new control of the given type, positioned at (x, y), with a unique auto-generated name/caption. */
export function defaultControl(
  type: ControlType,
  existingControls: VbControl[],
  x = 0,
  y = 0
): VbControl {
  const prefix = NAME_PREFIX[type];
  const name = nextName(existingControls, prefix);
  const size = DEFAULT_SIZE[type];
  return {
    id: nextControlId(),
    type,
    x: snapToGrid(x),
    y: snapToGrid(y),
    width: size.width,
    height: size.height,
    caption: name,
    name,
  };
}

export function addControl(controls: VbControl[], control: VbControl): VbControl[] {
  return [...controls, control];
}

export function removeControl(controls: VbControl[], id: string): VbControl[] {
  return controls.filter((c) => c.id !== id);
}

export function updateControl(
  controls: VbControl[],
  id: string,
  patch: Partial<Omit<VbControl, 'id'>>
): VbControl[] {
  return controls.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

export type AlignEdge = 'lefts' | 'rights' | 'tops' | 'bottoms';

/**
 * Align the selected controls' edges to each other, the way VB6's Format > Align
 * does. Lefts/tops snap to the minimum edge; rights/bottoms to the maximum. A
 * selection of fewer than two controls is left untouched.
 */
export function alignControls(controls: VbControl[], ids: string[], edge: AlignEdge): VbControl[] {
  const selected = controls.filter((c) => ids.includes(c.id));
  if (selected.length < 2) return controls;
  switch (edge) {
    case 'lefts': {
      const x = Math.min(...selected.map((c) => c.x));
      return controls.map((c) => (ids.includes(c.id) ? { ...c, x } : c));
    }
    case 'tops': {
      const y = Math.min(...selected.map((c) => c.y));
      return controls.map((c) => (ids.includes(c.id) ? { ...c, y } : c));
    }
    case 'rights': {
      const right = Math.max(...selected.map((c) => c.x + c.width));
      return controls.map((c) => (ids.includes(c.id) ? { ...c, x: right - c.width } : c));
    }
    case 'bottoms': {
      const bottom = Math.max(...selected.map((c) => c.y + c.height));
      return controls.map((c) => (ids.includes(c.id) ? { ...c, y: bottom - c.height } : c));
    }
    default:
      return controls;
  }
}

export interface FormFile {
  app: 'vb6';
  version: 1;
  formName: string;
  formCaption: string;
  controls: VbControl[];
}

/** Serialize the current form to the .frm JSON we persist to the filesystem. */
export function serializeFrm(form: FormFile): string {
  return JSON.stringify(form);
}

/** Parse a .frm payload back into a form, or null when it isn't ours. */
export function deserializeFrm(json: string): FormFile | null {
  try {
    const parsed = JSON.parse(json) as FormFile;
    if (parsed && parsed.app === 'vb6' && Array.isArray(parsed.controls)) return parsed;
  } catch {
    // not JSON / not our shape
  }
  return null;
}

export interface ControlSeed {
  type: ControlType;
  x: number;
  y: number;
  width: number;
  height: number;
  caption: string;
}

const CONTROL_CLIP_TAG = 'application/x-win98-vb6-controls';

/** Serialize a set of controls for the shared text clipboard. */
export function encodeControlsClipboard(seeds: ControlSeed[]): string {
  return JSON.stringify({ tag: CONTROL_CLIP_TAG, seeds });
}

/** Parse clipboard text into control seeds, or null when it isn't ours. */
export function decodeControlsClipboard(text: string): ControlSeed[] | null {
  try {
    const parsed = JSON.parse(text) as { tag?: string; seeds?: ControlSeed[] };
    if (parsed?.tag === CONTROL_CLIP_TAG && Array.isArray(parsed.seeds)) return parsed.seeds;
  } catch {
    // not JSON / not our shape
  }
  return null;
}
