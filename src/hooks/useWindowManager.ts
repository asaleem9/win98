'use client';

import { useReducer, useCallback } from 'react';
import { WindowState, WindowAction, WindowManagerState, LaunchParams } from '@/types/window';
import { WINDOW_DEFAULTS } from '@/lib/constants';

// App registry is imported lazily to avoid circular deps
let appRegistryCache: Record<string, { defaultWindow: { title: string; width: number; height: number; minWidth?: number; minHeight?: number; resizable?: boolean }; singleton?: boolean }> | null = null;

export function setAppRegistry(registry: typeof appRegistryCache) {
  appRegistryCache = registry;
}

function getNextCascadePosition(windows: WindowState[]): { x: number; y: number } {
  const openWindows = windows.filter((w) => w.state !== 'minimized');
  const count = openWindows.length;
  return {
    x: WINDOW_DEFAULTS.cascadeStartX + (count % 10) * WINDOW_DEFAULTS.cascadeOffsetX,
    y: WINDOW_DEFAULTS.cascadeStartY + (count % 10) * WINDOW_DEFAULTS.cascadeOffsetY,
  };
}

// Every window transitively owned by `rootId` (dialogs, and dialogs of dialogs)
function collectOwnedIds(windows: WindowState[], rootId: string): Set<string> {
  const owned = new Set<string>();
  let frontier = [rootId];
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const w of windows) {
      if (w.ownerId && frontier.includes(w.ownerId) && !owned.has(w.id)) {
        owned.add(w.id);
        next.push(w.id);
      }
    }
    frontier = next;
  }
  return owned;
}

// The deepest open modal dialog spawned (directly or indirectly) by `id`
function findOpenModalDescendant(windows: WindowState[], id: string): string | null {
  const child = windows.find((w) => w.ownerId === id && w.modal && w.state !== 'minimized');
  if (!child) return null;
  return findOpenModalDescendant(windows, child.id) ?? child.id;
}

let windowCounter = 0;

function windowReducer(state: WindowManagerState, action: WindowAction): WindowManagerState {
  switch (action.type) {
    case 'OPEN_WINDOW': {
      const { appId, title, position, launchParams, id, ownerId, modal } = action.payload;
      const appDef = appRegistryCache?.[appId];

      // Singleton check: if app already open, focus it and hand it the new launch params
      if (appDef?.singleton) {
        const existing = state.windows.find((w) => w.appId === appId);
        if (existing) {
          const focused = windowReducer(state, { type: 'FOCUS_WINDOW', payload: { id: existing.id } });
          return {
            ...focused,
            windows: focused.windows.map((w) =>
              w.id === existing.id
                ? {
                    ...w,
                    launchParams: launchParams ?? w.launchParams,
                    launchCount: w.launchCount + 1,
                    ...(title ? { title } : {}),
                  }
                : w,
            ),
          };
        }
      }

      const cascadePos = position || getNextCascadePosition(state.windows);
      const newWindow: WindowState = {
        id: id ?? `window-${++windowCounter}`,
        appId,
        title: title || appDef?.defaultWindow.title || appId,
        position: cascadePos,
        size: {
          width: appDef?.defaultWindow.width || 400,
          height: appDef?.defaultWindow.height || 300,
        },
        minSize: {
          width: appDef?.defaultWindow.minWidth || 200,
          height: appDef?.defaultWindow.minHeight || 150,
        },
        zIndex: state.nextZIndex,
        state: 'normal',
        isFocused: true,
        resizable: appDef?.defaultWindow.resizable ?? true,
        ownerId,
        modal,
        launchParams,
        launchCount: 1,
      };

      // Unfocus all other windows
      const unfocused = state.windows.map((w) => ({ ...w, isFocused: false }));

      return {
        windows: [...unfocused, newWindow],
        nextZIndex: state.nextZIndex + 1,
      };
    }

    case 'CLOSE_WINDOW': {
      // Closing a window takes its owned dialogs down with it
      const doomed = collectOwnedIds(state.windows, action.payload.id);
      doomed.add(action.payload.id);
      const remaining = state.windows.filter((w) => !doomed.has(w.id));
      // Auto-focus topmost remaining top-level window
      if (remaining.length > 0) {
        const candidates = remaining.filter((w) => w.state !== 'minimized' && !w.ownerId);
        const pool = candidates.length > 0 ? candidates : remaining;
        const topWindow = pool.reduce((top, w) => (w.zIndex > top.zIndex ? w : top), pool[0]);
        return {
          ...state,
          windows: remaining.map((w) => ({
            ...w,
            isFocused: w.id === topWindow.id,
          })),
        };
      }
      return { ...state, windows: [] };
    }

    case 'FOCUS_WINDOW': {
      const targetId = action.payload.id;
      const target = state.windows.find((w) => w.id === targetId);
      if (!target) return state;

      // A window guarded by an open modal dialog hands focus to that dialog
      const modalId = findOpenModalDescendant(state.windows, targetId);
      const focusId = modalId ?? targetId;
      const focusTarget = state.windows.find((w) => w.id === focusId)!;
      if (focusId === targetId && focusTarget.isFocused) return state;

      // Restoring a window brings its owned dialogs back up with it
      const reveal = collectOwnedIds(state.windows, focusId);
      return {
        windows: state.windows.map((w) => ({
          ...w,
          isFocused: w.id === focusId,
          zIndex: w.id === focusId ? state.nextZIndex : w.zIndex,
          state:
            (w.id === focusId || reveal.has(w.id)) && w.state === 'minimized' ? 'normal' : w.state,
        })),
        nextZIndex: state.nextZIndex + 1,
      };
    }

    case 'MINIMIZE_WINDOW': {
      // Owned dialogs follow their opener down to the taskbar
      const hide = collectOwnedIds(state.windows, action.payload.id);
      hide.add(action.payload.id);
      const windows = state.windows.map((w) =>
        hide.has(w.id) ? { ...w, state: 'minimized' as const, isFocused: false } : w,
      );
      // Focus next topmost top-level window
      const visible = windows.filter((w) => w.state !== 'minimized' && !w.ownerId);
      if (visible.length > 0) {
        const topWindow = visible.reduce((top, w) => (w.zIndex > top.zIndex ? w : top), visible[0]);
        return {
          ...state,
          windows: windows.map((w) => ({ ...w, isFocused: w.id === topWindow.id })),
        };
      }
      return { ...state, windows };
    }

    case 'MAXIMIZE_WINDOW': {
      return {
        ...state,
        windows: state.windows.map((w) => {
          if (w.id !== action.payload.id) return w;
          return {
            ...w,
            state: 'maximized',
            restoredPosition: w.state === 'normal' ? w.position : w.restoredPosition,
            restoredSize: w.state === 'normal' ? w.size : w.restoredSize,
          };
        }),
      };
    }

    case 'RESTORE_WINDOW': {
      const reveal = collectOwnedIds(state.windows, action.payload.id);
      return {
        ...state,
        windows: state.windows.map((w) => {
          if (w.id === action.payload.id) {
            return {
              ...w,
              state: 'normal',
              position: w.restoredPosition || w.position,
              size: w.restoredSize || w.size,
            };
          }
          // Owned dialogs come back from the taskbar with their opener
          if (reveal.has(w.id) && w.state === 'minimized') {
            return { ...w, state: 'normal' as const };
          }
          return w;
        }),
      };
    }

    case 'MOVE_WINDOW': {
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.payload.id
            ? { ...w, position: { x: action.payload.x, y: action.payload.y } }
            : w,
        ),
      };
    }

    case 'RESIZE_WINDOW': {
      const target = state.windows.find((w) => w.id === action.payload.id);
      // Fixed-size windows (Calculator, Minesweeper, …) ignore resize entirely
      if (!target || !target.resizable) return state;
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.payload.id
            ? {
                ...w,
                size: {
                  width: Math.max(w.minSize.width, action.payload.width),
                  height: Math.max(w.minSize.height, action.payload.height),
                },
              }
            : w,
        ),
      };
    }

    case 'UPDATE_TITLE': {
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.payload.id ? { ...w, title: action.payload.title } : w,
        ),
      };
    }

    case 'MINIMIZE_ALL': {
      // Show-desktop: send every top-level window to the taskbar. Owned dialogs
      // are left alone here (they ride along with their opener's state).
      return {
        ...state,
        windows: state.windows.map((w) =>
          !w.ownerId && w.state !== 'minimized'
            ? { ...w, state: 'minimized' as const, isFocused: false }
            : w,
        ),
      };
    }

    case 'RESTORE_ALL': {
      const windows = state.windows.map((w) =>
        w.state === 'minimized' ? { ...w, state: 'normal' as const } : w,
      );
      const visible = windows.filter((w) => !w.ownerId);
      if (visible.length > 0) {
        const topWindow = visible.reduce((top, w) => (w.zIndex > top.zIndex ? w : top), visible[0]);
        return {
          ...state,
          windows: windows.map((w) => ({ ...w, isFocused: w.id === topWindow.id })),
        };
      }
      return { ...state, windows };
    }

    default:
      return state;
  }
}

