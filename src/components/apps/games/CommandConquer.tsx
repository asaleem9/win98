'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';
import { playSound } from '@/lib/sounds';
import RtsGame from './engine/RtsGame';
import { RtsConfig } from './engine/rts';
import {
  ORE_TRUCK,
  RIFLE_INFANTRY,
  ROCKET_SOLDIER,
  MEDIUM_TANK,
  TANYA,
  HEAVY_TANK,
  TESLA_COIL,
  PILLBOX,
  CON_YARD,
  POWER_PLANT,
  BARRACKS,
  WAR_FACTORY,
  ORE_CLUSTER,
} from './engine/sprites/redalert';

// The shared RTS engine dressed as Red Alert. Its identity is a different
// economy and relentless harassment: a single resource (Ore) hauled by a few
// fat, slow Ore Trucks, and a Soviet AI that alternates between hunting those
// trucks and hitting the base. The whole loop is about screening your harvesters
// with Pillboxes and infantry while the Soviets bring Tesla Coils and Heavy
// Tanks. Exported for the config + smoke tests.
export const CNC_CONFIG: RtsConfig = {
  gameId: 'command-conquer',
  resources: [{ id: 'ore', name: 'Ore', color: '#e0c840', sprite: ORE_CLUSTER }],
  startResources: { ore: 500 },
  colors: {
    player: '#3a7fd0',
    enemy: '#c02020',
    terrain: '#3a2c18',
    grid: 'rgba(120,150,200,0.10)',
  },
  factions: { player: 'blue', enemy: 'red' },
  unitTypes: {
    // Few, expensive, slow, and heavy-hauling — losing one truck really stings.
    truck: {
      name: 'Ore Truck',
      role: 'worker',
      hp: 90,
      speed: 42,
      damage: 0,
      range: 0,
      rate: 1,
      cost: { ore: 175 },
      supply: 1,
      trainedAt: 'base',
      sightRange: 110,
      sprite: ORE_TRUCK,
    },
    rifle: {
      name: 'Rifle Infantry',
      role: 'combat',
      hp: 45,
      speed: 66,
      damage: 6,
      range: 28,
      rate: 0.5, // fast-firing
      cost: { ore: 50 },
      supply: 1,
      trainedAt: 'barracks',
      sightRange: 120,
      sprite: RIFLE_INFANTRY,
    },
    rocket: {
      name: 'Rocket Soldier',
      role: 'combat',
      hp: 40,
      speed: 52,
      damage: 20,
      range: 58, // outranges tanks
      rate: 1.3,
      cost: { ore: 120 },
      supply: 1,
      trainedAt: 'barracks',
      sightRange: 135,
      sprite: ROCKET_SOLDIER,
    },
    mtank: {
      name: 'Medium Tank',
      role: 'combat',
      hp: 200,
      speed: 58,
      damage: 24,
      range: 46,
      rate: 1.1,
      cost: { ore: 350 },
      supply: 2,
      trainedAt: 'warfactory',
      sightRange: 130,
      sprite: MEDIUM_TANK,
    },
    tanya: {
      name: 'Tanya',
      role: 'combat',
      hp: 60, // fragile hero
      speed: 74,
      damage: 45, // devastating
      range: 34,
      rate: 0.4,
      cost: { ore: 550 },
      supply: 2,
      trainedAt: 'barracks',
      sightRange: 145,
      sprite: TANYA,
    },
    // The Soviet workhorse. Fielded by the enemy from the start; the player can
    // only build it after capturing Soviet Ordnance at the War Factory.
    htank: {
      name: 'Heavy Tank',
      role: 'combat',
      hp: 280,
      speed: 48,
      damage: 30,
      range: 46,
      rate: 1.2,
      cost: { ore: 500 },
      supply: 3,
      trainedAt: 'warfactory',
      requiresUpgrade: 'soviet-ordnance',
      sightRange: 130,
      sprite: HEAVY_TANK,
    },
  },
  buildingTypes: {
    base: {
      name: 'Construction Yard',
      hp: 1500,
      cost: { ore: 400 },
      size: { w: 30, h: 22 },
      isBase: true,
      buildTimeSec: 0,
      sightRange: 210,
      sprite: CON_YARD,
    },
    power: {
      name: 'Power Plant',
      hp: 400,
      cost: { ore: 150 },
      size: { w: 24, h: 18 },
      supplyGrant: 12,
      buildTimeSec: 4,
      sprite: POWER_PLANT,
    },
    barracks: {
      name: 'Barracks',
      hp: 800,
      cost: { ore: 250 },
      size: { w: 24, h: 16 },
      buildTimeSec: 6,
      sprite: BARRACKS,
    },
    warfactory: {
      name: 'War Factory',
      hp: 1000,
      cost: { ore: 500 },
      size: { w: 28, h: 18 },
      buildTimeSec: 9,
      sprite: WAR_FACTORY,
    },
    pillbox: {
      name: 'Pillbox',
      hp: 500,
      cost: { ore: 200 },
      size: { w: 16, h: 12 },
      buildTimeSec: 3,
      attack: { damage: 12, range: 95, rate: 0.5 },
      sprite: PILLBOX,
    },
    // The Soviets' signature fortification. Enemy-only until the player captures
    // Soviet Ordnance; it hits hard and outranges a Pillbox.
    tesla: {
      name: 'Tesla Coil',
      hp: 600,
      cost: { ore: 400 },
      size: { w: 12, h: 24 },
      buildTimeSec: 7,
      requiresUpgrade: 'soviet-ordnance',
      attack: { damage: 45, range: 120, rate: 1.4 },
      sprite: TESLA_COIL,
    },
  },
  upgrades: [
    {
      id: 'advanced-training',
      name: 'Advanced Training',
      cost: { ore: 300 },
      researchTimeSec: 22,
      researchAt: 'barracks',
      prereqBuilding: 'barracks',
      effects: [
        { unitTypeId: 'rifle', dmgMult: 1.5 },
        { unitTypeId: 'rocket', dmgMult: 1.4 },
      ],
      announce: 'Advanced Training complete. Allied infantry hit harder.',
    },
    {
      id: 'soviet-ordnance',
      name: 'Soviet Ordnance',
      cost: { ore: 600 },
      researchTimeSec: 35,
      researchAt: 'warfactory',
      prereqBuilding: 'warfactory',
      unlocksUnits: ['htank'],
      effects: [],
      announce: 'Soviet Ordnance reverse-engineered. Heavy Tanks and Tesla Coils are now yours.',
    },
  ],
  startSupply: 12,
  aggroRange: 90,
  // A single fat truckload: big cargo, long haul, so income is lumpy and every
  // truck matters.
  harvestAmount: 55,
  harvestTime: 5.5,
  map: {
    width: 640,
    height: 400,
    playerBase: { x: 80, y: 200 },
    enemyBase: { x: 560, y: 200 },
    // Two safer fields flank the Allied base; the richer ore lies out in the
    // contested middle, dragging trucks into harm's way. Fields regrow, so the
    // war is over holding them, not draining them.
    patches: [
      { x: 150, y: 120, amount: 1000, resourceId: 'ore' },
      { x: 140, y: 290, amount: 1000, resourceId: 'ore' },
      { x: 320, y: 120, amount: 1300, resourceId: 'ore' },
      { x: 330, y: 290, amount: 1300, resourceId: 'ore' },
      { x: 430, y: 200, amount: 1100, resourceId: 'ore' },
      { x: 540, y: 300, amount: 900, resourceId: 'ore' },
    ],
    patchRegrows: true,
    patchRegrowRate: 4,
  },
  startUnits: [{ typeId: 'truck', count: 2 }],
  enemyStartUnits: [{ typeId: 'rifle', count: 2 }],
  ai: {
    personality: 'harass',
    // The Soviets fortify their base with Tesla Coils between the early raids.
    buildOrder: [
      { atSec: 12, buildingTypeId: 'power' },
      { atSec: 28, buildingTypeId: 'tesla' },
      { atSec: 60, buildingTypeId: 'barracks' },
      { atSec: 95, buildingTypeId: 'tesla' },
      { atSec: 150, buildingTypeId: 'tesla' },
    ],
    // Waves alternate: the raids hunt your Ore Trucks, the assaults go for the
    // base. Armor escalates from lone rocketeers to Heavy Tank columns.
    attackWaves: [
      { atSec: 40, comp: { rifle: 2 }, target: 'workers' },
      { atSec: 75, comp: { rifle: 3 }, target: 'base' },
      { atSec: 115, comp: { rifle: 2, rocket: 1 }, target: 'workers' },
      { atSec: 160, comp: { htank: 1, rifle: 2 }, target: 'base' },
      { atSec: 205, comp: { rifle: 3, rocket: 1 }, target: 'workers' },
      { atSec: 255, comp: { htank: 2, rifle: 1 }, target: 'base' },
      { atSec: 315, comp: { htank: 1, rocket: 2 }, target: 'workers' },
    ],
    rampFactor: 1.3,
  },
  superweapon: { name: 'A-Bomb', cooldownSec: 150, damage: 400, radius: 72, color: '#ff7b2e' },
  winText: 'The Soviet command bunker is rubble and the Tesla Coils are dark. The ore fields are yours, Commander.',
  loseText: 'Your Construction Yard is slag. The Soviet banner flies over the ore fields, Comrade.',
};

export default function CommandConquer({ windowId }: AppComponentProps) {
  const [screen, setScreen] = useState<'title' | 'game'>('title');
  const [showError, setShowError] = useState(false);

  if (screen === 'game') {
    return <RtsGame config={CNC_CONFIG} windowId={windowId} onExit={() => setScreen('title')} />;
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
