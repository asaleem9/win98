'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button98 } from '@/components/ui/Button98';
import { playSound } from '@/lib/sounds';
import { useSettings } from '@/contexts/SettingsContext';
import { useGameLoop } from './loop';
import {
  compileSprite,
  drawSprite,
  animFrame,
  FACTIONS,
  type FactionName,
} from './sprites';
import {
  MUZZLE_FLASH,
  PROJECTILE,
  CORPSE,
  RUBBLE,
  CARGO_CHIP,
  SCAFFOLD,
  EXPLOSION,
  SHADOW_BLOB,
  SELECTION_RING,
} from './sprites/rts-common';
import {
  RtsConfig,
  RtsState,
  Unit,
  Building,
  Effect,
  CommandOption,
  createRtsState,
  stepRts,
  trainUnit,
  placeBuilding,
  startResearch,
  fireSuperweapon,
  canPlaceAt,
  commandUnits,
  unitsInRect,
  supplyUsed,
  getCommandOptions,
  buildProgress,
  isVisible,
  formatCost,
  superReady,
} from './rts';

interface Props {
  config: RtsConfig;
  onExit: () => void;
}

interface Hud {
  resources: Record<string, number>;
  supplyUsed: number;
  supplyCap: number;
  status: RtsState['status'];
  selected: number;
  kills: number;
  options: CommandOption[];
  log: string[];
}

const FOG_TILE = 20;

function factionFor(config: RtsConfig, owner: 'player' | 'enemy'): FactionName {
  return config.factions?.[owner] ?? (owner === 'player' ? 'blue' : 'red');
}

