import {
  createHistory,
  current,
  push,
  back,
  forward,
  canGoBack,
  canGoForward,
} from '../navHistory';

describe('navHistory', () => {
  it('starts at home with nowhere to go back to', () => {
    const h = createHistory();
    expect(current(h)).toEqual({ kind: 'home' });
    expect(canGoBack(h)).toBe(false);
    expect(canGoForward(h)).toBe(false);
  });

  it('moves forward as you follow links', () => {
    let h = createHistory();
    h = push(h, { kind: 'article', articleId: 'chess' });
    expect(current(h)).toEqual({ kind: 'article', articleId: 'chess' });
    expect(canGoBack(h)).toBe(true);
    expect(canGoForward(h)).toBe(false);
  });

  it('walks back and forward through the stack', () => {
    let h = createHistory();
    h = push(h, { kind: 'article', articleId: 'chess' });
    h = push(h, { kind: 'article', articleId: 'deep-blue' });
    h = back(h);
    expect(current(h)).toEqual({ kind: 'article', articleId: 'chess' });
    expect(canGoForward(h)).toBe(true);
    h = forward(h);
    expect(current(h)).toEqual({ kind: 'article', articleId: 'deep-blue' });
  });

  it('collapses a no-op push onto the same location', () => {
    let h = createHistory();
    h = push(h, { kind: 'article', articleId: 'chess' });
    const before = h;
    h = push(h, { kind: 'article', articleId: 'chess' });
    expect(h).toBe(before);
    expect(h.stack).toHaveLength(2);
  });

  it('truncates forward history when you branch off', () => {
    let h = createHistory();
    h = push(h, { kind: 'article', articleId: 'chess' });
    h = push(h, { kind: 'article', articleId: 'deep-blue' });
    h = back(h); // back to chess, deep-blue still ahead
    h = push(h, { kind: 'category', categoryId: 'science' }); // branch
    expect(canGoForward(h)).toBe(false);
    expect(current(h)).toEqual({ kind: 'category', categoryId: 'science' });
    h = forward(h);
    expect(current(h)).toEqual({ kind: 'category', categoryId: 'science' });
  });

  it('holds position at the ends of the stack', () => {
    let h = createHistory();
    expect(back(h)).toBe(h);
    h = push(h, { kind: 'trivia' });
    expect(forward(h)).toBe(h);
  });
});
