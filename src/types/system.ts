export type SoundEvent =
  | 'startup'
  | 'shutdown'
  | 'error'
  | 'chord'
  | 'ding'
  | 'click'
  | 'dialup'
  | 'aol-welcome'
  | 'aim-door-open'
  | 'aim-door-close'
  | 'aim-message'
  | 'icq-uhoh'
  | 'recycle-empty';

export interface SystemSettings {
  display: {
    wallpaper: string;
    screenSaver: string;
    screenSaverTimeout: number;
  };
  sounds: {
    volume: number;
    muted: boolean;
    scheme: string;
  };
  desktop: {
    iconSize: number;
    showDesktopIcons: boolean;
    autoArrange: boolean;
  };
}

export interface DesktopIconState {
  appId: string;
  position: { x: number; y: number };
  selected: boolean;
}
