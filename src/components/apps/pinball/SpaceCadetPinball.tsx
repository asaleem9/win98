'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { Dialog98 } from '@/components/ui/Dialog98';
import { compileSprite, drawSprite } from '@/components/apps/games/engine/sprites';
import { useWindowActive } from '@/components/apps/games/engine/focusPause';
import { PINBALL_SPRITES } from '@/components/apps/games/engine/sprites/pinball';
import {
  BallState,
  Bumper,
  Segment,
  Vec2,
  collideBumper,
  collideSegment,
  stepBall,
} from './physics';
import {
  MissionState,
  createMissionState,
  resetMissionRun,
  lightLane,
  beginMission,
  recordHit,
  tickMission,
  failMission,
  acknowledgeMission,
  currentMission,
  rankFromMissions,
  lanesLitCount,
  missionProgressText,
  MissionEventType,
} from './missions';
import { PlayBall, scoreMultiplier, pushTrail } from './multiball';
import {
  LAUNCH_LANES,
  LANE_POINTS,
  SPINNER,
  SPINNER_POINTS,
  SPIN_COOLDOWN_MS,
  HYPERSPACE,
  HYPERSPACE_POINTS,
  HYPERSPACE_HOLD_MS,
  HYPERSPACE_EJECT,
  RAMP_LANE,
  RAMP_POINTS,
  RAMP_ASSIST,
  laneAt,
  overSpinner,
  inHyperspace,
} from './table';

const APP_ID = 'pinball';

// Internal render/physics resolution. The canvas is scaled to fill its
// container via CSS, and pointer math accounts for that scale factor.
const TABLE_WIDTH = 280;
const TABLE_HEIGHT = 460;
const FIELD_RIGHT = 254; // divider between the playfield and the plunger lane
const BALL_RADIUS = 6.5;
const FIXED_DT = 1 / 60;
const MAX_BALLS = 3;
const NUDGE_WINDOW_MS = 2200;
const NUDGE_LIMIT = 3;
const TILT_DURATION_MS = 3000;

const BUMPERS: Bumper[] = [
  { pos: { x: 95, y: 130 }, radius: 15, strength: 340 },
  { pos: { x: 175, y: 108 }, radius: 15, strength: 340 },
  { pos: { x: 132, y: 190 }, radius: 12, strength: 300 },
];
const BUMPER_POINTS = 250;

// Small standup targets across the middle of the table.
const TARGETS: Bumper[] = [90, 116, 142, 168, 194].map((x) => ({
  pos: { x, y: 258 },
  radius: 8,
  strength: 220,
}));
const TARGET_POINTS = [100, 200, 300, 200, 100];

const DIVIDER: Segment = { a: { x: FIELD_RIGHT, y: TABLE_HEIGHT }, b: { x: FIELD_RIGHT, y: 62 } };
const LANE_RAMP: Segment = { a: { x: FIELD_RIGHT, y: 62 }, b: { x: 178, y: 10 } };

const LEFT_SLING: Segment = { a: { x: 30, y: 392 }, b: { x: 64, y: 336 } };
const RIGHT_SLING: Segment = { a: { x: FIELD_RIGHT - 30, y: 392 }, b: { x: FIELD_RIGHT - 64, y: 336 } };
const SLING_POINTS = 60;

const LEFT_FLIPPER_PIVOT: Vec2 = { x: 82, y: 408 };
const RIGHT_FLIPPER_PIVOT: Vec2 = { x: FIELD_RIGHT - 82, y: 408 };
const FLIPPER_LENGTH = 46;
const FLIPPER_REST_DEG = 58;
const FLIPPER_UP_DEG = -28;
const FLIPPER_SPEED_DEG = 900; // degrees per second

const PLUNGER_X = (FIELD_RIGHT + TABLE_WIDTH) / 2;
const PLUNGER_REST_Y = 440;
const PLUNGER_MAX_PULL = 30;
const PLUNGER_CHARGE_RATE = 1 / 0.8; // full charge in 0.8s

// flashRef keys: bumpers 0..2, targets 100.., slings 200.., lanes 300.., ramp 400, kicker 500.
const KEY_LANE = 300;
const KEY_RAMP = 400;
const KEY_KICKER = 500;

interface FlipperState {
  angleDeg: number;
  held: boolean;
  pivot: Vec2;
  sign: 1 | -1; // -1 mirrors the geometry for the right flipper
}

interface Star {
  x: number;
  y: number;
  r: number;
  tw: number; // twinkle phase offset
}

// Deterministic starfield so the backdrop is stable across renders.
function makeStars(): Star[] {
  const stars: Star[] = [];
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 60; i++) {
    stars.push({ x: rnd() * TABLE_WIDTH, y: rnd() * TABLE_HEIGHT, r: rnd() < 0.15 ? 1.4 : 0.8, tw: rnd() * Math.PI * 2 });
  }
  return stars;
}

function flipperSegment(f: FlipperState): Segment {
  const rad = (f.angleDeg * Math.PI) / 180;
  const dir: Vec2 = { x: Math.cos(rad) * f.sign, y: Math.sin(rad) };
  return {
    a: f.pivot,
    b: { x: f.pivot.x + dir.x * FLIPPER_LENGTH, y: f.pivot.y + dir.y * FLIPPER_LENGTH },
  };
}

