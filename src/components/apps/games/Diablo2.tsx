'use client';

import { useCallback, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import { Button98 } from '@/components/ui/Button98';
import { Dialog98 } from '@/components/ui/Dialog98';
import { cn } from '@/lib/cn';
import { makeRng } from './engine/rng';
import {
  CLASS_DATA,
  RARITY_COLORS,
  POTION_COST,
  createCharacter,
  playerCombat,
  resolveAttack,
  generateRoom,
  rollLootDrop,
  grantGold,
  applyXpGain,
  allocateStat,
  equipItem,
  unequipItem,
  sellItem,
  quaffPotion,
  buyPotion,
  applyDeath,
  totalXpForLevel,
  isBossLevel,
  type CharClass,
  type Character,
  type Enemy,
  type Item,
  type ItemSlot,
  type StatKey,
} from './engine/diablo';

const CLASS_ORDER: CharClass[] = ['Amazon', 'Necromancer', 'Barbarian', 'Sorceress', 'Paladin'];
const GAME_ID = 'diablo-2';
const EQUIP_SLOTS: { slot: ItemSlot; label: string }[] = [
  { slot: 'helm', label: 'Helm' },
  { slot: 'amulet', label: 'Amulet' },
  { slot: 'weapon', label: 'Weapon' },
  { slot: 'armor', label: 'Armor' },
  { slot: 'ring', label: 'Ring' },
];
const STAT_ROWS: { key: StatKey; label: string; note: string }[] = [
  { key: 'strength', label: 'Strength', note: 'damage' },
  { key: 'dexterity', label: 'Dexterity', note: 'defense / attack' },
  { key: 'vitality', label: 'Vitality', note: 'life' },
  { key: 'energy', label: 'Energy', note: 'mana' },
];

type View = 'town' | 'dungeon';

// A tiny random seed for in-game rolls — event handlers only, never render.
function freshSeed(): number {
  return (Math.floor(Math.random() * 0x7fffffff) ^ (Date.now() & 0xffff)) >>> 0;
}

function affixLine(item: Item): string[] {
  const lines: string[] = [];
  if (item.baseDamage > 0) lines.push(`Damage: ${Math.round(item.baseDamage * 0.5)}-${item.baseDamage}`);
  if (item.baseDefense > 0) lines.push(`Defense: ${item.baseDefense}`);
  for (const a of item.affixes) lines.push(`+${a.value} ${a.label}`);
  return lines;
}

export default function Diablo2({ windowId }: AppComponentProps) {
  void windowId;
  const { getAppPref, setAppPref } = useSettings();

  const [character, setCharacter] = useState<Character | null>(() =>
    getAppPref<Character | null>(GAME_ID, 'character', null),
  );
  const [bestLevel, setBestLevel] = useState<number>(() => getAppPref<number>(GAME_ID, 'bestDungeonLevel', 1));
  const [hoverClass, setHoverClass] = useState<number>(0);

  const [view, setView] = useState<View>('town');
  const [dungeonLevel, setDungeonLevel] = useState(1);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [floorLoot, setFloorLoot] = useState<Item[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [deathMsg, setDeathMsg] = useState<string | null>(null);
  const [bossDown, setBossDown] = useState(false);

  const persist = useCallback(
    (next: Character, best?: number) => {
      setCharacter(next);
      setAppPref(GAME_ID, 'character', next);
      if (best !== undefined) {
        setBestLevel(best);
        setAppPref(GAME_ID, 'bestDungeonLevel', best);
      }
    },
    [setAppPref],
  );

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 8));
  }, []);

  // ---- title / character select -----------------------------------------
  const startGame = useCallback(
    (clsIndex: number) => {
      const cls = CLASS_ORDER[clsIndex];
      const c = createCharacter(cls);
      c.gold = 50;
      playSound('chord');
      persist(c, 1);
      setView('town');
      setDungeonLevel(1);
      setEnemies([]);
      setFloorLoot([]);
      setLog([`Welcome, ${cls}. The town of Tristram awaits.`]);
    },
    [persist],
  );

  // ---- dungeon descent ----------------------------------------------------
  const enterDungeon = useCallback(
    (level: number) => {
      const rng = makeRng(freshSeed());
      setDungeonLevel(level);
      setEnemies(generateRoom(level, rng));
      setFloorLoot([]);
      setView('dungeon');
      setBossDown(false);
      pushLog(isBossLevel(level) ? 'You enter the Catacombs. Andariel lurks here...' : `You descend to dungeon level ${level}.`);
      playSound('notify');
    },
    [pushLog],
  );

  const returnToTown = useCallback(() => {
    setView('town');
    setEnemies([]);
    setFloorLoot([]);
    pushLog('You take a Town Portal back to safety.');
    playSound('notify');
  }, [pushLog]);

  // ---- combat -------------------------------------------------------------
  const attackEnemy = useCallback(
    (enemyId: string) => {
      if (!character) return;
      const rng = makeRng(freshSeed());
      const combat = playerCombat(character);

      setEnemies((prevEnemies) => {
        const idx = prevEnemies.findIndex((e) => e.id === enemyId);
        if (idx === -1) return prevEnemies;
        const enemy = prevEnemies[idx];

        // Player strikes.
        const hit = resolveAttack(
          { minDamage: combat.minDamage, maxDamage: combat.maxDamage, attackRating: combat.attackRating, defense: combat.defense },
          enemy,
          rng,
        );
        const newHp = enemy.hp - hit.damage;
        playSound(hit.hit ? 'ding' : 'menuClick');
        if (hit.hit) pushLog(`You hit ${enemy.name} for ${hit.damage}.`);
        else pushLog(`You miss ${enemy.name}.`);

        if (newHp <= 0) {
          // Enemy dies: xp, gold, loot.
          pushLog(`${enemy.name} dies!`);
          const drop = rollLootDrop(enemy, rng);
          const goldGain = grantGold(enemy, rng);
          const xpRes = applyXpGain({ ...character, gold: character.gold + goldGain }, enemy.xp);
          const updated = xpRes.char;
          if (xpRes.leveled) {
            playSound('chord');
            pushLog(`Welcome to level ${updated.level}! ${xpRes.levelsGained * 5} stat points to spend.`);
          }
          if (drop) {
            setFloorLoot((f) => [drop, ...f]);
            if (drop.rarity === 'rare' || drop.rarity === 'unique') playSound('cardWin');
            pushLog(`${enemy.name} drops ${drop.name}.`);
          }
          if (enemy.isBoss) {
            setBossDown(true);
            playSound('cardWin');
            const best = Math.max(bestLevel, dungeonLevel);
            persist(updated, best);
            pushLog('Andariel is slain! The Maiden of Anguish falls.');
          } else {
            const best = Math.max(bestLevel, dungeonLevel);
            persist(updated, best);
          }
          return prevEnemies.filter((e) => e.id !== enemyId);
        }

        // Enemy survives and retaliates.
        const retaliate = resolveAttack(enemy, combat, rng);
        let playerHp = character.hp;
        if (retaliate.hit) {
          playerHp = character.hp - retaliate.damage;
          pushLog(`${enemy.name} hits you for ${retaliate.damage}.`);
          if (playerHp <= 0) {
            const { char: revived, goldLost } = applyDeath(character);
            playSound('error');
            persist(revived);
            setDeathMsg(`You have died. Lost ${goldLost} gold. You awaken in town.`);
            setView('town');
            setEnemies([]);
            setFloorLoot([]);
            return prevEnemies;
          }
        }
        persist({ ...character, hp: playerHp });
        return prevEnemies.map((e, i) => (i === idx ? { ...e, hp: newHp } : e));
      });
    },
    [character, pushLog, persist, bestLevel, dungeonLevel],
  );

  // ---- item / character actions ------------------------------------------
  const pickUp = useCallback(
    (item: Item) => {
      if (!character) return;
      persist({ ...character, inventory: [item, ...character.inventory] });
      setFloorLoot((f) => f.filter((i) => i.id !== item.id));
      playSound('menuClick');
    },
    [character, persist],
  );

  const doEquip = useCallback(
    (item: Item) => {
      if (!character) return;
      persist(equipItem(character, item));
      setSelectedItem(null);
      playSound('ding');
    },
    [character, persist],
  );

  const doUnequip = useCallback(
    (slot: ItemSlot) => {
      if (!character) return;
      persist(unequipItem(character, slot));
      playSound('menuClick');
    },
    [character, persist],
  );

  const doSell = useCallback(
    (item: Item) => {
      if (!character) return;
      persist(sellItem(character, item.id));
      setSelectedItem(null);
      playSound('ding');
    },
    [character, persist],
  );

  const doQuaff = useCallback(() => {
    if (!character || character.potions <= 0) return;
    persist(quaffPotion(character));
    playSound('ding');
  }, [character, persist]);

  const doBuyPotion = useCallback(() => {
    if (!character || character.gold < POTION_COST) return;
    persist(buyPotion(character));
    playSound('ding');
  }, [character, persist]);

  const doAllocate = useCallback(
    (key: StatKey) => {
      if (!character || character.statPoints <= 0) return;
      persist(allocateStat(character, key));
      playSound('menuClick');
    },
    [character, persist],
  );

  const abandonHero = useCallback(() => {
    setCharacter(null);
    setAppPref<Character | null>(GAME_ID, 'character', null);
    setView('town');
    playSound('chord');
  }, [setAppPref]);

  // =========================================================================
  // TITLE / CHARACTER SELECT
  // =========================================================================
  if (!character) {
    return (
      <div className="flex flex-col h-full relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #1a0a00 0%, #0d0500 50%, #000000 100%)' }} />
        <div className="absolute top-[10%] left-[15%] w-[60px] h-[80px] rounded-full opacity-20" style={{ background: 'radial-gradient(ellipse, #ff4400, transparent)' }} />
        <div className="absolute top-[10%] right-[15%] w-[60px] h-[80px] rounded-full opacity-20" style={{ background: 'radial-gradient(ellipse, #ff4400, transparent)' }} />
        <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[50px] h-[50px] rounded-full border border-[#331100] opacity-30" />

        <div className="relative z-10 flex flex-col items-center flex-1 p-4 pt-5 overflow-auto">
          <h1
            className="text-[34px] font-bold tracking-[4px] mb-1"
            style={{
              background: 'linear-gradient(to bottom, #ff6600, #cc3300, #660000)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 8px rgba(255,68,0,0.5))',
              fontFamily: 'serif',
            }}
          >
            DIABLO II
          </h1>
          <div className="text-[11px] text-[#663300] tracking-[2px] mb-4" style={{ fontFamily: 'serif' }}>
            LORD OF DESTRUCTION
          </div>

          <div className="text-[11px] text-[#886644] mb-2 tracking-wider">SELECT CHARACTER CLASS</div>

          <div className="flex flex-col gap-[2px] w-[270px]">
            {CLASS_ORDER.map((cls, i) => (
              <button
                key={cls}
                onClick={() => startGame(i)}
                onMouseEnter={() => setHoverClass(i)}
                className="py-[6px] px-4 text-left cursor-pointer border transition-colors"
                style={{
                  background: hoverClass === i ? 'linear-gradient(to right, rgba(153,68,0,0.3), transparent)' : 'transparent',
                  borderColor: hoverClass === i ? '#663300' : 'transparent',
                  color: hoverClass === i ? '#ffaa44' : '#886644',
                  fontFamily: 'serif',
                  fontSize: '13px',
                }}
              >
                <div className="font-bold">{cls}</div>
                <div className="text-[10px] opacity-70">{CLASS_DATA[cls].desc}</div>
              </button>
            ))}
          </div>

          <div className="text-[10px] text-[#775533] mt-3 text-center w-[260px]">
            Click a class to begin your descent. Best dungeon level reached: {bestLevel}
          </div>

          <div className="mt-auto mb-2 w-[200px] h-px bg-gradient-to-r from-transparent via-[#663300] to-transparent" />
          <div className="text-[9px] text-[#442200]">&copy; 2000 Blizzard Entertainment</div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // IN-GAME
  // =========================================================================
  const combat = playerCombat(character);
  const xpFloor = totalXpForLevel(character.level);
  const xpCeil = totalXpForLevel(character.level + 1);
  const xpPct = Math.max(0, Math.min(100, ((character.xp - xpFloor) / (xpCeil - xpFloor)) * 100));
  const hpPct = Math.max(0, Math.min(100, (character.hp / combat.maxLife) * 100));
  const manaPct = Math.max(0, Math.min(100, (character.mana / combat.maxMana) * 100));

  return (
    <div className="flex flex-col h-full text-[11px] text-[#c8b090]" style={{ background: 'radial-gradient(ellipse at top, #1a0f06 0%, #0a0603 60%, #000 100%)', fontFamily: 'serif' }}>
      {/* Top HUD */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-[#3a2410] bg-black/40">
        <span className="text-[#ffaa44] font-bold">{character.cls}</span>
        <span className="text-[#887755]">Lv {character.level}</span>
        <div className="flex-1" />
        <span className="text-[#ffd700]">{character.gold}g</span>
        <span className="text-[#cc4444]">HP {character.hp}/{combat.maxLife}</span>
      </div>

      {/* Bars */}
      <div className="flex gap-1 px-2 pt-1">
        <Bar label="Life" pct={hpPct} from="#661111" to="#dd3333" />
        <Bar label="Mana" pct={manaPct} from="#112266" to="#3355dd" />
      </div>
      <div className="px-2 pt-1">
        <div className="h-[6px] bg-black/60 border border-[#3a2410] relative overflow-hidden">
          <div className="h-full" style={{ width: `${xpPct}%`, background: 'linear-gradient(to right,#664400,#ffaa22)' }} />
        </div>
        <div className="text-[9px] text-[#776644] text-right">XP {character.xp - xpFloor}/{xpCeil - xpFloor}</div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 px-2 py-1 border-b border-[#3a2410]">
        {view === 'town' ? (
          <>
            <Button98 onClick={() => enterDungeon(dungeonLevel)}>Descend (Lv {dungeonLevel})</Button98>
            <Button98 onClick={doBuyPotion} disabled={character.gold < POTION_COST}>Buy Potion ({POTION_COST}g)</Button98>
          </>
        ) : (
          <Button98 onClick={returnToTown}>Town Portal</Button98>
        )}
        <Button98 onClick={() => setShowInventory((s) => !s)}>{showInventory ? 'Close' : 'Character'}</Button98>
        <Button98 onClick={doQuaff} disabled={character.potions <= 0}>Potion ({character.potions})</Button98>
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-auto p-2">
        {showInventory ? (
          <CharacterPanel
            character={character}
            combat={combat}
            selectedItem={selectedItem}
            onSelect={setSelectedItem}
            onEquip={doEquip}
            onUnequip={doUnequip}
            onSell={doSell}
            onAllocate={doAllocate}
            inTown={view === 'town'}
          />
        ) : view === 'town' ? (
          <TownPanel
            dungeonLevel={dungeonLevel}
            bestLevel={bestLevel}
            onDescend={enterDungeon}
            onChangeLevel={setDungeonLevel}
            onAbandon={abandonHero}
          />
        ) : (
          <DungeonPanel
            level={dungeonLevel}
            enemies={enemies}
            floorLoot={floorLoot}
            bossDown={bossDown}
            onAttack={attackEnemy}
            onPickUp={pickUp}
            onNext={() => enterDungeon(dungeonLevel + 1)}
            onTown={returnToTown}
          />
        )}
      </div>

      {/* Message log */}
      <div className="h-[64px] overflow-auto px-2 py-1 border-t border-[#3a2410] bg-black/50 text-[10px] leading-tight">
        {log.map((line, i) => (
          <div key={i} style={{ opacity: 1 - i * 0.1 }} className="text-[#a89070]">
            {line}
          </div>
        ))}
      </div>

      {deathMsg && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60">
          <Dialog98
            title="You Have Died"
            icon="error"
            message={deathMsg}
            buttons={[{ label: 'Revive', onClick: () => setDeathMsg(null), default: true }]}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Bar({ label, pct, from, to }: { label: string; pct: number; from: string; to: string }) {
  return (
    <div className="flex-1">
      <div className="h-[10px] bg-black/60 border border-[#3a2410] relative overflow-hidden">
        <div className="h-full transition-[width] duration-150" style={{ width: `${pct}%`, background: `linear-gradient(to right, ${from}, ${to})` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/80">{label}</span>
      </div>
    </div>
  );
}

function TownPanel({
  dungeonLevel,
  bestLevel,
  onDescend,
  onChangeLevel,
  onAbandon,
}: {
  dungeonLevel: number;
  bestLevel: number;
  onDescend: (level: number) => void;
  onChangeLevel: (level: number) => void;
  onAbandon: () => void;
}) {
  const maxUnlocked = Math.max(bestLevel, dungeonLevel);
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[#ffaa44] text-[13px] font-bold">Rogue Encampment</div>
      <p className="text-[#a89070] text-[11px] leading-snug">
        Rest, spend your gold, then descend into the dungeon. Deeper levels are deadlier but richer. Andariel awaits on level {5}.
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[#887755]">Dungeon level:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((lvl) => {
            const locked = lvl > maxUnlocked + 0; // can always try current+ but only up to best+1
            const allowed = lvl <= Math.max(1, maxUnlocked);
            return (
              <button
                key={lvl}
                onClick={() => allowed && onChangeLevel(lvl)}
                disabled={!allowed}
                className={cn(
                  'w-[26px] h-[26px] border text-[12px] font-bold',
                  dungeonLevel === lvl ? 'border-[#ffaa44] text-[#ffaa44] bg-[#2a1608]' : 'border-[#3a2410] text-[#887755]',
                  !allowed && 'opacity-30',
                  lvl === 5 && 'text-[#ff5555]',
                )}
                style={{ fontFamily: 'serif' }}
                title={lvl === 5 ? 'Andariel' : `Level ${lvl}`}
              >
                {locked && !allowed ? '?' : lvl}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1">
        <Button98 onClick={() => onDescend(dungeonLevel)}>
          {isBossLevel(dungeonLevel) ? 'Face Andariel' : `Descend to Level ${dungeonLevel}`}
        </Button98>
      </div>
      <div className="text-[10px] text-[#665544] mt-1">Best depth reached: {bestLevel}</div>
      <div className="mt-2 pt-2 border-t border-[#3a2410]">
        <button onClick={onAbandon} className="text-[9px] text-[#664433] underline hover:text-[#aa5533]">
          Abandon hero &amp; roll a new character
        </button>
      </div>
    </div>
  );
}

function DungeonPanel({
  level,
  enemies,
  floorLoot,
  bossDown,
  onAttack,
  onPickUp,
  onNext,
  onTown,
}: {
  level: number;
  enemies: Enemy[];
  floorLoot: Item[];
  bossDown: boolean;
  onAttack: (id: string) => void;
  onPickUp: (item: Item) => void;
  onNext: () => void;
  onTown: () => void;
}) {
  const cleared = enemies.length === 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[#ffaa44] text-[12px] font-bold">
          {isBossLevel(level) ? 'The Catacombs — Level 4' : `Dungeon Level ${level}`}
        </span>
        <span className="text-[#665544] text-[10px]">{enemies.length} foes</span>
      </div>

      {/* Enemies */}
      <div className="grid grid-cols-2 gap-2">
        {enemies.map((e) => {
          const pct = Math.max(0, (e.hp / e.maxHp) * 100);
          return (
            <button
              key={e.id}
              onClick={() => onAttack(e.id)}
              className={cn(
                'relative flex flex-col items-center gap-1 p-2 border cursor-pointer transition-transform active:scale-95',
                e.isBoss ? 'border-[#aa2222] bg-[#2a0808] col-span-2' : 'border-[#3a2410] bg-[#160c04] hover:border-[#66441a]',
              )}
            >
              <div className={cn('text-[22px] leading-none', e.isBoss && 'text-[32px]')}>
                {e.isBoss ? '👹' : e.name === 'Zombie' ? '🧟' : e.name === 'Skeleton' ? '💀' : e.name === 'Quill Rat' ? '🐀' : e.name === 'Corrupt Rogue' ? '🏹' : '👺'}
              </div>
              <div className={cn('text-[10px]', e.isBoss ? 'text-[#ff5555] font-bold' : 'text-[#c8b090]')}>{e.name}</div>
              <div className="w-full h-[6px] bg-black/60 border border-[#3a2410] overflow-hidden">
                <div className="h-full" style={{ width: `${pct}%`, background: e.isBoss ? 'linear-gradient(to right,#550000,#ff2222)' : 'linear-gradient(to right,#552200,#cc3333)' }} />
              </div>
              <div className="text-[9px] text-[#887755]">{Math.max(0, e.hp)}/{e.maxHp}</div>
            </button>
          );
        })}
      </div>

      {cleared && (
        <div className="text-center text-[#88bb66] py-2">
          {bossDown ? 'Andariel is defeated! You are victorious.' : 'Room cleared!'}
        </div>
      )}

      {/* Floor loot */}
      {floorLoot.length > 0 && (
        <div className="border-t border-[#3a2410] pt-2">
          <div className="text-[10px] text-[#887755] mb-1">Loot on the ground (click to grab):</div>
          <div className="flex flex-col gap-[2px]">
            {floorLoot.map((item) => (
              <button
                key={item.id}
                onClick={() => onPickUp(item)}
                className="text-left px-2 py-[2px] border border-[#3a2410] bg-black/40 hover:bg-[#2a1608] cursor-pointer"
                style={{ color: RARITY_COLORS[item.rarity] }}
              >
                {item.name} <span className="text-[9px] opacity-70">[{item.base}]</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Descend / retreat */}
      <div className="flex gap-1 mt-1">
        {cleared && !isBossLevel(level) && <Button98 onClick={onNext}>Descend Deeper</Button98>}
        <Button98 onClick={onTown}>Return to Town</Button98>
      </div>
    </div>
  );
}

function CharacterPanel({
  character,
  combat,
  selectedItem,
  onSelect,
  onEquip,
  onUnequip,
  onSell,
  onAllocate,
  inTown,
}: {
  character: Character;
  combat: ReturnType<typeof playerCombat>;
  selectedItem: Item | null;
  onSelect: (item: Item | null) => void;
  onEquip: (item: Item) => void;
  onUnequip: (slot: ItemSlot) => void;
  onSell: (item: Item) => void;
  onAllocate: (key: StatKey) => void;
  inTown: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Attributes */}
      <div className="border border-[#3a2410] bg-black/30 p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[#ffaa44] font-bold">Attributes</span>
          {character.statPoints > 0 && <span className="text-[#88bb66] text-[10px]">{character.statPoints} points</span>}
        </div>
        {STAT_ROWS.map((row) => (
          <div key={row.key} className="flex items-center gap-2 py-[1px]">
            <span className="w-[70px] text-[#c8b090]">{row.label}</span>
            <span className="w-[26px] text-right text-[#ffddaa]">{character.stats[row.key]}</span>
            <span className="flex-1 text-[9px] text-[#665544]">{row.note}</span>
            {character.statPoints > 0 && (
              <button
                onClick={() => onAllocate(row.key)}
                className="w-[16px] h-[16px] border border-[#66441a] text-[#ffaa44] leading-none hover:bg-[#2a1608]"
              >
                +
              </button>
            )}
          </div>
        ))}
        <div className="grid grid-cols-2 gap-x-3 mt-1 pt-1 border-t border-[#3a2410] text-[10px] text-[#a89070]">
          <span>Damage: {combat.minDamage}-{combat.maxDamage}</span>
          <span>Defense: {combat.defense}</span>
          <span>Attack: {combat.attackRating}</span>
          <span>Life: {combat.maxLife}</span>
        </div>
      </div>

      {/* Equipment */}
      <div className="border border-[#3a2410] bg-black/30 p-2">
        <div className="text-[#ffaa44] font-bold mb-1">Equipped</div>
        <div className="flex flex-col gap-[2px]">
          {EQUIP_SLOTS.map(({ slot, label }) => {
            const item = character.equipment[slot];
            return (
              <div key={slot} className="flex items-center gap-2">
                <span className="w-[54px] text-[#665544] text-[10px]">{label}</span>
                {item ? (
                  <>
                    <span className="flex-1 truncate" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</span>
                    <button onClick={() => onUnequip(slot)} className="text-[9px] text-[#887755] underline hover:text-[#ffaa44]">remove</button>
                  </>
                ) : (
                  <span className="flex-1 text-[#443322] text-[10px] italic">— empty —</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory */}
      <div className="border border-[#3a2410] bg-black/30 p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[#ffaa44] font-bold">Inventory ({character.inventory.length})</span>
          <span className="text-[#ffd700] text-[10px]">{character.gold}g</span>
        </div>
        {character.inventory.length === 0 ? (
          <div className="text-[#443322] italic text-[10px]">Your backpack is empty.</div>
        ) : (
          <div className="flex flex-col gap-[2px]">
            {character.inventory.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(selectedItem?.id === item.id ? null : item)}
                className={cn(
                  'text-left px-2 py-[2px] border cursor-pointer',
                  selectedItem?.id === item.id ? 'border-[#ffaa44] bg-[#2a1608]' : 'border-[#2a1a0c] hover:bg-[#1a0f06]',
                )}
                style={{ color: RARITY_COLORS[item.rarity] }}
              >
                {item.name} <span className="text-[9px] opacity-60">[{item.base}]</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected item detail */}
      {selectedItem && (
        <div className="border border-[#66441a] bg-black/50 p-2">
          <div className="font-bold" style={{ color: RARITY_COLORS[selectedItem.rarity] }}>{selectedItem.name}</div>
          <div className="text-[10px] text-[#887755]">{selectedItem.base} · {selectedItem.rarity} · ilvl {selectedItem.ilvl}</div>
          <div className="mt-1 flex flex-col gap-[1px] text-[10px] text-[#8899ff]">
            {affixLine(selectedItem).map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
          <div className="flex gap-1 mt-2">
            <Button98 onClick={() => onEquip(selectedItem)}>Equip</Button98>
            {inTown && <Button98 onClick={() => onSell(selectedItem)}>Sell ({selectedItem.value}g)</Button98>}
          </div>
        </div>
      )}
    </div>
  );
}
