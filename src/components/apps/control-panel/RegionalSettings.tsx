'use client';

import { useCallback, useRef } from 'react';
import { AppComponentProps } from '@/types/app';
import { useWindows } from '@/contexts/WindowContext';
import { useSettings } from '@/contexts/SettingsContext';
import { TabControl98 } from '@/components/ui/TabControl98';
import { Button98 } from '@/components/ui/Button98';
import { Select98 } from '@/components/ui/Select98';
import { Input98 } from '@/components/ui/Input98';
import { Radio98 } from '@/components/ui/Radio98';

export const REGIONAL_APP_ID = 'regional';

const REGIONAL_DEFAULTS = {
  locale: 'en-US',
  decimalSymbol: '.',
  digitGrouping: ',',
  digitsAfterDecimal: '2',
  currencySymbol: '$',
  clock24h: false,
  shortDate: 'M/d/yy',
  longDate: 'dddd, MMMM dd, yyyy',
} as const;

const LOCALES = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'fr-FR', label: 'French (Standard)' },
  { value: 'de-DE', label: 'German (Standard)' },
  { value: 'ja-JP', label: 'Japanese' },
];

const SHORT_DATES = ['M/d/yy', 'MM/dd/yy', 'dd/MM/yy', 'yyyy-MM-dd', 'd.M.yyyy'];

function groupInteger(intPart: string, groupSymbol: string): string {
  return groupSymbol ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSymbol) : intPart;
}

function formatNumber(decimal: string, group: string, digits: string): string {
  const d = Math.max(0, Math.min(9, parseInt(digits, 10) || 0));
  const [intPart, fracPart] = (1234567.89).toFixed(d).split('.');
  const grouped = groupInteger(intPart, group);
  return fracPart ? `${grouped}${decimal || '.'}${fracPart}` : grouped;
}

