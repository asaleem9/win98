'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { TreeView98, TreeNode } from '@/components/ui/TreeView98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { Dialog98 } from '@/components/ui/Dialog98';
import { Input98 } from '@/components/ui/Input98';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { useSettings } from '@/contexts/SettingsContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { cn } from '@/lib/cn';
import {
  RegistryValue,
  RegistryOverrides,
  EMPTY_OVERRIDES,
  valuePathFor,
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
  FindMatch,
} from './registryOverrides';

const REGISTRY_TREE: TreeNode[] = [
  {
    id: 'my-computer',
    label: 'My Computer',
    children: [
      {
        id: 'HKCR',
        label: 'HKEY_CLASSES_ROOT',
        children: [
          { id: 'HKCR-.txt', label: '.txt', children: [{ id: 'HKCR-.txt-shell', label: 'shell' }] },
          { id: 'HKCR-.doc', label: '.doc', children: [{ id: 'HKCR-.doc-shell', label: 'shell' }] },
          { id: 'HKCR-.exe', label: '.exe' },
          { id: 'HKCR-.bmp', label: '.bmp' },
          { id: 'HKCR-CLSID', label: 'CLSID', children: [{ id: 'HKCR-CLSID-1', label: '{00000000-0000-0000-0000-000000000001}' }] },
        ],
      },
      {
        id: 'HKCU',
        label: 'HKEY_CURRENT_USER',
        children: [
          { id: 'HKCU-Software', label: 'Software', children: [
            { id: 'HKCU-Software-Microsoft', label: 'Microsoft', children: [
              { id: 'HKCU-Software-Microsoft-Windows', label: 'Windows', children: [
                { id: 'HKCU-Software-Microsoft-Windows-CV', label: 'CurrentVersion' },
              ]},
            ]},
          ]},
          { id: 'HKCU-Control Panel', label: 'Control Panel', children: [
            { id: 'HKCU-CP-Desktop', label: 'Desktop' },
            { id: 'HKCU-CP-Colors', label: 'Colors' },
          ]},
          { id: 'HKCU-Environment', label: 'Environment' },
        ],
      },
      {
        id: 'HKLM',
        label: 'HKEY_LOCAL_MACHINE',
        children: [
          { id: 'HKLM-Hardware', label: 'Hardware' },
          { id: 'HKLM-Software', label: 'Software', children: [
            { id: 'HKLM-Software-Microsoft', label: 'Microsoft' },
            { id: 'HKLM-Software-Classes', label: 'Classes' },
          ]},
          { id: 'HKLM-System', label: 'System', children: [
            { id: 'HKLM-System-CCS', label: 'CurrentControlSet' },
          ]},
        ],
      },
      {
        id: 'HKU',
        label: 'HKEY_USERS',
        children: [
          { id: 'HKU-Default', label: '.Default' },
        ],
      },
      {
        id: 'HKCC',
        label: 'HKEY_CURRENT_CONFIG',
        children: [
          { id: 'HKCC-Display', label: 'Display' },
          { id: 'HKCC-System', label: 'System' },
        ],
      },
      {
        id: 'HKDD',
        label: 'HKEY_DYN_DATA',
        children: [
          { id: 'HKDD-PerfStats', label: 'PerfStats' },
          { id: 'HKDD-Config', label: 'Config Manager' },
        ],
      },
    ],
  },
];

const VALUES_BY_KEY: Record<string, RegistryValue[]> = {
  'HKCR-.txt': [
    { name: '(Default)', type: 'REG_SZ', data: 'txtfile' },
    { name: 'Content Type', type: 'REG_SZ', data: 'text/plain' },
  ],
  'HKCR-.doc': [
    { name: '(Default)', type: 'REG_SZ', data: 'Word.Document.8' },
    { name: 'Content Type', type: 'REG_SZ', data: 'application/msword' },
  ],
  'HKCU-CP-Desktop': [
    { name: 'Wallpaper', type: 'REG_SZ', data: 'C:\\Windows\\Setup.bmp' },
    { name: 'TileWallpaper', type: 'REG_DWORD', data: '0' },
    { name: 'ScreenSaveActive', type: 'REG_DWORD', data: '1' },
    { name: 'ScreenSaveTimeOut', type: 'REG_DWORD', data: '300' },
  ],
  'HKCU-CP-Colors': [
    { name: 'Background', type: 'REG_SZ', data: '0 128 128' },
    { name: 'Window', type: 'REG_SZ', data: '255 255 255' },
    { name: 'ButtonFace', type: 'REG_SZ', data: '192 192 192' },
  ],
  'HKCU-Environment': [
    { name: 'TEMP', type: 'REG_SZ', data: 'C:\\WINDOWS\\TEMP' },
    { name: 'TMP', type: 'REG_SZ', data: 'C:\\WINDOWS\\TEMP' },
  ],
};

