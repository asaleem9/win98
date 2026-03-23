// Win98 color palette
export const WIN98_COLORS = {
  bg: '#c0c0c0',
  desktop: '#008080',
  windowBg: '#c0c0c0',
  windowText: '#000000',
  titlebarActiveStart: '#000080',
  titlebarActiveEnd: '#1084d0',
  titlebarInactiveStart: '#808080',
  titlebarInactiveEnd: '#b0b0b0',
  highlight: '#000080',
  highlightText: '#ffffff',
  buttonFace: '#c0c0c0',
  buttonHighlight: '#ffffff',
  buttonLight: '#dfdfdf',
  buttonShadow: '#808080',
  buttonDarkShadow: '#000000',
  inputBg: '#ffffff',
  tooltipBg: '#ffffe1',
  bsodBg: '#0000aa',
  bsodText: '#ffffff',
  link: '#0000ff',
  linkVisited: '#800080',
  startGreen: '#008000',
  minesweeperRed: '#ff0000',
  disabledText: '#808080',
} as const;

// Default system specs (shown in System Information, POST screen, etc.)
export const SYSTEM_SPECS = {
  os: 'Microsoft Windows 98 [Version 4.10.1998]',
  processor: 'Intel Pentium II 450MHz',
  ram: '128 MB',
  ramBytes: 131072,
  hardDisk: '6.4 GB',
  hardDiskFree: '2.1 GB',
  display: 'NVIDIA Riva TNT2 (16MB)',
  sound: 'Creative Sound Blaster Live!',
  modem: 'US Robotics 56K Faxmodem',
  monitor: 'Plug and Play Monitor',
  cdrom: 'ATAPI CD-ROM 52X',
  bios: 'Award Modular BIOS v4.51PG',
  resolution: '1024x768',
  colorDepth: '16-bit (65536 colors)',
} as const;

// Desktop icon grid settings
export const DESKTOP_GRID = {
  cellWidth: 75,
  cellHeight: 75,
  paddingX: 10,
  paddingY: 10,
  columns: 2,
} as const;

// Window manager settings
export const WINDOW_DEFAULTS = {
  cascadeOffsetX: 30,
  cascadeOffsetY: 30,
  cascadeStartX: 50,
  cascadeStartY: 50,
  minVisibleTitlebar: 50,
  taskbarHeight: 28,
  titlebarHeight: 18,
} as const;

// Screen saver timeout in milliseconds
export const SCREENSAVER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Default desktop icons (appIds)
export const DEFAULT_DESKTOP_ICONS = [
  'my-computer',
  'my-documents',
  'recycle-bin',
  'ie5',
  'network-neighborhood',
  'notepad',
  'minesweeper',
] as const;

// Start menu structure paths
export const START_MENU_CATEGORIES = {
  programs: 'Programs',
  accessories: 'Accessories',
  games: 'Games',
  internetTools: 'Internet Tools',
  multimedia: 'Multimedia',
  systemTools: 'System Tools',
  startup: 'StartUp',
} as const;
