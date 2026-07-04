import { wrapSelection, wrapBlock, ensureHtmlExtension, buildPath, geocitiesSlug } from '../frontpageHelpers';

describe('geocitiesSlug', () => {
  it('lowercases and strips everything but letters and digits', () => {
    expect(geocitiesSlug('Surf Dude 98')).toBe('surfdude98');
    expect(geocitiesSlug('Dave!!!')).toBe('dave');
  });
  it('falls back to "user" when nothing usable remains', () => {
    expect(geocitiesSlug('   ')).toBe('user');
    expect(geocitiesSlug('***')).toBe('user');
  });
});

describe('wrapSelection', () => {
  it('wraps a selected range and reports the selection around the wrapped text', () => {
    const result = wrapSelection('hello world', 0, 5, '<b>', '</b>');
    expect(result.text).toBe('<b>hello</b> world');
    expect(result.selStart).toBe(3);
    expect(result.selEnd).toBe(8);
  });

  it('handles an empty selection by dropping the caret between the tags', () => {
    const result = wrapSelection('hello world', 5, 5, '<b>', '</b>');
    expect(result.text).toBe('hello<b></b> world');
    expect(result.selStart).toBe(8);
    expect(result.selEnd).toBe(8);
  });

  it('handles a selection at the very start of the text', () => {
    const result = wrapSelection('hello', 0, 0, '<i>', '</i>');
    expect(result.text).toBe('<i></i>hello');
    expect(result.selStart).toBe(3);
    expect(result.selEnd).toBe(3);
  });

  it('handles a selection at the very end of the text', () => {
    const result = wrapSelection('hello', 5, 5, '<u>', '</u>');
    expect(result.text).toBe('hello<u></u>');
    expect(result.selStart).toBe(8);
    expect(result.selEnd).toBe(8);
  });

  it('wraps the entire string when fully selected', () => {
    const result = wrapSelection('hello', 0, 5, '<b>', '</b>');
    expect(result.text).toBe('<b>hello</b>');
    expect(result.selStart).toBe(3);
    expect(result.selEnd).toBe(8);
  });
});

describe('wrapBlock', () => {
  it('wraps a plain line in the requested block tag', () => {
    const result = wrapBlock('Title here', 0, 4, 'h1');
    expect(result.text).toBe('<h1>Title here</h1>');
  });

  it('replaces an existing block tag rather than nesting', () => {
    const result = wrapBlock('<h1>Title here</h1>', 4, 8, 'h2');
    expect(result.text).toBe('<h2>Title here</h2>');
  });

  it('only touches the line containing the selection in a multi-line document', () => {
    const doc = 'First line\nSecond line\nThird line';
    const start = doc.indexOf('Second');
    const result = wrapBlock(doc, start, start + 6, 'p');
    expect(result.text).toBe('First line\n<p>Second line</p>\nThird line');
  });

  it('wraps the last line of a document with no trailing newline', () => {
    const doc = 'First line\nLast line';
    const start = doc.indexOf('Last');
    const result = wrapBlock(doc, start, start, 'h3');
    expect(result.text).toBe('First line\n<h3>Last line</h3>');
  });
});

describe('ensureHtmlExtension', () => {
  it('appends .htm when no extension is present', () => {
    expect(ensureHtmlExtension('index')).toBe('index.htm');
  });

  it('leaves an existing .htm extension alone', () => {
    expect(ensureHtmlExtension('index.htm')).toBe('index.htm');
  });

  it('leaves an existing .html extension alone', () => {
    expect(ensureHtmlExtension('page.html')).toBe('page.html');
  });

  it('trims surrounding whitespace before checking', () => {
    expect(ensureHtmlExtension('  page  ')).toBe('page.htm');
  });
});

describe('buildPath', () => {
  it('joins a directory and filename with a backslash', () => {
    expect(buildPath('C:\\My Documents', 'index.htm')).toBe('C:\\My Documents\\index.htm');
  });

  it('does not double up a trailing backslash on the directory', () => {
    expect(buildPath('C:\\My Documents\\', 'index.htm')).toBe('C:\\My Documents\\index.htm');
  });
});
