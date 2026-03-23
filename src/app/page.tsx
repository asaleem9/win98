'use client';

import { useState, useCallback } from 'react';
import { WindowProvider } from '@/contexts/WindowContext';
import { WindowManager } from '@/components/window/WindowManager';
import { Taskbar } from '@/components/taskbar/Taskbar';
import { Desktop } from '@/components/desktop/Desktop';
import { BootSequence } from '@/components/system/BootSequence';
import { ShutdownScreen } from '@/components/system/ShutdownScreen';
import { BSOD } from '@/components/system/BSOD';

type SystemState = 'booting' | 'running' | 'shutdown' | 'bsod';

export default function Home() {
  const [systemState, setSystemState] = useState<SystemState>('booting');
  const [bsodMessage, setBsodMessage] = useState<string | undefined>();

  const handleBootComplete = useCallback(() => {
    setSystemState('running');
  }, []);

  const handleShutdown = useCallback(() => {
    setSystemState('shutdown');
  }, []);

  const handleRestart = useCallback(() => {
    setSystemState('booting');
  }, []);

  const handleBSOD = useCallback((message?: string) => {
    setBsodMessage(message);
    setSystemState('bsod');
  }, []);

  const handleBSODDismiss = useCallback(() => {
    setSystemState('running');
  }, []);

  if (systemState === 'booting') {
    return <BootSequence onComplete={handleBootComplete} />;
  }

  if (systemState === 'shutdown') {
    return <ShutdownScreen onRestart={handleRestart} />;
  }

  return (
    <WindowProvider>
      <div className="h-screen w-screen overflow-hidden bg-[var(--win98-desktop)] relative">
        {/* Desktop with icons */}
        <Desktop />

        {/* Windows */}
        <WindowManager />

        {/* Taskbar */}
        <Taskbar />

        {/* BSOD overlay */}
        {systemState === 'bsod' && (
          <BSOD message={bsodMessage} onDismiss={handleBSODDismiss} />
        )}
      </div>
    </WindowProvider>
  );
}
