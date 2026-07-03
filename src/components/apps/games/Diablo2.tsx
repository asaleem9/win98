'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  BOSS_LEVEL,
  BELT_POTIONS,
  BELT_SIZE,
  createCharacter,
  normalizeCharacter,
  playerCombat,
  generateRoom,
  resolveCombatTurn,
  castSkill,
  availableSkills,
  allocateStat,
  equipItem,
  unequipItem,
  sellItem,
  drinkBeltSlot,
  buyBeltPotion,
  totalXpForLevel,
  isBossLevel,
  type CharClass,
  type Character,
  type Enemy,
  type Ally,
  type Item,
  type ItemSlot,
  type StatKey,
  type PotionType,
  type SkillDef,
  type CombatTurnResult,
} from './engine/diablo';
import { PixelSprite } from './engine/sprites';
import {
  spriteForEnemy,
  iconForItem,
  CLASS_PORTRAITS,
  POTION_ICONS,
  ALLY_SKELETON,
  GOLD_PILE,
} from './engine/sprites/diablo';

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
type Effect = { kind: SkillDef['effect']; key: number };

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

// Frame to draw for a creature: its white flash frame while struck, else the
// looping idle (frames are laid out as idle-frames... , flash).
function spriteFrame(frameCount: number, flashing: boolean, idleTick: number): number {
  if (flashing) return frameCount - 1;
  const idleCount = Math.max(1, frameCount - 1);
  return idleTick % idleCount;
}

