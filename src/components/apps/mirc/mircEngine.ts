// Pure, deterministic logic for the mIRC client: slash-command parsing, bot
// replies, the #warez-chat kick rule, nick coloring, mention detection, and
// timestamp formatting. No Date.now / Math.random in here (callers pass a
// rotation index and a Date), so every branch is unit-testable.

export type ParsedCommand =
  | { type: 'join'; channel: string }
  | { type: 'part'; channel: string | null }
  | { type: 'nick'; nick: string }
  | { type: 'me'; action: string }
  | { type: 'msg'; target: string; text: string }
  | { type: 'list' }
  | { type: 'quit'; reason: string | null }
  | { type: 'help'; topic: string | null }
  | { type: 'say'; text: string }
  | { type: 'error'; message: string };

const VALID_CHANNEL = /^#[a-z0-9_.-]{1,30}$/i;
const VALID_NICK = /^[a-z_][a-z0-9_-]{0,15}$/i;

/** Prefix a bare channel name with '#'. Leaves an already-prefixed name alone. */
export function normalizeChannel(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

/**
 * Turn a line of user input into a command. Anything not starting with '/' is a
 * plain 'say' to the active window. Unknown or malformed slash commands come
 * back as 'error' with the message the status window should print.
 */
export function parseCommand(input: string): ParsedCommand {
  const text = input.trim();
  if (!text) return { type: 'say', text: '' };
  if (!text.startsWith('/')) return { type: 'say', text };

  const spaceIdx = text.indexOf(' ');
  const cmd = (spaceIdx === -1 ? text.slice(1) : text.slice(1, spaceIdx)).toLowerCase();
  const rest = spaceIdx === -1 ? '' : text.slice(spaceIdx + 1).trim();

  switch (cmd) {
    case 'join':
    case 'j': {
      if (!rest) return { type: 'error', message: '* /join: you must supply a channel name (try /join #chat)' };
      const channel = normalizeChannel(rest.split(/\s+/)[0]);
      if (!VALID_CHANNEL.test(channel)) return { type: 'error', message: `* ${rest} is not a valid channel name` };
      return { type: 'join', channel };
    }
    case 'part':
    case 'leave': {
      const channel = rest ? normalizeChannel(rest.split(/\s+/)[0]) : null;
      if (channel && !VALID_CHANNEL.test(channel)) return { type: 'error', message: `* ${rest} is not a valid channel name` };
      return { type: 'part', channel };
    }
    case 'nick': {
      if (!rest) return { type: 'error', message: '* /nick: you must supply a nickname' };
      const nick = rest.split(/\s+/)[0];
      if (!VALID_NICK.test(nick)) return { type: 'error', message: `* ${nick} is not a valid nickname` };
      return { type: 'nick', nick };
    }
    case 'me': {
      if (!rest) return { type: 'error', message: '* /me: you must supply an action' };
      return { type: 'me', action: rest };
    }
    case 'msg':
    case 'query': {
      const m = rest.match(/^(\S+)\s+([\s\S]+)$/);
      if (!m) return { type: 'error', message: '* /msg: usage is /msg <nick> <message>' };
      return { type: 'msg', target: m[1], text: m[2] };
    }
    case 'list':
      return { type: 'list' };
    case 'quit':
    case 'exit':
      return { type: 'quit', reason: rest || null };
    case 'help':
    case '?':
      return { type: 'help', topic: rest ? rest.replace(/^\//, '').toLowerCase() : null };
    default:
      return { type: 'error', message: `* /${cmd} is an unknown command. Type /help for a list.` };
  }
}

// --- bot replies ------------------------------------------------------------

export interface BotTrigger {
  pattern: RegExp;
  replies: string[];
}

export interface BotReplyContext {
  /** Per-channel fallback lines rotated through when no trigger matches. */
  canned: string[];
  /** Optional keyword triggers checked in order before falling back. */
  triggers?: BotTrigger[];
  /** Rotation counter — pass a different value each turn for variety. */
  index: number;
}

/**
 * Produce a bot's reply to a user message: the first matching trigger wins,
 * otherwise a rotating canned line. Mirrors the AIM reply-engine approach but
 * with IRC-flavored, per-channel content.
 */
export function generateBotReply(userText: string, ctx: BotReplyContext): string {
  const t = userText.toLowerCase();
  if (ctx.triggers) {
    for (const trig of ctx.triggers) {
      if (trig.pattern.test(t)) return trig.replies[ctx.index % trig.replies.length];
    }
  }
  return ctx.canned.length ? ctx.canned[ctx.index % ctx.canned.length] : '';
}

// --- #warez-chat kick rule --------------------------------------------------

const ASL_ASK = /\ba\s*\/?\s*s\s*\/?\s*l\b/i;
const WAREZ_WORDS = /\b(warez|serial|serialz|crack|cracks|keygen|leech|leecher|iso|nocd|no-cd)\b/i;
const REQUEST_VERB = /\b(send|sub|gimme|give|share|got|get|need|want|lookin['g]?|link|pls|plz|please|dcc|hook)\b/i;
const FILE_NOUN = /\b(file|filez|files|game|games|mp3|mp3s|movie|copy|it|that|some|any|program|app|apps)\b/i;

export interface WarezKick {
  by: string;
  reason: string;
}

/**
 * Decide whether a message in #warez-chat gets you kicked. Asking your ASL, name-
 * dropping warez words, or pairing a request verb with a file noun ("send me
 * that game") all trip it. Returns null when the message is fine. The op name is
 * chosen deterministically from `ops` by `index`.
 */
export function checkWarezKick(userText: string, ops: string[], index: number): WarezKick | null {
  const t = userText.toLowerCase();
  const by = ops.length ? ops[index % ops.length] : 'opz';
  if (ASL_ASK.test(t)) return { by, reason: 'asl? rly?' };
  if (WAREZ_WORDS.test(t)) return { by, reason: 'no trading in main. read the topic.' };
  if (REQUEST_VERB.test(t) && FILE_NOUN.test(t)) return { by, reason: 'no leeching. /msg an op, dont beg.' };
  return null;
}

// --- nicks ------------------------------------------------------------------

// Readable-on-white palette, in the spirit of mIRC's auto nick coloring.
const NICK_COLORS = [
  '#c00000', '#0000b0', '#007000', '#900090', '#008080',
  '#b05000', '#a000a0', '#505050', '#0060c0', '#806000',
];

/** Stable color for a nick, so a given name always renders the same hue. */
export function nickColor(nick: string): string {
  let h = 0;
  for (let i = 0; i < nick.length; i++) h = (Math.imul(h, 31) + nick.charCodeAt(i)) >>> 0;
  return NICK_COLORS[h % NICK_COLORS.length];
}

/** True when `text` mentions `nick` as a whole word (used for the mention beep). */
export function isNickMention(text: string, nick: string): boolean {
  if (!nick) return false;
  const esc = nick.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9_])${esc}([^a-z0-9_]|$)`, 'i').test(text);
}

/** mIRC-style [hh:mm] timestamp for a given moment. */
export function formatIrcTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `[${h}:${m}]`;
}
