// Data + test state machine for the DirectX Diagnostic Tool. DOM-free so the
// tab data, the DirectDraw/Direct3D/DirectSound test sequence, and the notes
// logic can be unit-tested directly.

import { SYSTEM_SPECS } from '@/lib/constants';

export const DX_VERSION = 'DirectX 6.1 (4.06.02.0436)';

export interface DxField {
  label: string;
  value: string;
}

/** System tab — mirrors the real dxdiag summary, with a live date/time row. */
export function systemFields(now: Date): DxField[] {
  return [
    { label: 'Current Date/Time', value: now.toLocaleString() },
    { label: 'Computer Name', value: 'DESKTOP-WIN98' },
    { label: 'Operating System', value: SYSTEM_SPECS.os },
    { label: 'Language', value: 'English (Regional Setting: English)' },
    { label: 'System Manufacturer', value: 'Generic PC' },
    { label: 'System Model', value: 'ATX Desktop' },
    { label: 'BIOS', value: SYSTEM_SPECS.bios },
    { label: 'Processor', value: SYSTEM_SPECS.processor },
    { label: 'Memory', value: SYSTEM_SPECS.ram },
    { label: 'Page file', value: '84MB used, 428MB available' },
    { label: 'DirectX Version', value: DX_VERSION },
  ];
}

/** DirectX Files tab — the era DX6.1 runtime, all at the matching build. */
export const DX_FILES: DxField[] = [
  { label: 'ddraw.dll', value: '4.06.02.0436' },
  { label: 'ddhelp.exe', value: '4.06.02.0436' },
  { label: 'dplayx.dll', value: '4.06.02.0436' },
  { label: 'dsound.dll', value: '4.06.02.0436' },
  { label: 'dinput.dll', value: '4.06.02.0436' },
  { label: 'd3dim.dll', value: '4.06.02.0436' },
  { label: 'd3drm.dll', value: '4.06.02.0436' },
  { label: 'd3dxof.dll', value: '4.06.02.0436' },
  { label: 'dmusic.dll', value: '4.06.02.0436' },
  { label: 'dmband.dll', value: '4.06.02.0436' },
];

export const DISPLAY_DEVICE_FIELDS: DxField[] = [
  { label: 'Name', value: SYSTEM_SPECS.display },
  { label: 'Manufacturer', value: 'NVIDIA' },
  { label: 'Chip Type', value: 'RIVA TNT2' },
  { label: 'DAC Type', value: 'Integrated RAMDAC' },
  { label: 'Approx. Total Memory', value: '16.0 MB' },
  { label: 'Current Display Mode', value: '1024 x 768 (16 bit) (75Hz)' },
  { label: 'Monitor', value: SYSTEM_SPECS.monitor },
];

export const DISPLAY_FEATURE_FIELDS: DxField[] = [
  { label: 'DirectDraw Acceleration', value: 'Enabled' },
  { label: 'Direct3D Acceleration', value: 'Enabled' },
  { label: 'AGP Texture Acceleration', value: 'Enabled' },
];

export const SOUND_DEVICE_FIELDS: DxField[] = [
  { label: 'Name', value: SYSTEM_SPECS.sound },
  { label: 'Manufacturer', value: 'Creative Technology Ltd.' },
  { label: 'Driver', value: 'SBLIVE.VXD' },
  { label: 'Driver Version', value: '5.12.01.3511' },
  { label: 'Hardware Sound Accel Level', value: 'Full Acceleration' },
];

export const INPUT_DEVICE_FIELDS: DxField[] = [
  { label: 'Keyboard', value: 'Standard 101/102-Key or Microsoft Natural PS/2 Keyboard' },
  { label: 'Mouse', value: 'Microsoft PS/2 Mouse' },
  { label: 'Game Port Devices', value: 'None attached' },
  { label: 'Registered DirectInput Drivers', value: 'MSGAME.VXD (4.06.02.0436)' },
];

// --- test state machine -----------------------------------------------------

export type DxTestKind = 'directdraw' | 'direct3d' | 'directsound';
export type DxTestPhase = 'idle' | 'running' | 'question';
export type DxResult = 'pass' | 'fail' | null;

export interface DxTestState {
  kind: DxTestKind | null;
  phase: DxTestPhase;
  results: Record<DxTestKind, DxResult>;
}

export const INITIAL_DX_TEST: DxTestState = {
  kind: null,
  phase: 'idle',
  results: { directdraw: null, direct3d: null, directsound: null },
};

/** How long each test animation/sound runs before the pass/fail prompt. */
export const TEST_DURATION_MS = 2500;

export const DX_TEST_LABEL: Record<DxTestKind, string> = {
  directdraw: 'DirectDraw',
  direct3d: 'Direct3D',
  directsound: 'DirectSound',
};

export type DxTestAction =
  | { type: 'START'; kind: DxTestKind }
  | { type: 'ADVANCE' }
  | { type: 'ANSWER'; pass: boolean }
  | { type: 'CANCEL' };

export function dxTestReducer(state: DxTestState, action: DxTestAction): DxTestState {
  switch (action.type) {
    case 'START':
      if (state.phase !== 'idle') return state;
      return { ...state, kind: action.kind, phase: 'running' };

    case 'ADVANCE':
      if (state.phase !== 'running') return state;
      return { ...state, phase: 'question' };

    case 'ANSWER': {
      if (state.phase !== 'question' || !state.kind) return state;
      return {
        kind: null,
        phase: 'idle',
        results: { ...state.results, [state.kind]: action.pass ? 'pass' : 'fail' },
      };
    }

    case 'CANCEL':
      return { ...state, kind: null, phase: 'idle' };

    default:
      return state;
  }
}

/** The Notes readout: clean until a test is answered "no". */
export function notesForResults(results: Record<DxTestKind, DxResult>): string {
  const failed = (Object.keys(results) as DxTestKind[]).filter((k) => results[k] === 'fail');
  if (failed.length === 0) return 'No problems found.';
  return `Problems found: the ${failed.map((k) => DX_TEST_LABEL[k]).join(' and ')} test reported a failure.`;
}
