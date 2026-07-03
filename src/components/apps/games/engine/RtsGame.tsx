'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button98 } from '@/components/ui/Button98';
import { playSound } from '@/lib/sounds';
import { useSettings } from '@/contexts/SettingsContext';
import { useGameLoop } from './loop';
import {
  RtsConfig,
  RtsState,
  createRtsState,
  stepRts,
  trainWorker,
  trainSoldier,
  placeBuilding,
  commandUnits,
  unitsInRect,
  supplyUsed,
  advanceAge,
  Unit,
  Building,
} from './rts';

interface Props {
  config: RtsConfig;
  onExit: () => void;
}

type BuildMode = 'none' | 'depot' | 'prod';

interface Hud {
  resource: number;
  supplyUsed: number;
  supplyCap: number;
  wave: number;
  waveIn: number;
  status: RtsState['status'];
  selected: number;
  kills: number;
  advanced: boolean;
  log: string[];
}

export default function RtsGame({ config, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RtsState>(createRtsState(config));
  const selectedRef = useRef<Set<number>>(new Set());
  const buildRef = useRef<BuildMode>('none');
  const dragRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const hudAccum = useRef(0);
  const bestRef = useRef(0);
  const savedRef = useRef(false);
  const { getAppPref, setAppPref } = useSettings();

  const [buildMode, setBuildMode] = useState<BuildMode>('none');
  const [hud, setHud] = useState<Hud>({
    resource: config.startResource,
    supplyUsed: config.startWorkers,
    supplyCap: config.startSupply,
    wave: 0,
    waveIn: config.waveIntervalSec,
    status: 'playing',
    selected: 0,
    kills: 0,
    advanced: false,
    log: [`${config.baseName} online. Harvest ${config.resourceName.toLowerCase()} and build an army.`],
  });

  useEffect(() => {
    bestRef.current = getAppPref<number>(config.gameId, 'bestKills', 0);
  }, [getAppPref, config.gameId]);

  const syncHud = useCallback(() => {
    const s = stateRef.current;
    setHud({
      resource: Math.floor(s.resource),
      supplyUsed: supplyUsed(s),
      supplyCap: s.supplyCap,
      wave: s.waveNumber,
      waveIn: Math.ceil(s.waveTimer),
      status: s.status,
      selected: selectedRef.current.size,
      kills: s.kills,
      advanced: s.advanced,
      log: s.log.slice(),
    });
  }, []);

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * config.map.width,
      y: ((clientY - rect.top) / rect.height) * config.map.height,
    };
  }, [config.map.width, config.map.height]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // jsdom / no 2d context
    const s = stateRef.current;
    const { width: W, height: H } = config.map;

    ctx.fillStyle = config.colors.terrain;
    ctx.fillRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = config.colors.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // resource patches
    for (const p of s.patches) {
      if (p.amount <= 0) continue;
      const r = 8 + Math.min(10, p.amount / 120);
      ctx.fillStyle = config.colors.resource;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r);
      ctx.lineTo(p.x + r, p.y);
      ctx.lineTo(p.x, p.y + r);
      ctx.lineTo(p.x - r, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.stroke();
    }

    // buildings
    for (const b of s.buildings) {
      drawBuilding(ctx, b, config);
    }

    // units
    for (const u of s.units) {
      drawUnit(ctx, u, config, selectedRef.current.has(u.id));
    }

    // build ghost
    if (buildRef.current !== 'none' && dragRef.current === null) {
      // ghost follows via lastPointer stored on dragRef when moving — simplified: none
    }

    // selection rectangle
    const d = dragRef.current;
    if (d) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
    }
  }, [config]);

  useGameLoop(
    useCallback(
      (dt) => {
        const s = stateRef.current;
        if (s.status === 'playing') stepRts(s, dt);
        draw();
        hudAccum.current += dt;
        if (hudAccum.current >= 0.2 || s.status !== 'playing') {
          hudAccum.current = 0;
          syncHud();
        }
        if (s.status !== 'playing' && !savedRef.current) {
          savedRef.current = true;
          if (s.kills > bestRef.current) {
            bestRef.current = s.kills;
            setAppPref(config.gameId, 'bestKills', s.kills);
          }
          playSound(s.status === 'won' ? 'chord' : 'error');
        }
      },
      [draw, syncHud, setAppPref, config.gameId],
    ),
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const { x, y } = toCanvas(e.clientX, e.clientY);
      if (e.button === 2) {
        // right-click command
        commandUnits(stateRef.current, selectedRef.current, x, y);
        return;
      }
      if (buildRef.current !== 'none') {
        const ok = placeBuilding(stateRef.current, buildRef.current, x, y);
        playSound(ok ? 'ding' : 'error');
        buildRef.current = 'none';
        setBuildMode('none');
        syncHud();
        return;
      }
      dragRef.current = { x0: x, y0: y, x1: x, y1: y };
    },
    [toCanvas, syncHud],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!dragRef.current) return;
      const { x, y } = toCanvas(e.clientX, e.clientY);
      dragRef.current.x1 = x;
      dragRef.current.y1 = y;
    },
    [toCanvas],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      const moved = Math.abs(d.x1 - d.x0) > 4 || Math.abs(d.y1 - d.y0) > 4;
      const s = stateRef.current;
      let ids: number[];
      if (moved) {
        ids = unitsInRect(s, d.x0, d.y0, d.x1, d.y1);
      } else {
        // click select single nearest player unit
        const { x, y } = toCanvas(e.clientX, e.clientY);
        let best: Unit | null = null;
        let bestD = 16;
        for (const u of s.units) {
          if (u.owner !== 'player') continue;
          const dd = Math.hypot(u.x - x, u.y - y);
          if (dd < bestD) {
            bestD = dd;
            best = u;
          }
        }
        ids = best ? [best.id] : [];
      }
      selectedRef.current = new Set(ids);
      syncHud();
    },
    [toCanvas, syncHud],
  );

  const restart = useCallback(() => {
    stateRef.current = createRtsState(config);
    selectedRef.current = new Set();
    buildRef.current = 'none';
    savedRef.current = false;
    setBuildMode('none');
    syncHud();
  }, [config, syncHud]);

  const doTrain = (fn: (s: RtsState) => boolean) => {
    const ok = fn(stateRef.current);
    playSound(ok ? 'ding' : 'error');
    syncHud();
  };

  const enterBuild = (mode: BuildMode) => {
    buildRef.current = mode;
    setBuildMode(mode);
  };

  const cfg = config;
  const btnStyle = 'text-[11px] min-w-0 px-2 py-[3px] h-auto';

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] select-none">
      {/* HUD bar */}
      <div className="flex items-center gap-3 px-2 py-1 text-[11px] border-b border-[var(--win98-button-shadow)] flex-wrap">
        <span style={{ color: cfg.colors.resource === '#ffffff' ? '#333' : undefined }}>
          {cfg.resourceName}: <b>{hud.resource}</b>
        </span>
        <span>
          Supply: <b>{hud.supplyUsed}/{hud.supplyCap}</b>
        </span>
        <span>Kills: {hud.kills}</span>
        <span className={hud.waveIn <= 10 ? 'text-red-700 font-bold' : ''}>Next wave: {hud.waveIn}s</span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div className="relative flex-1 min-w-0 bg-black">
          <canvas
            ref={canvasRef}
            width={cfg.map.width}
            height={cfg.map.height}
            className="w-full h-full block touch-none"
            style={{ cursor: buildMode !== 'none' ? 'crosshair' : 'default', imageRendering: 'pixelated' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onContextMenu={(e) => e.preventDefault()}
          />
          {hud.status !== 'playing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center gap-3 p-4">
              <div
                className="text-[22px] font-bold"
                style={{ color: hud.status === 'won' ? cfg.colors.player : cfg.colors.enemy }}
              >
                {hud.status === 'won' ? 'VICTORY' : 'DEFEAT'}
              </div>
              <div className="text-white text-[12px] max-w-[280px]">
                {hud.status === 'won' ? cfg.winText : cfg.loseText}
              </div>
              <div className="text-white text-[11px]">Enemies destroyed: {hud.kills}</div>
              <div className="flex gap-2">
                <Button98 onClick={restart}>New Skirmish</Button98>
                <Button98 onClick={onExit}>Main Menu</Button98>
              </div>
            </div>
          )}
        </div>

        {/* Command panel */}
        <div className="w-[112px] flex-shrink-0 border-l border-[var(--win98-button-shadow)] p-1 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-center">COMMAND</div>
          <Button98 className={btnStyle} onClick={() => doTrain(trainWorker)}>
            {cfg.workerName} ({cfg.costs.worker})
          </Button98>
          <Button98 className={btnStyle} onClick={() => doTrain(trainSoldier)}>
            {cfg.soldierName} ({cfg.costs.soldier})
          </Button98>
          <Button98
            className={btnStyle}
            active={buildMode === 'depot'}
            onClick={() => enterBuild('depot')}
          >
            {cfg.depotName} ({cfg.costs.depot})
          </Button98>
          <Button98
            className={btnStyle}
            active={buildMode === 'prod'}
            onClick={() => enterBuild('prod')}
          >
            {cfg.prodName} ({cfg.costs.prod})
          </Button98>
          {cfg.advance && !hud.advanced && (
            <Button98 className={btnStyle} onClick={() => doTrain(advanceAge)}>
              {cfg.advance.label} ({cfg.advance.cost})
            </Button98>
          )}
          {cfg.advance && hud.advanced && (
            <div className="text-[9px] text-center text-green-700 font-bold">Feudal Age reached</div>
          )}
          <div className="text-[9px] text-center text-[var(--win98-disabled-text)] leading-tight mt-1">
            {buildMode !== 'none' ? 'Click map to place' : 'Drag-select units. Right-click to move/attack.'}
          </div>
          <div className="mt-auto text-[9px] leading-tight border-t border-[var(--win98-button-shadow)] pt-1 max-h-[120px] overflow-y-auto">
            {hud.log.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function drawBuilding(ctx: CanvasRenderingContext2D, b: Building, cfg: RtsConfig) {
  const color = b.owner === 'player' ? cfg.colors.player : cfg.colors.enemy;
  ctx.fillStyle = color;
  ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
  // inner detail
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(b.x - b.w / 4, b.y - b.h / 4, b.w / 2, b.h / 2);
  // label letter
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const letter = b.type === 'base' ? 'H' : b.type === 'depot' ? 'D' : 'B';
  ctx.fillText(letter, b.x, b.y);
  // hp bar
  drawHpBar(ctx, b.x, b.y - b.h / 2 - 6, b.w, b.hp / b.maxHp);
}

function drawUnit(ctx: CanvasRenderingContext2D, u: Unit, cfg: RtsConfig, selected: boolean) {
  const color = u.owner === 'player' ? cfg.colors.player : cfg.colors.enemy;
  const r = u.kind === 'worker' ? 5 : 6;
  if (selected) {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(u.x, u.y, r + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  if (u.kind === 'worker') {
    ctx.beginPath();
    ctx.arc(u.x, u.y, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(u.x - r, u.y - r, r * 2, r * 2);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(u.x - r, u.y - r, r * 2, r * 2);
  if (u.cargo > 0) {
    ctx.fillStyle = cfg.colors.resource;
    ctx.fillRect(u.x - 2, u.y - r - 4, 4, 3);
  }
  drawHpBar(ctx, u.x, u.y - r - 4, r * 2 + 2, u.hp / u.maxHp);
}

function drawHpBar(ctx: CanvasRenderingContext2D, cx: number, top: number, w: number, frac: number) {
  if (frac >= 0.999) return;
  const bw = w;
  ctx.fillStyle = '#400';
  ctx.fillRect(cx - bw / 2, top, bw, 2);
  ctx.fillStyle = frac > 0.5 ? '#2ecc40' : frac > 0.25 ? '#ffdc00' : '#ff4136';
  ctx.fillRect(cx - bw / 2, top, bw * Math.max(0, frac), 2);
}
