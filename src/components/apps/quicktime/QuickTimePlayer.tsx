'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';

export default function QuickTimePlayer({ windowId }: AppComponentProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[#d0d0d0] font-[family-name:var(--win98-font)] text-[11px] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-[3px]"
        style={{ background: 'linear-gradient(to bottom, #b8c8e0, #8898b0)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-[14px] h-[14px] rounded-sm bg-gradient-to-b from-[#4488cc] to-[#2266aa] flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">Q</span>
          </div>
          <span className="text-[11px] font-bold text-[#333]">QuickTime Player</span>
        </div>
      </div>

      {/* Menu */}
      <div className="flex gap-4 px-3 py-[2px] bg-[#c8c8c8] border-b border-[#aaa] text-[11px] text-[#333]">
        <span className="cursor-default hover:underline" onClick={() => setShowUpgrade(true)}>File</span>
        <span className="cursor-default hover:underline" onClick={() => setShowUpgrade(true)}>Edit</span>
        <span className="cursor-default hover:underline" onClick={() => setShowUpgrade(true)}>Movie</span>
        <span className="cursor-default hover:underline" onClick={() => setShowUpgrade(true)}>Help</span>
      </div>

      {/* Video area */}
      <div className="flex-1 bg-black flex items-center justify-center relative m-[2px]">
        <div className="text-center">
          <div className="w-[40px] h-[40px] mx-auto mb-3 rounded bg-gradient-to-b from-[#4488cc] to-[#2266aa] flex items-center justify-center">
            <span className="text-white text-[22px] font-bold">Q</span>
          </div>
          <div className="text-[#888] text-[12px]">QuickTime Player</div>
          <div className="text-[#555] text-[10px] mt-1">No movie loaded</div>
        </div>
      </div>

      {/* Transport controls */}
      <div className="bg-[#d0d0d0] px-[2px] pb-[2px]">
        {/* Timeline */}
        <div className="mx-2 my-[3px]">
          <div className="h-[8px] bg-[#999] rounded-sm border border-[#777] relative">
            <div className="absolute left-[1px] top-[1px] bottom-[1px] w-[5px] bg-[#ccc] rounded-sm" />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-[1px] pb-1">
          {['⏮', '◀', '▶', '▶▶', '⏭'].map((icon, i) => (
            <button
              key={i}
              onClick={() => setShowUpgrade(true)}
              className="w-[24px] h-[18px] rounded-sm text-[10px] cursor-pointer flex items-center justify-center"
              style={{
                background: 'linear-gradient(to bottom, #e8e8e8, #c8c8c8)',
                border: '1px solid #999',
                color: '#333',
              }}
            >
              {icon}
            </button>
          ))}
          <div className="w-[1px] h-[14px] bg-[#999] mx-1" />
          {/* Volume */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[#666]">Vol</span>
            <div className="w-[40px] h-[6px] bg-[#999] rounded-sm border border-[#777]">
              <div className="h-full w-[60%] bg-[#4488cc] rounded-sm" />
            </div>
          </div>
        </div>
      </div>

      {showUpgrade && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20">
          <Dialog98
            title="QuickTime Player"
            icon="info"
            message={
              <div>
                <p className="font-bold mb-1">QuickTime Pro Required</p>
                <p>This feature requires QuickTime Pro ($29.99).</p>
                <p className="mt-1 text-[10px] text-[#666]">Upgrade at www.apple.com/quicktime</p>
              </div>
            }
            buttons={[
              { label: 'Buy Now...', onClick: () => setShowUpgrade(false) },
              { label: 'Later', onClick: () => setShowUpgrade(false), default: true },
            ]}
          />
        </div>
      )}
    </div>
  );
}
