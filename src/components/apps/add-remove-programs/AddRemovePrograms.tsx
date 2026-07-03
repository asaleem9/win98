'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { useSettings } from '@/contexts/SettingsContext';
import { Dialog98 } from '@/components/ui/Dialog98';
import { Checkbox98 } from '@/components/ui/Checkbox98';

interface Program { id: string; name: string; size: string; used: string; }

const initialPrograms: Program[] = [
  { id: 'netscape', name: 'Netscape Navigator 4.0', size: '15.2 MB', used: 'Rarely' },
  { id: 'realplayer', name: 'RealPlayer 7', size: '8.4 MB', used: 'Occasionally' },
  { id: 'winzip', name: 'WinZip 7.0', size: '2.1 MB', used: 'Frequently' },
  { id: 'acrobat', name: 'Adobe Acrobat Reader 4.0', size: '12.8 MB', used: 'Occasionally' },
  { id: 'shockwave', name: 'Macromedia Shockwave', size: '3.2 MB', used: 'Rarely' },
  { id: 'quicktime', name: 'QuickTime 4.0', size: '11.5 MB', used: 'Occasionally' },
  { id: 'office97', name: 'Microsoft Office 97', size: '189.4 MB', used: 'Frequently' },
  { id: 'winrar', name: 'WinRAR 2.90', size: '1.8 MB', used: 'Frequently' },
  { id: 'icq', name: 'ICQ 99b', size: '6.7 MB', used: 'Frequently' },
  { id: 'mirc', name: 'mIRC 5.71', size: '1.4 MB', used: 'Occasionally' },
  { id: 'kazaa', name: 'Kazaa Media Desktop', size: '4.2 MB', used: 'Frequently' },
  { id: 'bonzi', name: 'BonziBUDDY', size: '8.9 MB', used: 'Never' },
  { id: 'directx', name: 'DirectX 7.0', size: '45.3 MB', used: 'Frequently' },
  { id: 'jre', name: 'Java Runtime Environment', size: '23.1 MB', used: 'Occasionally' },
];

const WINDOWS_COMPONENTS = [
  { name: 'Accessibility', size: '4.5 MB', checked: true },
  { name: 'Accessories', size: '13.8 MB', checked: true },
  { name: 'Communications', size: '9.2 MB', checked: true },
  { name: 'Desktop Themes', size: '29.1 MB', checked: false },
  { name: 'Internet Tools', size: '5.7 MB', checked: true },
  { name: 'Multilanguage Support', size: '18.3 MB', checked: false },
  { name: 'Multimedia', size: '18.9 MB', checked: true },
  { name: 'Online Services', size: '1.2 MB', checked: true },
  { name: 'Outlook Express', size: '6.4 MB', checked: true },
  { name: 'System Tools', size: '8.1 MB', checked: false },
];

const BTN = 'px-4 h-[24px] text-[11px] cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)] disabled:text-[var(--win98-button-shadow)]';

