import { renderHook } from '@testing-library/react';
import { ReactNode, createElement } from 'react';
import {
  networkFileSystem,
  networkSharePasswords,
  resolveNetworkPath,
  resolvePath,
} from '@/lib/filesystem';
import { getAppIdForFile } from '@/lib/fileAssociations';
import { resolveTrackFromContent } from '@/lib/audio/playlist';
import { FileSystemProvider, useFileSystem } from '@/contexts/FileSystemContext';

function wrapper({ children }: { children: ReactNode }) {
  return createElement(FileSystemProvider, null, children);
}

describe('network filesystem seed', () => {
  it('mounts the browsable machines with their shares', () => {
    const machines = (networkFileSystem.children ?? []).map((m) => m.name);
    expect(machines).toEqual(['DADS-COMPUTER', 'FAMILY-PC']);
    expect(resolveNetworkPath('\\\\DADS-COMPUTER\\shared')?.type).toBe('directory');
    expect(resolveNetworkPath('\\\\DADS-COMPUTER\\photos')?.type).toBe('directory');
    expect(resolveNetworkPath('\\\\DADS-COMPUTER\\SECRET-SHARE')?.type).toBe('directory');
    expect(resolveNetworkPath('\\\\FAMILY-PC\\homework')?.type).toBe('directory');
    expect(resolveNetworkPath('\\\\FAMILY-PC\\mp3s')?.type).toBe('directory');
  });

  it('resolves seeded files by both UNC and normalized paths', () => {
    const unc = resolveNetworkPath('\\\\DADS-COMPUTER\\shared\\DO-NOT-OPEN.txt');
    expect(unc?.content).toContain("I know you're reading this");
    const normalized = resolveNetworkPath('C:\\DADS-COMPUTER\\shared\\DO-NOT-OPEN.txt');
    expect(normalized).toBe(unc);
  });

  it('never hijacks the C: root or real C: paths', () => {
    expect(resolveNetworkPath('C:\\')).toBeNull();
    expect(resolveNetworkPath('C:\\My Documents')).toBeNull();
    expect(resolveNetworkPath('C:\\My Documents\\readme.txt')).toBeNull();
  });

  it('seeds the password hint in My Documents', () => {
    const node = resolvePath('C:\\My Documents\\passwords.txt');
    expect(node?.content?.trim().split('\n').pop()).toBe('dads secret share: hunter2');
    expect(networkSharePasswords['DADS-COMPUTER\\SECRET-SHARE']).toBe('hunter2');
  });

  it('routes network files to the right app via associations', () => {
    expect(getAppIdForFile('DO-NOT-OPEN.txt')).toBe('notepad');
    expect(getAppIdForFile('taxes_1997.xls')).toBe('excel');
    expect(getAppIdForFile('solitaire_tips.doc')).toBe('wordpad');
    expect(getAppIdForFile('backyard_bbq.bmp')).toBe('paint');
    expect(getAppIdForFile('best_song_ever.mp3')).toBe('winamp');
  });

  it('gives the mp3 shares real bundled track references', () => {
    const song = resolveNetworkPath('\\\\FAMILY-PC\\mp3s\\best_song_ever.mp3');
    expect(resolveTrackFromContent(song?.content)?.id).toBe('y2k-panic');
    const secret = resolveNetworkPath('\\\\DADS-COMPUTER\\SECRET-SHARE\\secret_song.mp3');
    expect(resolveTrackFromContent(secret?.content)?.id).toBe('compuserve-sunset');
  });

  it('exposes the family photos as Paint-openable data URLs', () => {
    const photo = resolveNetworkPath('\\\\DADS-COMPUTER\\photos\\backyard_bbq.bmp');
    expect(photo?.content?.startsWith('data:image/svg+xml')).toBe(true);
  });
});

describe('FileSystemContext network awareness', () => {
  it('resolves network files through getNode/readFile without touching the C: root', () => {
    window.localStorage.clear();
    const { result } = renderHook(() => useFileSystem(), { wrapper });
    // Network file resolves...
    expect(result.current.getNode('\\\\DADS-COMPUTER\\shared\\DO-NOT-OPEN.txt')).toBeTruthy();
    expect(result.current.readFile('C:\\FAMILY-PC\\mp3s\\best_song_ever.mp3')).toBe('track:y2k-panic');
    // ...and a network directory lists its children.
    expect(result.current.listDir('\\\\DADS-COMPUTER\\shared')?.length).toBe(3);
    // Real C: paths are unaffected.
    expect(result.current.getNode('C:\\My Documents\\readme.txt')).toBeTruthy();
    expect(result.current.getNode('C:\\')?.name).toBe('C:');
  });
});