function getBaseValues(keyId: string): RegistryValue[] {
  return VALUES_BY_KEY[keyId] ?? [];
}

const PLACEHOLDER_VALUE: RegistryValue = { name: '(Default)', type: 'REG_SZ', data: '(value not set)' };

const TOP_LEVEL_IDS = new Set(['my-computer', 'HKCR', 'HKCU', 'HKLM', 'HKU', 'HKCC', 'HKDD']);

function findPath(nodes: TreeNode[], targetId: string, path: string[] = []): string[] | null {
  for (const node of nodes) {
    const currentPath = [...path, node.label];
    if (node.id === targetId) return currentPath;
    if (node.children) {
      const found = findPath(node.children, targetId, currentPath);
      if (found) return found;
    }
  }
  return null;
}

type EditDialogState = { keyPath: string; value: RegistryValue } | null;
type PromptState = { mode: 'newKey' | 'newValue'; text: string } | null;

export default function RegistryEditor({}: AppComponentProps) {
  const { getAppPref, setAppPref } = useSettings();
  const { createFile } = useFileSystem();

  const [overrides, setOverridesState] = useState<RegistryOverrides>(() =>
    getAppPref('regedit', 'overrides', EMPTY_OVERRIDES),
  );
  const [selectedKey, setSelectedKey] = useState<string>('my-computer');
  const [selectedValueName, setSelectedValueName] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<EditDialogState>(null);
  const [editText, setEditText] = useState('');
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportConfirm, setExportConfirm] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findResults, setFindResults] = useState<FindMatch[]>([]);
  const [findIndex, setFindIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);

  const tree = useMemo(() => mergeOverridesIntoTree(REGISTRY_TREE, overrides), [overrides]);
  const selectedKeyPath = useMemo(() => findPath(tree, selectedKey)?.join('\\') ?? 'My Computer', [tree, selectedKey]);

  const persistOverrides = useCallback(
    (next: RegistryOverrides) => {
      setOverridesState(next);
      setAppPref('regedit', 'overrides', next);
    },
    [setAppPref],
  );

  const handleSelect = useCallback((node: TreeNode) => {
    setSelectedKey(node.id);
    setSelectedValueName(null);
  }, []);

  const values = useMemo(() => {
    const effective = getEffectiveValues(selectedKeyPath, getBaseValues(selectedKey), overrides);
    return effective.length > 0 ? effective : [PLACEHOLDER_VALUE];
  }, [selectedKeyPath, selectedKey, overrides]);

  const openEditDialog = useCallback((value: RegistryValue) => {
    if (value === PLACEHOLDER_VALUE) return;
    setEditDialog({ keyPath: selectedKeyPath, value });
    setEditText(value.data);
  }, [selectedKeyPath]);

  const commitEdit = useCallback(() => {
    if (!editDialog) return;
    const path = valuePathFor(editDialog.keyPath, editDialog.value.name);
    const next = setValueData(overrides, path, editText);
    persistOverrides(next);
    if (isUnderHklmSystem(editDialog.keyPath)) {
      window.dispatchEvent(
        new CustomEvent('win98-bsod', {
          detail: {
            message: `A fatal exception 0E has occurred at 0028:C0011E36 in VxD VMM(01) + 00010E36 while modifying registry key "${editDialog.keyPath}\\${editDialog.value.name}"`,
          },
        }),
      );
    }
    setEditDialog(null);
  }, [editDialog, editText, overrides, persistOverrides]);

  const runFind = useCallback(
    (query: string, startAt = 0) => {
      const matches = findInRegistry(tree, getBaseValues, overrides, query);
      setFindResults(matches);
      setFindIndex(startAt);
      if (matches.length > 0) {
        const m = matches[startAt % matches.length];
        setSelectedKey(m.keyId);
        setSelectedValueName(m.valueName ?? null);
      }
    },
    [tree, overrides],
  );

  const handleFindNext = useCallback(() => {
    if (findResults.length === 0) {
      if (findQuery) runFind(findQuery, 0);
      return;
    }
    const nextIndex = (findIndex + 1) % findResults.length;
    setFindIndex(nextIndex);
    const m = findResults[nextIndex];
    setSelectedKey(m.keyId);
    setSelectedValueName(m.valueName ?? null);
  }, [findResults, findIndex, findQuery, runFind]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowFind(true);
        setTimeout(() => findInputRef.current?.focus(), 0);
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleFindNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFindNext]);

  const handleNewKey = useCallback(() => setPrompt({ mode: 'newKey', text: 'New Key #1' }), []);
  const handleNewValue = useCallback(() => setPrompt({ mode: 'newValue', text: 'New Value #1' }), []);

  const commitPrompt = useCallback(() => {
    if (!prompt) return;
    const name = prompt.text.trim();
    if (!name) {
      setPrompt(null);
      return;
    }
    if (prompt.mode === 'newKey') {
      persistOverrides(addKey(overrides, selectedKeyPath, name));
    } else {
      persistOverrides(addValue(overrides, selectedKeyPath, { name, type: 'REG_SZ', data: '' }));
    }
    setPrompt(null);
  }, [prompt, overrides, selectedKeyPath, persistOverrides]);

  const canDelete = !TOP_LEVEL_IDS.has(selectedKey);

  const handleDeleteRequest = useCallback(() => {
    if (!canDelete) return;
    setConfirmDelete(true);
  }, [canDelete]);

  const commitDelete = useCallback(() => {
    if (selectedValueName) {
      persistOverrides(deleteValue(overrides, valuePathFor(selectedKeyPath, selectedValueName)));
      setSelectedValueName(null);
    } else {
      persistOverrides(deleteKey(overrides, selectedKeyPath));
      setSelectedKey('my-computer');
    }
    setConfirmDelete(false);
  }, [selectedValueName, selectedKeyPath, overrides, persistOverrides]);

  const handleExport = useCallback(() => {
    const regText = serializeRegExport(tree, getBaseValues, overrides);
    createFile('C:\\My Documents', 'export.reg', regText);
    setExportConfirm(true);
  }, [tree, overrides, createFile]);

  const menus: MenuDefinition[] = [
    {
      label: 'Registry',
      items: [
        { label: 'Export...', onClick: handleExport },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'New Key', onClick: handleNewKey },
        { label: 'New String Value', onClick: handleNewValue },
        { label: '', separator: true },
        { label: 'Delete', shortcut: 'Del', disabled: !canDelete, onClick: handleDeleteRequest },
        { label: '', separator: true },
        { label: 'Find...', shortcut: 'Ctrl+F', onClick: () => setShowFind(true) },
        { label: 'Find Next', shortcut: 'F3', onClick: handleFindNext },
      ],
    },
    {
      label: 'View',
      items: [{ label: 'Status Bar', checked: true, disabled: true }],
    },
    {
      label: 'Help',
      items: [{ label: 'About Registry Editor', onClick: () => window.dispatchEvent(new CustomEvent('win98-system-dialog', { detail: { title: 'About Registry Editor', message: 'Microsoft Registry Editor\\nWindows 98\\n\\nWarning: editing the registry may cause your computer to become a brick.', icon: 'info' } })) }],
    },
  ];

  const activeValue = editDialog?.value;
  const isDwordEdit = activeValue?.type === 'REG_DWORD';

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <MenuBar menus={menus} />

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Tree */}
        <TreeView98
          nodes={tree}
          selectedId={selectedKey}
          onSelect={handleSelect}
          className="w-[220px] flex-shrink-0"
        />

        {/* Values list */}
        <div
          className={cn(
            'flex-1 bg-white overflow-auto',
            'border-2 border-solid',
            'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
            'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
          )}
        >
          {/* Column headers */}
          <div className="flex border-b border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)] sticky top-0">
            <div className="px-2 py-[2px] border-r border-[var(--win98-button-shadow)] w-[120px] font-normal select-none">Name</div>
            <div className="px-2 py-[2px] border-r border-[var(--win98-button-shadow)] w-[80px] font-normal select-none">Type</div>
            <div className="px-2 py-[2px] flex-1 font-normal select-none">Data</div>
          </div>

          {/* Values */}
          {values.map((val) => (
            <div
              key={val.name}
              className={cn(
                'flex cursor-default select-none',
                selectedValueName === val.name && 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]',
              )}
              onClick={() => setSelectedValueName(val.name)}
              onDoubleClick={() => openEditDialog(val)}
            >
              <div className="px-2 py-[1px] w-[120px] truncate flex items-center gap-1">
                <span className="text-[9px]">📄</span>
                {val.name}
              </div>
              <div className="px-2 py-[1px] w-[80px] truncate">{val.type}</div>
              <div className="px-2 py-[1px] flex-1 truncate">{val.data}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Find bar */}
      {showFind && (
        <div className="flex items-center gap-1 px-2 py-1 bg-[var(--win98-button-face)] border-t border-[var(--win98-button-shadow)]">
          <label className="select-none">Find:</label>
          <Input98
            ref={findInputRef}
            className="w-[160px]"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runFind(findQuery, 0);
            }}
          />
          <span className="select-none">
            {findResults.length > 0 ? `${findIndex + 1} of ${findResults.length}` : 'No matches'}
          </span>
          <button
            className="px-2 h-[18px] text-[11px] bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] cursor-default"
            onClick={() => runFind(findQuery, 0)}
          >
            Find Next
          </button>
          <button
            className="px-2 h-[18px] text-[11px] bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] cursor-default"
            onClick={() => setShowFind(false)}
          >
            Close
          </button>
        </div>
      )}

      <StatusBar98 panels={[{ content: selectedKeyPath }]} />

      {/* Edit String / Edit DWORD dialog */}
      {editDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <Dialog98
            title={isDwordEdit ? 'Edit DWORD Value' : 'Edit String'}
            message={
              <div className="flex flex-col gap-2 min-w-[220px]">
                <div>Value name: {editDialog.value.name}</div>
                <div className="flex items-center gap-1">
                  <span>Value data:</span>
                  <Input98
                    autoFocus
                    type={isDwordEdit ? 'number' : 'text'}
                    className="flex-1"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                </div>
              </div>
            }
            buttons={[
              { label: 'OK', onClick: commitEdit, default: true },
              { label: 'Cancel', onClick: () => setEditDialog(null) },
            ]}
          />
        </div>
      )}

      {/* New Key / New String Value prompt */}
      {prompt && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <Dialog98
            title={prompt.mode === 'newKey' ? 'New Key' : 'New String Value'}
            message={
              <div className="flex items-center gap-1 min-w-[200px]">
                <span>Name:</span>
                <Input98
                  autoFocus
                  className="flex-1"
                  value={prompt.text}
                  onChange={(e) => setPrompt({ ...prompt, text: e.target.value })}
                />
              </div>
            }
            buttons={[
              { label: 'OK', onClick: commitPrompt, default: true },
              { label: 'Cancel', onClick: () => setPrompt(null) },
            ]}
          />
        </div>
      )}

      {/* Scary delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <Dialog98
            title="Confirm Value Delete"
            icon="warning"
            message={
              selectedValueName ? (
                <>
                  Are you sure you want to delete this value?
                  <br />
                  <br />
                  &quot;{selectedValueName}&quot; under {selectedKeyPath}
                </>
              ) : (
                `Are you sure you want to delete the key "${selectedKeyPath}" and all of its subkeys?`
              )
            }
            buttons={[
              { label: 'Yes', onClick: commitDelete, default: true },
              { label: 'No', onClick: () => setConfirmDelete(false) },
            ]}
          />
        </div>
      )}

      {/* Export confirmation */}
      {exportConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <Dialog98
            title="Registry Editor"
            icon="info"
            message="The registry was successfully exported to C:\My Documents\export.reg"
            buttons={[{ label: 'OK', onClick: () => setExportConfirm(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
