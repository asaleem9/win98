'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';
import { playSound } from '@/lib/sounds';
import RtsGame from './engine/RtsGame';
import { RtsConfig } from './engine/rts';

// The RTS engine again, in a Dark-Age melee dressing: villagers gather food,
// houses raise the population cap, the Barracks trains militia, and you can pay
// to Advance to the Feudal Age for stronger soldiers.
const AOE_CONFIG: RtsConfig = {
  gameId: 'age-of-empires-2',
  resourceName: 'Food',
  workerName: 'Villager',
  soldierName: 'Militia',
  baseName: 'Town Center',
  depotName: 'House',
  prodName: 'Barracks',
  enemyBaseName: 'Enemy Town Center',
  colors: {
    player: '#3a7d3a',
    enemy: '#8a2020',
    resource: '#d8b048',
    terrain: '#3f5024',
    grid: 'rgba(220,220,180,0.08)',
  },
  costs: { worker: 50, depot: 30, prod: 150, soldier: 60 },
  supplyPerDepot: 5,
  startSupply: 8,
  stats: {
    workerHp: 45,
    workerSpeed: 55,
    soldierHp: 55,
    soldierSpeed: 55,
    soldierDamage: 6,
    soldierRange: 24,
    soldierRate: 0.8,
    baseHp: 1800,
    depotHp: 400,
    prodHp: 800,
    aggroRange: 80,
    harvestAmount: 9,
    harvestTime: 2,
  },
  map: {
    width: 620,
    height: 400,
    playerBase: { x: 100, y: 310 },
    enemyBase: { x: 530, y: 90 },
    patches: [
      { x: 70, y: 230, amount: 1400 },
      { x: 150, y: 250, amount: 1400 },
      { x: 60, y: 340, amount: 1400 },
      { x: 210, y: 320, amount: 1100 },
    ],
  },
  waveIntervalSec: 95,
  startResource: 180,
  startWorkers: 3,
  advance: {
    cost: 200,
    label: 'Feudal Age',
    damageMult: 1.6,
    hpMult: 1.5,
    announce: 'Advancing to the Feudal Age! Militia become Men-at-Arms — stronger and tougher.',
  },
  winText: "The enemy Town Center falls. Your civilization rules the age. Wololo!",
  loseText: 'Your Town Center is razed. Your people are scattered to history.',
};

export default function AgeOfEmpires2({ windowId }: AppComponentProps) {
  void windowId;
  const [screen, setScreen] = useState<'title' | 'game'>('title');
  const [showError, setShowError] = useState(false);

  if (screen === 'game') {
    return <RtsGame config={AOE_CONFIG} onExit={() => setScreen('title')} />;
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #1a1a0e 0%, #2a2a1a 25%, #1e1e12 50%, #252518 75%, #1a1a0e 100%)',
        }}
      />
      <div className="absolute inset-0 border-[12px]" style={{ borderColor: '#3a3520', borderStyle: 'ridge' }} />
      <div className="absolute inset-[12px] border-2" style={{ borderColor: '#5a4f30' }} />
      <div className="absolute top-[20px] left-[20px] w-[8px] h-[8px] rounded-full bg-[#8B7355] shadow-[0_0_3px_#000]" />
      <div className="absolute top-[20px] right-[20px] w-[8px] h-[8px] rounded-full bg-[#8B7355] shadow-[0_0_3px_#000]" />
      <div className="absolute bottom-[20px] left-[20px] w-[8px] h-[8px] rounded-full bg-[#8B7355] shadow-[0_0_3px_#000]" />
      <div className="absolute bottom-[20px] right-[20px] w-[8px] h-[8px] rounded-full bg-[#8B7355] shadow-[0_0_3px_#000]" />

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-2 p-8">
        <div className="w-[60px] h-[70px] relative mb-2">
          <div
            className="absolute inset-0 rounded-b-[50%]"
            style={{ background: 'linear-gradient(to bottom, #DAA520, #8B6914)', border: '2px solid #5a4f30' }}
          />
          <div
            className="absolute inset-[4px] rounded-b-[50%] flex items-center justify-center"
            style={{ background: 'linear-gradient(to bottom, #1a0000, #330000)' }}
          >
            <span className="text-[#DAA520] text-[24px] font-bold" style={{ fontFamily: 'serif' }}>
              II
            </span>
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
        <div className="text-[13px] mb-4" style={{ color: '#B8860B', fontFamily: 'serif' }}>
          The Age of Kings
        </div>

        <div className="flex flex-col gap-[6px] w-[200px]">
          {(['Single Player', 'Multiplayer', 'Map Editor', 'Exit'] as const).map((label) => (
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

        <div className="mt-3 text-[9px] text-[#5a4f30]">&copy; 1999 Microsoft Corporation / Ensemble Studios</div>
      </div>

      {showError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
          <Dialog98
            title="Age of Empires II"
            icon="error"
            message="That mode needs the CD-ROM. Please insert the disc. (Single Player runs from the hard drive.)"
            buttons={[{ label: 'OK', onClick: () => setShowError(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
