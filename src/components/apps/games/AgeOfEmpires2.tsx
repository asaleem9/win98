'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';

export default function AgeOfEmpires2({ windowId }: AppComponentProps) {
  const [showError, setShowError] = useState(false);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Background - dark stone texture */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #1a1a0e 0%, #2a2a1a 25%, #1e1e12 50%, #252518 75%, #1a1a0e 100%)',
        }}
      />

      {/* Stone border overlay */}
      <div className="absolute inset-0 border-[12px]" style={{ borderColor: '#3a3520', borderStyle: 'ridge' }} />

      {/* Inner border */}
      <div className="absolute inset-[12px] border-2" style={{ borderColor: '#5a4f30' }} />

      {/* Chain/decoration elements */}
      <div className="absolute top-[20px] left-[20px] w-[8px] h-[8px] rounded-full bg-[#8B7355] shadow-[0_0_3px_#000]" />
      <div className="absolute top-[20px] right-[20px] w-[8px] h-[8px] rounded-full bg-[#8B7355] shadow-[0_0_3px_#000]" />
      <div className="absolute bottom-[20px] left-[20px] w-[8px] h-[8px] rounded-full bg-[#8B7355] shadow-[0_0_3px_#000]" />
      <div className="absolute bottom-[20px] right-[20px] w-[8px] h-[8px] rounded-full bg-[#8B7355] shadow-[0_0_3px_#000]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-2 p-8">
        {/* Shield emblem */}
        <div className="w-[60px] h-[70px] relative mb-2">
          <div
            className="absolute inset-0 rounded-b-[50%]"
            style={{
              background: 'linear-gradient(to bottom, #DAA520, #8B6914)',
              border: '2px solid #5a4f30',
            }}
          />
          <div
            className="absolute inset-[4px] rounded-b-[50%] flex items-center justify-center"
            style={{ background: 'linear-gradient(to bottom, #1a0000, #330000)' }}
          >
            <span className="text-[#DAA520] text-[24px] font-bold" style={{ fontFamily: 'serif' }}>II</span>
          </div>
        </div>

        <h1
          className="text-[20px] font-bold text-center leading-tight"
          style={{
            color: '#DAA520',
            textShadow: '1px 1px 2px #000, 0 0 10px rgba(218,165,32,0.3)',
            fontFamily: 'serif',
          }}
        >
          Age of Empires II
        </h1>
        <div
          className="text-[13px] mb-4"
          style={{
            color: '#B8860B',
            fontFamily: 'serif',
          }}
        >
          The Age of Kings
        </div>

        <div className="flex flex-col gap-[6px] w-[200px]">
          {['Single Player', 'Multiplayer', 'Map Editor', 'Help', 'Exit'].map(label => (
            <button
              key={label}
              onClick={() => setShowError(true)}
              className="py-[6px] px-4 text-[12px] cursor-pointer border-2 text-center"
              style={{
                background: 'linear-gradient(to bottom, #3a3520, #252018)',
                borderColor: '#5a4f30',
                color: '#DAA520',
                fontFamily: 'serif',
                textShadow: '1px 1px 0 #000',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 text-[9px] text-[#5a4f30]">
          &copy; 1999 Microsoft Corporation / Ensemble Studios
        </div>
      </div>

      {showError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
          <Dialog98
            title="Age of Empires II"
            icon="error"
            message="CD-ROM not found. Please insert the Age of Empires II: The Age of Kings disc."
            buttons={[{ label: 'OK', onClick: () => setShowError(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
