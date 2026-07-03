// Data-driven mission system for Space Cadet. Everything here is pure — no DOM,
// no canvas, no React — so the whole arm -> select -> active -> complete/fail
// life cycle can be unit tested and stepped by the render loop without any
// side effects leaking in. The table drives the game: add a MissionDef and it
// slots into the ladder automatically.

import { RANKS } from './physics';

/** Rollover lanes across the top of the table that arm mission select. */
export const LAUNCH_LANE_COUNT = 3;

export type MissionEventType = 'target' | 'sling' | 'bumper' | 'spinner' | 'hyperspace';

export interface MissionEvent {
  type: MissionEventType;
  /** Which slot the hit lands in, for objectives that track each target apart. */
  index?: number;
}

export interface MissionObjective {
  /** The playfield event that advances this mission. */
  event: MissionEventType;
  /** Hits required — per slot when `slots` is set, otherwise the flat total. */
  count: number;
  /** Independent slots that must each reach `count` (e.g. hit *each* slingshot). */
  slots?: number;
}

export interface MissionDef {
  id: string;
  name: string;
  /** Short line shown on the table's display area. */
  blurb: string;
  objective: MissionObjective;
  timeLimitMs: number;
  reward: number;
  /** Completing this one kicks two extra balls into play. */
  multiball?: boolean;
}

// The ladder. Missions cycle, but rank is driven by how many you finish, not by
// where you are in the list — so the ladder can loop forever while rank climbs.
export const MISSIONS: MissionDef[] = [
  {
    id: 'target-practice',
    name: 'Target Practice',
    blurb: 'Hit 4 targets',
    objective: { event: 'target', count: 4 },
    timeLimitMs: 25_000,
    reward: 5_000,
  },
  {
    id: 're-entry',
    name: 'Re-entry',
    blurb: 'Hit each slingshot twice',
    objective: { event: 'sling', count: 2, slots: 2 },
    timeLimitMs: 25_000,
    reward: 6_000,
  },
  {
    id: 'bumper-storm',
    name: 'Bumper Storm',
    blurb: '12 bumper hits',
    objective: { event: 'bumper', count: 12 },
    timeLimitMs: 30_000,
    reward: 8_000,
  },
  {
    id: 'spin-cycle',
    name: 'Spin Cycle',
    blurb: '8 spinner passes',
    objective: { event: 'spinner', count: 8 },
    timeLimitMs: 30_000,
    reward: 9_000,
  },
  {
    id: 'hyperspace-chase',
    name: 'Hyperspace Chase',
    blurb: 'Hyperspace kicker x3',
    objective: { event: 'hyperspace', count: 3 },
    timeLimitMs: 30_000,
    reward: 15_000,
    multiball: true,
  },
];

export type MissionPhase = 'idle' | 'ready' | 'active' | 'complete' | 'failed';

export interface MissionState {
  phase: MissionPhase;
  /** Lit state of each launch lane; all lit arms mission select. */
  lanes: boolean[];
  /** Position in the MISSIONS ladder. */
  index: number;
  /** Per-slot progress toward the current objective. */
  progress: number[];
  timeLeftMs: number;
  /** Lifetime missions completed — this is what drives the rank ladder. */
  completed: number;
  lastResult: 'complete' | 'failed' | null;
}

function freshLanes(): boolean[] {
  return new Array(LAUNCH_LANE_COUNT).fill(false);
}

function slotCount(def: MissionDef): number {
  return def.objective.slots ?? 1;
}

export function createMissionState(): MissionState {
  return {
    phase: 'idle',
    lanes: freshLanes(),
    index: 0,
    progress: [0],
    timeLeftMs: 0,
    completed: 0,
    lastResult: null,
  };
}

/** The mission the ladder is currently pointing at. */
export function currentMission(state: MissionState): MissionDef {
  return MISSIONS[state.index % MISSIONS.length];
}

/** How many launch lanes are lit right now. */
export function lanesLitCount(state: MissionState): number {
  return state.lanes.filter(Boolean).length;
}

/**
 * Roll over a launch lane. Lanes only accumulate while idle; lighting the last
 * one arms mission select (phase -> 'ready'). A no-op in any other phase, so a
 * ball skating over the lanes mid-mission won't disturb an active objective.
 */
