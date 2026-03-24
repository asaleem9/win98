'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';

const LEVELS = [
  { name: 'The Hangar', location: 'Mulhawk Airfield' },
  { name: 'School II', location: 'Southern California' },
  { name: 'Marseille', location: 'Marseille, France' },
  { name: 'NY City', location: 'New York City, NY' },
  { name: 'Venice Beach', location: 'Venice, CA' },
  { name: 'Skatestreet', location: 'Ventura, CA' },
  { name: 'Philadelphia', location: 'Philadelphia, PA' },
  { name: 'The Bullring', location: 'Mexico' },
];

export default function TonyHawk2({ windowId }: AppComponentProps) {
  const [showError, setShowError] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(0);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Background - 90s extreme sports */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, #0a0a0a 0%, #1a1a0a 50%, #0a0a0a 100%)',
        }}
      />

      {/* Grunge scratch lines */}
      <div className="absolute inset-0 opacity-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-[#ccff00]"
            style={{
              width: 1,
              height: `${30 + Math.random() * 40}%`,
              left: `${10 + i * 12}%`,
              top: `${Math.random() * 30}%`,
              transform: `rotate(${-20 + Math.random() * 40}deg)`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 p-4">
        {/* Title */}
        <div className="text-center mb-3">
          <div className="text-[10px] text-[#999] tracking-[3px] mb-1">TONY HAWK&apos;S</div>
          <h1
            className="text-[26px] font-black tracking-tight leading-none"
            style={{
              color: '#ccff00',
              textShadow: '2px 2px 0 #1a2200, 0 0 15px rgba(204,255,0,0.3)',
              fontFamily: 'sans-serif',
            }}
          >
            PRO SKATER 2
          </h1>
          <div className="w-[180px] h-[2px] bg-gradient-to-r from-transparent via-[#ccff00] to-transparent mx-auto mt-2" />
        </div>

        {/* Level select */}
        <div className="text-[10px] text-[#888] tracking-wider text-center mb-2">SELECT LEVEL</div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-[2px]">
            {LEVELS.map((level, i) => (
              <button
                key={level.name}
                onClick={() => { setSelectedLevel(i); setShowError(true); }}
                onMouseEnter={() => setSelectedLevel(i)}
                className="py-[5px] px-3 text-left cursor-pointer border transition-colors flex justify-between items-center"
                style={{
                  background: selectedLevel === i
                    ? 'linear-gradient(to right, rgba(204,255,0,0.15), transparent)'
                    : 'transparent',
                  borderColor: selectedLevel === i ? '#ccff00' : 'transparent',
                  color: selectedLevel === i ? '#ccff00' : '#666',
                }}
              >
                <span className="text-[12px] font-bold">{level.name}</span>
                <span className="text-[10px] opacity-60">{level.location}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#333]">
          <div className="text-[10px] text-[#555]">Career Mode</div>
          <div className="text-[10px] text-[#ccff00]">$0 earned</div>
        </div>
      </div>

      {showError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
          <Dialog98
            title="Tony Hawk's Pro Skater 2"
            icon="error"
            message="Error loading level data. Please verify game files are installed correctly."
            buttons={[{ label: 'OK', onClick: () => setShowError(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
