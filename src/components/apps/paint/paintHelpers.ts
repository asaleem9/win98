// Pure helper functions for Paint — kept free of DOM/canvas dependencies so
// they're easy to unit test.

/** Inverts RGB channels of raw pixel data in place. Alpha is left untouched. */
export function invertImageData(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
}

interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Mirrors pixel data left-to-right in place. */
export function flipImageDataHorizontal(img: PixelBuffer): void {
  const { data, width, height } = img;
  for (let y = 0; y < height; y++) {
    const rowStart = y * width * 4;
    for (let x = 0; x < Math.floor(width / 2); x++) {
      const left = rowStart + x * 4;
      const right = rowStart + (width - 1 - x) * 4;
      for (let c = 0; c < 4; c++) {
        const tmp = data[left + c];
        data[left + c] = data[right + c];
        data[right + c] = tmp;
      }
    }
  }
}

/** Mirrors pixel data top-to-bottom in place. */
export function flipImageDataVertical(img: PixelBuffer): void {
  const { data, width, height } = img;
  const rowSize = width * 4;
  for (let y = 0; y < Math.floor(height / 2); y++) {
    const topStart = y * rowSize;
    const bottomStart = (height - 1 - y) * rowSize;
    for (let i = 0; i < rowSize; i++) {
      const tmp = data[topStart + i];
      data[topStart + i] = data[bottomStart + i];
      data[bottomStart + i] = tmp;
    }
  }
}

/** True if a string looks like a data: URL (e.g. produced by canvas.toDataURL). */
export function isDataUrl(s: string): boolean {
  return typeof s === 'string' && s.startsWith('data:');
}

/** Ensures a filename ends with .bmp, trimming other extensions if present. */
export function buildFileName(base: string): string {
  const trimmed = base.trim() || 'Untitled';
  const withoutExt = trimmed.replace(/\.[^.\\/]+$/, '');
  return `${withoutExt}.bmp`;
}

/** Converts 0-255 rgb components to a #rrggbb hex string. */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  );
}
