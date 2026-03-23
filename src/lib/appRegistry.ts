import { lazy } from 'react';
import { AppDefinition } from '@/types/app';
import { setAppRegistry } from '@/hooks/useWindowManager';

// Placeholder app for apps not yet implemented
const PlaceholderApp = lazy(() => import('@/components/apps/placeholder/PlaceholderApp'));

// Real implementations
const DiskDefragmenter = lazy(() => import('@/components/apps/defrag/DiskDefragmenter'));
const TaskManagerApp = lazy(() => import('@/components/apps/task-manager/TaskManager'));
const RegistryEditor = lazy(() => import('@/components/apps/regedit/RegistryEditor'));
const DisplayProperties = lazy(() => import('@/components/apps/display-properties/DisplayProperties'));
const InternetExplorer = lazy(() => import('@/components/apps/ie5/InternetExplorer'));
const AOL = lazy(() => import('@/components/apps/aol/AOL'));
const AIM = lazy(() => import('@/components/apps/aim/AIM'));
const WinampApp = lazy(() => import('@/components/apps/winamp/Winamp'));
const NapsterApp = lazy(() => import('@/components/apps/napster/Napster'));
const NotepadApp = lazy(() => import('@/components/apps/notepad/Notepad'));
const CalculatorApp = lazy(() => import('@/components/apps/calculator/Calculator'));
const PaintApp = lazy(() => import('@/components/apps/paint/Paint'));
const MinesweeperApp = lazy(() => import('@/components/apps/minesweeper/Minesweeper'));
const MSDOSApp = lazy(() => import('@/components/apps/msdos/MSDOSPrompt'));
const ExplorerApp = lazy(() => import('@/components/apps/explorer/Explorer'));
const Word97App = lazy(() => import('@/components/apps/word97/Word97'));
const ExcelApp = lazy(() => import('@/components/apps/excel/Excel'));
const PowerPointApp = lazy(() => import('@/components/apps/powerpoint/PowerPoint'));
const Photoshop5App = lazy(() => import('@/components/apps/photoshop5/Photoshop5'));
const MacromediaFlashApp = lazy(() => import('@/components/apps/flash/MacromediaFlash'));
const FrontPageApp = lazy(() => import('@/components/apps/frontpage/FrontPage'));
const VisualBasic6App = lazy(() => import('@/components/apps/vb6/VisualBasic6'));

