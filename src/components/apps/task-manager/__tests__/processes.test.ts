import {
  exeNameForApp,
  wiggleValue,
  buildProcessList,
  totalCpu,
  totalMemKB,
  isSystemProcessName,
  SYSTEM_PROCESSES,
  pidFromString,
} from '../processes';

describe('exeNameForApp', () => {
  it('maps known app ids to plausible exe names', () => {
    expect(exeNameForApp('explorer')).toBe('EXPLORER.EXE');
    expect(exeNameForApp('notepad')).toBe('NOTEPAD.EXE');
    expect(exeNameForApp('winamp')).toBe('WINAMP.EXE');
  });

  it('falls back to a generated .EXE name for unknown app ids', () => {
    expect(exeNameForApp('totally-unknown-app')).toBe('TOTALLYUNKNOWNAPP.EXE');
  });
});

describe('pidFromString', () => {
  it('is stable for the same input', () => {
    expect(pidFromString('window-1')).toBe(pidFromString('window-1'));
  });

  it('stays within the fake pid range', () => {
    const pid = pidFromString('some-window-id');
    expect(pid).toBeGreaterThanOrEqual(1100);
    expect(pid).toBeLessThan(10000);
  });
});

describe('wiggleValue', () => {
  it('stays within bounds across many iterations', () => {
    let value = 50;
    for (let i = 0; i < 500; i++) {
      value = wiggleValue(value, 0, 100, 20);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});

describe('buildProcessList', () => {
  it('includes one row per window plus every static system process', () => {
    const windows = [
      { id: 'w1', appId: 'notepad', title: 'Untitled - Notepad' },
      { id: 'w2', appId: 'explorer', title: 'My Computer' },
    ];
    const rows = buildProcessList(windows, []);
    expect(rows.filter((r) => r.isWindow)).toHaveLength(2);
    expect(rows.filter((r) => !r.isWindow)).toHaveLength(SYSTEM_PROCESSES.length);
    expect(rows.find((r) => r.windowId === 'w1')?.name).toBe('NOTEPAD.EXE');
  });

  it('keeps the same pid for a window across ticks', () => {
    const windows = [{ id: 'w1', appId: 'notepad', title: 'Untitled - Notepad' }];
    const first = buildProcessList(windows, []);
    const second = buildProcessList(windows, first);
    expect(second[0].pid).toBe(first[0].pid);
  });

  it('wiggles mem/cpu from the previous tick rather than resetting', () => {
    const windows = [{ id: 'w1', appId: 'notepad', title: 'Untitled - Notepad' }];
    const first = buildProcessList(windows, []);
    const second = buildProcessList(windows, first);
    // Should be close to the previous value, not a brand new random baseline
    expect(Math.abs(second[0].mem - first[0].mem)).toBeLessThan(600);
  });
});

describe('isSystemProcessName', () => {
  it('recognizes static system processes', () => {
    expect(isSystemProcessName('KERNEL32.DLL')).toBe(true);
    expect(isSystemProcessName('NOTEPAD.EXE')).toBe(false);
  });
});

describe('totals', () => {
  it('produces a cpu percentage within 0-100 and a positive mem total', () => {
    const rows = buildProcessList([], []);
    expect(totalCpu(rows)).toBeGreaterThanOrEqual(0);
    expect(totalCpu(rows)).toBeLessThanOrEqual(100);
    expect(totalMemKB(rows)).toBeGreaterThan(0);
  });
});
