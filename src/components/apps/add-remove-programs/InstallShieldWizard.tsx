'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Button98 } from '@/components/ui/Button98';
import { playSound } from '@/lib/sounds';
import { getInstaller, withFlag, withoutFlag } from './installerData';

interface InstallShieldWizardProps {
  slug: string;
  onClose: () => void;
}

type Step = 'welcome' | 'copying' | 'finish';

const GENERIC_FILES = ['SETUP.INS', 'SETUP.DLL', '_INST32I.EX_', 'DISK1.ID', 'README.TXT'];

/**
 * A three-page InstallShield-style wizard. Runs when an `installer:<slug>` file
 * is executed; on Finish it records the install in system/installedApps and
 * clears any system/uninstalledApps flag so a reinstall restores the app.
 */
export function InstallShieldWizard({ slug, onClose }: InstallShieldWizardProps) {
  const { getAppPref, setAppPref } = useSettings();
  const info = getInstaller(slug);
  const product = info?.product ?? 'this program';
  const files = info?.files ?? GENERIC_FILES;

  const [step, setStep] = useState<Step>('welcome');
  const [progress, setProgress] = useState(0);
  const [fileIndex, setFileIndex] = useState(0);

  // Fake per-file copy progress on the second page.
  useEffect(() => {
    if (step !== 'copying') return;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setStep('finish');
          playSound('ding');
          return 100;
        }
        return prev + 4;
      });
      setFileIndex((i) => (i + 1) % files.length);
    }, 90);
    return () => clearInterval(timer);
  }, [step, files.length]);

  const finish = useCallback(() => {
    const installed = getAppPref<Record<string, boolean>>('system', 'installedApps', {});
    setAppPref('system', 'installedApps', withFlag(installed, slug));
    if (info?.appId) {
      const uninstalled = getAppPref<Record<string, boolean>>('system', 'uninstalledApps', {});
      setAppPref('system', 'uninstalledApps', withoutFlag(uninstalled, info.appId));
    }
    onClose();
  }, [getAppPref, setAppPref, slug, info, onClose]);

  return (
    <div className="absolute inset-0 z-[10001] flex items-center justify-center bg-black/30 font-[family-name:var(--win98-font)] text-[11px]">
      <div className="w-[460px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]">
        {/* Title bar */}
        <div className="flex items-center justify-between h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white font-bold select-none">
          <span>{product} Setup</span>
          <button
            className="w-[16px] h-[14px] flex items-center justify-center bg-[var(--win98-button-face)] text-black border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] text-[9px] leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex h-[240px]">
          {/* Blue InstallShield banner */}
          <div className="w-[140px] bg-gradient-to-b from-[#000080] to-[#1084d0] flex flex-col items-center justify-center text-white p-2 shrink-0">
            <div className="text-4xl mb-2">💽</div>
            <div className="text-[10px] text-center leading-tight opacity-90">InstallShield&reg;</div>
          </div>

          {/* Page content */}
          <div className="flex-1 p-4 flex flex-col">
            {step === 'welcome' && (
              <>
                <p className="font-bold mb-2">Welcome to the InstallShield Wizard for {product}</p>
                <p className="mb-2">
                  The InstallShield Wizard will install {product} on your computer. To continue, click Next.
                </p>
                <p className="text-[var(--win98-disabled-text)] mt-auto">
                  WARNING: This program is protected by copyright law and international treaties.
                </p>
              </>
            )}

            {step === 'copying' && (
              <>
                <p className="font-bold mb-3">Copying program files...</p>
                <p className="mb-1 truncate">
                  {info ? `C:\\Program Files\\${product.split(' ')[0]}\\` : 'C:\\WINDOWS\\'}
                  <span className="font-[family-name:var(--win98-font-mono)]">{files[fileIndex]}</span>
                </p>
                <div className="h-[16px] border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] bg-white mt-1">
                  <div className="h-full bg-[var(--win98-highlight)] transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1 text-center">{progress}%</p>
              </>
            )}

            {step === 'finish' && (
              <>
                <p className="font-bold mb-2">InstallShield Wizard Complete</p>
                <p className="mb-2">
                  Setup has finished installing {product} on your computer. Click Finish to complete Setup.
                </p>
                <p className="text-[var(--win98-disabled-text)] mt-auto">
                  Thank you for choosing {product}.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Button row */}
        <div className="flex justify-end gap-2 px-3 py-2 border-t border-[var(--win98-button-shadow)]">
          {step === 'welcome' && (
            <>
              <Button98 disabled className="min-w-[75px]">&lt; Back</Button98>
              <Button98 className="min-w-[75px]" onClick={() => setStep('copying')}>Next &gt;</Button98>
              <Button98 className="min-w-[75px]" onClick={onClose}>Cancel</Button98>
            </>
          )}
          {step === 'copying' && (
            <>
              <Button98 disabled className="min-w-[75px]">&lt; Back</Button98>
              <Button98 disabled className="min-w-[75px]">Next &gt;</Button98>
              <Button98 className="min-w-[75px]" onClick={onClose}>Cancel</Button98>
            </>
          )}
          {step === 'finish' && (
            <Button98 className="min-w-[75px]" onClick={finish}>Finish</Button98>
          )}
        </div>
      </div>
    </div>
  );
}
