// Pure helpers for device enable/disable state and the conflict device.

export type DisabledMap = Record<string, boolean>;

/** Merges a stored disabled-map with a single toggle, dropping falsy entries to keep storage small. */
export function toggleDisabled(current: DisabledMap, deviceId: string): DisabledMap {
  const next: DisabledMap = { ...current };
  if (next[deviceId]) {
    delete next[deviceId];
  } else {
    next[deviceId] = true;
  }
  return next;
}

export function isDeviceDisabled(map: DisabledMap, deviceId: string): boolean {
  return !!map[deviceId];
}

/** The one device in the tree that's always in a conflict state, code 1. */
export const CONFLICT_DEVICE_ID = 'network-ethernet-conflict';

export function isConflictDevice(deviceId: string): boolean {
  return deviceId === CONFLICT_DEVICE_ID;
}

export const CONFLICT_DEVICE_STATUS = 'This device is not configured correctly. (Code 1)';