export default function Diablo2({ windowId }: AppComponentProps) {
  void windowId;
  const { getAppPref, setAppPref } = useSettings();

  const [character, setCharacter] = useState<Character | null>(() =>
    normalizeCharacter(getAppPref<Character | null>(GAME_ID, 'character', null)),
  );
  const [bestLevel, setBestLevel] = useState<number>(() => getAppPref<number>(GAME_ID, 'bestDungeonLevel', 1));
  const [hoverClass, setHoverClass] = useState<number>(0);

  const [view, setView] = useState<View>('town');
  const [dungeonLevel, setDungeonLevel] = useState(1);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [ally, setAlly] = useState<Ally | null>(null);
  const [floorLoot, setFloorLoot] = useState<Item[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [deathMsg, setDeathMsg] = useState<string | null>(null);
  const [bossDown, setBossDown] = useState(false);

  // Skill state
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  // Presentation-only combat FX
  const [idleTick, setIdleTick] = useState(0);
  const [flashIds, setFlashIds] = useState<string[]>([]);
  const [dying, setDying] = useState<Enemy[]>([]);
  const [effect, setEffect] = useState<Effect | null>(null);
  const [levelFlash, setLevelFlash] = useState(false);
  const [healFlash, setHealFlash] = useState(false);
  const fxKey = useRef(0);

  // Idle bob for living sprites.
  useEffect(() => {
    const t = setInterval(() => setIdleTick((n) => n + 1), 480);
    return () => clearInterval(t);
  }, []);

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

  const resetCombatFx = useCallback(() => {
    setFlashIds([]);
    setDying([]);
    setEffect(null);
    setSelectedSkill(null);
    setCooldowns({});
    setAlly(null);
  }, []);

  const triggerFlash = useCallback((ids: string[]) => {
    setFlashIds(ids);
    window.setTimeout(() => setFlashIds([]), 160);
  }, []);

  const triggerCrumble = useCallback((dead: Enemy[]) => {
    if (dead.length === 0) return;
    setDying((prev) => [...prev, ...dead]);
    const ids = dead.map((d) => d.id);
    window.setTimeout(() => setDying((prev) => prev.filter((d) => !ids.includes(d.id))), 480);
  }, []);

  const triggerEffect = useCallback((kind: SkillDef['effect']) => {
    fxKey.current += 1;
    setEffect({ kind, key: fxKey.current });
    window.setTimeout(() => setEffect((e) => (e && e.key === fxKey.current ? null : e)), 560);
  }, []);

  const flashPanel = useCallback((setter: (v: boolean) => void) => {
    setter(true);
    window.setTimeout(() => setter(false), 750);
  }, []);

  // Commit a resolved combat turn: fire sounds/logs once, animate, persist.
  const commitResult = useCallback(
    (result: CombatTurnResult, prevEnemies: Enemy[]) => {
      const played = new Set<string>();
      for (const ev of result.events) {
        if (ev.sound && !played.has(ev.sound)) {
          playSound(ev.sound);
          played.add(ev.sound);
        }
        if (ev.log) pushLog(ev.log);
      }

      if (result.hitIds.length) triggerFlash(result.hitIds);
      if (result.defeatedIds.length) {
        triggerCrumble(prevEnemies.filter((e) => result.defeatedIds.includes(e.id)));
      }
      if (result.leveledUp) flashPanel(setLevelFlash);
      if (result.healed > 0) flashPanel(setHealFlash);

      setEnemies(result.enemies);
      setAlly(result.ally);
      if (result.bossDown) setBossDown(true);
      if (result.drops.length) setFloorLoot((f) => [...result.drops, ...f]);

      if (result.died) {
        persist(result.character);
        setFloorLoot([]);
        resetCombatFx();
        setDeathMsg(`You have died. Lost ${result.goldLost} gold. You awaken in town.`);
        setView('town');
      } else if (result.enemyDefeated) {
        persist(result.character, Math.max(bestLevel, dungeonLevel));
      } else {
        persist(result.character);
      }
    },
    [pushLog, triggerFlash, triggerCrumble, flashPanel, persist, resetCombatFx, bestLevel, dungeonLevel],
  );

  const tickCooldowns = useCallback((extra?: { id: string; turns: number }) => {
    setCooldowns((cd) => {
      const next: Record<string, number> = {};
      for (const [id, n] of Object.entries(cd)) if (n - 1 > 0) next[id] = n - 1;
      if (extra && extra.turns > 0) next[extra.id] = extra.turns;
      return next;
    });
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
      resetCombatFx();
      setLog([`Welcome, ${cls}. The town of Tristram awaits.`]);
    },
    [persist, resetCombatFx],
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
      resetCombatFx();
      pushLog(isBossLevel(level) ? 'You enter the Catacombs. Andariel lurks here...' : `You descend to dungeon level ${level}.`);
      playSound('notify');
    },
    [pushLog, resetCombatFx],
  );

  const returnToTown = useCallback(() => {
    setView('town');
    setEnemies([]);
    setFloorLoot([]);
    resetCombatFx();
    pushLog('You take a Town Portal back to safety.');
    playSound('notify');
  }, [pushLog, resetCombatFx]);

  // ---- combat -------------------------------------------------------------
  const basicAttack = useCallback(
    (enemyId: string) => {
      if (!character) return;
      const rng = makeRng(freshSeed());
      const prev = enemies;
      const result = resolveCombatTurn(character, enemies, enemyId, rng, ally);
      if (!result) return;
      commitResult(result, prev);
      tickCooldowns();
    },
    [character, enemies, ally, commitResult, tickCooldowns],
  );

  const doCast = useCallback(
    (skill: SkillDef, targetId: string | null) => {
      if (!character) return;
      const rng = makeRng(freshSeed());
      const prev = enemies;
      const result = castSkill(character, enemies, targetId, skill.id, rng, ally);
      if (!result) return;
      if (result.healed > 0) flashPanel(setHealFlash);
      else triggerEffect(skill.effect);
      commitResult(result, prev);
      setSelectedSkill(null);
      tickCooldowns({ id: skill.id, turns: skill.cooldown });
    },
    [character, enemies, ally, commitResult, flashPanel, triggerEffect, tickCooldowns],
  );

  const canCast = useCallback(
    (skill: SkillDef): boolean => {
      if (!character) return false;
      return character.mana >= skill.manaCost && (cooldowns[skill.id] ?? 0) === 0;
    },
    [character, cooldowns],
  );

  // Clicking a skill: AoE / summon fire at once; targeted skills arm for a click.
  const onSkill = useCallback(
    (skill: SkillDef) => {
      if (!canCast(skill)) return;
      if (skill.targeting === 'all' || skill.targeting === 'summon') {
        doCast(skill, null);
      } else {
        setSelectedSkill((s) => (s === skill.id ? null : skill.id));
      }
    },
    [canCast, doCast],
  );

  // Clicking an enemy: cast the armed skill on it, otherwise swing.
  const onEnemy = useCallback(
    (enemyId: string) => {
      if (!character) return;
      const skill = selectedSkill ? availableSkills(character).find((s) => s.id === selectedSkill) : null;
      if (skill && canCast(skill)) doCast(skill, enemyId);
      else basicAttack(enemyId);
    },
    [character, selectedSkill, canCast, doCast, basicAttack],
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

  const doDrink = useCallback(
    (index: number) => {
      if (!character || !character.belt[index]) return;
      persist(drinkBeltSlot(character, index));
      playSound('ding');
    },
    [character, persist],
  );

  const doBuyPotion = useCallback(
    (type: PotionType) => {
      if (!character) return;
      const before = character.gold;
      const next = buyBeltPotion(character, type);
      if (next.gold === before) {
        playSound('error');
        return;
      }
      persist(next);
      playSound('ding');
    },
    [character, persist],
  );

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
    resetCombatFx();
    playSound('chord');
  }, [setAppPref, resetCombatFx]);

  // Hotkeys 1..N fire the matching skill while in the dungeon.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (view !== 'dungeon' || !character) return;
      const n = Number(e.key);
      if (!Number.isNaN(n) && n >= 1 && n <= 9) {
        const skill = availableSkills(character).find((s) => s.hotkey === n);
        if (skill) {
          e.preventDefault();
          onSkill(skill);
        }
      }
    },
    [view, character, onSkill],
  );

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
                className="flex items-center gap-3 py-[6px] px-4 text-left cursor-pointer border transition-colors"
                style={{
                  background: hoverClass === i ? 'linear-gradient(to right, rgba(153,68,0,0.3), transparent)' : 'transparent',
                  borderColor: hoverClass === i ? '#663300' : 'transparent',
                  color: hoverClass === i ? '#ffaa44' : '#886644',
                  fontFamily: 'serif',
                  fontSize: '13px',
                }}
              >
                <PixelSprite def={CLASS_PORTRAITS[cls]} scale={2} className="shrink-0" />
                <span>
                  <span className="font-bold block">{cls}</span>
                  <span className="text-[10px] opacity-70">{CLASS_DATA[cls].desc}</span>
                </span>
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
  const skills = availableSkills(character);
  const beltFull = character.belt.every((s) => s !== null);

  const backdrop =
    view === 'dungeon'
      ? 'radial-gradient(ellipse at top, #1c1a20 0%, #0d0c10 55%, #060506 100%)'
      : 'radial-gradient(ellipse at top, #241608 0%, #140c05 60%, #070402 100%)';

  return (
    <div
      className="flex flex-col h-full text-[11px] text-[#c8b090] outline-none"
      style={{ background: backdrop, fontFamily: 'serif' }}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <style>{D2_KEYFRAMES}</style>

      {/* Top HUD */}
      <div
        className="flex items-center gap-2 px-2 py-1 border-b border-[#3a2410] bg-black/40"
        style={levelFlash ? { animation: 'd2-levelflash 0.75s ease-out' } : undefined}
      >
        <PixelSprite def={CLASS_PORTRAITS[character.cls]} className="shrink-0" />
        <span className="text-[#ffaa44] font-bold">{character.cls}</span>
        <span className="text-[#887755]">Lv {character.level}</span>
        <div className="flex-1" />
        <PixelSprite def={GOLD_PILE} className="shrink-0" />
        <span className="text-[#ffd700]">{character.gold}g</span>
        <span className="text-[#cc4444]">HP {character.hp}/{combat.maxLife}</span>
      </div>

      {/* Bars */}
      <div className="flex gap-1 px-2 pt-1">
        <Bar label="Life" pct={hpPct} from="#661111" to="#dd3333" glow={healFlash} />
        <Bar label="Mana" pct={manaPct} from="#112266" to="#3355dd" />
      </div>
      <div className="px-2 pt-1">
        <div className="h-[6px] bg-black/60 border border-[#3a2410] relative overflow-hidden">
          <div className="h-full" style={{ width: `${xpPct}%`, background: 'linear-gradient(to right,#664400,#ffaa22)' }} />
        </div>
        <div className="text-[9px] text-[#776644] text-right">XP {character.xp - xpFloor}/{xpCeil - xpFloor}</div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-1 border-b border-[#3a2410]">
        {view === 'town' ? (
          <>
            <Button98 onClick={() => enterDungeon(dungeonLevel)}>Descend (Lv {dungeonLevel})</Button98>
            <Button98 onClick={() => doBuyPotion('health')} disabled={character.gold < BELT_POTIONS.health.cost || beltFull}>
              Buy Health ({BELT_POTIONS.health.cost}g)
            </Button98>
            <Button98 onClick={() => doBuyPotion('mana')} disabled={character.gold < BELT_POTIONS.mana.cost || beltFull}>
              Buy Mana ({BELT_POTIONS.mana.cost}g)
            </Button98>
          </>
        ) : (
          <Button98 onClick={returnToTown}>Town Portal</Button98>
        )}
        <Button98 onClick={() => setShowInventory((s) => !s)}>{showInventory ? 'Close' : 'Character'}</Button98>
        <div className="flex-1" />
        <Belt belt={character.belt} onDrink={doDrink} />
      </div>

      {/* Skill bar (in dungeon) */}
      {view === 'dungeon' && !showInventory && (
        <SkillBar skills={skills} character={character} cooldowns={cooldowns} selected={selectedSkill} onSkill={onSkill} />
      )}

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
            dying={dying}
            ally={ally}
            flashIds={flashIds}
            idleTick={idleTick}
            effect={effect}
            selectedSkill={selectedSkill}
            floorLoot={floorLoot}
            bossDown={bossDown}
            onAttack={onEnemy}
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
// CSS keyframes for the combat FX layer (presentation only)
// ---------------------------------------------------------------------------

const D2_KEYFRAMES = `
@keyframes d2-crumble { from { opacity:1; transform: translateY(0) scale(1) rotate(0); } to { opacity:0; transform: translateY(10px) scale(0.6) rotate(8deg); } }
@keyframes d2-sparkle { 0%,100% { opacity:.35; transform:scale(.85);} 50% { opacity:1; transform:scale(1.15);} }
@keyframes d2-levelflash { 0% { box-shadow:0 0 0 rgba(255,205,60,0);} 35% { box-shadow:0 0 16px rgba(255,205,60,.95);} 100% { box-shadow:0 0 0 rgba(255,205,60,0);} }
@keyframes d2-firebolt { 0% { left:-8%; opacity:0;} 15% { opacity:1;} 100% { left:104%; opacity:.15;} }
@keyframes d2-volley { 0% { left:-8%; opacity:0;} 20% { opacity:1;} 100% { left:104%; opacity:.1;} }
@keyframes d2-nova { 0% { transform:translate(-50%,-50%) scale(.12); opacity:.95;} 100% { transform:translate(-50%,-50%) scale(2.3); opacity:0;} }
@keyframes d2-whirl { 0% { transform:rotate(0deg); opacity:.85;} 100% { transform:rotate(400deg); opacity:0;} }
@keyframes d2-beam { 0% { opacity:0; transform:scaleX(.2);} 25% { opacity:1;} 100% { opacity:0; transform:scaleX(1.15);} }
@keyframes d2-summon { 0% { opacity:0; transform:translateY(14px);} 40% { opacity:.9;} 100% { opacity:0; transform:translateY(-4px);} }
`;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Bar({ label, pct, from, to, glow }: { label: string; pct: number; from: string; to: string; glow?: boolean }) {
  return (
    <div className="flex-1">
      <div
        className="h-[10px] bg-black/60 border border-[#3a2410] relative overflow-hidden"
        style={glow ? { animation: 'd2-levelflash 0.75s ease-out' } : undefined}
      >
        <div className="h-full transition-[width] duration-150" style={{ width: `${pct}%`, background: `linear-gradient(to right, ${from}, ${to})` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/80">{label}</span>
      </div>
    </div>
  );
}

function Belt({ belt, onDrink }: { belt: Character['belt']; onDrink: (index: number) => void }) {
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: BELT_SIZE }, (_, i) => {
        const potion = belt[i];
        return (
          <button
            key={i}
            onClick={() => potion && onDrink(i)}
            disabled={!potion}
            title={potion ? `Drink ${BELT_POTIONS[potion].label}` : 'Empty belt slot'}
            className={cn(
              'w-[22px] h-[22px] flex items-center justify-center border',
              potion ? 'border-[#66441a] bg-black/40 hover:bg-[#2a1608] cursor-pointer' : 'border-[#2a1a0c] bg-black/20',
            )}
          >
            {potion && <PixelSprite def={POTION_ICONS[potion]} scale={1} />}
          </button>
        );
      })}
    </div>
  );
}

