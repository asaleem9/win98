'use client';

import { useState, useCallback, useEffect } from 'react';
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

  // Listen for BSOD events dispatched from apps
  useEffect(() => {
    const onBsod = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      handleBSOD(detail?.message);
    };
    window.addEventListener('win98-bsod', onBsod);
    return () => window.removeEventListener('win98-bsod', onBsod);
  }, [handleBSOD]);

  // Listen for shutdown events dispatched from Start menu
  useEffect(() => {
    const onShutdown = () => handleShutdown();
    window.addEventListener('win98-shutdown', onShutdown);
    return () => window.removeEventListener('win98-shutdown', onShutdown);
  }, [handleShutdown]);

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
