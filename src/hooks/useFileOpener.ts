'use client';

import { useCallback } from 'react';
import { useWindows } from '@/contexts/WindowContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { getAppIdForFile } from '@/lib/fileAssociations';
import { getApp } from '@/lib/appRegistry';
import { normalizePath } from '@/lib/fs/fsOperations';
import { playSound } from '@/lib/sounds';
import { installerSlug, runInstaller } from '@/components/apps/add-remove-programs/installerData';

/** Dispatched when a file has no associated app; SystemDialogs renders it. */
export function showSystemError(title: string, message: string): void {
  playSound('chord');
  window.dispatchEvent(
    new CustomEvent('win98-system-dialog', { detail: { title, message } }),
  );
}

export function useFileOpener() {
  const { openWindow } = useWindows();
  const { getNode } = useFileSystem();

  const openFile = useCallback(
    (path: string): boolean => {
      const normalized = normalizePath(path);
      const node = getNode(normalized);
      if (!node) {
        showSystemError('Windows', `Cannot find the file '${path}'. Make sure the path and filename are correct.`);
        return false;
      }

      if (node.type === 'directory') {
        openWindow('explorer', { launchParams: { filePath: normalized } });
        return true;
      }

      // Downloaded setup files carry `installer:<slug>` content — running one
      // launches the InstallShield wizard instead of a file association.
      const slug = installerSlug(node.content);
      if (slug) {
        runInstaller(slug);
        return true;
      }

      // Program shortcuts carry `app:<appId>` content — the desktop folders
      // under C:\Windows\Desktop are built from these.
      if (node.content?.startsWith('app:')) {
        const shortcutId = node.content.slice(4).trim();
        if (getApp(shortcutId)) {
          openWindow(shortcutId);
          return true;
        }
        showSystemError('Windows', `The item '${node.name}' that this shortcut refers to has been changed or moved.`);
        return false;
      }

      const appId = getAppIdForFile(node.name);
      if (!appId || !getApp(appId)) {
        showSystemError(
          'Windows',
          `Windows cannot open this file:\n\n${node.name}\n\nTo open this file, Windows needs to know what program created it.`,
        );
        return false;
      }

      const appName = getApp(appId)?.defaultWindow.title ?? appId;
      openWindow(appId, {
        title: `${node.name} - ${appName}`,
        launchParams: { filePath: normalized },
      });
      return true;
    },
    [getNode, openWindow],
  );

  return { openFile };
}
