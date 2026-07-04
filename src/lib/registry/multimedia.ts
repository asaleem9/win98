import { lazy } from 'react';
import { AppDefinition } from '@/types/app';

const WinampApp = lazy(() => import('@/components/apps/winamp/Winamp'));
const MediaPlayerApp = lazy(() => import('@/components/apps/media-player/MediaPlayer'));
const RealPlayerApp = lazy(() => import('@/components/apps/realplayer/RealPlayer'));
const QuickTimePlayerApp = lazy(() => import('@/components/apps/quicktime/QuickTimePlayer'));
const VolumeControlApp = lazy(() => import('@/components/apps/volume-control/VolumeControl'));
const CDPlayerApp = lazy(() => import('@/components/apps/cd-player/CDPlayer'));
const Encyclopedia98App = lazy(() => import('@/components/apps/encarta/Encyclopedia98'));

export const multimediaApps: Record<string, AppDefinition> = {
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
    desktopIcon: true,
  },
  'media-player': {
    id: 'media-player',
    name: 'Windows Media Player',
    icon: '/icons/mediaplayer-32.svg',
    icon16: '/icons/mediaplayer-16.svg',
    category: 'multimedia',
    component: MediaPlayerApp,
    defaultWindow: { title: 'Windows Media Player', width: 420, height: 380, minWidth: 300, minHeight: 280 },
    startMenuPath: ['Programs', 'Accessories', 'Multimedia'],
    singleton: true,
  },
  'realplayer': {
    id: 'realplayer',
    name: 'RealPlayer',
    icon: '/icons/realplayer-32.svg',
    icon16: '/icons/realplayer-16.svg',
    category: 'multimedia',
    component: RealPlayerApp,
    defaultWindow: { title: 'RealPlayer', width: 380, height: 340, minWidth: 300, minHeight: 280 },
    startMenuPath: ['Programs', 'Multimedia'],
    singleton: true,
  },
  'quicktime': {
    id: 'quicktime',
    name: 'QuickTime Player',
    icon: '/icons/quicktime-32.svg',
    icon16: '/icons/quicktime-16.svg',
    category: 'multimedia',
    component: QuickTimePlayerApp,
    defaultWindow: { title: 'QuickTime Player', width: 320, height: 280, minWidth: 280, minHeight: 240 },
    startMenuPath: ['Programs', 'Multimedia'],
    singleton: true,
  },
  'volume-control': {
    id: 'volume-control',
    name: 'Volume Control',
    icon: '/icons/volume-32.svg',
    icon16: '/icons/volume-16.svg',
    category: 'multimedia',
    component: VolumeControlApp,
    defaultWindow: { title: 'Volume Control', width: 360, height: 240, minWidth: 300, minHeight: 220, resizable: false },
    startMenuPath: ['Programs', 'Accessories', 'Multimedia'],
    singleton: true,
  },
  'cd-player': {
    id: 'cd-player',
    name: 'CD Player',
    icon: '/icons/cd-player-32.svg',
    icon16: '/icons/cd-player-16.svg',
    category: 'multimedia',
    component: CDPlayerApp,
    defaultWindow: { title: 'CD Player', width: 360, height: 280, minWidth: 340, minHeight: 260, resizable: false },
    startMenuPath: ['Programs', 'Accessories', 'Multimedia'],
    singleton: true,
  },
  'encarta': {
    id: 'encarta',
    name: 'Encyclopedia 98',
    icon: '/icons/encarta-32.svg',
    icon16: '/icons/encarta-16.svg',
    category: 'multimedia',
    component: Encyclopedia98App,
    defaultWindow: { title: 'Encyclopedia 98', width: 660, height: 520, minWidth: 480, minHeight: 380 },
    startMenuPath: ['Programs'],
    singleton: true,
  },
};
