import { lazy } from 'react';
import { AppDefinition } from '@/types/app';

const InternetExplorer = lazy(() => import('@/components/apps/ie5/InternetExplorer'));
const AOL = lazy(() => import('@/components/apps/aol/AOL'));
const AIM = lazy(() => import('@/components/apps/aim/AIM'));
const NapsterApp = lazy(() => import('@/components/apps/napster/Napster'));
const BonziBuddyApp = lazy(() => import('@/components/apps/bonzi-buddy/BonziBuddy'));
const LimeWireApp = lazy(() => import('@/components/apps/limewire/LimeWire'));
const OutlookExpressApp = lazy(() => import('@/components/apps/outlook/OutlookExpress'));
const ICQApp = lazy(() => import('@/components/apps/icq/ICQ'));
const MIRCApp = lazy(() => import('@/components/apps/mirc/mIRC'));

export const internetApps: Record<string, AppDefinition> = {
  'ie5': {
    id: 'ie5',
    name: 'Internet Explorer',
    icon: '/icons/ie-32.svg',
    icon16: '/icons/ie-16.svg',
    category: 'internet',
    component: InternetExplorer,
    defaultWindow: { title: 'Microsoft Internet Explorer', width: 700, height: 500, minWidth: 400, minHeight: 300 },
    startMenuPath: ['Programs'],
    quickLaunch: true,
    singleton: false,
    desktopIcon: true,
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
    desktopIcon: true,
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
  'bonzi-buddy': {
    id: 'bonzi-buddy',
    name: 'BonziBUDDY',
    icon: '/icons/bonzi-32.svg',
    icon16: '/icons/bonzi-16.svg',
    category: 'internet',
    component: BonziBuddyApp,
    defaultWindow: { title: 'BonziBUDDY', width: 300, height: 420, minWidth: 250, minHeight: 350 },
    startMenuPath: ['Programs'],
    singleton: true,
  },
  'limewire': {
    id: 'limewire',
    name: 'LimeWire',
    icon: '/icons/limewire-32.svg',
    icon16: '/icons/limewire-16.svg',
    category: 'internet',
    component: LimeWireApp,
    defaultWindow: { title: 'LimeWire', width: 550, height: 420, minWidth: 400, minHeight: 300 },
    startMenuPath: ['Programs', 'Internet Tools'],
    singleton: true,
  },
  'outlook-express': {
    id: 'outlook-express',
    name: 'Outlook Express',
    icon: '/icons/outlook-32.svg',
    icon16: '/icons/outlook-16.svg',
    category: 'internet',
    component: OutlookExpressApp,
    defaultWindow: { title: 'Outlook Express', width: 700, height: 500, minWidth: 500, minHeight: 350 },
    startMenuPath: ['Programs'],
    singleton: true,
    desktopIcon: true,
  },
  'icq': {
    id: 'icq',
    name: 'ICQ',
    icon: '/icons/icq-32.svg',
    icon16: '/icons/icq-16.svg',
    category: 'internet',
    component: ICQApp,
    defaultWindow: { title: 'ICQ', width: 340, height: 460, minWidth: 320, minHeight: 360 },
    startMenuPath: ['Programs', 'Internet Tools'],
    singleton: true,
  },
  'mirc': {
    id: 'mirc',
    name: 'mIRC',
    icon: '/icons/mirc-32.svg',
    icon16: '/icons/mirc-16.svg',
    category: 'internet',
    component: MIRCApp,
    defaultWindow: { title: 'mIRC', width: 640, height: 440, minWidth: 480, minHeight: 360 },
    startMenuPath: ['Programs', 'Internet Tools'],
    singleton: true,
  },
};
