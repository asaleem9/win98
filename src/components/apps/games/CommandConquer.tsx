'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';
import { playSound } from '@/lib/sounds';
import RtsGame from './engine/RtsGame';
import { RtsConfig } from './engine/rts';

// Same engine as StarCraft, re-skinned with Ore/Allies-vs-Soviets flavour, a
// different map layout and its own win text.
const CNC_CONFIG: RtsConfig = {
  gameId: 'command-conquer',
  resourceName: 'Ore',
  workerName: 'Ore Truck',
  soldierName: 'Rifle Infantry',
  baseName: 'Construction Yard',
  depotName: 'Power Plant',
  prodName: 'Barracks',
  enemyBaseName: 'Soviet Command Center',
  colors: {
    player: '#3a7fd0',
    enemy: '#c02020',
    resource: '#e0c840',
    terrain: '#3a2c18',
    grid: 'rgba(120,150,200,0.10)',
  },
  costs: { worker: 60, depot: 100, prod: 200, soldier: 50 },
  supplyPerDepot: 10,
  startSupply: 12,
  stats: {
    workerHp: 60,
    workerSpeed: 60,
    soldierHp: 40,
    soldierSpeed: 62,
    soldierDamage: 7,
    soldierRange: 30,
    soldierRate: 0.65,
    baseHp: 1600,
    depotHp: 450,
    prodHp: 900,
    aggroRange: 85,
    harvestAmount: 10,
    harvestTime: 1.8,
  },
  map: {
    width: 620,
    height: 400,
    playerBase: { x: 90, y: 80 },
    enemyBase: { x: 540, y: 320 },
    patches: [
      { x: 150, y: 60, amount: 1600 },
      { x: 90, y: 160, amount: 1600 },
      { x: 200, y: 130, amount: 1300 },
      { x: 300, y: 210, amount: 1200 },
    ],
  },
  waveIntervalSec: 85,
  startResource: 200,
  startWorkers: 3,
  winText: 'The Soviet Command Center lies in ruins. Allied forces hold the ore fields. Well done, Commander.',
  loseText: 'Your Construction Yard is destroyed. The Soviet advance cannot be stopped, Comrade.',
};

export default function CommandConquer({ windowId }: AppComponentProps) {
  void windowId;
  const [screen, setScreen] = useState<'title' | 'game'>('title');
  const [showError, setShowError] = useState(false);

  if (screen === 'game') {
    return <RtsGame config={CNC_CONFIG} onExit={() => setScreen('title')} />;
  }

  const startSkirmish = () => {
    playSound('ding');
    setScreen('game');
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #1a0000 0%, #2a0a0a 30%, #0a0a0a 60%, #1a0505 100%)' }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]">
        <svg width="300" height="300" viewBox="0 0 100 100">
          <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35" fill="#ff0000" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-3 p-4">
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

        <div className="text-[11px] text-[#886666] mb-3 tracking-wider">CHOOSE YOUR OPERATION</div>

        <div className="flex gap-4">
          <button
            onClick={startSkirmish}
            className="w-[130px] h-[120px] flex flex-col items-center justify-center gap-2 cursor-pointer border-2 transition-colors hover:border-[#4488cc] hover:bg-[#0a1525]"
            style={{ background: 'linear-gradient(to bottom, #0a1a2e, #050d18)', borderColor: '#1a3050' }}
          >
            <svg width="40" height="40" viewBox="0 0 100 100">
              <polygon
                points="50,10 61,35 90,35 67,55 76,80 50,65 24,80 33,55 10,35 39,35"
                fill="none"
                stroke="#5599dd"
                strokeWidth="3"
              />
            </svg>
            <span className="text-[13px] font-bold text-[#5599dd]">ALLIES</span>
            <span className="text-[9px] text-[#789]">Skirmish</span>
          </button>

          <button
            onClick={() => {
              playSound('error');
              setShowError(true);
            }}
            className="w-[130px] h-[120px] flex flex-col items-center justify-center gap-2 cursor-pointer border-2 transition-colors hover:border-[#cc4444] hover:bg-[#250a0a]"
            style={{ background: 'linear-gradient(to bottom, #2a0a0a, #180505)', borderColor: '#502020' }}
          >
            <svg width="40" height="40" viewBox="0 0 100 100">
              <polygon points="50,10 61,35 90,35 67,55 76,80 50,65 24,80 33,55 10,35 39,35" fill="#cc0000" />
            </svg>
            <span className="text-[13px] font-bold text-[#cc4444]">SOVIET</span>
            <span className="text-[9px] text-[#844]">Campaign</span>
          </button>
        </div>

        <div className="mt-4 text-[9px] text-[#443333]">&copy; 1996 Westwood Studios</div>
      </div>

      {showError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
          <Dialog98
            title="Command & Conquer: Red Alert"
            icon="error"
            message="The Soviet campaign is on Disc 2. Please insert the Soviet disc. (Try an Allied Skirmish instead.)"
            buttons={[{ label: 'OK', onClick: () => setShowError(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