export default function AddRemovePrograms({}: AppComponentProps) {
  const { getAppPref, setAppPref } = useSettings();
  const [uninstalled, setUninstalled] = useState<string[]>(() => getAppPref<string[]>('add-remove-programs', 'uninstalled', []));
  const [selected, setSelected] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeProgress, setRemoveProgress] = useState(0);
  const [removeComplete, setRemoveComplete] = useState(false);
  const [bonziFail, setBonziFail] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'windows' | 'startup'>('install');
  const [installStep, setInstallStep] = useState(0);
  const [components, setComponents] = useState(WINDOWS_COMPONENTS);
  const [creatingDisk, setCreatingDisk] = useState(false);
  const [diskProgress, setDiskProgress] = useState(0);

  const visiblePrograms = useMemo(() => initialPrograms.filter((p) => !uninstalled.includes(p.id)), [uninstalled]);
  const selectedProgram = visiblePrograms.find((p) => p.id === selected) ?? null;
  const isBonzi = selectedProgram?.id === 'bonzi';

  // Uninstall animation
  useEffect(() => {
    if (!removing || !selectedProgram) return;
    const cap = isBonzi ? 99 : 100;
    const interval = setInterval(() => {
      setRemoveProgress((prev) => {
        if (prev >= cap) {
          clearInterval(interval);
          if (isBonzi) {
            setRemoving(false);
            setBonziFail(true);
          } else {
            setUninstalled((u) => {
              const next = [...u, selectedProgram.id];
              setAppPref('add-remove-programs', 'uninstalled', next);
              return next;
            });
            setRemoving(false);
            setRemoveComplete(true);
            setSelected(null);
          }
          return cap;
        }
        return prev + 5;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [removing, selectedProgram, isBonzi, setAppPref]);

  // Startup disk animation
  useEffect(() => {
    if (!creatingDisk) return;
    const interval = setInterval(() => {
      setDiskProgress((prev) => {
        if (prev >= 100) { clearInterval(interval); setCreatingDisk(false); return 100; }
        return prev + 4;
      });
    }, 90);
    return () => clearInterval(interval);
  }, [creatingDisk]);

  const handleRemove = useCallback(() => {
    if (!selectedProgram) return;
    setRemoving(true);
    setRemoveProgress(0);
    setRemoveComplete(false);
    setBonziFail(false);
  }, [selectedProgram]);

  const componentsTotal = useMemo(
    () => components.filter((c) => c.checked).reduce((s, c) => s + parseFloat(c.size), 0).toFixed(1),
    [components],
  );

  const tabClass = (tab: string) =>
    `px-3 py-1 text-[11px] cursor-default border border-solid ${
      activeTab === tab
        ? 'bg-[var(--win98-button-face)] border-[var(--win98-button-shadow)] border-b-[var(--win98-button-face)] -mb-px z-10 relative'
        : 'bg-[var(--win98-button-dark-shadow)]/10 border-[var(--win98-button-shadow)]'
    }`;

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Tabs */}
      <div className="flex px-2 pt-2">
        {(['install', 'windows', 'startup'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={tabClass(tab)}>
            {tab === 'install' ? 'Install/Uninstall' : tab === 'windows' ? 'Windows Setup' : 'Startup Disk'}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col mx-2 mb-2 p-3 border border-solid border-[var(--win98-button-shadow)] min-h-0">
        {activeTab === 'install' && (
          <>
            <div className="mb-2">To install a new program from a floppy disk or CD-ROM, click Install.</div>
            <button className={`self-start mb-3 ${BTN}`} onClick={() => setInstallStep(1)}>Install...</button>

            <div className="mb-1">
              The following software can be automatically removed. To remove a program or modify its installed components, select it from the list and click Add/Remove.
            </div>

            <div className="flex-1 overflow-auto bg-white border-2 border-solid border-[var(--win98-button-shadow)] min-h-0">
              {visiblePrograms.map((prog) => (
                <div
                  key={prog.id}
                  className={`flex items-center px-2 py-[3px] cursor-default ${selected === prog.id ? 'bg-[var(--win98-highlight)] text-white' : ''}`}
                  onClick={() => { setSelected(prog.id); setRemoveComplete(false); setBonziFail(false); }}
                >
                  <span className="mr-2">📦</span>
                  <span className="flex-1">{prog.name}</span>
                  <span className="text-[10px] mr-3">{prog.size}</span>
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button onClick={handleRemove} disabled={!selectedProgram || removing} className={BTN}>Add/Remove...</button>
              <button disabled={!selectedProgram} className={BTN}>Change...</button>
            </div>

            {removing && (
              <div className="mt-2">
                <div className="text-[10px] mb-1">Removing {selectedProgram?.name}... {removeProgress}%</div>
                <div className="h-3 border border-solid border-[var(--win98-button-shadow)] bg-white">
                  <div className="h-full bg-[var(--win98-highlight)] transition-all" style={{ width: `${removeProgress}%` }} />
                </div>
              </div>
            )}

            {removeComplete && <div className="mt-2 text-[11px] text-[#006600]">Program has been successfully removed.</div>}
          </>
        )}

        {activeTab === 'windows' && (
          <>
            <div className="mb-2">
              To add or remove a component, click the check box. A shaded box means that only part of the component will be installed.
            </div>
            <div className="flex-1 overflow-auto bg-white border-2 border-solid border-[var(--win98-button-shadow)] min-h-0 p-1">
              {components.map((c, i) => (
                <label key={c.name} className="flex items-center px-1 py-[2px] cursor-default">
                  <Checkbox98
                    checked={c.checked}
                    onChange={() => setComponents((prev) => prev.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)))}
                  />
                  <span className="flex-1 ml-2">{c.name}</span>
                  <span className="text-[10px]">{c.size}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px]">
              <span>Space required by selected components:</span>
              <span className="font-bold">{componentsTotal} MB</span>
            </div>
          </>
        )}

        {activeTab === 'startup' && (
          <div className="flex-1 flex flex-col">
            <div className="mb-3">
              If you have trouble starting Windows, you can use a startup disk to start your computer and run diagnostic programs.
            </div>
            <div className="mb-3">
              To create a startup disk, click Create Disk. You will need one floppy disk that you can label and set aside.
            </div>
            <button className={`self-start ${BTN}`} onClick={() => { setCreatingDisk(true); setDiskProgress(0); }} disabled={creatingDisk}>
              Create Disk...
            </button>
            {(creatingDisk || diskProgress > 0) && (
              <div className="mt-4">
                <div className="text-[10px] mb-1">
                  {diskProgress >= 100 ? 'Startup disk created. Label the disk "HOMEWORK DO NOT DELETE" and store it safely.' : `Please label a floppy disk "HOMEWORK DO NOT DELETE" and insert it now. ${diskProgress}%`}
                </div>
                <div className="h-3 border border-solid border-[var(--win98-button-shadow)] bg-white">
                  <div className="h-full bg-[var(--win98-highlight)] transition-all" style={{ width: `${diskProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Install wizard flow */}
      {installStep > 0 && (
        <ModalDialog>
          <Dialog98
            title="Install Program From Floppy Disk or CD-ROM"
            icon="info"
            message={
              <span className="max-w-[340px] inline-block">
                {installStep === 1
                  ? 'Insert the first installation floppy disk or the CD-ROM for the program you want to install, then click Next.'
                  : 'Setup was unable to find an installation program on the disk. Please check that you inserted the correct disk, then contact your software vendor.'}
              </span>
            }
            buttons={
              installStep === 1
                ? [
                    { label: 'Next >', default: true, onClick: () => setInstallStep(2) },
                    { label: 'Cancel', onClick: () => setInstallStep(0) },
                  ]
                : [{ label: 'Finish', default: true, onClick: () => setInstallStep(0) }]
            }
            className="shadow-lg"
          />
        </ModalDialog>
      )}

      {/* BonziBUDDY refuses to leave */}
      {bonziFail && (
        <ModalDialog>
          <Dialog98
            title="BonziBUDDY"
            icon="warning"
            message={
              <span className="max-w-[340px] inline-block">
                BonziBUDDY does not want to leave your computer!
                <br /><br />
                Removal failed at 99%. BonziBUDDY has helpfully reinstalled itself and looks forward to many more years together.
              </span>
            }
            buttons={[{ label: 'OK', default: true, onClick: () => { setBonziFail(false); setRemoveProgress(0); setSelected(null); } }]}
            className="shadow-lg"
          />
        </ModalDialog>
      )}
    </div>
  );
}

function ModalDialog({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/10">{children}</div>;
}
