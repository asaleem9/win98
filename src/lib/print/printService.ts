// The print spooler. A module-level store (in the spirit of sounds.ts) that
// owns the job queue, walks each job pending → printing → done on timers, and
// serves live snapshots to subscribers. Filesystem writes and page rendering
// are injected via setPrintDeps so this module stays pure and testable.

import { emit } from '@/lib/eventBus';
import { countPages } from './pageRenderer';
import type {
  JobStatus,
  PrintDeps,
  PrintJob,
  Printer,
  QueueSnapshot,
  SubmitPrintInput,
} from './types';

const PRINTERS: Printer[] = [
  { id: 'hp-laserjet-4l', name: 'HP LaserJet 4L', port: 'LPT1:' },
  { id: 'epson-stylus-600', name: 'Epson Stylus COLOR 600', port: 'LPT2:' },
  { id: 'ms-fax', name: 'Microsoft Fax', port: 'FAX:' },
];

const PAGE_MS = 1500; // ~1.5s per page
const CLEANUP_MS = 3000; // how long a finished job lingers in the queue
const OWNER = 'Administrator';
const OUTPUT_DIR = 'C:\\My Documents\\Printed Documents';
const TRAY_ID = 'print-spooler';
const TRAY_ICON = '/icons/printer-16.svg';

let jobs: PrintJob[] = [];
const printersPaused: Record<string, boolean> = {};
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const subscribers = new Set<(snap: QueueSnapshot) => void>();
let deps: PrintDeps | null = null;
let jobCounter = 0;

const ACTIVE: JobStatus[] = ['pending', 'printing', 'paused'];

export function getPrinters(): Printer[] {
  return PRINTERS.map((p) => ({ ...p }));
}

export function getPrinter(id: string): Printer | undefined {
  return PRINTERS.find((p) => p.id === id);
}

/** Inject the filesystem writer + page renderer (from the component layer). */
export function setPrintDeps(next: PrintDeps | null): void {
  deps = next;
}

function snapshot(): QueueSnapshot {
  return {
    jobs: jobs.map((j) => ({ ...j })),
    printersPaused: { ...printersPaused },
  };
}

function notify(): void {
  const snap = snapshot();
  subscribers.forEach((cb) => cb(snap));
}

export function subscribeQueue(cb: (snap: QueueSnapshot) => void): () => void {
  subscribers.add(cb);
  cb(snapshot());
  return () => {
    subscribers.delete(cb);
  };
}

export function getJobs(): PrintJob[] {
  return jobs.map((j) => ({ ...j }));
}

export function getJobsForPrinter(printerId: string): PrintJob[] {
  return jobs.filter((j) => j.printerId === printerId).map((j) => ({ ...j }));
}

export function isPrinterPaused(printerId: string): boolean {
  return !!printersPaused[printerId];
}

function activeCount(): number {
  return jobs.filter((j) => ACTIVE.includes(j.status)).length;
}

function updateTray(): void {
  const count = activeCount();
  if (count > 0) {
    emit('tray-register', { id: TRAY_ID, icon: TRAY_ICON, tooltip: `${count} document(s) pending` });
  } else {
    emit('tray-unregister', { id: TRAY_ID });
  }
}

function clearTimer(jobId: string): void {
  const t = timers.get(jobId);
  if (t) {
    clearTimeout(t);
    timers.delete(jobId);
  }
}

function scheduleTick(jobId: string): void {
  clearTimer(jobId);
  timers.set(jobId, setTimeout(() => tick(jobId), PAGE_MS));
}

function tick(jobId: string): void {
  timers.delete(jobId);
  const job = jobs.find((j) => j.id === jobId);
  if (!job || job.status !== 'printing' || printersPaused[job.printerId]) return;
  if (job.currentPage < job.totalPages) {
    job.currentPage += 1;
    notify();
    scheduleTick(jobId);
  } else {
    completeJob(job);
  }
}

function startPrinting(job: PrintJob): void {
  job.status = 'printing';
  job.currentPage = 1;
  job.startedAt = Date.now();
  notify();
  updateTray();
  scheduleTick(job.id);
}

// Advance the front of a printer's queue: if nothing is actively printing and
// the printer isn't paused, promote the oldest pending job.
function pump(printerId: string): void {
  if (printersPaused[printerId]) return;
  if (jobs.some((j) => j.printerId === printerId && j.status === 'printing')) return;
  const next = jobs.find((j) => j.printerId === printerId && j.status === 'pending');
  if (next) startPrinting(next);
}

function completeJob(job: PrintJob): void {
  clearTimer(job.id);
  job.status = 'done';
  notify();
  updateTray();
  void writeOutputs(job);
  pump(job.printerId);
  // Let it linger briefly as "Printed", then drop it from the queue.
  timers.set(job.id, setTimeout(() => {
    timers.delete(job.id);
    const still = jobs.find((j) => j.id === job.id);
    if (still && still.status === 'done') {
      jobs = jobs.filter((j) => j.id !== job.id);
      notify();
    }
  }, CLEANUP_MS));
}

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\.+$/, '').trim() || 'Document';
}

