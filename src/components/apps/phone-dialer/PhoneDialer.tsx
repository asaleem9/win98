'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppComponentProps } from '@/types/app';
import { useSettings } from '@/contexts/SettingsContext';
import { MenuBar, MenuDefinition } from '@/components/window/MenuBar';
import { Dialog98 } from '@/components/ui/Dialog98';
import { Button98 } from '@/components/ui/Button98';
import { cn } from '@/lib/cn';
import { playDtmf, playDialTone, startBusySignal } from './phoneAudio';
import {
  KEYPAD_LAYOUT,
  emptySpeedDial,
  normalizeSpeedDial,
  setSpeedDialSlot,
  isSlotFilled,
  dialOutcome,
  DialOutcome,
  SpeedDialSlot,
} from './dialerLogic';

const APP_ID = 'phone-dialer';
// How long the "Dialing..." state lasts before the call connects/fails.
export const DIAL_DELAY_MS = 1400;

type Status = 'idle' | 'dialing' | 'busy';
type Gag = 'connect' | 'properties' | null;

export default function PhoneDialer({ windowId }: AppComponentProps) {
  const { getAppPref, setAppPref } = useSettings();

  const [number, setNumber] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [outcome, setOutcome] = useState<DialOutcome | null>(null);
  const [slots, setSlots] = useState<SpeedDialSlot[]>(emptySpeedDial);
  const [editOpen, setEditOpen] = useState(false);
  const [gag, setGag] = useState<Gag>(null);
  const [about, setAbout] = useState(false);

  const busyStopRef = useRef<(() => void) | null>(null);
  const toneStopRef = useRef<(() => void) | null>(null);
  const timersRef = useRef<number[]>([]);

  // Load persisted speed dials once.
  useEffect(() => {
    setSlots(normalizeSpeedDial(getAppPref<unknown>(APP_ID, 'speedDial', null)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const stopTones = useCallback(() => {
    busyStopRef.current?.();
    busyStopRef.current = null;
    toneStopRef.current?.();
    toneStopRef.current = null;
  }, []);

  // Tear everything down on unmount.
  useEffect(() => () => { clearTimers(); stopTones(); }, [clearTimers, stopTones]);

  const dialNumber = useCallback((raw: string) => {
    const digits = raw.trim();
    if (!digits) return;
    clearTimers();
    stopTones();
    setOutcome(null);
    setStatus('dialing');

    // A quick dial tone, then the DTMF burst for each digit.
    const stopTone = playDialTone();
    toneStopRef.current = stopTone;
    timersRef.current.push(window.setTimeout(() => { stopTone(); toneStopRef.current = null; }, 300));
    [...digits].forEach((d, i) => {
      timersRef.current.push(window.setTimeout(() => playDtmf(d), 350 + i * 180));
    });

    // Resolve the call after a fixed beat so the outcome timing is predictable.
    timersRef.current.push(window.setTimeout(() => {
      const result = dialOutcome(digits);
      setOutcome(result);
      if (result.busy) {
        setStatus('busy');
        busyStopRef.current = startBusySignal();
      } else {
        setStatus('idle');
      }
    }, DIAL_DELAY_MS));
  }, [clearTimers, stopTones]);

  const hangUp = useCallback(() => {
    clearTimers();
    stopTones();
    setStatus('idle');
    setOutcome(null);
  }, [clearTimers, stopTones]);

  const press = useCallback((key: string) => {
    if (status !== 'idle') return;
    setNumber((n) => (n.length >= 24 ? n : n + key));
    playDtmf(key);
  }, [status]);

  const closeOutcome = useCallback(() => {
    stopTones();
    busyStopRef.current = null;
    setOutcome(null);
    setStatus('idle');
  }, [stopTones]);

  const saveSlots = useCallback((next: SpeedDialSlot[]) => {
    setSlots(next);
    setAppPref(APP_ID, 'speedDial', next);
  }, [setAppPref]);

  const onSpeedDial = useCallback((i: number) => {
    const slot = slots[i];
    if (isSlotFilled(slot)) {
      setNumber(slot.number);
      dialNumber(slot.number);
    } else {
      setEditOpen(true);
    }
  }, [slots, dialNumber]);

  const statusText =
    status === 'dialing' ? `Dialing ${number}...`
    : status === 'busy' ? 'The line is busy.'
    : number || 'Ready';

  const menus: MenuDefinition[] = [
    {
      label: '&Edit',
      items: [
        { label: '&Speed Dial...', onClick: () => setEditOpen(true) },
        { label: '', separator: true },
        { label: '&Redial', onClick: () => number && dialNumber(number), disabled: !number || status !== 'idle' },
      ],
    },
    {
      label: '&Tools',
      items: [
        { label: '&Connect Using...', onClick: () => setGag('connect') },
        { label: '&Dialing Properties...', onClick: () => setGag('properties') },
      ],
    },
    {
      label: '&Help',
      items: [{ label: '&About Phone Dialer', onClick: () => setAbout(true) }],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px] select-none">
      <MenuBar menus={menus} windowId={windowId} />

      <div className="flex-1 flex gap-2 p-2 min-h-0">
        {/* Left: number entry + keypad */}
        <div className="flex flex-col gap-2">
          {/* LCD status */}
          <div className="h-[26px] px-2 flex items-center bg-[#0c2a12] border-2 border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
            <span
              className="font-mono text-[13px] text-[#28ff6a] truncate"
              style={{ textShadow: '0 0 5px rgba(40,255,106,0.6)' }}
            >
              {statusText}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <label className="text-[var(--win98-disabled-text)]" htmlFor="pd-number">Number:</label>
            <input
              id="pd-number"
              value={number}
              onChange={(e) => status === 'idle' && setNumber(e.target.value.replace(/[^0-9*#+\-() ]/g, ''))}
              className="flex-1 min-w-0 h-[19px] px-1 bg-white border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]"
              aria-label="Number to dial"
            />
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-[3px]">
            {KEYPAD_LAYOUT.map(({ key, letters }) => (
              <button
                key={key}
                onClick={() => press(key)}
                aria-label={`Key ${key}`}
                className="h-[34px] w-[52px] flex flex-col items-center justify-center cursor-default bg-[var(--win98-button-face)] border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]"
              >
                <span className="text-[15px] leading-none font-bold">{key}</span>
                <span className="text-[7px] leading-none text-[var(--win98-disabled-text)] h-[7px]">{letters}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {status === 'idle' ? (
              <Button98 className="flex-1" onClick={() => dialNumber(number)} disabled={!number.trim()}>Dial</Button98>
            ) : (
              <Button98 className="flex-1" onClick={hangUp}>Hang Up</Button98>
            )}
            <Button98 className="min-w-0 px-2" onClick={() => status === 'idle' && setNumber((n) => n.slice(0, -1))} disabled={status !== 'idle' || !number}>⌫</Button98>
          </div>
        </div>

        {/* Right: speed dial */}
        <div className="flex-1 flex flex-col gap-[3px] min-w-0">
          <div className="text-[var(--win98-disabled-text)] text-[10px]">Speed dial</div>
          {slots.map((slot, i) => (
            <button
              key={i}
              onClick={() => onSpeedDial(i)}
              onContextMenu={(e) => { e.preventDefault(); setEditOpen(true); }}
              className={cn(
                'h-[22px] px-2 text-left truncate cursor-default bg-[var(--win98-button-face)]',
                'border-2 border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
                'active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)] active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
                !isSlotFilled(slot) && 'text-[var(--win98-disabled-text)]',
              )}
            >
              {i + 1}: {isSlotFilled(slot) ? slot.name || slot.number : '<empty>'}
            </button>
          ))}
        </div>
      </div>

      {outcome && (
        <ModalLayer>
          <Dialog98
            title={outcome.title}
            icon={outcome.kind === 'emergency' ? 'warning' : outcome.kind === 'busy' ? 'error' : 'info'}
            message={<span className="inline-block max-w-[300px]">{outcome.message}</span>}
            buttons={[{ label: 'OK', default: true, onClick: closeOutcome }]}
            className="shadow-lg"
          />
        </ModalLayer>
      )}

      {editOpen && (
        <ModalLayer>
          <SpeedDialEditor
            slots={slots}
            onSave={(next) => { saveSlots(next); setEditOpen(false); }}
            onCancel={() => setEditOpen(false)}
          />
        </ModalLayer>
      )}

      {gag && (
        <ModalLayer>
          <Dialog98
            title={gag === 'connect' ? 'Connect Using' : 'Dialing Properties'}
            icon="info"
            message={
              gag === 'connect' ? (
                <div className="w-[300px] space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-[50px] text-[var(--win98-disabled-text)]">Line:</span>
                    <span className="flex-1 h-[19px] px-1 flex items-center bg-white border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">US Robotics 56K Faxmodem ▾</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-[50px] text-[var(--win98-disabled-text)]">Address:</span>
                    <span className="flex-1 h-[19px] px-1 flex items-center bg-white border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">1</span>
                  </div>
                  <p className="text-[10px] text-[var(--win98-disabled-text)]">Placing an actual call requires a phone line plugged into the modem. This computer’s modem is plugged into nothing.</p>
                </div>
              ) : (
                <div className="w-[300px] space-y-1">
                  <div className="flex justify-between"><span>I am dialing from:</span><span>Home</span></div>
                  <div className="flex justify-between"><span>Area code:</span><span>555</span></div>
                  <div className="flex justify-between"><span>To access an outside line:</span><span>Dial 9</span></div>
                  <div className="flex justify-between"><span>Dial using:</span><span>Tone dialing</span></div>
                  <div className="flex justify-between"><span>Call waiting:</span><span>Disabled (*70)</span></div>
                </div>
              )
            }
            buttons={[{ label: 'OK', default: true, onClick: () => setGag(null) }]}
            className="shadow-lg"
          />
        </ModalLayer>
      )}

      {about && (
        <ModalLayer>
          <Dialog98
            title="About Phone Dialer"
            icon="info"
            message={
              <div className="space-y-1">
                <p className="font-bold">Phone Dialer</p>
                <p>Microsoft (R) Phone Dialer</p>
                <p>Version 4.10.1998</p>
                <p>Copyright (C) 1998 Microsoft Corp.</p>
              </div>
            }
            buttons={[{ label: 'OK', default: true, onClick: () => setAbout(false) }]}
            className="shadow-lg"
          />
        </ModalLayer>
      )}
    </div>
  );
}

function ModalLayer({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/10">{children}</div>;
}

function SpeedDialEditor({
  slots,
  onSave,
  onCancel,
}: {
  slots: SpeedDialSlot[];
  onSave: (next: SpeedDialSlot[]) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<SpeedDialSlot[]>(() => slots.map((s) => ({ ...s })));

  const update = (i: number, patch: Partial<SpeedDialSlot>) =>
    setDraft((d) => setSpeedDialSlot(d, i, { ...d[i], ...patch }));

  return (
    <Dialog98
      title="Edit Speed Dial"
      message={
        <div className="w-[320px]">
          <div className="flex text-[10px] text-[var(--win98-disabled-text)] mb-1">
            <span className="w-[16px]" />
            <span className="flex-1">Name</span>
            <span className="w-[110px]">Number to dial</span>
          </div>
          {draft.map((slot, i) => (
            <div key={i} className="flex items-center gap-1 mb-[3px]">
              <span className="w-[16px] text-right text-[var(--win98-disabled-text)]">{i + 1}</span>
              <input
                aria-label={`Speed dial ${i + 1} name`}
                value={slot.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="flex-1 min-w-0 h-[18px] px-1 bg-white border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]"
              />
              <input
                aria-label={`Speed dial ${i + 1} number`}
                value={slot.number}
                onChange={(e) => update(i, { number: e.target.value.replace(/[^0-9*#+\-() ]/g, '') })}
                className="w-[110px] h-[18px] px-1 bg-white border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]"
              />
            </div>
          ))}
        </div>
      }
      buttons={[
        { label: 'Save', default: true, onClick: () => onSave(draft) },
        { label: 'Cancel', onClick: onCancel },
      ]}
      className="shadow-lg"
    />
  );
}
