'use client';

import { useState, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';

export default function SpaceCadetPinball({ windowId }: AppComponentProps) {
  const [score, setScore] = useState(0);
  const [balls, setBalls] = useState(3);
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState('Press F2 to start');

  const handleStart = useCallback(() => {
    if (!started) {
      setStarted(true);
      setScore(0);
      setBalls(3);
      setMessage('MISSION 1: Launch Training');
    }
  }, [started]);

  const handleBumper = useCallback((points: number) => {
    if (!started || balls <= 0) return;
    setScore(s => s + points);
    if (Math.random() < 0.15) {
      setBalls(b => {
        const next = b - 1;
        if (next <= 0) {
          setStarted(false);
          setMessage('GAME OVER - Press F2 to start');
        }
        return next;
      });
    }
  }, [started, balls]);

  const formatScore = (n: number) => String(n).padStart(9, '0');

  return (
    <div
      className="flex flex-col h-full bg-[#1a0033] select-none overflow-hidden"
      onKeyDown={e => { if (e.key === 'F2') { e.preventDefault(); handleStart(); } }}
      tabIndex={0}
    >
      {/* Score header */}
      <div className="flex justify-between items-center px-3 py-1 bg-[#0d001a] border-b border-[#330066]">
        <div className="flex gap-4">
          <div className="text-[10px]">
            <span className="text-[#666] mr-1">1UP</span>
            <span className="text-[#ff3333] font-[family-name:monospace] text-[13px]">{formatScore(score)}</span>
          </div>
        </div>
        <div className="text-[10px]">
          <span className="text-[#666] mr-1">BALLS</span>
          <span className="text-[#ffff33] font-[family-name:monospace] text-[13px]">{balls}</span>
        </div>
      </div>

      {/* Pinball table */}
      <div className="flex-1 relative mx-2 my-1 overflow-hidden">
        {/* Table background */}
        <div className="absolute inset-0 rounded-t-[40px] border-2 border-[#4400aa] overflow-hidden"
          style={{ background: 'linear-gradient(to bottom, #1a0044, #0d0022)' }}>

          {/* Top bumper area */}
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 flex gap-5">
            {[500, 750, 500].map((pts, i) => (
              <button
                key={i}
                onClick={() => handleBumper(pts)}
                className="w-[32px] h-[32px] rounded-full border-2 cursor-pointer flex items-center justify-center text-[8px] font-bold transition-transform active:scale-90"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #ff6633, #cc3300)',
                  borderColor: '#ff9966',
                  color: '#fff',
                  boxShadow: '0 0 8px rgba(255,102,51,0.5)',
                }}
              >
                {pts}
              </button>
            ))}
          </div>

          {/* Middle bumpers */}
          <div className="absolute top-[25%] left-[20%]">
            <button
              onClick={() => handleBumper(250)}
              className="w-[28px] h-[28px] rounded-full border-2 cursor-pointer flex items-center justify-center text-[8px] font-bold active:scale-90"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #3366ff, #0033cc)',
                borderColor: '#6699ff',
                color: '#fff',
                boxShadow: '0 0 6px rgba(51,102,255,0.5)',
              }}
            >
              250
            </button>
          </div>
          <div className="absolute top-[30%] right-[20%]">
            <button
              onClick={() => handleBumper(250)}
              className="w-[28px] h-[28px] rounded-full border-2 cursor-pointer flex items-center justify-center text-[8px] font-bold active:scale-90"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #3366ff, #0033cc)',
                borderColor: '#6699ff',
                color: '#fff',
                boxShadow: '0 0 6px rgba(51,102,255,0.5)',
              }}
            >
              250
            </button>
          </div>

          {/* Ramps - diagonal lines */}
          <div className="absolute top-[18%] left-[8%] w-[2px] h-[30%] bg-[#6600cc] origin-top rotate-[15deg]" />
          <div className="absolute top-[18%] right-[8%] w-[2px] h-[30%] bg-[#6600cc] origin-top -rotate-[15deg]" />

          {/* Score targets row */}
          <div className="absolute top-[48%] left-1/2 -translate-x-1/2 flex gap-2">
            {[100, 200, 300, 200, 100].map((pts, i) => (
              <button
                key={i}
                onClick={() => handleBumper(pts)}
                className="w-[20px] h-[24px] rounded-t-full border border-[#cc00ff] cursor-pointer flex items-center justify-center text-[7px] active:scale-90"
                style={{
                  background: started ? '#330066' : '#1a0033',
                  color: '#cc66ff',
                }}
              >
                {pts}
              </button>
            ))}
          </div>

          {/* Slingshots */}
          <div
            className="absolute bottom-[25%] left-[12%] w-[35px] h-[60px]"
            style={{
              borderLeft: '2px solid #ffcc00',
              borderBottom: '2px solid #ffcc00',
              transform: 'skewY(-15deg)',
            }}
          />
          <div
            className="absolute bottom-[25%] right-[12%] w-[35px] h-[60px]"
            style={{
              borderRight: '2px solid #ffcc00',
              borderBottom: '2px solid #ffcc00',
              transform: 'skewY(15deg)',
            }}
          />

          {/* Flippers */}
          <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 flex gap-[30px]">
            <button
              onClick={() => handleBumper(50)}
              className="cursor-pointer active:rotate-[-30deg] transition-transform"
              style={{
                width: 50,
                height: 12,
                background: 'linear-gradient(to right, #cccccc, #999999)',
                borderRadius: '6px 2px 2px 6px',
                transformOrigin: 'right center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            />
            <button
              onClick={() => handleBumper(50)}
              className="cursor-pointer active:rotate-[30deg] transition-transform"
              style={{
                width: 50,
                height: 12,
                background: 'linear-gradient(to left, #cccccc, #999999)',
                borderRadius: '2px 6px 6px 2px',
                transformOrigin: 'left center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            />
          </div>

          {/* Drain */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40px] h-[12px] bg-black rounded-t-sm" />

          {/* Ball launcher lane */}
          <div className="absolute top-0 bottom-0 right-0 w-[20px] bg-[#0d001a] border-l border-[#330066]">
            <button
              onClick={handleStart}
              className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-[14px] h-[14px] rounded-full border border-[#666] cursor-pointer active:translate-y-[4px]"
              style={{ background: 'radial-gradient(circle at 30% 30%, #ff3333, #990000)' }}
            />
          </div>
        </div>
      </div>

      {/* Message bar */}
      <div className="h-[22px] flex items-center justify-center bg-[#0d001a] border-t border-[#330066]">
        <span className="text-[11px] text-[#ff9933] font-[family-name:monospace]">{message}</span>
      </div>
    </div>
  );
}
