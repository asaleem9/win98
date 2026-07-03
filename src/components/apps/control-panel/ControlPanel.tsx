'use client';

import { useState, useCallback, MouseEvent } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { showSystemError } from '@/hooks/useFileOpener';
import { Dialog98 } from '@/components/ui/Dialog98';
import { TabControl98 } from '@/components/ui/TabControl98';
import { Select98 } from '@/components/ui/Select98';
import { Input98 } from '@/components/ui/Input98';
import { cn } from '@/lib/cn';

type AppletAction =
  | { kind: 'open'; appId: string }
  | { kind: 'network' }
  | { kind: 'regional' };

interface Applet {
  name: string;
  icon: string;
  desc: string;
  action: AppletAction;
}

const APPLETS: Applet[] = [
  { name: 'Add/Remove Programs', icon: '/icons/addremove-16.svg', desc: 'Installs and removes programs and Windows components.', action: { kind: 'open', appId: 'add-remove-programs' } },
  { name: 'Display', icon: '/icons/display-16.svg', desc: 'Changes settings for your display and screen saver.', action: { kind: 'open', appId: 'display-properties' } },
  { name: 'Network', icon: '/icons/network-16.svg', desc: 'Configures network hardware and software.', action: { kind: 'network' } },
  { name: 'System', icon: '/icons/sysinfo-16.svg', desc: 'Provides system information and changes advanced settings.', action: { kind: 'open', appId: 'sysinfo' } },
  { name: 'Device Manager', icon: '/icons/devmgr-16.svg', desc: 'Views and changes the hardware installed on your computer.', action: { kind: 'open', appId: 'device-manager' } },
  { name: 'Sounds', icon: '/icons/volume-16.svg', desc: 'Assigns sounds to events and adjusts the volume.', action: { kind: 'open', appId: 'volume-control' } },
  { name: 'Regional Settings', icon: '/icons/settings-16.svg', desc: 'Changes how numbers, dates, and times are displayed.', action: { kind: 'regional' } },
  { name: 'Internet', icon: '/icons/ie-16.svg', desc: 'Configures your Internet display and connection settings.', action: { kind: 'open', appId: 'ie5' } },
];

