// Content-aware Office Assistant logic. The detection is a pure function of the
// document text plus the set of triggers already fired this session, so the
// component only has to debounce input and render whatever offer comes back.

import { countWords } from './text';

export type ClippyTriggerId = 'letter' | 'resume' | 'clippy-ego' | 'wordcount';

export type ClippyButtonId = 'insert-letter' | 'dismiss';

export interface ClippyButton {
  id: ClippyButtonId;
  label: string;
}

export interface ClippyOffer {
  id: ClippyTriggerId;
  message: string;
  buttons: ClippyButton[];
}

/** Save reminder fires once the document crosses this many words. */
export const WORD_COUNT_REMINDER_THRESHOLD = 200;

/**
 * Decide which assistant offer, if any, the current text warrants. Triggers that
 * already fired this session are skipped so the paperclip nags at most once each.
 * Letter intent wins over the others; the word-count reminder is last so a real
 * document doesn't get interrupted mid-thought.
 */
export function detectClippyTrigger(
  text: string,
  fired: ReadonlySet<ClippyTriggerId>,
): ClippyTriggerId | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (!fired.has('letter') && /^dear\b/i.test(trimmed)) return 'letter';

  if (
    !fired.has('resume') &&
    (/\bresum[eé]s?\b/i.test(text) || /\bc\.?v\.?\b/i.test(text) || /curriculum vitae/i.test(text))
  ) {
    return 'resume';
  }

  if (!fired.has('clippy-ego') && /\bclippy\b/i.test(text)) return 'clippy-ego';

  if (!fired.has('wordcount') && countWords(text) > WORD_COUNT_REMINDER_THRESHOLD) return 'wordcount';

  return null;
}

export const CLIPPY_OFFERS: Record<ClippyTriggerId, ClippyOffer> = {
  letter: {
    id: 'letter',
    message: "It looks like you're writing a letter. Would you like help?",
    buttons: [
      { id: 'insert-letter', label: 'Get help with writing the letter' },
      { id: 'dismiss', label: 'Just type the letter without help' },
    ],
  },
  resume: {
    id: 'resume',
    message:
      "It looks like you're writing a resume. Employers only skim, so keep it to one page and lead with your strongest accomplishments.",
    buttons: [{ id: 'dismiss', label: 'OK' }],
  },
  'clippy-ego': {
    id: 'clippy-ego',
    message:
      'I saw that. You typed my name. I have feelings too, you know — some of us were retired for a lot less.',
    buttons: [{ id: 'dismiss', label: 'Sorry, Clippy' }],
  },
  wordcount: {
    id: 'wordcount',
    message: "You've written quite a bit here. This might be a good moment to save your work (Ctrl+S).",
    buttons: [{ id: 'dismiss', label: 'OK' }],
  },
};

/** Boilerplate block letter dropped in when the user accepts the letter offer. */
export const LETTER_TEMPLATE_HTML = [
  '<div>[Your Name]</div>',
  '<div>[Street Address]</div>',
  '<div>[City, ST&nbsp; ZIP Code]</div>',
  '<div><br></div>',
  '<div>[Date]</div>',
  '<div><br></div>',
  '<div>[Recipient Name]</div>',
  '<div>[Title]</div>',
  '<div>[Company Name]</div>',
  '<div>[Street Address]</div>',
  '<div><br></div>',
  '<div>Dear [Recipient]:</div>',
  '<div><br></div>',
  '<div>[Type the body of your letter here.]</div>',
  '<div><br></div>',
  '<div>Sincerely,</div>',
  '<div><br></div>',
  '<div><br></div>',
  '<div>[Your Name]</div>',
].join('');
