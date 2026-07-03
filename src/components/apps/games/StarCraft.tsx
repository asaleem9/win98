'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';
import { playSound } from '@/lib/sounds';
import RtsGame from './engine/RtsGame';
import { RtsConfig } from './engine/rts';

const STARCRAFT_CONFIG: RtsConfig = {
  gameId: 'starcraft',
  resourceName: 'Minerals',
  workerName: 'SCV',
  soldierName: 'Marine',
  baseName: 'Command Center',
  depotName: 'Supply Depot',
  prodName: 'Barracks',
  enemyBaseName: 'Hatchery',
  colors: {
    player: '#3b7ddd',
    enemy: '#a445c9',
    resource: '#4fd6e0',
    terrain: '#233043',
    grid: 'rgba(120,150,190,0.12)',
  },
  costs: { worker: 50, depot: 100, prod: 150, soldier: 50 },
  supplyPerDepot: 8,
  startSupply: 10,
  stats: {
    workerHp: 40,
    workerSpeed: 70,
    soldierHp: 45,
    soldierSpeed: 60,
    soldierDamage: 6,
    soldierRange: 34,
    soldierRate: 0.7,
    baseHp: 1500,
    depotHp: 500,
    prodHp: 850,
    aggroRange: 90,
    harvestAmount: 8,
    harvestTime: 1.6,
  },
  map: {
    width: 620,
    height: 400,
    playerBase: { x: 95, y: 320 },
    enemyBase: { x: 535, y: 80 },
    patches: [
      { x: 60, y: 250, amount: 1500 },
      { x: 120, y: 250, amount: 1500 },
      { x: 55, y: 350, amount: 1500 },
      { x: 175, y: 330, amount: 1200 },
    ],
  },
  waveIntervalSec: 90,
  startResource: 150,
  startWorkers: 4,
  winText: 'The Zerg Hatchery is destroyed. The sector is secure, Commander.',
  loseText: 'Your Command Center has been overrun. The Swarm consumes all.',
};

export default function StarCraft({ windowId }: AppComponentProps) {
  void windowId;
  const [screen, setScreen] = useState<'title' | 'game'>('title');
  const [showError, setShowError] = useState(false);

  // Star positions are random; a lazy useState initializer runs once and keeps
  // Math.random out of the render body (the purity rule forbids it there).
  const [stars] = useState(() =>
    Array.from({ length: 30 }, () => ({
      big: Math.random() > 0.7,
      top: Math.random() * 100,
      left: Math.random() * 100,
      opacity: 0.3 + Math.random() * 0.5,
    })),
  );

  if (screen === 'game') {
    return <RtsGame config={STARCRAFT_CONFIG} onExit={() => setScreen('title')} />;
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 30% 20%, #0a1628 0%, #050d1a 50%, #020508 100%)' }}
      />
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: s.big ? 2 : 1,
            height: s.big ? 2 : 1,
            top: `${s.top}%`,
            left: `${s.left}%`,
            opacity: s.opacity,
          }}
        />
      ))}
      <div
        className="absolute top-[20%] right-[10%] w-[150px] h-[100px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(ellipse, #0088cc, transparent)' }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-3 p-4">
        <h1
          className="text-[30px] font-bold tracking-[3px] mb-1"
          style={{
            color: '#44aacc',
            textShadow: '0 0 15px rgba(68,170,204,0.5), 0 0 30px rgba(68,170,204,0.2)',
            fontFamily: 'sans-serif',
          }}
        >
          STARCRAFT
        </h1>
        <div className="w-[180px] h-px bg-gradient-to-r from-transparent via-[#44aacc] to-transparent mb-4" />

        <div className="flex flex-col gap-[6px] w-[200px]">
          {(['Single Player', 'Multiplayer', 'Campaign Editor', 'Exit'] as const).map((label) => (
            <button
              key={label}
              onClick={() => {
                if (label === 'Single Player') {
                  playSound('ding');
                  setScreen('game');
                } else {
                  playSound('error');
                  setShowError(true);
                }
              }}
              className="py-[6px] px-4 text-[12px] cursor-pointer border text-center transition-colors hover:bg-[#0a2040] hover:border-[#44aacc]"
              style={{
                background: 'linear-gradient(to bottom, #0d1a2e, #081422)',
                borderColor: '#1a3a55',
                color: '#88ccdd',
                fontFamily: 'sans-serif',
                letterSpacing: '1px',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 text-[9px] text-[#1a3a55]">&copy; 1998 Blizzard Entertainment</div>
      </div>

      {showError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
          <Dialog98
            title="StarCraft"
            icon="error"
            message="Please insert the StarCraft CD to continue."
            buttons={[{ label: 'OK', onClick: () => setShowError(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
