'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import { Button98 } from '@/components/ui/Button98';
import { cn } from '@/lib/cn';
import { makeRng, randInt, weightedPick, type Rand } from './engine/rng';
import { useGameLoop } from './engine/loop';
import { useWindowActive, PauseVeil } from './engine/focusPause';
import {
  addBasePoints,
  addTrick,
  bankCombo,
  collectLetter,
  comboMultiplier,
  comboText,
  comboValue,
  emptyCombo,
  emptyManual,
  emptySkate,
  enterManual,
  goalTier,
  grindHasBailed,
  higherTier,
  isLevelUnlocked,
  manualExpired,
  manualHasBailed,
  manualPopReady,
  mergeSkateBadge,
  skateComplete,
  specialAfterBail,
  specialAfterLanding,
  specialArmed,
  spendSpecial,
  SKATE_BONUS,
  SKATE_LETTERS,
  SPECIAL_MAX,
  MANUAL_INPUT_WINDOW,
  TONY_LEVELS as LEVELS,
  trickName,
  trickSpin,
  updateGrindBalance,
  updateManual,
  validateLanding,
  TRICKS,
  type ComboState,
  type GoalTier,
  type LevelDef,
  type ManualState,
} from './engine/trick';
import { compileSprite, drawSprite, animFrame } from './engine/sprites/sprite';
import {
  SKATER_PUSH,
  SKATER_CROUCH,
  SKATER_OLLIE,
  SKATER_KICKFLIP,
  SKATER_GRAB,
  SKATER_GRIND,
  SKATER_MANUAL,
  SKATER_BAIL,
  SKATER_900,
} from './engine/sprites/tonyhawk';

const GAME_ID = 'tony-hawk-2';

/** Best score and medal a player has banked on a given level. */
interface LevelRecord {
  best: number;
  tier: GoalTier;
}

function defaultRecords(): LevelRecord[] {
  return LEVELS.map(() => ({ best: 0, tier: 'none' as GoalTier }));
}

// ---- world / physics constants (canvas logical coordinates) ----
const W = 640;
const H = 340;
const GROUND_Y = 252;
const PLAYER_X = 150;
const GRAVITY = 1350; // px/s^2
const JUMP_V = 470;
const RAMP_V = 660;
const RUN_TIME = 120; // seconds
const GRIND_TICK = 0.35; // seconds between grind combo ticks
const DOUBLE_TAP = 0.28; // seconds between Up presses to fire Christ / the 900
const SPRITE_SCALE = 2; // 16x24 art -> 32x48 skater
const SPRITE_HALF_H = (24 * SPRITE_SCALE) / 2;

type FeatureType = 'rail' | 'ramp' | 'gap';
interface Feature {
  type: FeatureType;
  x: number; // world start
  w: number;
  h: number; // rail height above ground
  used?: boolean; // ramps launch once
}

/** One of the five S-K-A-T-E pickups, placed in the world. */
interface Letter {
  index: number; // 0..4 => S,K,A,T,E
  x: number; // world position
  y: number; // height above ground
  taken: boolean;
}

interface Particle {
  x: number;
  y: number; // screen space
  vx: number;
  vy: number;
  grav: number;
  life: number;
  life0: number;
  color: string;
  size: number;
}

interface Flash {
  text: string;
  color: string;
  t: number;
}

type AirPose = 'ollie' | 'flip' | 'grab' | 'spin';

interface Sim {
  rand: Rand;
  level: LevelDef;
  time: number;
  worldX: number; // player's world position
  // skater
  y: number; // height above ground (0 = grounded)
  vy: number;
  rotation: number;
  targetRot: number;
  onGround: boolean;
  grinding: boolean;
  railEnd: number;
  balance: number;
  drift: number;
  grindTimer: number;
  landTimer: number; // brief crouch after a landing
  airPose: AirPose;
  // manual link
  manual: ManualState;
  downAt: number; // time of last Down press (-1 = unprimed)
  upAt: number; // time of last Up press
  // combos + scoring
  combo: ComboState;
  score: number;
  bestCombo: number;
  special: number;
  skate: boolean[];
  reached: { bronze: boolean; silver: boolean; gold: boolean };
  // world / fx
  letters: Letter[];
  particles: Particle[];
  flash: Flash | null;
  ended: boolean;
  features: Feature[];
}

function genFeatures(rand: Rand, level: LevelDef): Feature[] {
  const feats: Feature[] = [];
  let x = 700;
  const total = 22500;
  const w = level.featureWeights;
  const [railMin, railMax] = level.railHeightRange;
  const [gapMin, gapMax] = level.gapWidthRange;
  while (x < total) {
    const t = weightedPick<FeatureType | 'flat'>(rand, [
      ['rail', w.rail],
      ['ramp', w.ramp],
      ['gap', w.gap],
      ['flat', w.flat],
    ]);
    if (t === 'rail') {
      const rw = randInt(rand, 150, 280);
      feats.push({ type: 'rail', x, w: rw, h: randInt(rand, railMin, railMax) });
      x += rw;
    } else if (t === 'ramp') {
      const rw = randInt(rand, 60, 90);
      feats.push({ type: 'ramp', x, w: rw, h: 0 });
      x += rw;
    } else if (t === 'gap') {
      const rw = randInt(rand, gapMin, gapMax);
      feats.push({ type: 'gap', x, w: rw, h: 0 });
      x += rw;
    }
    x += randInt(rand, 280, 540);
  }
  return feats;
}

