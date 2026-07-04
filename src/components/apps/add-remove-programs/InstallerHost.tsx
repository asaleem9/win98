'use client';

import { useEffect, useState } from 'react';
import { InstallShieldWizard } from './InstallShieldWizard';
import { INSTALLER_EVENT } from './installerData';

/**
 * Global listener that renders the InstallShield wizard when an `installer:*`
 * file is run (via the file opener or the DOS prompt). Mounted once, inside the
 * settings/window providers, so any surface can trigger an install by name.
 */
export function InstallerHost() {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const onInstaller = (e: Event) => {
      const detail = (e as CustomEvent<{ slug?: string }>).detail;
      if (detail?.slug) setSlug(detail.slug);
    };
    window.addEventListener(INSTALLER_EVENT, onInstaller);
    return () => window.removeEventListener(INSTALLER_EVENT, onInstaller);
  }, []);

  if (!slug) return null;
  return <InstallShieldWizard slug={slug} onClose={() => setSlug(null)} />;
}
