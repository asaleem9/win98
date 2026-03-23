import { ComponentType, LazyExoticComponent } from 'react';

export type AppCategory =
  | 'accessories'
  | 'games'
  | 'internet'
  | 'multimedia'
  | 'system'
  | 'productivity'
  | 'utilities'
  | 'era-games';

export interface AppDefinition {
  id: string;
  name: string;
  icon: string;
  icon16?: string;
  category: AppCategory;
  component: LazyExoticComponent<ComponentType<AppComponentProps>> | ComponentType<AppComponentProps>;
  defaultWindow: {
    title: string;
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
    resizable?: boolean;
  };
  startMenuPath?: string[];
  desktopIcon?: boolean;
  quickLaunch?: boolean;
  singleton?: boolean;
}

export interface AppComponentProps {
  windowId: string;
}
