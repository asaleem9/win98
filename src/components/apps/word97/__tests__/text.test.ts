import { countWords, countCharacters, countCharactersNoSpaces, countParagraphs, documentStats } from '../text';

describe('text stats', () => {
  it('counts words, ignoring leading/trailing/collapsed whitespace', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('hello')).toBe(1);
    expect(countWords('  the quick   brown fox ')).toBe(4);
  });

  it('counts characters with and without spaces', () => {
    expect(countCharacters('a b c')).toBe(5);
    expect(countCharactersNoSpaces('a b c')).toBe(3);
  });

  it('counts paragraphs by non-blank lines', () => {
    expect(countParagraphs('')).toBe(0);
    expect(countParagraphs('one line')).toBe(1);
    expect(countParagraphs('first\n\nsecond\n\n\nthird')).toBe(3);
  });

  it('bundles everything into documentStats', () => {
    expect(documentStats('The cat sat')).toEqual({
      words: 3,
      characters: 11,
      charactersNoSpaces: 9,
      paragraphs: 1,
    });
  });
});
