// Shared types for the print subsystem. Kept separate so the pure service and
// the canvas-backed page renderer can reference the same shapes without a
// runtime import cycle.

export type PrintKind = 'text' | 'html' | 'image';

export type PrintContent =
  | { kind: 'text'; text: string; opts?: { fontSize?: number; family?: string } }
  | { kind: 'html'; html: string }
  | { kind: 'image'; dataUrl: string };

/** pending → printing → done is the happy path; the rest are user actions. */
export type JobStatus = 'pending' | 'printing' | 'paused' | 'done' | 'error';

export interface Printer {
  id: string;
  name: string;
  port: string;
}

export interface PrintJob {
  id: string;
  appName: string;
  documentName: string;
  printerId: string;
  copies: number;
  content: PrintContent;
  /** When set the job spools to a .prn file instead of PNG pages. */
  toFile?: boolean;
  owner: string;
  /** Rendered page count for one copy. */
  basePages: number;
  /** basePages × copies — the unit the queue progress counts through. */
  totalPages: number;
  /** 0 while pending, then 1..totalPages while printing. */
  currentPage: number;
  status: JobStatus;
  submittedAt: number;
  startedAt?: number;
}

export interface QueueSnapshot {
  jobs: PrintJob[];
  printersPaused: Record<string, boolean>;
}

export interface SubmitPrintInput {
  appName: string;
  documentName: string;
  content: PrintContent;
  printerId: string;
  copies?: number;
  toFile?: boolean;
}

/**
 * Side-effect hooks the service needs but must not own directly — the virtual
 * filesystem writer and the canvas page renderer are injected from the
 * component layer so the service stays pure and unit-testable.
 */
export interface PrintDeps {
  writeFile: (path: string, content: string) => void;
  ensureDir: (dirPath: string) => void;
  renderPages: (job: PrintJob) => Promise<string[]>;
}
