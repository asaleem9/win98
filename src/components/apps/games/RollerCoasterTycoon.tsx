'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';

export default function RollerCoasterTycoon({ windowId }: AppComponentProps) {
  const [showError, setShowError] = useState(false);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Background - colorful park theme */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2d8a4e] via-[#3a9e5c] to-[#1a5e32]" />

      {/* Sky */}
      <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-[#4a9eff] via-[#6db3ff] to-[#87ceeb]">
        {/* Clouds */}
        <div className="absolute top-[15%] left-[10%] w-16 h-6 bg-white rounded-full opacity-80" />
        <div className="absolute top-[12%] left-[14%] w-12 h-5 bg-white rounded-full opacity-80" />
        <div className="absolute top-[25%] right-[20%] w-20 h-7 bg-white rounded-full opacity-70" />
        <div className="absolute top-[22%] right-[17%] w-14 h-5 bg-white rounded-full opacity-70" />
      </div>

      {/* Roller coaster track silhouette */}
      <div className="absolute bottom-[30%] left-0 right-0 h-[35%]">
        <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M0,80 Q50,10 100,50 Q130,75 160,30 Q190,-10 220,40 Q250,70 280,20 Q310,-5 340,50 Q370,80 400,60"
            fill="none"
            stroke="#654321"
            strokeWidth="3"
          />
          <path
            d="M0,83 Q50,13 100,53 Q130,78 160,33 Q190,-7 220,43 Q250,73 280,23 Q310,-2 340,53 Q370,83 400,63"
            fill="none"
            stroke="#8B6914"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-2 p-4">
        {/* Title */}
        <div className="text-center mb-2">
          <h1
            className="text-[28px] font-bold leading-tight"
            style={{
              color: '#FFD700',
              textShadow: '2px 2px 0 #8B4513, -1px -1px 0 #654321, 1px -1px 0 #654321, -1px 1px 0 #654321',
              fontFamily: 'serif',
            }}
          >
            RollerCoaster Tycoon
          </h1>
          <div
            className="text-[14px] mt-1"
            style={{
              color: '#FFF8DC',
              textShadow: '1px 1px 0 #654321',
              fontFamily: 'serif',
            }}
          >
            Forest Frontiers
          </div>
        </div>

        {/* Park entrance graphic */}
        <div className="w-[120px] h-[80px] relative mb-3">
          <div className="absolute bottom-0 left-[10px] w-[20px] h-[60px] bg-gradient-to-b from-[#8B4513] to-[#654321] rounded-t-sm" />
          <div className="absolute bottom-0 right-[10px] w-[20px] h-[60px] bg-gradient-to-b from-[#8B4513] to-[#654321] rounded-t-sm" />
          <div className="absolute top-[10px] left-[5px] right-[5px] h-[20px] bg-gradient-to-b from-[#DAA520] to-[#B8860B] rounded-t-lg flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">PARK ENTRANCE</span>
          </div>
        </div>

        {/* Menu buttons */}
        <div className="flex flex-col gap-2 w-[200px]">
          {['New Game', 'Load Game', 'Options', 'Exit'].map(label => (
            <button
              key={label}
              onClick={() => setShowError(true)}
              className="py-2 px-4 text-[13px] font-bold cursor-pointer border-2 rounded-sm"
              style={{
                background: 'linear-gradient(to bottom, #FFD700, #DAA520)',
                borderColor: '#8B4513',
                color: '#4a2800',
                textShadow: '0 1px 0 rgba(255,255,255,0.3)',
                fontFamily: 'serif',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 text-[10px] text-[#d4e8d4]" style={{ textShadow: '1px 1px 0 #000' }}>
          &copy; 1999 Chris Sawyer
        </div>
      </div>

      {/* CD-ROM Error Dialog */}
      {showError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/30">
          <Dialog98
            title="RollerCoaster Tycoon"
            icon="error"
            message="Please insert the RollerCoaster Tycoon CD-ROM to continue."
            buttons={[{ label: 'OK', onClick: () => setShowError(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
