import {
  paginateText,
  stripHtml,
  countPages,
  renderJobPages,
  COLS,
  ROWS,
} from '../pageRenderer';

describe('paginateText', () => {
  it('keeps short multi-line text on a single page', () => {
    const pages = paginateText('line one\nline two\nline three', COLS, ROWS);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual(['line one', 'line two', 'line three']);
  });

  it('is deterministic for the same input', () => {
    const text = Array.from({ length: 130 }, (_, i) => `row ${i}`).join('\n');
    expect(paginateText(text, COLS, ROWS)).toEqual(paginateText(text, COLS, ROWS));
  });

  it('paginates by the row count', () => {
    const text = Array.from({ length: 120 }, () => 'x').join('\n');
    const pages = paginateText(text, COLS, ROWS);
    expect(pages).toHaveLength(Math.ceil(120 / ROWS)); // 3
    expect(pages[0]).toHaveLength(ROWS);
  });

  it('wraps a long line to the column width', () => {
    const long = 'y'.repeat(200);
    const pages = paginateText(long, 80, ROWS);
    expect(pages[0]).toHaveLength(3); // 80 + 80 + 40
    expect(pages[0][0]).toHaveLength(80);
  });

  it('word-wraps on spaces rather than mid-word', () => {
    const pages = paginateText('the quick brown fox jumps', 12, ROWS);
    expect(pages[0]).toEqual(['the quick', 'brown fox', 'jumps']);
  });

  it('always returns at least one page for empty text', () => {
    const pages = paginateText('', COLS, ROWS);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual(['']);
  });
});

describe('stripHtml', () => {
  it('turns block/break tags into newlines and drops the rest', () => {
    expect(stripHtml('<b>Hi</b><br>there')).toBe('Hi\nthere');
    expect(stripHtml('<p>one</p><p>two</p>')).toBe('one\ntwo');
  });

  it('decodes the common entities', () => {
    expect(stripHtml('a&nbsp;&amp;&lt;b&gt;')).toBe('a &<b>');
  });
});

describe('countPages', () => {
  it('counts text pages by pagination', () => {
    const text = Array.from({ length: 120 }, () => 'x').join('\n');
    expect(countPages({ kind: 'text', text })).toBe(3);
  });

  it('counts an image as a single page', () => {
    expect(countPages({ kind: 'image', dataUrl: 'data:image/png;base64,AA' })).toBe(1);
  });

  it('counts html by its stripped text', () => {
    expect(countPages({ kind: 'html', html: '<p>a</p><p>b</p>' })).toBe(1);
  });
});

describe('renderJobPages', () => {
  it('returns one entry per text page even without a canvas backend', async () => {
    const text = Array.from({ length: 120 }, () => 'x').join('\n');
    const urls = await renderJobPages({ documentName: 'Doc', content: { kind: 'text', text } });
    expect(urls).toHaveLength(3);
  });
});