function degToRad(d: number) {
  return (d * Math.PI) / 180;
}

// 7-segment lookup, segment order [a, b, c, d, e, f, g].
const SEVEN_SEG: Record<string, number[]> = {
  '0': [1, 1, 1, 1, 1, 1, 0],
  '1': [0, 1, 1, 0, 0, 0, 0],
  '2': [1, 1, 0, 1, 1, 0, 1],
  '3': [1, 1, 1, 1, 0, 0, 1],
  '4': [0, 1, 1, 0, 0, 1, 1],
  '5': [1, 0, 1, 1, 0, 1, 1],
  '6': [1, 0, 1, 1, 1, 1, 1],
  '7': [1, 1, 1, 0, 0, 0, 0],
  '8': [1, 1, 1, 1, 1, 1, 1],
  '9': [1, 1, 1, 1, 0, 1, 1],
};

function drawSevenSegDigit(
  ctx: CanvasRenderingContext2D,
  ch: string,
  x: number,
  y: number,
  w: number,
  h: number,
  on: string,
  off: string,
) {
  const segs = SEVEN_SEG[ch] ?? [0, 0, 0, 0, 0, 0, 0];
  const t = Math.max(1, w * 0.16);
  const half = h / 2;
  const seg = (i: number, sx: number, sy: number, sw: number, sh: number) => {
    ctx.fillStyle = segs[i] ? on : off;
    ctx.fillRect(sx, sy, sw, sh);
  };
  seg(0, x + t, y, w - 2 * t, t); // a  top
  seg(1, x + w - t, y + t, t, half - t); // b  top-right
  seg(2, x + w - t, y + half, t, half - t); // c  bottom-right
  seg(3, x + t, y + h - t, w - 2 * t, t); // d  bottom
  seg(4, x, y + half, t, half - t); // e  bottom-left
  seg(5, x, y + t, t, half - t); // f  top-left
  seg(6, x + t, y + half - t / 2, w - 2 * t, t); // g  middle
}

function drawSevenSegNumber(
  ctx: CanvasRenderingContext2D,
  value: number,
  cx: number,
  y: number,
  digits: number,
  dh: number,
  on: string,
  off: string,
) {
  const text = String(Math.min(value, 10 ** digits - 1)).padStart(digits, '0');
  const dw = dh * 0.6;
  const gap = dw * 0.34;
  const total = digits * dw + (digits - 1) * gap;
  let dx = cx - total / 2;
  for (const ch of text) {
    drawSevenSegDigit(ctx, ch, dx, y, dw, dh, on, off);
    dx += dw + gap;
  }
}

const menuKeys = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

