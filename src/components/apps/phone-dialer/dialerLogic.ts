// Pure logic for the Phone Dialer: authentic DTMF frequency pairs, comedic
// call-outcome routing, and speed-dial persistence helpers. DOM/React-free so
// the tone math and routing can be unit-tested directly.

// The two DTMF tone groups (Hz). A pressed key sounds one row tone plus one
// column tone — the real touch-tone standard.
export const DTMF_ROWS = [697, 770, 852, 941] as const;
export const DTMF_COLS = [1209, 1336, 1477] as const;

// Keypad → [rowIndex, colIndex] into the tables above.
const KEYPAD: Record<string, [number, number]> = {
  '1': [0, 0], '2': [0, 1], '3': [0, 2],
  '4': [1, 0], '5': [1, 1], '6': [1, 2],
  '7': [2, 0], '8': [2, 1], '9': [2, 2],
  '*': [3, 0], '0': [3, 1], '#': [3, 2],
};

// Layout order + the letters printed under each key (era style: no Q/Z).
export const KEYPAD_LAYOUT: { key: string; letters: string }[] = [
  { key: '1', letters: '' },
  { key: '2', letters: 'ABC' },
  { key: '3', letters: 'DEF' },
  { key: '4', letters: 'GHI' },
  { key: '5', letters: 'JKL' },
  { key: '6', letters: 'MNO' },
  { key: '7', letters: 'PRS' },
  { key: '8', letters: 'TUV' },
  { key: '9', letters: 'WXY' },
  { key: '*', letters: '' },
  { key: '0', letters: 'OPER' },
  { key: '#', letters: '' },
];

/** The [low, high] DTMF frequency pair for a keypad key, or null if not a key. */
export function dtmfFrequencies(key: string): [number, number] | null {
  const pos = KEYPAD[key];
  if (!pos) return null;
  return [DTMF_ROWS[pos[0]], DTMF_COLS[pos[1]]];
}

// Busy-signal tone pair (Hz) — 0.5s on / 0.5s off in North America.
export const BUSY_TONES = [480, 620] as const;

// --- call outcome routing ---------------------------------------------------

export type DialOutcomeKind = 'operator' | 'emergency' | 'jenny' | 'busy';

export interface DialOutcome {
  kind: DialOutcomeKind;
  title: string;
  message: string;
  /** True when the outcome should loop the busy signal. */
  busy: boolean;
}

/** Digits only — strips spaces, dashes, parens, the leading 1, etc. */
export function normalizeNumber(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Route a dialed number to its (comedic) outcome. 411 reaches directory
 * assistance, 911 a safety gag, 867-5309 is forever Jenny's old number, and
 * everything else meets a busy signal.
 */
export function dialOutcome(input: string): DialOutcome {
  const digits = normalizeNumber(input);

  if (digits === '411') {
    return {
      kind: 'operator',
      title: 'Directory Assistance',
      message:
        'Directory Assistance. The number you requested is 1-800-COLLECT. That will be 75 cents, billed to your parents’ phone line.',
      busy: false,
    };
  }

  if (digits === '911') {
    return {
      kind: 'emergency',
      title: 'Emergency Services',
      message:
        'This is a simulated telephone. For a real emergency, hang up and dial 911 from an actual phone.',
      busy: false,
    };
  }

  if (digits === '8675309' || digits.endsWith('8675309')) {
    return {
      kind: 'jenny',
      title: 'Call Failed',
      message: 'Jenny is not available. Please stop calling this number.',
      busy: false,
    };
  }

  return {
    kind: 'busy',
    title: 'Call Failed',
    message: 'The line is busy. Please hang up and try your call again later.',
    busy: true,
  };
}

// --- speed dial -------------------------------------------------------------

export interface SpeedDialSlot {
  name: string;
  number: string;
}

export const SPEED_DIAL_COUNT = 8;

export function emptySpeedDial(): SpeedDialSlot[] {
  return Array.from({ length: SPEED_DIAL_COUNT }, () => ({ name: '', number: '' }));
}

/** Coerce whatever was persisted back into exactly eight well-formed slots. */
export function normalizeSpeedDial(raw: unknown): SpeedDialSlot[] {
  const slots = emptySpeedDial();
  if (Array.isArray(raw)) {
    for (let i = 0; i < SPEED_DIAL_COUNT; i++) {
      const s = raw[i] as Partial<SpeedDialSlot> | undefined;
      if (s && typeof s === 'object') {
        slots[i] = {
          name: typeof s.name === 'string' ? s.name : '',
          number: typeof s.number === 'string' ? s.number : '',
        };
      }
    }
  }
  return slots;
}

export function setSpeedDialSlot(
  slots: SpeedDialSlot[],
  index: number,
  slot: SpeedDialSlot,
): SpeedDialSlot[] {
  return slots.map((s, i) => (i === index ? slot : s));
}

export function isSlotFilled(slot: SpeedDialSlot | undefined): boolean {
  return !!slot && slot.number.trim().length > 0;
}
