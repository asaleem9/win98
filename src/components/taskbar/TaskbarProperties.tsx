'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { useSettings, TaskbarSettings } from '@/contexts/SettingsContext';
import { clearRecentDocs, getRecentDocs } from '@/lib/recentDocs';
import { playSound } from '@/lib/sounds';

interface TaskbarPropertiesProps {
  onClose: () => void;
}

type TabId = 'options' | 'programs';

const raisedButton = cn(
  'min-w-[75px] px-3 h-[23px] cursor-default select-none',
  'bg-[var(--win98-button-face)]',
  'border border-solid',
  'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
  'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
  'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
  'active:border-t-[var(--win98-button-dark-shadow)] active:border-l-[var(--win98-button-dark-shadow)]',
  'active:border-b-[var(--win98-button-highlight)] active:border-r-[var(--win98-button-highlight)]',
  'disabled:text-[var(--win98-disabled-text)]',
);

/** A single labelled option checkbox that drives the live preview. */
function OptionCheck({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
}) {
  return (
    <label className={cn('flex items-center gap-2 select-none', disabled ? 'text-[var(--win98-disabled-text)]' : 'cursor-default')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      {label}
    </label>
  );
}

/**
 * The little monitor preview from the real applet. It reflects the pending
 * options: the Start button shows small vs large icons, and the clock hides
 * when "Show clock" is off.
 */
function TaskbarPreview({ draft }: { draft: TaskbarSettings }) {
  return (
    <div
      className={cn(
        'mx-auto w-[150px] h-[100px] p-2 bg-[#008080]',
        'border-2 border-solid',
        'border-t-[var(--win98-button-dark-shadow)] border-l-[var(--win98-button-dark-shadow)]',
        'border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]',
        'flex flex-col justify-end',
      )}
      aria-hidden
    >
      {/* Sample menu popping up above the Start button */}
      <div className="w-[54px] bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)] mb-[2px] p-[2px] flex flex-col gap-[2px]">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-[2px]">
            <div className={cn('bg-[var(--win98-highlight)]', draft.smallIcons ? 'w-[4px] h-[4px]' : 'w-[7px] h-[7px]')} />
            <div className="h-[3px] flex-1 bg-[var(--win98-button-shadow)]" />
          </div>
        ))}
      </div>
      {/* Mini taskbar */}
      <div className="h-[13px] bg-[var(--win98-button-face)] border-t-2 border-t-[var(--win98-button-highlight)] flex items-center justify-between px-[2px]">
        <div className="w-[20px] h-[9px] bg-[var(--win98-button-face)] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]" />
        {draft.showClock && (
          <div className="h-[9px] px-[2px] flex items-center text-[6px] leading-none border border-solid border-t-[var(--win98-button-shadow)] border-l-[var(--win98-button-shadow)] border-b-[var(--win98-button-highlight)] border-r-[var(--win98-button-highlight)]">
            12:00
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskbarProperties({ onClose }: TaskbarPropertiesProps) {
  const { settings, setSetting } = useSettings();
  const [tab, setTab] = useState<TabId>('options');
  const [draft, setDraft] = useState<TaskbarSettings>(settings.taskbar);
  const [recentCount, setRecentCount] = useState(() => getRecentDocs().length);

  // Escape cancels, matching the dialog's Cancel button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const apply = () => setSetting('taskbar', draft);
  const handleOk = () => {
    apply();
    onClose();
  };
  const setDraftKey = (key: keyof TaskbarSettings, value: boolean) => setDraft((d) => ({ ...d, [key]: value }));

  const clearDocuments = () => {
    playSound('menuClick');
    clearRecentDocs();
    setRecentCount(0);
  };

  return (
    <div className="fixed inset-0 z-[9200] flex items-center justify-center">
      <div
        role="dialog"
        aria-label="Taskbar Properties"
        className={cn(
          'w-[320px] bg-[var(--win98-button-face)]',
          'border-2 border-solid',
          'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
          'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
          'shadow-[inset_-1px_-1px_0_var(--win98-button-shadow),inset_1px_1px_0_var(--win98-button-light)]',
          'font-[family-name:var(--win98-font)] text-[11px]',
        )}
      >
        {/* Title bar */}
        <div className="flex items-center h-[18px] px-[3px] bg-gradient-to-r from-[var(--win98-titlebar-active-start)] to-[var(--win98-titlebar-active-end)] text-white font-bold select-none">
          <span className="flex-1">Taskbar Properties</span>
          <button
            onClick={onClose}
            className="w-[16px] h-[14px] flex items-center justify-center bg-[var(--win98-button-face)] text-black text-[9px] border border-solid border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-2">
          {/* Tab strip */}
          <div className="flex gap-[2px] px-[2px] relative z-[1]">
            {([
              ['options', 'Taskbar Options'],
              ['programs', 'Start Menu Programs'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'px-3 pt-[2px] pb-[3px] cursor-default select-none',
                  'bg-[var(--win98-button-face)] border border-solid border-b-0 rounded-t-[2px]',
                  'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)] border-r-[var(--win98-button-dark-shadow)]',
                  tab === id ? 'mb-[-1px] pt-[3px] font-normal' : 'mt-[2px] text-[var(--win98-disabled-text)]',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab body */}
          <div
            className={cn(
              'p-3 min-h-[220px]',
              'border-2 border-solid',
              'border-t-[var(--win98-button-highlight)] border-l-[var(--win98-button-highlight)]',
              'border-b-[var(--win98-button-dark-shadow)] border-r-[var(--win98-button-dark-shadow)]',
            )}
          >
            {tab === 'options' ? (
              <>
                <TaskbarPreview draft={draft} />
                <div className="mt-4 flex flex-col gap-2">
                  <OptionCheck label="Always on top" checked disabled />
                  <OptionCheck label="Auto hide" checked={draft.autoHide} onChange={(v) => setDraftKey('autoHide', v)} />
                  <OptionCheck
                    label="Show small icons in Start menu"
                    checked={draft.smallIcons}
                    onChange={(v) => setDraftKey('smallIcons', v)}
                  />
                  <OptionCheck label="Show clock" checked={draft.showClock} onChange={(v) => setDraftKey('showClock', v)} />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <fieldset className="border border-[var(--win98-button-shadow)] p-3 pt-2">
                  <legend className="px-1">Customize Start menu</legend>
                  <p className="mb-3 leading-snug">
                    You may customize your Start menu by adding or removing items from it.
                  </p>
                  <div className="flex gap-2">
                    <button className={raisedButton} disabled>
                      Add...
                    </button>
                    <button className={raisedButton} disabled>
                      Remove...
                    </button>
                    <button className={raisedButton} disabled>
                      Advanced...
                    </button>
                  </div>
                </fieldset>

                <fieldset className="border border-[var(--win98-button-shadow)] p-3 pt-2">
                  <legend className="px-1">Documents menu</legend>
                  <p className="mb-3 leading-snug">
                    Click the Clear button to remove the contents of the Documents menu
                    {recentCount > 0 ? ` (${recentCount} item${recentCount === 1 ? '' : 's'})` : ''}.
                  </p>
                  <button className={raisedButton} onClick={clearDocuments} disabled={recentCount === 0}>
                    Clear
                  </button>
                </fieldset>
              </div>
            )}
          </div>

          {/* Dialog buttons */}
          <div className="flex justify-end gap-2 mt-3">
            <button className={raisedButton} onClick={handleOk}>
              OK
            </button>
            <button className={raisedButton} onClick={onClose}>
              Cancel
            </button>
            <button className={raisedButton} onClick={apply}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
