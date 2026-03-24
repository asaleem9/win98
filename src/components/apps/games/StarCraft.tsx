'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';

export default function StarCraft({ windowId }: AppComponentProps) {
  const [showError, setShowError] = useState(false);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Background - dark sci-fi */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, #0a1628 0%, #050d1a 50%, #020508 100%)',
        }}
      />

      {/* Stars */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: Math.random() > 0.7 ? 2 : 1,
            height: Math.random() > 0.7 ? 2 : 1,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            opacity: 0.3 + Math.random() * 0.5,
          }}
        />
      ))}

      {/* Blue nebula glow */}
      <div className="absolute top-[20%] right-[10%] w-[150px] h-[100px] rounded-full opacity-15" style={{ background: 'radial-gradient(ellipse, #0088cc, transparent)' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-3 p-4">
        {/* Title */}
        <h1
          className="text-[30px] font-bold tracking-[3px] mb-1"
          style={{
            color: '#44aacc',
            textShadow: '0 0 15px rgba(68,170,204,0.5), 0 0 30px rgba(68,170,204,0.2)',
            fontFamily: 'sans-serif',
          }}
        >
          STARCRAFT
        </h1>
        <div className="w-[180px] h-px bg-gradient-to-r from-transparent via-[#44aacc] to-transparent mb-4" />

        {/* Menu */}
        <div className="flex flex-col gap-[6px] w-[200px]">
          {['Single Player', 'Multiplayer', 'Campaign Editor', 'Cinematics', 'Exit'].map(label => (
            <button
              key={label}
              onClick={() => setShowError(true)}
              className="py-[6px] px-4 text-[12px] cursor-pointer border text-center transition-colors hover:bg-[#0a2040] hover:border-[#44aacc]"
              style={{
                background: 'linear-gradient(to bottom, #0d1a2e, #081422)',
                borderColor: '#1a3a55',
                color: '#88ccdd',
                fontFamily: 'sans-serif',
                letterSpacing: '1px',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 text-[9px] text-[#1a3a55]">
          &copy; 1998 Blizzard Entertainment
        </div>
      </div>

      {showError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
          <Dialog98
            title="StarCraft"
            icon="error"
            message="Please insert the StarCraft CD to continue."
            buttons={[{ label: 'OK', onClick: () => setShowError(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
