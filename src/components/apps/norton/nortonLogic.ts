export interface Threat {
  name: string;
  location: string;
  risk: string;
  type: string;
}

/** How many completed scans before the definitions nag kicks in. */
export const DEFINITIONS_EXPIRY_THRESHOLD = 5;

/** Merges newly-quarantined threats into the existing quarantine list, skipping dupes by name. */
export function quarantineThreats(quarantine: Threat[], toAdd: Threat[]): Threat[] {
  const seen = new Set(quarantine.map((t) => t.name));
  const merged = [...quarantine];
  for (const threat of toAdd) {
    if (!seen.has(threat.name)) {
      merged.push(threat);
      seen.add(threat.name);
    }
  }
  return merged;
}

/** Records threat names as handled (quarantined or deleted) so future scans skip them. */
export function markThreatsCleared(cleared: string[], handled: Threat[]): string[] {
  const set = new Set(cleared);
  for (const threat of handled) set.add(threat.name);
  return Array.from(set);
}

/** Filters the master threat pool down to ones not yet quarantined/deleted. */
export function activeThreatPool(allThreats: Threat[], cleared: string[]): Threat[] {
  const clearedSet = new Set(cleared);
  return allThreats.filter((t) => !clearedSet.has(t.name));
}

/** Removes a quarantined entry by name — used by both Restore and Delete. */
export function removeFromQuarantine(quarantine: Threat[], name: string): Threat[] {
  return quarantine.filter((t) => t.name !== name);
}

/** Drops a name back out of the cleared list so a rescan can turn it up again. */
export function unclearThreat(cleared: string[], name: string): string[] {
  return cleared.filter((n) => n !== name);
}

export function incrementScanCount(count: number): number {
  return count + 1;
}

export function resetScanCount(): number {
  return 0;
}

export function isDefinitionsExpired(scanCount: number, threshold = DEFINITIONS_EXPIRY_THRESHOLD): boolean {
  return scanCount >= threshold;
}
