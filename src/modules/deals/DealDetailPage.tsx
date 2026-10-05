import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ACTIVITY_TYPES, Permission, type ActivityType } from '@/shared';
import { stageLabel } from '../../utils/labels';
import { dealsApi, type Deal } from './dealsApi';
import { AttachmentsPanel } from './AttachmentsPanel';
import { AutomatedChip } from '../automations/AutomatedChip';
import { ApiClientError } from '../../utils/api';
import { initials, formatCurrency } from '../../utils/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorAlert,
  Field,
  LoadingState,
  PageHeader,
  Panel,
  SourcePicker,
} from '../../components/ui';
import { usePermission } from '../../hooks/usePermission';
import { IconCalendar, IconQuotes } from '../../components/icons/Icons';

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canEdit = usePermission(Permission.MANAGE_DEALS);
  const [activity, setActivity] = useState({
    type: 'CALL' as ActivityType,
    subject: '',
    note: '',
  });

  async function load() {
    if (!id) return;
    try {
      setDeal(await dealsApi.get(id));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load deal');
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function onAddActivity(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      await dealsApi.addActivity(id, activity);
      setActivity({ type: 'CALL', subject: '', note: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to log activity');
    }
  }

  async function onSourceChange(source: string | null) {
    if (!id) return;
    try {
      const updated = await dealsApi.update(id, { source });
      setDeal((d) => (d ? { ...d, source: updated.source } : d));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to update source');
    }
  }

  if (error && !deal) {
    return (
      <div className="space-y-6">
        <Link to="/deals" className="link-brand text-sm">
          ← Back to pipeline
        </Link>
        <ErrorAlert message={error} />
      </div>
    );
  }
  if (!deal) {
    return (
      <Card>
        <LoadingState message="Loading deal…" />
      </Card>
    );
  }

  const activities = deal.activities ?? [];
  const attachments = deal.attachments ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link to="/deals" className="link-brand text-sm">
          ← Back to pipeline
        </Link>
        <PageHeader
          title={deal.title}
          description={`${stageLabel(deal.stage)} · ${deal.probability}% probability`}
          actions={
            <Link to={`/quotes?dealId=${deal.id}`} className="btn-primary">
              <IconQuotes size={16} />
              Create quote
            </Link>
          }
        />
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Activities" description="Log calls, meetings and notes for this deal.">
            <form onSubmit={onAddActivity} className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
              <Field label="Type" htmlFor="deal-activity-type">
                <Field.Select
                  id="deal-activity-type"
                  value={activity.type}
                  onChange={(e) =>
                    setActivity((a) => ({ ...a, type: e.target.value as ActivityType }))
                  }
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Field.Select>
              </Field>
              <Field label="Subject" htmlFor="deal-activity-subject">
                <Field.Input
                  id="deal-activity-subject"
                  value={activity.subject}
                  onChange={(e) => setActivity((a) => ({ ...a, subject: e.target.value }))}
                  placeholder="Subject"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes" htmlFor="deal-activity-note">
                  <Field.Textarea
                    id="deal-activity-note"
                    value={activity.note}
                    onChange={(e) => setActivity((a) => ({ ...a, note: e.target.value }))}
                    placeholder="Notes"
                    rows={3}
                  />
                </Field>
              </div>
              <div className="flex justify-end sm:col-span-2">
                <Button type="submit">Log activity</Button>
              </div>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
              {activities.length === 0 ? (
                <EmptyState
                  icon={IconCalendar}
                  title="No activities yet"
                  message="Log the first call, meeting or note to start this deal's history."
                />
              ) : (
                <ol className="relative space-y-5 border-l border-slate-200 pl-6 dark:border-slate-800">
                  {activities.map((a) => (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white dark:ring-slate-900" />
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <span className="mr-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {a.type}
                        </span>
                        {a.subject}
                        {a.automated && (
                          <span className="ml-2 align-middle">
                            <AutomatedChip />
                          </span>
                        )}
                      </p>
                      {a.note && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                          {a.note}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        {a.user.name} · {new Date(a.date).toLocaleString()}
                        {a.dueAt && !a.completedAt && ` · due ${new Date(a.dueAt).toLocaleDateString()}`}
                        {a.completedAt && ' · done'}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Details">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Value</dt>
                <dd className="mt-1 font-display text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(deal.value)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Close date</dt>
                <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                  {deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : 'TBD'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Stage</dt>
                <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                  {stageLabel(deal.stage)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Probability</dt>
                <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">{deal.probability}%</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-400">Contact</dt>
                <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                  {deal.contact ? (
                    <Link to={`/contacts/${deal.contact.id}`} className="link-brand">
                      {deal.contact.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-400">Company</dt>
                <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                  {deal.account ? (
                    <Link to={`/companies/${deal.account.id}`} className="link-brand">
                      {deal.account.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Source</dt>
                <dd className="mt-1">
                  <SourcePicker value={deal.source} editable={canEdit} onChange={onSourceChange} />
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Owner</dt>
                <dd className="mt-1 flex items-center gap-2 text-sm text-slate-800 dark:text-slate-100">
                  {deal.owner ? (
                    <>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        {initials(deal.owner.name)}
                      </span>
                      {deal.owner.name}
                    </>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          </Panel>

          <AttachmentsPanel dealId={deal.id} attachments={attachments} onChange={load} />
        </div>
      </div>
    </div>
  );
}