/**
 * Five S-K-A-T-E letters strung across the course. Heights alternate between
 * ollie range, rail height and ramp-only altitude so some can only be grabbed off
 * a launch or mid-grind.
 */
function genLetters(rand: Rand): Letter[] {
  const span = 22500;
  const lanes = [40, 150, 90, 165, 70]; // low, high, mid, high, mid
  return SKATE_LETTERS.map((_, i) => ({
    index: i,
    x: 2600 + (i * (span - 4200)) / 4 + randInt(rand, -260, 260),
    y: lanes[i] + randInt(rand, -14, 14),
    taken: false,
  }));
}

function createSim(seed: number, level: LevelDef): Sim {
  const rand = makeRng(seed);
  return {
    rand,
    level,
    time: 0,
    worldX: 0,
    y: 0,
    vy: 0,
    rotation: 0,
    targetRot: 0,
    onGround: true,
    grinding: false,
    railEnd: 0,
    balance: 0,
    drift: 0,
    grindTimer: 0,
    landTimer: 0,
    airPose: 'ollie',
    manual: emptyManual(),
    downAt: -1,
    upAt: -1,
    combo: emptyCombo(),
    score: 0,
    bestCombo: 0,
    special: 0,
    skate: emptySkate(),
    reached: { bronze: false, silver: false, gold: false },
    letters: genLetters(rand),
    particles: [],
    flash: null,
    ended: false,
    features: genFeatures(rand, level),
  };
}

// ---- small color + hash helpers for the parallax skyline ----
function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}
function bHash(i: number): number {
  let x = (i * 2654435761) >>> 0;
  x ^= x >>> 13;
  x = (x * 1274126177) >>> 0;
  return x >>> 0;
}

const SPRITE_BY_POSE: Record<AirPose, typeof SKATER_OLLIE> = {
  ollie: SKATER_OLLIE,
  flip: SKATER_KICKFLIP,
  grab: SKATER_GRAB,
  spin: SKATER_900,
};

