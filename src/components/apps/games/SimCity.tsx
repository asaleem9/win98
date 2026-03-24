'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';

export default function SimCity({ windowId }: AppComponentProps) {
  const [showError, setShowError] = useState(false);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Background - blue theme */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#000033] via-[#000066] to-[#000044]" />

      {/* Grid lines for isometric feel */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-px bg-[#4488cc] left-0 right-0"
            style={{ top: `${i * 5 + 5}%` }}
          />
        ))}
      </div>

      {/* City silhouette */}
      <div className="absolute bottom-0 left-0 right-0 h-[45%]">
        <svg viewBox="0 0 500 150" className="w-full h-full" preserveAspectRatio="xMidYMax meet">
          {/* Buildings */}
          <rect x="30" y="50" width="25" height="100" fill="#1a3366" />
          <rect x="32" y="55" width="5" height="7" fill="#ffff66" opacity="0.7" />
          <rect x="42" y="55" width="5" height="7" fill="#ffff66" opacity="0.5" />
          <rect x="32" y="70" width="5" height="7" fill="#ffff66" opacity="0.6" />

          <rect x="70" y="20" width="30" height="130" fill="#1a3366" />
          <rect x="73" y="25" width="5" height="7" fill="#ffff66" opacity="0.8" />
          <rect x="88" y="25" width="5" height="7" fill="#ffff66" opacity="0.5" />
          <rect x="73" y="40" width="5" height="7" fill="#ffff66" opacity="0.4" />
          <rect x="88" y="55" width="5" height="7" fill="#ffff66" opacity="0.7" />

          <rect x="120" y="60" width="20" height="90" fill="#1a3366" />
          <rect x="123" y="65" width="4" height="6" fill="#ffff66" opacity="0.6" />

          <rect x="160" y="30" width="35" height="120" fill="#1a3366" />
          <rect x="163" y="35" width="5" height="7" fill="#ffff66" opacity="0.7" />
          <rect x="180" y="35" width="5" height="7" fill="#ffff66" opacity="0.5" />
          <rect x="163" y="50" width="5" height="7" fill="#ffff66" opacity="0.8" />
          <rect x="180" y="65" width="5" height="7" fill="#ffff66" opacity="0.4" />

          <rect x="210" y="70" width="18" height="80" fill="#1a3366" />
          <rect x="240" y="40" width="28" height="110" fill="#1a3366" />
          <rect x="243" y="45" width="5" height="7" fill="#ffff66" opacity="0.6" />
          <rect x="258" y="60" width="5" height="7" fill="#ffff66" opacity="0.7" />

          <rect x="285" y="15" width="22" height="135" fill="#1a3366" />
          <rect x="288" y="20" width="4" height="6" fill="#ffff66" opacity="0.8" />
          <rect x="288" y="35" width="4" height="6" fill="#ffff66" opacity="0.5" />

          <rect x="320" y="55" width="30" height="95" fill="#1a3366" />
          <rect x="323" y="60" width="5" height="7" fill="#ffff66" opacity="0.7" />
          <rect x="340" y="60" width="5" height="7" fill="#ffff66" opacity="0.4" />

          <rect x="370" y="75" width="15" height="75" fill="#1a3366" />
          <rect x="400" y="45" width="25" height="105" fill="#1a3366" />
          <rect x="403" y="50" width="5" height="7" fill="#ffff66" opacity="0.6" />

          <rect x="440" y="65" width="20" height="85" fill="#1a3366" />
          <rect x="470" y="80" width="30" height="70" fill="#1a3366" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-3 p-4">
        <h1
          className="text-[32px] font-bold tracking-wider"
          style={{
            color: '#66aaff',
            textShadow: '0 0 20px rgba(100,170,255,0.5), 2px 2px 0 #001133',
            fontFamily: 'serif',
          }}
        >
          SimCity 2000
        </h1>
        <div className="text-[12px] text-[#88aacc] mb-4" style={{ fontFamily: 'serif' }}>
          The Ultimate City Simulator
        </div>

        <div className="flex flex-col gap-2 w-[180px]">
          {['New City', 'Load City', 'Edit Scenario', 'Quit'].map(label => (
            <button
              key={label}
              onClick={() => setShowError(true)}
              className="py-2 px-4 text-[12px] cursor-pointer border text-center"
              style={{
                background: 'linear-gradient(to bottom, #2255aa, #113377)',
                borderColor: '#4488cc',
                color: '#aaccff',
                fontFamily: 'serif',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 text-[10px] text-[#446688]">
          &copy; 1993 Maxis Software
        </div>
      </div>

      {showError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/30">
          <Dialog98
            title="SimCity 2000"
            icon="error"
            message="Please insert the SimCity 2000 CD-ROM to continue."
            buttons={[{ label: 'OK', onClick: () => setShowError(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
