'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { Dialog98 } from '@/components/ui/Dialog98';
import {
  BallState,
  Bumper,
  Segment,
  Vec2,
  collideBumper,
  collideSegment,
  rankFromScore,
  stepBall,
} from './physics';

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

type BallPhase = 'idle' | 'onPlunger' | 'inPlay';

interface FlipperState {
  angleDeg: number;
  held: boolean;
  pivot: Vec2;
  sign: 1 | -1; // -1 mirrors the geometry for the right flipper
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

const menuKeys = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

export default function SpaceCadetPinball({ windowId }: AppComponentProps) {
  const { getAppPref, setAppPref } = useSettings();

  const [score, setScore] = useState(0);
  const [balls, setBalls] = useState(MAX_BALLS);
  const [rank, setRank] = useState('Cadet');
  const [message, setMessage] = useState('Press F2 to start');
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tilted, setTilted] = useState(false);
  const [highScores, setHighScores] = useState<number[]>(() => getAppPref<number[]>(APP_ID, 'highScores', []));
  const [showAbout, setShowAbout] = useState(false);
  const [showHighScores, setShowHighScores] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- mutable game state, kept out of React so the render loop stays cheap ---
  const ballRef = useRef<BallState | null>(null);
  const phaseRef = useRef<BallPhase>('idle');
  const chargeRef = useRef(0);
  const chargingRef = useRef(false);
  const ballsLeftRef = useRef(MAX_BALLS);
  const scoreRef = useRef(0);
  const rankRef = useRef('Cadet');
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const tiltRef = useRef({ tilted: false, until: 0, nudgeTimes: [] as number[] });
  const flashRef = useRef<Map<number, number>>(new Map());
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    ballRef.current = {
      pos: { x: PLUNGER_X, y: PLUNGER_REST_Y },
      vel: { x: 0, y: 0 },
      radius: BALL_RADIUS,
    };
    phaseRef.current = 'onPlunger';
    chargeRef.current = 0;
  }, []);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    ballsLeftRef.current = MAX_BALLS;
    rankRef.current = 'Cadet';
    tiltRef.current = { tilted: false, until: 0, nudgeTimes: [] };
    setScore(0);
    setBalls(MAX_BALLS);
    setRank('Cadet');
    setTilted(false);
    setRunning(true);
    setPaused(false);
    runningRef.current = true;
    pausedRef.current = false;
    loadBallOnPlunger();
    setStatusMessage('MISSION 1: Launch Training');
  }, [loadBallOnPlunger, setStatusMessage]);

  const addScore = useCallback(
    (points: number) => {
      scoreRef.current += points;
      const next = scoreRef.current;
      setScore(next);
      const newRank = rankFromScore(next);
      if (newRank !== rankRef.current) {
        rankRef.current = newRank;
        setRank(newRank);
        playSound('chord');
        setStatusMessage(`RANK UP: ${newRank}!`, 2200, `MISSION: Reach ${newRank}+`);
      }
    },
    [setStatusMessage],
  );

  const handleDrain = useCallback(() => {
    ballRef.current = null;
    phaseRef.current = 'idle';
    playSound('error');
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
    const ball = ballRef.current;
    if (!ball || phaseRef.current !== 'onPlunger') return;
    const charge = chargeRef.current;
    ball.vel = { x: (Math.random() - 0.5) * 20, y: -(360 + 560 * charge) };
    phaseRef.current = 'inPlay';
    chargeRef.current = 0;
    chargingRef.current = false;
    playSound('ding');
  }, []);

  const triggerNudge = useCallback((dir: number) => {
    if (!runningRef.current || pausedRef.current) return;
    const ball = ballRef.current;
    const tilt = tiltRef.current;
    const now = performance.now();
    if (tilt.tilted) return;
    if (ball && phaseRef.current === 'inPlay') {
      ball.vel = { x: ball.vel.x + dir * 90, y: ball.vel.y - 40 };
    }
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
  }, [setStatusMessage]);

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
      if (e.code === 'Space') {
        if (phaseRef.current === 'onPlunger') chargingRef.current = true;
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

  // pause when the tab/window is hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        pausedRef.current = true;
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => () => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
  }, []);

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

    const update = (dt: number) => {
      const tilt = tiltRef.current;
      if (tilt.tilted && performance.now() > tilt.until) {
        tilt.tilted = false;
        setTilted(false);
      }

      updateFlipper(leftFlipperRef.current, dt);
      updateFlipper(rightFlipperRef.current, dt);

      if (phaseRef.current === 'onPlunger') {
        if (chargingRef.current) {
          chargeRef.current = Math.min(1, chargeRef.current + dt * PLUNGER_CHARGE_RATE);
        }
        const ball = ballRef.current;
        if (ball) {
          ball.pos = { x: PLUNGER_X, y: PLUNGER_REST_Y + chargeRef.current * PLUNGER_MAX_PULL };
        }
        return;
      }

      if (phaseRef.current !== 'inPlay' || !ballRef.current) return;
      let ball = stepBall(ballRef.current, dt, { width: TABLE_WIDTH, height: TABLE_HEIGHT });

      // divider + lane ramp keep the ball out of the plunger lane once in play
      let res = collideSegment(ball, DIVIDER);
      if (res.hit) ball = { ...ball, pos: res.pos, vel: res.vel };
      res = collideSegment(ball, LANE_RAMP);
      if (res.hit) ball = { ...ball, pos: res.pos, vel: res.vel };

      BUMPERS.forEach((bumper, i) => {
        const r = collideBumper(ball, bumper);
        if (r.hit) {
          ball = { ...ball, pos: r.pos, vel: r.vel };
          flashRef.current.set(i, performance.now() + 180);
          addScore(BUMPER_POINTS);
          playSound('ding');
        }
      });

      TARGETS.forEach((target, i) => {
        const r = collideBumper(ball, target);
        if (r.hit) {
          ball = { ...ball, pos: r.pos, vel: r.vel };
          flashRef.current.set(100 + i, performance.now() + 180);
          addScore(TARGET_POINTS[i]);
          playSound('mineClick');
        }
      });

      [LEFT_SLING, RIGHT_SLING].forEach((sling, i) => {
        const r = collideSegment(ball, sling, 1.1);
        if (r.hit) {
          ball = { ...ball, pos: r.pos, vel: r.vel };
          flashRef.current.set(200 + i, performance.now() + 150);
          addScore(SLING_POINTS);
          playSound('mineClick');
        }
      });

      if (!tilt.tilted) {
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

      ballRef.current = ball;

      if (ball.pos.y - ball.radius > TABLE_HEIGHT + 4) {
        handleDrain();
      }
    };

    const drawTable = (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
      const bg = ctx.createLinearGradient(0, 0, 0, TABLE_HEIGHT);
      bg.addColorStop(0, '#1a0044');
      bg.addColorStop(1, '#0a0018');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

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

      // bumpers
      BUMPERS.forEach((bumper, i) => {
        const flashUntil = flashRef.current.get(i) ?? 0;
        const flashing = performance.now() < flashUntil;
        const grad = ctx.createRadialGradient(
          bumper.pos.x - bumper.radius * 0.3,
          bumper.pos.y - bumper.radius * 0.3,
          2,
          bumper.pos.x,
          bumper.pos.y,
          bumper.radius,
        );
        if (flashing) {
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(1, '#ffdd33');
        } else {
          grad.addColorStop(0, '#ff8855');
          grad.addColorStop(1, '#cc2200');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bumper.pos.x, bumper.pos.y, bumper.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = flashing ? '#fff' : '#ff9966';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // standup targets
      TARGETS.forEach((target, i) => {
        const flashUntil = flashRef.current.get(100 + i) ?? 0;
        const flashing = performance.now() < flashUntil;
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
        const flashing = performance.now() < flashUntil;
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
        ctx.strokeStyle = '#dddddd';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
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

      // ball
      const ball = ballRef.current;
      if (ball) {
        const grad = ctx.createRadialGradient(
          ball.pos.x - 2,
          ball.pos.y - 2,
          0.5,
          ball.pos.x,
          ball.pos.y,
          ball.radius,
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(1, '#9999aa');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (tiltRef.current.tilted) {
        ctx.fillStyle = 'rgba(255,0,0,0.15)';
        ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
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
  }, [addScore, handleDrain]);

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
    if (!runningRef.current || phaseRef.current !== 'onPlunger') return;
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-[13px] text-white font-[family-name:monospace]">PAUSED</span>
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
                <p>Launch the ball, work the flippers, and climb the ranks from Cadet to Fleet Admiral.</p>
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