export default function RtsGame({ config, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RtsState>(createRtsState(config));
  const selectedRef = useRef<Set<number>>(new Set());
  const buildRef = useRef<string | null>(null);
  const superRef = useRef(false);
  const dragRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hudAccum = useRef(0);
  const bestRef = useRef(0);
  const savedRef = useRef(false);
  const { getAppPref, setAppPref } = useSettings();

  const [mode, setMode] = useState<{ build: string | null; sup: boolean }>({ build: null, sup: false });
  const [hud, setHud] = useState<Hud>(() => ({
    resources: { ...config.startResources },
    supplyUsed: config.startUnits.reduce((n, e) => n + e.count, 0),
    supplyCap: config.startSupply,
    status: 'playing',
    selected: 0,
    kills: 0,
    options: [],
    log: [],
  }));

  useEffect(() => {
    bestRef.current = getAppPref<number>(config.gameId, 'bestKills', 0);
  }, [getAppPref, config.gameId]);

  const syncHud = useCallback(() => {
    const s = stateRef.current;
    const resources: Record<string, number> = {};
    for (const r of config.resources) resources[r.id] = Math.floor(s.resources[r.id] ?? 0);
    setHud({
      resources,
      supplyUsed: supplyUsed(s),
      supplyCap: s.supplyCap,
      status: s.status,
      selected: selectedRef.current.size,
      kills: s.kills,
      options: getCommandOptions(s),
      log: s.log.slice(),
    });
  }, [config.resources]);

  // Populate the panel/log from the freshly created state once mounted (reading
  // the state ref during render is disallowed, so seed it from an effect).
  useEffect(() => {
    syncHud();
  }, [syncHud]);

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * config.map.width,
        y: ((clientY - rect.top) / rect.height) * config.map.height,
      };
    },
    [config.map.width, config.map.height],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // jsdom / no 2d context
    const s = stateRef.current;
    const { width: W, height: H } = config.map;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = config.colors.terrain;
    ctx.fillRect(0, 0, W, H);
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
      const def = config.resources.find((r) => r.id === p.resourceId);
      const r = 8 + Math.min(10, p.amount / 120);
      ctx.fillStyle = def?.color ?? '#4fd6e0';
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

    // ground-level effects first (corpses / rubble sit under the living)
    for (const e of s.effects) {
      if (e.kind === 'corpse' || e.kind === 'rubble') drawEffect(ctx, e);
    }

    // buildings
    for (const b of s.buildings) {
      if (b.owner === 'enemy' && !isVisible(s, b.x, b.y)) continue;
      drawBuilding(ctx, s, b, config);
    }

    // units
    for (const u of s.units) {
      if (u.owner === 'enemy' && !isVisible(s, u.x, u.y)) continue;
      drawUnit(ctx, u, config, selectedRef.current.has(u.id), s.time);
    }

    // airborne effects (muzzle / projectile / explosion / strike)
    for (const e of s.effects) {
      if (e.kind !== 'corpse' && e.kind !== 'rubble') drawEffect(ctx, e);
    }

    // fog of war overlay
    if (s.fogEnabled) {
      for (let r = 0; r < s.fogRows; r++) {
        for (let c = 0; c < s.fogCols; c++) {
          const v = s.fog[r * s.fogCols + c];
          if (v === 2) continue;
          ctx.fillStyle = v === 0 ? '#000' : 'rgba(0,0,0,0.5)';
          ctx.fillRect(c * FOG_TILE, r * FOG_TILE, FOG_TILE, FOG_TILE);
        }
      }
    }

    // placement ghost
    if (buildRef.current) {
      const def = config.buildingTypes[buildRef.current];
      const size = def?.size ?? { w: 34, h: 34 };
      const { x, y } = pointerRef.current;
      const ok = canPlaceAt(s, buildRef.current, x, y);
      ctx.fillStyle = ok ? 'rgba(80,220,90,0.35)' : 'rgba(230,60,50,0.35)';
      ctx.strokeStyle = ok ? '#3ec850' : '#e63c32';
      ctx.lineWidth = 2;
      ctx.fillRect(x - size.w / 2, y - size.h / 2, size.w, size.h);
      ctx.strokeRect(x - size.w / 2, y - size.h / 2, size.w, size.h);
    }

    // superweapon target ring
    if (superRef.current && config.superweapon) {
      const { x, y } = pointerRef.current;
      ctx.strokeStyle = config.superweapon.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, config.superweapon.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x + 8, y);
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y + 8);
      ctx.stroke();
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
      pointerRef.current = { x, y };
      if (e.button === 2) {
        commandUnits(stateRef.current, selectedRef.current, x, y);
        return;
      }
      if (superRef.current) {
        const ok = fireSuperweapon(stateRef.current, x, y);
        playSound(ok ? 'mineExplosion' : 'error');
        superRef.current = false;
        setMode({ build: null, sup: false });
        syncHud();
        return;
      }
      if (buildRef.current) {
        const ok = placeBuilding(stateRef.current, buildRef.current, x, y);
        playSound(ok ? 'ding' : 'error');
        buildRef.current = null;
        setMode({ build: null, sup: false });
        syncHud();
        return;
      }
      dragRef.current = { x0: x, y0: y, x1: x, y1: y };
    },
    [toCanvas, syncHud],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const { x, y } = toCanvas(e.clientX, e.clientY);
      pointerRef.current = { x, y };
      if (dragRef.current) {
        dragRef.current.x1 = x;
        dragRef.current.y1 = y;
      }
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
    buildRef.current = null;
    superRef.current = false;
    savedRef.current = false;
    setMode({ build: null, sup: false });
    syncHud();
  }, [config, syncHud]);

  const onCommand = useCallback(
    (opt: CommandOption) => {
      const s = stateRef.current;
      if (opt.kind === 'train') {
        const ok = trainUnit(s, opt.id);
        playSound(ok ? 'ding' : 'error');
        syncHud();
      } else if (opt.kind === 'research') {
        const ok = startResearch(s, opt.id);
        playSound(ok ? 'ding' : 'error');
        syncHud();
      } else if (opt.kind === 'build') {
        buildRef.current = opt.id;
        superRef.current = false;
        setMode({ build: opt.id, sup: false });
      } else if (opt.kind === 'super') {
        if (superReady(s)) {
          superRef.current = true;
          buildRef.current = null;
          setMode({ build: null, sup: true });
        } else {
          playSound('error');
        }
      }
    },
    [syncHud],
  );

  const cfg = config;
  const btnStyle = 'text-[11px] min-w-0 px-2 py-[3px] h-auto justify-start text-left';
  const kindLabel: Record<CommandOption['kind'], string> = {
    train: 'Train',
    build: 'Build',
    research: 'Research',
    super: '',
  };
  const hint = useMemo(() => {
    if (mode.sup) return 'Click a target on the map';
    if (mode.build) return 'Click map to place';
    return 'Drag-select units. Right-click to move/attack.';
  }, [mode]);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] select-none">
      {/* HUD bar */}
      <div className="flex items-center gap-3 px-2 py-1 text-[11px] border-b border-[var(--win98-button-shadow)] flex-wrap">
        {cfg.resources.map((r) => (
          <span key={r.id} className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: r.color }} />
            {r.name}: <b>{hud.resources[r.id] ?? 0}</b>
          </span>
        ))}
        <span>
          Supply: <b>{hud.supplyUsed}/{hud.supplyCap}</b>
        </span>
        <span>Kills: {hud.kills}</span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Map */}
        <div className="relative flex-1 min-w-0 bg-black">
          <canvas
            ref={canvasRef}
            width={cfg.map.width}
            height={cfg.map.height}
            className="w-full h-full block touch-none"
            style={{ cursor: mode.build || mode.sup ? 'crosshair' : 'default', imageRendering: 'pixelated' }}
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
        <div className="w-[124px] flex-shrink-0 border-l border-[var(--win98-button-shadow)] p-1 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-center">COMMAND</div>
          {hud.options.map((opt) => {
            const prefix = kindLabel[opt.kind];
            const costText = opt.kind === 'super' ? '' : ` (${formatCost(cfg, opt.cost)})`;
            const label = `${prefix ? prefix + ' ' : ''}${opt.name}${costText}`;
            return (
              <Button98
                key={`${opt.kind}:${opt.id}`}
                className={btnStyle}
                disabled={!opt.enabled}
                active={opt.kind === 'build' ? mode.build === opt.id : opt.kind === 'super' ? mode.sup : false}
                title={opt.reason ?? label}
                onClick={() => onCommand(opt)}
              >
                {label}
              </Button98>
            );
          })}
          <div className="text-[9px] text-center text-[var(--win98-disabled-text)] leading-tight mt-1">{hint}</div>
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

