'use client';

import { useSettings } from '@/contexts/SettingsContext';
import { Button98 } from '@/components/ui/Button98';

export interface AboutDialogProps {
  appName: string;
  icon?: string;
  version?: string;
  onClose: () => void;
}

const DEFAULT_ICON = '/icons/windows-logo-32.svg';
const WINDOWS_VERSION = '4.10.1998';

export function AboutDialog({ appName, icon, version, onClose }: AboutDialogProps) {
  const { getAppPref } = useSettings();
  const userName = getAppPref('system', 'userName', 'User');

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center bg-black/20 font-[family-name:var(--win98-font)] text-[11px]">
      <div className="w-[340px] bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]">
        {/* Title bar */}
        <div className="flex items-center justify-between h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white font-bold select-none">
          <span className="truncate">About {appName}</span>
          <button
            className="w-[16px] h-[14px] flex items-center justify-center bg-[var(--win98-button-face)] text-black border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] text-[9px] leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* White banner strip */}
        <div className="flex items-center gap-3 bg-white px-4 py-3 border-b border-[var(--win98-button-shadow)]">
          <img
            src={icon || DEFAULT_ICON}
            alt=""
            width={32}
            height={32}
            className="w-8 h-8 flex-shrink-0"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="leading-tight">
            <div className="font-bold">Microsoft {appName}</div>
            <div>Windows 98</div>
            <div>Version {version || WINDOWS_VERSION}</div>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div>
            <div>This product is licensed to:</div>
            <div className="pl-3 pt-1 font-bold">{userName}</div>
          </div>

          <div className="border-t border-[var(--win98-button-shadow)] pt-2">
            <div>Physical Memory Available to Windows:</div>
            <div className="pl-3">130,612 KB</div>
          </div>

          <div className="flex justify-center pt-1">
            <Button98 className="min-w-[75px]" onClick={onClose} autoFocus>
              OK
            </Button98>
          </div>
        </div>
      </div>
    </div>
  );
}
