'use client';

import { useReducer, useState, useEffect, useMemo } from 'react';
import { AppComponentProps } from '@/types/app';
import { getAudioContext, getMasterGain } from '@/lib/sounds';
import { cn } from '@/lib/cn';
import { Button98 } from '@/components/ui/Button98';
import { Dialog98 } from '@/components/ui/Dialog98';
import {
  DX_VERSION,
  DX_FILES,
  DISPLAY_DEVICE_FIELDS,
  DISPLAY_FEATURE_FIELDS,
  SOUND_DEVICE_FIELDS,
  INPUT_DEVICE_FIELDS,
  DX_TEST_LABEL,
  INITIAL_DX_TEST,
  TEST_DURATION_MS,
  dxTestReducer,
  systemFields,
  notesForResults,
  DxField,
  DxTestKind,
} from './dxLogic';

type TabId = 'system' | 'files' | 'display' | 'sound' | 'input';
const TABS: { id: TabId; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'files', label: 'DirectX Files' },
  { id: 'display', label: 'Display' },
  { id: 'sound', label: 'Sound' },
  { id: 'input', label: 'Input' },
];

// A short rising arpeggio for the DirectSound test. No-op without Web Audio.
function playEscalatingBeeps(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const dest: AudioNode = getMasterGain() ?? ctx.destination;
  const freqs = [262, 330, 392, 523, 659];
  const now = ctx.currentTime;
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = f;
    const start = now + i * 0.22;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
    osc.connect(gain).connect(dest);
    osc.start(start);
    osc.stop(start + 0.24);
  });
}

export default function DxDiag({}: AppComponentProps) {
  const [tab, setTab] = useState<TabId>('system');
  const [test, dispatch] = useReducer(dxTestReducer, INITIAL_DX_TEST);
  const [now, setNow] = useState(() => new Date());

  // Live clock for the System tab's date/time row.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // While a test animation runs, sound the DirectSound arpeggio and, after the
  // fixed duration, move on to the pass/fail prompt.
  useEffect(() => {
    if (test.phase !== 'running') return;
    if (test.kind === 'directsound') playEscalatingBeeps();
    const id = setTimeout(() => dispatch({ type: 'ADVANCE' }), TEST_DURATION_MS);
    return () => clearTimeout(id);
  }, [test.phase, test.kind]);

  const notes = useMemo(() => notesForResults(test.results), [test.results]);

  return (
    <div className="relative flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      {/* Tabs */}
      <div className="flex px-2 pt-2 gap-[2px]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-1 cursor-default border border-solid',
              tab === t.id
                ? 'bg-[var(--win98-button-face)] border-[var(--win98-button-shadow)] border-b-[var(--win98-button-face)] -mb-px z-10 relative'
                : 'bg-[var(--win98-button-dark-shadow)]/10 border-[var(--win98-button-shadow)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="flex-1 flex flex-col mx-2 mb-2 p-2 border border-solid border-[var(--win98-button-shadow)] min-h-0 overflow-auto">
        {tab === 'system' && (
          <>
            <p className="mb-2">
              This tool reports detailed information about the DirectX components and drivers installed on your system.
            </p>
            <GroupBox title="System Information">
              <FieldTable fields={systemFields(now)} />
            </GroupBox>
          </>
        )}

        {tab === 'files' && (
          <GroupBox title="DirectX Files">
            <div className="flex justify-between px-1 py-[2px] font-bold border-b border-[var(--win98-button-shadow)]">
              <span>Name</span><span>Version</span>
            </div>
            <FieldTable fields={DX_FILES} mono />
            <NotesLine notes="No problems found." />
          </GroupBox>
        )}

        {tab === 'display' && (
          <>
            <div className="flex gap-2">
              <GroupBox title="Device" className="flex-1">
                <FieldTable fields={DISPLAY_DEVICE_FIELDS} />
              </GroupBox>
              <GroupBox title="DirectX Features" className="w-[180px]">
                <FieldTable fields={DISPLAY_FEATURE_FIELDS} />
                <div className="flex flex-col gap-1 mt-2">
                  <Button98 onClick={() => dispatch({ type: 'START', kind: 'directdraw' })}>Test DirectDraw</Button98>
                  <Button98 onClick={() => dispatch({ type: 'START', kind: 'direct3d' })}>Test Direct3D</Button98>
                </div>
              </GroupBox>
            </div>
            <NotesBox notes={notes} />
          </>
        )}

        {tab === 'sound' && (
          <>
            <GroupBox title="Device">
              <FieldTable fields={SOUND_DEVICE_FIELDS} />
              <div className="mt-2">
                <Button98 onClick={() => dispatch({ type: 'START', kind: 'directsound' })}>Test DirectSound</Button98>
              </div>
            </GroupBox>
            <NotesBox notes={notes} />
          </>
        )}

        {tab === 'input' && (
          <>
            <GroupBox title="DirectInput Devices">
              <FieldTable fields={INPUT_DEVICE_FIELDS} />
            </GroupBox>
            <NotesBox notes={notes} />
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 px-2 pb-2">
        <span className="mr-auto self-center text-[10px] text-[var(--win98-disabled-text)]">{DX_VERSION}</span>
        <Button98>Help</Button98>
        <Button98>Next Page</Button98>
      </div>

      {test.phase !== 'idle' && test.kind && (
        <TestOverlay
          kind={test.kind}
          phase={test.phase === 'question' ? 'question' : 'running'}
          onAnswer={(pass) => dispatch({ type: 'ANSWER', pass })}
        />
      )}
    </div>
  );
}

// --- test overlay (fullscreen-in-window) ------------------------------------

function TestOverlay({
  kind,
  phase,
  onAnswer,
}: {
  kind: DxTestKind;
  phase: 'running' | 'question';
  onAnswer: (pass: boolean) => void;
}) {
  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black overflow-hidden">
      <style>{DX_TEST_KEYFRAMES}</style>

      {kind === 'directdraw' && (
        <div className="absolute w-[46px] h-[34px] bg-white" style={{ animation: 'dxddRect 2.2s linear infinite' }} />
      )}

      {kind === 'direct3d' && (
        <div style={{ perspective: '360px' }} className="flex flex-col items-center">
          <div className="dxdiag-cube" style={{ animation: 'dxddSpin 2.4s linear infinite' }}>
            {CUBE_FACES.map((f) => (
              <div key={f.key} className="dxdiag-face" style={f.style} />
            ))}
          </div>
          <div className="mt-16 text-white text-[10px] tracking-wide">Direct3D 6.1 Test</div>
        </div>
      )}

      {kind === 'directsound' && (
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="flex items-end gap-1 h-[40px]">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-[6px] bg-[#28ff6a]"
                style={{ animation: `dxddBar 0.7s ${i * 0.1}s ease-in-out infinite`, height: '10px' }}
              />
            ))}
          </div>
          <div className="text-[10px] tracking-wide">DirectSound Test</div>
        </div>
      )}

      {phase === 'running' && (
        <div className="absolute bottom-3 left-0 right-0 text-center text-white/60 text-[10px]">
          Testing {DX_TEST_LABEL[kind]}...
        </div>
      )}

      {phase === 'question' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Dialog98
            title={`${DX_TEST_LABEL[kind]} Test`}
            icon="question"
            message={<span className="inline-block max-w-[260px]">Did the {DX_TEST_LABEL[kind]} test display and sound correctly? Did the test pass?</span>}
            buttons={[
              { label: 'Yes', default: true, onClick: () => onAnswer(true) },
              { label: 'No', onClick: () => onAnswer(false) },
            ]}
            className="shadow-lg"
          />
        </div>
      )}
    </div>
  );
}