function SkillBar({
  skills,
  character,
  cooldowns,
  selected,
  onSkill,
}: {
  skills: SkillDef[];
  character: Character;
  cooldowns: Record<string, number>;
  selected: string | null;
  onSkill: (skill: SkillDef) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 px-2 py-1 border-b border-[#3a2410] bg-black/30">
      {skills.map((skill) => {
        const cd = cooldowns[skill.id] ?? 0;
        const affordable = character.mana >= skill.manaCost;
        const disabled = cd > 0 || !affordable;
        const armed = selected === skill.id;
        return (
          <button
            key={skill.id}
            onClick={() => onSkill(skill)}
            disabled={disabled}
            title={`${skill.name} — ${skill.desc}`}
            className={cn(
              'px-2 py-[3px] border text-left leading-tight transition-colors',
              armed ? 'border-[#ffcc55] bg-[#3a2408]' : 'border-[#3a2410] bg-black/40',
              disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-[#66441a] cursor-pointer',
            )}
          >
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#ffcc55] font-bold">{skill.hotkey}</span>
              <span className="text-[10px] text-[#ffddaa]">{skill.name}</span>
            </div>
            <div className="text-[9px] text-[#7788cc]">
              {cd > 0 ? `cooldown ${cd}` : `${skill.manaCost} mana`}
            </div>
          </button>
        );
      })}
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
        Rest, spend your gold, then descend into the dungeon. Deeper levels are deadlier but richer. Andariel awaits on level {BOSS_LEVEL}.
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[#887755]">Dungeon level:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((lvl) => {
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
                {!allowed ? '?' : lvl}
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

function EffectOverlay({ effect }: { effect: Effect }) {
  // Full-width transient overlays across the enemy row, per the skill's family.
  switch (effect.kind) {
    case 'bolt':
      return (
        <div key={effect.key} className="pointer-events-none absolute top-1/2 -translate-y-1/2 w-[36px] h-[8px] rounded-full"
          style={{ background: 'radial-gradient(circle, #ffdd66, #ff6a1a 60%, transparent)', boxShadow: '0 0 10px #ff8a1a', animation: 'd2-firebolt 0.5s linear' }} />
      );
    case 'volley':
      return (
        <>
          {[0, 1, 2].map((i) => (
            <div key={`${effect.key}-${i}`} className="pointer-events-none absolute w-[22px] h-[3px]"
              style={{ top: `${28 + i * 22}%`, background: 'linear-gradient(to right,#e8e0c0,#a88a55)', animation: `d2-volley 0.5s linear ${i * 0.05}s` }} />
          ))}
        </>
      );
    case 'nova':
      return (
        <div key={effect.key} className="pointer-events-none absolute left-1/2 top-1/2 w-[60px] h-[60px] rounded-full border-2"
          style={{ borderColor: '#8fe0ff', boxShadow: '0 0 18px #6ac6ff, inset 0 0 12px #bff0ff', animation: 'd2-nova 0.55s ease-out' }} />
      );
    case 'whirl':
      return (
        <div key={effect.key} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70px] h-[70px] rounded-full border-t-2 border-b-2"
          style={{ borderColor: '#d8d8e0', animation: 'd2-whirl 0.5s linear' }} />
      );
    case 'pierce':
      return (
        <div key={effect.key} className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] origin-left"
          style={{ background: 'linear-gradient(to right, transparent, #e6e0c6, #ffffff, #e6e0c6, transparent)', boxShadow: '0 0 8px #cfc8a8', animation: 'd2-beam 0.5s ease-out' }} />
      );
    case 'summon':
      return (
        <div key={effect.key} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40px] h-[40px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(150,210,255,.6), transparent 70%)', animation: 'd2-summon 0.55s ease-out' }} />
      );
    default:
      return null;
  }
}

function EnemyTile({
  enemy,
  frame,
  armed,
  onAttack,
}: {
  enemy: Enemy;
  frame: number;
  armed: boolean;
  onAttack: (id: string) => void;
}) {
  const def = spriteForEnemy(enemy.name, enemy.isBoss);
  const pct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
  const slowed = (enemy.slowTurns ?? 0) > 0;
  return (
    <button
      onClick={() => onAttack(enemy.id)}
      className={cn(
        'relative flex flex-col items-center gap-1 p-2 border cursor-pointer transition-transform active:scale-95',
        enemy.isBoss ? 'border-[#aa2222] bg-[#2a0808] col-span-2' : 'border-[#3a2410] bg-[#120f14] hover:border-[#66441a]',
        armed && 'ring-1 ring-[#ffcc55]',
      )}
    >
      {slowed && (
        <span className="absolute top-1 right-1 text-[8px] text-[#8fe0ff]" title="Slowed">❄</span>
      )}
      <PixelSprite def={def} frame={frame} scale={2} />
      <div className={cn('text-[10px]', enemy.isBoss ? 'text-[#ff5555] font-bold' : 'text-[#c8b090]')}>{enemy.name}</div>
      <div className="w-full h-[6px] bg-black/60 border border-[#3a2410] overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, background: enemy.isBoss ? 'linear-gradient(to right,#550000,#ff2222)' : 'linear-gradient(to right,#552200,#cc3333)' }} />
      </div>
      <div className="text-[9px] text-[#887755]">{Math.max(0, enemy.hp)}/{enemy.maxHp}</div>
    </button>
  );
}

function DungeonPanel({
  level,
  enemies,
  dying,
  ally,
  flashIds,
  idleTick,
  effect,
  selectedSkill,
  floorLoot,
  bossDown,
  onAttack,
  onPickUp,
  onNext,
  onTown,
}: {
  level: number;
  enemies: Enemy[];
  dying: Enemy[];
  ally: Ally | null;
  flashIds: string[];
  idleTick: number;
  effect: Effect | null;
  selectedSkill: string | null;
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
          {isBossLevel(level) ? `The Catacombs — Level ${BOSS_LEVEL}` : `Dungeon Level ${level}`}
        </span>
        <span className="text-[#665544] text-[10px]">{enemies.length} foes</span>
      </div>

      {/* Battlefield (stone floor + tiled border) */}
      <div
        className="relative grid grid-cols-2 gap-2 p-2 rounded-sm"
        style={{
          background:
            'repeating-linear-gradient(90deg,#17151b 0 12px,#141218 12px 24px), repeating-linear-gradient(0deg,rgba(0,0,0,.25) 0 12px,transparent 12px 24px)',
          border: '2px solid #2a2630',
          boxShadow: 'inset 0 0 22px rgba(0,0,0,0.7)',
        }}
      >
        {enemies.map((e) => {
          const def = spriteForEnemy(e.name, e.isBoss);
          const frame = spriteFrame(def.frames.length, flashIds.includes(e.id), idleTick);
          return <EnemyTile key={e.id} enemy={e} frame={frame} armed={!!selectedSkill} onAttack={onAttack} />;
        })}

        {/* Crumbling corpses */}
        {dying.map((e) => {
          const def = spriteForEnemy(e.name, e.isBoss);
          return (
            <div
              key={`dying-${e.id}`}
              className={cn('flex flex-col items-center gap-1 p-2 border pointer-events-none', e.isBoss ? 'col-span-2 border-[#aa2222]' : 'border-[#3a2410]')}
              style={{ animation: 'd2-crumble 0.48s ease-in forwards' }}
            >
              <PixelSprite def={def} frame={def.frames.length - 1} scale={2} />
            </div>
          );
        })}

        {effect && <EffectOverlay effect={effect} />}

        {cleared && dying.length === 0 && (
          <div className="col-span-2 text-center text-[#88bb66] py-3">
            {bossDown ? 'Andariel is defeated! You are victorious.' : 'Room cleared!'}
          </div>
        )}
      </div>

      {/* Skeleton ally */}
      {ally && (
        <div className="flex items-center gap-2 border border-[#2f4a5a] bg-[#0c1418] p-1 rounded-sm">
          <PixelSprite def={ALLY_SKELETON} frame={idleTick % 2} className="shrink-0" />
          <div className="flex-1">
            <div className="text-[10px] text-[#8fd0e0]">{ally.name} (your minion)</div>
            <div className="w-full h-[5px] bg-black/60 border border-[#2f4a5a] overflow-hidden">
              <div className="h-full" style={{ width: `${(ally.hp / ally.maxHp) * 100}%`, background: 'linear-gradient(to right,#2f6a7a,#6ad0e0)' }} />
            </div>
          </div>
          <span className="text-[9px] text-[#6a9aaa]">{Math.max(0, ally.hp)}/{ally.maxHp}</span>
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
                className="flex items-center gap-2 text-left px-2 py-[2px] border border-[#3a2410] bg-black/40 hover:bg-[#2a1608] cursor-pointer"
                style={{ color: RARITY_COLORS[item.rarity] }}
              >
                <span className="relative shrink-0">
                  <PixelSprite def={iconForItem(item)} />
                  <span className="absolute -top-1 -right-1 text-[8px]" style={{ animation: 'd2-sparkle 1.1s ease-in-out infinite', color: '#fff2b0' }}>✦</span>
                </span>
                <span>
                  {item.name} <span className="text-[9px] opacity-70">[{item.base}]</span>
                </span>
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
        <div className="flex items-center gap-2 mb-1">
          <PixelSprite def={CLASS_PORTRAITS[character.cls]} scale={2} className="shrink-0" />
          <span className="text-[#ffaa44] font-bold flex-1">Attributes</span>
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
                    <PixelSprite def={iconForItem(item)} className="shrink-0" />
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
                  'flex items-center gap-2 text-left px-2 py-[2px] border cursor-pointer',
                  selectedItem?.id === item.id ? 'border-[#ffaa44] bg-[#2a1608]' : 'border-[#2a1a0c] hover:bg-[#1a0f06]',
                )}
                style={{ color: RARITY_COLORS[item.rarity] }}
              >
                <PixelSprite def={iconForItem(item)} className="shrink-0" />
                <span>
                  {item.name} <span className="text-[9px] opacity-60">[{item.base}]</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected item detail */}
      {selectedItem && (
        <div className="border border-[#66441a] bg-black/50 p-2">
          <div className="flex items-center gap-2">
            <PixelSprite def={iconForItem(selectedItem)} scale={2} className="shrink-0" />
            <div>
              <div className="font-bold" style={{ color: RARITY_COLORS[selectedItem.rarity] }}>{selectedItem.name}</div>
              <div className="text-[10px] text-[#887755]">{selectedItem.base} · {selectedItem.rarity} · ilvl {selectedItem.ilvl}</div>
            </div>
          </div>
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
