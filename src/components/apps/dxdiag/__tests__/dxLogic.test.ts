import {
  DX_VERSION,
  DX_FILES,
  INITIAL_DX_TEST,
  dxTestReducer,
  systemFields,
  notesForResults,
  DxTestState,
} from '../dxLogic';

describe('dxdiag data', () => {
  it('advertises the DirectX 6.1 runtime version', () => {
    expect(DX_VERSION).toContain('DirectX 6.1');
  });

  it('lists the core DirectX files all at the matching build', () => {
    const names = DX_FILES.map((f) => f.label);
    expect(names).toContain('ddraw.dll');
    expect(names).toContain('dsound.dll');
    expect(names).toContain('dinput.dll');
    expect(DX_FILES.every((f) => f.value === '4.06.02.0436')).toBe(true);
  });

  it('reports the DirectX version in the system summary', () => {
    const fields = systemFields(new Date('1998-06-25T10:00:00'));
    const version = fields.find((f) => f.label === 'DirectX Version');
    expect(version?.value).toBe(DX_VERSION);
    expect(fields.find((f) => f.label === 'Processor')?.value).toMatch(/Pentium/);
  });
});

describe('dxTestReducer sequence', () => {
  it('runs START -> ADVANCE -> ANSWER, recording a pass', () => {
    let st = dxTestReducer(INITIAL_DX_TEST, { type: 'START', kind: 'directdraw' });
    expect(st.phase).toBe('running');
    expect(st.kind).toBe('directdraw');

    st = dxTestReducer(st, { type: 'ADVANCE' });
    expect(st.phase).toBe('question');

    st = dxTestReducer(st, { type: 'ANSWER', pass: true });
    expect(st.phase).toBe('idle');
    expect(st.kind).toBeNull();
    expect(st.results.directdraw).toBe('pass');
  });

  it('records a failure when the tester answers no', () => {
    let st = dxTestReducer(INITIAL_DX_TEST, { type: 'START', kind: 'direct3d' });
    st = dxTestReducer(st, { type: 'ADVANCE' });
    st = dxTestReducer(st, { type: 'ANSWER', pass: false });
    expect(st.results.direct3d).toBe('fail');
  });

  it('ignores ADVANCE and ANSWER outside their phase, and START while busy', () => {
    expect(dxTestReducer(INITIAL_DX_TEST, { type: 'ADVANCE' })).toEqual(INITIAL_DX_TEST);
    expect(dxTestReducer(INITIAL_DX_TEST, { type: 'ANSWER', pass: true })).toEqual(INITIAL_DX_TEST);
    const running = dxTestReducer(INITIAL_DX_TEST, { type: 'START', kind: 'directsound' });
    // A second START mid-test is a no-op.
    expect(dxTestReducer(running, { type: 'START', kind: 'directdraw' })).toEqual(running);
  });

  it('cancels back to idle without recording a result', () => {
    const running = dxTestReducer(INITIAL_DX_TEST, { type: 'START', kind: 'directsound' });
    const cancelled = dxTestReducer(running, { type: 'CANCEL' });
    expect(cancelled.phase).toBe('idle');
    expect(cancelled.results.directsound).toBeNull();
  });
});

describe('notesForResults', () => {
  it('reads clean until a test fails', () => {
    expect(notesForResults(INITIAL_DX_TEST.results)).toBe('No problems found.');
  });

  it('names the failing subsystems', () => {
    const results: DxTestState['results'] = { directdraw: 'pass', direct3d: 'fail', directsound: 'fail' };
    const notes = notesForResults(results);
    expect(notes).toContain('Direct3D');
    expect(notes).toContain('DirectSound');
    expect(notes).toContain('failure');
  });
});
