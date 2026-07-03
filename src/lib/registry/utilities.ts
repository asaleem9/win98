import { lazy } from 'react';
import { AppDefinition } from '@/types/app';

const WinRARApp = lazy(() => import('@/components/apps/winrar/WinRAR'));
const WinZipApp = lazy(() => import('@/components/apps/winzip/WinZip'));
const NeroBurningROMApp = lazy(() => import('@/components/apps/nero/NeroBurningROM'));
const NortonAntiVirusApp = lazy(() => import('@/components/apps/norton/NortonAntiVirus'));

export const utilitiesApps: Record<string, AppDefinition> = {
  'winrar': {
    id: 'winrar',
    name: 'WinRAR',
    icon: '/icons/winrar-32.svg',
    icon16: '/icons/winrar-16.svg',
    category: 'utilities',
    component: WinRARApp,
    defaultWindow: { title: 'WinRAR', width: 600, height: 400, minWidth: 400, minHeight: 250 },
    startMenuPath: ['Programs', 'WinRAR'],
    singleton: false,
  },
  'winzip': {
    id: 'winzip',
    name: 'WinZip',
    icon: '/icons/winzip-32.svg',
    icon16: '/icons/winzip-16.svg',
    category: 'utilities',
    component: WinZipApp,
    defaultWindow: { title: 'WinZip', width: 580, height: 380, minWidth: 400, minHeight: 250 },
    startMenuPath: ['Programs', 'WinZip'],
    singleton: false,
  },
  'nero': {
    id: 'nero',
    name: 'Nero Burning ROM',
    icon: '/icons/nero-32.svg',
    icon16: '/icons/nero-16.svg',
    category: 'utilities',
    component: NeroBurningROMApp,
    defaultWindow: { title: 'Nero Burning ROM', width: 650, height: 450, minWidth: 450, minHeight: 300 },
    startMenuPath: ['Programs', 'Ahead Nero'],
    singleton: true,
  },
  'norton': {
    id: 'norton',
    name: 'Norton AntiVirus',
    icon: '/icons/norton-32.svg',
    icon16: '/icons/norton-16.svg',
    category: 'utilities',
    component: NortonAntiVirusApp,
    defaultWindow: { title: 'Norton AntiVirus 2000', width: 450, height: 500, minWidth: 350, minHeight: 400 },
    startMenuPath: ['Programs', 'Norton AntiVirus'],
    singleton: true,
  },
};
