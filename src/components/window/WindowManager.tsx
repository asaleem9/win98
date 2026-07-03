'use client';

import { Suspense } from 'react';
import { useWindows } from '@/contexts/WindowContext';
import { Window } from './Window';
import { getApp } from '@/lib/appRegistry';
import { WindowErrorBoundary } from '@/components/dialogs/WindowErrorBoundary';

export function WindowManager() {
  const { windows, closeWindow } = useWindows();

  return (
    <>
      {windows.map((win) => {
        const app = getApp(win.appId);
        if (!app) return null;
        const AppComponent = app.component;

        return (
          <Window key={win.id} windowState={win} icon16={app.icon16 || app.icon}>
            <WindowErrorBoundary appName={app.name} windowId={win.id} onClose={() => closeWindow(win.id)}>
              <Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
                    Loading...
                  </div>
                }
              >
                <AppComponent windowId={win.id} launchParams={win.launchParams} launchCount={win.launchCount} />
              </Suspense>
            </WindowErrorBoundary>
          </Window>
        );
      })}
    </>
  );
}
