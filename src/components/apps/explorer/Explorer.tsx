'use client';

import { useState, useCallback, useMemo } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { Toolbar98 } from '@/components/ui/Toolbar98';
import { TreeView98, TreeNode } from '@/components/ui/TreeView98';
import { ListView98, ListItem, ListViewMode } from '@/components/ui/ListView98';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { virtualFileSystem, resolvePath, formatSize } from '@/lib/filesystem';
import { FSNode } from '@/types/filesystem';

function fsNodeToTreeNode(node: FSNode, path: string): TreeNode {
  const fullPath = path ? `${path}\\${node.name}` : node.name;
  return {
    id: fullPath,
    label: node.name,
    icon: node.icon || '/icons/folder-16.svg',
    children: node.children
      ?.filter((c) => c.type === 'directory')
      .map((c) => fsNodeToTreeNode(c, fullPath)),
  };
}

function fsNodeToListItem(node: FSNode, parentPath: string): ListItem {
  const defaultIcon = node.type === 'directory' ? '/icons/folder-16.svg' : '/icons/file-16.svg';
  const defaultIcon32 = node.type === 'directory' ? '/icons/folder-32.svg' : '/icons/file-32.svg';
  return {
    id: `${parentPath}\\${node.name}`,
    name: node.name,
    icon: node.icon?.replace('-16', '-32') || defaultIcon32,
    icon16: node.icon || defaultIcon,
    type: node.type === 'directory' ? 'File Folder' : getFileType(node.name),
    size: node.type === 'file' && node.size ? formatSize(node.size) : '',
    modified: node.modified,
  };
}

function getFileType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const types: Record<string, string> = {
    exe: 'Application', dll: 'Application Extension', sys: 'System File',
    txt: 'Text Document', doc: 'Microsoft Word Document', xls: 'Microsoft Excel Worksheet',
    bmp: 'Bitmap Image', ini: 'Configuration Settings', bat: 'MS-DOS Batch File',
    ttf: 'TrueType Font', htm: 'HTML Document', html: 'HTML Document',
  };
  return types[ext] || `${ext.toUpperCase()} File`;
}

export default function Explorer({ windowId }: AppComponentProps) {
  const { updateTitle } = useWindows();
  const [currentPath, setCurrentPath] = useState('C:');
  const [viewMode, setViewMode] = useState<ListViewMode>('large-icons');
  const [selectedItem, setSelectedItem] = useState<string | undefined>();
  const [history, setHistory] = useState<string[]>(['C:']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const treeNodes = useMemo((): TreeNode[] => {
    const root = fsNodeToTreeNode(virtualFileSystem, '');
    return [root];
  }, []);

  const currentNode = useMemo(() => resolvePath(currentPath), [currentPath]);

  const listItems = useMemo((): ListItem[] => {
    if (!currentNode || currentNode.type !== 'directory' || !currentNode.children) return [];
    return currentNode.children.map((child) => fsNodeToListItem(child, currentPath));
  }, [currentNode, currentPath]);

  const navigateTo = useCallback((path: string) => {
    const node = resolvePath(path);
    if (!node) return;
    setCurrentPath(path);
    setSelectedItem(undefined);
    updateTitle(windowId, `Exploring - ${path}`);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), path]);
    setHistoryIndex((prev) => prev + 1);
  }, [windowId, updateTitle, historyIndex]);

  const handleBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      const path = history[newIdx];
      setCurrentPath(path);
      updateTitle(windowId, `Exploring - ${path}`);
    }
  }, [history, historyIndex, windowId, updateTitle]);

  const handleForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      const path = history[newIdx];
      setCurrentPath(path);
      updateTitle(windowId, `Exploring - ${path}`);
    }
  }, [history, historyIndex, windowId, updateTitle]);

  const handleUp = useCallback(() => {
    if (currentPath === 'C:') return;
    const lastSlash = currentPath.lastIndexOf('\\');
    const parent = lastSlash > 2 ? currentPath.substring(0, lastSlash) : 'C:';
    navigateTo(parent);
  }, [currentPath, navigateTo]);

  const handleTreeSelect = useCallback((node: TreeNode) => {
    navigateTo(node.id);
  }, [navigateTo]);

  const handleItemSelect = useCallback((item: ListItem) => {
    setSelectedItem(item.id);
  }, []);

  const handleItemDoubleClick = useCallback((item: ListItem) => {
    const node = resolvePath(item.id);
    if (node?.type === 'directory') {
      navigateTo(item.id);
    }
  }, [navigateTo]);

  const menus: MenuDefinition[] = [
    {
      label: 'File',
      items: [
        { label: 'New', disabled: true },
        { label: '', separator: true },
        { label: 'Close', onClick: () => {} },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => {} },
        { label: 'Invert Selection', disabled: true },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Large Icons', checked: viewMode === 'large-icons', onClick: () => setViewMode('large-icons') },
        { label: 'Small Icons', checked: viewMode === 'small-icons', onClick: () => setViewMode('small-icons') },
        { label: 'List', checked: viewMode === 'list', onClick: () => setViewMode('list') },
        { label: 'Details', checked: viewMode === 'details', onClick: () => setViewMode('details') },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'About Windows Explorer', onClick: () => {} },
      ],
    },
  ];

  const toolbarItems = [
    { id: 'back', label: 'Back', onClick: handleBack, disabled: historyIndex <= 0 },
    { id: 'forward', label: 'Forward', onClick: handleForward, disabled: historyIndex >= history.length - 1 },
    { id: 'up', label: 'Up', onClick: handleUp, disabled: currentPath === 'C:' },
    { id: 'sep1', separator: true },
    { id: 'large', label: '⊞', onClick: () => setViewMode('large-icons'), active: viewMode === 'large-icons' },
    { id: 'small', label: '⊡', onClick: () => setViewMode('small-icons'), active: viewMode === 'small-icons' },
    { id: 'list', label: '☰', onClick: () => setViewMode('list'), active: viewMode === 'list' },
    { id: 'details', label: '≡', onClick: () => setViewMode('details'), active: viewMode === 'details' },
  ];

  const columns = [
    { key: 'name', label: 'Name', width: 200 },
    { key: 'size', label: 'Size', width: 80 },
    { key: 'type', label: 'Type', width: 150 },
    { key: 'modified', label: 'Modified', width: 120 },
  ];

  const objectCount = listItems.length;
  const selectedNode = selectedItem ? resolvePath(selectedItem) : null;

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <MenuBar menus={menus} />
      <Toolbar98 items={toolbarItems} />

      {/* Address bar */}
      <div className="flex items-center h-[22px] px-[4px] gap-[4px] bg-[var(--win98-button-face)] border-b border-[var(--win98-button-shadow)]">
        <span className="select-none text-[11px]">Address</span>
        <div className="flex-1 h-[18px] flex items-center px-[2px] bg-white border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] text-[11px]">
          {currentPath}
        </div>
      </div>

      {/* Main content: tree + list */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Tree view */}
        <TreeView98
          nodes={treeNodes}
          selectedId={currentPath}
          onSelect={handleTreeSelect}
          className="w-[180px] flex-shrink-0 border-r-0"
        />

        {/* List view */}
        <ListView98
          items={listItems}
          mode={viewMode}
          selectedId={selectedItem}
          onSelect={handleItemSelect}
          onDoubleClick={handleItemDoubleClick}
          columns={columns}
          className="flex-1"
        />
      </div>

      <StatusBar98
        panels={[
          { content: `${objectCount} object(s)` },
          { content: selectedNode?.size ? formatSize(selectedNode.size) : '', width: 100 },
        ]}
      />
    </div>
  );
}
