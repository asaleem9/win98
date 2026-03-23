'use client';

import { useState, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { TreeView98, TreeNode } from '@/components/ui/TreeView98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { cn } from '@/lib/cn';

interface RegistryValue {
  name: string;
  type: string;
  data: string;
}

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
    { name: 'TileWallpaper', type: 'REG_SZ', data: '0' },
    { name: 'ScreenSaveActive', type: 'REG_SZ', data: '1' },
    { name: 'ScreenSaveTimeOut', type: 'REG_SZ', data: '300' },
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

interface RegistryEditorProps extends AppComponentProps {
  onBSOD?: (message?: string) => void;
}

export default function RegistryEditor({ windowId, onBSOD }: RegistryEditorProps) {
  const [selectedKey, setSelectedKey] = useState<string>('my-computer');
  const [selectedKeyPath, setSelectedKeyPath] = useState('My Computer');
  const [editingValue, setEditingValue] = useState<string | null>(null);

  const findPath = useCallback((nodes: TreeNode[], targetId: string, path: string[] = []): string[] | null => {
    for (const node of nodes) {
      const currentPath = [...path, node.label];
      if (node.id === targetId) return currentPath;
      if (node.children) {
        const found = findPath(node.children, targetId, currentPath);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const handleSelect = useCallback((node: TreeNode) => {
    setSelectedKey(node.id);
    const path = findPath(REGISTRY_TREE, node.id);
    setSelectedKeyPath(path ? path.join('\\') : node.label);
  }, [findPath]);

  const handleValueDoubleClick = (value: RegistryValue) => {
    if (onBSOD) {
      onBSOD(`A fatal exception 0E has occurred at 0028:C0011E36 in VxD VMM(01) + 00010E36 while modifying registry key "${selectedKeyPath}\\${value.name}"`);
    }
  };

  const values = VALUES_BY_KEY[selectedKey] || [{ name: '(Default)', type: 'REG_SZ', data: '(value not set)' }];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Menu bar */}
      <div className="flex gap-3 px-2 py-[2px] border-b border-[var(--win98-button-shadow)]">
        <span className="cursor-default select-none hover:underline">Registry</span>
        <span className="cursor-default select-none hover:underline">Edit</span>
        <span className="cursor-default select-none hover:underline">View</span>
        <span className="cursor-default select-none hover:underline">Help</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Tree */}
        <TreeView98
          nodes={REGISTRY_TREE}
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
                editingValue === val.name && 'bg-[var(--win98-highlight)] text-[var(--win98-highlight-text)]',
              )}
              onClick={() => setEditingValue(val.name)}
              onDoubleClick={() => handleValueDoubleClick(val)}
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

      <StatusBar98 panels={[{ content: selectedKeyPath }]} />
    </div>
  );
}