export default function RegionalSettings({ windowId }: AppComponentProps) {
  const { closeWindow } = useWindows();
  const { getAppPref, setAppPref } = useSettings();

  const locale = getAppPref(REGIONAL_APP_ID, 'locale', REGIONAL_DEFAULTS.locale);
  const decimalSymbol = getAppPref(REGIONAL_APP_ID, 'decimalSymbol', REGIONAL_DEFAULTS.decimalSymbol);
  const digitGrouping = getAppPref(REGIONAL_APP_ID, 'digitGrouping', REGIONAL_DEFAULTS.digitGrouping);
  const digitsAfterDecimal = getAppPref(REGIONAL_APP_ID, 'digitsAfterDecimal', REGIONAL_DEFAULTS.digitsAfterDecimal);
  const currencySymbol = getAppPref(REGIONAL_APP_ID, 'currencySymbol', REGIONAL_DEFAULTS.currencySymbol);
  const clock24h = getAppPref(REGIONAL_APP_ID, 'clock24h', REGIONAL_DEFAULTS.clock24h);
  const shortDate = getAppPref(REGIONAL_APP_ID, 'shortDate', REGIONAL_DEFAULTS.shortDate);
  const longDate = getAppPref(REGIONAL_APP_ID, 'longDate', REGIONAL_DEFAULTS.longDate);

  // Selections apply live (the taskbar clock reads clock24h); snapshot so Cancel
  // can put everything back.
  const snapshot = useRef({
    locale,
    decimalSymbol,
    digitGrouping,
    digitsAfterDecimal,
    currencySymbol,
    clock24h,
    shortDate,
    longDate,
  });

  const set = useCallback(
    (key: string, value: unknown) => setAppPref(REGIONAL_APP_ID, key, value),
    [setAppPref],
  );

  const cancel = () => {
    const s = snapshot.current;
    setAppPref(REGIONAL_APP_ID, 'locale', s.locale);
    setAppPref(REGIONAL_APP_ID, 'decimalSymbol', s.decimalSymbol);
    setAppPref(REGIONAL_APP_ID, 'digitGrouping', s.digitGrouping);
    setAppPref(REGIONAL_APP_ID, 'digitsAfterDecimal', s.digitsAfterDecimal);
    setAppPref(REGIONAL_APP_ID, 'currencySymbol', s.currencySymbol);
    setAppPref(REGIONAL_APP_ID, 'clock24h', s.clock24h);
    setAppPref(REGIONAL_APP_ID, 'shortDate', s.shortDate);
    setAppPref(REGIONAL_APP_ID, 'longDate', s.longDate);
    closeWindow(windowId);
  };

  const numberPreview = formatNumber(decimalSymbol, digitGrouping, digitsAfterDecimal);
  const currencyPreview = `${currencySymbol}${numberPreview}`;

  const regionTab = (
    <div className="w-[300px]">
      <p className="mb-2">Many programs support international settings that you can change through the Regional Settings.</p>
      <p className="mb-1">Your locale (location):</p>
      <Select98 value={locale} onChange={(e) => set('locale', e.target.value)} className="w-full mb-3">
        {LOCALES.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </Select98>
      <p className="text-[10px] text-[var(--win98-disabled-text)]">Set the appearance of numbers, currencies, times, and dates.</p>
    </div>
  );

  const numberTab = (
    <div className="w-[300px]">
      <Field label="Decimal symbol">
        <Input98 value={decimalSymbol} maxLength={1} onChange={(e) => set('decimalSymbol', e.target.value)} className="w-[60px]" />
      </Field>
      <Field label="Digit grouping symbol">
        <Input98 value={digitGrouping} maxLength={1} onChange={(e) => set('digitGrouping', e.target.value)} className="w-[60px]" />
      </Field>
      <Field label="No. of digits after decimal">
        <Select98 value={digitsAfterDecimal} onChange={(e) => set('digitsAfterDecimal', e.target.value)} className="w-[60px]">
          {['0', '1', '2', '3', '4'].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select98>
      </Field>
      <Field label="Appearance">
        <span aria-label="Number appearance">{numberPreview}</span>
      </Field>
    </div>
  );

  const currencyTab = (
    <div className="w-[300px]">
      <Field label="Currency symbol">
        <Input98 value={currencySymbol} maxLength={3} onChange={(e) => set('currencySymbol', e.target.value)} className="w-[60px]" />
      </Field>
      <Field label="Positive">
        <span>{currencyPreview}</span>
      </Field>
      <Field label="Negative">
        <span>({currencyPreview})</span>
      </Field>
    </div>
  );

  const timeTab = (
    <div className="w-[300px] flex flex-col gap-2">
      <p className="mb-1">Time format:</p>
      <Radio98
        name="time-format"
        label="12-hour (1:30 PM)"
        checked={!clock24h}
        onChange={() => set('clock24h', false)}
      />
      <Radio98
        name="time-format"
        label="24-hour (13:30)"
        checked={clock24h}
        onChange={() => set('clock24h', true)}
      />
      <p className="text-[10px] text-[var(--win98-disabled-text)] mt-2">
        This changes the clock shown in the taskbar.
      </p>
    </div>
  );

  const dateTab = (
    <div className="w-[300px]">
      <Field label="Short date style">
        <Select98 value={shortDate} onChange={(e) => set('shortDate', e.target.value)} className="w-[110px]">
          {SHORT_DATES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select98>
      </Field>
      <Field label="Long date style">
        <Input98 value={longDate} onChange={(e) => set('longDate', e.target.value)} className="w-[160px]" />
      </Field>
      <p className="text-[10px] text-[var(--win98-disabled-text)] mt-2">Calendar type: Gregorian Calendar</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[var(--win98-button-face)] font-[family-name:var(--win98-font)] text-[11px]">
      <div className="flex-1 p-2 min-h-0 overflow-auto">
        <TabControl98
          tabs={[
            { id: 'region', label: 'Regional Settings', content: regionTab },
            { id: 'number', label: 'Number', content: numberTab },
            { id: 'currency', label: 'Currency', content: currencyTab },
            { id: 'time', label: 'Time', content: timeTab },
            { id: 'date', label: 'Date', content: dateTab },
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-[3px]">
      <span>{label}:</span>
      {children}
    </div>
  );
}
