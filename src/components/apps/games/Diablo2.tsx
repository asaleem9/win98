'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';

const CHARACTER_CLASSES = [
  { name: 'Amazon', desc: 'Skilled fighter who uses bow and javelin' },
  { name: 'Necromancer', desc: 'Summoner of the undead' },
  { name: 'Barbarian', desc: 'Powerful melee warrior' },
  { name: 'Sorceress', desc: 'Master of elemental magic' },
  { name: 'Paladin', desc: 'Holy warrior of faith' },
];

export default function Diablo2({ windowId }: AppComponentProps) {
  const [showError, setShowError] = useState(false);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Background - very dark gothic */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, #1a0a00 0%, #0d0500 50%, #000000 100%)',
        }}
      />

      {/* Flame glow effects */}
      <div className="absolute top-[10%] left-[15%] w-[60px] h-[80px] rounded-full opacity-20" style={{ background: 'radial-gradient(ellipse, #ff4400, transparent)' }} />
      <div className="absolute top-[10%] right-[15%] w-[60px] h-[80px] rounded-full opacity-20" style={{ background: 'radial-gradient(ellipse, #ff4400, transparent)' }} />

      {/* Pentagram/symbol hint */}
      <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[50px] h-[50px] rounded-full border border-[#331100] opacity-30" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center flex-1 p-4 pt-6">
        {/* Title */}
        <h1
          className="text-[36px] font-bold tracking-[4px] mb-1"
          style={{
            background: 'linear-gradient(to bottom, #ff6600, #cc3300, #660000)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 8px rgba(255,68,0,0.5))',
            fontFamily: 'serif',
          }}
        >
          DIABLO II
        </h1>
        <div className="text-[11px] text-[#663300] tracking-[2px] mb-6" style={{ fontFamily: 'serif' }}>
          LORD OF DESTRUCTION
        </div>

        {/* Character selection */}
        <div className="text-[11px] text-[#886644] mb-3 tracking-wider">SELECT CHARACTER CLASS</div>

        <div className="flex flex-col gap-[2px] w-[260px]">
          {CHARACTER_CLASSES.map((cls, i) => (
            <button
              key={cls.name}
              onClick={() => { setSelectedClass(i); setShowError(true); }}
              onMouseEnter={() => setSelectedClass(i)}
              className="py-[6px] px-4 text-left cursor-pointer border transition-colors"
              style={{
                background: selectedClass === i
                  ? 'linear-gradient(to right, rgba(153,68,0,0.3), transparent)'
                  : 'transparent',
                borderColor: selectedClass === i ? '#663300' : 'transparent',
                color: selectedClass === i ? '#ffaa44' : '#886644',
                fontFamily: 'serif',
                fontSize: '13px',
              }}
            >
              <div className="font-bold">{cls.name}</div>
              <div className="text-[10px] opacity-70">{cls.desc}</div>
            </button>
          ))}
        </div>

        {/* Bottom decorative line */}
        <div className="mt-auto mb-2 w-[200px] h-px bg-gradient-to-r from-transparent via-[#663300] to-transparent" />
        <div className="text-[9px] text-[#442200]">
          &copy; 2000 Blizzard Entertainment
        </div>
      </div>

      {showError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
          <Dialog98
            title="Diablo II"
            icon="error"
            message="Unable to connect to Battle.net. Please check your Internet connection and try again."
            buttons={[{ label: 'OK', onClick: () => setShowError(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
