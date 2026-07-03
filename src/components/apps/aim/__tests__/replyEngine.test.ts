import { generateReply, renderEmoticons } from '../replyEngine';

const ctx = (index = 1) => ({
  buddyName: 'sk8erboi99',
  canned: ['lol', 'brb', 'totally dude'],
  index,
});

describe('generateReply', () => {
  it('answers name questions with the buddy screen name', () => {
    const r = generateReply('whats your name?', ctx());
    expect(r.toLowerCase()).toContain('sk8erboi99');
  });

  it('responds to a/s/l prompts', () => {
    expect(generateReply('a/s/l?', ctx())).toMatch(/a\/s\/l/i);
    expect(generateReply('asl', ctx())).toMatch(/a\/s\/l/i);
  });

  it('answers age questions', () => {
    expect(generateReply('how old are you?', ctx()).toLowerCase()).toContain('im 15');
  });

  it('mirrors laughter', () => {
    expect(generateReply('lol that was funny', ctx()).toLowerCase()).toContain('lol');
    expect(generateReply('hahaha', ctx()).toLowerCase()).toContain('lol');
  });

  it('greets back on greetings', () => {
    expect(generateReply('hey there', ctx())).toMatch(/hey/i);
  });

  it('acknowledges goodbyes', () => {
    expect(generateReply('g2g bye', ctx())).toMatch(/ttyl/i);
  });

  it('echoes a meaningful word from the user message on even turns', () => {
    // index 0 => echo branch, long word "skateboarding"
    const r = generateReply('i went skateboarding today', ctx(0));
    expect(r.toLowerCase()).toContain('skateboarding');
  });

  it('treats questions differently from statements when echoing', () => {
    const q = generateReply('do you like skateboarding?', ctx(0));
    const s = generateReply('i love skateboarding', ctx(0));
    expect(q).not.toEqual(s);
    expect(q).toMatch(/\?$/);
  });

  it('is deterministic for the same input and index', () => {
    expect(generateReply('random statement here', ctx(3))).toEqual(
      generateReply('random statement here', ctx(3)),
    );
  });

  it('falls back to rotating canned lines for plain statements on odd turns', () => {
    // odd index, no keyword, no long echo word -> canned rotation
    const r = generateReply('ok cool', ctx(1));
    expect(['lol', 'brb', 'totally dude']).toContain(r);
  });
});

describe('renderEmoticons', () => {
  it('converts common emoticons to emoji', () => {
    expect(renderEmoticons('hey :-)')).toContain('🙂');
    expect(renderEmoticons('<3 u')).toContain('❤️');
    expect(renderEmoticons(';-) lol')).toContain('😉');
  });

  it('leaves plain text unchanged', () => {
    expect(renderEmoticons('just text')).toBe('just text');
  });
});