// --- small presentational helpers -------------------------------------------

function GroupBox({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <fieldset className={cn('border border-solid border-[var(--win98-button-shadow)] px-2 pb-2 pt-1 mb-2', className)}>
      <legend className="px-1 text-[11px]">{title}</legend>
      {children}
    </fieldset>
  );
}

function FieldTable({ fields, mono }: { fields: DxField[]; mono?: boolean }) {
  return (
    <div className={mono ? 'font-mono' : undefined}>
      {fields.map((f) => (
        <div key={f.label} className="flex py-[1px]">
          <span className="w-[46%] shrink-0 text-[var(--win98-disabled-text)] pr-2">{f.label}</span>
          <span className="flex-1 break-words">{f.value}</span>
        </div>
      ))}
    </div>
  );
}

function NotesBox({ notes }: { notes: string }) {
  return (
    <GroupBox title="Notes" className="mt-auto">
      <div className="min-h-[36px] bg-white border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)] p-1">
        {notes}
      </div>
    </GroupBox>
  );
}

function NotesLine({ notes }: { notes: string }) {
  return <div className="mt-2 pt-1 border-t border-[var(--win98-button-shadow)] text-[var(--win98-disabled-text)]">Notes: {notes}</div>;
}

// --- cube geometry + keyframes ----------------------------------------------

const CUBE_SIZE = 80;
const HALF = CUBE_SIZE / 2;
const faceBase: React.CSSProperties = {
  position: 'absolute',
  width: CUBE_SIZE,
  height: CUBE_SIZE,
  border: '1px solid #28ff6a',
  background: 'rgba(40, 90, 200, 0.35)',
  boxShadow: 'inset 0 0 18px rgba(40,255,106,0.35)',
};
const CUBE_FACES = [
  { key: 'front', style: { ...faceBase, transform: `rotateY(0deg) translateZ(${HALF}px)` } },
  { key: 'back', style: { ...faceBase, transform: `rotateY(180deg) translateZ(${HALF}px)` } },
  { key: 'right', style: { ...faceBase, transform: `rotateY(90deg) translateZ(${HALF}px)` } },
  { key: 'left', style: { ...faceBase, transform: `rotateY(-90deg) translateZ(${HALF}px)` } },
  { key: 'top', style: { ...faceBase, transform: `rotateX(90deg) translateZ(${HALF}px)` } },
  { key: 'bottom', style: { ...faceBase, transform: `rotateX(-90deg) translateZ(${HALF}px)` } },
];

const DX_TEST_KEYFRAMES = `
.dxdiag-cube {
  position: relative;
  width: ${CUBE_SIZE}px;
  height: ${CUBE_SIZE}px;
  transform-style: preserve-3d;
}
.dxdiag-face { backface-visibility: visible; }
@keyframes dxddSpin {
  from { transform: rotateX(-24deg) rotateY(0deg); }
  to { transform: rotateX(-24deg) rotateY(360deg); }
}
@keyframes dxddRect {
  0%   { left: 6%;  top: 14%; }
  25%  { left: 82%; top: 62%; }
  50%  { left: 12%; top: 74%; }
  75%  { left: 74%; top: 12%; }
  100% { left: 6%;  top: 14%; }
}
@keyframes dxddBar {
  0%, 100% { height: 8px; }
  50% { height: 38px; }
}
`;
