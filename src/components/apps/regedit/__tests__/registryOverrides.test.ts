import { TreeNode } from '@/components/ui/TreeView98';
import {
  EMPTY_OVERRIDES,
  setValueData,
  addValue,
  addKey,
  deleteValue,
  deleteKey,
  getEffectiveValues,
  mergeOverridesIntoTree,
  findInRegistry,
  serializeRegExport,
  isUnderHklmSystem,
  valuePathFor,
  RegistryValue,
} from '../registryOverrides';

const TREE: TreeNode[] = [
  {
    id: 'root',
    label: 'My Computer',
    children: [
      {
        id: 'HKCU',
        label: 'HKEY_CURRENT_USER',
        children: [{ id: 'HKCU-Desktop', label: 'Desktop' }],
      },
      {
        id: 'HKLM',
        label: 'HKEY_LOCAL_MACHINE',
        children: [{ id: 'HKLM-System', label: 'System' }],
      },
    ],
  },
];

const BASE_VALUES: Record<string, RegistryValue[]> = {
  'HKCU-Desktop': [{ name: 'Wallpaper', type: 'REG_SZ', data: 'C:\\Windows\\Setup.bmp' }],
};

function getBaseValues(id: string) {
  return BASE_VALUES[id] ?? [];
}

describe('setValueData / getEffectiveValues', () => {
  it('overrides a value while leaving others untouched', () => {
    const path = valuePathFor('My Computer\\HKEY_CURRENT_USER\\Desktop', 'Wallpaper');
    const overrides = setValueData(EMPTY_OVERRIDES, path, 'C:\\new.bmp');
    const values = getEffectiveValues('My Computer\\HKEY_CURRENT_USER\\Desktop', BASE_VALUES['HKCU-Desktop'], overrides);
    expect(values).toEqual([{ name: 'Wallpaper', type: 'REG_SZ', data: 'C:\\new.bmp' }]);
  });

  it('adds new values without disturbing existing ones', () => {
    const overrides = addValue(EMPTY_OVERRIDES, 'Some\\Key', { name: 'Extra', type: 'REG_SZ', data: 'hi' });
    const values = getEffectiveValues('Some\\Key', [], overrides);
    expect(values).toEqual([{ name: 'Extra', type: 'REG_SZ', data: 'hi' }]);
  });

  it('deletes a value', () => {
    const path = valuePathFor('K', 'Wallpaper');
    const overrides = deleteValue(EMPTY_OVERRIDES, path);
    const values = getEffectiveValues('K', [{ name: 'Wallpaper', type: 'REG_SZ', data: 'x' }], overrides);
    expect(values).toEqual([]);
  });
});

describe('mergeOverridesIntoTree', () => {
  it('adds a new key under the target path', () => {
    const overrides = addKey(EMPTY_OVERRIDES, 'My Computer\\HKEY_CURRENT_USER', 'MyNewKey');
    const merged = mergeOverridesIntoTree(TREE, overrides);
    const hkcu = merged[0].children!.find((n) => n.id === 'HKCU')!;
    expect(hkcu.children!.some((c) => c.label === 'MyNewKey')).toBe(true);
  });

  it('removes a deleted key', () => {
    const overrides = deleteKey(EMPTY_OVERRIDES, 'My Computer\\HKEY_CURRENT_USER\\Desktop');
    const merged = mergeOverridesIntoTree(TREE, overrides);
    const hkcu = merged[0].children!.find((n) => n.id === 'HKCU')!;
    expect(hkcu.children!.some((c) => c.id === 'HKCU-Desktop')).toBe(false);
  });
});

describe('findInRegistry', () => {
  it('finds a matching key name', () => {
    const matches = findInRegistry(TREE, getBaseValues, EMPTY_OVERRIDES, 'Desktop');
    expect(matches.some((m) => m.keyPath === 'My Computer\\HKEY_CURRENT_USER\\Desktop')).toBe(true);
  });

  it('finds a matching value name and data', () => {
    const byName = findInRegistry(TREE, getBaseValues, EMPTY_OVERRIDES, 'Wallpaper');
    expect(byName.some((m) => m.valueName === 'Wallpaper')).toBe(true);

    const byData = findInRegistry(TREE, getBaseValues, EMPTY_OVERRIDES, 'Setup.bmp');
    expect(byData.some((m) => m.valueName === 'Wallpaper')).toBe(true);
  });

  it('returns nothing for an empty query', () => {
    expect(findInRegistry(TREE, getBaseValues, EMPTY_OVERRIDES, '')).toEqual([]);
  });
});

describe('serializeRegExport', () => {
  it('produces a REGEDIT4 header and bracketed key sections', () => {
    const text = serializeRegExport(TREE, getBaseValues, EMPTY_OVERRIDES);
    expect(text.startsWith('REGEDIT4')).toBe(true);
    expect(text).toContain('[HKEY_CURRENT_USER\\Desktop]');
    expect(text).toContain('"Wallpaper"="C:\\\\Windows\\\\Setup.bmp"');
  });

  it('writes DWORD values in hex', () => {
    const overrides = addValue(EMPTY_OVERRIDES, 'My Computer\\HKEY_CURRENT_USER\\Desktop', {
      name: 'ScreenSaveTimeOut',
      type: 'REG_DWORD',
      data: '300',
    });
    const text = serializeRegExport(TREE, getBaseValues, overrides);
    expect(text).toContain('"ScreenSaveTimeOut"=dword:0000012c');
  });
});

describe('isUnderHklmSystem', () => {
  it('flags System and its descendants', () => {
    expect(isUnderHklmSystem('My Computer\\HKEY_LOCAL_MACHINE\\System')).toBe(true);
    expect(isUnderHklmSystem('My Computer\\HKEY_LOCAL_MACHINE\\System\\CurrentControlSet')).toBe(true);
  });

  it('does not flag other HKLM subkeys or other hives', () => {
    expect(isUnderHklmSystem('My Computer\\HKEY_LOCAL_MACHINE\\Software')).toBe(false);
    expect(isUnderHklmSystem('My Computer\\HKEY_CURRENT_USER\\Desktop')).toBe(false);
  });
});
