import {
  parseCommand,
  normalizeChannel,
  generateBotReply,
  checkWarezKick,
  nickColor,
  isNickMention,
  formatIrcTime,
} from '../mircEngine';
import { helpBotAnswer } from '../mircData';

describe('parseCommand routing', () => {
  it('routes /join to a normalized channel', () => {
    expect(parseCommand('/join #chat')).toEqual({ type: 'join', channel: '#chat' });
    // bare name gets the # prefix
    expect(parseCommand('/join warez-chat')).toEqual({ type: 'join', channel: '#warez-chat' });
    // /j is an alias
    expect(parseCommand('/j #y2k')).toEqual({ type: 'join', channel: '#y2k' });
  });

  it('rejects a missing or invalid channel on /join', () => {
    expect(parseCommand('/join')).toMatchObject({ type: 'error' });
    expect(parseCommand('/join ##no spaces')).toMatchObject({ type: 'error' });
  });

  it('routes /part with and without a channel', () => {
    expect(parseCommand('/part')).toEqual({ type: 'part', channel: null });
    expect(parseCommand('/part #chat')).toEqual({ type: 'part', channel: '#chat' });
    expect(parseCommand('/leave #chat')).toEqual({ type: 'part', channel: '#chat' });
  });

  it('routes /nick and validates the nickname', () => {
    expect(parseCommand('/nick CoolGuy_99')).toEqual({ type: 'nick', nick: 'CoolGuy_99' });
    expect(parseCommand('/nick')).toMatchObject({ type: 'error' });
    expect(parseCommand('/nick 99problems')).toMatchObject({ type: 'error' }); // cannot start with a digit
  });

  it('routes /me actions', () => {
    expect(parseCommand('/me waves hello')).toEqual({ type: 'me', action: 'waves hello' });
    expect(parseCommand('/me')).toMatchObject({ type: 'error' });
  });

  it('routes /msg into a target and message', () => {
    expect(parseCommand('/msg sk8erboi hey there')).toEqual({ type: 'msg', target: 'sk8erboi', text: 'hey there' });
    expect(parseCommand('/msg lonely')).toMatchObject({ type: 'error' }); // no message body
  });

  it('routes /list, /quit and /help', () => {
    expect(parseCommand('/list')).toEqual({ type: 'list' });
    expect(parseCommand('/quit brb dinner')).toEqual({ type: 'quit', reason: 'brb dinner' });
    expect(parseCommand('/quit')).toEqual({ type: 'quit', reason: null });
    expect(parseCommand('/help')).toEqual({ type: 'help', topic: null });
    expect(parseCommand('/help /join')).toEqual({ type: 'help', topic: 'join' });
  });

  it('treats plain text as a say and flags unknown commands', () => {
    expect(parseCommand('hello everyone')).toEqual({ type: 'say', text: 'hello everyone' });
    expect(parseCommand('   ')).toEqual({ type: 'say', text: '' });
    expect(parseCommand('/frobnicate')).toMatchObject({ type: 'error' });
  });
});

describe('normalizeChannel', () => {
  it('adds a leading # only when missing', () => {
    expect(normalizeChannel('chat')).toBe('#chat');
    expect(normalizeChannel('#chat')).toBe('#chat');
    expect(normalizeChannel('  #y2k ')).toBe('#y2k');
  });
});

describe('generateBotReply', () => {
  const canned = ['a', 'b', 'c'];
  const triggers = [
    { pattern: /\bhi+\b/, replies: ['hey', 'yo'] },
    { pattern: /napster/, replies: ['napster rules'] },
  ];

  it('returns the first matching trigger reply, rotating by index', () => {
    expect(generateBotReply('hi there', { canned, triggers, index: 0 })).toBe('hey');
    expect(generateBotReply('hi there', { canned, triggers, index: 1 })).toBe('yo');
    expect(generateBotReply('got napster?', { canned, triggers, index: 5 })).toBe('napster rules');
  });

  it('falls back to rotating canned lines when nothing matches', () => {
    expect(generateBotReply('random words', { canned, triggers, index: 0 })).toBe('a');
    expect(generateBotReply('random words', { canned, triggers, index: 4 })).toBe('b');
  });

  it('returns an empty string when there is nothing to say', () => {
    expect(generateBotReply('x', { canned: [], index: 0 })).toBe('');
  });
});

describe('checkWarezKick', () => {
  const ops = ['opz', 'WaReZ_KiNg'];

  it('kicks on an a/s/l question', () => {
    expect(checkWarezKick('asl?', ops, 0)).toEqual({ by: 'opz', reason: 'asl? rly?' });
    expect(checkWarezKick('a/s/l', ops, 1)).toEqual({ by: 'WaReZ_KiNg', reason: 'asl? rly?' });
  });

  it('kicks on warez words and on begging for files', () => {
    expect(checkWarezKick('anyone got a crack for this', ops, 0)).toMatchObject({ by: 'opz' });
    expect(checkWarezKick('send me some files pls', ops, 0)).toMatchObject({ by: 'opz' });
    expect(checkWarezKick('gimme that game', ops, 0)).toMatchObject({ by: 'opz' });
  });

  it('leaves ordinary chatter alone', () => {
    expect(checkWarezKick('hey how is everyone doing', ops, 0)).toBeNull();
    expect(checkWarezKick('this channel is quiet tonight', ops, 0)).toBeNull();
  });

  it('rotates the kicking op deterministically', () => {
    expect(checkWarezKick('asl', ops, 0)?.by).toBe('opz');
    expect(checkWarezKick('asl', ops, 1)?.by).toBe('WaReZ_KiNg');
    expect(checkWarezKick('asl', ops, 2)?.by).toBe('opz');
  });
});

describe('nickColor', () => {
  it('is stable for a given nick and stays within the palette', () => {
    expect(nickColor('opz')).toBe(nickColor('opz'));
    expect(nickColor('opz')).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('isNickMention', () => {
  it('matches whole-word mentions, case-insensitively', () => {
    expect(isNickMention('hey SurfDude98 you there?', 'surfdude98')).toBe(true);
    expect(isNickMention('SurfDude98: sup', 'SurfDude98')).toBe(true);
  });

  it('does not match substrings or an empty nick', () => {
    expect(isNickMention('SurfDude987 is someone else', 'SurfDude98')).toBe(false);
    expect(isNickMention('anything', '')).toBe(false);
  });
});

describe('formatIrcTime', () => {
  it('formats a zero-padded [hh:mm] stamp', () => {
    expect(formatIrcTime(new Date(1999, 2, 14, 9, 5))).toBe('[09:05]');
    expect(formatIrcTime(new Date(1999, 2, 14, 23, 59))).toBe('[23:59]');
  });
});

describe('helpBotAnswer', () => {
  it('answers questions about known commands', () => {
    expect(helpBotAnswer('how do i join a channel?', 0)).toMatch(/\/join/);
    expect(helpBotAnswer('i want to change my nick', 0)).toMatch(/\/nick/);
    expect(helpBotAnswer('how do i send a private message', 0)).toMatch(/\/msg/);
  });

  it('falls back to a rotating nudge for anything else', () => {
    const a = helpBotAnswer('asdfqwer', 0);
    const b = helpBotAnswer('asdfqwer', 1);
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});
