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
