// Pure builders for the character grid shown in Character Map's "Advanced view".

export type UnicodeSubrange = 'latin1' | 'greek' | 'cyrillic' | 'box-drawing' | 'symbols';

export interface SubrangeOption {
  id: UnicodeSubrange;
  label: string;
}

export const subrangeOptions: SubrangeOption[] = [
  { id: 'latin1', label: 'Latin-1' },
  { id: 'greek', label: 'Greek' },
  { id: 'cyrillic', label: 'Cyrillic' },
  { id: 'box-drawing', label: 'Box Drawing' },
  { id: 'symbols', label: 'Symbols' },
];

const rangeBounds: Record<UnicodeSubrange, [number, number]> = {
  'latin1': [0x0020, 0x00ff],
  'greek': [0x0370, 0x03ff],
  'cyrillic': [0x0400, 0x04ff],
  'box-drawing': [0x2500, 0x257f],
  'symbols': [0x2100, 0x214f],
};

/** Builds the list of codepoints for a given Unicode subrange. */
export function buildSubrangeCodepoints(range: UnicodeSubrange): number[] {
  const [start, end] = rangeBounds[range];
  const codes: number[] = [];
  for (let i = start; i <= end; i++) codes.push(i);
  return codes;
}
