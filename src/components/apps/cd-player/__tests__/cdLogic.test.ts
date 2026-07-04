import {
  CD_TRACKS,
  CD_TRACK_COUNT,
  CD_DISC_TITLE,
  INITIAL_CD_STATE,
  cdReducer,
  cdManualStep,
  cdAutoNext,
  cdTotalDurationSec,
  formatCdTime,
  CdState,
} from '../cdLogic';
import { musicTracks } from '@/lib/audio/tracks';

describe('CD disc data', () => {
  it('maps every disc track to a bundled MP3', () => {
    expect(CD_TRACK_COUNT).toBe(musicTracks.length);
    const bundledIds = new Set(musicTracks.map((t) => t.id));
    for (const [i, cdTrack] of CD_TRACKS.entries()) {
      expect(cdTrack.number).toBe(i + 1);
      expect(bundledIds.has(cdTrack.track.id)).toBe(true);
      expect(cdTrack.track.src).toMatch(/\.mp3$/);
    }
  });

  it('titles the disc after the era compilation', () => {
    expect(CD_DISC_TITLE).toBe("Now That's What I Call 1998");
  });

  it('sums a positive total running time', () => {
    expect(cdTotalDurationSec()).toBeGreaterThan(0);
  });
});

describe('formatCdTime', () => {
  it('renders two-digit mm:ss', () => {
    expect(formatCdTime(0)).toBe('00:00');
    expect(formatCdTime(9)).toBe('00:09');
    expect(formatCdTime(74)).toBe('01:14');
    expect(formatCdTime(600)).toBe('10:00');
  });

  it('floors junk input to 00:00', () => {
    expect(formatCdTime(-5)).toBe('00:00');
    expect(formatCdTime(NaN)).toBe('00:00');
  });
});

describe('cdManualStep', () => {
  it('wraps forward and backward sequentially', () => {
    expect(cdManualStep(0, 6, 1, false)).toBe(1);
    expect(cdManualStep(5, 6, 1, false)).toBe(0);
    expect(cdManualStep(0, 6, -1, false)).toBe(5);
  });

  it('never returns the current index when shuffling', () => {
    for (let i = 0; i < 6; i++) {
      const next = cdManualStep(i, 6, 1, true, () => 0.999);
      expect(next).not.toBe(i);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(6);
    }
  });

  it('pins to 0 for a single-track disc', () => {
    expect(cdManualStep(0, 1, 1, false)).toBe(0);
    expect(cdManualStep(0, 1, 1, true)).toBe(0);
  });
});

describe('cdAutoNext', () => {
  const mode = (over = {}) => ({ random: false, continuous: false, intro: false, ...over });

  it('advances then stops at the end without continuous', () => {
    expect(cdAutoNext(0, 3, mode())).toBe(1);
    expect(cdAutoNext(2, 3, mode())).toBeNull();
  });

  it('loops to the first track with continuous play', () => {
    expect(cdAutoNext(2, 3, mode({ continuous: true }))).toBe(0);
  });

  it('picks a different track under random order', () => {
    const next = cdAutoNext(1, 4, mode({ random: true }), () => 0);
    expect(next).not.toBe(1);
  });
});

describe('cdReducer transport', () => {
  const s = (over: Partial<CdState> = {}): CdState => ({ ...INITIAL_CD_STATE, ...over });

  it('plays, pauses (toggling), and stops', () => {
    let st = cdReducer(s(), { type: 'PLAY' });
    expect(st.status).toBe('playing');
    st = cdReducer(st, { type: 'PAUSE' });
    expect(st.status).toBe('paused');
    st = cdReducer(st, { type: 'PAUSE' });
    expect(st.status).toBe('playing');
    st = cdReducer(st, { type: 'STOP' });
    expect(st.status).toBe('stopped');
  });

  it('steps tracks with NEXT/PREV while keeping status', () => {
    const st = cdReducer(s({ status: 'playing', track: 0 }), { type: 'NEXT' });
    expect(st.track).toBe(1);
    expect(st.status).toBe('playing');
  });

  it('ejects the disc and reloads it fresh on a second eject', () => {
    let st = cdReducer(s({ status: 'playing', track: 3 }), { type: 'EJECT' });
    expect(st.status).toBe('empty');
    expect(st.track).toBe(0);
    // With no disc, transport buttons are inert.
    expect(cdReducer(st, { type: 'PLAY' }).status).toBe('empty');
    expect(cdReducer(st, { type: 'NEXT' }).track).toBe(0);
    st = cdReducer(st, { type: 'EJECT' });
    expect(st.status).toBe('stopped');
  });

  it('selects a track, clamping out-of-range indices', () => {
    expect(cdReducer(s(), { type: 'SELECT', index: 2 }).track).toBe(2);
    expect(cdReducer(s(), { type: 'SELECT', index: 999 }).track).toBe(CD_TRACK_COUNT - 1);
    expect(cdReducer(s(), { type: 'SELECT', index: -3 }).track).toBe(0);
  });

  it('auto-advances on ENDED and stops at the end of the disc', () => {
    const advanced = cdReducer(s({ status: 'playing', track: 0 }), { type: 'ENDED' });
    expect(advanced).toEqual(expect.objectContaining({ track: 1, status: 'playing' }));
    const ended = cdReducer(s({ status: 'playing', track: CD_TRACK_COUNT - 1 }), { type: 'ENDED' });
    expect(ended.status).toBe('stopped');
  });

  it('loops on ENDED when continuous play is on', () => {
    const st = s({ status: 'playing', track: CD_TRACK_COUNT - 1, mode: { random: false, continuous: true, intro: false } });
    expect(cdReducer(st, { type: 'ENDED' }).track).toBe(0);
  });

  it('toggles the three play modes', () => {
    let st = cdReducer(s(), { type: 'TOGGLE_RANDOM' });
    expect(st.mode.random).toBe(true);
    st = cdReducer(st, { type: 'TOGGLE_CONTINUOUS' });
    expect(st.mode.continuous).toBe(true);
    st = cdReducer(st, { type: 'TOGGLE_INTRO' });
    expect(st.mode.intro).toBe(true);
    st = cdReducer(st, { type: 'TOGGLE_RANDOM' });
    expect(st.mode.random).toBe(false);
  });
});