export default function TonyHawk2({ windowId }: AppComponentProps) {
  const { getAppPref, setAppPref } = useSettings();
  const windowActive = useWindowActive(windowId);

  const [screen, setScreen] = useState<'title' | 'run' | 'summary'>('title');
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [best, setBest] = useState<number>(() => getAppPref<number>(GAME_ID, 'highScore', 0));
  const [records, setRecords] = useState<LevelRecord[]>(() => {
    const stored = getAppPref<LevelRecord[]>(GAME_ID, 'levelRecords', []);
    return defaultRecords().map((d, i) => stored[i] ?? d);
  });
  const [skateBadges, setSkateBadges] = useState<boolean[]>(() => {
    const stored = getAppPref<boolean[]>(GAME_ID, 'skateBadges', []);
    return LEVELS.map((_, i) => stored[i] ?? false);
  });

  const tiers = records.map((r) => r.tier);

  const [hud, setHud] = useState({
    score: 0,
    timeLeft: RUN_TIME,
    comboVal: 0,
    mult: 1,
    tier: 'none' as GoalTier,
    special: 0,
    armed: false,
    skate: emptySkate(),
  });
  const [summary, setSummary] = useState({
    score: 0,
    bestCombo: 0,
    newBest: false,
    tier: 'none' as GoalTier,
    skate: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<Sim | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const hudAccumRef = useRef(0);

  const flash = useCallback((sim: Sim, text: string, color: string) => {
    sim.flash = { text, color, t: 0.9 };
  }, []);

  // ---- particles ----
  const pushP = useCallback((sim: Sim, p: Particle) => {
    if (sim.particles.length < 150) sim.particles.push(p);
  }, []);

  const spawnSparks = useCallback(
    (sim: Sim) => {
      const y = GROUND_Y - sim.y;
      for (let i = 0; i < 2; i++) {
        pushP(sim, {
          x: PLAYER_X + (sim.rand() - 0.5) * 8,
          y: y - 2,
          vx: -60 - sim.rand() * 140,
          vy: -(30 + sim.rand() * 90),
          grav: 420,
          life: 0.32,
          life0: 0.32,
          color: sim.rand() < 0.5 ? '#fff2c0' : '#ffcf3f',
          size: 2,
        });
      }
    },
    [pushP],
  );

  const spawnDust = useCallback(
    (sim: Sim) => {
      const y = GROUND_Y - sim.y;
      for (let i = 0; i < 8; i++) {
        const dir = i < 4 ? -1 : 1;
        pushP(sim, {
          x: PLAYER_X + dir * (4 + sim.rand() * 10),
          y: y - 1,
          vx: dir * (20 + sim.rand() * 70),
          vy: -(10 + sim.rand() * 30),
          grav: 140,
          life: 0.5,
          life0: 0.5,
          color: '#cfd3da',
          size: 3,
        });
      }
    },
    [pushP],
  );

  const spawnDebris = useCallback(
    (sim: Sim) => {
      const y = GROUND_Y - sim.y;
      for (let i = 0; i < 12; i++) {
        const life = 0.7 + sim.rand() * 0.3;
        pushP(sim, {
          x: PLAYER_X + (sim.rand() - 0.5) * 20,
          y: y - 6,
          vx: (sim.rand() - 0.5) * 260,
          vy: -(40 + sim.rand() * 160),
          grav: 300,
          life,
          life0: life,
          color: sim.rand() < 0.5 ? '#e8952a' : '#cfd3da',
          size: 3,
        });
      }
    },
    [pushP],
  );

  const spawnSparkle = useCallback(
    (sim: Sim, x: number, y: number, color: string) => {
      for (let i = 0; i < 10; i++) {
        const a = sim.rand() * Math.PI * 2;
        const sp = 40 + sim.rand() * 90;
        pushP(sim, {
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          grav: 60,
          life: 0.5,
          life0: 0.5,
          color,
          size: 2,
        });
      }
    },
    [pushP],
  );

  const crash = useCallback(
    (sim: Sim) => {
      spawnDebris(sim);
      sim.combo = emptyCombo();
      sim.manual = emptyManual();
      sim.special = specialAfterBail();
      sim.grinding = false;
      sim.onGround = true;
      sim.y = 0;
      sim.vy = 0;
      sim.rotation = 0;
      sim.targetRot = 0;
      sim.airPose = 'ollie';
      sim.landTimer = 1.1; // ride out the tumble
      flash(sim, 'BAIL!', '#ff3838');
      playSound('error');
    },
    [flash, spawnDebris],
  );

  const checkGoals = useCallback(
    (sim: Sim) => {
      const tier = goalTier(sim.score, sim.level.goals);
      if (tier === 'gold' && !sim.reached.gold) {
        sim.reached.gold = sim.reached.silver = sim.reached.bronze = true;
        flash(sim, 'GOLD MEDAL!', '#ffd700');
        playSound('chord');
      } else if (tier === 'silver' && !sim.reached.silver) {
        sim.reached.silver = sim.reached.bronze = true;
        flash(sim, 'SILVER!', '#d8d8e0');
        playSound('cardWin');
      } else if (tier === 'bronze' && !sim.reached.bronze) {
        sim.reached.bronze = true;
        flash(sim, 'BRONZE!', '#cd7f32');
        playSound('notify');
      }
    },
    [flash],
  );

  const driftFor = useCallback((sim: Sim) => (sim.rand() < 0.5 ? -1 : 1) * (0.6 + sim.rand() * 0.6), []);

  /** Cash a live combo out cleanly (manual coast-out / time-up), feeding the meter. */
  const bankClean = useCallback(
    (sim: Sim) => {
      if (sim.combo.tricks.length > 0) {
        const size = sim.combo.tricks.length;
        const pts = bankCombo(sim.combo, 'clean');
        sim.score += pts;
        sim.bestCombo = Math.max(sim.bestCombo, pts);
        sim.special = specialAfterLanding(sim.special, 'clean', size);
        flash(sim, `CLEAN +${pts.toLocaleString()}`, '#ccff00');
        playSound('ding');
        checkGoals(sim);
        spawnDust(sim);
      }
      sim.combo = emptyCombo();
      sim.manual = emptyManual();
      sim.landTimer = 0.15;
    },
    [flash, checkGoals, spawnDust],
  );

  const startRun = useCallback(() => {
    if (!isLevelUnlocked(selectedLevel, records.map((r) => r.tier))) return;
    simRef.current = createSim((Date.now() ^ (selectedLevel * 2654435761)) >>> 0, LEVELS[selectedLevel]);
    keysRef.current = { left: false, right: false };
    hudAccumRef.current = 0;
    setHud({ score: 0, timeLeft: RUN_TIME, comboVal: 0, mult: 1, tier: 'none', special: 0, armed: false, skate: emptySkate() });
    setScreen('run');
  }, [selectedLevel, records]);

  const endRun = useCallback(
    (sim: Sim) => {
      sim.ended = true;
      // a combo still live at the whistle banks clean rather than vanishing
      if (sim.combo.tricks.length > 0) {
        sim.score += bankCombo(sim.combo, 'clean');
        sim.combo = emptyCombo();
      }
      const finalScore = sim.score;
      const tier = goalTier(finalScore, sim.level.goals);
      const newBest = finalScore > best;
      if (newBest) {
        setBest(finalScore);
        setAppPref<number>(GAME_ID, 'highScore', finalScore);
        playSound('chord');
      }
      const cur = records[selectedLevel] ?? { best: 0, tier: 'none' as GoalTier };
      const nextRecords = records.map((r, i) =>
        i === selectedLevel
          ? { best: Math.max(cur.best, finalScore), tier: higherTier(cur.tier, tier) }
          : r,
      );
      setRecords(nextRecords);
      setAppPref<LevelRecord[]>(GAME_ID, 'levelRecords', nextRecords);

      const gotSkate = skateComplete(sim.skate);
      if (gotSkate && !skateBadges[selectedLevel]) {
        const nextBadges = mergeSkateBadge(skateBadges, selectedLevel, true);
        setSkateBadges(nextBadges);
        setAppPref<boolean[]>(GAME_ID, 'skateBadges', nextBadges);
      }
      setSummary({ score: finalScore, bestCombo: sim.bestCombo, newBest, tier, skate: gotSkate });
      setScreen('summary');
    },
    [best, setAppPref, selectedLevel, records, skateBadges],
  );

  // ---- input ----
  const do900 = useCallback(
    (sim: Sim) => {
      sim.combo = addTrick(sim.combo, 'the900');
      sim.targetRot += trickSpin('the900');
      sim.airPose = 'spin';
      sim.special = spendSpecial();
      flash(sim, 'THE 900!', '#ffd700');
      playSound('exclamation');
    },
    [flash],
  );

  const ollie = useCallback((sim: Sim) => {
    if (sim.manual.active) {
      sim.manual = emptyManual();
      sim.onGround = false;
      sim.vy = JUMP_V;
      sim.airPose = 'ollie';
      return;
    }
    if (sim.onGround || sim.grinding) {
      sim.vy = JUMP_V;
      sim.onGround = false;
      sim.grinding = false; // hop off a rail keeps the combo alive
      sim.airPose = 'ollie';
    }
  }, []);

  const enterManualLink = useCallback(
    (sim: Sim) => {
      sim.combo = addTrick(sim.combo, 'manual');
      sim.manual = enterManual(driftFor(sim));
      sim.downAt = -1;
      flash(sim, 'MANUAL', '#7fdfff');
    },
    [driftFor, flash],
  );

  useEffect(() => {
    if (screen !== 'run') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const sim = simRef.current;
      if (!sim) return;
      const k = e.code;
      const game =
        k === 'Space' ||
        k === 'ArrowLeft' ||
        k === 'ArrowRight' ||
        k === 'ArrowUp' ||
        k === 'ArrowDown' ||
        k === 'KeyA' ||
        k === 'KeyD' ||
        k === 'KeyW' ||
        k === 'KeyS';
      if (game) e.preventDefault();
      // recovering from a bail — ignore trick input until upright again
      const downed = sim.landTimer > 0 && sim.flash?.text === 'BAIL!';
      if (e.repeat) {
        if (k === 'ArrowLeft' || k === 'KeyA') keysRef.current.left = true;
        if (k === 'ArrowRight' || k === 'KeyD') keysRef.current.right = true;
        return;
      }
      switch (k) {
        case 'Space':
          if (!downed) ollie(sim);
          break;
        case 'ArrowLeft':
        case 'KeyA':
          keysRef.current.left = true;
          if (!downed) doTrickAir(sim, 'kickflip');
          break;
        case 'ArrowRight':
        case 'KeyD':
          keysRef.current.right = true;
          if (!downed) doTrickAir(sim, 'heelflip');
          break;
        case 'ArrowUp':
        case 'KeyW': {
          if (downed) break;
          const now = sim.time;
          if (!sim.onGround && !sim.grinding && !sim.manual.active) {
            const dbl = now - sim.upAt <= DOUBLE_TAP;
            sim.upAt = now;
            if (dbl && specialArmed(sim.special)) do900(sim);
            else if (dbl) doTrickAir(sim, 'christ');
            else doTrickAir(sim, 'grab');
          } else {
            sim.upAt = now;
            if (sim.onGround && !sim.manual.active && manualPopReady(sim.downAt, now)) {
              enterManualLink(sim);
            }
          }
          break;
        }
        case 'ArrowDown':
        case 'KeyS':
          if (downed) break;
          sim.downAt = sim.time;
          if (!sim.onGround && !sim.grinding && !sim.manual.active) doTrickAir(sim, 'judo');
          else if (sim.manual.active) bankClean(sim); // set down out of the manual
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.code;
      if (k === 'ArrowLeft' || k === 'KeyA') keysRef.current.left = false;
      if (k === 'ArrowRight' || k === 'KeyD') keysRef.current.right = false;
    };
    // local air-trick helper closes over the current sim without the doTrick guard shim
    function doTrickAir(sim: Sim, id: string) {
      if (sim.onGround || sim.grinding || sim.manual.active) return;
      sim.combo = addTrick(sim.combo, id);
      sim.targetRot += trickSpin(id);
      sim.airPose = TRICKS[id]?.type === 'flip' ? 'flip' : 'grab';
      flash(sim, trickName(id), '#ccff00');
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [screen, ollie, do900, bankClean, enterManualLink, flash]);

  // ---- simulation step ----
  const step = useCallback(
    (sim: Sim, dt: number) => {
      sim.time += dt;
      sim.worldX += sim.level.scroll * dt;
      if (sim.flash) {
        sim.flash.t -= dt;
        if (sim.flash.t <= 0) sim.flash = null;
      }
      if (sim.landTimer > 0) sim.landTimer = Math.max(0, sim.landTimer - dt);

      // particles
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          sim.particles.splice(i, 1);
          continue;
        }
        p.vy += p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      // S-K-A-T-E pickups
      for (const L of sim.letters) {
        if (L.taken) continue;
        if (Math.abs(sim.worldX - L.x) < 34 && Math.abs(sim.y + 22 - L.y) < 30) {
          L.taken = true;
          sim.skate = collectLetter(sim.skate, L.index);
          spawnSparkle(sim, PLAYER_X, GROUND_Y - L.y, '#ffd23f');
          playSound('menuClick');
          if (skateComplete(sim.skate)) {
            sim.score += SKATE_BONUS;
            flash(sim, `S-K-A-T-E!  +${SKATE_BONUS.toLocaleString()}`, '#ccff00');
            playSound('chord');
            checkGoals(sim);
          } else {
            flash(sim, `${SKATE_LETTERS[L.index]}!`, '#ffd23f');
          }
        }
      }

      const bailingOut = sim.landTimer > 0 && sim.flash?.text === 'BAIL!';

      if (bailingOut) {
        // ride out the tumble; nothing else happens until upright
      } else if (sim.manual.active) {
        const input = (keysRef.current.left ? 1 : 0) + (keysRef.current.right ? -1 : 0);
        const r = updateManual(sim.manual, input, dt);
        sim.manual = r.manual;
        if (r.gained > 0) sim.combo = addBasePoints(sim.combo, r.gained);

        let launched = false;
        for (const f of sim.features) {
          if (f.type !== 'ramp' || f.used) continue;
          if (sim.worldX >= f.x && sim.worldX <= f.x + f.w) {
            f.used = true;
            sim.manual = emptyManual();
            sim.vy = RAMP_V;
            sim.onGround = false;
            sim.airPose = 'ollie';
            flash(sim, 'AIR!', '#ffffff');
            launched = true;
            break;
          }
        }
        if (!launched) {
          const inGap = sim.features.some(
            (f) => f.type === 'gap' && sim.worldX >= f.x && sim.worldX <= f.x + f.w,
          );
          if (inGap || manualHasBailed(sim.manual)) crash(sim);
          else if (manualExpired(sim.manual)) bankClean(sim);
        }
      } else if (sim.grinding) {
        const input = (keysRef.current.left ? 1 : 0) + (keysRef.current.right ? -1 : 0);
        sim.balance = updateGrindBalance(sim.balance, sim.drift, input, dt);
        sim.grindTimer += dt;
        if (sim.grindTimer >= GRIND_TICK) {
          sim.grindTimer -= GRIND_TICK;
          sim.combo = addTrick(sim.combo, 'grind');
        }
        spawnSparks(sim);
        if (grindHasBailed(sim.balance)) {
          crash(sim);
        } else if (sim.worldX > sim.railEnd) {
          // rode off the end — drop back into the air, combo intact
          sim.grinding = false;
          sim.onGround = false;
          sim.vy = 40;
          sim.airPose = 'ollie';
        }
      } else if (!sim.onGround) {
        // airborne physics
        sim.vy -= GRAVITY * dt;
        sim.y += sim.vy * dt;
        sim.rotation += (sim.targetRot - sim.rotation) * Math.min(1, dt * 11);

        // try to catch a rail on the way down
        if (sim.vy <= 0) {
          for (const f of sim.features) {
            if (f.type !== 'rail') continue;
            if (
              sim.worldX >= f.x &&
              sim.worldX <= f.x + f.w &&
              sim.y <= f.h + 10 &&
              sim.y >= f.h - 44
            ) {
              sim.grinding = true;
              sim.y = f.h;
              sim.vy = 0;
              sim.railEnd = f.x + f.w;
              sim.balance = 0;
              sim.grindTimer = 0;
              sim.drift = driftFor(sim);
              sim.combo = addTrick(sim.combo, 'grind');
              flash(sim, '50-50 GRIND', '#7fdfff');
              break;
            }
          }
        }

        // landing on the ground
        if (sim.y <= 0 && sim.vy <= 0 && !sim.grinding) {
          const overGap = sim.features.some(
            (f) => f.type === 'gap' && sim.worldX >= f.x && sim.worldX <= f.x + f.w,
          );
          if (overGap) {
            crash(sim);
          } else {
            const landing = validateLanding(sim.rotation);
            const hadCombo = sim.combo.tricks.length > 0;
            if (landing === 'bail') {
              crash(sim);
            } else {
              sim.onGround = true;
              sim.y = 0;
              sim.vy = 0;
              sim.rotation = Math.round(sim.rotation / 360) * 360;
              sim.targetRot = sim.rotation;
              sim.airPose = 'ollie';
              const armManual =
                hadCombo &&
                manualPopReady(sim.downAt, sim.upAt) &&
                sim.time - sim.upAt <= MANUAL_INPUT_WINDOW;
              if (armManual) {
                enterManualLink(sim);
                spawnDust(sim);
              } else if (hadCombo) {
                const size = sim.combo.tricks.length;
                const pts = bankCombo(sim.combo, landing);
                sim.score += pts;
                sim.bestCombo = Math.max(sim.bestCombo, pts);
                sim.special = specialAfterLanding(sim.special, landing, size);
                flash(
                  sim,
                  `${landing === 'clean' ? 'CLEAN' : 'SKETCHY'} +${pts.toLocaleString()}`,
                  landing === 'clean' ? '#ccff00' : '#ffcc44',
                );
                playSound('ding');
                checkGoals(sim);
                spawnDust(sim);
                sim.combo = emptyCombo();
                sim.landTimer = 0.15;
              } else {
                sim.combo = emptyCombo();
                sim.landTimer = 0.15;
              }
            }
          }
        }
      } else {
        // grounded: ramps launch you skyward
        for (const f of sim.features) {
          if (f.type !== 'ramp' || f.used) continue;
          if (sim.worldX >= f.x && sim.worldX <= f.x + f.w) {
            f.used = true;
            sim.vy = RAMP_V;
            sim.onGround = false;
            sim.airPose = 'ollie';
            flash(sim, 'AIR!', '#ffffff');
            break;
          }
        }
        // rode into a gap while grounded
        const inGap = sim.features.some(
          (f) => f.type === 'gap' && sim.worldX >= f.x && sim.worldX <= f.x + f.w,
        );
        if (inGap && !bailingOut) crash(sim);
      }

      if (sim.time >= RUN_TIME && !sim.ended) {
        endRun(sim);
      }
    },
    [crash, flash, checkGoals, endRun, bankClean, enterManualLink, driftFor, spawnSparks, spawnDust, spawnSparkle],
  );

  // ---- rendering ----
  const draw = useCallback((ctx: CanvasRenderingContext2D, sim: Sim) => {
    const camX = sim.worldX - PLAYER_X;
    const sx = (wx: number) => wx - camX;
    const { sky: skyStops, ground, accent } = sim.level.palette;

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, skyStops[0]);
    sky.addColorStop(0.6, skyStops[1]);
    sky.addColorStop(1, skyStops[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // two parallax silhouette skylines, tinted from the palette
    const drawSkyline = (
      offset: number,
      color: string,
      alpha: number,
      minH: number,
      maxH: number,
      bw: number,
      gap: number,
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      const span = bw + gap;
      const first = Math.floor(offset / span) - 1;
      for (let i = 0; i <= W / span + 3; i++) {
        const idx = first + i;
        const bx = idx * span - offset;
        const h = minH + (bHash(idx) % (maxH - minH));
        ctx.fillRect(bx, GROUND_Y - h, bw, h);
      }
      ctx.restore();
    };
    drawSkyline(sim.worldX * 0.12, mixHex(skyStops[2], accent, 0.16), 0.5, 54, 128, 56, 66);
    drawSkyline(sim.worldX * 0.3, mixHex(skyStops[1], accent, 0.32), 0.62, 30, 86, 40, 40);

    // ground
    ctx.fillStyle = ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    // carve gaps + draw features
    for (const f of sim.features) {
      const fx = sx(f.x);
      if (fx > W + 60 || fx + f.w < -60) continue;
      if (f.type === 'gap') {
        ctx.fillStyle = '#05050a';
        ctx.fillRect(fx, GROUND_Y, f.w, H - GROUND_Y);
      } else if (f.type === 'ramp') {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.moveTo(fx, GROUND_Y);
        ctx.quadraticCurveTo(fx + f.w, GROUND_Y, fx + f.w, GROUND_Y - 54);
        ctx.lineTo(fx + f.w, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (f.type === 'rail') {
        const ry = GROUND_Y - f.h;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fx + 6, GROUND_Y);
        ctx.lineTo(fx + 6, ry);
        ctx.moveTo(fx + f.w - 6, GROUND_Y);
        ctx.lineTo(fx + f.w - 6, ry);
        ctx.stroke();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(fx, ry);
        ctx.lineTo(fx + f.w, ry);
        ctx.stroke();
      }
    }

    // neon ground edge (skip gaps)
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let penDown = false;
    for (let x = 0; x <= W; x += 8) {
      const wx = x + camX;
      const overGap = sim.features.some(
        (f) => f.type === 'gap' && wx >= f.x && wx <= f.x + f.w,
      );
      if (overGap) {
        penDown = false;
        continue;
      }
      if (!penDown) {
        ctx.moveTo(x, GROUND_Y);
        penDown = true;
      } else {
        ctx.lineTo(x, GROUND_Y);
      }
    }
    ctx.stroke();

    // S-K-A-T-E letters, bobbing in the air
    for (const L of sim.letters) {
      if (L.taken) continue;
      const lx = sx(L.x);
      if (lx < -30 || lx > W + 30) continue;
      const ly = GROUND_Y - L.y + Math.sin(sim.time * 3 + L.index) * 4;
      ctx.save();
      ctx.beginPath();
      ctx.arc(lx, ly, 11, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = accent;
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(SKATE_LETTERS[L.index], lx, ly + 1);
      ctx.restore();
    }
    ctx.textBaseline = 'alphabetic';

    // particles behind the skater
    for (const p of sim.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.life0);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // skater sprite — the board/body spin is applied as a canvas transform
    const feetY = GROUND_Y - sim.y;
    const bailing = sim.landTimer > 0 && sim.flash?.text === 'BAIL!';
    let def = SKATER_PUSH;
    let frame = 0;
    let rot = 0;
    if (bailing) {
      def = SKATER_BAIL;
      frame = animFrame(sim.time, 7, 2);
    } else if (sim.manual.active) {
      def = SKATER_MANUAL;
    } else if (sim.grinding) {
      def = SKATER_GRIND;
    } else if (!sim.onGround) {
      def = SPRITE_BY_POSE[sim.airPose];
      if (sim.airPose === 'flip') frame = animFrame(sim.time, 14, 2);
      rot = (sim.rotation * Math.PI) / 180;
    } else if (sim.landTimer > 0) {
      def = SKATER_CROUCH;
    } else {
      def = SKATER_PUSH;
      frame = animFrame(sim.time, 6, 2);
    }
    const sprite = compileSprite(def, { scale: SPRITE_SCALE });
    ctx.save();
    ctx.translate(PLAYER_X, feetY - SPRITE_HALF_H);
    if (rot) ctx.rotate(rot);
    drawSprite(ctx, sprite, 0, 0, { anchor: 'center', frame });
    ctx.restore();

    // running combo banner
    if (sim.combo.tricks.length > 0) {
      const text = comboText(sim.combo);
      const mult = comboMultiplier(sim.combo);
      const val = comboValue(sim.combo);
      ctx.textAlign = 'center';
      ctx.fillStyle = accent;
      ctx.font = `bold ${text.length > 42 ? 12 : 15}px sans-serif`;
      ctx.fillText(text, W / 2, 28);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${val.toLocaleString()}  x${mult}`, W / 2, 50);
    }

    // flash message
    if (sim.flash) {
      ctx.globalAlpha = Math.min(1, sim.flash.t * 2.2);
      ctx.fillStyle = sim.flash.color;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sim.flash.text, W / 2, 84);
      ctx.globalAlpha = 1;
    }

    // balance meter — shared by grinds and manuals
    const balancing = sim.grinding || sim.manual.active;
    if (balancing) {
      const bal = sim.grinding ? sim.balance : sim.manual.balance;
      const bw = 220;
      const bx = (W - bw) / 2;
      const by = H - 30;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 2, by - 2, bw + 4, 16);
      ctx.fillStyle = 'rgba(255,56,56,0.5)';
      ctx.fillRect(bx, by, bw * 0.12, 12);
      ctx.fillRect(bx + bw * 0.88, by, bw * 0.12, 12);
      ctx.fillStyle = '#2a2a30';
      ctx.fillRect(bx + bw * 0.12, by, bw * 0.76, 12);
      const t = bal / 2 + 0.5;
      const mx = bx + Math.max(0, Math.min(1, t)) * bw;
      ctx.fillStyle = accent;
      ctx.fillRect(mx - 3, by - 3, 6, 18);
      ctx.fillStyle = '#7fdfff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${sim.manual.active ? 'MANUAL' : 'GRIND'} — tap Left / Right`,
        W / 2,
        by - 8,
      );
    }
  }, []);

  // ---- main loop ----
  useGameLoop(
    useCallback(
      (dt: number) => {
        const sim = simRef.current;
        if (!sim || sim.ended) return;
        step(sim, dt);
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (!ctx) return; // jsdom has no 2d context
          draw(ctx, sim);
        }
        // throttle HUD sync to React
        hudAccumRef.current += dt;
        if (hudAccumRef.current >= 0.12) {
          hudAccumRef.current = 0;
          setHud({
            score: sim.score,
            timeLeft: Math.max(0, RUN_TIME - sim.time),
            comboVal: comboValue(sim.combo),
            mult: comboMultiplier(sim.combo),
            tier: goalTier(sim.score, sim.level.goals),
            special: sim.special,
            armed: specialArmed(sim.special),
            skate: sim.skate.slice(),
          });
        }
      },
      [step, draw],
    ),
    screen === 'run' && windowActive,
  );

  // F2 drops into a fresh run of the current level (Windows New Game convention).
  useEffect(() => {
    if (screen !== 'run' || !windowActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'F2') {
        e.preventDefault();
        startRun();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, windowActive, startRun]);

  const mm = Math.floor(hud.timeLeft / 60);
  const ss = Math.floor(hud.timeLeft % 60);

  // ============================ RENDER ============================
  if (screen === 'run') {
    return (
      <div className="flex flex-col h-full bg-black select-none">
        {/* HUD strip */}
        <div className="flex items-center justify-between gap-2 px-2 py-1 text-[11px] font-bold bg-[#0a0a0a] border-b border-[#333]">
          <div className="text-[#ccff00] whitespace-nowrap">
            SCORE <span className="tabular-nums">{hud.score.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-[3px]">
            {SKATE_LETTERS.map((ch, i) => (
              <span
                key={ch}
                className="inline-flex items-center justify-center w-[13px] h-[13px] rounded-sm text-[9px] font-black"
                style={{
                  background: hud.skate[i] ? '#ffd23f' : 'transparent',
                  color: hud.skate[i] ? '#000' : '#555',
                  border: `1px solid ${hud.skate[i] ? '#ffd23f' : '#444'}`,
                  boxShadow: hud.skate[i] ? '0 0 5px #ffd23f' : 'none',
                }}
              >
                {ch}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className={cn('text-[9px]', hud.armed ? 'text-[#ccff00] animate-pulse' : 'text-[#666]')}>
              SPECIAL
            </span>
            <span className="inline-block w-[46px] h-[8px] bg-[#222] border border-[#444]">
              <span
                className="block h-full"
                style={{
                  width: `${Math.min(100, (hud.special / SPECIAL_MAX) * 100)}%`,
                  background: hud.armed ? '#ccff00' : '#3a7ac2',
                  boxShadow: hud.armed ? '0 0 6px #ccff00' : 'none',
                }}
              />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Medal on={hud.tier === 'bronze' || hud.tier === 'silver' || hud.tier === 'gold'} color="#cd7f32" label="B" />
            <Medal on={hud.tier === 'silver' || hud.tier === 'gold'} color="#d8d8e0" label="S" />
            <Medal on={hud.tier === 'gold'} color="#ffd700" label="G" />
          </div>
          <div className={cn('tabular-nums whitespace-nowrap', hud.timeLeft < 15 ? 'text-[#ff3838]' : 'text-white')}>
            {mm}:{ss.toString().padStart(2, '0')}
          </div>
        </div>
        <div className="relative flex-1 min-h-0">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="absolute inset-0 w-full h-full"
            style={{ imageRendering: 'pixelated' }}
            tabIndex={0}
          />
          <PauseVeil windowId={windowId} show={!windowActive} />
        </div>
        {/* controls hint */}
        <div className="flex items-center justify-center gap-3 px-2 py-1 text-[9px] text-[#888] bg-[#0a0a0a] border-t border-[#333]">
          <span><b className="text-[#ccff00]">SPACE</b> ollie</span>
          <span><b className="text-[#ccff00]">←→</b> flips</span>
          <span><b className="text-[#ccff00]">↑</b> grab</span>
          <span><b className="text-[#ccff00]">↓</b> judo</span>
          <span><b className="text-[#ccff00]">↑↑</b> special</span>
          <span><b className="text-[#ccff00]">land ↓↑</b> manual</span>
          <span><b className="text-[#ccff00]">F2</b> restart</span>
        </div>
      </div>
    );
  }

  if (screen === 'summary') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center"
        style={{ background: 'linear-gradient(160deg,#0a0a0a,#1a1a0a,#0a0a0a)' }}>
        <div className="text-[10px] text-[#999] tracking-[3px]">RUN COMPLETE</div>
        <div className="text-[13px] font-bold text-white">{LEVELS[selectedLevel].name}</div>
        <div className="text-[42px] font-black leading-none tabular-nums" style={{ color: '#ccff00', textShadow: '2px 2px 0 #1a2200' }}>
          {summary.score.toLocaleString()}
        </div>
        {summary.tier !== 'none' && (
          <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: summary.tier === 'gold' ? '#ffd700' : summary.tier === 'silver' ? '#d8d8e0' : '#cd7f32' }}>
            {summary.tier} medal earned
          </div>
        )}
        {summary.skate && (
          <div className="text-[11px] font-black tracking-[2px] text-[#ffd23f] animate-pulse">S-K-A-T-E COLLECTED</div>
        )}
        <div className="text-[11px] text-[#aaa]">Best combo: <span className="text-[#ccff00]">{summary.bestCombo.toLocaleString()}</span></div>
        {summary.newBest ? (
          <div className="text-[11px] font-bold text-[#ccff00] animate-pulse">NEW HIGH SCORE!</div>
        ) : (
          <div className="text-[11px] text-[#888]">High score: {best.toLocaleString()}</div>
        )}
        <div className="flex gap-2 mt-2">
          <Button98 onClick={startRun}>Skate Again</Button98>
          <Button98 onClick={() => setScreen('title')}>Levels</Button98>
        </div>
      </div>
    );
  }

  // ---- title / level select ----
  return (
    <div className="flex flex-col h-full relative overflow-hidden select-none">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #0a0a0a 0%, #1a1a0a 50%, #0a0a0a 100%)' }} />
      <div className="relative z-10 flex flex-col flex-1 p-4">
        <div className="text-center mb-3">
          <div className="text-[10px] text-[#999] tracking-[3px] mb-1">TONY HAWK&apos;S</div>
          <h1 className="text-[26px] font-black tracking-tight leading-none"
            style={{ color: '#ccff00', textShadow: '2px 2px 0 #1a2200, 0 0 15px rgba(204,255,0,0.3)', fontFamily: 'sans-serif' }}>
            PRO SKATER 2
          </h1>
          <div className="w-[180px] h-[2px] bg-gradient-to-r from-transparent via-[#ccff00] to-transparent mx-auto mt-2" />
        </div>

        <div className="text-[10px] text-[#888] tracking-wider text-center mb-2">SELECT LEVEL</div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-[2px]">
            {LEVELS.map((level, i) => {
              const unlocked = isLevelUnlocked(i, tiers);
              const record = records[i];
              const active = selectedLevel === i;
              return (
                <button
                  key={level.name}
                  disabled={!unlocked}
                  onClick={() => unlocked && setSelectedLevel(i)}
                  onDoubleClick={() => unlocked && startRun()}
                  onMouseEnter={() => unlocked && setSelectedLevel(i)}
                  className={cn(
                    'py-[5px] px-3 text-left border transition-colors flex justify-between items-center',
                    unlocked ? 'cursor-pointer' : 'cursor-not-allowed',
                  )}
                  style={{
                    background: active ? 'linear-gradient(to right, rgba(204,255,0,0.15), transparent)' : 'transparent',
                    borderColor: active ? '#ccff00' : 'transparent',
                    color: !unlocked ? '#444' : active ? '#ccff00' : '#666',
                  }}
                >
                  <span className="flex items-center gap-1.5 text-[12px] font-bold">
                    {!unlocked && <span aria-hidden className="text-[11px]">🔒</span>}
                    {level.name}
                  </span>
                  <span className="flex items-center gap-2">
                    {unlocked && skateBadges[i] && (
                      <span
                        className="text-[8px] font-black tracking-[1px] px-1 rounded-sm"
                        title="S-K-A-T-E collected"
                        style={{ background: '#ffd23f', color: '#000', boxShadow: '0 0 5px #ffd23f' }}
                      >
                        SKATE
                      </span>
                    )}
                    {unlocked && record && record.tier !== 'none' && (
                      <LevelMedal tier={record.tier} />
                    )}
                    <span className="text-[10px] opacity-60">
                      {unlocked ? level.location : 'LOCKED'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#333]">
          <div className="text-[10px] text-[#555]">
            Goals: {LEVELS[selectedLevel].goals.bronze.toLocaleString()} / {LEVELS[selectedLevel].goals.silver.toLocaleString()} / {LEVELS[selectedLevel].goals.gold.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#ccff00]">Best {best.toLocaleString()}</div>
        </div>
        <div className="flex justify-center mt-3">
          <Button98 onClick={startRun} className="min-w-[160px] font-bold">START SKATING</Button98>
        </div>
      </div>
    </div>
  );
}

const TIER_COLOR: Record<GoalTier, string> = {
  none: '#333',
  bronze: '#cd7f32',
  silver: '#d8d8e0',
  gold: '#ffd700',
};

function LevelMedal({ tier }: { tier: GoalTier }) {
  const color = TIER_COLOR[tier];
  return (
    <span
      className="inline-flex items-center justify-center w-[15px] h-[15px] rounded-full text-[9px] font-black uppercase"
      title={`${tier} medal`}
      style={{ background: color, color: '#000', boxShadow: `0 0 6px ${color}` }}
    >
      {tier.charAt(0)}
    </span>
  );
}

function Medal({ on, color, label }: { on: boolean; color: string; label: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-[15px] h-[15px] rounded-full text-[9px] font-black"
      style={{
        background: on ? color : '#222',
        color: on ? '#000' : '#555',
        boxShadow: on ? `0 0 6px ${color}` : 'none',
      }}
    >
      {label}
    </span>
  );
}
