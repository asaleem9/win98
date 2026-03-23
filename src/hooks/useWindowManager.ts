'use client';

import { useReducer, useCallback } from 'react';
import { WindowState, WindowAction, WindowManagerState } from '@/types/window';
import { WINDOW_DEFAULTS } from '@/lib/constants';

// App registry is imported lazily to avoid circular deps
let appRegistryCache: Record<string, { defaultWindow: { title: string; width: number; height: number; minWidth?: number; minHeight?: number }; singleton?: boolean }> | null = null;

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

let windowCounter = 0;

function windowReducer(state: WindowManagerState, action: WindowAction): WindowManagerState {
  switch (action.type) {
    case 'OPEN_WINDOW': {
      const { appId, title, position } = action.payload;
      const appDef = appRegistryCache?.[appId];

      // Singleton check: if app already open, focus it
      if (appDef?.singleton) {
        const existing = state.windows.find((w) => w.appId === appId);
        if (existing) {
          return windowReducer(state, { type: 'FOCUS_WINDOW', payload: { id: existing.id } });
        }
      }

      const cascadePos = position || getNextCascadePosition(state.windows);
      const newWindow: WindowState = {
        id: `window-${++windowCounter}`,
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
      };

      // Unfocus all other windows
      const unfocused = state.windows.map((w) => ({ ...w, isFocused: false }));

      return {
        windows: [...unfocused, newWindow],
        nextZIndex: state.nextZIndex + 1,
      };
    }

    case 'CLOSE_WINDOW': {
      const remaining = state.windows.filter((w) => w.id !== action.payload.id);
      // Auto-focus topmost remaining window
      if (remaining.length > 0) {
        const topWindow = remaining.reduce((top, w) =>
          w.state !== 'minimized' && w.zIndex > top.zIndex ? w : top,
          remaining[0],
        );
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
      const target = state.windows.find((w) => w.id === action.payload.id);
      if (!target || target.isFocused) return state;

      return {
        windows: state.windows.map((w) => ({
          ...w,
          isFocused: w.id === action.payload.id,
          zIndex: w.id === action.payload.id ? state.nextZIndex : w.zIndex,
          state: w.id === action.payload.id && w.state === 'minimized' ? 'normal' : w.state,
        })),
        nextZIndex: state.nextZIndex + 1,
      };
    }

    case 'MINIMIZE_WINDOW': {
      const windows = state.windows.map((w) =>
        w.id === action.payload.id ? { ...w, state: 'minimized' as const, isFocused: false } : w,
      );
      // Focus next topmost
      const visible = windows.filter((w) => w.state !== 'minimized');
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
      return {
        ...state,
        windows: state.windows.map((w) => {
          if (w.id !== action.payload.id) return w;
          return {
            ...w,
            state: 'normal',
            position: w.restoredPosition || w.position,
            size: w.restoredSize || w.size,
          };
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
    (appId: string, options?: { title?: string; position?: { x: number; y: number } }) => {
      dispatch({ type: 'OPEN_WINDOW', payload: { appId, title: options?.title, position: options?.position } });
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
  };
}
