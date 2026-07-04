import { lazy } from 'react';
import { AppDefinition } from '@/types/app';

const OregonTrailApp = lazy(() => import('@/components/apps/games/OregonTrail'));
const RollerCoasterTycoonApp = lazy(() => import('@/components/apps/games/RollerCoasterTycoon'));
const SimCityApp = lazy(() => import('@/components/apps/games/SimCity'));
const AgeOfEmpires2App = lazy(() => import('@/components/apps/games/AgeOfEmpires2'));
const Diablo2App = lazy(() => import('@/components/apps/games/Diablo2'));
const StarCraftApp = lazy(() => import('@/components/apps/games/StarCraft'));
const CommandConquerApp = lazy(() => import('@/components/apps/games/CommandConquer'));
const TonyHawk2App = lazy(() => import('@/components/apps/games/TonyHawk2'));
const SkiFreeApp = lazy(() => import('@/components/apps/games/SkiFree'));
const Bunker98App = lazy(() => import('@/components/apps/games/raycaster/Bunker98'));

export const eraGamesApps: Record<string, AppDefinition> = {
  'oregon-trail': {
    id: 'oregon-trail',
    name: 'Oregon Trail',
    icon: '/icons/oregon-trail-32.svg',
    icon16: '/icons/oregon-trail-16.svg',
    category: 'era-games',
    component: OregonTrailApp,
    defaultWindow: { title: 'The Oregon Trail', width: 620, height: 460, minWidth: 400, minHeight: 300 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'rollercoaster-tycoon': {
    id: 'rollercoaster-tycoon',
    name: 'RollerCoaster Tycoon',
    icon: '/icons/rct-32.svg',
    icon16: '/icons/rct-16.svg',
    category: 'era-games',
    component: RollerCoasterTycoonApp,
    defaultWindow: { title: 'RollerCoaster Tycoon', width: 720, height: 540, minWidth: 350, minHeight: 350 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'simcity': {
    id: 'simcity',
    name: 'SimCity 2000',
    icon: '/icons/simcity-32.svg',
    icon16: '/icons/simcity-16.svg',
    category: 'era-games',
    component: SimCityApp,
    defaultWindow: { title: 'SimCity 2000', width: 680, height: 480, minWidth: 400, minHeight: 350 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'age-of-empires-2': {
    id: 'age-of-empires-2',
    name: 'Age of Empires II',
    icon: '/icons/aoe2-32.svg',
    icon16: '/icons/aoe2-16.svg',
    category: 'era-games',
    component: AgeOfEmpires2App,
    defaultWindow: { title: 'Age of Empires II: The Age of Kings', width: 760, height: 500, minWidth: 350, minHeight: 380 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'diablo-2': {
    id: 'diablo-2',
    name: 'Diablo II',
    icon: '/icons/diablo2-32.svg',
    icon16: '/icons/diablo2-16.svg',
    category: 'era-games',
    component: Diablo2App,
    defaultWindow: { title: 'Diablo II', width: 500, height: 600, minWidth: 350, minHeight: 400 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'starcraft': {
    id: 'starcraft',
    name: 'StarCraft',
    icon: '/icons/starcraft-32.svg',
    icon16: '/icons/starcraft-16.svg',
    category: 'era-games',
    component: StarCraftApp,
    defaultWindow: { title: 'StarCraft', width: 760, height: 500, minWidth: 350, minHeight: 350 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'command-conquer': {
    id: 'command-conquer',
    name: 'C&C: Red Alert',
    icon: '/icons/cnc-32.svg',
    icon16: '/icons/cnc-16.svg',
    category: 'era-games',
    component: CommandConquerApp,
    defaultWindow: { title: 'Command & Conquer: Red Alert', width: 760, height: 500, minWidth: 400, minHeight: 350 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'tony-hawk-2': {
    id: 'tony-hawk-2',
    name: "Tony Hawk's Pro Skater 2",
    icon: '/icons/thps2-32.svg',
    icon16: '/icons/thps2-16.svg',
    category: 'era-games',
    component: TonyHawk2App,
    defaultWindow: { title: "Tony Hawk's Pro Skater 2", width: 450, height: 450, minWidth: 300, minHeight: 350 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'skifree': {
    id: 'skifree',
    name: 'SkiFree',
    icon: '/icons/skifree-32.svg',
    icon16: '/icons/skifree-16.svg',
    category: 'era-games',
    component: SkiFreeApp,
    defaultWindow: { title: 'SkiFree', width: 500, height: 500, minWidth: 360, minHeight: 400 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
  'bunker-98': {
    id: 'bunker-98',
    name: 'Bunker 98',
    icon: '/icons/bunker98-32.svg',
    icon16: '/icons/bunker98-16.svg',
    category: 'era-games',
    component: Bunker98App,
    defaultWindow: { title: 'Bunker 98', width: 660, height: 480, minWidth: 480, minHeight: 360 },
    startMenuPath: ['Programs', 'Games'],
    singleton: true,
  },
};
