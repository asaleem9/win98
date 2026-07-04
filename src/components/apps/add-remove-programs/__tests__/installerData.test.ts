import {
  INSTALLERS,
  PROGRAM_APP_IDS,
  installerSlug,
  getInstaller,
  withFlag,
  withoutFlag,
} from '../installerData';

describe('installerSlug', () => {
  it('extracts the slug from installer content', () => {
    expect(installerSlug('installer:winzip')).toBe('winzip');
    expect(installerSlug('installer:ram-doubler')).toBe('ram-doubler');
    expect(installerSlug('INSTALLER:Doom')).toBe('doom');
  });
  it('returns null for non-installer content', () => {
    expect(installerSlug('hello world')).toBeNull();
    expect(installerSlug('')).toBeNull();
    expect(installerSlug(null)).toBeNull();
    expect(installerSlug(undefined)).toBeNull();
  });
});

describe('getInstaller', () => {
  it('maps known slugs to metadata with era filenames', () => {
    const info = getInstaller('winamp');
    expect(info?.product).toBe('Winamp 2.5');
    expect(info?.appId).toBe('winamp');
    expect(info!.files.length).toBeGreaterThan(0);
  });
  it('returns null for unknown or missing slugs', () => {
    expect(getInstaller('nope')).toBeNull();
    expect(getInstaller(null)).toBeNull();
  });
});

describe('installer/app id mapping', () => {
  it('every CNET download slug has an installer entry', () => {
    for (const slug of ['winzip', 'ram-doubler', 'winamp', 'realplayer', 'icq', 'bonzibuddy', 'doom', 'duke']) {
      expect(INSTALLERS[slug]).toBeDefined();
    }
  });
  it('installers that map to a real app use a valid registry id', () => {
    expect(INSTALLERS.winzip.appId).toBe('winzip');
    expect(INSTALLERS.bonzibuddy.appId).toBe('bonzi-buddy');
    // Gag installers with no real app carry no appId.
    expect(INSTALLERS['ram-doubler'].appId).toBeUndefined();
  });
  it('maps Add/Remove program entries to registry app ids', () => {
    expect(PROGRAM_APP_IDS.bonzi).toBe('bonzi-buddy');
    expect(PROGRAM_APP_IDS.winzip).toBe('winzip');
  });
});

describe('flag helpers', () => {
  it('withFlag sets a key true without mutating the source', () => {
    const base = { a: true };
    const next = withFlag(base, 'b');
    expect(next).toEqual({ a: true, b: true });
    expect(base).toEqual({ a: true });
  });
  it('withoutFlag removes a key without mutating the source', () => {
    const base = { a: true, b: true };
    const next = withoutFlag(base, 'b');
    expect(next).toEqual({ a: true });
    expect(base).toEqual({ a: true, b: true });
  });
});
