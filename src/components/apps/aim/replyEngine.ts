// Canned-response engine for AIM buddies. Kept pure (no Date.now / Math.random)
// so it is deterministic and unit-testable: given the same input + rotation
// index it always returns the same reply.

const STOPWORDS = new Set([
  'about', 'there', 'their', 'would', 'could', 'should', 'because', 'really',
  'thing', 'stuff', 'gonna', 'wanna', 'yeah', 'okay', 'right', 'thats', 'youre',
  'dont', 'cant', 'know', 'like', 'just', 'this', 'that', 'what', 'when', 'with',
  'have', 'your',
]);

export interface ReplyContext {
  /** The buddy's screen name (used for name questions / echoes). */
  buddyName: string;
  /** Per-buddy canned lines to rotate through when nothing else matches. */
  canned: string[];
  /** Rotation counter — pass a different value each turn for variety. */
  index: number;
}

/** Emoticon → emoji map, applied when rendering message text. */
const EMOTICONS: [RegExp, string][] = [
  [/:-?\)/g, '🙂'],
  [/:-?D/g, '😃'],
  [/:-?\(/g, '🙁'],
  [/;-?\)/g, '😉'],
  [/:-?P/gi, '😛'],
  [/:-?O/gi, '😮'],
  [/<3/g, '❤️'],
  [/:'\(/g, '😢'],
  [/XD/g, '😆'],
  [/B-?\)/g, '😎'],
];

export function renderEmoticons(text: string): string {
  let out = text;
  for (const [re, emoji] of EMOTICONS) out = out.replace(re, emoji);
  return out;
}

function longestMeaningfulWord(clean: string): string | null {
  const words = clean.split(/\s+/).filter((w) => w.length > 4 && !STOPWORDS.has(w));
  if (!words.length) return null;
  return words.reduce((a, b) => (b.length > a.length ? b : a));
}

/**
 * Produce a buddy reply that reacts to the user's actual message when it can
 * (name/age/asl questions, laughter, greetings, echoes), and otherwise falls
 * back to the rotating canned lines.
 */
export function generateReply(userText: string, ctx: ReplyContext): string {
  const { buddyName, canned, index } = ctx;
  const t = userText.toLowerCase().trim();
  const clean = t.replace(/[^a-z0-9\s/]/g, ' ').replace(/\s+/g, ' ').trim();

  // Direct questions about identity
  if (/(what'?s? ?(is )?your name|whats? ur name|who are you|your name|ur name)/.test(t)) {
    return `lol its ${buddyName}, u already know that :P`;
  }
  if (/\ba\s?\/\s?s\s?\/\s?l\b|\basl\b|\ba\/s\/l\b/.test(t)) {
    return 'a/s/l? lol im 15/f/cali... how bout u?';
  }
  if (/(how old (are|r) (you|u)|your age|ur age|age\?)/.test(t) || /\bage\b/.test(clean)) {
    return 'im 15 lol how old r u??';
  }

  // Reactions
  if (/(lol|lmao|rofl|rotfl|haha+|hehe+|lmfao)/.test(t)) {
    return 'lolol i know right?? XD';
  }
  if (/(thanks|thank u|thank you|thx|ty)\b/.test(clean)) {
    return 'no problem :) anytime';
  }
  if (/\b(g2g|gtg|bye+|cya|ttyl|goodbye|good night|gnight)\b/.test(clean)) {
    return 'aww ok :( ttyl!! <3';
  }
  if (/\b(hey+|hi+|hello+|yo+|sup|whats up|wassup|heya|howdy)\b/.test(clean)) {
    return 'heyyy!! whats up :)';
  }
  if (/\b(i love|ur cool|youre cool|ur awesome|ur the best|miss u)\b/.test(clean)) {
    return 'awww ur so sweet :) <3';
  }

  const isQuestion =
    t.endsWith('?') ||
    /^(is|are|do|does|did|can|will|would|should|have|has|was|were|who|what|when|where|why|how|which)\b/.test(clean);

  // Echo a meaningful word back sometimes so replies feel like they read you.
  const echoWord = longestMeaningfulWord(clean);
  if (echoWord && index % 2 === 0) {
    return isQuestion
      ? `hmm idk about ${echoWord}... what do u think??`
      : `ooh ${echoWord}? thats so cool!!`;
  }

  if (isQuestion) {
    return 'hmm good question lol... idk';
  }

  // Fall back to the rotating canned lines.
  return canned.length ? canned[index % canned.length] : 'lol';
}
