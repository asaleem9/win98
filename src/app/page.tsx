'use client';

import { useState, useCallback, useEffect } from 'react';
import { WindowProvider } from '@/contexts/WindowContext';
import { FileSystemProvider } from '@/contexts/FileSystemContext';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { WindowManager } from '@/components/window/WindowManager';
import { Taskbar } from '@/components/taskbar/Taskbar';
import { Desktop } from '@/components/desktop/Desktop';
import { BootSequence } from '@/components/system/BootSequence';
import { ShutdownScreen, ShutdownDialog } from '@/components/system/ShutdownScreen';
import { BSOD } from '@/components/system/BSOD';
import { ShellShortcuts } from '@/components/system/ShellShortcuts';
import { ShellEventHost } from '@/components/system/ShellEventHost';
import { SystemDialogs } from '@/components/system/SystemDialogs';
import { ScreenSaverManager } from '@/components/system/ScreenSaverManager';
import { playSound } from '@/lib/sounds';

type SystemState = 'booting' | 'running' | 'shutdown' | 'bsod';

function ScreenSaverHost() {
  const { settings } = useSettings();
  return (
    <ScreenSaverManager
      selectedSaver={settings.screenSaver.id}
      timeoutMs={settings.screenSaver.timeoutMinutes * 60000}
    />
  );
}

/** Applies the selected color scheme's CSS variables document-wide. */
function SchemeApplier() {
  const { settings } = useSettings();
  useEffect(() => {
    if (settings.colorScheme === 'standard') {
      delete document.documentElement.dataset.win98Scheme;
    } else {
      document.documentElement.dataset.win98Scheme = settings.colorScheme;
    }
  }, [settings.colorScheme]);
  return null;
}

export default function Home() {
  const [systemState, setSystemState] = useState<SystemState>('booting');
  const [bsodMessage, setBsodMessage] = useState<string | undefined>();
  const [shutdownDialogOpen, setShutdownDialogOpen] = useState(false);

  const handleBootComplete = useCallback(() => {
    setSystemState('running');
    playSound('startup');
  }, []);

  const handleShutdown = useCallback(() => {
    setShutdownDialogOpen(false);
    playSound('shutdown');
    setSystemState('shutdown');
  }, []);

  const handleRestart = useCallback(() => {
    setShutdownDialogOpen(false);
    setSystemState('booting');
  }, []);

  const handleBSOD = useCallback((message?: string) => {
    setBsodMessage(message);
    setSystemState('bsod');
  }, []);

  const handleBSODDismiss = useCallback(() => {
    setSystemState('running');
  }, []);

  // Listen for BSOD events dispatched from apps
  useEffect(() => {
    const onBsod = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      handleBSOD(detail?.message);
    };
    window.addEventListener('win98-bsod', onBsod);
    return () => window.removeEventListener('win98-bsod', onBsod);
  }, [handleBSOD]);

  // Immediate shutdown (legacy event) and the Shut Down Windows dialog
  useEffect(() => {
    const onShutdown = () => handleShutdown();
    const onShutdownDialog = () => setShutdownDialogOpen(true);
    window.addEventListener('win98-shutdown', onShutdown);
    window.addEventListener('win98-shutdown-dialog', onShutdownDialog);
    return () => {
      window.removeEventListener('win98-shutdown', onShutdown);
      window.removeEventListener('win98-shutdown-dialog', onShutdownDialog);
    };
  }, [handleShutdown]);

  if (systemState === 'booting') {
    return <BootSequence onComplete={handleBootComplete} />;
  }

  if (systemState === 'shutdown') {
    return <ShutdownScreen onRestart={handleRestart} />;
  }

  return (
    <SettingsProvider>
      <FileSystemProvider>
        <WindowProvider>
          <div className="h-screen w-screen overflow-hidden bg-[var(--win98-desktop)] relative">
            {/* Desktop with icons */}
            <Desktop />

            {/* Windows */}
            <WindowManager />

            {/* Taskbar */}
            <Taskbar />

            {/* Global keyboard shortcuts + Alt+Tab overlay */}
            <ShellShortcuts />

            {/* Globally-dispatched system dialogs */}
            <SystemDialogs />

            {/* Run dialog + open-file event bridge */}
            <ShellEventHost />

            {/* Idle screensaver */}
            <ScreenSaverHost />

            {/* Color scheme CSS variables */}
            <SchemeApplier />

            {/* Shut Down Windows dialog */}
            {shutdownDialogOpen && (
              <ShutdownDialog
                onShutdown={handleShutdown}
                onRestart={handleRestart}
                onCancel={() => setShutdownDialogOpen(false)}
              />
            )}

            {/* BSOD overlay */}
            {systemState === 'bsod' && (
              <BSOD message={bsodMessage} onDismiss={handleBSODDismiss} />
            )}
          </div>
        </WindowProvider>
      </FileSystemProvider>
    </SettingsProvider>
  );
}
