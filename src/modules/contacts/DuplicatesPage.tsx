import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Permission } from '@/shared';
import { contactsApi, type DuplicateContact, type DuplicateGroup } from './contactsApi';
import { ApiClientError } from '../../utils/api';
import { sourceLabel } from '../../utils/labels';
import { usePermission } from '../../hooks/usePermission';
import { Button, Card, EmptyState, ErrorAlert, LoadingState, Modal, PageHeader } from '../../components/ui';
import { IconContacts } from '../../components/icons/Icons';

const MATCH_LABEL = { email: 'same email', phone: 'same phone', name: 'same name' } as const;

function groupKey(g: DuplicateGroup) {
  return g.contacts.map((c) => c.id).join(':');
}

/** Keeps the contact with the most history; ties go to the oldest record. */
function defaultKeeper(g: DuplicateGroup) {
  return [...g.contacts].sort((a, b) => (b.linkedRecords ?? 0) - (a.linkedRecords ?? 0))[0].id;
}

export function DuplicatesPage() {
  const canMerge = usePermission(Permission.MANAGE_CONTACTS);
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null);
  const [keep, setKeep] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<DuplicateGroup | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await contactsApi.duplicates();
      setGroups(data);
      setKeep(Object.fromEntries(data.map((g) => [groupKey(g), defaultKeeper(g)])));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to find duplicates');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function merge() {
    if (!confirm) return;
    const primaryId = keep[groupKey(confirm)];
    const keeper = confirm.contacts.find((c) => c.id === primaryId);
    setBusy(true);
    try {
      const res = await contactsApi.merge(
        primaryId,
        confirm.contacts.filter((c) => c.id !== primaryId).map((c) => c.id),
      );
      setNotice(
        `Merged ${res.merged} duplicate${res.merged === 1 ? '' : 's'} into ${keeper?.name}` +
          (res.movedRecords ? `, moving ${res.movedRecords} linked record${res.movedRecords === 1 ? '' : 's'}.` : '.'),
      );
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Merge failed');
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  const keeperName = confirm ? confirm.contacts.find((c) => c.id === keep[groupKey(confirm)])?.name : '';

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link to="/contacts" className="link-brand text-sm">
          ← Back to contacts
        </Link>
        <PageHeader
          title="Possible duplicates"
          description="Contacts that share an email, phone number or name. Merge them to keep one clean record."
        />
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200"
        >
          {notice}
        </div>
      )}
      {error && <ErrorAlert message={error} />}

      {groups === null && !error && (
        <Card>
          <LoadingState message="Looking for duplicates…" />
        </Card>
      )}
      {groups?.length === 0 && (
        <Card>
          <EmptyState icon={IconContacts} title="No duplicates found" message="Every contact has a unique email, phone and name." />
        </Card>
      )}

      {groups?.map((g) => {
        const key = groupKey(g);
        return (
          <Card key={key}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {g.contacts.length} contacts · {g.matchedOn.map((m) => MATCH_LABEL[m]).join(', ')}
              </p>
              {canMerge && (
                <Button className="py-1.5" onClick={() => setConfirm(g)}>
                  Merge into selected
                </Button>
              )}
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {g.contacts.map((c) => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  groupKey={key}
                  selectable={canMerge}
                  selected={keep[key] === c.id}
                  matchedOn={g.matchedOn}
                  onSelect={() => setKeep((k) => ({ ...k, [key]: c.id }))}
                />
              ))}
            </ul>
          </Card>
        );
      })}

      <Modal
        open={confirm !== null}
        onClose={() => {
          if (!busy) setConfirm(null);
        }}
        title={`Merge into ${keeperName}?`}
        description={`${confirm && confirm.contacts.length > 2 ? `The other ${confirm.contacts.length - 1} records` : 'The other record'} will be deleted. Their deals, tasks, notes, quotes, tickets and tags move to ${keeperName}, and any details ${keeperName} is missing are filled in from them.`}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void merge()}>
            {busy ? 'Merging…' : 'Merge contacts'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ContactRow({
  contact: c,
  groupKey: key,
  selectable,
  selected,
  matchedOn,
  onSelect,
}: {
  contact: DuplicateContact;
  groupKey: string;
  selectable: boolean;
  selected: boolean;
  matchedOn: DuplicateGroup['matchedOn'];
  onSelect: () => void;
}) {
  const hl = (field: 'email' | 'phone' | 'name') =>
    matchedOn.includes(field) ? 'font-medium text-amber-700 dark:text-amber-300' : '';
  return (
    <li className={`flex items-start gap-3 px-5 py-3 ${selected ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''}`}>
      {selectable && (
        <input
          type="radio"
          name={`keep-${key}`}
          checked={selected}
          onChange={onSelect}
          aria-label={`Keep ${c.name}`}
          className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500"
        />
      )}
      <div className="grid min-w-0 flex-1 gap-x-6 gap-y-0.5 text-sm sm:grid-cols-3">
        <div className="min-w-0">
          <Link to={`/contacts/${c.id}`} className={`link-brand ${hl('name')}`}>
            {c.name}
          </Link>
          {selected && selectable && (
            <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-200">
              Keep
            </span>
          )}
          <p className="truncate text-xs text-slate-500">{[c.title, c.account?.name].filter(Boolean).join(' · ') || '—'}</p>
        </div>
        <div className="min-w-0 text-slate-600 dark:text-slate-300">
          <p className={`truncate ${hl('email')}`}>{c.email ?? '—'}</p>
          <p className={`truncate text-xs ${hl('phone') || 'text-slate-500'}`}>{c.phone ?? 'No phone'}</p>
        </div>
        <div className="text-xs text-slate-500">
          <p>
            {`${c.linkedRecords ?? 0} linked record${c.linkedRecords === 1 ? '' : 's'}`}
            {c.source ? ` · ${sourceLabel(c.source)}` : ''}
          </p>
          <p>
            Added {new Date(c.createdAt).toLocaleDateString()}
            {c.owner ? ` · ${c.owner.name}` : ''}
          </p>
        </div>
      </div>
    </li>
  );
}
