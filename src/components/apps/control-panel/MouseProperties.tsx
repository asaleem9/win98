'use client';

import { useCallback, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useSettings } from '@/contexts/SettingsContext';
import { playSound } from '@/lib/sounds';
import { TabControl98 } from '@/components/ui/TabControl98';
import { GroupBox98 } from '@/components/ui/GroupBox98';
import { Button98 } from '@/components/ui/Button98';
import { Radio98 } from '@/components/ui/Radio98';
import { Checkbox98 } from '@/components/ui/Checkbox98';
import { cn } from '@/lib/cn';
import {
  MOUSE_APP_ID,
  MOUSE_DEFAULTS,
  SPEED_MIN,
  SPEED_MAX,
  msFromSpeed,
  speedFromMs,
  isDoubleClick,
} from './mouseSettings';

const POINTER_SCHEMES = [
  '(None)',
  'Windows Standard',
  'Windows Animated',
  '3D-Pointers',
  'Dinosaur',
  'Hands 1',
  'Conductor',
  'Magnified',
];

const MIN_TRAIL = 2;
const MAX_TRAIL = 10;

export default function MouseProperties({ windowId }: AppComponentProps) {
  const { closeWindow } = useWindows();
  const { getAppPref, setAppPref } = useSettings();

  const swapButtons = getAppPref(MOUSE_APP_ID, 'swapButtons', MOUSE_DEFAULTS.swapButtons);
  const doubleClickSpeed = getAppPref(MOUSE_APP_ID, 'doubleClickSpeed', MOUSE_DEFAULTS.doubleClickSpeed);
  const pointerScheme = getAppPref(MOUSE_APP_ID, 'pointerScheme', MOUSE_DEFAULTS.pointerScheme);
  const pointerSpeed = getAppPref(MOUSE_APP_ID, 'pointerSpeed', MOUSE_DEFAULTS.pointerSpeed);
  const trails = getAppPref(MOUSE_APP_ID, 'trails', MOUSE_DEFAULTS.trails);
  const trailLength = getAppPref(MOUSE_APP_ID, 'trailLength', MOUSE_DEFAULTS.trailLength);

  // Values live in prefs and apply immediately; snapshot them so Cancel reverts.
  const snapshot = useRef({
    swapButtons: getAppPref(MOUSE_APP_ID, 'swapButtons', MOUSE_DEFAULTS.swapButtons),
    doubleClickSpeed: getAppPref(MOUSE_APP_ID, 'doubleClickSpeed', MOUSE_DEFAULTS.doubleClickSpeed),
    pointerScheme: getAppPref(MOUSE_APP_ID, 'pointerScheme', MOUSE_DEFAULTS.pointerScheme),
    pointerSpeed: getAppPref(MOUSE_APP_ID, 'pointerSpeed', MOUSE_DEFAULTS.pointerSpeed),
    trails: getAppPref(MOUSE_APP_ID, 'trails', MOUSE_DEFAULTS.trails),
    trailLength: getAppPref(MOUSE_APP_ID, 'trailLength', MOUSE_DEFAULTS.trailLength),
  });

  const [jackOpen, setJackOpen] = useState(false);
  const lastClickRef = useRef(0);

  const cancel = useCallback(() => {
    const s = snapshot.current;
    setAppPref(MOUSE_APP_ID, 'swapButtons', s.swapButtons);
    setAppPref(MOUSE_APP_ID, 'doubleClickSpeed', s.doubleClickSpeed);
    setAppPref(MOUSE_APP_ID, 'pointerScheme', s.pointerScheme);
    setAppPref(MOUSE_APP_ID, 'pointerSpeed', s.pointerSpeed);
    setAppPref(MOUSE_APP_ID, 'trails', s.trails);
    setAppPref(MOUSE_APP_ID, 'trailLength', s.trailLength);
    closeWindow(windowId);
  }, [closeWindow, setAppPref, windowId]);

  // Manual double-click detection so the slider's window is what's under test.
  const handleTestClick = useCallback(() => {
    const now = Date.now();
    if (isDoubleClick(lastClickRef.current, now, doubleClickSpeed)) {
      setJackOpen((o) => !o);
      playSound('ding');
      lastClickRef.current = 0;
    } else {
      lastClickRef.current = now;
    }
  }, [doubleClickSpeed]);

  const buttonsTab = (
    <div className="flex flex-col gap-3">
      <GroupBox98 label="Button configuration">
        <div className="flex flex-col gap-2 pt-1">
          <Radio98
            name="button-config"
            label="Right-handed"
            checked={!swapButtons}
            onChange={() => setAppPref(MOUSE_APP_ID, 'swapButtons', false)}
          />
          <Radio98
            name="button-config"
            label="Left-handed"
            checked={swapButtons}
            onChange={() => setAppPref(MOUSE_APP_ID, 'swapButtons', true)}
          />
          <p className="text-[10px] text-[var(--win98-disabled-text)]">
            The left button selects and drags; the right button shows shortcut menus.
          </p>
        </div>
      </GroupBox98>

      <GroupBox98 label="Double-click speed">
        <div className="flex items-center gap-2 pt-1">
          <span className="select-none">Slow</span>
          <input
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            value={speedFromMs(doubleClickSpeed)}
            onChange={(e) => setAppPref(MOUSE_APP_ID, 'doubleClickSpeed', msFromSpeed(Number(e.target.value)))}
            className="flex-1 accent-[var(--win98-highlight)]"
            aria-label="Double-click speed"
          />
          <span className="select-none">Fast</span>
        </div>
        <div className="flex flex-col items-center gap-1 mt-2">
          <span className="text-[10px] select-none">Test area — double-click the box</span>
          <div
            role="button"
            aria-pressed={jackOpen}
            aria-label="Double-click test area"
            title="Double-click to test"
            onClick={handleTestClick}
            className={cn(
              'w-[56px] h-[56px] flex items-center justify-center text-[28px] cursor-default select-none',
              'bg-white border-2 border-solid',
              'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
              'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
            )}
          >
            {jackOpen ? '🧸' : '📦'}
          </div>
          {jackOpen && <span className="text-[10px] font-bold">Boing!</span>}
        </div>
      </GroupBox98>
    </div>
  );

  const pointersTab = (
    <div className="flex flex-col gap-2">
      <span className="select-none">Scheme:</span>
      <div
        className={cn(
          'h-[110px] overflow-auto bg-white',
          'border-2 border-solid',
          'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
          'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
        )}
        role="listbox"
        aria-label="Pointer scheme"
      >
        {POINTER_SCHEMES.map((name) => (
          <div
            key={name}
            role="option"
            aria-selected={pointerScheme === name}
            className={cn(
              'px-2 py-[1px] cursor-default select-none',
              pointerScheme === name && 'bg-[var(--win98-highlight)] text-white',
            )}
            onClick={() => setAppPref(MOUSE_APP_ID, 'pointerScheme', name)}
          >
            {name}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-1">
        <span className="text-[10px] text-[var(--win98-disabled-text)] select-none">Preview:</span>
        <span className="text-[20px] leading-none select-none">↖</span>
        <span className="text-[16px] leading-none select-none">⌛</span>
        <span className="text-[16px] leading-none select-none">✋</span>
        <span className="text-[16px] leading-none select-none">✚</span>
      </div>
    </div>
  );

  const motionTab = (
    <div className="flex flex-col gap-3">
      <GroupBox98 label="Pointer speed">
        <div className="flex items-center gap-2 pt-1">
          <span className="select-none">Slow</span>
          <input
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            value={pointerSpeed}
            onChange={(e) => setAppPref(MOUSE_APP_ID, 'pointerSpeed', Number(e.target.value))}
            className="flex-1 accent-[var(--win98-highlight)]"
            aria-label="Pointer speed"
          />
          <span className="select-none">Fast</span>
        </div>
      </GroupBox98>

      <GroupBox98 label="Pointer trail">
        <div className="flex flex-col gap-2 pt-1">
          <Checkbox98
            label="Show pointer trails"
            checked={trails}
            onChange={(e) => setAppPref(MOUSE_APP_ID, 'trails', e.target.checked)}
          />
          <div className={cn('flex items-center gap-2', !trails && 'opacity-50')}>
            <span className="select-none">Short</span>
            <input
              type="range"
              min={MIN_TRAIL}
              max={MAX_TRAIL}
              value={trailLength}
              disabled={!trails}
              onChange={(e) => setAppPref(MOUSE_APP_ID, 'trailLength', Number(e.target.value))}
              className="flex-1 accent-[var(--win98-highlight)]"
              aria-label="Pointer trail length"
            />
            <span className="select-none">Long</span>
          </div>
        </div>
      </GroupBox98>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <div className="flex-1 p-2 min-h-0">
        <TabControl98
          tabs={[
            { id: 'buttons', label: 'Buttons', content: buttonsTab },
            { id: 'pointers', label: 'Pointers', content: pointersTab },
            { id: 'motion', label: 'Motion', content: motionTab },
          ]}
        />
      </div>
      <div className="flex justify-end gap-2 p-2 border-t border-[var(--win98-button-highlight)]">
        <Button98 onClick={() => closeWindow(windowId)}>OK</Button98>
        <Button98 onClick={cancel}>Cancel</Button98>
      </div>
    </div>
  );
}
