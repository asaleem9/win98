import { lazy } from 'react';
import { AppDefinition } from '@/types/app';

const MinesweeperApp = lazy(() => import('@/components/apps/minesweeper/Minesweeper'));
const SolitaireApp = lazy(() => import('@/components/apps/solitaire/Solitaire'));
const FreeCellApp = lazy(() => import('@/components/apps/freecell/FreeCell'));
const HeartsApp = lazy(() => import('@/components/apps/hearts/Hearts'));
const SpaceCadetPinballApp = lazy(() => import('@/components/apps/pinball/SpaceCadetPinball'));

export const gamesApps: Record<string, AppDefinition> = {
  'minesweeper': {
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: '/icons/minesweeper-32.svg',
    icon16: '/icons/minesweeper-16.svg',
    category: 'games',
    component: MinesweeperApp,
    defaultWindow: { title: 'Minesweeper', width: 200, height: 260, minWidth: 200, minHeight: 260, resizable: false },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'solitaire': {
    id: 'solitaire',
    name: 'Solitaire',
    icon: '/icons/solitaire-32.svg',
    icon16: '/icons/solitaire-16.svg',
    category: 'games',
    component: SolitaireApp,
    defaultWindow: { title: 'Solitaire', width: 580, height: 440, minWidth: 400, minHeight: 300 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'freecell': {
    id: 'freecell',
    name: 'FreeCell',
    icon: '/icons/freecell-32.svg',
    icon16: '/icons/freecell-16.svg',
    category: 'games',
    component: FreeCellApp,
    defaultWindow: { title: 'FreeCell', width: 580, height: 440, minWidth: 480, minHeight: 350 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'hearts': {
    id: 'hearts',
    name: 'Hearts',
    icon: '/icons/hearts-32.svg',
    icon16: '/icons/hearts-16.svg',
    category: 'games',
    component: HeartsApp,
    defaultWindow: { title: 'The Microsoft Hearts Network', width: 580, height: 480, minWidth: 450, minHeight: 380 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'pinball': {
    id: 'pinball',
    name: '3D Pinball',
    icon: '/icons/pinball-32.svg',
    icon16: '/icons/pinball-16.svg',
    category: 'games',
    component: SpaceCadetPinballApp,
    defaultWindow: { title: '3D Pinball for Windows - Space Cadet', width: 660, height: 460, minWidth: 300, minHeight: 450 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
};
