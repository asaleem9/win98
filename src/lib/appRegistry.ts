import { AppDefinition } from '@/types/app';
import { setAppRegistry } from '@/hooks/useWindowManager';
import { accessoriesApps } from './registry/accessories';
import { gamesApps } from './registry/games';
import { systemApps } from './registry/system';
import { internetApps } from './registry/internet';
import { multimediaApps } from './registry/multimedia';
import { productivityApps } from './registry/productivity';
import { utilitiesApps } from './registry/utilities';
import { eraGamesApps } from './registry/era-games';

const apps: Record<string, AppDefinition> = {
  ...accessoriesApps,
  ...gamesApps,
  ...systemApps,
  ...internetApps,
  ...multimediaApps,
  ...productivityApps,
  ...utilitiesApps,
  ...eraGamesApps,
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
