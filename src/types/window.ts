export interface LaunchParams {
  filePath?: string;
  url?: string;
  [key: string]: unknown;
}

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  minSize: { width: number; height: number };
  zIndex: number;
  state: 'normal' | 'minimized' | 'maximized';
  isFocused: boolean;
  resizable: boolean;
  // Owned dialogs travel with their opener: id of the window that spawned this
  ownerId?: string;
  // A modal dialog blocks interaction with its owner until it closes
  modal?: boolean;
  restoredPosition?: { x: number; y: number };
  restoredSize?: { width: number; height: number };
  launchParams?: LaunchParams;
  launchCount: number;
}

export type WindowAction =
  | { type: 'OPEN_WINDOW'; payload: { appId: string; title?: string; position?: { x: number; y: number }; launchParams?: LaunchParams; id?: string; ownerId?: string; modal?: boolean } }
  | { type: 'CLOSE_WINDOW'; payload: { id: string } }
  | { type: 'FOCUS_WINDOW'; payload: { id: string } }
  | { type: 'MINIMIZE_WINDOW'; payload: { id: string } }
  | { type: 'MAXIMIZE_WINDOW'; payload: { id: string } }
  | { type: 'RESTORE_WINDOW'; payload: { id: string } }
  | { type: 'MOVE_WINDOW'; payload: { id: string; x: number; y: number } }
  | { type: 'RESIZE_WINDOW'; payload: { id: string; width: number; height: number } }
  | { type: 'UPDATE_TITLE'; payload: { id: string; title: string } }
  | { type: 'MINIMIZE_ALL'; payload?: undefined }
  | { type: 'RESTORE_ALL'; payload?: undefined };

export interface WindowManagerState {
  windows: WindowState[];
  nextZIndex: number;
}
