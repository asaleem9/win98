import {
  matchThreat,
  threatForDownload,
  quarantineThreat,
  markNortonOpened,
  isNortonOpened,
  resetNortonSession,
  SHIELD_THREAT_TYPE,
  QuarantinePrefs,
} from '../realtimeShield';
import { Threat } from '../nortonLogic';

// A tiny in-memory stand-in for the settings pref store.
function makeStore() {
  const data = new Map<string, unknown>();
  const prefs: QuarantinePrefs = {
    getAppPref: <T>(app: string, key: string, fallback: T) =>
      (data.has(`${app}:${key}`) ? (data.get(`${app}:${key}`) as T) : fallback),
    setAppPref: <T>(app: string, key: string, value: T) => {
      data.set(`${app}:${key}`, value);
    },
  };
  return { prefs, data };
}

describe('matchThreat', () => {
  it('flags the ram_doubler.exe dropper by name and reports its parent folder', () => {
    const threat = matchThreat('C:\\Downloads\\ram_doubler.exe', '');
    expect(threat).not.toBeNull();
    expect(threat!.name).toBe('ram_doubler.exe');
    expect(threat!.location).toBe('C:\\Downloads\\');
    expect(threat!.risk).toBe('High');
    expect(threat!.type).toBe(SHIELD_THREAT_TYPE);
  });

  it('matches the dropper name case-insensitively', () => {
    expect(matchThreat('C:\\Temp\\RAM_DOUBLER.EXE', '')?.name).toBe('RAM_DOUBLER.EXE');
  });

  it('flags any file carrying the installer:ram-doubler content marker', () => {
    const threat = matchThreat('C:\\Temp\\setup.exe', 'installer:ram-doubler v9.0');
    expect(threat).not.toBeNull();
    expect(threat!.name).toBe('setup.exe');
  });

  it('leaves ordinary files alone', () => {
    expect(matchThreat('C:\\My Documents\\notes.txt', 'just some notes')).toBeNull();
    expect(matchThreat('C:\\Windows\\readme.txt', '')).toBeNull();
  });
});

describe('threatForDownload', () => {
  it('normalizes the download directory to a trailing backslash', () => {
    expect(threatForDownload('evil.exe', 'C:\\Downloads').location).toBe('C:\\Downloads\\');
    expect(threatForDownload('evil.exe', 'C:\\Downloads\\').location).toBe('C:\\Downloads\\');
  });

  it('carries the shield signature and high risk', () => {
    const threat = threatForDownload('totally_not_a_virus.exe', 'C:\\Downloads');
    expect(threat.type).toBe(SHIELD_THREAT_TYPE);
    expect(threat.risk).toBe('High');
  });
});

describe('the Norton-opened session flag', () => {
  beforeEach(() => resetNortonSession());
  afterEach(() => resetNortonSession());

  it('starts dormant and flips on once Norton is opened', () => {
    expect(isNortonOpened()).toBe(false);
    markNortonOpened();
    expect(isNortonOpened()).toBe(true);
  });

  it('resets back to dormant', () => {
    markNortonOpened();
    resetNortonSession();
    expect(isNortonOpened()).toBe(false);
  });
});

describe('quarantineThreat', () => {
  const threat: Threat = {
    name: 'ram_doubler.exe',
    location: 'C:\\Downloads\\',
    risk: 'High',
    type: SHIELD_THREAT_TYPE,
  };

  it('adds the threat to Norton\'s persisted quarantine and cleared lists', () => {
    const { prefs, data } = makeStore();
    quarantineThreat(prefs, threat);

    expect(data.get('norton:quarantine')).toEqual([threat]);
    expect(data.get('norton:clearedNames')).toEqual(['ram_doubler.exe']);
  });

  it('does not double up when the same threat lands twice', () => {
    const { prefs, data } = makeStore();
    quarantineThreat(prefs, threat);
    quarantineThreat(prefs, threat);

    expect((data.get('norton:quarantine') as Threat[]).length).toBe(1);
    expect((data.get('norton:clearedNames') as string[]).length).toBe(1);
  });
});
