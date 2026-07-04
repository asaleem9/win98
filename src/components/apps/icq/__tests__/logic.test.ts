import {
  cycleStatus,
  replyForTurn,
  smoothTalkerLine,
  isOnlineGroup,
  PRESENCE_CYCLE,
} from '../logic';
import {
  GENERIC_REPLIES,
  SMOOTHTALKER_OPENER,
  SMOOTHTALKER_LINES,
  type Contact,
  type ICQStatus,
} from '../contacts';

function fakeContact(replies: string[]): Contact {
  return { uin: '00000000', nick: 'Test', status: 'online', replies };
}

describe('cycleStatus', () => {
  it('always moves to a different presence', () => {
    for (const s of PRESENCE_CYCLE) {
      expect(cycleStatus(s, () => 0)).not.toBe(s);
      expect(cycleStatus(s, () => 0.999)).not.toBe(s);
    }
  });

  it('only ever lands on a known presence state', () => {
    for (const s of PRESENCE_CYCLE) {
      const next = cycleStatus(s, () => 0.5);
      expect(PRESENCE_CYCLE).toContain(next);
    }
  });

  it('is deterministic for a given rng value', () => {
    expect(cycleStatus('online', () => 0)).toBe(cycleStatus('online', () => 0));
    // rng at 0 picks the first of the remaining pool (current excluded).
    expect(cycleStatus('online', () => 0)).toBe(PRESENCE_CYCLE.filter((s) => s !== 'online')[0]);
  });

  it('never overruns the pool even when rng returns 1', () => {
    const next = cycleStatus('online', () => 1);
    expect(next).toBeDefined();
    expect(PRESENCE_CYCLE).toContain(next);
  });
});

describe('replyForTurn', () => {
  it('cycles through a contact\'s own lines in order', () => {
    const c = fakeContact(['a', 'b', 'c']);
    expect(replyForTurn(c, 0)).toBe('a');
    expect(replyForTurn(c, 1)).toBe('b');
    expect(replyForTurn(c, 2)).toBe('c');
    expect(replyForTurn(c, 3)).toBe('a');
    expect(replyForTurn(c, 4)).toBe('b');
  });

  it('falls back to the generic filler when a contact has no lines', () => {
    const c = fakeContact([]);
    expect(replyForTurn(c, 0)).toBe(GENERIC_REPLIES[0]);
    expect(replyForTurn(c, GENERIC_REPLIES.length)).toBe(GENERIC_REPLIES[0]);
  });
});

describe('smoothTalkerLine', () => {
  it('delivers the opener on the first turn', () => {
    expect(smoothTalkerLine(0)).toBe(SMOOTHTALKER_OPENER);
  });

  it('walks his pickup lines in order after the opener', () => {
    expect(smoothTalkerLine(1)).toBe(SMOOTHTALKER_LINES[0]);
    expect(smoothTalkerLine(2)).toBe(SMOOTHTALKER_LINES[1]);
  });

  it('wraps around once his lines are exhausted', () => {
    expect(smoothTalkerLine(1 + SMOOTHTALKER_LINES.length)).toBe(SMOOTHTALKER_LINES[0]);
  });
});

describe('isOnlineGroup', () => {
  it('files available and free-for-chat under Online', () => {
    expect(isOnlineGroup('online')).toBe(true);
    expect(isOnlineGroup('ffc')).toBe(true);
  });

  it('files everything else under Away', () => {
    const away: ICQStatus[] = ['away', 'na', 'occupied', 'dnd', 'invisible', 'offline'];
    for (const s of away) expect(isOnlineGroup(s)).toBe(false);
  });
});
