import { lazy } from 'react';
import { AppDefinition } from '@/types/app';

const Word97App = lazy(() => import('@/components/apps/word97/Word97'));
const ExcelApp = lazy(() => import('@/components/apps/excel/Excel'));
const PowerPointApp = lazy(() => import('@/components/apps/powerpoint/PowerPoint'));
const Photoshop5App = lazy(() => import('@/components/apps/photoshop5/Photoshop5'));
const MacromediaFlashApp = lazy(() => import('@/components/apps/flash/MacromediaFlash'));
const FrontPageApp = lazy(() => import('@/components/apps/frontpage/FrontPage'));
const VisualBasic6App = lazy(() => import('@/components/apps/vb6/VisualBasic6'));

export const productivityApps: Record<string, AppDefinition> = {
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
