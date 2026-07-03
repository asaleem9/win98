'use client';

import { useEffect, useState } from 'react';
import { SystemDialogs } from '@/components/system/SystemDialogs';
import { ErrorDialog, ErrorType } from '@/components/system/ErrorDialog';
import { AboutDialog } from './AboutDialog';
import { PropertiesDialog } from './PropertiesDialog';

let dialogCounter = 0;
const nextId = () => ++dialogCounter;

interface AboutEntry {
  id: number;
  appName: string;
  icon?: string;
  version?: string;
}

interface PropertiesEntry {
  id: number;
  path: string;
}

interface ErrorEntry {
  id: number;
  appName: string;
  errorType?: ErrorType;
}

/**
 * Global dialog layer. Renders the stacked `win98-system-dialog` message boxes
 * plus event-driven About, Properties, and application-error dialogs so any app
 * can raise a shell-authentic dialog without prop drilling.
 */
export function DialogHost() {
  return (
    <>
      <SystemDialogs />
      <AboutHost />
      <PropertiesHost />
      <ErrorHost />
    </>
  );
}

function AboutHost() {
  const [dialogs, setDialogs] = useState<AboutEntry[]>([]);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ appName?: string; icon?: string; version?: string }>).detail;
      if (!detail?.appName) return;
      setDialogs((prev) => [...prev, { id: nextId(), appName: detail.appName!, icon: detail.icon, version: detail.version }]);
    };
    window.addEventListener('win98-about-dialog', onEvent);
    return () => window.removeEventListener('win98-about-dialog', onEvent);
  }, []);

  const close = (id: number) => setDialogs((prev) => prev.filter((d) => d.id !== id));

  return (
    <>
      {dialogs.map((d) => (
        <AboutDialog key={d.id} appName={d.appName} icon={d.icon} version={d.version} onClose={() => close(d.id)} />
      ))}
    </>
  );
}

function PropertiesHost() {
  const [dialogs, setDialogs] = useState<PropertiesEntry[]>([]);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ path?: string }>).detail;
      if (!detail?.path) return;
      setDialogs((prev) => [...prev, { id: nextId(), path: detail.path! }]);
    };
    window.addEventListener('win98-properties-dialog', onEvent);
    return () => window.removeEventListener('win98-properties-dialog', onEvent);
  }, []);

  const close = (id: number) => setDialogs((prev) => prev.filter((d) => d.id !== id));

  return (
    <>
      {dialogs.map((d) => (
        <PropertiesDialog key={d.id} path={d.path} onClose={() => close(d.id)} />
      ))}
    </>
  );
}

function ErrorHost() {
  const [dialogs, setDialogs] = useState<ErrorEntry[]>([]);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ appName?: string; errorType?: ErrorType }>).detail;
      if (!detail?.appName) return;
      setDialogs((prev) => [...prev, { id: nextId(), appName: detail.appName!, errorType: detail.errorType }]);
    };
    window.addEventListener('win98-app-error', onEvent);
    return () => window.removeEventListener('win98-app-error', onEvent);
  }, []);

  const close = (id: number) => setDialogs((prev) => prev.filter((d) => d.id !== id));

  return (
    <>
      {dialogs.map((d) => (
        <ErrorDialog key={d.id} appName={d.appName} errorType={d.errorType} onClose={() => close(d.id)} />
      ))}
    </>
  );
}
