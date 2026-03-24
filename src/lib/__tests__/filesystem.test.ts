import { resolvePath, formatSize, getParentPath } from '@/lib/filesystem';

describe('resolvePath', () => {
  it('resolves "C:" to root node', () => {
    const node = resolvePath('C:');
    expect(node).not.toBeNull();
    expect(node!.name).toBe('C:');
    expect(node!.type).toBe('directory');
  });

  it('resolves "C:\\\\" to root node', () => {
    const node = resolvePath('C:\\');
    expect(node).not.toBeNull();
    expect(node!.name).toBe('C:');
  });

  it('resolves "C:\\\\My Documents" to My Documents directory', () => {
    const node = resolvePath('C:\\My Documents');
    expect(node).not.toBeNull();
    expect(node!.name).toBe('My Documents');
    expect(node!.type).toBe('directory');
  });

  it('resolves "C:\\\\My Documents\\\\readme.txt" to the file node', () => {
    const node = resolvePath('C:\\My Documents\\readme.txt');
    expect(node).not.toBeNull();
    expect(node!.name).toBe('readme.txt');
    expect(node!.type).toBe('file');
  });

  it('is case-insensitive', () => {
    const node = resolvePath('c:\\my documents');
    expect(node).not.toBeNull();
    expect(node!.name).toBe('My Documents');
  });

  it('supports forward slashes', () => {
    const node = resolvePath('C:/My Documents');
    expect(node).not.toBeNull();
    expect(node!.name).toBe('My Documents');
  });

  it('returns null for non-existent path', () => {
    expect(resolvePath('C:\\Nonexistent')).toBeNull();
  });

  it('returns null for path into a file (not directory)', () => {
    expect(resolvePath('C:\\AUTOEXEC.BAT\\something')).toBeNull();
  });
});

describe('formatSize', () => {
  it('returns bytes for values < 1024', () => {
    expect(formatSize(512)).toBe('512 bytes');
  });

  it('returns 1KB for 1024', () => {
    expect(formatSize(1024)).toBe('1KB');
  });

  it('returns KB with comma separator for large values', () => {
    expect(formatSize(1047552)).toBe('1,023KB');
  });

  it('returns MB format for values where KB >= 1024', () => {
    expect(formatSize(1572864)).toBe('1.5MB');
  });
});

describe('getParentPath', () => {
  it('returns parent for file path', () => {
    expect(getParentPath('C:\\My Documents\\readme.txt')).toBe('C:\\My Documents');
  });

  it('returns root for top-level directory', () => {
    expect(getParentPath('C:\\My Documents')).toBe('C:\\');
  });

  it('returns root for root', () => {
    expect(getParentPath('C:\\')).toBe('C:\\');
  });

  it('normalizes forward slashes', () => {
    expect(getParentPath('C:/My Documents/readme.txt')).toBe('C:\\My Documents');
  });
});
