'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { StatusBar98 } from '@/components/ui/StatusBar98';
import { cn } from '@/lib/cn';
import { playSound } from '@/lib/sounds';

const MACHINES = [
  { name: 'Entire Network', icon: '/icons/network-32.svg' },
  { name: 'Dads-computer', icon: '/icons/my-computer-32.svg' },
  { name: 'Family-pc', icon: '/icons/my-computer-32.svg' },
  { name: 'Gateway2000', icon: '/icons/my-computer-32.svg' },
  { name: 'Packardbell', icon: '/icons/my-computer-32.svg' },
];

export default function NetworkNeighborhood({}: AppComponentProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const tryConnect = (name: string) => {
    if (name === 'Entire Network') {
      playSound('chord');
      window.dispatchEvent(
        new CustomEvent('win98-system-dialog', {
          detail: {
            title: 'Network Neighborhood',
            message: 'Unable to browse the network.\n\nThe network is not present or not started.',
          },
        }),
      );
      return;
    }
    setConnecting(name);
    setTimeout(() => {
      setConnecting(null);
      playSound('chord');
      window.dispatchEvent(
        new CustomEvent('win98-system-dialog', {
          detail: {
            title: 'Network Neighborhood',
            message: `\\\\${name.toUpperCase()} is not accessible.\n\nThe computer or sharename could not be found. Make sure you typed it correctly, and try again.`,
          },
        }),
      );
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <div className="flex-1 bg-white m-1 p-2 overflow-auto border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
        <div className="flex flex-wrap gap-1 content-start">
          {MACHINES.map((machine) => (
            <div
              key={machine.name}
              className="flex flex-col items-center w-[75px] py-[6px] cursor-default select-none"
              onClick={() => setSelected(machine.name)}
              onDoubleClick={() => tryConnect(machine.name)}
            >
              <div className={cn('p-[2px]', selected === machine.name && 'bg-[var(--win98-highlight)]')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={machine.icon} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
              </div>
              <span
                className={cn(
                  'text-center leading-tight mt-[2px] max-w-[75px] px-[2px]',
                  selected === machine.name && 'bg-[var(--win98-highlight)] text-white',
                )}
              >
                {machine.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <StatusBar98
        panels={[{ content: connecting ? `Connecting to \\\\${connecting.toUpperCase()}...` : `${MACHINES.length} object(s)` }]}
      />
    </div>
  );
}
