'use client';

import { useState, useEffect } from 'react';
import { AppComponentProps } from '@/types/app';

const initialPrograms = [
  { name: 'Netscape Navigator 4.0', size: '15.2 MB', used: 'Rarely' },
  { name: 'RealPlayer 7', size: '8.4 MB', used: 'Occasionally' },
  { name: 'WinZip 7.0', size: '2.1 MB', used: 'Frequently' },
  { name: 'Adobe Acrobat Reader 4.0', size: '12.8 MB', used: 'Occasionally' },
  { name: 'Macromedia Shockwave', size: '3.2 MB', used: 'Rarely' },
  { name: 'QuickTime 4.0', size: '11.5 MB', used: 'Occasionally' },
  { name: 'Microsoft Office 97', size: '189.4 MB', used: 'Frequently' },
  { name: 'WinRAR 2.90', size: '1.8 MB', used: 'Frequently' },
  { name: 'ICQ 99b', size: '6.7 MB', used: 'Frequently' },
  { name: 'mIRC 5.71', size: '1.4 MB', used: 'Occasionally' },
  { name: 'Kazaa Media Desktop', size: '4.2 MB', used: 'Frequently' },
  { name: 'BonziBUDDY', size: '8.9 MB', used: 'Never' },
  { name: 'DirectX 7.0', size: '45.3 MB', used: 'Frequently' },
  { name: 'Java Runtime Environment', size: '23.1 MB', used: 'Occasionally' },
];

export default function AddRemovePrograms({ windowId }: AppComponentProps) {
  const [programs, setPrograms] = useState(initialPrograms);
  const [selected, setSelected] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeProgress, setRemoveProgress] = useState(0);
  const [removeComplete, setRemoveComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'windows' | 'startup'>('install');

  useEffect(() => {
    if (!removing || selected === null) return;
    const interval = setInterval(() => {
      setRemoveProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setPrograms(progs => progs.filter((_, i) => i !== selected));
          setRemoving(false);
          setRemoveComplete(true);
          setSelected(null);
          return 100;
        }
        return prev + 5;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [removing, selected]);

  const handleRemove = () => {
    if (selected === null) return;
    setRemoving(true);
    setRemoveProgress(0);
    setRemoveComplete(false);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Tabs */}
      <div className="flex px-2 pt-2">
        {(['install', 'windows', 'startup'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 text-[11px] cursor-default border border-solid
              ${activeTab === tab
                ? 'bg-[var(--win98-button-face)] border-[var(--win98-button-shadow)] border-b-[var(--win98-button-face)] -mb-px z-10 relative'
                : 'bg-[var(--win98-button-dark-shadow)]/10 border-[var(--win98-button-shadow)]'
              }`}
          >
            {tab === 'install' ? 'Install/Uninstall' : tab === 'windows' ? 'Windows Setup' : 'Startup Disk'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col mx-2 mb-2 p-3 border border-solid border-[var(--win98-button-shadow)] min-h-0">
        {activeTab === 'install' && (
          <>
            <div className="mb-2">
              To install a new program from a floppy disk or CD-ROM, click Install.
            </div>
            <button className="self-start px-4 h-[24px] mb-3 text-[11px] cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]">
              Install...
            </button>

            <div className="mb-1">
              The following software can be automatically removed. To remove a program or modify its installed components, select it from the list and click Add/Remove.
            </div>

            {/* Program list */}
            <div className="flex-1 overflow-auto bg-white border-2 border-solid border-[var(--win98-button-shadow)] min-h-0">
              {programs.map((prog, i) => (
                <div
                  key={prog.name}
                  className={`flex items-center px-2 py-[3px] cursor-default ${selected === i ? 'bg-[var(--win98-hilight)] text-[var(--win98-hilight-text)]' : ''}`}
                  onClick={() => { setSelected(i); setRemoveComplete(false); }}
                >
                  <span className="mr-2">📦</span>
                  <span className="flex-1">{prog.name}</span>
                  <span className="text-[10px] mr-3">{prog.size}</span>
                </div>
              ))}
            </div>

            {/* Remove button and progress */}
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleRemove}
                disabled={selected === null || removing}
                className="px-4 h-[24px] text-[11px] cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] disabled:text-[var(--win98-button-shadow)]"
              >
                Add/Remove...
              </button>
              <button
                disabled={selected === null}
                className="px-4 h-[24px] text-[11px] cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] disabled:text-[var(--win98-button-shadow)]"
              >
                Change...
              </button>
            </div>

            {removing && (
              <div className="mt-2">
                <div className="text-[10px] mb-1">Removing {programs[selected!].name}... {removeProgress}%</div>
                <div className="h-3 border border-solid border-[var(--win98-button-shadow)] bg-white">
                  <div className="h-full bg-[var(--win98-hilight)] transition-all" style={{ width: `${removeProgress}%` }} />
                </div>
              </div>
            )}

            {removeComplete && (
              <div className="mt-2 text-[11px] text-[#006600]">
                Program has been successfully removed.
              </div>
            )}
          </>
        )}

        {activeTab === 'windows' && (
          <div className="text-center mt-8 text-gray-500">
            Windows Setup options are not available.
          </div>
        )}

        {activeTab === 'startup' && (
          <div className="text-center mt-8 text-gray-500">
            Startup Disk creation is not available.
          </div>
        )}
      </div>
    </div>
  );
}
