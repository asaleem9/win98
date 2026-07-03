// Pure helpers for building the Processes tab: mapping windows to plausible
// exe names, mixing in static system processes, and wiggling mem/cpu each tick.

export interface WindowProcessSource {
  id: string;
  appId: string;
  title: string;
}

export interface ProcessInfo {
  key: string;
  pid: number;
  name: string;
  mem: number;
  cpu: number;
  isWindow: boolean;
  windowId?: string;
}

interface SystemProcessSeed {
  name: string;
  pid: number;
  mem: number;
  cpu: number;
  protected?: boolean;
}

const APP_EXE_MAP: Record<string, string> = {
  explorer: 'EXPLORER.EXE',
  'my-computer': 'EXPLORER.EXE',
  'my-documents': 'EXPLORER.EXE',
  'network-neighborhood': 'EXPLORER.EXE',
  'recycle-bin': 'EXPLORER.EXE',
  'find-files': 'RUNDLL32.EXE',
  'control-panel': 'CONTROL.EXE',
  'display-properties': 'RUNDLL32.EXE',
  'device-manager': 'RUNDLL32.EXE',
  'add-remove-programs': 'RUNDLL32.EXE',
  notepad: 'NOTEPAD.EXE',
  wordpad: 'WORDPAD.EXE',
  paint: 'MSPAINT.EXE',
  calculator: 'CALC.EXE',
  minesweeper: 'WINMINE.EXE',
  solitaire: 'SOL.EXE',
  freecell: 'FREECELL.EXE',
  hearts: 'MSHEARTS.EXE',
  pinball: 'PINBALL.EXE',
  'media-player': 'MPLAYER2.EXE',
  'sound-recorder': 'SNDREC32.EXE',
  'volume-control': 'SNDVOL32.EXE',
  winamp: 'WINAMP.EXE',
  realplayer: 'REALPLAY.EXE',
  napster: 'NAPSTER.EXE',
  limewire: 'LIMEWIRE.EXE',
  aim: 'AIM.EXE',
  aol: 'WAOL.EXE',
  ie5: 'IEXPLORE.EXE',
  'outlook-express': 'MSIMN.EXE',
  frontpage: 'FRONTPG.EXE',
  word97: 'WINWORD.EXE',
  excel: 'EXCEL.EXE',
  powerpoint: 'POWERPNT.EXE',
  vb6: 'VB6.EXE',
  photoshop5: 'PHOTOSHP.EXE',
  nero: 'NERO.EXE',
  winrar: 'WINRAR.EXE',
  winzip: 'WINZIP32.EXE',
  norton: 'NAVW32.EXE',
  'task-manager': 'TASKMGR.EXE',
  regedit: 'REGEDIT.EXE',
  defrag: 'DEFRAG.EXE',
  scandisk: 'SCANDSKW.EXE',
  sysinfo: 'MSINFO32.EXE',
  'character-map': 'CHARMAP.EXE',
  help: 'WINHLP32.EXE',
  msdos: 'COMMAND.COM',
  'bonzi-buddy': 'BONZI.EXE',
  flash: 'RUNDLL32.EXE',
  quicktime: 'QTPLAYER.EXE',
  'diablo-2': 'DIABLO2.EXE',
  starcraft: 'STARCRAFT.EXE',
  'command-conquer': 'GAME.EXE',
  'age-of-empires-2': 'AOE2.EXE',
  'rollercoaster-tycoon': 'RCT.EXE',
  simcity: 'SIMCITY.EXE',
  'oregon-trail': 'OREGON.EXE',
  'tony-hawk-2': 'THPS2.EXE',
};

/** Static "OS" processes that always show up, independent of open windows. */
export const SYSTEM_PROCESSES: SystemProcessSeed[] = [
  { name: 'KERNEL32.DLL', pid: 4, mem: 1520, cpu: 1, protected: true },
  { name: 'MMTASK.TSK', pid: 256, mem: 960, cpu: 0 },
  { name: 'EXPLORER.EXE', pid: 1024, mem: 8432, cpu: 2 },
  { name: 'SYSTRAY.EXE', pid: 1056, mem: 2104, cpu: 0 },
  { name: 'RNAAPP.EXE', pid: 1280, mem: 2560, cpu: 0 },
  { name: 'MSGSRV32.EXE', pid: 512, mem: 3208, cpu: 0 },
  { name: 'MPREXE.EXE', pid: 768, mem: 1840, cpu: 0 },
  { name: 'SPOOL32.EXE', pid: 1536, mem: 4096, cpu: 1 },
  { name: 'IOS.VXD', pid: 6, mem: 640, cpu: 0 },
  { name: 'VSHARE.386', pid: 8, mem: 384, cpu: 0 },
];

/** Names of processes Windows won't let you kill without a "consequence". */
export const PROTECTED_PROCESS_NAMES = new Set(
  SYSTEM_PROCESSES.filter((p) => p.protected).map((p) => p.name),
);

/** Every static process is "system" and refuses End Process (except the gag one). */
export function isSystemProcessName(name: string): boolean {
  return SYSTEM_PROCESSES.some((p) => p.name === name);
}

export function exeNameForApp(appId: string): string {
  if (APP_EXE_MAP[appId]) return APP_EXE_MAP[appId];
  const cleaned = appId.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return `${cleaned || 'APP'}.EXE`;
}

/** Deterministic-ish small hash so the same window keeps the same fake PID. */
export function pidFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return 1100 + (h % 8900);
}

/** Clamped random walk — used to make mem/cpu numbers wiggle every tick. */
export function wiggleValue(current: number, min: number, max: number, amplitude: number): number {
  const delta = (Math.random() - 0.5) * amplitude;
  return Math.max(min, Math.min(max, Math.round(current + delta)));
}

export function buildProcessList(
  windows: WindowProcessSource[],
  previous: ProcessInfo[],
): ProcessInfo[] {
  const prevByKey = new Map(previous.map((p) => [p.key, p]));

  const windowRows: ProcessInfo[] = windows.map((w) => {
    const key = `win:${w.id}`;
    const prev = prevByKey.get(key);
    const baseMem = prev?.mem ?? 3000 + (pidFromString(w.appId) % 12000);
    const baseCpu = prev?.cpu ?? pidFromString(w.id) % 6;
    return {
      key,
      pid: pidFromString(w.id),
      name: exeNameForApp(w.appId),
      mem: wiggleValue(baseMem, 500, 90000, 500),
      cpu: wiggleValue(baseCpu, 0, 35, 6),
      isWindow: true,
      windowId: w.id,
    };
  });

  const systemRows: ProcessInfo[] = SYSTEM_PROCESSES.map((sp) => {
    const key = `sys:${sp.name}`;
    const prev = prevByKey.get(key);
    return {
      key,
      pid: sp.pid,
      name: sp.name,
      mem: wiggleValue(prev?.mem ?? sp.mem, Math.max(100, sp.mem - 600), sp.mem + 900, 60),
      cpu: wiggleValue(prev?.cpu ?? sp.cpu, 0, 20, 3),
      isWindow: false,
    };
  });

  return [...windowRows, ...systemRows];
}

export function totalCpu(rows: ProcessInfo[]): number {
  const sum = rows.reduce((s, p) => s + p.cpu, 0);
  return Math.min(100, Math.round(sum / Math.max(1, rows.length) + rows.length * 0.4));
}

export function totalMemKB(rows: ProcessInfo[]): number {
  return rows.reduce((s, p) => s + p.mem, 0);
}
