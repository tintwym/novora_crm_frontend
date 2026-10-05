import { useCallback, useRef, useState } from 'react';
import { useDismiss } from '../../hooks/useDismiss';
import { IconCalendar, IconChevronDown } from '../../components/icons/Icons';
import {
  PRESET_LABEL,
  toInputDate,
  type RangePreset,
  type RangeSelection,
} from './dateRange';

const PRESETS: RangePreset[] = [
  'this_month',
  'last_month',
  'last_30',
  'last_90',
  'this_quarter',
  'this_year',
  'all',
];

export function DateRangePicker({
  value,
  label,
  onChange,
}: {
  value: RangeSelection;
  label: string;
  onChange: (next: RangeSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(value.customFrom ?? '');
  const [to, setTo] = useState(value.customTo ?? toInputDate(new Date()));
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  function pick(preset: RangePreset) {
    onChange({ preset });
    setOpen(false);
  }

  function applyCustom() {
    if (!from || !to) return;
    onChange({ preset: 'custom', customFrom: from, customTo: to });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative shrink-0 self-start">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <IconCalendar size={16} className="text-slate-400" />
        {label}
        <IconChevronDown size={16} className="text-slate-400" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose date range"
          className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-700 dark:bg-slate-900"
        >
          <ul className="space-y-0.5">
            {PRESETS.map((preset) => {
              const active = value.preset === preset;
              return (
                <li key={preset}>
                  <button
                    type="button"
                    onClick={() => pick(preset)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {PRESET_LABEL[preset]}
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-2 border-t border-slate-100 px-1 pt-3 dark:border-slate-800">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Custom range
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 px-2">
              <label className="text-xs text-slate-500">
                From
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
              <label className="text-xs text-slate-500">
                To
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            </div>
            <div className="px-2 pb-1 pt-3">
              <button
                type="button"
                onClick={applyCustom}
                disabled={!from || !to}
                className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
