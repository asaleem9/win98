// Plain-text statistics shared by the word-count dialog, the status bar, and the
// content-aware Office Assistant. Kept free of DOM access so it can be unit
// tested and reused against either `textContent` or a raw string.

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function countCharacters(text: string): number {
  return text.length;
}

export function countCharactersNoSpaces(text: string): number {
  return text.replace(/\s/g, '').length;
}

/** Paragraph count from visible text — a run of blank lines counts as one break. */
export function countParagraphs(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\n+/).filter((p) => p.trim().length > 0).length;
}

export interface DocStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
}

export function documentStats(text: string): DocStats {
  return {
    words: countWords(text),
    characters: countCharacters(text),
    charactersNoSpaces: countCharactersNoSpaces(text),
    paragraphs: countParagraphs(text),
  };
}
