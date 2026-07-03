// Turns print content into PNG data URLs, one per page, drawn on an offscreen
// canvas styled as a sheet of paper (Letter, ~612×792 at 72dpi, 1in margins,
// a document-name header and a grey page footer).
//
// The pagination math lives in paginateText and is pure — the canvas drawing
// degrades to empty strings when no 2D context is available (e.g. jsdom), so
// the surrounding logic and tests never depend on a real rendering backend.

import type { PrintContent, PrintJob } from './types';

// Letter at 72dpi with 1in margins.
export const PAGE_W = 612;
export const PAGE_H = 792;
export const MARGIN = 72;

// Nominal monospace grid used for pagination and text layout.
export const COLS = 80;
export const ROWS = 54;
const LINE_H = (PAGE_H - MARGIN * 2) / ROWS; // 12px

/** Expand tabs and hard/soft-wrap a single logical line to `cols` characters. */
function wrapLine(line: string, cols: number): string[] {
  const expanded = line.replace(/\t/g, '    ');
  if (expanded.length <= cols) return [expanded];
  const out: string[] = [];
  let rest = expanded;
  while (rest.length > cols) {
    let breakAt = rest.lastIndexOf(' ', cols);
    if (breakAt <= 0) breakAt = cols; // no space to break on — hard split
    out.push(rest.slice(0, breakAt).replace(/\s+$/, ''));
    rest = rest.slice(breakAt).replace(/^\s+/, '');
  }
  out.push(rest);
  return out;
}

/**
 * Split text into pages of wrapped lines. Pure and deterministic: same input
 * always yields the same pages. Always returns at least one (possibly empty)
 * page so a blank document still prints a single sheet.
 */
export function paginateText(text: string, cols: number, rows: number): string[][] {
  const logical = text.replace(/\r\n?/g, '\n').split('\n');
  const lines: string[] = [];
  for (const line of logical) {
    if (line.length === 0) lines.push('');
    else lines.push(...wrapLine(line, cols));
  }
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += rows) {
    pages.push(lines.slice(i, i + rows));
  }
  if (pages.length === 0) pages.push([]);
  return pages;
}

/** Strip tags/entities from HTML so it can fall back to plain-text rendering. */
export function stripHtml(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

interface Surface {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

function makeSurface(): Surface | null {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return { canvas, ctx };
  } catch {
    return null;
  }
}

function paintChrome(ctx: CanvasRenderingContext2D, docName: string, pageNum: number): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.strokeStyle = '#e0e0e0';
  ctx.strokeRect(0.5, 0.5, PAGE_W - 1, PAGE_H - 1);

  ctx.fillStyle = '#888888';
  ctx.font = '10px Arial, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(docName, MARGIN, MARGIN - 26);
  ctx.fillText(`Page ${pageNum}`, MARGIN, PAGE_H - MARGIN + 34);

  ctx.strokeStyle = '#d8d8d8';
  ctx.beginPath();
  ctx.moveTo(MARGIN, MARGIN - 16);
  ctx.lineTo(PAGE_W - MARGIN, MARGIN - 16);
  ctx.stroke();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

function renderTextPages(docName: string, text: string, opts?: { fontSize?: number; family?: string }): string[] {
  const pages = paginateText(text, COLS, ROWS);
  const size = opts?.fontSize ?? 11;
  const family = opts?.family ?? '"Courier New", monospace';
  return pages.map((lines, idx) => {
    const surface = makeSurface();
    if (!surface) return '';
    const { canvas, ctx } = surface;
    paintChrome(ctx, docName, idx + 1);
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    ctx.font = `${size}px ${family}`;
    lines.forEach((line, i) => ctx.fillText(line, MARGIN, MARGIN + i * LINE_H));
    return canvas.toDataURL('image/png');
  });
}

async function renderImagePage(docName: string, dataUrl: string): Promise<string[]> {
  const surface = makeSurface();
  if (!surface) return [''];
  const { canvas, ctx } = surface;
  paintChrome(ctx, docName, 1);
  try {
    const img = await loadImage(dataUrl);
    const boxW = PAGE_W - MARGIN * 2;
    const boxH = PAGE_H - MARGIN * 2;
    const scale = Math.min(boxW / img.width, boxH / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, MARGIN + (boxW - w) / 2, MARGIN + (boxH - h) / 2, w, h);
  } catch {
    // Leave the page blank if the image can't decode.
  }
  return [canvas.toDataURL('image/png')];
}

async function renderHtmlPage(docName: string, html: string): Promise<string[]> {
  const boxW = PAGE_W - MARGIN * 2;
  const boxH = PAGE_H - MARGIN * 2;
  try {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${boxW}" height="${boxH}">` +
      `<foreignObject width="100%" height="100%">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:12px;color:#000;line-height:1.4;">${html}</div>` +
      `</foreignObject></svg>`;
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const img = await loadImage(url);
    const surface = makeSurface();
    if (!surface) return [''];
    const { canvas, ctx } = surface;
    paintChrome(ctx, docName, 1);
    ctx.drawImage(img, MARGIN, MARGIN);
    return [canvas.toDataURL('image/png')];
  } catch {
    // foreignObject rendering (or a tainted canvas) failed — print the text.
    return renderTextPages(docName, stripHtml(html));
  }
}

/** Render one job's content into an array of PNG data URLs, one per page. */
export async function renderJobPages(job: Pick<PrintJob, 'documentName' | 'content'>): Promise<string[]> {
  const { documentName, content } = job;
  return renderContentPages(documentName, content);
}

export async function renderContentPages(documentName: string, content: PrintContent): Promise<string[]> {
  switch (content.kind) {
    case 'text':
      return renderTextPages(documentName, content.text, content.opts);
    case 'image':
      return renderImagePage(documentName, content.dataUrl);
    case 'html':
      return renderHtmlPage(documentName, content.html);
  }
}

/** Page count for one copy of content, computed without touching a canvas. */
export function countPages(content: PrintContent): number {
  switch (content.kind) {
    case 'text':
      return paginateText(content.text, COLS, ROWS).length;
    case 'html':
      return paginateText(stripHtml(content.html), COLS, ROWS).length;
    case 'image':
      return 1;
  }
}
