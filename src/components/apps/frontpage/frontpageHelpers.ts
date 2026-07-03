// Pure text-manipulation helpers for the FrontPage HTML source editor.
// Kept free of React/DOM so they're easy to unit test in isolation.

export interface SelectionResult {
  text: string;
  selStart: number;
  selEnd: number;
}

/** Wraps the selected range in `text` with open/close tags, placing the
 * caret/selection back around the (now-wrapped) content. */
export function wrapSelection(
  text: string,
  start: number,
  end: number,
  openTag: string,
  closeTag: string,
): SelectionResult {
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);
  const next = `${before}${openTag}${selected}${closeTag}${after}`;

  if (start === end) {
    // Nothing selected — drop the caret between the tags so typing continues inline.
    const caret = start + openTag.length;
    return { text: next, selStart: caret, selEnd: caret };
  }

  return {
    text: next,
    selStart: start + openTag.length,
    selEnd: start + openTag.length + selected.length,
  };
}

export type BlockTag = 'p' | 'h1' | 'h2' | 'h3';

/** Wraps the line(s) touched by the selection in a block-level tag (p/h1/h2/h3),
 * stripping any existing block tag that already wraps that same span. */
export function wrapBlock(text: string, start: number, end: number, tag: BlockTag): SelectionResult {
  // Expand the range to cover full lines so block wrapping feels natural.
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const lineEndRaw = text.indexOf('\n', end);
  const lineEnd = lineEndRaw === -1 ? text.length : lineEndRaw;

  const before = text.slice(0, lineStart);
  const line = text.slice(lineStart, lineEnd);
  const after = text.slice(lineEnd);

  // Strip an existing block wrapper if the line is already one, e.g. <h1>Title</h1>.
  const existing = line.match(/^\s*<(p|h1|h2|h3)>([\s\S]*)<\/\1>\s*$/i);
  const inner = existing ? existing[2] : line;

  const wrapped = `<${tag}>${inner}</${tag}>`;
  const next = `${before}${wrapped}${after}`;

  const selStart = lineStart + tag.length + 2;
  const selEnd = selStart + inner.length;

  return { text: next, selStart, selEnd };
}

/** Ensures a filename ends in .htm or .html; appends .htm if no htm(l) extension is present. */
export function ensureHtmlExtension(name: string): string {
  const trimmed = name.trim();
  if (/\.(html?|HTML?)$/i.test(trimmed)) return trimmed;
  return `${trimmed}.htm`;
}

/** Joins a directory path and filename using the app's backslash path convention. */
export function buildPath(dir: string, name: string): string {
  const cleanDir = dir.replace(/\\+$/, '');
  return `${cleanDir}\\${name}`;
}
