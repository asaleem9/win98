import {
  MISSIONS,
  createMissionState,
  currentMission,
  lightLane,
  beginMission,
  recordHit,
  tickMission,
  failMission,
  acknowledgeMission,
  resetMissionRun,
  rankFromMissions,
  lanesLitCount,
  missionProgressText,
  LAUNCH_LANE_COUNT,
  MissionState,
} from '../missions';
import { RANKS } from '../physics';

// Walk a state to an active mission on a chosen ladder index.
function activate(index = 0): MissionState {
  let s = createMissionState();
  s = { ...s, index };
  for (let i = 0; i < LAUNCH_LANE_COUNT; i++) s = lightLane(s, i);
  return beginMission(s);
}

describe('launch lanes arm mission select', () => {
  it('stays idle until every lane is lit, then goes ready', () => {
    let s = createMissionState();
    expect(s.phase).toBe('idle');
    s = lightLane(s, 0);
    expect(s.phase).toBe('idle');
    expect(lanesLitCount(s)).toBe(1);
    s = lightLane(s, 1);
    expect(s.phase).toBe('idle');
    s = lightLane(s, 2);
    expect(s.phase).toBe('ready');
    expect(lanesLitCount(s)).toBe(3);
  });

  it('ignores a repeated lane and out-of-range lanes', () => {
    let s = createMissionState();
    s = lightLane(s, 0);
    const again = lightLane(s, 0);
    expect(again).toBe(s);
    expect(lightLane(s, 9)).toBe(s);
    expect(lightLane(s, -1)).toBe(s);
  });

  it('does not accumulate lanes once a mission is active', () => {
    const s = activate();
    expect(s.phase).toBe('active');
    const after = lightLane(s, 0);
    expect(after).toBe(s);
  });
});

describe('beginMission', () => {
  it('only starts from the armed (ready) phase', () => {
    const idle = createMissionState();
    expect(beginMission(idle)).toBe(idle);
  });

  it('arms the timer, clears lanes and sizes progress to the objective', () => {
    const s = activate(1); // Re-entry: 2 slots
    const def = MISSIONS[1];
    expect(s.phase).toBe('active');
    expect(s.timeLeftMs).toBe(def.timeLimitMs);
    expect(s.progress).toHaveLength(def.objective.slots ?? 1);
    expect(lanesLitCount(s)).toBe(0);
  });
});

describe('recordHit', () => {
  it('advances only on the matching event type', () => {
    let s = activate(0); // Target Practice: 4 targets
    s = recordHit(s, { type: 'bumper' });
    expect(missionProgressText(s)).toBe('0/4');
    s = recordHit(s, { type: 'target' });
    expect(missionProgressText(s)).toBe('1/4');
  });

  it('completes when the objective is met and banks the completion', () => {
    let s = activate(0);
    for (let i = 0; i < 4; i++) s = recordHit(s, { type: 'target' });
    expect(s.phase).toBe('complete');
    expect(s.completed).toBe(1);
    // index is left in place so the reward can still be read off currentMission
    expect(currentMission(s).id).toBe('target-practice');
  });

  it('requires each slot for multi-slot objectives (Re-entry)', () => {
    let s = activate(1); // hit each slingshot twice
    s = recordHit(s, { type: 'sling', index: 0 });
    s = recordHit(s, { type: 'sling', index: 0 });
    expect(s.phase).toBe('active'); // slot 0 satisfied, slot 1 still empty
    s = recordHit(s, { type: 'sling', index: 1 });
    expect(s.phase).toBe('active');
    s = recordHit(s, { type: 'sling', index: 1 });
    expect(s.phase).toBe('complete');
  });

  it('caps a slot at the required count and ignores extra hits', () => {
    let s = activate(2); // Bumper Storm: 12
    for (let i = 0; i < 20; i++) s = recordHit(s, { type: 'bumper' });
    expect(s.progress[0]).toBe(12);
  });

  it('does nothing outside the active phase', () => {
    const idle = createMissionState();
    expect(recordHit(idle, { type: 'target' })).toBe(idle);
  });
});

describe('timeout and drain failure', () => {
  it('fails on timeout and wipes progress but keeps completed', () => {
    let s = activate(0);
    s = recordHit(s, { type: 'target' });
    s = { ...s, completed: 3 };
    s = tickMission(s, s.timeLeftMs + 1);
    expect(s.phase).toBe('failed');
    expect(s.progress.every((p) => p === 0)).toBe(true);
    expect(s.completed).toBe(3);
  });

  it('ticks the timer down while time remains', () => {
    const s = activate(0);
    const after = tickMission(s, 1000);
    expect(after.timeLeftMs).toBe(s.timeLeftMs - 1000);
    expect(after.phase).toBe('active');
  });

  it('failMission drops an active mission and is a no-op otherwise', () => {
    const s = activate(0);
    const failed = failMission(s);
    expect(failed.phase).toBe('failed');
    const idle = createMissionState();
    expect(failMission(idle)).toBe(idle);
  });
});

describe('acknowledge resolves back to idle', () => {
  it('advances the ladder after a completion', () => {
    let s = activate(0);
    for (let i = 0; i < 4; i++) s = recordHit(s, { type: 'target' });
    s = acknowledgeMission(s);
    expect(s.phase).toBe('idle');
    expect(s.index).toBe(1);
    expect(lanesLitCount(s)).toBe(0);
  });

  it('keeps you on the same mission after a failure', () => {
    let s = activate(2);
    s = failMission(s);
    s = acknowledgeMission(s);
    expect(s.phase).toBe('idle');
    expect(s.index).toBe(2);
  });

  it('wraps the ladder index around the table', () => {
    let s = activate(MISSIONS.length - 1);
    const obj = currentMission(s).objective;
    const hits = obj.count * (obj.slots ?? 1);
    for (let i = 0; i < hits; i++) s = recordHit(s, { type: obj.event, index: i % (obj.slots ?? 1) });
    s = acknowledgeMission(s);
    expect(s.index).toBe(0);
  });
});

describe('rank advancement from missions', () => {
  it('maps completions onto the shared rank ladder', () => {
    expect(rankFromMissions(0)).toBe('Cadet');
    expect(rankFromMissions(1)).toBe(RANKS[1].name);
    expect(rankFromMissions(RANKS.length - 1)).toBe('Fleet Admiral');
  });

  it('caps at the top rank', () => {
    expect(rankFromMissions(999)).toBe('Fleet Admiral');
    expect(rankFromMissions(-5)).toBe('Cadet');
  });

  it('climbs one rank per completed mission', () => {
    let s = createMissionState();
    const before = rankFromMissions(s.completed);
    expect(before).toBe('Cadet');
    // complete Target Practice
    s = activate(0);
    for (let i = 0; i < 4; i++) s = recordHit(s, { type: 'target' });
    expect(rankFromMissions(s.completed)).toBe(RANKS[1].name);
  });
});

describe('resetMissionRun', () => {
  it('carries the career completion count into a fresh run', () => {
    let s = activate(2);
    s = { ...s, completed: 5, index: 2 };
    const fresh = resetMissionRun(s);
    expect(fresh.completed).toBe(5);
    expect(fresh.phase).toBe('idle');
    expect(fresh.index).toBe(0);
    expect(lanesLitCount(fresh)).toBe(0);
  });
});
