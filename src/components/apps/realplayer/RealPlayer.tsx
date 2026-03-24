'use client';

import { useState, useEffect, useRef } from 'react';
import { AppComponentProps } from '@/types/app';

export default function RealPlayer({ windowId }: AppComponentProps) {
  const [bufferPercent, setBufferPercent] = useState(0);
  const [status, setStatus] = useState('Connecting...');
  const [isRebuffering, setIsRebuffering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setBufferPercent(prev => {
        if (prev >= 87) {
          setIsRebuffering(true);
          setStatus('Rebuffering...');
          setTimeout(() => {
            setIsRebuffering(false);
            setStatus('Buffering...');
          }, 2000);
          return 3;
        }
        const increment = Math.random() * 3 + 0.5;
        const next = Math.min(prev + increment, 87);
        setStatus(`Buffering... ${Math.floor(next)}%`);
        return next;
      });
    }, 800);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#3a3a3a] text-white font-[family-name:var(--win98-font)] text-[11px] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a4a] to-[#2a2a6a] px-3 py-1 flex items-center gap-2">
        <span className="font-bold text-[12px]">RealPlayer</span>
        <span className="text-[#aaaacc] text-[10px]">G2</span>
      </div>

      {/* Menu bar */}
      <div className="flex gap-4 px-3 py-[2px] bg-[#4a4a4a] border-b border-[#333] text-[11px] text-[#ccc]">
        <span className="cursor-default">File</span>
        <span className="cursor-default">View</span>
        <span className="cursor-default">Play</span>
        <span className="cursor-default">Favorites</span>
        <span className="cursor-default">Help</span>
      </div>

      {/* Video area */}
      <div className="flex-1 bg-black flex items-center justify-center relative mx-1 my-1">
        {/* RealPlayer logo watermark */}
        <div className="text-center">
          <div className="text-[20px] font-bold text-[#333] mb-2">
            <span className="text-[#1a1a4a]">Real</span>Player
          </div>
          <div className={`text-[14px] ${isRebuffering ? 'text-[#ff6633]' : 'text-[#888]'}`}>
            {status}
          </div>
          {/* Buffer bar */}
          <div className="w-[200px] h-[8px] bg-[#1a1a1a] border border-[#333] mt-3 mx-auto overflow-hidden">
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${bufferPercent}%`,
                background: isRebuffering
                  ? 'linear-gradient(to right, #cc3300, #ff6633)'
                  : 'linear-gradient(to right, #336699, #6699cc)',
              }}
            />
          </div>
          <div className="text-[10px] text-[#555] mt-2">
            RealVideo - 56Kbps stream
          </div>
        </div>
      </div>

      {/* Now playing info */}
      <div className="px-3 py-1 bg-[#333] text-[10px] text-[#aaa] truncate">
        clip: welcome_video.rm | Server: rtsp://media.real.com/welcome
      </div>

      {/* Transport controls */}
      <div className="flex items-center gap-1 px-2 py-1 bg-[#4a4a4a]">
        {/* Progress bar */}
        <div className="flex-1 h-[6px] bg-[#222] border border-[#555] mx-1">
          <div className="h-full bg-[#336699]" style={{ width: '0%' }} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-[2px] px-2 py-1 bg-[#4a4a4a] border-t border-[#555]">
        {['⏮', '⏪', '▶', '⏹', '⏩', '⏭'].map((icon, i) => (
          <button
            key={i}
            className="w-[26px] h-[22px] bg-[#555] border border-[#666] text-[12px] text-[#ccc] cursor-pointer hover:bg-[#666] active:bg-[#444] flex items-center justify-center"
          >
            {icon}
          </button>
        ))}
        <div className="ml-2 flex items-center gap-1">
          <span className="text-[10px] text-[#888]">Vol:</span>
          <div className="w-[60px] h-[6px] bg-[#222] border border-[#555]">
            <div className="h-full bg-[#669933] w-[70%]" />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center px-2 py-[2px] bg-[#3a3a3a] border-t border-[#555] text-[10px] text-[#888]">
        <span>00:00.0 / ??:??.?</span>
        <span className="ml-auto">56.0 Kbps</span>
      </div>
    </div>
  );
}
