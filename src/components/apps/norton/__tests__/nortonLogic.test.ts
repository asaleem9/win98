import {
  Threat,
  DEFINITIONS_EXPIRY_THRESHOLD,
  quarantineThreats,
  markThreatsCleared,
  activeThreatPool,
  incrementScanCount,
  resetScanCount,
  isDefinitionsExpired,
  removeFromQuarantine,
  unclearThreat,
} from '../nortonLogic';

const threatA: Threat = { name: 'ILOVEYOU.VBS', location: 'C:\\Windows\\System\\', risk: 'High', type: 'VBS.LoveLetter.A' };
const threatB: Threat = { name: 'HAPPY99.EXE', location: 'C:\\Windows\\Temp\\', risk: 'High', type: 'W32.Happy99.Worm' };

describe('quarantineThreats', () => {
  it('adds new threats to an empty quarantine list', () => {
    expect(quarantineThreats([], [threatA])).toEqual([threatA]);
  });

  it('appends without duplicating existing entries by name', () => {
    const result = quarantineThreats([threatA], [threatA, threatB]);
    expect(result).toEqual([threatA, threatB]);
  });

  it('does not mutate the original quarantine list', () => {
    const original = [threatA];
    quarantineThreats(original, [threatB]);
    expect(original).toEqual([threatA]);
  });
});

describe('markThreatsCleared', () => {
  it('records handled threat names', () => {
    expect(markThreatsCleared([], [threatA, threatB]).sort()).toEqual([threatA.name, threatB.name].sort());
  });

  it('does not duplicate names already cleared', () => {
    const result = markThreatsCleared([threatA.name], [threatA]);
    expect(result).toEqual([threatA.name]);
  });
});

describe('activeThreatPool', () => {
  it('filters out cleared threats from the master list', () => {
    const pool = activeThreatPool([threatA, threatB], [threatA.name]);
    expect(pool).toEqual([threatB]);
  });

  it('returns the full list when nothing is cleared', () => {
    expect(activeThreatPool([threatA, threatB], [])).toEqual([threatA, threatB]);
  });

  it('returns an empty list once everything is cleared', () => {
    expect(activeThreatPool([threatA, threatB], [threatA.name, threatB.name])).toEqual([]);
  });
});

describe('removeFromQuarantine', () => {
  it('drops the named entry and leaves the rest', () => {
    expect(removeFromQuarantine([threatA, threatB], threatA.name)).toEqual([threatB]);
  });

  it('is a no-op when the name is absent', () => {
    expect(removeFromQuarantine([threatB], threatA.name)).toEqual([threatB]);
  });

  it('does not mutate the original list', () => {
    const original = [threatA, threatB];
    removeFromQuarantine(original, threatA.name);
    expect(original).toEqual([threatA, threatB]);
  });
});

describe('unclearThreat', () => {
  it('removes a name so it re-enters the active pool', () => {
    expect(unclearThreat([threatA.name, threatB.name], threatA.name)).toEqual([threatB.name]);
    expect(activeThreatPool([threatA, threatB], unclearThreat([threatA.name], threatA.name))).toEqual([
      threatA,
      threatB,
    ]);
  });

  it('is a no-op when the name is not cleared', () => {
    expect(unclearThreat([threatB.name], threatA.name)).toEqual([threatB.name]);
  });
});

describe('scan counter / definitions expiry', () => {
  it('increments from any starting count', () => {
    expect(incrementScanCount(0)).toBe(1);
    expect(incrementScanCount(4)).toBe(5);
  });

  it('resets back to zero', () => {
    expect(resetScanCount()).toBe(0);
  });

  it('is not expired below the threshold', () => {
    expect(isDefinitionsExpired(DEFINITIONS_EXPIRY_THRESHOLD - 1)).toBe(false);
  });

  it('is expired at or above the threshold', () => {
    expect(isDefinitionsExpired(DEFINITIONS_EXPIRY_THRESHOLD)).toBe(true);
    expect(isDefinitionsExpired(DEFINITIONS_EXPIRY_THRESHOLD + 3)).toBe(true);
  });

  it('supports a custom threshold', () => {
    expect(isDefinitionsExpired(2, 2)).toBe(true);
    expect(isDefinitionsExpired(1, 2)).toBe(false);
  });
});