const initialState: WindowManagerState = {
  windows: [],
  nextZIndex: 10,
};

export function useWindowManager() {
  const [state, dispatch] = useReducer(windowReducer, initialState);

  const openWindow = useCallback(
    (
      appId: string,
      options?: {
        title?: string;
        position?: { x: number; y: number };
        launchParams?: LaunchParams;
        id?: string;
        ownerId?: string;
        modal?: boolean;
      },
    ) => {
      dispatch({
        type: 'OPEN_WINDOW',
        payload: {
          appId,
          title: options?.title,
          position: options?.position,
          launchParams: options?.launchParams,
          id: options?.id,
          ownerId: options?.ownerId,
          modal: options?.modal,
        },
      });
    },
    [],
  );

  const closeWindow = useCallback((id: string) => {
    dispatch({ type: 'CLOSE_WINDOW', payload: { id } });
  }, []);

  const focusWindow = useCallback((id: string) => {
    dispatch({ type: 'FOCUS_WINDOW', payload: { id } });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    dispatch({ type: 'MINIMIZE_WINDOW', payload: { id } });
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    dispatch({ type: 'MAXIMIZE_WINDOW', payload: { id } });
  }, []);

  const restoreWindow = useCallback((id: string) => {
    dispatch({ type: 'RESTORE_WINDOW', payload: { id } });
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    dispatch({ type: 'MOVE_WINDOW', payload: { id, x, y } });
  }, []);

  const resizeWindow = useCallback((id: string, width: number, height: number) => {
    dispatch({ type: 'RESIZE_WINDOW', payload: { id, width, height } });
  }, []);

  const updateTitle = useCallback((id: string, title: string) => {
    dispatch({ type: 'UPDATE_TITLE', payload: { id, title } });
  }, []);

  const minimizeAll = useCallback(() => {
    dispatch({ type: 'MINIMIZE_ALL' });
  }, []);

  const restoreAll = useCallback(() => {
    dispatch({ type: 'RESTORE_ALL' });
  }, []);

  return {
    windows: state.windows,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    moveWindow,
    resizeWindow,
    updateTitle,
    minimizeAll,
    restoreAll,
  };
}
