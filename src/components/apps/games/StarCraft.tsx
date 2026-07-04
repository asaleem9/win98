'use client';

import { useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { Dialog98 } from '@/components/ui/Dialog98';
import { playSound } from '@/lib/sounds';
import RtsGame from './engine/RtsGame';
import { RtsConfig } from './engine/rts';
import {
  SCV,
  MARINE,
  FIREBAT,
  MEDIC,
  SIEGE_TANK,
  ZERGLING,
  HYDRALISK,
  COMMAND_CENTER,
  DEPOT,
  BARRACKS,
  FACTORY,
  REFINERY,
  MISSILE_TURRET,
  SUNKEN_COLONY,
  MINERAL_CRYSTAL,
  GAS_GEYSER,
} from './engine/sprites/starcraft';

// Terran (player, blue) versus Zerg (enemy, purple) on the shared RTS engine.
//
// Two resources: Minerals (mined off the crystal line) and Vespene Gas. The
// engine harvests any patch by proximity and has no notion of a refinery gating
// gas, so the starting Geyser is modelled as a directly-harvestable gas patch
// (right-click an SCV onto it) and the Refinery is an AoE-style farm building —
// placing one seeds a fresh gas patch, opening a second income exactly as the
// schema's farmYieldsResource intends.
//
// The Zerg strains (zergling, hydralisk) and the Sunken Colony are enemy-only.
// They're deadlock-gated behind the 'zergSwarm' strain (which needs a Sunken
// Colony to research, which in turn needs the strain to build) so the player can
// never touch them — the enemy AI spawns waves and lays defenses directly,
// bypassing those gates. Since the player can't obtain them, they're flagged
// `hidden` and kept out of the command panel entirely rather than shown as
// permanently-greyed clutter.
const STARCRAFT_CONFIG: RtsConfig = {
  gameId: 'starcraft',
  resources: [
    { id: 'minerals', name: 'Minerals', color: '#4fd6e0', sprite: MINERAL_CRYSTAL },
    { id: 'gas', name: 'Vespene Gas', color: '#43d17a', sprite: GAS_GEYSER },
  ],
  startResources: { minerals: 150, gas: 0 },
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
      speed: 72,
      damage: 0,
      range: 0,
      rate: 1,
      cost: { minerals: 50 },
      supply: 1,
      trainedAt: 'base',
      sightRange: 110,
      sprite: SCV,
    },
    marine: {
      name: 'Marine',
      role: 'combat',
      hp: 45,
      speed: 62,
      damage: 6,
      range: 40,
      rate: 0.65,
      cost: { minerals: 50 },
      supply: 1,
      trainedAt: 'barracks',
      sightRange: 130,
      sprite: MARINE,
    },
    firebat: {
      name: 'Firebat',
      role: 'combat',
      hp: 60,
      speed: 58,
      damage: 9,
      range: 26,
      rate: 0.9,
      splashRadius: 26,
      cost: { minerals: 50, gas: 25 },
      supply: 1,
      trainedAt: 'barracks',
      sightRange: 110,
      sprite: FIREBAT,
    },
    medic: {
      name: 'Medic',
      role: 'combat',
      hp: 60,
      speed: 62,
      damage: 0,
      range: 30,
      rate: 1,
      healPerSec: 8,
      cost: { minerals: 50, gas: 25 },
      supply: 1,
      trainedAt: 'barracks',
      sightRange: 120,
      sprite: MEDIC,
    },
    tank: {
      name: 'Siege Tank',
      role: 'combat',
      hp: 150,
      speed: 40,
      damage: 30,
      range: 85,
      rate: 1.9,
      splashRadius: 24,
      cost: { minerals: 150, gas: 100 },
      supply: 2,
      trainedAt: 'factory',
      requiresUpgrade: 'siegeTech',
      sightRange: 150,
      sprite: SIEGE_TANK,
    },
    zergling: {
      name: 'Zergling',
      role: 'combat',
      hp: 35,
      speed: 84,
      damage: 5,
      range: 16,
      rate: 0.5,
      cost: { minerals: 25 },
      supply: 1,
      trainedAt: 'sunkenColony',
      requiresUpgrade: 'zergSwarm',
      hidden: true,
      sightRange: 110,
      sprite: ZERGLING,
    },
    hydralisk: {
      name: 'Hydralisk',
      role: 'combat',
      hp: 80,
      speed: 60,
      damage: 10,
      range: 44,
      rate: 0.8,
      cost: { minerals: 75, gas: 25 },
      supply: 2,
      trainedAt: 'sunkenColony',
      requiresUpgrade: 'zergSwarm',
      hidden: true,
      sightRange: 120,
      sprite: HYDRALISK,
    },
  },
  buildingTypes: {
    base: {
      name: 'Command Center',
      hp: 1500,
      cost: { minerals: 400 },
      size: { w: 30, h: 24 },
      isBase: true,
      buildTimeSec: 0,
      sightRange: 220,
      sprite: COMMAND_CENTER,
    },
    depot: {
      name: 'Supply Depot',
      hp: 500,
      cost: { minerals: 100 },
      size: { w: 22, h: 16 },
      supplyGrant: 8,
      buildTimeSec: 4,
      sprite: DEPOT,
    },
    barracks: {
      name: 'Barracks',
      hp: 850,
      cost: { minerals: 150 },
      size: { w: 26, h: 20 },
      buildTimeSec: 6,
      sprite: BARRACKS,
    },
    factory: {
      name: 'Factory',
      hp: 1000,
      cost: { minerals: 200, gas: 100 },
      size: { w: 28, h: 20 },
      buildTimeSec: 9,
      sprite: FACTORY,
    },
    refinery: {
      name: 'Refinery',
      hp: 600,
      cost: { minerals: 75 },
      size: { w: 24, h: 16 },
      buildTimeSec: 4,
      farmYieldsResource: 'gas',
      farmAmount: 700,
      sprite: REFINERY,
    },
    turret: {
      name: 'Missile Turret',
      hp: 450,
      cost: { minerals: 100 },
      size: { w: 18, h: 18 },
      buildTimeSec: 3,
      sightRange: 150,
      attack: { damage: 12, range: 95, rate: 0.8 },
      sprite: MISSILE_TURRET,
    },
    sunkenColony: {
      name: 'Sunken Colony',
      hp: 350,
      cost: { minerals: 125 },
      size: { w: 22, h: 20 },
      buildTimeSec: 5,
      sightRange: 130,
      requiresUpgrade: 'zergSwarm',
      hidden: true,
      attack: { damage: 14, range: 85, rate: 1.1 },
      sprite: SUNKEN_COLONY,
    },
  },
  upgrades: [
    {
      id: 'infWeapons1',
      name: 'Infantry Weapons 1',
      cost: { minerals: 100, gas: 50 },
      researchTimeSec: 20,
      researchAt: 'barracks',
      effects: [
        { unitTypeId: 'marine', dmgMult: 1.25 },
        { unitTypeId: 'firebat', dmgMult: 1.25 },
      ],
      announce: 'Infantry Weapons Level 1 online — Marines and Firebats hit harder.',
    },
    {
      id: 'infWeapons2',
      name: 'Infantry Weapons 2',
      cost: { minerals: 175, gas: 100 },
      researchTimeSec: 28,
      researchAt: 'barracks',
      prereqUpgrade: 'infWeapons1',
      effects: [
        { unitTypeId: 'marine', dmgMult: 1.25 },
        { unitTypeId: 'firebat', dmgMult: 1.25 },
      ],
      announce: 'Infantry Weapons Level 2 online — your bio-line reaches full strength.',
    },
    {
      id: 'siegeTech',
      name: 'Siege Tech',
      cost: { minerals: 150, gas: 100 },
      researchTimeSec: 22,
      researchAt: 'factory',
      prereqBuilding: 'factory',
      effects: [],
      unlocksUnits: ['tank'],
      announce: 'Siege Tech researched — the Factory can now roll out Siege Tanks.',
    },
    {
      // Deadlock gate for the Zerg roster: needs a Sunken Colony to research, but a
      // Sunken Colony needs this strain to build, so the player can never obtain it.
      // The enemy AI never researches — it spawns and builds directly.
      id: 'zergSwarm',
      name: 'Zerg Strain',
      cost: { minerals: 999, gas: 999 },
      researchTimeSec: 999,
      researchAt: 'sunkenColony',
      effects: [],
      hidden: true,
    },
  ],
  startSupply: 11,
  aggroRange: 90,
  harvestAmount: 8,
  harvestTime: 1.6,
  map: {
    width: 640,
    height: 420,
    playerBase: { x: 92, y: 344 },
    enemyBase: { x: 548, y: 84 },
    patches: [
      // Terran mineral line + geyser, tucked into the bottom-left corner.
      { x: 52, y: 300, amount: 1500, resourceId: 'minerals' },
      { x: 116, y: 288, amount: 1500, resourceId: 'minerals' },
      { x: 48, y: 372, amount: 1500, resourceId: 'minerals' },
      { x: 150, y: 360, amount: 1200, resourceId: 'minerals' },
      { x: 182, y: 300, amount: 900, resourceId: 'gas' },
      // The Zerg's corner — scenery the player can contest late (no enemy drones).
      { x: 590, y: 128, amount: 1400, resourceId: 'minerals' },
      { x: 524, y: 56, amount: 1400, resourceId: 'minerals' },
      { x: 500, y: 128, amount: 900, resourceId: 'gas' },
    ],
  },
  startUnits: [{ typeId: 'scv', count: 4 }],
  enemyStartUnits: [{ typeId: 'zergling', count: 4 }],
  ai: {
    personality: 'swarm',
    buildOrder: [
      { atSec: 55, buildingTypeId: 'sunkenColony' },
      { atSec: 140, buildingTypeId: 'sunkenColony' },
      { atSec: 250, buildingTypeId: 'sunkenColony' },
    ],
    attackWaves: [
      { atSec: 50, comp: { zergling: 4 }, target: 'workers' },
      { atSec: 100, comp: { zergling: 5 }, target: 'base' },
      { atSec: 165, comp: { zergling: 8 }, target: 'base' },
      { atSec: 235, comp: { zergling: 8, hydralisk: 2 }, target: 'base' },
      { atSec: 315, comp: { zergling: 10, hydralisk: 4 }, target: 'base' },
      { atSec: 405, comp: { zergling: 12, hydralisk: 6 }, target: 'base' },
    ],
    rampFactor: 1.5,
  },
  winText: 'The Zerg Hive collapses into ash. The sector is secured, Commander. Terran victory.',
  loseText: 'Your Command Center is overrun and consumed. The Swarm spreads unchecked.',
};

export { STARCRAFT_CONFIG };

export default function StarCraft({ windowId }: AppComponentProps) {
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
    return <RtsGame config={STARCRAFT_CONFIG} windowId={windowId} onExit={() => setScreen('title')} />;
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
              {label === 'Single Player' && (
                <span className="block text-[9px] tracking-normal text-[#5599aa] mt-[1px]">Terran Campaign</span>
              )}
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