export function lightLane(state: MissionState, lane: number): MissionState {
  if (state.phase !== 'idle') return state;
  if (lane < 0 || lane >= state.lanes.length) return state;
  if (state.lanes[lane]) return state;
  const lanes = state.lanes.slice();
  lanes[lane] = true;
  return { ...state, lanes, phase: lanes.every(Boolean) ? 'ready' : 'idle' };
}

/** Kick off the armed mission: ready -> active, timer set, progress cleared. */
export function beginMission(state: MissionState): MissionState {
  if (state.phase !== 'ready') return state;
  const def = currentMission(state);
  return {
    ...state,
    phase: 'active',
    lanes: freshLanes(),
    progress: new Array(slotCount(def)).fill(0),
    timeLeftMs: def.timeLimitMs,
    lastResult: null,
  };
}

/**
 * Feed a playfield hit into the active mission. Only events matching the
 * objective count; the rest pass through untouched. Meeting the objective flips
 * the phase to 'complete' and banks the completion — but leaves `index` alone so
 * the caller can still read the reward off `currentMission` before acknowledging.
 */
export function recordHit(state: MissionState, event: MissionEvent): MissionState {
  if (state.phase !== 'active') return state;
  const obj = currentMission(state).objective;
  if (event.type !== obj.event) return state;

  const slots = obj.slots ?? 1;
  const slot = obj.slots ? Math.min(Math.max(event.index ?? 0, 0), slots - 1) : 0;
  const progress = state.progress.slice();
  progress[slot] = Math.min((progress[slot] ?? 0) + 1, obj.count);

  const done = progress.length === slots && progress.every((p) => p >= obj.count);
  if (done) {
    return {
      ...state,
      progress,
      phase: 'complete',
      completed: state.completed + 1,
      lastResult: 'complete',
    };
  }
  return { ...state, progress };
}

/** Count the mission timer down; hitting zero fails it (progress wiped). */
export function tickMission(state: MissionState, dtMs: number): MissionState {
  if (state.phase !== 'active') return state;
  const timeLeftMs = state.timeLeftMs - dtMs;
  if (timeLeftMs <= 0) {
    return { ...state, phase: 'failed', timeLeftMs: 0, lastResult: 'failed', progress: state.progress.map(() => 0) };
  }
  return { ...state, timeLeftMs };
}

/** Fail the mission outright — used when the last ball drains mid-objective. */
export function failMission(state: MissionState): MissionState {
  if (state.phase !== 'active') return state;
  return { ...state, phase: 'failed', timeLeftMs: 0, lastResult: 'failed', progress: state.progress.map(() => 0) };
}

/**
 * Clear a resolved mission back to idle. A completion advances the ladder; a
 * failure leaves you on the same mission to retry. Either way rank (completed)
 * is untouched, so a botched mission never costs you a promotion.
 */
export function acknowledgeMission(state: MissionState): MissionState {
  if (state.phase === 'complete') {
    return {
      ...state,
      phase: 'idle',
      index: (state.index + 1) % MISSIONS.length,
      lanes: freshLanes(),
      progress: [0],
      timeLeftMs: 0,
    };
  }
  if (state.phase === 'failed') {
    return { ...state, phase: 'idle', lanes: freshLanes(), progress: [0], timeLeftMs: 0 };
  }
  return state;
}

/** Fresh run for a new game, but carry the career completion count forward. */
export function resetMissionRun(state: MissionState): MissionState {
  return { ...createMissionState(), completed: state.completed };
}

/** Rank name for a career completion count, reusing the shared rank ladder. */
export function rankFromMissions(completed: number): string {
  const i = Math.min(Math.max(completed, 0), RANKS.length - 1);
  return RANKS[i].name;
}

/** "cur/total" for the current objective, for the HUD. */
export function missionProgressText(state: MissionState): string {
  const obj = currentMission(state).objective;
  const total = obj.count * (obj.slots ?? 1);
  const cur = state.progress.reduce((a, b) => a + b, 0);
  return `${Math.min(cur, total)}/${total}`;
}