function drawBuilding(ctx: CanvasRenderingContext2D, state: RtsState, b: Building, cfg: RtsConfig) {
  const def = cfg.buildingTypes[b.typeId];
  const progress = buildProgress(state, b);

  if (def?.sprite) {
    const sprite = compileSprite(def.sprite, { recolor: FACTIONS[factionFor(cfg, b.owner)] });
    drawSprite(ctx, sprite, b.x, b.y + b.h / 2, { anchor: 'bottom-center' });
  } else {
    const color = b.owner === 'player' ? cfg.colors.player : cfg.colors.enemy;
    ctx.fillStyle = color;
    ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(b.x - b.w / 4, b.y - b.h / 4, b.w / 2, b.h / 2);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((def?.name ?? '?').charAt(0).toUpperCase(), b.x, b.y);
  }

  // construction scaffold overlay
  if (progress < 1) {
    const scaffold = compileSprite(SCAFFOLD);
    const scale = Math.max(1, Math.min(b.w, b.h) / 16);
    drawSprite(ctx, scaffold, b.x, b.y, { anchor: 'center', frame: progress < 0.5 ? 0 : 1, scale });
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(b.x - b.w / 2, b.y + b.h / 2 + 2, b.w * (1 - progress), 2);
  }

  drawHpBar(ctx, b.x, b.y - b.h / 2 - 6, b.w, b.hp / b.maxHp);
}

function drawUnit(ctx: CanvasRenderingContext2D, u: Unit, cfg: RtsConfig, selected: boolean, time: number) {
  const def = cfg.unitTypes[u.typeId];
  const r = u.role === 'worker' ? 5 : 6;

  const shadow = compileSprite(SHADOW_BLOB);
  drawSprite(ctx, shadow, u.x, u.y + r + 2, { anchor: 'center' });

  if (selected) {
    const ring = compileSprite(SELECTION_RING);
    drawSprite(ctx, ring, u.x, u.y + r + 2, { anchor: 'center' });
  }

  if (def?.sprite) {
    const sprite = compileSprite(def.sprite, { recolor: FACTIONS[factionFor(cfg, u.owner)] });
    const frame = animFrame(time, 6, sprite.frameCount);
    drawSprite(ctx, sprite, u.x, u.y + r, { anchor: 'bottom-center', frame });
  } else {
    const color = u.owner === 'player' ? cfg.colors.player : cfg.colors.enemy;
    ctx.fillStyle = color;
    if (u.role === 'worker') {
      ctx.beginPath();
      ctx.arc(u.x, u.y, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(u.x - r, u.y - r, r * 2, r * 2);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(u.x - r, u.y - r, r * 2, r * 2);
  }

  if (u.cargo > 0) {
    const chip = compileSprite(CARGO_CHIP);
    drawSprite(ctx, chip, u.x, u.y - r - 2, { anchor: 'center' });
  }

  drawHpBar(ctx, u.x, u.y - r - 6, r * 2 + 2, u.hp / u.maxHp);
}

function drawEffect(ctx: CanvasRenderingContext2D, e: Effect) {
  const frac = e.ttl > 0 ? e.age / e.ttl : 1;
  if (e.kind === 'muzzle') {
    const s = compileSprite(MUZZLE_FLASH);
    drawSprite(ctx, s, e.x, e.y, { anchor: 'center', frame: frac < 0.5 ? 0 : 1 });
  } else if (e.kind === 'projectile') {
    const s = compileSprite(PROJECTILE);
    drawSprite(ctx, s, e.x, e.y, { anchor: 'center' });
  } else if (e.kind === 'explosion') {
    const s = compileSprite(EXPLOSION);
    drawSprite(ctx, s, e.x, e.y, { anchor: 'center', frame: animFrame(e.age, 6, s.frameCount), scale: 1.5 });
  } else if (e.kind === 'strike') {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - frac);
    ctx.strokeStyle = e.color ?? '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.x, e.y, (e.radius ?? 40) * frac, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (e.kind === 'corpse' || e.kind === 'rubble') {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - frac);
    const s = compileSprite(e.kind === 'corpse' ? CORPSE : RUBBLE);
    drawSprite(ctx, s, e.x, e.y, { anchor: 'center' });
    ctx.restore();
  }
}

function drawHpBar(ctx: CanvasRenderingContext2D, cx: number, top: number, w: number, frac: number) {
  if (frac >= 0.999) return;
  ctx.fillStyle = '#400';
  ctx.fillRect(cx - w / 2, top, w, 2);
  ctx.fillStyle = frac > 0.5 ? '#2ecc40' : frac > 0.25 ? '#ffdc00' : '#ff4136';
  ctx.fillRect(cx - w / 2, top, w * Math.max(0, frac), 2);
}
