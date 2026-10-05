import { useState } from 'react';
import { contactsApi, type BulkAction, type ContactTag } from './contactsApi';
import { ApiClientError } from '../../utils/api';
import { LEAD_SOURCES, SOURCE_LABEL } from '../../utils/labels';
import { Button, Modal } from '../../components/ui';

interface Option {
  id: string;
  name: string;
}

interface Props {
  selectedIds: string[];
  owners: Option[];
  accounts: Option[];
  tags: ContactTag[];
  onClear: () => void;
  onDone: (message: string) => Promise<void> | void;
  onError: (message: string) => void;
}

const ACTIONS: Array<{ value: BulkAction; label: string }> = [
  { value: 'assignOwner', label: 'Assign owner' },
  { value: 'setSource', label: 'Set source' },
  { value: 'setAccount', label: 'Set company' },
  { value: 'addTag', label: 'Add tag' },
  { value: 'removeTag', label: 'Remove tag' },
  { value: 'delete', label: 'Delete' },
];

export function BulkBar({ selectedIds, owners, accounts, tags, onClear, onDone, onError }: Props) {
  const [action, setAction] = useState<BulkAction | ''>('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const count = selectedIds.length;
  const noun = `${count} contact${count === 1 ? '' : 's'}`;

  const needsValue = action === 'addTag' || action === 'removeTag' || action === 'assignOwner';
  const canApply = action !== '' && (!needsValue || value.trim() !== '');

  function pickAction(next: BulkAction | '') {
    setAction(next);
    setValue('');
  }

  async function run() {
    if (!action) return;
    setBusy(true);
    try {
      const res = await contactsApi.bulk(selectedIds, action, value.trim() || null);
      const n = res.updated;
      const done = `${n} contact${n === 1 ? '' : 's'}`;
      const messages: Record<BulkAction, string> = {
        delete: `Deleted ${done}.`,
        assignOwner: `Assigned ${done} to ${owners.find((o) => o.id === value)?.name ?? 'the new owner'}.`,
        setSource: `Updated the source on ${done}.`,
        setAccount: `Updated the company on ${done}.`,
        addTag: n === 0 ? `Every selected contact already had “${value.trim()}”.` : `Tagged ${done} “${value.trim()}”.`,
        removeTag: `Removed the tag from ${done}.`,
      };
      setConfirmDelete(false);
      setAction('');
      setValue('');
      await onDone(messages[action]);
    } catch (err) {
      onError(err instanceof ApiClientError ? err.message : 'Bulk update failed');
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-3 text-sm dark:border-brand-900 dark:bg-brand-950/30"
    >
      <span className="font-medium text-brand-800 dark:text-brand-200">{noun} selected</span>
      <select
        aria-label="Bulk action"
        value={action}
        onChange={(e) => pickAction(e.target.value as BulkAction | '')}
        className="field-input w-auto py-1.5"
      >
        <option value="">Choose an action…</option>
        {ACTIONS.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>

      {action === 'assignOwner' && (
        <select aria-label="New owner" value={value} onChange={(e) => setValue(e.target.value)} className="field-input w-auto py-1.5">
          <option value="">Select owner…</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      )}
      {action === 'setSource' && (
        <select aria-label="New source" value={value} onChange={(e) => setValue(e.target.value)} className="field-input w-auto py-1.5">
          <option value="">Unknown</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABEL[s]}
            </option>
          ))}
        </select>
      )}
      {action === 'setAccount' && (
        <select aria-label="New company" value={value} onChange={(e) => setValue(e.target.value)} className="field-input w-auto py-1.5">
          <option value="">No company</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
      {action === 'addTag' && (
        <>
          <input
            aria-label="Tag name"
            list="bulk-tag-options"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Tag name"
            className="field-input w-40 py-1.5"
          />
          <datalist id="bulk-tag-options">
            {tags.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>
        </>
      )}
      {action === 'removeTag' && (
        <select aria-label="Tag to remove" value={value} onChange={(e) => setValue(e.target.value)} className="field-input w-auto py-1.5">
          <option value="">Select tag…</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}

      {action && (
        <Button
          variant={action === 'delete' ? 'danger' : 'primary'}
          className="py-1.5"
          disabled={!canApply || busy}
          onClick={() => (action === 'delete' ? setConfirmDelete(true) : void run())}
        >
          {busy ? 'Working…' : action === 'delete' ? `Delete ${noun}` : 'Apply'}
        </Button>
      )}
      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Clear selection
      </button>

      <Modal
        open={confirmDelete}
        onClose={() => {
          if (!busy) setConfirmDelete(false);
        }}
        title={`Delete ${noun}?`}
        description="Their notes and tasks are deleted too. Deals, quotes and tickets stay but lose the contact link. This can't be undone."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => void run()}>
            {busy ? 'Deleting…' : `Delete ${noun}`}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
