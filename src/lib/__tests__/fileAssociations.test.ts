import { getAppIdForFile, getExtension, isExecutable } from '@/lib/fileAssociations';

describe('getExtension', () => {
  it('extracts lowercased extensions', () => {
    expect(getExtension('README.TXT')).toBe('txt');
    expect(getExtension('archive.tar.gz')).toBe('gz');
  });

  it('returns empty for no extension or dotfiles', () => {
    expect(getExtension('Makefile')).toBe('');
    expect(getExtension('.hidden')).toBe('');
  });
});

describe('isExecutable', () => {
  it('detects exe and com', () => {
    expect(isExecutable('CALC.EXE')).toBe(true);
    expect(isExecutable('COMMAND.COM')).toBe(true);
    expect(isExecutable('readme.txt')).toBe(false);
  });
});

describe('getAppIdForFile', () => {
  it('maps extensions to app ids', () => {
    expect(getAppIdForFile('notes.txt')).toBe('notepad');
    expect(getAppIdForFile('letter.doc')).toBe('wordpad');
    expect(getAppIdForFile('song.mp3')).toBe('winamp');
    expect(getAppIdForFile('pic.bmp')).toBe('paint');
  });

  it('maps well-known EXE names before extension lookup', () => {
    expect(getAppIdForFile('CALC.EXE')).toBe('calculator');
    expect(getAppIdForFile('winmine.exe')).toBe('minesweeper');
  });

  it('returns null for unknown files', () => {
    expect(getAppIdForFile('data.xyz')).toBeNull();
    expect(getAppIdForFile('RANDOM.EXE')).toBeNull();
  });
});
