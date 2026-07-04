// A deliberately small spell checker: a lookup table of the classic misspellings
// plus a few gag "suggestions" for period flavor. Detection and text math are
// pure; the DOM helpers take the editor root so they can run against a real
// contentEditable in the browser and against jsdom in tests.

export const MISSPELLINGS: Record<string, string> = {
  teh: 'the',
  recieve: 'receive',
  seperate: 'separate',
  definately: 'definitely',
  occured: 'occurred',
  occurence: 'occurrence',
  untill: 'until',
  wich: 'which',
  thier: 'their',
  alot: 'a lot',
  becuase: 'because',
  freind: 'friend',
  beleive: 'believe',
  acheive: 'achieve',
  adress: 'address',
  arguement: 'argument',
  calender: 'calendar',
  cemetary: 'cemetery',
  collegue: 'colleague',
  embarass: 'embarrass',
  enviroment: 'environment',
  existance: 'existence',
  goverment: 'government',
  grammer: 'grammar',
  harrass: 'harass',
  independant: 'independent',
  knowlege: 'knowledge',
  liason: 'liaison',
  maintainance: 'maintenance',
  neccessary: 'necessary',
  noticable: 'noticeable',
  occassion: 'occasion',
  priviledge: 'privilege',
  publically: 'publicly',
  recomend: 'recommend',
  rythm: 'rhythm',
  succesful: 'successful',
  tommorow: 'tomorrow',
  truely: 'truly',
  wierd: 'weird',
  accomodate: 'accommodate',
  begining: 'beginning',
  writeing: 'writing',
};

/** Extra "helpful" suggestions the assistant volunteers next to the real fix. */
export const GAG_SUGGESTIONS: Record<string, string[]> = {
  teh: ['ten', 'tea'],
  definately: ['defiantly', 'defiance'],
  alot: ['allot', 'aloft'],
  freind: ['fiend'],
  wierd: ['wired'],
  becuase: ['bccause'],
};

const WORD_RE = /[A-Za-z][A-Za-z']*/g;

export interface Misspelling {
  /** The word exactly as it appears in the text. */
  word: string;
  /** Lowercased dictionary key. */
  key: string;
  /** Character offset into the source text. */
  index: number;
  /** Ordered suggestions; the real correction first, gags after. */
  suggestions: string[];
}

export function suggestionsFor(key: string): string[] {
  const primary = MISSPELLINGS[key];
  const gags = GAG_SUGGESTIONS[key] ?? [];
  return primary ? [primary, ...gags] : gags;
}

/** All dictionary misspellings in `text`, in reading order. */
export function findMisspellings(text: string): Misspelling[] {
  const out: Misspelling[] = [];
  WORD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WORD_RE.exec(text)) !== null) {
    const word = m[0];
    const key = word.toLowerCase().replace(/'/g, '');
    if (MISSPELLINGS[key]) {
      out.push({ word, key, index: m.index, suggestions: suggestionsFor(key) });
    }
  }
  return out;
}

/** Match the replacement's leading case to the word it replaces. */
export function matchCase(sample: string, replacement: string): string {
  const first = sample.charAt(0);
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/** Pure string replace of the first whole-word occurrence of `key`. */
export function replaceFirst(text: string, key: string, replacement: string): string {
  const re = new RegExp(`\\b${key}\\b`, 'i');
  return text.replace(re, (m0) => matchCase(m0, replacement));
}

// --- DOM helpers (browser + jsdom) ----------------------------------------

const SQUIGGLE_STYLE = 'text-decoration: red wavy underline; text-decoration-skip-ink: none;';

function textNodesOf(root: HTMLElement): Text[] {
  if (typeof document === 'undefined') return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode()) !== null) nodes.push(n as Text);
  return nodes;
}

/**
 * Replace the text between two absolute `textContent` offsets. Returns false if
 * the range spans multiple text nodes (a word broken across inline formatting),
 * which the caller can safely treat as "leave it alone".
 */
export function replaceRangeInEditor(
  root: HTMLElement,
  start: number,
  end: number,
  replacement: string,
): boolean {
  let pos = 0;
  for (const node of textNodesOf(root)) {
    const len = node.nodeValue?.length ?? 0;
    if (start >= pos && end <= pos + len) {
      const s = start - pos;
      const e = end - pos;
      const value = node.nodeValue ?? '';
      node.nodeValue = value.slice(0, s) + replacement + value.slice(e);
      return true;
    }
    pos += len;
  }
  return false;
}

/** Replace every occurrence of `key` with `replacement`, right-to-left so the
 *  earlier offsets stay valid as the text shifts. */
export function replaceAllInEditor(root: HTMLElement, key: string, replacement: string): number {
  const hits = findMisspellings(root.textContent ?? '').filter((m) => m.key === key);
  for (let i = hits.length - 1; i >= 0; i--) {
    replaceRangeInEditor(root, hits[i].index, hits[i].index + hits[i].word.length, matchCase(hits[i].word, replacement));
  }
  return hits.length;
}

/** Remove every squiggle wrapper, merging the text back into place. */
export function stripSquiggles(root: HTMLElement): void {
  const marks = root.querySelectorAll('[data-spell]');
  marks.forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });
  root.normalize();
}

/**
 * Wrap misspelled words in red-squiggle spans. Meant to run while the editor is
 * NOT focused (on blur / idle) so it never disturbs the caret — see the note in
 * Word97 about not fighting contentEditable.
 */
export function applySquiggles(root: HTMLElement): void {
  stripSquiggles(root);
  const targets = textNodesOf(root).filter(
    (t) => !(t.parentElement && t.parentElement.closest('[data-spell]')) && findMisspellings(t.nodeValue ?? '').length > 0,
  );
  for (const node of targets) {
    const text = node.nodeValue ?? '';
    const spells = findMisspellings(text);
    if (spells.length === 0) continue;
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const sp of spells) {
      if (sp.index > last) frag.appendChild(document.createTextNode(text.slice(last, sp.index)));
      const span = document.createElement('span');
      span.setAttribute('data-spell', '1');
      span.setAttribute('style', SQUIGGLE_STYLE);
      span.textContent = sp.word;
      frag.appendChild(span);
      last = sp.index + sp.word.length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode?.replaceChild(frag, node);
  }
}

/** innerHTML with squiggle wrappers removed, for saving/printing. */
export function cleanHtml(root: HTMLElement): string {
  if (typeof document === 'undefined') return root.innerHTML;
  const clone = root.cloneNode(true) as HTMLElement;
  stripSquiggles(clone);
  return clone.innerHTML;
}
