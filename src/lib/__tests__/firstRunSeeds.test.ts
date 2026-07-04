import { resolvePath } from '@/lib/filesystem';
import { getAppIdForFile } from '@/lib/fileAssociations';
import { resolveTrackFromContent } from '@/lib/audio/playlist';
import { musicTracks } from '@/lib/audio/tracks';

// The first-run staged content is only worth anything if every seed actually
// resolves through the same pipelines the real apps use. These lock that down.

describe('first-run staged seeds', () => {
  it('stages the README tour note on the desktop, opened by Notepad', () => {
    const readme = resolvePath('C:\\Windows\\Desktop\\README - START HERE.txt');
    expect(readme?.type).toBe('file');
    expect(readme?.content).toMatch(/welcome to your new computer/i);
    // A .txt double-click routes to Notepad.
    expect(getAppIdForFile('README - START HERE.txt')).toBe('notepad');
  });

  it('stages a starter homepage in My Documents that opens in Internet Explorer', () => {
    const home = resolvePath('C:\\My Documents\\My Homepage.htm');
    expect(home?.type).toBe('file');
    expect(home?.content).toMatch(/<html/i);
    expect(getAppIdForFile('My Homepage.htm')).toBe('ie5');
  });

  it('fills My Mixtape with real, playable bundled tracks', () => {
    const mixtape = resolvePath('C:\\My Documents\\My Mixtape');
    expect(mixtape?.type).toBe('directory');

    const files = mixtape?.children ?? [];
    expect(files.length).toBeGreaterThanOrEqual(3);

    for (const file of files) {
      // Winamp resolves 'track:<id>' content to a bundled track; every seed must.
      const track = resolveTrackFromContent(file.content);
      expect(track, `${file.name} should resolve to a bundled track`).toBeDefined();
      expect(musicTracks.some((t) => t.id === track!.id)).toBe(true);
    }
  });
});