export default function ControlPanel({}: AppComponentProps) {
  const { openWindow } = useWindows();
  const [selected, setSelected] = useState<string | null>(null);
  const [showRegional, setShowRegional] = useState(false);

  const runApplet = useCallback((applet: Applet) => {
    switch (applet.action.kind) {
      case 'open':
        openWindow(applet.action.appId);
        break;
      case 'network':
        showSystemError('Network', 'The Network Control Panel cannot be displayed.\n\nThe network is not present or not started. Please contact your system administrator.');
        break;
      case 'regional':
        setShowRegional(true);
        break;
    }
  }, [openWindow]);

  const selectedApplet = APPLETS.find((a) => a.name === selected) ?? null;

  return (
    <div className="flex-1 flex flex-col bg-white font-[family-name:var(--win98-font)] text-[11px]">
      <div className="flex-1 flex min-h-0">
        {/* Applet grid */}
        <div className="flex-1 overflow-auto p-3" onClick={() => setSelected(null)}>
          <div className="flex flex-wrap gap-4">
            {APPLETS.map((applet) => (
              <div
                key={applet.name}
                className="flex flex-col items-center w-[80px] cursor-default select-none p-1"
                onClick={(e: MouseEvent) => { e.stopPropagation(); setSelected(applet.name); }}
                onDoubleClick={() => runApplet(applet)}
              >
                <div className={cn('p-[2px]', selected === applet.name && 'bg-[var(--win98-highlight)]')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={applet.icon} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
                </div>
                <span className={cn('text-center text-[11px] mt-1 px-[2px]', selected === applet.name && 'bg-[var(--win98-highlight)] text-white')}>{applet.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Description sidebar */}
        <div className="w-[150px] shrink-0 border-l border-[var(--win98-button-shadow)] bg-[var(--win98-button-face)] p-2">
          {selectedApplet ? (
            <>
              <p className="font-bold mb-1">{selectedApplet.name}</p>
              <p>{selectedApplet.desc}</p>
            </>
          ) : (
            <p className="text-[var(--win98-disabled-text)]">Select an item to view its description.</p>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className={cn('flex items-center h-[20px] px-2 bg-[var(--win98-button-face)]', 'border-t border-[var(--win98-button-highlight)]', 'text-[11px]')}>
        <span>{selectedApplet ? selectedApplet.desc : `${APPLETS.length} object(s)`}</span>
      </div>

      {showRegional && <RegionalSettings onClose={() => setShowRegional(false)} />}
    </div>
  );
}

function RegionalSettings({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/10">
      <Dialog98
        title="Regional Settings Properties"
        message={
          <div className="w-[340px]">
            <TabControl98
              tabs={[
                {
                  id: 'region',
                  label: 'Regional Settings',
                  content: (
                    <div className="w-[300px]">
                      <p className="mb-2">Many programs support international settings that you can change through the Regional Settings.</p>
                      <p className="mb-1">Your locale (location):</p>
                      <Select98 defaultValue="en-US" className="w-full mb-3">
                        <option value="en-US">English (United States)</option>
                        <option value="en-GB">English (United Kingdom)</option>
                        <option value="fr-FR">French (Standard)</option>
                        <option value="de-DE">German (Standard)</option>
                        <option value="ja-JP">Japanese</option>
                      </Select98>
                      <p className="text-[10px] text-[var(--win98-disabled-text)]">Set the appearance of numbers, currencies, times, and dates.</p>
                    </div>
                  ),
                },
                {
                  id: 'number',
                  label: 'Number',
                  content: (
                    <div className="w-[300px]">
                      <Field label="Decimal symbol"><Input98 defaultValue="." className="w-[60px]" /></Field>
                      <Field label="Digit grouping symbol"><Input98 defaultValue="," className="w-[60px]" /></Field>
                      <Field label="No. of digits after decimal"><Input98 defaultValue="2" className="w-[60px]" /></Field>
                      <Field label="Appearance"><span>1,234,567.89</span></Field>
                    </div>
                  ),
                },
                {
                  id: 'currency',
                  label: 'Currency',
                  content: (
                    <div className="w-[300px]">
                      <Field label="Currency symbol"><Input98 defaultValue="$" className="w-[60px]" /></Field>
                      <Field label="Positive"><span>$1,234.56</span></Field>
                      <Field label="Negative"><span>($1,234.56)</span></Field>
                    </div>
                  ),
                },
                {
                  id: 'time',
                  label: 'Time',
                  content: (
                    <div className="w-[300px]">
                      <Field label="Time style"><Input98 defaultValue="h:mm:ss tt" className="w-[100px]" /></Field>
                      <Field label="AM symbol"><Input98 defaultValue="AM" className="w-[60px]" /></Field>
                      <Field label="PM symbol"><Input98 defaultValue="PM" className="w-[60px]" /></Field>
                    </div>
                  ),
                },
                {
                  id: 'date',
                  label: 'Date',
                  content: (
                    <div className="w-[300px]">
                      <Field label="Short date style"><Input98 defaultValue="M/d/yy" className="w-[100px]" /></Field>
                      <Field label="Long date style"><Input98 defaultValue="dddd, MMMM dd, yyyy" className="w-[160px]" /></Field>
                      <p className="text-[10px] text-[var(--win98-disabled-text)] mt-2">Calendar type: Gregorian Calendar</p>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        }
        buttons={[
          { label: 'OK', default: true, onClick: onClose },
          { label: 'Cancel', onClick: onClose },
        ]}
        className="shadow-lg"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-[3px]">
      <span>{label}:</span>
      {children}
    </div>
  );
}
