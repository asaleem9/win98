// Installer metadata shared by the InstallShield-style wizard, the Add/Remove
// Programs list, and the file-opener routing. A downloaded "setup" file on the
// virtual disk carries the text content 'installer:<slug>' (written by the
// CNET Download.com page in IE5); running it looks the slug up here.

export interface InstallerInfo {
  slug: string;
  /** Product name shown across the wizard pages. */
  product: string;
  /** Registry app id to (re)install, when the slug maps to a real app. */
  appId?: string;
  /** Period filenames streamed past during the fake copy-progress step. */
  files: string[];
}

export const INSTALLERS: Record<string, InstallerInfo> = {
  winzip: {
    slug: 'winzip',
    product: 'WinZip 7.0',
    appId: 'winzip',
    files: ['WINZIP32.EXE', 'WZ.COM', 'WZSHLEXT.DLL', 'WINZIP.HLP', 'WZSEPE32.EXE', 'README.TXT'],
  },
  'ram-doubler': {
    slug: 'ram-doubler',
    product: 'RAM Doubler 98',
    files: ['RAMDBL.VXD', 'RAMDOUBLER.EXE', 'RAMDBL.HLP', 'SETUP.INF', 'MEMTURBO.DLL'],
  },
  winamp: {
    slug: 'winamp',
    product: 'Winamp 2.5',
    appId: 'winamp',
    files: ['WINAMP.EXE', 'IN_MP3.DLL', 'OUT_WAVE.DLL', 'VIS_NSFS.DLL', 'BASE.BMP', 'WINAMP.HLP'],
  },
  realplayer: {
    slug: 'realplayer',
    product: 'RealPlayer G2',
    appId: 'realplayer',
    files: ['REALPLAY.EXE', 'PNCRT.DLL', 'PNDA.DLL', 'RMASApp.dll', 'SMPDSP.DLL', 'RPNP.DLL'],
  },
  icq: {
    slug: 'icq',
    product: 'ICQ 99a',
    files: ['ICQ.EXE', 'ICQMAPI.DLL', 'ICQ4GAME.DLL', 'SENDMAIL.DLL', 'DBFILES.DAT'],
  },
  bonzibuddy: {
    slug: 'bonzibuddy',
    product: 'BonziBUDDY',
    appId: 'bonzi-buddy',
    files: ['BONZI.EXE', 'BONZI.ACS', 'AGENTCTL.DLL', 'TTS3000.DLL', 'PURPLE.GIF', 'ADWARE.DLL'],
  },
  doom: {
    slug: 'doom',
    product: 'DOOM (Shareware)',
    files: ['DOOM.EXE', 'DOOM1.WAD', 'DEFAULT.CFG', 'MODEM.CFG', 'DOOM.HLP'],
  },
  duke: {
    slug: 'duke',
    product: 'Duke Nukem 3D',
    files: ['DUKE3D.EXE', 'DUKE3D.GRP', 'SETUP.EXE', 'DN3DHELP.EXE', 'CMOS.EXE'],
  },
};

/** Maps Add/Remove Programs list entries to the registry app ids they install. */
export const PROGRAM_APP_IDS: Record<string, string> = {
  realplayer: 'realplayer',
  winzip: 'winzip',
  winrar: 'winrar',
  quicktime: 'quicktime',
  bonzi: 'bonzi-buddy',
};

/** CustomEvent name that opens the InstallShield wizard for a given slug. */
export const INSTALLER_EVENT = 'win98-installer';

/** Fires the global event that InstallerHost turns into a wizard. */
export function runInstaller(slug: string): void {
  window.dispatchEvent(new CustomEvent(INSTALLER_EVENT, { detail: { slug } }));
}

/** Extracts the slug from `installer:<slug>` file content (else null). */
export function installerSlug(content: string | null | undefined): string | null {
  if (!content) return null;
  const match = /^installer:([a-z0-9-]+)/i.exec(content.trim());
  return match ? match[1].toLowerCase() : null;
}

/** Looks up installer metadata for a slug, or null for an unknown slug. */
export function getInstaller(slug: string | null | undefined): InstallerInfo | null {
  if (!slug) return null;
  return INSTALLERS[slug.toLowerCase()] ?? null;
}

/** Returns a copy of `map` with `key` flagged true. */
export function withFlag(map: Record<string, boolean>, key: string): Record<string, boolean> {
  return { ...map, [key]: true };
}

/** Returns a copy of `map` with `key` removed. */
export function withoutFlag(map: Record<string, boolean>, key: string): Record<string, boolean> {
  const next = { ...map };
  delete next[key];
  return next;
}