function buildPrnFile(job: PrintJob): string {
  const printer = getPrinter(job.printerId);
  const now = new Date().toISOString();
  const preview =
    job.content.kind === 'text'
      ? job.content.text
      : job.content.kind === 'html'
        ? job.content.html
        : '<binary image data>';
  return [
    '%!PS-Adobe-3.0',
    `%%Title: ${job.documentName}`,
    `%%Creator: ${job.appName}`,
    `%%For: ${OWNER}`,
    `%%CreationDate: ${now}`,
    `%%Printer: ${printer?.name ?? job.printerId} (${printer?.port ?? '?'})`,
    `%%Pages: ${job.basePages}`,
    '%%EndComments',
    '',
    'save',
    '/Times-Roman findfont 12 scalefont setfont',
    '72 720 moveto',
    '% --- captured document stream ---',
    ...preview.split(/\r?\n/).map((line) => `% ${line}`),
    'showpage',
    'restore',
    '%%EOF',
    '',
  ].join('\n');
}

async function writeOutputs(job: PrintJob): Promise<void> {
  const active = deps;
  if (!active) return;
  try {
    active.ensureDir(OUTPUT_DIR);
    const safe = sanitize(job.documentName);
    if (job.toFile) {
      active.writeFile(`${OUTPUT_DIR}\\${safe}.prn`, buildPrnFile(job));
      return;
    }
    const pages = await active.renderPages(job);
    pages.forEach((dataUrl, i) => {
      if (dataUrl) active.writeFile(`${OUTPUT_DIR}\\${safe} - Page ${i + 1}.png`, dataUrl);
    });
  } catch {
    // A failed write shouldn't wedge the spooler.
  }
}

export function submitPrintJob(input: SubmitPrintInput): string {
  const copies = Math.max(1, Math.floor(input.copies ?? 1));
  const basePages = Math.max(1, countPages(input.content));
  const id = `job-${++jobCounter}-${Date.now()}`;
  const job: PrintJob = {
    id,
    appName: input.appName,
    documentName: input.documentName || 'Untitled',
    printerId: input.printerId,
    copies,
    content: input.content,
    toFile: input.toFile,
    owner: OWNER,
    basePages,
    totalPages: basePages * copies,
    currentPage: 0,
    status: 'pending',
    submittedAt: Date.now(),
  };
  jobs.push(job);
  notify();
  updateTray();
  pump(job.printerId);
  return id;
}

export function cancelJob(id: string): boolean {
  const job = jobs.find((j) => j.id === id);
  if (!job) return false;
  clearTimer(id);
  const printerId = job.printerId;
  jobs = jobs.filter((j) => j.id !== id);
  notify();
  updateTray();
  pump(printerId);
  return true;
}

export function cancelAll(printerId: string): void {
  jobs.filter((j) => j.printerId === printerId).forEach((j) => clearTimer(j.id));
  jobs = jobs.filter((j) => j.printerId !== printerId);
  notify();
  updateTray();
}

export function pauseJob(id: string): void {
  const job = jobs.find((j) => j.id === id);
  if (!job || (job.status !== 'printing' && job.status !== 'pending')) return;
  clearTimer(id);
  job.status = 'paused';
  notify();
  updateTray();
  pump(job.printerId);
}

export function resumeJob(id: string): void {
  const job = jobs.find((j) => j.id === id);
  if (!job || job.status !== 'paused') return;
  job.status = 'pending';
  job.currentPage = 0;
  notify();
  updateTray();
  pump(job.printerId);
}

export function pausePrinter(printerId: string): void {
  if (printersPaused[printerId]) return;
  printersPaused[printerId] = true;
  jobs
    .filter((j) => j.printerId === printerId && j.status === 'printing')
    .forEach((j) => clearTimer(j.id));
  notify();
}

export function resumePrinter(printerId: string): void {
  if (!printersPaused[printerId]) return;
  printersPaused[printerId] = false;
  const printing = jobs.find((j) => j.printerId === printerId && j.status === 'printing');
  if (printing) scheduleTick(printing.id);
  else pump(printerId);
  notify();
}

export function setPrinterPaused(printerId: string, paused: boolean): void {
  if (paused) pausePrinter(printerId);
  else resumePrinter(printerId);
}

/** Test/reset helper — clears all jobs, timers, and paused flags. */
export function __resetPrintService(): void {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
  jobs = [];
  Object.keys(printersPaused).forEach((k) => delete printersPaused[k]);
  subscribers.clear();
  deps = null;
  jobCounter = 0;
}
