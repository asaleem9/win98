import {
  DTMF_ROWS,
  DTMF_COLS,
  BUSY_TONES,
  KEYPAD_LAYOUT,
  dtmfFrequencies,
  normalizeNumber,
  dialOutcome,
  emptySpeedDial,
  normalizeSpeedDial,
  setSpeedDialSlot,
  isSlotFilled,
  SPEED_DIAL_COUNT,
  SpeedDialSlot,
} from '../dialerLogic';

describe('DTMF frequency pairs', () => {
  it('sounds a row tone plus a column tone for every keypad key', () => {
    // Corner + centre keys map to the documented touch-tone pairs.
    expect(dtmfFrequencies('1')).toEqual([697, 1209]);
    expect(dtmfFrequencies('3')).toEqual([697, 1477]);
    expect(dtmfFrequencies('5')).toEqual([770, 1336]);
    expect(dtmfFrequencies('9')).toEqual([852, 1477]);
    expect(dtmfFrequencies('*')).toEqual([941, 1209]);
    expect(dtmfFrequencies('0')).toEqual([941, 1336]);
    expect(dtmfFrequencies('#')).toEqual([941, 1477]);
  });

  it('draws both tones from the standard row/column groups', () => {
    for (const { key } of KEYPAD_LAYOUT) {
      const pair = dtmfFrequencies(key);
      expect(pair).not.toBeNull();
      const [low, high] = pair!;
      expect(DTMF_ROWS).toContain(low);
      expect(DTMF_COLS).toContain(high);
    }
  });

  it('assigns a unique pair to each of the twelve keys', () => {
    const pairs = KEYPAD_LAYOUT.map(({ key }) => dtmfFrequencies(key)!.join('/'));
    expect(new Set(pairs).size).toBe(KEYPAD_LAYOUT.length);
  });

  it('returns null for anything that is not a keypad key', () => {
    expect(dtmfFrequencies('A')).toBeNull();
    expect(dtmfFrequencies('')).toBeNull();
    expect(dtmfFrequencies('12')).toBeNull();
  });

  it('keeps the busy signal on its own 480/620 Hz pair', () => {
    expect(BUSY_TONES).toEqual([480, 620]);
  });
});

describe('normalizeNumber', () => {
  it('keeps only the digits', () => {
    expect(normalizeNumber('(555) 867-5309')).toBe('5558675309');
    expect(normalizeNumber('1-800-COLLECT')).toBe('1800');
    expect(normalizeNumber('411')).toBe('411');
  });
});

describe('dialOutcome routing', () => {
  it('reaches directory assistance on 411', () => {
    const out = dialOutcome('411');
    expect(out.kind).toBe('operator');
    expect(out.busy).toBe(false);
  });

  it('plays the safety gag on 911 without a busy signal', () => {
    const out = dialOutcome('911');
    expect(out.kind).toBe('emergency');
    expect(out.busy).toBe(false);
  });

  it('never connects to Jenny, with or without formatting or a leading 1', () => {
    for (const dialed of ['867-5309', '8675309', '1 867 5309', '(555) 867-5309']) {
      const out = dialOutcome(dialed);
      expect(out.kind).toBe('jenny');
      expect(out.message).toMatch(/Jenny is not available/);
      expect(out.busy).toBe(false);
    }
  });

  it('meets a busy signal for any ordinary number', () => {
    const out = dialOutcome('555-1234');
    expect(out.kind).toBe('busy');
    expect(out.busy).toBe(true);
    expect(out.message).toMatch(/line is busy/);
  });
});

describe('speed dial persistence helpers', () => {
  it('starts with exactly eight empty slots', () => {
    const slots = emptySpeedDial();
    expect(slots).toHaveLength(SPEED_DIAL_COUNT);
    expect(slots.every((s) => s.name === '' && s.number === '')).toBe(true);
  });

  it('coerces junk persisted data back into eight well-formed slots', () => {
    expect(normalizeSpeedDial(null)).toHaveLength(SPEED_DIAL_COUNT);
    expect(normalizeSpeedDial('nope')).toHaveLength(SPEED_DIAL_COUNT);

    const restored = normalizeSpeedDial([
      { name: 'Mom', number: '5551234' },
      { number: '5555678' }, // missing name
      { name: 42, number: null }, // wrong types
    ]);
    expect(restored[0]).toEqual({ name: 'Mom', number: '5551234' });
    expect(restored[1]).toEqual({ name: '', number: '5555678' });
    expect(restored[2]).toEqual({ name: '', number: '' });
    expect(restored).toHaveLength(SPEED_DIAL_COUNT);
  });

  it('caps an over-long persisted list at eight slots', () => {
    const raw = Array.from({ length: 20 }, (_, i) => ({ name: `N${i}`, number: `${i}` }));
    const slots = normalizeSpeedDial(raw);
    expect(slots).toHaveLength(SPEED_DIAL_COUNT);
    expect(slots[7]).toEqual({ name: 'N7', number: '7' });
  });

  it('updates a slot immutably', () => {
    const slots = emptySpeedDial();
    const next = setSpeedDialSlot(slots, 2, { name: 'Pizza', number: '5556677' });
    expect(next[2]).toEqual({ name: 'Pizza', number: '5556677' });
    expect(next).not.toBe(slots);
    expect(slots[2]).toEqual({ name: '', number: '' }); // original untouched
  });

  it('treats a slot as filled only when it has a number', () => {
    expect(isSlotFilled({ name: 'x', number: '5' })).toBe(true);
    expect(isSlotFilled({ name: 'named but no number', number: '' })).toBe(false);
    expect(isSlotFilled({ name: 'x', number: '   ' })).toBe(false);
    expect(isSlotFilled(undefined)).toBe(false);
  });
});

// Type-only guard so the exported shape stays stable.
const _shape: SpeedDialSlot = { name: '', number: '' };
void _shape;
