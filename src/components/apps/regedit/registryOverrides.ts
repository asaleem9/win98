// Pure registry-editing logic kept separate from the component so it's easy to
// unit test: merging user overrides into the static tree/values, the .reg
// export format, and the find-in-registry search.

import { TreeNode } from '@/components/ui/TreeView98';

export interface RegistryValue {
  name: string;
  type: 'REG_SZ' | 'REG_DWORD';
  data: string;
}

export interface RegistryOverrides {
  valueEdits: Record<string, string>;
  addedValues: Record<string, RegistryValue[]>;
  addedKeys: Record<string, string[]>;
  deletedValues: string[];
  deletedKeyPaths: string[];
}

export const EMPTY_OVERRIDES: RegistryOverrides = {
  valueEdits: {},
  addedValues: {},
  addedKeys: {},
  deletedValues: [],
  deletedKeyPaths: [],
};

export function valuePathFor(keyPath: string, valueName: string): string {
  return `${keyPath}\\${valueName}`;
}

export function setValueData(overrides: RegistryOverrides, valuePath: string, data: string): RegistryOverrides {
  return { ...overrides, valueEdits: { ...overrides.valueEdits, [valuePath]: data } };
}

export function addValue(overrides: RegistryOverrides, keyPath: string, value: RegistryValue): RegistryOverrides {
  const existing = overrides.addedValues[keyPath] ?? [];
  return {
    ...overrides,
    addedValues: { ...overrides.addedValues, [keyPath]: [...existing, value] },
  };
}

export function addKey(overrides: RegistryOverrides, parentKeyPath: string, keyLabel: string): RegistryOverrides {
  const existing = overrides.addedKeys[parentKeyPath] ?? [];
  if (existing.includes(keyLabel)) return overrides;
  return {
    ...overrides,
    addedKeys: { ...overrides.addedKeys, [parentKeyPath]: [...existing, keyLabel] },
  };
}

export function deleteValue(overrides: RegistryOverrides, valuePath: string): RegistryOverrides {
  return { ...overrides, deletedValues: [...overrides.deletedValues, valuePath] };
}

export function deleteKey(overrides: RegistryOverrides, keyPath: string): RegistryOverrides {
  return { ...overrides, deletedKeyPaths: [...overrides.deletedKeyPaths, keyPath] };
}

/** Static values for a key, plus edits/additions/deletions layered on top. */
export function getEffectiveValues(
  keyPath: string,
  baseValues: RegistryValue[],
  overrides: RegistryOverrides,
): RegistryValue[] {
  const edited = baseValues.map((v) => {
    const path = valuePathFor(keyPath, v.name);
    return path in overrides.valueEdits ? { ...v, data: overrides.valueEdits[path] } : v;
  });
  const remaining = edited.filter((v) => !overrides.deletedValues.includes(valuePathFor(keyPath, v.name)));
  const existingNames = new Set(remaining.map((v) => v.name));
  const added = (overrides.addedValues[keyPath] ?? []).filter(
    (v) => !overrides.deletedValues.includes(valuePathFor(keyPath, v.name)) && !existingNames.has(v.name),
  );
  return [...remaining, ...added];
}

/** Folds addedKeys/deletedKeyPaths into the static tree, tracking full label paths. */
export function mergeOverridesIntoTree(
  nodes: TreeNode[],
  overrides: RegistryOverrides,
  parentPath = '',
): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}\\${node.label}` : node.label;
    if (overrides.deletedKeyPaths.includes(path)) continue;

    const mergedChildren = mergeOverridesIntoTree(node.children ?? [], overrides, path);
    const addedLabels = overrides.addedKeys[path] ?? [];
    const addedNodes: TreeNode[] = addedLabels.map((label) => ({
      id: `custom:${path}\\${label}`,
      label,
    }));
    const allChildren = [...mergedChildren, ...addedNodes];
    const hadChildren = !!node.children;

    result.push({
      ...node,
      children: hadChildren || addedNodes.length > 0 ? allChildren : undefined,
    });
  }
  return result;
}

export interface FindMatch {
  keyPath: string;
  keyId: string;
  valueName?: string;
}

/** Walks the (already-merged) tree looking for a key name or value name/data match. */
export function findInRegistry(
  tree: TreeNode[],
  getBaseValues: (keyId: string) => RegistryValue[],
  overrides: RegistryOverrides,
  query: string,
  parentPath = '',
): FindMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  let results: FindMatch[] = [];

  for (const node of tree) {
    const path = parentPath ? `${parentPath}\\${node.label}` : node.label;

    if (node.label.toLowerCase().includes(q)) {
      results.push({ keyPath: path, keyId: node.id });
    }

    const values = getEffectiveValues(path, getBaseValues(node.id), overrides);
    for (const v of values) {
      if (v.name.toLowerCase().includes(q) || v.data.toLowerCase().includes(q)) {
        results.push({ keyPath: path, keyId: node.id, valueName: v.name });
      }
    }

    if (node.children) {
      results = results.concat(findInRegistry(node.children, getBaseValues, overrides, query, path));
    }
  }

  return results;
}

function regEscape(data: string): string {
  return data.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function toDwordHex(data: string): string {
  const n = Number(data) || 0;
  return (n >>> 0).toString(16).padStart(8, '0');
}

/** Serializes the (merged) tree into a Win9x-style REGEDIT4 .reg export. */
export function serializeRegExport(
  tree: TreeNode[],
  getBaseValues: (keyId: string) => RegistryValue[],
  overrides: RegistryOverrides,
  parentPath = '',
): string {
  const lines: string[] = ['REGEDIT4', ''];

  function walk(nodes: TreeNode[], path: string) {
    for (const node of nodes) {
      const fullPath = path ? `${path}\\${node.label}` : node.label;
      const values = getEffectiveValues(fullPath, getBaseValues(node.id), overrides);
      const exportPath = fullPath.replace(/^My Computer\\?/, '');

      if (values.length > 0 && exportPath) {
        lines.push(`[${exportPath}]`);
        for (const v of values) {
          if (v.name === '(Default)') {
            lines.push(`@="${regEscape(v.data)}"`);
          } else if (v.type === 'REG_DWORD') {
            lines.push(`"${v.name}"=dword:${toDwordHex(v.data)}`);
          } else {
            lines.push(`"${v.name}"="${regEscape(v.data)}"`);
          }
        }
        lines.push('');
      }

      if (node.children) walk(node.children, fullPath);
    }
  }

  walk(tree, parentPath);
  return lines.join('\n');
}

/** Gag gate: only HKEY_LOCAL_MACHINE\System (and below) triggers the BSOD. */
export function isUnderHklmSystem(keyPath: string): boolean {
  return /HKEY_LOCAL_MACHINE\\System(\\|$)/i.test(keyPath);
}
