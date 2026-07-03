// Maps file extensions and well-known EXE names to app ids so Explorer,
// the Run dialog, and desktop icons can open files in the right program.

export const fileAssociations: Record<string, string> = {
  txt: 'notepad',
  log: 'notepad',
  ini: 'notepad',
  bat: 'notepad',
  sys: 'notepad',
  doc: 'wordpad',
  rtf: 'wordpad',
  xls: 'excel',
  ppt: 'powerpoint',
  bmp: 'paint',
  jpg: 'paint',
  jpeg: 'paint',
  gif: 'paint',
  png: 'paint',
  htm: 'ie5',
  html: 'ie5',
  mp3: 'winamp',
  wav: 'sound-recorder',
  mid: 'media-player',
  midi: 'media-player',
  avi: 'media-player',
  mpg: 'media-player',
  mov: 'quicktime',
  rm: 'realplayer',
  zip: 'winzip',
  rar: 'winrar',
  reg: 'regedit',
};

export const exeAppMap: Record<string, string> = {
  'notepad.exe': 'notepad',
  'notepad': 'notepad',
  'calc.exe': 'calculator',
  'calc': 'calculator',
  'mspaint.exe': 'paint',
  'mspaint': 'paint',
  'wordpad.exe': 'wordpad',
  'wordpad': 'wordpad',
  'iexplore.exe': 'ie5',
  'iexplore': 'ie5',
  'explorer.exe': 'explorer',
  'explorer': 'explorer',
  'wmplayer.exe': 'media-player',
  'wmplayer': 'media-player',
  'winamp.exe': 'winamp',
  'winamp': 'winamp',
  'sol.exe': 'solitaire',
  'sol': 'solitaire',
  'winmine.exe': 'minesweeper',
  'winmine': 'minesweeper',
  'freecell.exe': 'freecell',
  'freecell': 'freecell',
  'mshearts.exe': 'hearts',
  'mshearts': 'hearts',
  'command.com': 'msdos',
  'command': 'msdos',
  'cmd': 'msdos',
  'regedit.exe': 'regedit',
  'regedit': 'regedit',
  'taskman.exe': 'task-manager',
  'taskman': 'task-manager',
  'defrag.exe': 'defrag',
  'defrag': 'defrag',
  'scandskw.exe': 'scandisk',
  'scandisk': 'scandisk',
  'charmap.exe': 'character-map',
  'charmap': 'character-map',
  'sndrec32.exe': 'sound-recorder',
  'sndrec32': 'sound-recorder',
  'msconfig': 'sysinfo',
  'winword.exe': 'word97',
  'winword': 'word97',
  'excel.exe': 'excel',
  'excel': 'excel',
  'powerpnt.exe': 'powerpoint',
  'powerpnt': 'powerpoint',
  'pinball.exe': 'pinball',
  'pinball': 'pinball',
};

export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

export function isExecutable(fileName: string): boolean {
  return getExtension(fileName) === 'exe' || getExtension(fileName) === 'com';
}

/** Returns the app id for a file name, checking EXE names first, then extension. */
export function getAppIdForFile(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  if (exeAppMap[lower]) return exeAppMap[lower];
  const ext = getExtension(fileName);
  return fileAssociations[ext] ?? null;
}
