'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';
import { playSound } from '@/lib/sounds';
import RtsGame from './engine/RtsGame';
import { RtsConfig } from './engine/rts';

const STARCRAFT_CONFIG: RtsConfig = {
  gameId: 'starcraft',
  resources: [{ id: 'minerals', name: 'Minerals', color: '#4fd6e0' }],
  startResources: { minerals: 150 },
  colors: {
    player: '#3b7ddd',
    enemy: '#a445c9',
    terrain: '#233043',
    grid: 'rgba(120,150,190,0.12)',
  },
  factions: { player: 'blue', enemy: 'purple' },
  unitTypes: {
    scv: {
      name: 'SCV',
      role: 'worker',
      hp: 40,
      speed: 70,
      damage: 0,
      range: 0,
      rate: 1,
      cost: { minerals: 50 },
      supply: 1,
      trainedAt: 'base',
      sightRange: 110,
    },
    marine: {
      name: 'Marine',
      role: 'combat',
      hp: 45,
      speed: 60,
      damage: 6,
      range: 34,
      rate: 0.7,
      cost: { minerals: 50 },
      supply: 1,
      trainedAt: 'prod',
      sightRange: 120,
    },
  },
  buildingTypes: {
    base: {
      name: 'Command Center',
      hp: 1500,
      cost: { minerals: 400 },
      size: { w: 46, h: 46 },
      isBase: true,
      buildTimeSec: 0,
      sightRange: 200,
    },
    depot: {
      name: 'Supply Depot',
      hp: 500,
      cost: { minerals: 100 },
      size: { w: 30, h: 30 },
      supplyGrant: 8,
      buildTimeSec: 4,
    },
    prod: {
      name: 'Barracks',
      hp: 850,
      cost: { minerals: 150 },
      size: { w: 38, h: 38 },
      buildTimeSec: 6,
    },
  },
  startSupply: 10,
  aggroRange: 90,
  harvestAmount: 8,
  harvestTime: 1.6,
  map: {
    width: 620,
    height: 400,
    playerBase: { x: 95, y: 320 },
    enemyBase: { x: 535, y: 80 },
    patches: [
      { x: 60, y: 250, amount: 1500, resourceId: 'minerals' },
      { x: 120, y: 250, amount: 1500, resourceId: 'minerals' },
      { x: 55, y: 350, amount: 1500, resourceId: 'minerals' },
      { x: 175, y: 330, amount: 1200, resourceId: 'minerals' },
    ],
  },
  startUnits: [{ typeId: 'scv', count: 4 }],
  enemyStartUnits: [{ typeId: 'marine', count: 3 }],
  ai: {
    personality: 'swarm',
    buildOrder: [{ atSec: 35, buildingTypeId: 'prod' }],
    attackWaves: [
      { atSec: 90, comp: { marine: 3 }, target: 'base' },
      { atSec: 180, comp: { marine: 4 }, target: 'base' },
      { atSec: 270, comp: { marine: 5 }, target: 'base' },
      { atSec: 360, comp: { marine: 6 }, target: 'base' },
    ],
    rampFactor: 1.35,
  },
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
