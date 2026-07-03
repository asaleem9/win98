import { describe, it, expect } from 'vitest';
import {
  snapToGrid,
  nextName,
  defaultControl,
  addControl,
  removeControl,
  updateControl,
  type VbControl,
} from '../vb6Helpers';

describe('snapToGrid', () => {
  it('snaps to the nearest multiple of the grid size', () => {
    expect(snapToGrid(0)).toBe(0);
    expect(snapToGrid(3)).toBe(0);
    expect(snapToGrid(5)).toBe(8);
    expect(snapToGrid(12)).toBe(16);
  });

  it('supports a custom grid size', () => {
    expect(snapToGrid(14, 10)).toBe(10);
    expect(snapToGrid(16, 10)).toBe(20);
  });
});

describe('nextName', () => {
  it('starts at 1 when there are no existing controls', () => {
    expect(nextName([], 'Command')).toBe('Command1');
  });

  it('increments past the highest existing numeric suffix', () => {
    const controls = [
      { name: 'Command1' } as VbControl,
      { name: 'Command3' } as VbControl,
    ];
    expect(nextName(controls, 'Command')).toBe('Command4');
  });

  it('ignores controls with a different prefix', () => {
    const controls = [{ name: 'Text1' } as VbControl];
    expect(nextName(controls, 'Command')).toBe('Command1');
  });
});

describe('defaultControl', () => {
  it('creates unique incrementing names/captions per type', () => {
    const first = defaultControl('CommandButton', []);
    const second = defaultControl('CommandButton', [first]);
    expect(first.name).toBe('Command1');
    expect(first.caption).toBe('Command1');
    expect(second.name).toBe('Command2');
    expect(first.id).not.toBe(second.id);
  });

  it('snaps the requested position to the grid', () => {
    const control = defaultControl('Label', [], 13, 21);
    expect(control.x).toBe(16);
    expect(control.y).toBe(24);
  });

  it('gives each type its own default size', () => {
    const button = defaultControl('CommandButton', []);
    const label = defaultControl('Label', []);
    const text = defaultControl('TextBox', []);
    const check = defaultControl('CheckBox', []);
    expect(button.width).toBeGreaterThan(0);
    expect(label.width).not.toBe(button.width);
    expect(text.height).toBeGreaterThan(0);
    expect(check.name).toBe('Check1');
  });
});

describe('array ops', () => {
  const base = defaultControl('TextBox', [], 0, 0);

  it('addControl appends without mutating the original array', () => {
    const result = addControl([], base);
    expect(result).toEqual([base]);
    expect(result).not.toBe(base as unknown as VbControl[]);
  });

  it('removeControl filters out the matching id', () => {
    const other = defaultControl('Label', [base]);
    const result = removeControl([base, other], base.id);
    expect(result).toEqual([other]);
  });

  it('updateControl patches only the matching control', () => {
    const other = defaultControl('Label', [base]);
    const result = updateControl([base, other], base.id, { caption: 'Hello' });
    expect(result.find((c) => c.id === base.id)?.caption).toBe('Hello');
    expect(result.find((c) => c.id === other.id)).toEqual(other);
  });

  it('updateControl leaves the array unchanged if the id is not found', () => {
    const result = updateControl([base], 'missing', { caption: 'x' });
    expect(result).toEqual([base]);
  });
});
