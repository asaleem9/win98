import { vi } from 'vitest';
import {
  submitPrintJob,
  cancelJob,
  cancelAll,
  pauseJob,
  resumeJob,
  pausePrinter,
  resumePrinter,
  isPrinterPaused,
  subscribeQueue,
  getJobs,
  getPrinters,
  setPrintDeps,
  __resetPrintService,
} from '../printService';
import type { QueueSnapshot } from '../types';

const HP = 'hp-laserjet-4l';
const EPSON = 'epson-stylus-600';

function jobById(id: string) {
  return getJobs().find((j) => j.id === id);
}

function manyLines(n: number): string {
  return Array.from({ length: n }, (_, i) => `line ${i}`).join('\n');
}

beforeEach(() => {
  vi.useFakeTimers();
  __resetPrintService();
});

afterEach(() => {
  __resetPrintService();
  vi.useRealTimers();
});

describe('getPrinters', () => {
  it('exposes the three installed printers', () => {
    const ids = getPrinters().map((p) => p.id);
    expect(ids).toEqual([HP, EPSON, 'ms-fax']);
  });
});

describe('job lifecycle', () => {
  it('walks a queued job pending → printing → done', () => {
    const id1 = submitPrintJob({ appName: 'T', documentName: 'A', content: { kind: 'text', text: 'x' }, printerId: HP });
    const id2 = submitPrintJob({ appName: 'T', documentName: 'B', content: { kind: 'text', text: 'x' }, printerId: HP });

    // First job prints immediately; the second waits its turn.
    expect(jobById(id1)!.status).toBe('printing');
    expect(jobById(id2)!.status).toBe('pending');

    // One page (~1.5s) later the first finishes and the second takes over.
    vi.advanceTimersByTime(1500);
    expect(jobById(id1)!.status).toBe('done');
    expect(jobById(id2)!.status).toBe('printing');
  });

  it('advances page N of M for a multi-page job', () => {
    const id = submitPrintJob({ appName: 'T', documentName: 'Long', content: { kind: 'text', text: manyLines(120) }, printerId: EPSON });
    expect(jobById(id)!.totalPages).toBe(3);
    expect(jobById(id)!.currentPage).toBe(1);

    vi.advanceTimersByTime(1500);
    expect(jobById(id)!.currentPage).toBe(2);
    vi.advanceTimersByTime(1500);
    expect(jobById(id)!.currentPage).toBe(3);
    vi.advanceTimersByTime(1500);
    expect(jobById(id)!.status).toBe('done');
  });

  it('multiplies total pages by the copy count', () => {
    const id = submitPrintJob({ appName: 'T', documentName: 'C', content: { kind: 'text', text: 'x' }, printerId: HP, copies: 3 });
    expect(jobById(id)!.basePages).toBe(1);
    expect(jobById(id)!.totalPages).toBe(3);
  });

  it('drops a finished job from the queue after it lingers', () => {
    const id = submitPrintJob({ appName: 'T', documentName: 'A', content: { kind: 'text', text: 'x' }, printerId: HP });
    vi.advanceTimersByTime(1500);
    expect(jobById(id)!.status).toBe('done');
    vi.advanceTimersByTime(3000);
    expect(jobById(id)).toBeUndefined();
  });
});

describe('cancel', () => {
  it('removes a single job', () => {
    const id = submitPrintJob({ appName: 'T', documentName: 'A', content: { kind: 'text', text: 'x' }, printerId: HP });
    expect(cancelJob(id)).toBe(true);
    expect(getJobs()).toHaveLength(0);
  });

  it('cancels every document on a printer', () => {
    submitPrintJob({ appName: 'T', documentName: 'A', content: { kind: 'text', text: 'x' }, printerId: HP });
    submitPrintJob({ appName: 'T', documentName: 'B', content: { kind: 'text', text: 'x' }, printerId: HP });
    submitPrintJob({ appName: 'T', documentName: 'C', content: { kind: 'text', text: 'x' }, printerId: EPSON });
    cancelAll(HP);
    expect(getJobs().map((j) => j.printerId)).toEqual([EPSON]);
  });
});

