import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { contactsApi, type Contact, type TimelineItem } from './contactsApi';
import { stageLabel } from '../../utils/labels';
import { ApiClientError } from '../../utils/api';
import { initials, formatCurrency } from '../../utils/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorAlert,
  LoadingState,
  PageHeader,
  Panel,
  SourcePicker,
} from '../../components/ui';
import { Permission } from '@/shared';
import { usePermission } from '../../hooks/usePermission';
import { IconCalendar, IconDeals } from '../../components/icons/Icons';

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [contact, setContact] = useState<Contact | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const canEdit = usePermission(Permission.MANAGE_CONTACTS);

  async function load() {
    if (!id) return;
    try {
      const [c, t] = await Promise.all([contactsApi.get(id), contactsApi.timeline(id)]);
      setContact(c);
      setTimeline(t);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load');
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function onAddNote(e: FormEvent) {
    e.preventDefault();
    if (!id || !note.trim()) return;
    try {
      await contactsApi.addNote(id, note.trim());
      setNote('');
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to add note');
    }
  }

  async function onSourceChange(source: string | null) {
    if (!id) return;
    try {
      const updated = await contactsApi.update(id, { source });
      setContact((c) => (c ? { ...c, source: updated.source } : c));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to update source');
    }
  }

  const backLink = (
    <Link to="/contacts" className="link-brand text-sm">
      ← Back to contacts
    </Link>
  );

  if (error && !contact) {
    return (
      <div className="space-y-4">
        {backLink}
        <ErrorAlert message={error} />
      </div>
    );
  }
  if (!contact) {
    return (
      <div className="space-y-4">
        {backLink}
        <Card>
          <LoadingState message="Loading contact…" />
        </Card>
      </div>
    );
  }

  const customEntries = Object.entries(contact.customFields ?? {});
  const deals = contact.deals ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {backLink}
        <PageHeader
          title={contact.name}
          description={
            [contact.title, contact.account?.name].filter(Boolean).join(' · ') || 'No title'
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Timeline" description="Notes and activities for this contact">
            <form onSubmit={onAddNote} className="flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note…"
                aria-label="Add a note"
                className="field-input flex-1"
              />
              <Button type="submit">Add</Button>
            </form>
            {error && (
              <div className="mt-3">
                <ErrorAlert message={error} />
              </div>
            )}
            {timeline.length === 0 ? (
              <EmptyState
                icon={IconCalendar}
                title="No activity yet"
                message="Add a note above or log an activity to start this contact's history."
              />
            ) : (
              <ul className="mt-5 space-y-4">
                {timeline.map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {initials(item.user.name)}
                    </div>
                    <div className="min-w-0 flex-1 border-b border-slate-100 pb-4 text-sm last:border-0 dark:border-slate-800">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {item.type}
                        {item.subject ? ` · ${item.subject}` : ''}
                      </p>
                      {item.note && (
                        <p className="mt-0.5 text-slate-600 dark:text-slate-300">{item.note}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        {item.user.name} · {new Date(item.date).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {initials(contact.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display font-semibold text-slate-900 dark:text-white">
                  {contact.name}
                </p>
                {contact.title && <p className="truncate text-sm text-slate-500">{contact.title}</p>}
              </div>
            </div>
            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Email</dt>
                <dd className="mt-0.5 break-all text-sm text-slate-800 dark:text-slate-100">
                  {contact.email ?? 'No email'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Phone</dt>
                <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-100">
                  {contact.phone ?? 'No phone'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Company</dt>
                <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-100">
                  {contact.account?.name ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Source</dt>
                <dd className="mt-0.5">
                  <SourcePicker value={contact.source} editable={canEdit} onChange={onSourceChange} />
                </dd>
              </div>
              {contact.tags.length > 0 && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Tags</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1">
                    {contact.tags.map((t) => (
                      <span
                        key={t.id}
                        className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: t.color }}
                      >
                        {t.name}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {customEntries.map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">{key}</dt>
                  <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-100">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Deals">
            {deals.length === 0 ? (
              <EmptyState icon={IconDeals} message="No deals linked to this contact yet." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {deals.map((d) => (
                  <li key={d.id} className="py-3 first:pt-0 last:pb-0">
                    <Link to={`/deals/${d.id}`} className="link-brand text-sm">
                      {d.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {stageLabel(d.stage)} · {formatCurrency(d.value)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