const apps: Record<string, AppDefinition> = {
  'notepad': {
    id: 'notepad',
    name: 'Notepad',
    icon: '/icons/notepad-32.svg',
    icon16: '/icons/notepad-16.svg',
    category: 'accessories',
    component: NotepadApp,
    defaultWindow: { title: 'Untitled - Notepad', width: 500, height: 400, minWidth: 250, minHeight: 200 },
    startMenuPath: ['Programs', 'Accessories'],
    desktopIcon: true,
    singleton: false,
  },
  'calculator': {
    id: 'calculator',
    name: 'Calculator',
    icon: '/icons/calculator-32.svg',
    icon16: '/icons/calculator-16.svg',
    category: 'accessories',
    component: CalculatorApp,
    defaultWindow: { title: 'Calculator', width: 260, height: 300, minWidth: 260, minHeight: 300 },
    startMenuPath: ['Programs', 'Accessories'],
    singleton: true,
  },
  'paint': {
    id: 'paint',
    name: 'Paint',
    icon: '/icons/paint-32.svg',
    icon16: '/icons/paint-16.svg',
    category: 'accessories',
    component: PaintApp,
    defaultWindow: { title: 'untitled - Paint', width: 600, height: 480, minWidth: 300, minHeight: 250 },
    startMenuPath: ['Programs', 'Accessories'],
    singleton: true,
  },
  'minesweeper': {
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: '/icons/minesweeper-32.svg',
    icon16: '/icons/minesweeper-16.svg',
    category: 'games',
    component: MinesweeperApp,
    defaultWindow: { title: 'Minesweeper', width: 200, height: 260, minWidth: 200, minHeight: 260 },
    startMenuPath: ['Programs', 'Games'],
    desktopIcon: true,
    singleton: true,
  },
  'solitaire': {
    id: 'solitaire',
    name: 'Solitaire',
    icon: '/icons/solitaire-32.svg',
    icon16: '/icons/solitaire-16.svg',
    category: 'games',
    component: PlaceholderApp,
    defaultWindow: { title: 'Solitaire', width: 580, height: 440, minWidth: 400, minHeight: 300 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'msdos': {
    id: 'msdos',
    name: 'MS-DOS Prompt',
    icon: '/icons/msdos-32.svg',
    icon16: '/icons/msdos-16.svg',
    category: 'system',
    component: MSDOSApp,
    defaultWindow: { title: 'MS-DOS Prompt', width: 520, height: 340, minWidth: 320, minHeight: 200 },
    startMenuPath: ['Programs'],
    singleton: false,
  },
  'explorer': {
    id: 'explorer',
    name: 'Windows Explorer',
    icon: '/icons/explorer-32.svg',
    icon16: '/icons/explorer-16.svg',
    category: 'system',
    component: ExplorerApp,
    defaultWindow: { title: 'Exploring - C:\\', width: 640, height: 480, minWidth: 350, minHeight: 250 },
    startMenuPath: ['Programs'],
    singleton: false,
  },
  'ie5': {
    id: 'ie5',
    name: 'Internet Explorer',
    icon: '/icons/ie-32.svg',
    icon16: '/icons/ie-16.svg',
    category: 'internet',
    component: InternetExplorer,
    defaultWindow: { title: 'Microsoft Internet Explorer', width: 700, height: 500, minWidth: 400, minHeight: 300 },
    startMenuPath: ['Programs'],
    desktopIcon: true,
    quickLaunch: true,
    singleton: false,
  },
  'my-computer': {
    id: 'my-computer',
    name: 'My Computer',
    icon: '/icons/my-computer-32.svg',
    icon16: '/icons/my-computer-16.svg',
    category: 'system',
    component: PlaceholderApp,
    defaultWindow: { title: 'My Computer', width: 500, height: 400, minWidth: 300, minHeight: 250 },
    desktopIcon: true,
    singleton: true,
  },
  'my-documents': {
    id: 'my-documents',
    name: 'My Documents',
    icon: '/icons/my-documents-32.svg',
    icon16: '/icons/my-documents-16.svg',
    category: 'system',
    component: PlaceholderApp,
    defaultWindow: { title: 'My Documents', width: 500, height: 400, minWidth: 300, minHeight: 250 },
    desktopIcon: true,
    singleton: true,
  },
  'recycle-bin': {
    id: 'recycle-bin',
    name: 'Recycle Bin',
    icon: '/icons/recycle-bin-32.svg',
    icon16: '/icons/recycle-bin-16.svg',
    category: 'system',
    component: PlaceholderApp,
    defaultWindow: { title: 'Recycle Bin', width: 400, height: 300, minWidth: 250, minHeight: 200 },
    desktopIcon: true,
    singleton: true,
  },
  'network-neighborhood': {
    id: 'network-neighborhood',
    name: 'Network Neighborhood',
    icon: '/icons/network-32.svg',
    icon16: '/icons/network-16.svg',
    category: 'system',
    component: PlaceholderApp,
    defaultWindow: { title: 'Network Neighborhood', width: 500, height: 400, minWidth: 300, minHeight: 250 },
    desktopIcon: true,
    singleton: true,
  },
  'aol': {
    id: 'aol',
    name: 'AOL',
    icon: '/icons/aol-32.svg',
    icon16: '/icons/aol-16.svg',
    category: 'internet',
    component: AOL,
    defaultWindow: { title: 'America Online', width: 640, height: 480, minWidth: 400, minHeight: 300 },
    startMenuPath: ['Programs', 'Internet Tools'],
    singleton: true,
  },
  'aim': {
    id: 'aim',
    name: 'AIM',
    icon: '/icons/aim-32.svg',
    icon16: '/icons/aim-16.svg',
    category: 'internet',
    component: AIM,
    defaultWindow: { title: 'AIM Buddy List', width: 200, height: 400, minWidth: 150, minHeight: 250 },
    startMenuPath: ['Programs', 'Internet Tools'],
    quickLaunch: true,
    singleton: true,
  },
  'winamp': {
    id: 'winamp',
    name: 'Winamp',
    icon: '/icons/winamp-32.svg',
    icon16: '/icons/winamp-16.svg',
    category: 'multimedia',
    component: WinampApp,
    defaultWindow: { title: 'Winamp', width: 275, height: 260, minWidth: 275, minHeight: 140 },
    startMenuPath: ['Programs', 'Multimedia'],
    quickLaunch: true,
    singleton: true,
  },
  'word97': {
    id: 'word97',
    name: 'Microsoft Word',
    icon: '/icons/word-32.svg',
    icon16: '/icons/word-16.svg',
    category: 'productivity',
    component: Word97App,
    defaultWindow: { title: 'Document1 - Microsoft Word', width: 700, height: 500, minWidth: 400, minHeight: 300 },
    startMenuPath: ['Programs'],
    singleton: true,
  },
  'excel': {
    id: 'excel',
    name: 'Microsoft Excel',
    icon: '/icons/excel-32.svg',
    icon16: '/icons/excel-16.svg',
    category: 'productivity',
    component: ExcelApp,
    defaultWindow: { title: 'Book1 - Microsoft Excel', width: 700, height: 500, minWidth: 400, minHeight: 300 },
    startMenuPath: ['Programs'],
    singleton: true,
  },
  'control-panel': {
    id: 'control-panel',
    name: 'Control Panel',
    icon: '/icons/control-panel-32.svg',
    icon16: '/icons/control-panel-16.svg',
    category: 'system',
    component: PlaceholderApp,
    defaultWindow: { title: 'Control Panel', width: 500, height: 400, minWidth: 300, minHeight: 250 },
    startMenuPath: ['Settings'],
    singleton: true,
  },
  'defrag': {
    id: 'defrag',
    name: 'Disk Defragmenter',
    icon: '/icons/defrag-32.svg',
    icon16: '/icons/defrag-16.svg',
    category: 'system',
    component: DiskDefragmenter,
    defaultWindow: { title: 'Disk Defragmenter', width: 500, height: 400, minWidth: 400, minHeight: 300 },
    startMenuPath: ['Programs', 'Accessories', 'System Tools'],
    singleton: true,
  },
  'task-manager': {
    id: 'task-manager',
    name: 'Task Manager',
    icon: '/icons/taskman-32.svg',
    icon16: '/icons/taskman-16.svg',
    category: 'system',
    component: TaskManagerApp,
    defaultWindow: { title: 'Windows Task Manager', width: 400, height: 350, minWidth: 300, minHeight: 250 },
    singleton: true,
  },
  'regedit': {
    id: 'regedit',
    name: 'Registry Editor',
    icon: '/icons/regedit-32.svg',
    icon16: '/icons/regedit-16.svg',
    category: 'system',
    component: RegistryEditor,
    defaultWindow: { title: 'Registry Editor', width: 600, height: 400, minWidth: 400, minHeight: 250 },
    startMenuPath: ['Programs', 'Accessories', 'System Tools'],
    singleton: true,
  },
  'display-properties': {
    id: 'display-properties',
    name: 'Display Properties',
    icon: '/icons/display-32.svg',
    icon16: '/icons/display-16.svg',
    category: 'system',
    component: DisplayProperties,
    defaultWindow: { title: 'Display Properties', width: 400, height: 440, minWidth: 380, minHeight: 400, resizable: false },
    startMenuPath: ['Settings', 'Control Panel'],
    singleton: true,
  },
  'napster': {
    id: 'napster',
    name: 'Napster',
    icon: '/icons/napster-32.svg',
    icon16: '/icons/napster-16.svg',
    category: 'internet',
    component: NapsterApp,
    defaultWindow: { title: 'Napster', width: 550, height: 400, minWidth: 400, minHeight: 300 },
    startMenuPath: ['Programs', 'Internet Tools'],
    singleton: true,
  },
  'powerpoint': {
    id: 'powerpoint',
    name: 'Microsoft PowerPoint',
    icon: '/icons/powerpoint-32.svg',
    icon16: '/icons/powerpoint-16.svg',
    category: 'productivity',
    component: PowerPointApp,
    defaultWindow: { title: 'Presentation1 - Microsoft PowerPoint', width: 750, height: 550, minWidth: 500, minHeight: 400 },
    startMenuPath: ['Programs'],
    singleton: true,
  },
  'photoshop5': {
    id: 'photoshop5',
    name: 'Adobe Photoshop',
    icon: '/icons/photoshop-32.svg',
    icon16: '/icons/photoshop-16.svg',
    category: 'productivity',
    component: Photoshop5App,
    defaultWindow: { title: 'Adobe Photoshop', width: 800, height: 600, minWidth: 600, minHeight: 400 },
    startMenuPath: ['Programs'],
    singleton: true,
  },
  'flash': {
    id: 'flash',
    name: 'Macromedia Flash',
    icon: '/icons/flash-32.svg',
    icon16: '/icons/flash-16.svg',
    category: 'productivity',
    component: MacromediaFlashApp,
    defaultWindow: { title: 'Macromedia Flash 5', width: 800, height: 600, minWidth: 600, minHeight: 400 },
    startMenuPath: ['Programs'],
    singleton: true,
  },
  'frontpage': {
    id: 'frontpage',
    name: 'Microsoft FrontPage',
    icon: '/icons/frontpage-32.svg',
    icon16: '/icons/frontpage-16.svg',
    category: 'productivity',
    component: FrontPageApp,
    defaultWindow: { title: 'FrontPage Editor', width: 700, height: 500, minWidth: 400, minHeight: 300 },
    startMenuPath: ['Programs'],
    singleton: true,
  },
  'vb6': {
    id: 'vb6',
    name: 'Visual Basic 6',
    icon: '/icons/vb6-32.svg',
    icon16: '/icons/vb6-16.svg',
    category: 'productivity',
    component: VisualBasic6App,
    defaultWindow: { title: 'Microsoft Visual Basic [design]', width: 800, height: 600, minWidth: 600, minHeight: 400 },
    startMenuPath: ['Programs'],
    singleton: true,
  },
};

// Initialize the window manager with the registry
setAppRegistry(apps);

export function getApp(appId: string): AppDefinition | undefined {
  return apps[appId];
}

export function getAllApps(): AppDefinition[] {
  return Object.values(apps);
}

export function getAppsByCategory(category: string): AppDefinition[] {
  return Object.values(apps).filter((app) => app.category === category);
}

export function getDesktopApps(): AppDefinition[] {
  return Object.values(apps).filter((app) => app.desktopIcon);
}

export function getQuickLaunchApps(): AppDefinition[] {
  return Object.values(apps).filter((app) => app.quickLaunch);
}

export function getStartMenuApps(): AppDefinition[] {
  return Object.values(apps).filter((app) => app.startMenuPath);
}

export default apps;
