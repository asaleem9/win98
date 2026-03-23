'use client';

import { Suspense } from 'react';
import { useWindows } from '@/contexts/WindowContext';
import { Window } from './Window';
import { getApp } from '@/lib/appRegistry';

export function WindowManager() {
  const { windows } = useWindows();

  return (
    <>
      {windows.map((win) => {
        const app = getApp(win.appId);
        if (!app) return null;
        const AppComponent = app.component;

        return (
          <Window key={win.id} windowState={win} icon16={app.icon16 || app.icon}>
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
                  Loading...
                </div>
              }
            >
              <AppComponent windowId={win.id} />
            </Suspense>
          </Window>
        );
      })}
    </>
  );
}