describe('pause', () => {
  it('pauses and resumes an individual job', () => {
    const id1 = submitPrintJob({ appName: 'T', documentName: 'A', content: { kind: 'text', text: 'x' }, printerId: HP });
    const id2 = submitPrintJob({ appName: 'T', documentName: 'B', content: { kind: 'text', text: 'x' }, printerId: HP });
    pauseJob(id2);
    expect(jobById(id2)!.status).toBe('paused');
    resumeJob(id2);
    expect(jobById(id2)!.status).toBe('pending');
    expect(jobById(id1)!.status).toBe('printing');
  });

  it('halts progress while the printer is paused', () => {
    const id = submitPrintJob({ appName: 'T', documentName: 'Long', content: { kind: 'text', text: manyLines(120) }, printerId: HP });
    expect(jobById(id)!.currentPage).toBe(1);

    pausePrinter(HP);
    expect(isPrinterPaused(HP)).toBe(true);
    vi.advanceTimersByTime(10000);
    expect(jobById(id)!.currentPage).toBe(1); // frozen

    resumePrinter(HP);
    vi.advanceTimersByTime(1500);
    expect(jobById(id)!.currentPage).toBe(2);
  });
});

describe('subscriptions', () => {
  it('pushes an immediate snapshot then every change', () => {
    const seen: QueueSnapshot[] = [];
    const unsub = subscribeQueue((s) => seen.push(s));
    expect(seen).toHaveLength(1);
    expect(seen[0].jobs).toHaveLength(0);

    submitPrintJob({ appName: 'T', documentName: 'A', content: { kind: 'text', text: 'x' }, printerId: HP });
    expect(seen[seen.length - 1].jobs).toHaveLength(1);
    unsub();

    const before = seen.length;
    submitPrintJob({ appName: 'T', documentName: 'B', content: { kind: 'text', text: 'x' }, printerId: EPSON });
    expect(seen).toHaveLength(before); // no longer notified
  });
});

describe('tray integration', () => {
  it('registers while spooling and unregisters when idle', () => {
    const events: string[] = [];
    const onReg = (e: Event) => events.push(`reg:${(e as CustomEvent).detail.tooltip}`);
    const onUnreg = () => events.push('unreg');
    window.addEventListener('win98-tray-register', onReg);
    window.addEventListener('win98-tray-unregister', onUnreg);

    submitPrintJob({ appName: 'T', documentName: 'A', content: { kind: 'text', text: 'x' }, printerId: HP });
    expect(events.some((e) => e === 'reg:1 document(s) pending')).toBe(true);

    vi.advanceTimersByTime(1500); // job done → nothing active
    expect(events[events.length - 1]).toBe('unreg');

    window.removeEventListener('win98-tray-register', onReg);
    window.removeEventListener('win98-tray-unregister', onUnreg);
  });
});

describe('filesystem output', () => {
  it('writes PNG pages on completion via the injected writer', async () => {
    const writes: { path: string; content: string }[] = [];
    setPrintDeps({
      writeFile: (path, content) => writes.push({ path, content }),
      ensureDir: () => {},
      renderPages: async () => ['data:image/png;pg1', 'data:image/png;pg2'],
    });

    submitPrintJob({ appName: 'T', documentName: 'Report', content: { kind: 'text', text: 'hi' }, printerId: EPSON });
    await vi.advanceTimersByTimeAsync(1500);

    const pngs = writes.filter((w) => w.path.endsWith('.png'));
    expect(pngs).toHaveLength(2);
    expect(pngs[0].path).toContain('Printed Documents');
    expect(pngs[0].path).toContain('Report - Page 1.png');
    expect(pngs[0].content).toBe('data:image/png;pg1');
  });

  it('writes a .prn PostScript file for the print-to-file branch', async () => {
    const writes: { path: string; content: string }[] = [];
    let rendered = false;
    setPrintDeps({
      writeFile: (path, content) => writes.push({ path, content }),
      ensureDir: () => {},
      renderPages: async () => { rendered = true; return []; },
    });

    submitPrintJob({ appName: 'Notepad', documentName: 'Memo', content: { kind: 'text', text: 'hi' }, printerId: 'ms-fax', toFile: true });
    await vi.advanceTimersByTimeAsync(1500);

    expect(rendered).toBe(false);
    expect(writes).toHaveLength(1);
    expect(writes[0].path).toContain('Memo.prn');
    expect(writes[0].content).toContain('%!PS-Adobe');
    expect(writes[0].content).toContain('%%Title: Memo');
  });
});
