import { toggleDisabled, isDeviceDisabled, isConflictDevice, CONFLICT_DEVICE_ID } from '../deviceManagerHelpers';

describe('toggleDisabled', () => {
  it('marks a device disabled when it was not present', () => {
    const result = toggleDisabled({}, 'mouse-ps2');
    expect(result).toEqual({ 'mouse-ps2': true });
  });

  it('re-enables a device by removing it from the map', () => {
    const result = toggleDisabled({ 'mouse-ps2': true }, 'mouse-ps2');
    expect(result).toEqual({});
  });

  it('does not mutate the original map', () => {
    const original = { 'mouse-ps2': true };
    toggleDisabled(original, 'keyboard-ps2');
    expect(original).toEqual({ 'mouse-ps2': true });
  });

  it('leaves other entries untouched', () => {
    const result = toggleDisabled({ 'mouse-ps2': true }, 'keyboard-ps2');
    expect(result).toEqual({ 'mouse-ps2': true, 'keyboard-ps2': true });
  });
});

describe('isDeviceDisabled', () => {
  it('returns true for a disabled device', () => {
    expect(isDeviceDisabled({ 'mouse-ps2': true }, 'mouse-ps2')).toBe(true);
  });

  it('returns false for a device not in the map', () => {
    expect(isDeviceDisabled({}, 'mouse-ps2')).toBe(false);
  });
});

describe('isConflictDevice / CONFLICT_DEVICE_ID', () => {
  it('flags exactly the conflict device id', () => {
    expect(isConflictDevice(CONFLICT_DEVICE_ID)).toBe(true);
  });

  it('does not flag other device ids', () => {
    expect(isConflictDevice('mouse-ps2')).toBe(false);
  });
});
