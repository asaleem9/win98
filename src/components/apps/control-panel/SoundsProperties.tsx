'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { playSound, setSoundOverride, getSoundOverride } from '@/lib/sounds';
import { FilePickerDialog } from '@/components/dialogs/FilePickerDialog';
import { Button98 } from '@/components/ui/Button98';
import { Select98 } from '@/components/ui/Select98';
import { cn } from '@/lib/cn';
import {
  SOUND_EVENTS,
  EVENT_BY_ID,
  SOUND_SCHEMES,
  SOUND_OVERRIDE_APP_ID,
  SOUNDS_APPLET_APP_ID,
  SILENT_SOUND,
  SchemeId,
  overrideForScheme,
  displayName,
  isSilent,
  baseName,
} from './soundScheme';

type Overrides = Record<string, string | null>;

export default function SoundsProperties({ windowId }: AppComponentProps) {
  const { closeWindow } = useWindows();
  const { getAppPref, setAppPref } = useSettings();
  const { readFile } = useFileSystem();

  // Live overrides are the source of truth (persisted in the 'system-sounds'
  // bucket the SettingsContext hydrates); mirror them into React state so the
  // Events list re-renders on every change.
  const initialOverrides = useMemo<Overrides>(() => {
    const map: Overrides = {};
    for (const e of SOUND_EVENTS) map[e.id] = getSoundOverride(e.sound);
    return map;
  }, []);

  const [overrides, setOverrides] = useState<Overrides>(initialOverrides);
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    getAppPref<Record<string, string>>(SOUNDS_APPLET_APP_ID, 'labels', {}),
  );
  const [scheme, setScheme] = useState<SchemeId>(() =>
    getAppPref<SchemeId>(SOUNDS_APPLET_APP_ID, 'scheme', 'windows-default'),
  );
  const [selectedId, setSelectedId] = useState(SOUND_EVENTS[0].id);
  const [browsing, setBrowsing] = useState(false);

  // Snapshot everything we can mutate so Cancel can put it all back.
  const snapshot = useRef({
    overrides: initialOverrides,
    labels: getAppPref<Record<string, string>>(SOUNDS_APPLET_APP_ID, 'labels', {}),
    scheme: getAppPref<SchemeId>(SOUNDS_APPLET_APP_ID, 'scheme', 'windows-default'),
  });

  // Persist the label map after changes (not on first render).
  const firstLabels = useRef(true);
  useEffect(() => {
    if (firstLabels.current) {
      firstLabels.current = false;
      return;
    }
    setAppPref(SOUNDS_APPLET_APP_ID, 'labels', labels);
  }, [labels, setAppPref]);

  const selectedEvent = EVENT_BY_ID[selectedId];
  const selectedUrl = overrides[selectedId] ?? null;

  // Apply an assignment immediately: sound layer + persisted bucket + UI mirror.
  const assign = useCallback(
    (eventId: string, url: string | null, name?: string) => {
      const ev = EVENT_BY_ID[eventId];
      if (!ev) return;
      setSoundOverride(ev.sound, url);
      setAppPref(SOUND_OVERRIDE_APP_ID, ev.sound, url);
      setOverrides((prev) => ({ ...prev, [eventId]: url }));
      setLabels((prev) => {
        const next = { ...prev };
        if (name) next[eventId] = name;
        else delete next[eventId];
        return next;
      });
    },
    [setAppPref],
  );

  const applyScheme = useCallback(
    (id: SchemeId) => {
      setScheme(id);
      setAppPref(SOUNDS_APPLET_APP_ID, 'scheme', id);
      for (const e of SOUND_EVENTS) {
        const url = overrideForScheme(id, e.id);
        const name = url && !isSilent(url) ? baseName(url) : undefined;
        assign(e.id, url, name);
      }
    },
    [assign, setAppPref],
  );

  const handleBrowse = useCallback(
    (fullPath: string) => {
      setBrowsing(false);
      const content = readFile(fullPath);
      // Sound Recorder saves store their clip as a data: URL in the file body;
      // fall back to the path itself for anything else so playback can try it.
      const url = content && content.startsWith('data:') ? content : fullPath;
      assign(selectedId, url, baseName(fullPath));
    },
    [assign, readFile, selectedId],
  );

  const cancel = useCallback(() => {
    const s = snapshot.current;
    for (const e of SOUND_EVENTS) {
      const url = s.overrides[e.id] ?? null;
      setSoundOverride(e.sound, url);
      setAppPref(SOUND_OVERRIDE_APP_ID, e.sound, url);
    }
    setAppPref(SOUNDS_APPLET_APP_ID, 'labels', s.labels);
    setAppPref(SOUNDS_APPLET_APP_ID, 'scheme', s.scheme);
    closeWindow(windowId);
  }, [closeWindow, setAppPref, windowId]);

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <div className="flex-1 flex flex-col gap-2 p-3 min-h-0">
        {/* Schemes */}
        <div className="flex items-center gap-2">
          <span className="select-none">Schemes:</span>
          <Select98
            className="flex-1"
            value={scheme}
            onChange={(e) => applyScheme(e.target.value as SchemeId)}
            aria-label="Sound scheme"
          >
            {SOUND_SCHEMES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select98>
        </div>

        {/* Events list */}
        <div className="flex flex-col min-h-0 flex-1">
          <span className="mb-1 select-none">Events:</span>
          <div
            role="listbox"
            aria-label="Events"
            className={cn(
              'flex-1 min-h-[120px] overflow-auto bg-white',
              'border-2 border-solid',
              'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
              'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
            )}
          >
            {SOUND_EVENTS.map((ev) => {
              const url = overrides[ev.id] ?? null;
              const hasSound = url === null || !isSilent(url);
              const selected = ev.id === selectedId;
              return (
                <div
                  key={ev.id}
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'flex items-center gap-1 px-1 h-[18px] cursor-default select-none',
                    selected && 'bg-[var(--win98-highlight)] text-white',
                  )}
                  onClick={() => setSelectedId(ev.id)}
                  onDoubleClick={() => playSound(ev.sound)}
                >
                  <span className="w-3 text-center leading-none">{hasSound ? '🔊' : ''}</span>
                  <span className="truncate">{ev.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sound assignment for the selected event */}
        <div className="flex flex-col gap-1">
          <span className="select-none">Name:</span>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex-1 h-[18px] flex items-center px-1 bg-white truncate',
                'border-2 border-solid',
                'border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)]',
                'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
              )}
              aria-label="Current sound"
            >
              {displayName(selectedUrl, selectedEvent, labels)}
            </div>
            <Button98
              className="min-w-0 px-2 h-[22px]"
              onClick={() => playSound(selectedEvent.sound)}
              aria-label="Preview"
              title="Preview"
            >
              ▶
            </Button98>
          </div>
          <div className="flex items-center gap-2">
            <Button98 className="min-w-0 px-2 h-[22px]" onClick={() => setBrowsing(true)}>
              Browse...
            </Button98>
            <Button98
              className="min-w-0 px-2 h-[22px]"
              onClick={() => assign(selectedId, SILENT_SOUND)}
            >
              None
            </Button98>
            <Button98
              className="min-w-0 px-2 h-[22px]"
              onClick={() => assign(selectedId, null)}
            >
              Default
            </Button98>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 p-2 border-t border-[var(--win98-button-highlight)]">
        <Button98 onClick={() => closeWindow(windowId)}>OK</Button98>
        <Button98 onClick={cancel}>Cancel</Button98>
      </div>

      {browsing && (
        <FilePickerDialog
          mode="open"
          title="Browse for Sound"
          startDir="C:\\My Documents"
          filters={[
            { label: 'Sounds (*.wav;*.mp3)', extensions: ['wav', 'mp3'] },
            { label: 'All Files (*.*)', extensions: [] },
          ]}
          onConfirm={handleBrowse}
          onCancel={() => setBrowsing(false)}
        />
      )}
    </div>
  );
}
