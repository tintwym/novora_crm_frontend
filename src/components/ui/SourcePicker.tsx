import { useState } from 'react';
import { LEAD_SOURCES, SOURCE_LABEL, sourceLabel } from '../../utils/labels';

/** Shows a record's lead source and, when editable, lets the user change it in place. */
export function SourcePicker({
  value,
  editable,
  onChange,
}: {
  value: string | null | undefined;
  editable: boolean;
  onChange: (next: string | null) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  if (!editable) {
    return <span className="text-sm text-slate-800 dark:text-slate-100">{sourceLabel(value) || 'Unknown'}</span>;
  }

  return (
    <select
      aria-label="Lead source"
      value={value ?? ''}
      disabled={saving}
      onChange={async (e) => {
        setSaving(true);
        try {
          await onChange(e.target.value || null);
        } finally {
          setSaving(false);
        }
      }}
      className="-ml-1 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm text-slate-800 transition hover:border-slate-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-60 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:ring-brand-900"
    >
      <option value="">Unknown</option>
      {LEAD_SOURCES.map((src) => (
        <option key={src} value={src}>
          {SOURCE_LABEL[src]}
        </option>
      ))}
    </select>
  );
}
