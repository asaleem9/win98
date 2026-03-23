import { FSNode } from '@/types/filesystem';

export const virtualFileSystem: FSNode = {
  name: 'C:',
  type: 'directory',
  icon: '/icons/drive-16.svg',
  created: '1998-06-25',
  modified: '1999-03-14',
  children: [
    {
      name: 'My Documents',
      type: 'directory',
      icon: '/icons/my-documents-16.svg',
      created: '1998-06-25',
      modified: '1999-03-10',
      children: [
        {
          name: 'My Pictures',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-07-01',
          modified: '1999-02-14',
          children: [
            { name: 'vacation.bmp', type: 'file', icon: '/icons/image-16.svg', created: '1999-01-15', modified: '1999-01-15', size: 1572864, content: '[Bitmap Image - 1024x768]' },
            { name: 'family.bmp', type: 'file', icon: '/icons/image-16.svg', created: '1999-02-14', modified: '1999-02-14', size: 2359296, content: '[Bitmap Image - 1280x960]' },
          ],
        },
        { name: 'letter.doc', type: 'file', icon: '/icons/doc-16.svg', created: '1999-03-01', modified: '1999-03-10', size: 28672, content: 'Dear Sir/Madam,\n\nI am writing to inform you...' },
        { name: 'budget.xls', type: 'file', icon: '/icons/xls-16.svg', created: '1999-02-20', modified: '1999-03-05', size: 45056, content: '[Excel Spreadsheet]' },
        { name: 'readme.txt', type: 'file', icon: '/icons/txt-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 1024, content: 'Welcome to Windows 98!\n\nThis is your My Documents folder.\nYou can store your personal files here.' },
      ],
    },
    {
      name: 'Program Files',
      type: 'directory',
      icon: '/icons/folder-16.svg',
      created: '1998-06-25',
      modified: '1999-01-20',
      children: [
        {
          name: 'Accessories',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1998-06-25',
          children: [
            { name: 'WORDPAD.EXE', type: 'file', icon: '/icons/exe-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 196608 },
            { name: 'CALC.EXE', type: 'file', icon: '/icons/exe-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 114688 },
            { name: 'MSPAINT.EXE', type: 'file', icon: '/icons/exe-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 344064 },
          ],
        },
        {
          name: 'Internet Explorer',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1999-01-20',
          children: [
            { name: 'IEXPLORE.EXE', type: 'file', icon: '/icons/ie-16.svg', created: '1998-06-25', modified: '1999-01-20', size: 77824 },
            { name: 'CONNECTION WIZARD', type: 'directory', icon: '/icons/folder-16.svg', created: '1998-06-25', modified: '1998-06-25', children: [] },
          ],
        },
        {
          name: 'Windows Media Player',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1998-06-25',
          children: [
            { name: 'WMPLAYER.EXE', type: 'file', icon: '/icons/exe-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 278528 },
          ],
        },
      ],
    },
    {
      name: 'Windows',
      type: 'directory',
      icon: '/icons/folder-16.svg',
      created: '1998-06-25',
      modified: '1999-03-14',
      children: [
        {
          name: 'System',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1999-03-14',
          children: [
            { name: 'KERNEL32.DLL', type: 'file', icon: '/icons/dll-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 413696, readOnly: true },
            { name: 'USER32.DLL', type: 'file', icon: '/icons/dll-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 401408, readOnly: true },
            { name: 'GDI32.DLL', type: 'file', icon: '/icons/dll-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 225280, readOnly: true },
            { name: 'SHELL32.DLL', type: 'file', icon: '/icons/dll-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 1306624, readOnly: true },
            { name: 'ADVAPI32.DLL', type: 'file', icon: '/icons/dll-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 163840, readOnly: true },
          ],
        },
        {
          name: 'Fonts',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1998-06-25',
          children: [
            { name: 'ARIAL.TTF', type: 'file', icon: '/icons/font-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 266076 },
            { name: 'TIMES.TTF', type: 'file', icon: '/icons/font-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 326068 },
            { name: 'COUR.TTF', type: 'file', icon: '/icons/font-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 262740 },
            { name: 'TAHOMA.TTF', type: 'file', icon: '/icons/font-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 288872 },
          ],
        },
        {
          name: 'Desktop',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1999-03-14',
          children: [],
        },
        {
          name: 'Start Menu',
          type: 'directory',
          icon: '/icons/folder-16.svg',
          created: '1998-06-25',
          modified: '1999-01-10',
          children: [
            {
              name: 'Programs',
              type: 'directory',
              icon: '/icons/folder-16.svg',
              created: '1998-06-25',
              modified: '1999-01-10',
              children: [
                { name: 'Accessories', type: 'directory', icon: '/icons/folder-16.svg', created: '1998-06-25', modified: '1998-06-25', children: [] },
                { name: 'Games', type: 'directory', icon: '/icons/folder-16.svg', created: '1998-06-25', modified: '1998-06-25', children: [] },
                { name: 'StartUp', type: 'directory', icon: '/icons/folder-16.svg', created: '1998-06-25', modified: '1998-06-25', children: [] },
              ],
            },
          ],
        },
        { name: 'NOTEPAD.EXE', type: 'file', icon: '/icons/notepad-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 53248 },
        { name: 'EXPLORER.EXE', type: 'file', icon: '/icons/explorer-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 204800 },
        { name: 'WIN.INI', type: 'file', icon: '/icons/ini-16.svg', created: '1998-06-25', modified: '1999-03-14', size: 2048, content: '[windows]\nload=\nrun=\nNullPort=None\n\n[Desktop]\nWallpaper=(None)\nTileWallpaper=0' },
        { name: 'SYSTEM.INI', type: 'file', icon: '/icons/ini-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 1536, content: '[boot]\nshell=Explorer.exe\nsystem.drv=system.drv\ndrivers=mmsystem.dll' },
      ],
    },
    {
      name: 'TEMP',
      type: 'directory',
      icon: '/icons/folder-16.svg',
      created: '1998-06-25',
      modified: '1999-03-14',
      children: [],
    },
    { name: 'AUTOEXEC.BAT', type: 'file', icon: '/icons/bat-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 512, content: '@ECHO OFF\nPROMPT $p$g\nSET TEMP=C:\\TEMP\nSET TMP=C:\\TEMP\nPATH C:\\WINDOWS;C:\\WINDOWS\\COMMAND' },
    { name: 'CONFIG.SYS', type: 'file', icon: '/icons/sys-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 256, content: 'DEVICE=C:\\WINDOWS\\HIMEM.SYS\nDEVICE=C:\\WINDOWS\\EMM386.EXE\nDOS=HIGH,UMB\nFILES=60\nBUFFERS=40' },
    { name: 'IO.SYS', type: 'file', icon: '/icons/sys-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 222390, readOnly: true },
    { name: 'MSDOS.SYS', type: 'file', icon: '/icons/sys-16.svg', created: '1998-06-25', modified: '1998-06-25', size: 1536, readOnly: true },
  ],
};

export function resolvePath(path: string): FSNode | null {
  const normalized = path.replace(/\//g, '\\').replace(/\\+$/, '');
  if (normalized === 'C:' || normalized === 'C:\\') return virtualFileSystem;

  const parts = normalized.replace(/^C:\\?/i, '').split('\\').filter(Boolean);
  let current = virtualFileSystem;

  for (const part of parts) {
    if (current.type !== 'directory' || !current.children) return null;
    const child = current.children.find(
      (c) => c.name.toLowerCase() === part.toLowerCase(),
    );
    if (!child) return null;
    current = child;
  }

  return current;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  const kb = Math.round(bytes / 1024);
  if (kb < 1024) return `${kb.toLocaleString()}KB`;
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `${mb}MB`;
}

export function getParentPath(path: string): string {
  const normalized = path.replace(/\//g, '\\').replace(/\\+$/, '');
  const lastSlash = normalized.lastIndexOf('\\');
  if (lastSlash <= 2) return 'C:\\';
  return normalized.substring(0, lastSlash);
}
