import {
  MISSPELLINGS,
  findMisspellings,
  suggestionsFor,
  matchCase,
  replaceFirst,
  replaceRangeInEditor,
  replaceAllInEditor,
  applySquiggles,
  stripSquiggles,
  cleanHtml,
} from '../spellcheck';

describe('spellcheck detection', () => {
  it('ships a dictionary of at least 40 misspellings', () => {
    expect(Object.keys(MISSPELLINGS).length).toBeGreaterThanOrEqual(40);
    expect(MISSPELLINGS.teh).toBe('the');
    expect(MISSPELLINGS.recieve).toBe('receive');
  });

  it('finds misspellings with their offsets in reading order', () => {
    const hits = findMisspellings('I recieve teh news');
    expect(hits.map((h) => h.key)).toEqual(['recieve', 'teh']);
    expect(hits[0].index).toBe(2);
    expect(hits[1].index).toBe(10);
  });

  it('ignores correctly spelled words', () => {
    expect(findMisspellings('the quick brown fox')).toEqual([]);
  });

  it('offers the real fix first and gags after', () => {
    const s = suggestionsFor('definately');
    expect(s[0]).toBe('definitely');
    expect(s).toContain('defiantly');
  });

  it('matches the leading case of the replaced word', () => {
    expect(matchCase('Teh', 'the')).toBe('The');
    expect(matchCase('teh', 'the')).toBe('the');
  });

  it('replaces the first whole-word occurrence in a string', () => {
    expect(replaceFirst('Teh cat and teh dog', 'teh', 'the')).toBe('The cat and teh dog');
  });
});

function editorWith(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe('spellcheck editor mutations', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('replaces a single occurrence by text offset, preserving formatting', () => {
    const el = editorWith('I <b>recieve</b> mail');
    const hit = findMisspellings(el.textContent ?? '')[0];
    replaceRangeInEditor(el, hit.index, hit.index + hit.word.length, 'receive');
    expect(el.textContent).toBe('I receive mail');
    expect(el.querySelector('b')?.textContent).toBe('receive');
  });

  it('changes every occurrence of a word', () => {
    const el = editorWith('teh cat teh dog teh bird');
    const count = replaceAllInEditor(el, 'teh', 'the');
    expect(count).toBe(3);
    expect(el.textContent).toBe('the cat the dog the bird');
  });

  it('wraps misspellings in squiggle spans and strips them back out', () => {
    const el = editorWith('a teh word');
    applySquiggles(el);
    const marks = el.querySelectorAll('[data-spell]');
    expect(marks.length).toBe(1);
    expect(marks[0].textContent).toBe('teh');

    stripSquiggles(el);
    expect(el.querySelectorAll('[data-spell]').length).toBe(0);
    expect(el.textContent).toBe('a teh word');
  });

  it('cleanHtml returns markup without squiggle wrappers', () => {
    const el = editorWith('teh end');
    applySquiggles(el);
    expect(el.querySelector('[data-spell]')).not.toBeNull();
    const clean = cleanHtml(el);
    expect(clean).not.toContain('data-spell');
    expect(clean).toContain('teh end');
  });

  it('walks and fixes the whole document like the dialog does', () => {
    const el = editorWith('teh recieve seperate');
    // simulate Change on each in turn, always taking the first suggestion
    for (let guard = 0; guard < 10; guard++) {
      const hit = findMisspellings(el.textContent ?? '')[0];
      if (!hit) break;
      replaceRangeInEditor(el, hit.index, hit.index + hit.word.length, matchCase(hit.word, hit.suggestions[0]));
    }
    expect(findMisspellings(el.textContent ?? '')).toEqual([]);
    expect(el.textContent).toBe('the receive separate');
  });
});
