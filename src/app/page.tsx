'use client';

import { useState, useCallback, useEffect } from 'react';
import { WindowProvider } from '@/contexts/WindowContext';
import { FileSystemProvider } from '@/contexts/FileSystemContext';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { WindowManager } from '@/components/window/WindowManager';
import { Taskbar } from '@/components/taskbar/Taskbar';
import { Desktop } from '@/components/desktop/Desktop';
import { BootSequence } from '@/components/system/BootSequence';
import { LoginScreen } from '@/components/system/LoginScreen';
import { WelcomeScreen } from '@/components/system/WelcomeScreen';
import { ShutdownScreen, ShutdownDialog } from '@/components/system/ShutdownScreen';
import { BSOD } from '@/components/system/BSOD';
import { ShellShortcuts } from '@/components/system/ShellShortcuts';
import { ShellEventHost } from '@/components/system/ShellEventHost';
import { DialogHost } from '@/components/dialogs/DialogHost';
import { ScreenSaverManager } from '@/components/system/ScreenSaverManager';
import { ScanDiskDOS } from '@/components/apps/scandisk/ScanDiskDOS';
import { FirstRunHost } from '@/components/system/FirstRunHost';
import { useNortonRealtimeShield } from '@/components/apps/norton/realtimeShield';
import { playSound } from '@/lib/sounds';

type SystemState = 'booting' | 'scandisk' | 'login' | 'running' | 'shutdown' | 'bsod';

function ScreenSaverHost() {
  const { settings } = useSettings();
  return (
    <ScreenSaverManager
      selectedSaver={settings.screenSaver.id}
      timeoutMs={settings.screenSaver.timeoutMinutes * 60000}
    />
  );
}

/** Runs Norton's real-time shield over filesystem writes while the desktop is up. */
function NortonShieldHost() {
  useNortonRealtimeShield();
  return null;
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

/**
 * The system state machine: boot -> login -> running, with shutdown/restart and
 * BSOD branches. Sits inside SettingsProvider so the boot and login screens can
 * read persisted prefs (fast-boot flag, saved user name, show-welcome).
 */
function SystemShell() {
  const { getAppPref, setAppPref } = useSettings();
  const [systemState, setSystemState] = useState<SystemState>('booting');
  const [bsodMessage, setBsodMessage] = useState<string | undefined>();
  const [shutdownDialogOpen, setShutdownDialogOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const handleBootComplete = useCallback(() => {
    // First full boot done — subsequent boots take the fast path.
    setAppPref('system', 'hasBooted', true);
    // A BSOD/crash last session leaves the drive "dirty"; run ScanDisk before login.
    setSystemState(getAppPref('system', 'dirtyShutdown', false) ? 'scandisk' : 'login');
  }, [setAppPref, getAppPref]);

  const handleScanDiskComplete = useCallback(() => {
    setAppPref('system', 'dirtyShutdown', false);
    setSystemState('login');
  }, [setAppPref]);

  const handleLogin = useCallback(() => {
    setShowWelcome(getAppPref('system', 'showWelcome', true));
    setSystemState('running');
    // Startup jingle plays on desktop arrival, once, after logging on.
    playSound('startup');
  }, [getAppPref]);

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
    // Any blue screen counts as an improper shutdown — arm ScanDisk for next boot.
    setAppPref('system', 'dirtyShutdown', true);
    setBsodMessage(message);
    setSystemState('bsod');
  }, [setAppPref]);

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
    return (
      <BootSequence
        fast={getAppPref('system', 'hasBooted', false)}
        onComplete={handleBootComplete}
      />
    );
  }

  if (systemState === 'scandisk') {
    return <ScanDiskDOS onComplete={handleScanDiskComplete} />;
  }

  if (systemState === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (systemState === 'shutdown') {
    return <ShutdownScreen onRestart={handleRestart} />;
  }

  return (
    <FileSystemProvider>
      <WindowProvider>
        <div className="win98 h-screen w-screen overflow-hidden bg-[var(--win98-desktop)] relative">
          {/* Desktop with icons */}
          <Desktop />

          {/* Windows */}
          <WindowManager />

          {/* Taskbar */}
          <Taskbar />

          {/* Global keyboard shortcuts + Alt+Tab overlay */}
          <ShellShortcuts />

          {/* Globally-dispatched system, About, Properties, and error dialogs */}
          <DialogHost />

          {/* Run dialog + open-file event bridge */}
          <ShellEventHost />

          {/* Idle screensaver */}
          <ScreenSaverHost />

          {/* Norton real-time protection: quarantines known threats as they land */}
          <NortonShieldHost />

          {/* One-time first-session theater: AIM sign-on and You've Got Mail */}
          <FirstRunHost />

          {/* Color scheme CSS variables */}
          <SchemeApplier />

          {/* First-run Welcome to Windows 98 splash */}
          {showWelcome && <WelcomeScreen onClose={() => setShowWelcome(false)} />}

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
  );
}

export default function Home() {
  return (
    <SettingsProvider>
      <SystemShell />
    </SettingsProvider>
  );
}
