import {
  detectClippyTrigger,
  ClippyTriggerId,
  CLIPPY_OFFERS,
  WORD_COUNT_REMINDER_THRESHOLD,
} from '../clippy';

const none = new Set<ClippyTriggerId>();

describe('detectClippyTrigger', () => {
  it('returns null for empty or whitespace text', () => {
    expect(detectClippyTrigger('', none)).toBeNull();
    expect(detectClippyTrigger('   \n  ', none)).toBeNull();
  });

  it('offers letter help when the text starts with "Dear"', () => {
    expect(detectClippyTrigger('Dear Sir,', none)).toBe('letter');
    expect(detectClippyTrigger('  dear mom', none)).toBe('letter');
  });

  it('does not treat "dearly" as a letter greeting', () => {
    expect(detectClippyTrigger('dearly beloved we gather', none)).toBeNull();
  });

  it('detects resume / CV intent anywhere in the text', () => {
    expect(detectClippyTrigger('My resume follows below', none)).toBe('resume');
    expect(detectClippyTrigger('Please find my CV attached', none)).toBe('resume');
    expect(detectClippyTrigger('A short curriculum vitae', none)).toBe('resume');
  });

  it('fires the indignant easter egg when the user types "clippy"', () => {
    expect(detectClippyTrigger('I hate clippy so much', none)).toBe('clippy-ego');
  });

  it('reminds to save once the document is long', () => {
    const short = Array.from({ length: WORD_COUNT_REMINDER_THRESHOLD }, () => 'word').join(' ');
    expect(detectClippyTrigger(short, none)).toBeNull();
    const long = Array.from({ length: WORD_COUNT_REMINDER_THRESHOLD + 1 }, () => 'word').join(' ');
    expect(detectClippyTrigger(long, none)).toBe('wordcount');
  });

  it('prefers letter intent over the word-count reminder', () => {
    const long = 'Dear team ' + Array.from({ length: WORD_COUNT_REMINDER_THRESHOLD }, () => 'word').join(' ');
    expect(detectClippyTrigger(long, none)).toBe('letter');
  });

  it('skips triggers that already fired this session', () => {
    const fired = new Set<ClippyTriggerId>(['letter']);
    expect(detectClippyTrigger('Dear Sir, please find my resume', fired)).toBe('resume');
  });

  it('has a defined offer for every trigger id', () => {
    (['letter', 'resume', 'clippy-ego', 'wordcount'] as ClippyTriggerId[]).forEach((id) => {
      expect(CLIPPY_OFFERS[id].buttons.length).toBeGreaterThan(0);
    });
  });

  it('gives the letter offer an insert-letter action', () => {
    expect(CLIPPY_OFFERS.letter.buttons.some((b) => b.id === 'insert-letter')).toBe(true);
  });
});
