'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';
import { playSound } from '@/lib/sounds';
import RtsGame from './engine/RtsGame';
import { RtsConfig } from './engine/rts';
import {
  VILLAGER,
  MILITIA,
  MAN_AT_ARMS,
  ARCHER,
  KNIGHT,
  TOWN_CENTER,
  HOUSE,
  BARRACKS,
  ARCHERY_RANGE,
  STABLE,
  FARM,
  WATCH_TOWER,
} from './engine/sprites/aoe2';

// The RTS engine in a medieval, age-progression dressing. Villagers gather Food
// (berry bushes) and Wood (forest lines); Houses raise the population cap. The
// game is a race up the ages: research the Feudal Age at the Town Center to open
// the Archery Range, Men-at-Arms and Watch Towers, then the Castle Age for the
// Stable and mounted Knights. Farms are the late-economy transition — a placed
// Farm seeds a fresh food patch once the berries run dry. The enemy is a booming
// AI: quiet early while it ages up, then it rolls out a mixed doom army. Punish
// the boom before ~4 minutes, or turtle up and survive the Knights.
export const AOE_CONFIG: RtsConfig = {
  gameId: 'age-of-empires-2',
  resources: [
    { id: 'food', name: 'Food', color: '#e0c24a' },
    { id: 'wood', name: 'Wood', color: '#8a6438' },
  ],
  startResources: { food: 200, wood: 200 },
  colors: {
    player: '#3a7d3a',
    enemy: '#8a2020',
    terrain: '#41521f',
    grid: 'rgba(220,220,180,0.07)',
  },
  factions: { player: 'green', enemy: 'red' },
  unitTypes: {
    villager: {
      name: 'Villager',
      role: 'worker',
      hp: 45,
      speed: 55,
      damage: 0,
      range: 0,
      rate: 1,
      cost: { food: 50 },
      supply: 1,
      trainedAt: 'base',
      sightRange: 110,
      sprite: VILLAGER,
    },
    militia: {
      name: 'Militia',
      role: 'combat',
      hp: 55,
      speed: 52,
      damage: 6,
      range: 22,
      rate: 0.9,
      cost: { food: 60 },
      supply: 1,
      trainedAt: 'barracks',
      sightRange: 120,
      sprite: MILITIA,
    },
    man_at_arms: {
      name: 'Man-at-Arms',
      role: 'combat',
      hp: 85,
      speed: 52,
      damage: 11,
      range: 22,
      rate: 0.85,
      cost: { food: 45, wood: 20 },
      supply: 1,
      trainedAt: 'barracks',
      sightRange: 120,
      requiresUpgrade: 'feudal',
      sprite: MAN_AT_ARMS,
    },
    archer: {
      name: 'Archer',
      role: 'combat',
      hp: 40,
      speed: 54,
      damage: 8,
      range: 62,
      rate: 1.1,
      cost: { wood: 45, food: 25 },
      supply: 1,
      trainedAt: 'range',
      sightRange: 130,
      requiresUpgrade: 'feudal',
      sprite: ARCHER,
    },
    knight: {
      name: 'Knight',
      role: 'combat',
      hp: 130,
      speed: 80,
      damage: 15,
      range: 22,
      rate: 0.85,
      cost: { food: 70, wood: 20 },
      supply: 2,
      trainedAt: 'stable',
      sightRange: 130,
      requiresUpgrade: 'castle',
      sprite: KNIGHT,
    },
  },
  buildingTypes: {
    base: {
      name: 'Town Center',
      hp: 1800,
      cost: { food: 275, wood: 100 },
      size: { w: 44, h: 40 },
      isBase: true,
      buildTimeSec: 0,
      sightRange: 200,
      sprite: TOWN_CENTER,
    },
    house: {
      name: 'House',
      hp: 450,
      cost: { wood: 25 },
      size: { w: 26, h: 24 },
      supplyGrant: 5,
      buildTimeSec: 4,
      sprite: HOUSE,
    },
    barracks: {
      name: 'Barracks',
      hp: 800,
      cost: { wood: 120 },
      size: { w: 34, h: 30 },
      buildTimeSec: 5,
      sprite: BARRACKS,
    },
    range: {
      name: 'Archery Range',
      hp: 750,
      cost: { wood: 150 },
      size: { w: 34, h: 30 },
      requiresUpgrade: 'feudal',
      buildTimeSec: 6,
      sprite: ARCHERY_RANGE,
    },
    stable: {
      name: 'Stable',
      hp: 850,
      cost: { wood: 150 },
      size: { w: 34, h: 30 },
      requiresUpgrade: 'castle',
      buildTimeSec: 6,
      sprite: STABLE,
    },
    farm: {
      name: 'Farm',
      hp: 180,
      cost: { wood: 60 },
      size: { w: 34, h: 22 },
      buildTimeSec: 3,
      farmYieldsResource: 'food',
      farmAmount: 250,
      sprite: FARM,
    },
    tower: {
      name: 'Watch Tower',
      hp: 900,
      cost: { wood: 80, food: 20 },
      size: { w: 22, h: 30 },
      requiresUpgrade: 'feudal',
      attack: { damage: 9, range: 95, rate: 1.1 },
      buildTimeSec: 5,
      sightRange: 150,
      sprite: WATCH_TOWER,
    },
  },
  upgrades: [
    {
      id: 'feudal',
      name: 'Feudal Age',
      cost: { food: 200 },
      researchTimeSec: 20,
      researchAt: 'base',
      effects: [],
      unlocksUnits: ['man_at_arms'],
      announce: 'You have advanced to the Feudal Age! Men-at-Arms, Archery Ranges and Watch Towers are yours.',
    },
    {
      id: 'castle',
      name: 'Castle Age',
      cost: { food: 300, wood: 150 },
      researchTimeSec: 30,
      researchAt: 'base',
      prereqUpgrade: 'feudal',
      effects: [],
      unlocksUnits: ['knight'],
      announce: 'You have advanced to the Castle Age! Build a Stable and ride out with Knights.',
    },
  ],
  startSupply: 10,
  aggroRange: 80,
  harvestAmount: 9,
  harvestTime: 2.2,
  map: {
    width: 640,
    height: 420,
    playerBase: { x: 110, y: 330 },
    enemyBase: { x: 530, y: 95 },
    patches: [
      // Berry bushes (food) tucked against the player's Town Center.
      { x: 70, y: 280, amount: 600, resourceId: 'food' },
      { x: 150, y: 290, amount: 600, resourceId: 'food' },
      { x: 75, y: 365, amount: 600, resourceId: 'food' },
      // Forest lines (wood) the player starts on.
      { x: 40, y: 230, amount: 500, resourceId: 'wood' },
      { x: 45, y: 300, amount: 500, resourceId: 'wood' },
      { x: 190, y: 365, amount: 500, resourceId: 'wood' },
      // A forest wall splitting the map, with a gap around y~220 as the choke.
      { x: 300, y: 60, amount: 400, resourceId: 'wood' },
      { x: 310, y: 110, amount: 400, resourceId: 'wood' },
      { x: 320, y: 160, amount: 400, resourceId: 'wood' },
      { x: 330, y: 275, amount: 400, resourceId: 'wood' },
      { x: 340, y: 325, amount: 400, resourceId: 'wood' },
      { x: 350, y: 375, amount: 400, resourceId: 'wood' },
      // Contested riches at the middle choke, worth fighting over.
      { x: 275, y: 215, amount: 900, resourceId: 'food' },
      { x: 385, y: 215, amount: 900, resourceId: 'wood' },
      // Enemy economy, feeding its boom near the top-right base.
      { x: 560, y: 150, amount: 600, resourceId: 'food' },
      { x: 595, y: 95, amount: 600, resourceId: 'food' },
      { x: 500, y: 55, amount: 550, resourceId: 'wood' },
      { x: 470, y: 140, amount: 550, resourceId: 'wood' },
    ],
  },
  startUnits: [{ typeId: 'villager', count: 4 }],
  enemyStartUnits: [
    { typeId: 'villager', count: 4 },
    { typeId: 'militia', count: 2 },
  ],
  ai: {
    personality: 'boom',
    buildOrder: [
      { atSec: 40, buildingTypeId: 'barracks' },
      { atSec: 70, buildingTypeId: 'house' },
      { atSec: 240, buildingTypeId: 'range' }, // ~4 min: the enemy "reaches the Feudal Age"
      { atSec: 300, buildingTypeId: 'farm' },
      { atSec: 540, buildingTypeId: 'stable' }, // ~9 min: the enemy "reaches the Castle Age"
      { atSec: 560, buildingTypeId: 'tower' },
    ],
    attackWaves: [
      { atSec: 180, comp: { militia: 2 }, target: 'base' },
      { atSec: 300, comp: { militia: 3, archer: 2 }, target: 'base' },
      { atSec: 420, comp: { militia: 4, archer: 3 }, target: 'base' },
      { atSec: 560, comp: { man_at_arms: 3, archer: 4 }, target: 'base' },
      { atSec: 700, comp: { knight: 3, archer: 3, man_at_arms: 2 }, target: 'base' },
    ],
    rampFactor: 1.3,
  },
  winText: 'The enemy Town Center falls. Your civilization rules the age. Wololo!',
  loseText: 'Your Town Center is razed. Your people are scattered to history.',
};

// AoE2's Single Player menu opened onto game modes; Random Map is the classic
// skirmish and the one that runs off the hard drive here. The rest ask for the
// disc, same joke as the other titles.
const MENU = ['Random Map', 'Death Match', 'Regicide', 'Exit'] as const;

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
          {MENU.map((label) => (
            <button
              key={label}
              onClick={() => {
                if (label === 'Random Map') {
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
            message="That mode needs the CD-ROM. Please insert the disc. (Random Map runs from the hard drive.)"
            buttons={[{ label: 'OK', onClick: () => setShowError(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
