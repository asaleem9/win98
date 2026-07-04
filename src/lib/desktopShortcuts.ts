// Program shortcut folders seeded onto C:\Windows\Desktop. Each shortcut is a
// small file whose content is `app:<appId>`; useFileOpener routes those to
// openWindow, so the folders work from the desktop, Explorer, Find, and DOS.
//
// This manifest intentionally duplicates (id, name, icon) from the registry
// instead of importing it: appRegistry pulls in every lazy component, and the
// component tree imports FileSystemContext, which imports the seed — importing
// the registry from here would close that cycle. A test keeps the two in sync
// (src/lib/__tests__/desktopShortcuts.test.ts).

import { FSNode } from '@/types/filesystem';

export interface AppShortcut {
  name: string;
  appId: string;
  icon: string;
}

export const DESKTOP_APP_FOLDERS: Record<string, AppShortcut[]> = {
  'Accessories': [
    { name: 'Calculator', appId: 'calculator', icon: '/icons/calculator-16.svg' },
    { name: 'Character Map', appId: 'character-map', icon: '/icons/charmap-16.svg' },
    { name: 'HyperTerminal', appId: 'hyperterminal', icon: '/icons/hyperterminal-16.svg' },
    { name: 'Notepad', appId: 'notepad', icon: '/icons/notepad-16.svg' },
    { name: 'Paint', appId: 'paint', icon: '/icons/paint-16.svg' },
    { name: 'Phone Dialer', appId: 'phone-dialer', icon: '/icons/phone-dialer-16.svg' },
    { name: 'Sound Recorder', appId: 'sound-recorder', icon: '/icons/soundrec-16.svg' },
    { name: 'WordPad', appId: 'wordpad', icon: '/icons/wordpad-16.svg' },
  ],
  'Games': [
    { name: '3D Pinball', appId: 'pinball', icon: '/icons/pinball-16.svg' },
    { name: 'Age of Empires II', appId: 'age-of-empires-2', icon: '/icons/aoe2-16.svg' },
    { name: 'Bunker 98', appId: 'bunker-98', icon: '/icons/bunker98-16.svg' },
    { name: 'C&C Red Alert', appId: 'command-conquer', icon: '/icons/cnc-16.svg' },
    { name: 'Diablo II', appId: 'diablo-2', icon: '/icons/diablo2-16.svg' },
    { name: 'FreeCell', appId: 'freecell', icon: '/icons/freecell-16.svg' },
    { name: 'Hearts', appId: 'hearts', icon: '/icons/hearts-16.svg' },
    { name: 'Minesweeper', appId: 'minesweeper', icon: '/icons/minesweeper-16.svg' },
    { name: 'Oregon Trail', appId: 'oregon-trail', icon: '/icons/oregon-trail-16.svg' },
    { name: 'RollerCoaster Tycoon', appId: 'rollercoaster-tycoon', icon: '/icons/rct-16.svg' },
    { name: 'SimCity 2000', appId: 'simcity', icon: '/icons/simcity-16.svg' },
    { name: 'SkiFree', appId: 'skifree', icon: '/icons/skifree-16.svg' },
    { name: 'Solitaire', appId: 'solitaire', icon: '/icons/solitaire-16.svg' },
    { name: 'StarCraft', appId: 'starcraft', icon: '/icons/starcraft-16.svg' },
    { name: "Tony Hawk's Pro Skater 2", appId: 'tony-hawk-2', icon: '/icons/thps2-16.svg' },
  ],
  'Internet': [
    { name: 'AIM', appId: 'aim', icon: '/icons/aim-16.svg' },
    { name: 'AOL', appId: 'aol', icon: '/icons/aol-16.svg' },
    { name: 'BonziBUDDY', appId: 'bonzi-buddy', icon: '/icons/bonzi-16.svg' },
    { name: 'ICQ', appId: 'icq', icon: '/icons/icq-16.svg' },
    { name: 'Internet Explorer', appId: 'ie5', icon: '/icons/ie-16.svg' },
    { name: 'LimeWire', appId: 'limewire', icon: '/icons/limewire-16.svg' },
    { name: 'mIRC', appId: 'mirc', icon: '/icons/mirc-16.svg' },
    { name: 'Napster', appId: 'napster', icon: '/icons/napster-16.svg' },
    { name: 'Outlook Express', appId: 'outlook-express', icon: '/icons/outlook-16.svg' },
  ],
  'Multimedia': [
    { name: 'CD Player', appId: 'cd-player', icon: '/icons/cd-player-16.svg' },
    { name: 'Encyclopedia 98', appId: 'encarta', icon: '/icons/encarta-16.svg' },
    { name: 'QuickTime Player', appId: 'quicktime', icon: '/icons/quicktime-16.svg' },
    { name: 'RealPlayer', appId: 'realplayer', icon: '/icons/realplayer-16.svg' },
    { name: 'Volume Control', appId: 'volume-control', icon: '/icons/volume-16.svg' },
    { name: 'Winamp', appId: 'winamp', icon: '/icons/winamp-16.svg' },
    { name: 'Windows Media Player', appId: 'media-player', icon: '/icons/mediaplayer-16.svg' },
  ],
  'Office': [
    { name: 'Adobe Photoshop', appId: 'photoshop5', icon: '/icons/photoshop-16.svg' },
    { name: 'Macromedia Flash', appId: 'flash', icon: '/icons/flash-16.svg' },
    { name: 'Microsoft Excel', appId: 'excel', icon: '/icons/excel-16.svg' },
    { name: 'Microsoft FrontPage', appId: 'frontpage', icon: '/icons/frontpage-16.svg' },
    { name: 'Microsoft PowerPoint', appId: 'powerpoint', icon: '/icons/powerpoint-16.svg' },
    { name: 'Microsoft Word', appId: 'word97', icon: '/icons/word-16.svg' },
    { name: 'Visual Basic 6', appId: 'vb6', icon: '/icons/vb6-16.svg' },
  ],
  'System Tools': [
    { name: 'Add-Remove Programs', appId: 'add-remove-programs', icon: '/icons/addremove-16.svg' },
    { name: 'Control Panel', appId: 'control-panel', icon: '/icons/control-panel-16.svg' },
    { name: 'Device Manager', appId: 'device-manager', icon: '/icons/devmgr-16.svg' },
    { name: 'DirectX Diagnostics', appId: 'dxdiag', icon: '/icons/dxdiag-16.svg' },
    { name: 'Disk Defragmenter', appId: 'defrag', icon: '/icons/defrag-16.svg' },
    { name: 'Display Properties', appId: 'display-properties', icon: '/icons/display-16.svg' },
    { name: 'Find Files or Folders', appId: 'find-files', icon: '/icons/find-16.svg' },
    { name: 'Mouse Properties', appId: 'mouse-properties', icon: '/icons/mouse-16.svg' },
    { name: 'MS-DOS Prompt', appId: 'msdos', icon: '/icons/msdos-16.svg' },
    { name: 'My Computer', appId: 'my-computer', icon: '/icons/my-computer-16.svg' },
    { name: 'My Documents', appId: 'my-documents', icon: '/icons/my-documents-16.svg' },
    { name: 'Network Neighborhood', appId: 'network-neighborhood', icon: '/icons/network-16.svg' },
    { name: 'Printers', appId: 'printers', icon: '/icons/printer-16.svg' },
    { name: 'Recycle Bin', appId: 'recycle-bin', icon: '/icons/recycle-bin-16.svg' },
    { name: 'Regional Settings', appId: 'regional-settings', icon: '/icons/settings-16.svg' },
    { name: 'Registry Editor', appId: 'regedit', icon: '/icons/regedit-16.svg' },
    { name: 'ScanDisk', appId: 'scandisk', icon: '/icons/scandisk-16.svg' },
    { name: 'Sounds Properties', appId: 'sounds-properties', icon: '/icons/volume-16.svg' },
    { name: 'System Information', appId: 'sysinfo', icon: '/icons/sysinfo-16.svg' },
    { name: 'Task Manager', appId: 'task-manager', icon: '/icons/taskman-16.svg' },
    { name: 'Windows Explorer', appId: 'explorer', icon: '/icons/explorer-16.svg' },
    { name: 'Windows Help', appId: 'help', icon: '/icons/find-16.svg' },
  ],
  'Utilities': [
    { name: 'Nero Burning ROM', appId: 'nero', icon: '/icons/nero-16.svg' },
    { name: 'Norton AntiVirus', appId: 'norton', icon: '/icons/norton-16.svg' },
    { name: 'WinRAR', appId: 'winrar', icon: '/icons/winrar-16.svg' },
    { name: 'WinZip', appId: 'winzip', icon: '/icons/winzip-16.svg' },
  ],
};

/** Every shortcut across all folders, for sync tests and tooling. */
export function allDesktopShortcuts(): AppShortcut[] {
  return Object.values(DESKTOP_APP_FOLDERS).flat();
}

/** The seeded folder nodes that live on C:\Windows\Desktop. */
export function buildDesktopAppFolders(): FSNode[] {
  return Object.entries(DESKTOP_APP_FOLDERS).map(([folder, shortcuts]) => ({
    name: folder,
    type: 'directory' as const,
    icon: '/icons/folder-16.svg',
    created: '1998-06-25',
    modified: '1998-06-25',
    children: shortcuts.map((s) => ({
      name: s.name,
      type: 'file' as const,
      icon: s.icon,
      created: '1998-06-25',
      modified: '1998-06-25',
      size: 64,
      content: `app:${s.appId}`,
    })),
  }));
}
