'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';

export default function CommandConquer({ windowId }: AppComponentProps) {
  const [showError, setShowError] = useState(false);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Background - dark red military */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #1a0000 0%, #2a0a0a 30%, #0a0a0a 60%, #1a0505 100%)',
        }}
      />

      {/* Soviet star watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]">
        <svg width="300" height="300" viewBox="0 0 100 100">
          <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35" fill="#ff0000" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-3 p-4">
        {/* Title */}
        <div className="text-center mb-2">
          <div className="text-[11px] text-[#cc4444] tracking-[3px] mb-1">COMMAND &amp; CONQUER</div>
          <h1
            className="text-[28px] font-bold tracking-[2px]"
            style={{
              color: '#cc0000',
              textShadow: '0 0 10px rgba(204,0,0,0.4), 2px 2px 0 #330000',
              fontFamily: 'sans-serif',
            }}
          >
            RED ALERT
          </h1>
          <div className="w-[200px] h-[2px] bg-gradient-to-r from-transparent via-[#cc0000] to-transparent mx-auto mt-2" />
        </div>

        {/* Faction selection */}
        <div className="text-[11px] text-[#886666] mb-3 tracking-wider">SELECT YOUR FACTION</div>

        <div className="flex gap-4">
          {/* Allied */}
          <button
            onClick={() => setShowError(true)}
            className="w-[130px] h-[120px] flex flex-col items-center justify-center gap-2 cursor-pointer border-2 transition-colors hover:border-[#4488cc] hover:bg-[#0a1525]"
            style={{
              background: 'linear-gradient(to bottom, #0a1a2e, #050d18)',
              borderColor: '#1a3050',
            }}
          >
            {/* Allied star */}
            <svg width="40" height="40" viewBox="0 0 100 100">
              <polygon points="50,10 61,35 90,35 67,55 76,80 50,65 24,80 33,55 10,35 39,35" fill="none" stroke="#4488cc" strokeWidth="3" />
            </svg>
            <span className="text-[13px] font-bold text-[#4488cc]">ALLIED</span>
          </button>

          {/* Soviet */}
          <button
            onClick={() => setShowError(true)}
            className="w-[130px] h-[120px] flex flex-col items-center justify-center gap-2 cursor-pointer border-2 transition-colors hover:border-[#cc4444] hover:bg-[#250a0a]"
            style={{
              background: 'linear-gradient(to bottom, #2a0a0a, #180505)',
              borderColor: '#502020',
            }}
          >
            {/* Soviet sickle hint */}
            <svg width="40" height="40" viewBox="0 0 100 100">
              <polygon points="50,10 61,35 90,35 67,55 76,80 50,65 24,80 33,55 10,35 39,35" fill="#cc0000" />
            </svg>
            <span className="text-[13px] font-bold text-[#cc4444]">SOVIET</span>
          </button>
        </div>

        <div className="mt-4 text-[9px] text-[#443333]">
          &copy; 1996 Westwood Studios
        </div>
      </div>

      {showError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
          <Dialog98
            title="Command & Conquer: Red Alert"
            icon="error"
            message="CD-ROM not found. Please insert the Command & Conquer: Red Alert disc."
            buttons={[{ label: 'OK', onClick: () => setShowError(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
