import { clampMarker, computeIndents, nextTabStop, toggleTabStop, DEFAULT_TAB_PX } from '../ruler';

describe('clampMarker', () => {
  it('keeps values within bounds', () => {
    expect(clampMarker(50, 0, 100)).toBe(50);
    expect(clampMarker(-10, 0, 100)).toBe(0);
    expect(clampMarker(150, 0, 100)).toBe(100);
  });

  it('falls back to the minimum for NaN', () => {
    expect(clampMarker(Number.NaN, 5, 100)).toBe(5);
  });
});

describe('computeIndents', () => {
  it('maps marker positions to editor padding and indent', () => {
    const style = computeIndents({ rulerWidth: 600, leftPx: 48, rightPx: 552, firstLinePx: 72 });
    expect(style.paddingLeft).toBe(48);
    expect(style.paddingRight).toBe(48); // 600 - 552
    expect(style.textIndent).toBe(24); // 72 - 48
  });

  it('supports a hanging indent (first line left of the margin)', () => {
    const style = computeIndents({ rulerWidth: 600, leftPx: 96, rightPx: 600, firstLinePx: 48 });
    expect(style.textIndent).toBe(-48);
  });

  it('never produces negative padding', () => {
    const style = computeIndents({ rulerWidth: 600, leftPx: -20, rightPx: 700, firstLinePx: 0 });
    expect(style.paddingLeft).toBe(0);
    expect(style.paddingRight).toBe(0);
  });
});

describe('nextTabStop', () => {
  it('walks the default grid when no custom stops are set', () => {
    expect(nextTabStop(0, [])).toBe(DEFAULT_TAB_PX);
    expect(nextTabStop(10, [])).toBe(DEFAULT_TAB_PX);
    expect(nextTabStop(DEFAULT_TAB_PX, [])).toBe(DEFAULT_TAB_PX * 2);
  });

  it('prefers the next custom stop to the right of the caret', () => {
    expect(nextTabStop(10, [48, 96])).toBe(48);
    expect(nextTabStop(50, [48, 96])).toBe(96);
  });

  it('continues the default grid past the last custom stop', () => {
    expect(nextTabStop(100, [48, 96])).toBe(96 + DEFAULT_TAB_PX);
  });
});

describe('toggleTabStop', () => {
  it('adds a stop and keeps the list sorted', () => {
    expect(toggleTabStop([96], 48)).toEqual([48, 96]);
  });

  it('removes a stop when clicking near an existing one', () => {
    expect(toggleTabStop([48, 96], 50)).toEqual([96]);
  });
});