export default function SpaceCadetPinball({ windowId }: AppComponentProps) {
  const { getAppPref, setAppPref } = useSettings();
  const windowActive = useWindowActive(windowId);

  const [initialCompleted] = useState(() => getAppPref<number>(APP_ID, 'missionsCompleted', 0));

  const [score, setScore] = useState(0);
  const [balls, setBalls] = useState(MAX_BALLS);
  const [rank, setRank] = useState(() => rankFromMissions(initialCompleted));
  const [message, setMessage] = useState('Press F2 to start');
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tilted, setTilted] = useState(false);
  const [highScores, setHighScores] = useState<number[]>(() => getAppPref<number[]>(APP_ID, 'highScores', []));
  const [showAbout, setShowAbout] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);
  const [stars] = useState<Star[]>(makeStars);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- mutable game state, kept out of React so the render loop stays cheap ---
  const ballsRef = useRef<PlayBall[]>([]);
  const chargeRef = useRef(0);
  const chargingRef = useRef(false);
  const ballsLeftRef = useRef(MAX_BALLS);
  const scoreRef = useRef(0);
  const rankRef = useRef(rankFromMissions(initialCompleted));
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const tiltRef = useRef({ tilted: false, until: 0, nudgeTimes: [] as number[] });
  const flashRef = useRef<Map<number, number>>(new Map());
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missionRef = useRef<MissionState>({ ...createMissionState(), completed: initialCompleted });
  const spinnerRef = useRef({ phase: 0, speed: 0, lastPassAt: 0 });

  const leftFlipperRef = useRef<FlipperState>({
    angleDeg: FLIPPER_REST_DEG,
    held: false,
    pivot: LEFT_FLIPPER_PIVOT,
    sign: 1,
  });
  const rightFlipperRef = useRef<FlipperState>({
    angleDeg: 180 - FLIPPER_REST_DEG,
    held: false,
    pivot: RIGHT_FLIPPER_PIVOT,
    sign: -1,
  });

  const setStatusMessage = useCallback((text: string, holdMs?: number, fallback?: string) => {
    setMessage(text);
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    if (holdMs) {
      messageTimeoutRef.current = setTimeout(() => setMessage(fallback ?? text), holdMs);
    }
  }, []);

  const laneHint = useCallback(() => {
    const m = missionRef.current;
    return `Light 3 lanes to arm ${currentMission(m).name}`;
  }, []);

  const persistHighScore = useCallback(
    (finalScore: number) => {
      setHighScores((prev) => {
        const next = [...prev, finalScore].sort((a, b) => b - a).slice(0, 5);
        setAppPref(APP_ID, 'highScores', next);
        return next;
      });
    },
    [setAppPref],
  );

  const loadBallOnPlunger = useCallback(() => {
    ballsRef.current = [
      {
        state: { pos: { x: PLUNGER_X, y: PLUNGER_REST_Y }, vel: { x: 0, y: 0 }, radius: BALL_RADIUS },
        phase: 'onPlunger',
        captureUntil: 0,
        trail: [],
      },
    ];
    chargeRef.current = 0;
  }, []);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    ballsLeftRef.current = MAX_BALLS;
    tiltRef.current = { tilted: false, until: 0, nudgeTimes: [] };
    missionRef.current = resetMissionRun(missionRef.current);
    spinnerRef.current = { phase: 0, speed: 0, lastPassAt: 0 };
    flashRef.current.clear();
    const startRank = rankFromMissions(missionRef.current.completed);
    rankRef.current = startRank;
    setScore(0);
    setBalls(MAX_BALLS);
    setRank(startRank);
    setTilted(false);
    setRunning(true);
    setPaused(false);
    runningRef.current = true;
    pausedRef.current = false;
    loadBallOnPlunger();
    setStatusMessage('Launch the ball, then light the 3 top lanes', 3200, laneHint());
  }, [loadBallOnPlunger, setStatusMessage, laneHint]);

  // Live count of balls actually on the playfield (drives the x2 multiplier).
  const ballsInPlay = useCallback(() => ballsRef.current.filter((b) => b.phase !== 'onPlunger').length, []);

  const addScore = useCallback((points: number) => {
    scoreRef.current += points * scoreMultiplier(ballsInPlay());
    setScore(scoreRef.current);
  }, [ballsInPlay]);

  const onMissionCountChanged = useCallback(
    (completed: number) => {
      const newRank = rankFromMissions(completed);
      if (newRank !== rankRef.current) {
        rankRef.current = newRank;
        setRank(newRank);
        playSound('chord');
      }
      setAppPref(APP_ID, 'missionsCompleted', completed);
      setAppPref(APP_ID, 'rank', newRank);
    },
    [setAppPref],
  );

  const spawnMultiball = useCallback(() => {
    const balls = ballsRef.current;
    for (let i = 0; i < 2; i++) {
      balls.push({
        state: { pos: { x: 116 + i * 28, y: 74 }, vel: { x: i === 0 ? -70 : 70, y: 140 }, radius: BALL_RADIUS },
        phase: 'inPlay',
        captureUntil: 0,
        trail: [],
      });
    }
    playSound('ding');
    setStatusMessage('MULTIBALL! x2 scoring', 2400);
  }, [setStatusMessage]);

  // Feed a playfield hit into the active mission and cash out completions.
  const fireMissionEvent = useCallback(
    (type: MissionEventType, index?: number) => {
      const before = missionRef.current;
      if (before.phase !== 'active') return;
      const after = recordHit(before, { type, index });
      missionRef.current = after;
      if (after.phase === 'complete') {
        const def = currentMission(after);
        playSound('chord');
        addScore(def.reward);
        if (def.multiball) spawnMultiball();
        missionRef.current = acknowledgeMission(after);
        onMissionCountChanged(missionRef.current.completed);
        setStatusMessage(`MISSION COMPLETE: ${def.name}! +${def.reward.toLocaleString()}`, 2800, laneHint());
      }
    },
    [addScore, spawnMultiball, onMissionCountChanged, setStatusMessage, laneHint],
  );

  const armIfReady = useCallback(() => {
    if (missionRef.current.phase !== 'ready') return;
    const started = beginMission(missionRef.current);
    missionRef.current = started;
    const def = currentMission(started);
    playSound('exclamation');
    setStatusMessage(`MISSION: ${def.name} — ${def.blurb}`, 3200, def.name);
  }, [setStatusMessage]);

  const handleLifeLost = useCallback(() => {
    playSound('error');
    // draining mid-mission fails it (progress reset), but rank is preserved
    const m = missionRef.current;
    if (m.phase === 'active') {
      missionRef.current = acknowledgeMission(failMission(m));
    }
    ballsLeftRef.current -= 1;
    const left = ballsLeftRef.current;
    setBalls(left);
    if (left <= 0) {
      runningRef.current = false;
      setRunning(false);
      setStatusMessage('GAME OVER - Press F2 to start');
      if (scoreRef.current > 0) persistHighScore(scoreRef.current);
    } else {
      setStatusMessage(`Ball lost! ${left} ${left === 1 ? 'ball' : 'balls'} left`, 1600, 'Press SPACE to launch');
      loadBallOnPlunger();
    }
  }, [loadBallOnPlunger, persistHighScore, setStatusMessage]);

  const launchBall = useCallback(() => {
    const pb = ballsRef.current.find((b) => b.phase === 'onPlunger');
    if (!pb) return;
    const charge = chargeRef.current;
    pb.state = { ...pb.state, vel: { x: (Math.random() - 0.5) * 20, y: -(360 + 560 * charge) } };
    pb.phase = 'inPlay';
    chargeRef.current = 0;
    chargingRef.current = false;
    playSound('ding');
  }, []);

  const triggerNudge = useCallback(
    (dir: number) => {
      if (!runningRef.current || pausedRef.current) return;
      const tilt = tiltRef.current;
      const now = performance.now();
      if (tilt.tilted) return;
      ballsRef.current.forEach((b) => {
        if (b.phase === 'inPlay') {
          b.state = { ...b.state, vel: { x: b.state.vel.x + dir * 90, y: b.state.vel.y - 40 } };
        }
      });
      tilt.nudgeTimes = tilt.nudgeTimes.filter((t) => now - t < NUDGE_WINDOW_MS);
      tilt.nudgeTimes.push(now);
      if (tilt.nudgeTimes.length > NUDGE_LIMIT) {
        tilt.tilted = true;
        tilt.until = now + TILT_DURATION_MS;
        tilt.nudgeTimes = [];
        setTilted(true);
        playSound('error');
        setStatusMessage('TILT!', TILT_DURATION_MS, 'MISSION: Steady hands, Cadet');
      }
    },
    [setStatusMessage],
  );

  // --- input handling ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F2') {
        e.preventDefault();
        if (!runningRef.current) startGame();
        return;
      }
      if (menuKeys.has(e.code) || e.code === 'KeyZ' || e.code === 'Slash' || e.code === 'KeyX') {
        e.preventDefault();
      }
      if (!runningRef.current) return;
      const tiltActive = tiltRef.current.tilted;
      const onPlunger = ballsRef.current.some((b) => b.phase === 'onPlunger');
      if (e.code === 'Space') {
        if (onPlunger) chargingRef.current = true;
      } else if ((e.code === 'KeyZ' || e.code === 'ArrowLeft') && !tiltActive) {
        leftFlipperRef.current.held = true;
      } else if ((e.code === 'Slash' || e.code === 'ArrowRight') && !tiltActive) {
        rightFlipperRef.current.held = true;
      } else if (e.code === 'KeyX' && !e.repeat) {
        triggerNudge(Math.random() > 0.5 ? 1 : -1);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        chargingRef.current = false;
        launchBall();
      } else if (e.code === 'KeyZ' || e.code === 'ArrowLeft') {
        leftFlipperRef.current.held = false;
      } else if (e.code === 'Slash' || e.code === 'ArrowRight') {
        rightFlipperRef.current.held = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [startGame, launchBall, triggerNudge]);

  // Pause when another window covers this one or the tab is hidden. Resume stays
  // manual (the Game menu / Pause key) so a ball doesn't launch the instant the
  // window regains focus.
  useEffect(() => {
    if (windowActive) return;
    pausedRef.current = true;
    const timer = setTimeout(() => setPaused(true), 0);
    return () => clearTimeout(timer);
  }, [windowActive]);

  useEffect(
    () => () => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    },
    [],
  );

  // --- physics + render loop ---
  useEffect(() => {
    let rafId = 0;
    let last = performance.now();
    let acc = 0;

    const updateFlipper = (f: FlipperState, dt: number) => {
      const restAngle = f.sign === 1 ? FLIPPER_REST_DEG : 180 - FLIPPER_REST_DEG;
      const upAngle = f.sign === 1 ? FLIPPER_UP_DEG : 180 - FLIPPER_UP_DEG;
      const target = f.held && !tiltRef.current.tilted ? upAngle : restAngle;
      const step = FLIPPER_SPEED_DEG * dt;
      if (Math.abs(target - f.angleDeg) <= step) {
        f.angleDeg = target;
      } else {
        f.angleDeg += target > f.angleDeg ? step : -step;
      }
    };

    // Advance a single in-play ball through every collision object. Returns the
    // updated ball, or null if it drained. Scoring/mission side effects fire here.
    const stepPlayBall = (pb: PlayBall, dt: number, now: number): PlayBall | null => {
      // Captured in the hyperspace hole: hold, then kick it back into play.
      if (pb.phase === 'captured') {
        if (now >= pb.captureUntil) {
          addScore(HYPERSPACE_POINTS);
          fireMissionEvent('hyperspace');
          playSound('chord');
          flashRef.current.set(KEY_KICKER, now + 400);
          return { ...pb, phase: 'inPlay', captureUntil: 0, state: { ...pb.state, vel: { ...HYPERSPACE_EJECT } } };
        }
        return pb;
      }

      let ball: BallState = stepBall(pb.state, dt, { width: TABLE_WIDTH, height: TABLE_HEIGHT });

      // divider + lane ramp keep the ball out of the plunger lane once in play
      let res = collideSegment(ball, DIVIDER);
      if (res.hit) ball = { ...ball, pos: res.pos, vel: res.vel };
      res = collideSegment(ball, LANE_RAMP);
      if (res.hit) ball = { ...ball, pos: res.pos, vel: res.vel };

      BUMPERS.forEach((bumper, i) => {
        const r = collideBumper(ball, bumper);
        if (r.hit) {
          ball = { ...ball, pos: r.pos, vel: r.vel };
          flashRef.current.set(i, now + 180);
          addScore(BUMPER_POINTS);
          fireMissionEvent('bumper');
          playSound('ding');
        }
      });

      TARGETS.forEach((target, i) => {
        const r = collideBumper(ball, target);
        if (r.hit) {
          ball = { ...ball, pos: r.pos, vel: r.vel };
          flashRef.current.set(100 + i, now + 180);
          addScore(TARGET_POINTS[i]);
          fireMissionEvent('target');
          playSound('mineClick');
        }
      });

      [LEFT_SLING, RIGHT_SLING].forEach((sling, i) => {
        const r = collideSegment(ball, sling, 1.1);
        if (r.hit) {
          ball = { ...ball, pos: r.pos, vel: r.vel };
          flashRef.current.set(200 + i, now + 150);
          addScore(SLING_POINTS);
          fireMissionEvent('sling', i);
          playSound('mineClick');
        }
      });

      // Feed ramp: reflect, then add an upward kick so it climbs to the top.
      const ramp = collideSegment(ball, RAMP_LANE, 0.92);
      if (ramp.hit) {
        ball = { ...ball, pos: ramp.pos, vel: { x: ramp.vel.x, y: ramp.vel.y - RAMP_ASSIST } };
        flashRef.current.set(KEY_RAMP, now + 150);
        addScore(RAMP_POINTS);
        playSound('mineClick');
      }

      if (!tiltRef.current.tilted) {
        [leftFlipperRef.current, rightFlipperRef.current].forEach((f) => {
          const seg = flipperSegment(f);
          const r = collideSegment(ball, seg, 0.85);
          if (r.hit) {
            let vel = r.vel;
            if (f.held) {
              const rad = degToRad(f.angleDeg);
              const tangent: Vec2 = { x: -Math.sin(rad) * f.sign, y: Math.cos(rad) };
              const kick = 260;
              vel = { x: vel.x + tangent.x * kick * -f.sign, y: vel.y - Math.abs(kick * 0.6) };
            }
            ball = { ...ball, pos: r.pos, vel };
          }
        });
      }

      // Spinner: pass-through, no bounce — award per pass and whirl the blade.
      if (overSpinner(ball.pos) && now > spinnerRef.current.lastPassAt + SPIN_COOLDOWN_MS) {
        spinnerRef.current.lastPassAt = now;
        spinnerRef.current.speed = Math.min(28, spinnerRef.current.speed + 7);
        addScore(SPINNER_POINTS);
        fireMissionEvent('spinner');
        playSound('mineClick');
      }

      // Launch lanes: light one while idle to work toward arming a mission.
      const lane = laneAt(ball.pos);
      if (lane >= 0 && !missionRef.current.lanes[lane]) {
        const before = missionRef.current;
        const after = lightLane(before, lane);
        if (after !== before) {
          missionRef.current = after;
          flashRef.current.set(KEY_LANE + lane, now + 220);
          addScore(LANE_POINTS);
          playSound('ding');
          if (after.phase === 'ready') armIfReady();
        }
      }

      // Hyperspace hole: capture the ball for a beat before ejecting it.
      if (inHyperspace(ball.pos)) {
        flashRef.current.set(KEY_KICKER, now + HYPERSPACE_HOLD_MS + 400);
        return {
          ...pb,
          phase: 'captured',
          captureUntil: now + HYPERSPACE_HOLD_MS,
          state: { ...ball, pos: { ...HYPERSPACE.pos }, vel: { x: 0, y: 0 } },
          trail: pushTrail(pb.trail, ball.pos),
        };
      }

      if (ball.pos.y - ball.radius > TABLE_HEIGHT + 4) return null; // drained

      return { ...pb, state: ball, trail: pushTrail(pb.trail, ball.pos) };
    };

    const update = (dt: number) => {
      const now = performance.now();
      const tilt = tiltRef.current;
      if (tilt.tilted && now > tilt.until) {
        tilt.tilted = false;
        setTilted(false);
      }

      updateFlipper(leftFlipperRef.current, dt);
      updateFlipper(rightFlipperRef.current, dt);

      // spinner spin-down
      spinnerRef.current.speed = Math.max(0, spinnerRef.current.speed - dt * 9);
      spinnerRef.current.phase += spinnerRef.current.speed * dt;

      // mission countdown
      const m = missionRef.current;
      if (m.phase === 'active') {
        const ticked = tickMission(m, dt * 1000);
        missionRef.current = ticked;
        if (ticked.phase === 'failed') {
          missionRef.current = acknowledgeMission(ticked);
          playSound('error');
          setStatusMessage('MISSION FAILED - timed out', 2000, laneHint());
        }
      }

      const balls = ballsRef.current;
      if (balls.length === 0) return;

      const stepped: PlayBall[] = [];
      let drainedAny = false;
      for (const pb of balls) {
        if (pb.phase === 'onPlunger') {
          if (chargingRef.current) {
            chargeRef.current = Math.min(1, chargeRef.current + dt * PLUNGER_CHARGE_RATE);
          }
          stepped.push({
            ...pb,
            state: { ...pb.state, pos: { x: PLUNGER_X, y: PLUNGER_REST_Y + chargeRef.current * PLUNGER_MAX_PULL } },
          });
          continue;
        }
        const next = stepPlayBall(pb, dt, now);
        if (next) stepped.push(next);
        else drainedAny = true;
      }

      // stepPlayBall already dropped drained balls; a life is lost only when
      // that leaves the table empty (see reapDrained for the tested rule).
      ballsRef.current = stepped;
      if (drainedAny) {
        if (stepped.length === 0) handleLifeLost();
        else playSound('mineClick'); // a ball drained but multiball continues
      }
    };

    const drawTable = (ctx: CanvasRenderingContext2D) => {
      const now = performance.now();
      const t = now / 1000;
      ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
      const bg = ctx.createLinearGradient(0, 0, 0, TABLE_HEIGHT);
      bg.addColorStop(0, '#1a0044');
      bg.addColorStop(1, '#0a0018');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

      // starfield backdrop
      for (const s of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.tw);
        ctx.fillStyle = `rgba(210,220,255,${0.15 + tw * 0.5})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ghosted 7-seg score readout, sitting behind the upper playfield
      drawSevenSegNumber(ctx, scoreRef.current, TABLE_WIDTH / 2, 42, 7, 26, 'rgba(90,220,255,0.55)', 'rgba(70,110,150,0.10)');

      // playfield border
      ctx.strokeStyle = '#5522aa';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(1.5, TABLE_HEIGHT);
      ctx.lineTo(1.5, 40);
      ctx.quadraticCurveTo(1.5, 1.5, 40, 1.5);
      ctx.lineTo(150, 1.5);
      ctx.stroke();

      // lane divider + ramp
      ctx.strokeStyle = '#7733cc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(DIVIDER.a.x, DIVIDER.a.y);
      ctx.lineTo(DIVIDER.b.x, DIVIDER.b.y);
      ctx.lineTo(LANE_RAMP.b.x, LANE_RAMP.b.y);
      ctx.stroke();

      ctx.strokeStyle = '#663399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(TABLE_WIDTH - 1, TABLE_HEIGHT);
      ctx.lineTo(TABLE_WIDTH - 1, 0);
      ctx.stroke();

      // launch-lane guides + mission lights
      const armed = missionRef.current.phase === 'ready';
      const chaser = Math.floor(t * 8) % LAUNCH_LANES.length;
      const lightSprite = compileSprite(PINBALL_SPRITES.MISSION_LIGHT);
      LAUNCH_LANES.forEach((lane, i) => {
        ctx.strokeStyle = 'rgba(120,90,200,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lane.x, lane.y + 8);
        ctx.lineTo(lane.x, lane.y + 40);
        ctx.stroke();
        const lit = missionRef.current.lanes[i] || (armed && chaser === i);
        drawSprite(ctx, lightSprite, lane.x, lane.y, { frame: lit ? 1 : 0, scale: 1.4, anchor: 'center' });
      });

      // feed ramp guide
      const rampHot = now < (flashRef.current.get(KEY_RAMP) ?? 0);
      ctx.strokeStyle = rampHot ? '#ffffff' : '#33bbee';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(RAMP_LANE.a.x, RAMP_LANE.a.y);
      ctx.lineTo(RAMP_LANE.b.x, RAMP_LANE.b.y);
      ctx.stroke();

      // spinner
      const spinnerSprite = compileSprite(PINBALL_SPRITES.SPINNER);
      const spinFrame = ((Math.floor(spinnerRef.current.phase) % 4) + 4) % 4;
      const spinMid = { x: (SPINNER.a.x + SPINNER.b.x) / 2, y: (SPINNER.a.y + SPINNER.b.y) / 2 };
      ctx.strokeStyle = 'rgba(120,140,180,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(SPINNER.a.x, SPINNER.a.y);
      ctx.lineTo(SPINNER.b.x, SPINNER.b.y);
      ctx.stroke();
      drawSprite(ctx, spinnerSprite, spinMid.x, spinMid.y, { frame: spinFrame, scale: 1.6, anchor: 'center' });

      // hyperspace kicker
      const kickerSprite = compileSprite(PINBALL_SPRITES.KICKER);
      const kickerHot =
        now < (flashRef.current.get(KEY_KICKER) ?? 0) || ballsRef.current.some((b) => b.phase === 'captured');
      drawSprite(ctx, kickerSprite, HYPERSPACE.pos.x, HYPERSPACE.pos.y, {
        frame: kickerHot ? 1 : 0,
        scale: (2 * HYPERSPACE.radius) / kickerSprite.frameWidth + 0.2,
        anchor: 'center',
      });

      // bumpers (sprite caps that pop on a hit)
      const bumperSprite = compileSprite(PINBALL_SPRITES.BUMPER_CAP);
      BUMPERS.forEach((bumper, i) => {
        const flashUntil = flashRef.current.get(i) ?? 0;
        const lit = now < flashUntil;
        const pop = lit ? 1 + 0.3 * Math.max(0, (flashUntil - now) / 180) : 1;
        drawSprite(ctx, bumperSprite, bumper.pos.x, bumper.pos.y, {
          frame: lit ? 1 : 0,
          scale: ((2 * bumper.radius) / bumperSprite.frameWidth) * pop,
          anchor: 'center',
        });
      });

      // standup targets
      TARGETS.forEach((target, i) => {
        const flashUntil = flashRef.current.get(100 + i) ?? 0;
        const flashing = now < flashUntil;
        ctx.fillStyle = flashing ? '#ffffff' : '#330066';
        ctx.strokeStyle = '#cc66ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(target.pos.x - 8, target.pos.y - 10, 16, 20, 4);
        ctx.fill();
        ctx.stroke();
      });

      // slingshots
      [LEFT_SLING, RIGHT_SLING].forEach((sling, i) => {
        const flashUntil = flashRef.current.get(200 + i) ?? 0;
        const flashing = now < flashUntil;
        ctx.strokeStyle = flashing ? '#ffffff' : '#ffcc00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sling.a.x, sling.a.y);
        ctx.lineTo(sling.b.x, sling.b.y);
        ctx.stroke();
      });

      // flippers
      [leftFlipperRef.current, rightFlipperRef.current].forEach((f) => {
        const seg = flipperSegment(f);
        ctx.strokeStyle = '#8899bb';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(seg.a.x, seg.a.y);
        ctx.lineTo(seg.b.x, seg.b.y);
        ctx.stroke();
        ctx.strokeStyle = '#eef2ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(seg.a.x, seg.a.y);
        ctx.lineTo(seg.b.x, seg.b.y);
        ctx.stroke();
      });

      // plunger lane + plunger tip
      ctx.fillStyle = '#0d001a';
      ctx.fillRect(FIELD_RIGHT, 0, TABLE_WIDTH - FIELD_RIGHT, TABLE_HEIGHT);
      const chargeY = PLUNGER_REST_Y + chargeRef.current * PLUNGER_MAX_PULL;
      ctx.fillStyle = '#888';
      ctx.fillRect(PLUNGER_X - 4, chargeY + 8, 8, TABLE_HEIGHT - (chargeY + 8));
      ctx.fillStyle = chargingRef.current ? '#ffcc33' : '#cc3333';
      ctx.beginPath();
      ctx.arc(PLUNGER_X, chargeY, 6, 0, Math.PI * 2);
      ctx.fill();

      // ball trails + balls
      const multi = ballsRef.current.filter((b) => b.phase !== 'onPlunger').length > 1;
      ballsRef.current.forEach((pb) => {
        pb.trail.forEach((p, ti) => {
          const a = ((ti + 1) / (pb.trail.length + 1)) * 0.4;
          ctx.fillStyle = `rgba(180,200,255,${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, pb.state.radius * 0.7, 0, Math.PI * 2);
          ctx.fill();
        });
        const ball = pb.state;
        const grad = ctx.createRadialGradient(ball.pos.x - 2, ball.pos.y - 2, 0.5, ball.pos.x, ball.pos.y, ball.radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, multi ? '#aab0ff' : '#9999aa');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // mission HUD strip along the bottom edge of the playfield
      drawMissionHud(ctx);

      if (tiltRef.current.tilted) {
        const pulse = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 20));
        ctx.fillStyle = `rgba(255,0,0,${pulse})`;
        ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
        ctx.fillStyle = '#ff5555';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TILT', TABLE_WIDTH / 2, TABLE_HEIGHT / 2);
        ctx.textAlign = 'left';
      }
    };

    const drawMissionHud = (ctx: CanvasRenderingContext2D) => {
      const m = missionRef.current;
      const def = currentMission(m);
      ctx.fillStyle = 'rgba(5,0,15,0.72)';
      ctx.fillRect(4, TABLE_HEIGHT - 30, FIELD_RIGHT - 8, 26);
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      if (m.phase === 'active') {
        ctx.fillStyle = '#ffcc44';
        ctx.fillText(`${def.name}: ${def.blurb}`, 9, TABLE_HEIGHT - 18);
        ctx.fillStyle = '#66e0ff';
        ctx.fillText(missionProgressText(m), 9, TABLE_HEIGHT - 8);
        // time bar
        const frac = Math.max(0, m.timeLeftMs / def.timeLimitMs);
        const barX = 120;
        const barW = FIELD_RIGHT - barX - 12;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(barX, TABLE_HEIGHT - 13, barW, 6);
        ctx.fillStyle = frac < 0.3 ? '#ff4444' : '#44ff88';
        ctx.fillRect(barX, TABLE_HEIGHT - 13, barW * frac, 6);
      } else {
        const lit = lanesLitCount(m);
        ctx.fillStyle = '#8899cc';
        ctx.fillText(`NEXT: ${def.name}`, 9, TABLE_HEIGHT - 18);
        ctx.fillStyle = m.phase === 'ready' ? '#ffdd44' : '#66aa88';
        ctx.fillText(m.phase === 'ready' ? 'LANES ARMED - launch to start' : `Light lanes  ${lit}/3`, 9, TABLE_HEIGHT - 8);
      }
    };

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (pausedRef.current || !runningRef.current) {
        last = now;
        if (ctx) drawTable(ctx);
        return;
      }

      let delta = (now - last) / 1000;
      last = now;
      if (delta > 0.25) delta = 0.25;
      acc += delta;
      while (acc >= FIXED_DT) {
        update(FIXED_DT);
        acc -= FIXED_DT;
      }
      if (ctx) drawTable(ctx);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [addScore, handleLifeLost, fireMissionEvent, armIfReady, setStatusMessage, laneHint, stars]);

  const togglePause = useCallback(() => {
    if (!runningRef.current) return;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);

  const menus: MenuDefinition[] = [
    {
      label: 'Game',
      items: [
        { label: 'New Game', shortcut: 'F2', onClick: startGame },
        { label: paused ? 'Resume' : 'Pause', onClick: togglePause, disabled: !running },
        { separator: true, label: '' },
        { label: 'High Scores...', onClick: () => setShowHighScores(true) },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'About Space Cadet Pinball...', onClick: () => setShowAbout(true) }],
    },
  ];

  const bestScore = highScores[0] ?? 0;

  // pointer-driven plunger charging, mirrors the Space key
  const beginPointerCharge = useCallback(() => {
    if (!runningRef.current || !ballsRef.current.some((b) => b.phase === 'onPlunger')) return;
    chargingRef.current = true;
  }, []);
  const endPointerCharge = useCallback(() => {
    if (!chargingRef.current) return;
    chargingRef.current = false;
    launchBall();
  }, [launchBall]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#1a0033] select-none overflow-hidden font-[family-name:var(--win98-font)]"
      tabIndex={0}
    >
      <MenuBar menus={menus} />

      {/* Score header */}
      <div className="flex justify-between items-center px-3 py-1 bg-[#0d001a] border-b border-[#330066] text-[11px]">
        <div className="flex gap-4">
          <div>
            <span className="text-[#666] mr-1">1UP</span>
            <span className="text-[#ff3333] font-[family-name:monospace] text-[13px]">
              {String(score).padStart(9, '0')}
            </span>
          </div>
          <div>
            <span className="text-[#666] mr-1">HI</span>
            <span className="text-[#33ccff] font-[family-name:monospace] text-[13px]">
              {String(Math.max(bestScore, score)).padStart(9, '0')}
            </span>
          </div>
        </div>
        <div>
          <span className="text-[#666] mr-1">BALLS</span>
          <span className="text-[#ffff33] font-[family-name:monospace] text-[13px]">{balls}</span>
        </div>
      </div>

      {/* Pinball table */}
      <div className="flex-1 relative mx-2 my-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={TABLE_WIDTH}
          height={TABLE_HEIGHT}
          className="absolute inset-0 w-full h-full rounded-t-[20px]"
          onMouseDown={beginPointerCharge}
          onMouseUp={endPointerCharge}
          onMouseLeave={endPointerCharge}
        />
        {!running && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-[13px] text-[#ff9933] font-[family-name:monospace]">
              {balls <= 0 ? 'GAME OVER' : 'Press F2 to start'}
            </span>
          </div>
        )}
        {paused && running && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 cursor-pointer"
            onClick={togglePause}
          >
            <span className="text-[13px] text-white font-[family-name:monospace]">PAUSED</span>
            <span className="text-[10px] text-white/80 font-[family-name:monospace]">click to resume</span>
          </div>
        )}
      </div>

      {/* Message / mission bar */}
      <div className="h-[22px] flex items-center justify-between px-2 bg-[#0d001a] border-t border-[#330066]">
        <span className={`text-[11px] font-[family-name:monospace] ${tilted ? 'text-[#ff3333]' : 'text-[#ff9933]'}`}>
          {message}
        </span>
        <span className="text-[10px] text-[#9966cc]">RANK: {rank}</span>
      </div>

      {showAbout && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
          <Dialog98
            title="About Space Cadet Pinball"
            icon="info"
            message={
              <div className="text-[11px] max-w-[240px] space-y-1">
                <p>3D Pinball for Windows - Space Cadet</p>
                <p>
                  Light the three top lanes to arm a mission, then complete timed objectives to earn promotions all the
                  way to Fleet Admiral. Clear the Hyperspace Chase for MULTIBALL.
                </p>
                <p className="text-[#666]">Z / Left flipper, / or Right Arrow flipper, Space to launch, X to nudge.</p>
              </div>
            }
            buttons={[{ label: 'OK', onClick: () => setShowAbout(false), default: true }]}
          />
        </div>
      )}

      {showHighScores && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
          <Dialog98
            title="High Scores"
            icon="info"
            message={
              <div className="text-[11px] min-w-[160px]">
                {highScores.length === 0 ? (
                  <p>No high scores yet - launch a ball!</p>
                ) : (
                  <ol className="list-decimal list-inside space-y-0.5">
                    {highScores.map((s, i) => (
                      <li key={i} className="font-[family-name:monospace]">
                        {String(s).padStart(9, '0')}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            }
            buttons={[{ label: 'OK', onClick: () => setShowHighScores(false), default: true }]}
          />
        </div>
      )}
    </div>
  );
}
